import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MetricsService } from './metrics.service';

// Endpoint de scrape do Prometheus. Fica FORA do prefixo /api (ver main.ts) —
// convenção é raspar em GET /metrics.
// Item 14 (auditoria 07/2026): o scrape expõe dados operacionais (sessões, volume de mensagens,
// memória) e ficava PÚBLICO na internet. Agora exige METRICS_TOKEN — via `Authorization: Bearer`
// ou `?token=` (o scrape_config do Prometheus suporta os dois). Sem a env configurada, o
// endpoint fica fechado.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(
    @Req() req: FastifyRequest,
    @Query('token') token: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<string> {
    const expected = process.env.METRICS_TOKEN;
    const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!expected || (token !== expected && bearer !== expected)) {
      throw new UnauthorizedException(
        expected
          ? 'Token inválido'
          : 'Scrape desabilitado — configure METRICS_TOKEN para habilitar o /metrics',
      );
    }
    reply.header('Content-Type', this.metrics.registry.contentType);
    return this.metrics.collect();
  }
}
