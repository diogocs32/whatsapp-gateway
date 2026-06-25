import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from '../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../iam/interface/roles.guard';
import { MetricsService } from './metrics.service';
import { ReplyRateService } from './reply-rate.service';

// Endpoints JSON da Observability para a UI (tela "Logs & saúde") e integrações.
// Aceitam X-Api-Key ou Bearer JWT. O scrape Prometheus fica no MetricsController (/metrics, sem auth, fora do /api).
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly replyRate: ReplyRateService,
  ) {}

  @Get('summary')
  summary() {
    return this.metrics.summary();
  }

  @Get('timeline/:sessionId')
  timeline(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.metrics.timeline(sessionId, n);
  }

  // G4 — reply-rate por sessão (aceita id ou nome). Sem ?window devolve o snapshot 7d+30d;
  // com ?window=7|30 devolve só aquela janela. Modo observação: mede sem agir (quarentena é G5).
  @Get('reply-rate/:sessionId')
  replyRateMetrics(
    @Param('sessionId') sessionId: string,
    @Query('window') window?: string,
  ) {
    const w = Number(window);
    if (w === 7 || w === 30) {
      return this.replyRate.compute(sessionId, w);
    }
    return this.replyRate.snapshot(sessionId);
  }
}
