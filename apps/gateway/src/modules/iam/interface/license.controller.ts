import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { LicenseService } from '../application/license.service';
import type { EffectiveLicense } from '../domain/license';
import { JwtAuthGuard } from './auth.guard';
import { MinRole } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const installSchema = z.object({ token: z.string().min(10).max(4000) });

function toDto(l: EffectiveLicense) {
  return {
    valid: l.valid,
    community: l.community,
    customer: l.customer,
    maxSeats: l.maxSeats,
    maxSessions: l.maxSessions,
    features: l.features,
    issuedAt: l.iat ? new Date(l.iat).toISOString() : null,
    expiresAt: l.exp ? new Date(l.exp).toISOString() : null,
    reason: l.reason ?? null,
  };
}

// Licenciamento (F9.5). Só pelo painel (JWT) e somente OWNER.
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole('OWNER')
@Controller('license')
export class LicenseController {
  constructor(private readonly license: LicenseService) {}

  @Get()
  status() {
    return toDto(this.license.effective());
  }

  @Post()
  async install(@Body() body: unknown) {
    const r = installSchema.safeParse(body);
    if (!r.success) throw new BadRequestException('token inválido');
    return toDto(await this.license.install(r.data.token));
  }

  @Delete()
  async remove() {
    return toDto(await this.license.remove());
  }
}
