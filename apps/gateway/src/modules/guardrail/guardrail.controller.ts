import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from '../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../iam/interface/roles.guard';
import { GuardrailService } from './guardrail.service';

// G5 — leitura/observação do guard-rail. (Override manual e /health completo são do G7.)
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('guardrail')
export class GuardrailController {
  constructor(private readonly guardrail: GuardrailService) {}

  // Estado atual + o que o guard-rail FARIA (targetState), reply-rate e mediana da frota.
  // Em modo observação (enforce=false) `applied` vem false e o estado não muda sozinho.
  @Get(':sessionId')
  evaluate(@Param('sessionId') sessionId: string) {
    return this.guardrail.evaluate(sessionId);
  }
}
