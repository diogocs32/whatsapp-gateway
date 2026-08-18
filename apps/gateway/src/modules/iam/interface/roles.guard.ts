import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { roleMeets, type Role } from '../domain/role';
import type { JwtPayload } from './auth.guard';
import { MIN_ROLE_KEY } from './roles.decorator';

// Autorização por papel (RBAC). Roda DEPOIS do guard de autenticação (ApiKeyAuthGuard/JwtAuthGuard)
// no mesmo @UseGuards — então req.user (JWT) ou req.apiKey já está populado.
//
// Papel mínimo exigido por endpoint:
//   1) @MinRole(...) explícito (no método ou na classe) tem prioridade — usado p/ exigir ADMIN
//      (infra: webhooks/proxies/api-keys, e criar/remover sessão);
//   2) sem @MinRole, o default vem do VERBO HTTP: leitura (GET/HEAD/OPTIONS) exige VIEWER,
//      escrita (POST/PUT/PATCH/DELETE) exige OPERATOR.
//
// Decisão de produto: uma API key autenticada equivale ao papel ADMIN (opera + administra
// recursos via API, mas não acessa IAM/usuários, que ficam só no JWT do painel).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const explicit = this.reflector.getAllAndOverride<Role | undefined>(
      MIN_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: JwtPayload;
        apiKey?: { id: string; name: string };
      }
    >();

    const method = (req.method ?? 'GET').toUpperCase();
    const isRead =
      method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    const required: Role = explicit ?? (isRead ? 'VIEWER' : 'OPERATOR');

    const role: Role | undefined = req.apiKey
      ? 'ADMIN'
      : (req.user?.role as Role | undefined);

    if (!role) {
      throw new UnauthorizedException('Não autenticado');
    }
    if (!roleMeets(role, required)) {
      throw new ForbiddenException(
        `Acesso negado: requer papel ${required} ou superior`,
      );
    }
    return true;
  }
}
