import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { BrandingService } from '../application/branding.service';
import { JwtAuthGuard } from './auth.guard';
import { MinRole } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const updateSchema = z.object({
  productName: z.string().min(1).max(60),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'cor hex inválida (ex.: #10b981)'),
  logoUrl: z.string().url().max(2000).nullable().optional(),
  faviconUrl: z.string().url().max(2000).nullable().optional(),
});

@Controller('branding')
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  // PÚBLICO: a tela de login precisa do branding ANTES de autenticar.
  @Get()
  get() {
    return this.branding.get();
  }

  // Só OWNER edita.
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @MinRole('OWNER')
  async update(@Body() body: unknown) {
    const r = updateSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.branding.set({
      productName: r.data.productName,
      primaryColor: r.data.primaryColor,
      logoUrl: r.data.logoUrl ?? null,
      faviconUrl: r.data.faviconUrl ?? null,
    });
  }
}
