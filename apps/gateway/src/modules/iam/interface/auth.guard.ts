import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

// Extrai o JWT do painel: header Authorization Bearer (integrações/e2e/consumidores de API) OU
// cookie httpOnly `token` (item 19 — o dashboard não guarda mais o token no localStorage; o
// cookie é setado no login e o EventSource o envia com withCredentials, então o SSE autentica
// sem expor token na URL).
export function bearerOrCookieToken(
  req: FastifyRequest & { cookies?: Record<string, string | undefined> },
): string | null {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  if (type === 'Bearer' && token) return token;
  return req.cookies?.token ?? null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload }>();

    const token = bearerOrCookieToken(req);
    if (!token) {
      throw new UnauthorizedException('Token ausente');
    }

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
