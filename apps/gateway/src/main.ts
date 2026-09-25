import 'reflect-metadata';
import helmet from '@fastify/helmet';
import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { bridgeConsoleToLogger } from './bootstrap/console-bridge';
import { buildFastifyAdapter } from './bootstrap/fastify-adapter';
import { LoggingExceptionFilter } from './bootstrap/logging-exception.filter';
import { rateLimitMaxFromEnv, registerRateLimit } from './bootstrap/rate-limit';
import type { Env } from './bootstrap/config';
import { recordProcessError } from './shared-kernel/process-errors';

async function bootstrap(): Promise<void> {
  // Isolamento de falhas (F7.2): um erro não-tratado de uma sessão NÃO derruba o processo
  // (e, portanto, não derruba as outras sessões). Loga e segue — rede de segurança; os erros
  // são tratados localmente nos handlers da engine (wrapper `safe()`).
  // Auditoria 09/2026 (ABE-19): isto NÃO é estado saudável — cada ocorrência vira contador em
  // /metrics (`gateway_process_errors_total{kind}`) para alarme; encerrar o processo a cada
  // rejection não é opção (as libs de WhatsApp emitem rejections transitórias — restart em
  // rajada derrubaria a frota inteira, o oposto do isolamento pretendido).
  process.on('uncaughtException', (err) => {
    recordProcessError('uncaughtException');
    Logger.error(
      `uncaughtException: ${err?.message ?? err}`,
      err?.stack,
      'Process',
    );
  });
  process.on('unhandledRejection', (reason) => {
    recordProcessError('unhandledRejection');
    const err = reason instanceof Error ? reason : undefined;
    Logger.error(
      `unhandledRejection: ${err?.message ?? String(reason)}`,
      err?.stack,
      'Process',
    );
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    buildFastifyAdapter(),
    // bodyParser: false — usamos nosso parser tolerante (ver fastify-adapter.ts).
    // bufferLogs — segura os logs do boot até o pino assumir (item 18), nada sai fora do formato.
    { bodyParser: false, bufferLogs: true },
  );

  // Toda a app (inclusive Logger estático do Nest) passa a logar via pino estruturado.
  app.useLogger(app.get(PinoLogger));
  // Toda exceção HTTP vira UMA linha com contexto (método, rota, status, código, sessão, ator):
  // 4xx em warn, 5xx em error com stack — a resposta segue idêntica à do Nest (P-042).
  app.useGlobalFilters(new LoggingExceptionFilter(app.getHttpAdapter()));
  // console.* das libs (libsignal despeja o registro da sessão Signal; BullMQ no fallback de
  // 'error') entra no pino como UMA linha estruturada em vez de texto solto multi-linha (P-042).
  bridgeConsoleToLogger(app.get(PinoLogger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Security headers (item 19 da auditoria 07/2026). CSP desligada de propósito: isto é uma API
  // JSON — CSP só atrapalharia consumidores; os headers do dashboard ficam no nginx dele.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Rate limit global por IP (item 14) + teto próprio do login preso à rota (P-053, D-025) — ver
  // bootstrap/rate-limit.ts. Registrado aqui, ANTES do listen (que registra as rotas).
  const rateMax = rateLimitMaxFromEnv();
  if (rateMax > 0) await registerRateLimit(app, rateMax);

  // /api para tudo, exceto /health (usado pelo healthcheck do Docker/Swarm — blueprint §19.6).
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });

  // CORS — origens vêm de CORS_ORIGIN no .env (lido no boot; mudanças no .env exigem restart).
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(','),
    credentials: true,
    // Declara os métodos explicitamente — o default não inclui PUT/PATCH e o preflight
    // do assignment de proxy (PUT /api/sessions/:id/proxy) era bloqueado por CORS.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Dispara onModuleDestroy (Prisma $disconnect, Redis quit) em SIGTERM/SIGINT — blueprint §18.4.
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');

  Logger.log(`Runtime: Node ${process.version}`, 'Bootstrap');
  Logger.log(`Gateway: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Health:  http://localhost:${port}/health`, 'Bootstrap');
}

void bootstrap();
