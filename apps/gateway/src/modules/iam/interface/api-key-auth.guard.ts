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
import { ApiKeyService } from '../application/api-key.service';
import {
  assertCookieAuthCsrfSafe,
  extractToken,
  type JwtPayload,
} from './auth.guard';

// Guard dos endpoints de API: aceita header X-Api-Key (integrações: n8n etc.) OU Bearer JWT (painel).
// Compatível com o padrão WAHA/Evolution (X-Api-Key).
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      FastifyRequest & {
        cookies?: Record<string, string | undefined>;
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

    // 2) JWT do painel: Bearer OU cookie httpOnly (mesma lógica do JwtAuthGuard — item 19).
    //    Cookie em requisição com efeito passa pela verificação CSRF (ABE-12).
    const extracted = extractToken(req);
    if (extracted) {
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

    throw new UnauthorizedException('Forneça X-Api-Key ou Bearer token');
  }
}
