import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';
import { SessionEventLogger } from './session-event.logger';

@Module({
  imports: [IamModule], // JwtAuthGuard / JwtModule
  controllers: [MetricsController, ObservabilityController],
  providers: [MetricsService, SessionEventLogger],
})
export class ObservabilityModule {}
