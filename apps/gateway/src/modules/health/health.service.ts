import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

export interface HealthReport {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  checks: { database: boolean; redis: boolean; heapUsedPct: number };
  version: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.redis.ping(),
    ]);

    // Pressão de memória: heap usado / heap total. >92% sinaliza degradação (blueprint §14).
    const mem = process.memoryUsage();
    const heapUsedPct = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;
    const heapOk = heapUsedPct < 0.92;

    const status =
      !database && !redis
        ? 'unhealthy'
        : database && redis && heapOk
          ? 'ok'
          : 'degraded';

    return {
      status,
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database,
        redis,
        heapUsedPct: Math.round(heapUsedPct * 100) / 100,
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
