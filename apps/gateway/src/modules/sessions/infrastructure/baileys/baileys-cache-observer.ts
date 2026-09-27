import NodeCache from '@cacheable/node-cache';
import type { Logger } from 'pino';
import type { PrismaService } from '../../../../infra/prisma/prisma.service';

// Mesmos TTLs e sem clones usados pelos caches internos da rc14. A observação fica por socket:
// números de um socket antigo não se misturam aos da reconexão, e nenhum cache é externalizado.
const SNAPSHOT_INTERVAL_MS = 15 * 60_000;

export class BaileysCacheObserver {
  // CacheStore da rc14 usa get<T>; NodeCache não expressa esse método genérico no tipo.
  readonly msgRetryCounterCache = new NodeCache<any>({
    stdTTL: 60 * 60,
    useClones: false,
  });
  readonly userDevicesCache = new NodeCache<any>({
    stdTTL: 5 * 60,
    useClones: false,
  });
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly startedAt = Date.now();
  private closed = false;

  constructor(
    private readonly sessionId: string,
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {
    this.timer = setInterval(
      () => void this.snapshot('intervalo'),
      SNAPSHOT_INTERVAL_MS,
    );
    this.timer.unref();
  }

  async snapshot(
    reason: 'open' | 'intervalo' | 'close' | 'erro',
  ): Promise<void> {
    // Não registrar chaves, JIDs nem valores: apenas tamanho e acertos/erros agregados.
    const msgRetry = this.msgRetryCounterCache.getStats();
    const userDevices = this.userDevicesCache.getStats();
    try {
      const preKeys = await this.prisma.waAuthKey.count({
        where: { sessionId: this.sessionId, type: 'pre-key' },
      });
      this.logger.info(
        {
          sessionId: this.sessionId,
          reason,
          ageMs: Date.now() - this.startedAt,
          msgRetry,
          userDevices,
          preKeys,
        },
        'Baileys: caches e pre-keys da sessão',
      );
    } catch (err) {
      this.logger.warn(
        {
          err,
          sessionId: this.sessionId,
          reason,
          ageMs: Date.now() - this.startedAt,
          msgRetry,
          userDevices,
        },
        'Baileys: contagem de pre-keys indisponível',
      );
    }
  }

  close(reason: 'close' | 'erro'): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    void this.snapshot(reason);
    // A rc14 só fecha os caches criados por ela; ao injetá-los, a limpeza passa a ser nossa.
    this.msgRetryCounterCache.close();
    this.userDevicesCache.close();
  }
}
