import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../bootstrap/config';
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
  verifyPasswordDummy,
} from '../../../shared-kernel/crypto';
import { newId } from '../../../shared-kernel/ulid';
import type { User } from '../domain/user.entity';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../domain/refresh-token.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../domain/user.repository';
import { TokenService } from './token.service';

export interface AuthUserDto {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}

// Motivo de falha do refresh, para o controller mapear a resposta (todos viram 401 + limpar cookies;
// 'reused' já revogou a família no repositório).
export type RefreshError = 'invalid' | 'reused';

interface RequestCtx {
  userAgent?: string | null;
  ip?: string | null;
}

// Orquestra o ciclo de vida da sessão do painel: login (verifica credenciais + abre família de
// refresh), refresh (rotaciona) e logout (revoga a família). Substitui o antigo LoginUseCase.
@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(
    username: string,
    password: string,
    ctx: RequestCtx = {},
  ): Promise<IssuedSession | null> {
    const user = await this.users.findByUsername(username);
    if (!user) {
      // Custo equivalente ao de um usuário real — sem isto o tempo de resposta denuncia se o
      // username existe (ABE-11).
      await verifyPasswordDummy();
      return null;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    // Migração transparente de custo/formato do hash (ABE-11): re-hasheia no login bem-sucedido.
    if (passwordNeedsRehash(user.passwordHash)) {
      await this.users
        .updatePassword(user.id, await hashPassword(password))
        .catch((e) =>
          // best-effort: o login não depende disto — mas fica registrado
          this.logger.warn(
            `re-hash da senha do usuário ${user.id} falhou: ${(e as Error).message}`,
          ),
        );
    }
    return this.issue(user, newId(), ctx);
  }

  async refresh(
    rawRefresh: string,
    ctx: RequestCtx = {},
  ): Promise<IssuedSession | { error: RefreshError }> {
    const refresh = this.tokens.newRefresh();
    const ttl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    const result = await this.refreshTokens.rotate({
      presentedHash: this.tokens.hashRefresh(rawRefresh),
      newId: newId(),
      newTokenHash: refresh.hash,
      newExpiresAt: new Date(Date.now() + ttl * 1000),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    if (result.status === 'reused') return { error: 'reused' };
    if (result.status !== 'ok') return { error: 'invalid' };

    const user = await this.users.findById(result.userId);
    if (!user) return { error: 'invalid' };
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return {
      accessToken,
      refreshToken: refresh.raw,
      user: this.toUserDto(user),
    };
  }

  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    await this.refreshTokens.revokeFamilyByToken(
      this.tokens.hashRefresh(rawRefresh),
    );
  }

  private async issue(
    user: User,
    sessionId: string,
    ctx: RequestCtx,
  ): Promise<IssuedSession> {
    const refresh = this.tokens.newRefresh();
    const ttl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    await this.refreshTokens.create({
      id: newId(),
      userId: user.id,
      tokenHash: refresh.hash,
      sessionId,
      expiresAt: new Date(Date.now() + ttl * 1000),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return {
      accessToken,
      refreshToken: refresh.raw,
      user: this.toUserDto(user),
    };
  }

  private toUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  }
}
