import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { MediaStorage } from '../../infra/storage/media-storage.service';
import { memoryStats } from '../../shared-kernel/memory';

export interface HealthReport {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  checks: {
    database: boolean;
    redis: boolean;
    // Escrita no S3 (probe com cache de 5 min). INFORMATIVO: não muda o `status` — storage fora
    // não pode derrubar o container via healthcheck do Swarm (o app funciona sem mídia).
    storage: boolean;
    heapUsedPct: number;
    memoryUsedPct: number;
    rssBytes: number;
  };
  version: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly media: MediaStorage,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.redis.ping(),
      this.media.probeWrite(),
    ]);

    // Pressão de memória: usa a RAM REAL do container (cgroup — inclui os Chromium do wwebjs)
    // quando há limite; senão, o heap V8 vs seu limite (heap_size_limit). >90% = degradação.
    // NÃO se usa heapUsed/heapTotal (falso positivo: heapTotal é dinâmico — ver shared-kernel/memory).
    const mem = memoryStats();
    const memoryOk = mem.memoryUsedPct < 0.9;

    const status =
      !database && !redis
        ? 'unhealthy'
        : database && redis && memoryOk
          ? 'ok'
          : 'degraded';

    return {
      status,
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database,
        redis,
        storage,
        heapUsedPct: mem.heapUsedPct,
        memoryUsedPct: mem.memoryUsedPct,
        rssBytes: mem.rssBytes,
      },
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
