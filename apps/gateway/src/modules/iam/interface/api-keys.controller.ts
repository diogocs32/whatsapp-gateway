import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiKeyService } from '../application/api-key.service';
import { JwtAuthGuard } from './auth.guard';
import { MinRole } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const createSchema = z.object({ name: z.string().min(1).max(60) });

// CRUD de API keys — só pelo painel (JWT). A chave em texto é retornada UMA ÚNICA VEZ na criação.
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole('ADMIN')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'nome inválido',
      );
    }
    return this.apiKeys.create(parsed.data.name); // { id, name, prefix, key }
  }

  @Get()
  async list() {
    const rows = await this.apiKeys.list();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    await this.apiKeys.revoke(id);
    return { ok: true };
  }
}
