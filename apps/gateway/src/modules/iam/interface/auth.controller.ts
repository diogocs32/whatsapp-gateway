import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Env } from '../../../bootstrap/config';
import { LoginUseCase } from '../application/login.usecase';
import { JwtAuthGuard, type JwtPayload } from './auth.guard';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('login')
  async signIn(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      throw new UnauthorizedException('Credenciais inválidas');

    const result = await this.login.execute(
      parsed.data.username,
      parsed.data.password,
    );
    if (!result) throw new UnauthorizedException('Credenciais inválidas');

    // Item 19: além do body (integrações/e2e continuam usando o token), o JWT vai num cookie
    // httpOnly — o dashboard não guarda mais nada no localStorage (XSS não alcança o token).
    // SameSite=Lax cobre o cross-subdomínio painel↔api (mesmo site registrável); Secure em prod.
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    });
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
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
