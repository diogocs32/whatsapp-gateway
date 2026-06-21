import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

export interface HealthReport {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  checks: { database: boolean; redis: boolean };
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

    const status =
      database && redis ? 'ok' : database || redis ? 'degraded' : 'unhealthy';

    return {
      status,
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database, redis },
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
