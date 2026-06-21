import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  // Responde 200 (ok/degraded) ou 503 (unhealthy) — passthrough mantém a serialização do Nest.
  @Get()
  async check(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<HealthReport> {
    const report = await this.health.check();
    reply.status(report.status === 'unhealthy' ? 503 : 200);
    return report;
  }
}
