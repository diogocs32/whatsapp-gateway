import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import { recordProcessError } from '../../../shared-kernel/process-errors';
import { AuditService } from '../application/audit.service';
import type { JwtPayload } from './auth.guard';

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Teto da coluna `path`: a forma absoluta traz host escolhido pelo cliente (até ~16 KB por linha).
const MAX_PATH = 512;

interface AuditReq {
  method: string;
  url: string;
  // FastifyRequest: padrão da rota casada, ex. '/api/sessions/:id/proxy' (getter — ler 1 vez).
  routeOptions?: { url?: string };
  ip?: string;
  user?: JwtPayload;
  apiKey?: { id: string; name: string };
  // Ator de uma credencial que não é usuário nem API key, posto pelo guard da rota (E27: o token
  // do link público de conexão → `link:<id> (de <quem criou>)`). O iam não sabe o que é um link.
  auditActor?: string;
  body?: { username?: string };
}

const MAX_ACTOR = 200;

// Audita automaticamente as mutações em /api/* (exceto as rotas de /messages — envio e afins,
// alto volume; catálogo explícito de ações = P-036).
// Registra ator (JWT / API key / tentativa de login), método, path, status e IP.
// Fire-and-forget: falha de auditoria NUNCA derruba a request.
//
// P-053: QUEM é auditado decide pela rota RESOLVIDA (`routeOptions.url`), não por `req.url` — o
// alvo cru aceita forma absoluta (`POST http://host/api/...`) e %-encoding (`/%61pi/...`), que
// casam a mesma rota e escapavam da trilha. A coluna `path` continua com o alvo como veio (sem
// query, com teto): a tentativa de evasão fica visível no painel.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuditReq>();
    if (!this.shouldAudit(req)) return next.handle();

    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    return next.handle().pipe(
      tap(() => this.record(req, res.statusCode ?? 200)),
      catchError((err: { status?: number }) => {
        this.record(req, err?.status ?? 500);
        return throwError(() => err);
      }),
    );
  }

  private shouldAudit(req: AuditReq): boolean {
    if (!MUTATIONS.has(req.method)) return false;
    const route = req.routeOptions?.url;
    // Sem rota (404) o interceptor nem roda; se um dia chegar aqui, audita (falha fechada).
    if (route === undefined) return true;
    return route.startsWith('/api/') && !route.includes('/messages');
  }

  private record(req: AuditReq, statusCode: number): void {
    const path = req.url.split('?')[0].slice(0, MAX_PATH);
    // `login:` só na rota de login (E27): antes, qualquer mutação anônima com `username` no corpo
    // gravava um ator forjado ("login:admin").
    const actor = req.user
      ? `${req.user.username} (${req.user.role})`
      : req.apiKey
        ? `key:${req.apiKey.name}`
        : req.auditActor
          ? req.auditActor.slice(0, MAX_ACTOR)
          : req.body?.username && req.routeOptions?.url === '/api/auth/login'
            ? `login:${req.body.username}`
            : 'anônimo';
    void this.audit
      .log({
        actor,
        method: req.method,
        path,
        statusCode,
        ip: req.ip ?? null,
      })
      .catch((e: unknown) => {
        // Nunca derruba a request — mas perda de trilha precisa ser VISÍVEL (ABE-18): log +
        // contador exposto em /metrics (gateway_process_errors_total{kind="audit_write"}).
        recordProcessError('audit_write');
        this.logger.warn(
          `falha ao gravar audit (${req.method} ${path}): ${(e as Error)?.message ?? e}`,
        );
      });
  }
}
