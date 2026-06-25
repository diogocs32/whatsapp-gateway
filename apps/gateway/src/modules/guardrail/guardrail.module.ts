import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { ObservabilityModule } from '../observability/observability.module';
import { GuardrailController } from './guardrail.controller';
import { GuardrailService } from './guardrail.service';

// G5 — guard-rail. Importa ObservabilityModule pelo ReplyRateService (G4). Exporta o
// GuardrailService para o MessagingModule (hard-gate no envio) e para o G7 (override/health).
@Module({
  imports: [IamModule, ObservabilityModule],
  controllers: [GuardrailController],
  providers: [GuardrailService],
  exports: [GuardrailService],
})
export class GuardrailModule {}
