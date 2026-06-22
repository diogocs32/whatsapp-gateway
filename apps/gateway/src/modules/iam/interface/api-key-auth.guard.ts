import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { ApiKeyService } from '../application/api-key.service';
import type { JwtPayload } from './auth.guard';

// Guard dos endpoints de API: aceita header X-Api-Key (integrações: n8n etc.) OU Bearer JWT (painel).
// Compatível com o padrão WAHA/Evolution (X-Api-Key).
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: JwtPayload;
        apiKey?: { id: string; name: string };
      }
    >();

    // 1) X-Api-Key
    const raw = req.headers['x-api-key'];
    const apiKey = Array.isArray(raw) ? raw[0] : raw;
    if (apiKey) {
      const record = await this.apiKeys.validate(apiKey);
      if (!record) {
        throw new UnauthorizedException('API key inválida ou revogada');
      }
      req.apiKey = { id: record.id, name: record.name };
      return true;
    }

    // 2) Bearer JWT (mesma lógica do JwtAuthGuard)
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      try {
        req.user = await this.jwt.verifyAsync<JwtPayload>(token);
        return true;
      } catch {
        throw new UnauthorizedException('Token inválido');
      }
    }

    throw new UnauthorizedException('Forneça X-Api-Key ou Bearer token');
  }
}
