import {
  CanActivate,
  ExecutionContext,
  Injectable,
  MethodNotAllowedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ConnectLinkService } from '../application/connect-link.service';
import type { ConnectLinkRecord } from '../domain/connect-link';

export type ConnectLinkRequest = FastifyRequest & {
  connectLink?: ConnectLinkRecord;
  auditActor?: string;
};

// E27 · P-086 — credencial das rotas públicas do link: o token vem em `Authorization: Bearer`
// (header já liberado no CORS e redigido no log; nunca no caminho/query, que iriam para log e
// auditoria). Rejeição aqui (404/410) não gera linha de auditoria — como um 401 de login.
@Injectable()
export class ConnectLinkTokenGuard implements CanActivate {
  constructor(private readonly links: ConnectLinkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ConnectLinkRequest>();
    // O Fastify cria um HEAD irmão de todo GET, com balde próprio no rate-limit (o teto de leitura
    // viraria 240/min). A página não usa HEAD: recusa antes de qualquer consulta ao banco.
    if (req.method === 'HEAD') throw new MethodNotAllowedException();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    const link = await this.links.resolveToken(
      type === 'Bearer' ? (token ?? null) : null,
    );
    req.connectLink = link;
    // Ator da auditoria do POST público (AuditInterceptor): o link e quem o criou.
    req.auditActor = `link:${link.id} (de ${link.createdBy})`;
    return true;
  }
}
