import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { MetricsService } from './metrics.service';

// Endpoint de scrape do Prometheus. Fica FORA do prefixo /api (ver main.ts) —
// convenção é raspar em GET /metrics.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<string> {
    reply.header('Content-Type', this.metrics.registry.contentType);
    return this.metrics.collect();
  }
}
