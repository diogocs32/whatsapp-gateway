import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { maskUrlSecrets } from './log-redaction';

// Filtro global de exceções COM LOG (auditoria de logs 09/09 — P-042).
//
// O Nest só loga exceções inesperadas (500); um 4xx lançado de propósito (409 SESSION_NOT_READY,
// 423 SESSION_QUARANTINED, 400 de validação/egress, 401/403) só aparecia como `request completed`
// em warn — SEM o motivo, sem a sessão, sem quem chamou. Este filtro registra UMA linha por
// exceção com contexto (método, rota mascarada, status, código, sessão do path, usuário/api key,
// reqId para correlacionar com o request-log) e devolve a resposta EXATAMENTE como o Nest faria
// (`super.catch`) — o contrato da API não muda (R0). 4xx → warn; 5xx → error com stack.
export interface ExceptionSummary {
  status: number;
  message: string;
  code?: string;
  // true = resposta deliberada (HttpException ou erro estilo http-errors); false = erro inesperado
  known: boolean;
}

interface ErrorLike {
  statusCode?: unknown;
  status?: unknown;
  message?: unknown;
  code?: unknown;
  error?: unknown;
}

// Descrição PURA (testável sem Nest) do que a resposta vai dizer.
export function describeException(exception: unknown): ExceptionSummary {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === 'string') return { status, message: body, known: true };
    const b = (body ?? {}) as ErrorLike;
    const message = Array.isArray(b.message)
      ? b.message.map(String).join('; ')
      : typeof b.message === 'string'
        ? b.message
        : exception.message;
    const code =
      typeof b.code === 'string'
        ? b.code
        : typeof b.error === 'string' && b.error !== message
          ? b.error
          : undefined;
    return { status, message, code, known: true };
  }
  const e = (exception ?? {}) as ErrorLike;
  const status =
    typeof e.statusCode === 'number'
      ? e.statusCode
      : typeof e.status === 'number'
        ? e.status
        : undefined;
  if (status !== undefined && status >= 400 && status < 600) {
    return {
      status,
      message: typeof e.message === 'string' ? e.message : String(exception),
      code: typeof e.code === 'string' ? e.code : undefined,
      known: true,
    };
  }
  return {
    status: 500,
    message: exception instanceof Error ? exception.message : String(exception),
    known: false,
  };
}

interface RequestLike {
  id?: unknown;
  method?: string;
  url?: string;
  ip?: string;
  params?: Record<string, unknown>;
  user?: { sub?: string; username?: string };
  apiKey?: { id?: string; name?: string };
}

function pathOnly(url: string | undefined): string {
  if (!url) return '';
  const qi = url.indexOf('?');
  return qi < 0 ? url : url.slice(0, qi);
}

@Catch()
export class LoggingExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    try {
      this.record(exception, host);
    } catch {
      /* o log nunca pode impedir a resposta */
    }
    super.catch(exception, host);
  }

  private record(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const req = host.switchToHttp().getRequest<RequestLike | undefined>();
    const d = describeException(exception);
    const session =
      typeof req?.params?.id === 'string' ? req.params.id : undefined;
    const fields = {
      reqId: typeof req?.id === 'string' ? req.id : undefined,
      method: req?.method,
      url: maskUrlSecrets(req?.url),
      status: d.status,
      code: d.code,
      session,
      user: req?.user?.username ?? req?.user?.sub,
      apiKey: req?.apiKey?.name,
      ip: req?.ip,
    };
    const msg = `http ${d.status} ${req?.method ?? ''} ${pathOnly(req?.url)}: ${d.message}`;
    if (d.status >= 500) {
      this.logger.error(
        { ...fields, err: exception instanceof Error ? exception : undefined },
        msg,
      );
    } else {
      this.logger.warn(fields, msg);
    }
  }
}
