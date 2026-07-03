import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

// EventSource não envia header Authorization → cookie httpOnly (withCredentials — item 19,
// preferido: nada de token na URL/logs de proxy) OU ?token= na query (compatibilidade).
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<
        FastifyRequest & { cookies?: Record<string, string | undefined> }
      >();
    const token =
      req.cookies?.token ?? (req.query as { token?: string })?.token;
    if (!token) throw new UnauthorizedException('Token ausente');
    try {
      await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
