import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { UserService } from '../application/user.service';
import { ROLES } from '../domain/role';
import type { User } from '../domain/user.entity';
import { JwtAuthGuard } from './auth.guard';
import { MinRole } from './roles.decorator';
import { RolesGuard } from './roles.guard';

// Política de senha (ABE-11, OWASP Authentication): mínimo 8, máximo 128 (teto limita o custo do
// scrypt por tentativa). Vale para senha NOVA (criar/resetar); login aceita o que está gravado.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const passwordField = () =>
  z
    .string()
    .min(PASSWORD_MIN, `Senha deve ter pelo menos ${PASSWORD_MIN} caracteres`)
    .max(PASSWORD_MAX, `Senha deve ter no máximo ${PASSWORD_MAX} caracteres`);

const createSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, _ . ou -'),
  name: z.string().min(1).max(120),
  password: passwordField(),
  role: z.enum(ROLES),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    role: z.enum(ROLES).optional(),
  })
  .refine((v) => v.name !== undefined || v.role !== undefined, {
    message: 'Informe name e/ou role.',
  });

const passwordSchema = z.object({ password: passwordField() });

function toDto(u: User) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

function parse<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new BadRequestException(
      r.error.issues[0]?.message ?? 'Dados inválidos',
    );
  }
  return r.data;
}

// Gestão de usuários e assentos (F9.4). Apenas pelo painel (JWT) e somente OWNER (IAM).
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole('OWNER')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  async list() {
    const [list, seats] = await Promise.all([
      this.users.list(),
      this.users.seats(),
    ]);
    return {
      users: list.map(toDto),
      usedSeats: seats.used,
      maxSeats: seats.max,
    };
  }

  @Post()
  async create(@Body() body: unknown) {
    return toDto(await this.users.create(parse(createSchema, body)));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    return toDto(await this.users.update(id, parse(updateSchema, body)));
  }

  @Post(':id/password')
  async resetPassword(@Param('id') id: string, @Body() body: unknown) {
    await this.users.resetPassword(id, parse(passwordSchema, body).password);
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.users.remove(id);
    return { ok: true };
  }
}
