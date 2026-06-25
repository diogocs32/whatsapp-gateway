import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';
import { ReplyRateService } from './reply-rate.service';
import { SessionEventLogger } from './session-event.logger';

@Module({
  imports: [IamModule], // JwtAuthGuard / JwtModule
  controllers: [MetricsController, ObservabilityController],
  providers: [MetricsService, SessionEventLogger, ReplyRateService],
  exports: [ReplyRateService], // G5 (guard-rail) consumirá o reply-rate
})
export class ObservabilityModule {}
