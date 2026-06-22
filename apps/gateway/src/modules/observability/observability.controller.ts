import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from '../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../iam/interface/roles.guard';
import { MetricsService } from './metrics.service';

// Endpoints JSON da Observability para a UI (tela "Logs & saúde") e integrações.
// Aceitam X-Api-Key ou Bearer JWT. O scrape Prometheus fica no MetricsController (/metrics, sem auth, fora do /api).
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('observability')
export class ObservabilityController {
  constructor(private readonly metrics: MetricsService) {}

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
}
