import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import { AuditService } from '../application/audit.service';
import type { JwtPayload } from './auth.guard';

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface AuditReq {
  method: string;
  url: string;
  ip?: string;
  user?: JwtPayload;
  apiKey?: { id: string; name: string };
  body?: { username?: string };
}

// Audita automaticamente as mutações em /api/* (exceto envio de mensagens — alto volume).
// Registra ator (JWT / API key / tentativa de login), método, rota, status e IP.
// Fire-and-forget: falha de auditoria NUNCA derruba a request.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
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
    const path = req.url.split('?')[0];
    return path.startsWith('/api/') && !path.includes('/messages');
  }

  private record(req: AuditReq, statusCode: number): void {
    const actor = req.user
      ? `${req.user.username} (${req.user.role})`
      : req.apiKey
        ? `key:${req.apiKey.name}`
        : req.body?.username
          ? `login:${req.body.username}`
          : 'anônimo';
    void this.audit
      .log({
        actor,
        method: req.method,
        path: req.url.split('?')[0],
        statusCode,
        ip: req.ip ?? null,
      })
      .catch(() => {
        /* nunca derruba a request por falha de audit */
      });
  }
}
