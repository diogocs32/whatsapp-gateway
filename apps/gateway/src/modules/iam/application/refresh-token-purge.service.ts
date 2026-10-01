import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../domain/refresh-token.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;
const MAX_BATCHES = 20;

// P-005: a família ativa conserva seus ancestrais para detectar reuso, mesmo expirados.
// O repositório coordena a limpeza com as mutações; duas réplicas podem varrer sem duplicar efeito.
@Injectable()
export class RefreshTokenPurgeService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RefreshTokenPurgeService.name);
  private first?: ReturnType<typeof setTimeout>;
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly tokens: RefreshTokenRepository,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    const hours = Number(process.env.RETENTION_SWEEP_HOURS ?? 6);
    const intervalMs = hours * 60 * 60_000;
    if (
      !Number.isFinite(intervalMs) ||
      intervalMs <= 0 ||
      intervalMs > 2 ** 31 - 1
    )
      return;
    this.first = setTimeout(() => void this.sweep(), 2 * 60_000);
    this.first.unref();
    this.timer = setInterval(() => void this.sweep(), intervalMs);
    this.timer.unref();
    this.logger.log(`Purge de refresh tokens: varredura a cada ${hours}h`);
  }

  sweep(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.runSweep().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.first);
    clearInterval(this.timer);
    await this.running;
  }

  private async runSweep(): Promise<void> {
    const days = Number(process.env.RETENTION_REFRESH_TOKENS_GRACE_DAYS ?? 7);
    if (!Number.isFinite(days) || days <= 0) return;
    const cutoff = new Date(Date.now() - days * DAY_MS);
    if (!Number.isFinite(cutoff.getTime())) return;
    let total = 0;
    try {
      for (let batch = 0; batch < MAX_BATCHES && !this.stopped; batch++) {
        const count = await this.tokens.purgeExpired(cutoff, BATCH_SIZE);
        total += count;
        if (count < BATCH_SIZE) break;
      }
      if (total > 0)
        this.logger.log(`retenção: ${total} refresh tokens removidos`);
    } catch (e) {
      this.logger.error(`retenção (refresh_tokens): ${(e as Error).message}`);
    }
  }
}
