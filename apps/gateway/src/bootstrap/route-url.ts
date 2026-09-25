import type { IncomingMessage } from 'node:http';
import { Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import { maskUrlSecrets } from './log-redaction';

// Rota RESOLVIDA pelo router (`request.routeOptions.url`, ex. '/api/sessions/:id/proxy') carimbada
// no request cru (IncomingMessage) — P-053. Quem recebe o FastifyRequest lê `routeOptions.url`
// direto (rate-limit, AuditInterceptor); o carimbo existe para quem só vê o IncomingMessage: o
// middleware do pino-http (nestjs-pino via @fastify/middie), onde `req.url` chega reduzido a '/'
// e `originalUrl` é o alvo cru (forma absoluta, %-encoding) — decidir por eles é contornável.
// undefined = 404 (nenhuma rota casou).
const ROUTE_URL = Symbol('conexozenvo.routeUrl');

type Stamped = IncomingMessage & { [ROUTE_URL]?: string };

// Registrado no buildFastifyAdapter, antes do middie (no NestFactory o middie entra já no
// create): assim o carimbo existe mesmo para quem o ler DURANTE o middleware. O leitor atual (o
// customLogLevel do http-logger) lê no 'finish' da resposta; o http-logger.spec.ts (montagem de
// produção) falha se o carimbo sumir do adapter.
export function stampRouteUrl(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', (request, _reply, done) => {
    (request.raw as Stamped)[ROUTE_URL] = request.routeOptions.url;
    done();
  });
}

export function routeUrlOf(req: IncomingMessage): string | undefined {
  return (req as Stamped)[ROUTE_URL];
}

// Forma absoluta com '?' ou '#' ANTES da 1ª '/' (`POST http://h?x=/api/webhooks`): pela RFC 3986 a
// autoridade termina ali e o caminho é '/', mas o router do fastify 5.11.3 (find-my-way 9.7.0,
// `FULL_PATH_REGEXP` preguiçoso `^https?:\/\/.*?\/`) casa a rota que está na QUERY, enquanto o
// @fastify/middie e o adapter do Nest resolvem '/' — a mutação rodaria sem linha de request-log e
// a auditoria gravaria só o host (P-071). Cliente de verdade não manda isso a um servidor de
// origem (o Traefik repassa origin-form) → 400 antes de qualquer rota rodar.
const AMBIGUOUS_ABSOLUTE_FORM = /^https?:\/\/[^/]*[?#]/i;

export function rejectAmbiguousAbsoluteForm(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', (request, reply, done) => {
    const target = request.raw.url ?? '';
    if (!AMBIGUOUS_ABSOLUTE_FORM.test(target)) return done();
    Logger.warn(
      `http 400 ${request.method} ${maskUrlSecrets(target)?.slice(0, 512)}: alvo em forma absoluta com ? ou # antes do caminho (recusado — P-071)`,
      'HttpEdge',
    );
    void reply.code(400).send({
      statusCode: 400,
      message:
        'alvo da requisição ambíguo: forma absoluta com ? ou # antes do caminho',
    });
  });
}
