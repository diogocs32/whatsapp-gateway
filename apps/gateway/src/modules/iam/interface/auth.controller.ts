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
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Env } from '../../../bootstrap/config';
import { LOGIN_RATE_LIMIT } from '../../../bootstrap/rate-limit';
import {
  AuthSessionService,
  type IssuedSession,
} from '../application/auth-session.service';
import { JwtAuthGuard, type JwtPayload } from './auth.guard';
import { assertCsrfSafe, parseAllowedOrigins } from './csrf';

// Tetos de tamanho limitam o custo por tentativa (scrypt) — ABE-11.
const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

// Cookie do access (JWT curto). Nome MANTIDO como `token`: o JwtAuthGuard e o SseAuthGuard leem
// `req.cookies.token` — renomear quebraria o SSE (R0).
const ACCESS_COOKIE = 'token';
// Cookie do refresh (opaco, longo). Path restrito a /api/auth → o browser só o envia nas rotas de
// auth (login/refresh/logout), nunca no resto da API. `clearCookie` precisa do MESMO path.
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

type CookieReq = FastifyRequest & {
  cookies?: Record<string, string | undefined>;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthSessionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Teto próprio contra força bruta, preso à rota (P-053, D-025 — ver bootstrap/rate-limit.ts).
  @Post('login')
  @RouteConfig({ rateLimit: LOGIN_RATE_LIMIT })
  async signIn(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      throw new UnauthorizedException('Credenciais inválidas');

    const session = await this.auth.login(
      parsed.data.username,
      parsed.data.password,
      this.ctx(req),
    );
    if (!session) throw new UnauthorizedException('Credenciais inválidas');

    this.setAuthCookies(reply, session);
    // Body mantém { token, user } (compat: e2e/integrações leem o token). `token` agora é o access curto.
    return { token: session.accessToken, user: session.user };
  }

  // Renovação silenciosa: o front chama isto ao levar 401. Rotaciona o refresh (detecção de reuso no
  // repositório) e reemite o par. Falha → limpa cookies + 401 (o front redireciona para o login).
  @Post('refresh')
  async refresh(
    @Req() req: CookieReq,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    // Refresh/logout são autenticados SÓ por cookie → verificação CSRF (ABE-12).
    assertCsrfSafe(req, this.allowedOrigins());
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      this.clearAuthCookies(reply);
      throw new UnauthorizedException('Sessão expirada');
    }
    const result = await this.auth.refresh(raw, this.ctx(req));
    if ('error' in result) {
      this.clearAuthCookies(reply);
      throw new UnauthorizedException('Sessão expirada');
    }
    this.setAuthCookies(reply, result);
    return { token: result.accessToken, user: result.user };
  }

  @Post('logout')
  async logout(
    @Req() req: CookieReq,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    assertCsrfSafe(req, this.allowedOrigins());
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearAuthCookies(reply);
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

  private ctx(req: FastifyRequest) {
    return {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    };
  }

  private allowedOrigins(): string[] {
    return parseAllowedOrigins(this.config.get('CORS_ORIGIN', { infer: true }));
  }

  private setAuthCookies(reply: FastifyReply, session: IssuedSession): void {
    const secure = process.env.NODE_ENV === 'production';
    reply.setCookie(ACCESS_COOKIE, session.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.config.get('JWT_REFRESH_TTL', { infer: true }),
    });
  }

  private clearAuthCookies(reply: FastifyReply): void {
    reply.clearCookie(ACCESS_COOKIE, { path: '/' });
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }
}
