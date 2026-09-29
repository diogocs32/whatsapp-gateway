import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ContactCheckQuotaDto } from '@whatsapp-gateway/contracts';
import type { Env } from '../../../bootstrap/config';
import { RedisService } from '../../../infra/redis/redis.service';

// E20: cada lote cobra as tentativas distintas após a MESMA normalização das engines.
// Repetir o número em outro lote é outra tentativa; não guardamos telefones no Redis.
export function contactCheckCost(numbers: readonly string[]): number {
  return new Set(numbers.map((number) => number.replace(/[^0-9]/g, ''))).size;
}

// Leitura + incremento + TTL são uma operação atômica entre réplicas. A janela começa
// no primeiro lote; leituras não criam chave nem renovam o prazo.
// DO: https://redis.io/docs/latest/develop/programmability/eval-intro/
const QUOTA_SCRIPT = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if amount > 0 then
  used = redis.call('INCRBY', KEYS[1], amount)
  if redis.call('PTTL', KEYS[1]) < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[2])
  end
end
return {used, redis.call('PTTL', KEYS[1])}
`;

const REDIS_WAIT_MS = 2_000;

@Injectable()
export class ContactCheckQuotaService {
  private readonly logger = new Logger(ContactCheckQuotaService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  private settings(): ContactCheckQuotaDto {
    const limit = this.config.get('CONTACT_CHECK_MAX_PER_WINDOW', {
      infer: true,
    });
    return {
      enabled: limit > 0,
      mode: 'observe',
      limit,
      windowSeconds: this.config.get('CONTACT_CHECK_WINDOW_SECONDS', {
        infer: true,
      }),
      available: true,
      used: null,
      remaining: null,
      exceeded: null,
      retryAfterSeconds: null,
    };
  }

  // Só o endpoint explícito de consulta chama este método; envios não o conhecem.
  // Default 0 desliga até a leitura Redis. A observação não bloqueia e não altera o
  // array público de /check, incluindo quando Redis estiver fora ou o limite exceder.
  async observe(sessionId: string, numbers: readonly string[]): Promise<void> {
    const settings = this.settings();
    if (!settings.enabled) return;
    const snapshot = await this.readOrIncrement(
      sessionId,
      contactCheckCost(numbers),
      settings,
    );
    if (snapshot.exceeded) {
      this.logger.warn(
        { sessionId, used: snapshot.used, limit: snapshot.limit },
        'Cota observada de contacts/check excedida; consulta continua',
      );
    }
  }

  async snapshot(sessionId: string): Promise<ContactCheckQuotaDto> {
    const settings = this.settings();
    return settings.enabled
      ? this.readOrIncrement(sessionId, 0, settings)
      : settings;
  }

  private async readOrIncrement(
    sessionId: string,
    amount: number,
    settings: ContactCheckQuotaDto,
  ): Promise<ContactCheckQuotaDto> {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      // O cliente compartilhado mantém maxRetriesPerRequest:null para as filas.
      // Não mudamos retries/close (P-100): só limitamos a espera DESTE observador.
      if (this.redis.client.status !== 'ready') {
        throw new Error('Redis indisponível');
      }
      const result = await Promise.race([
        this.redis.client.eval(
          QUOTA_SCRIPT,
          1,
          `wa:contacts-check:quota:${sessionId}`,
          amount,
          settings.windowSeconds * 1_000,
        ),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(
            () => reject(new Error('Prazo da observação Redis excedido')),
            REDIS_WAIT_MS,
          );
        }),
      ]);
      if (
        !Array.isArray(result) ||
        result.length !== 2 ||
        !Number.isSafeInteger(result[0]) ||
        !Number.isSafeInteger(result[1]) ||
        result[0] < 0
      ) {
        throw new Error('Resposta da observação Redis inválida');
      }
      const [used, ttlMs] = result as [number, number];
      return {
        ...settings,
        used,
        remaining: Math.max(0, settings.limit - used),
        exceeded: used > settings.limit,
        retryAfterSeconds: Math.max(0, Math.ceil(ttlMs / 1_000)),
      };
    } catch {
      // Redis pode aplicar um incremento depois do timeout. É uma observação
      // conservadora; sem reembolso, bypass restritivo, cancelamento ou force-close.
      this.logger.warn(
        { sessionId },
        'Observação de contacts/check indisponível; consulta continua',
      );
      return { ...settings, available: false };
    } finally {
      if (deadline) clearTimeout(deadline);
    }
  }
}
