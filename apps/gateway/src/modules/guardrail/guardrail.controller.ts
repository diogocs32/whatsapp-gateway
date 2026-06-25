import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiKeyAuthGuard } from '../iam/interface/api-key-auth.guard';
import { MinRole } from '../iam/interface/roles.decorator';
import { RolesGuard } from '../iam/interface/roles.guard';
import { GuardrailService } from './guardrail.service';

const updateConfigSchema = z.object({
  nmin: z.number().int().positive().optional(),
  throttleMult: z.number().positive().optional(),
  quarantineMult: z.number().positive().optional(),
  targetReplyRate: z.number().positive().max(1).optional(),
  cooldownHours: z.number().int().positive().optional(),
});

// G5 — leitura/observação do guard-rail. (Override manual e /health completo são do G7.)
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('guardrail')
export class GuardrailController {
  constructor(private readonly guardrail: GuardrailService) {}

  // G7 — limiares globais do guard-rail, tunáveis em runtime SEM redeploy (declarado antes de
  // :sessionId p/ a rota estática "config" ter prioridade sobre o param).
  @Get('config')
  config() {
    return this.guardrail.getConfig();
  }

  @Patch('config')
  @MinRole('ADMIN')
  updateConfig(@Body() body: unknown) {
    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.guardrail.updateConfig(parsed.data);
  }

  // Estado atual + o que o guard-rail FARIA (targetState), reply-rate e mediana da frota.
  // Em modo observação (enforce=false) `applied` vem false e o estado não muda sozinho.
  @Get(':sessionId')
  evaluate(@Param('sessionId') sessionId: string) {
    return this.guardrail.evaluate(sessionId);
  }
}
