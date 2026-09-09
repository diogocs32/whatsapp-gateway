import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import type { Env } from '../../../bootstrap/config';
import { assertCsrfSafe, parseAllowedOrigins } from './csrf';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

type CookieReq = FastifyRequest & {
  cookies?: Record<string, string | undefined>;
};

export interface ExtractedToken {
  token: string;
  source: 'bearer' | 'cookie';
}

// Extrai o JWT do painel: header Authorization Bearer (integrações/e2e/consumidores de API) OU
// cookie httpOnly `token` (item 19 — o dashboard não guarda mais o token no localStorage; o
// cookie é setado no login e o EventSource o envia com withCredentials, então o SSE autentica
// sem expor token na URL). Devolve também a ORIGEM da credencial: cookie é enviado sozinho pelo
// browser e por isso passa pela verificação CSRF (ABE-12); Bearer não.
export function extractToken(req: CookieReq): ExtractedToken | null {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  if (type === 'Bearer' && token) return { token, source: 'bearer' };
  const cookie = req.cookies?.token;
  return cookie ? { token: cookie, source: 'cookie' } : null;
}

export function bearerOrCookieToken(req: CookieReq): string | null {
  return extractToken(req)?.token ?? null;
}

// Requisição com efeito autenticada por cookie → Origin/Sec-Fetch-Site precisam bater com a
// allowlist do painel (CORS_ORIGIN). 403 caso contrário. Ver csrf.ts.
export function assertCookieAuthCsrfSafe(
  req: CookieReq,
  config: ConfigService<Env, true>,
): void {
  assertCsrfSafe(
    req,
    parseAllowedOrigins(config.get('CORS_ORIGIN', { infer: true })),
  );
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<CookieReq & { user?: JwtPayload }>();

    const extracted = extractToken(req);
    if (!extracted) {
      throw new UnauthorizedException('Token ausente');
    }
    if (extracted.source === 'cookie') {
      assertCookieAuthCsrfSafe(req, this.config);
    }

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(extracted.token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
