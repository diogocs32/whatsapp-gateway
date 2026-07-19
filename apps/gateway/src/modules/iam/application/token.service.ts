import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../bootstrap/config';
import { sha512 } from '../../../shared-kernel/crypto';
import type { JwtPayload } from '../interface/auth.guard';

// Emissão de tokens da sessão do painel (refresh-token rotation).
// - Access: JWT curto assinado com o secret PADRÃO do módulo (JWT_SECRET) → o JwtAuthGuard valida
//   sem qualquer mudança. Vida = JWT_ACCESS_TTL (segundos; jsonwebtoken trata número como segundos).
// - Refresh: token OPACO (não-JWT) `rt_<base64url(32B)>`. Guardamos só o sha512(raw) no banco
//   (mesmo padrão do WaApiKey) — o texto vive apenas no cookie httpOnly do cliente.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  signAccess(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(
      { sub: payload.sub, username: payload.username, role: payload.role },
      { expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }) },
    );
  }

  newRefresh(): { raw: string; hash: string } {
    const raw = `rt_${randomBytes(32).toString('base64url')}`;
    return { raw, hash: sha512(raw) };
  }

  hashRefresh(raw: string): string {
    return sha512(raw);
  }
}
