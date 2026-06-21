import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { LoginUseCase } from '../application/login.usecase';
import { JwtAuthGuard, type JwtPayload } from './auth.guard';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly login: LoginUseCase) {}

  @Post('login')
  async signIn(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      throw new UnauthorizedException('Credenciais inválidas');

    const result = await this.login.execute(
      parsed.data.username,
      parsed.data.password,
    );
    if (!result) throw new UnauthorizedException('Credenciais inválidas');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: FastifyRequest & { user?: JwtPayload }) {
    const payload = req.user;
    return {
      id: payload?.sub,
      username: payload?.username,
      role: payload?.role,
    };
  }
}
