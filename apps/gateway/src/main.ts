import 'reflect-metadata';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { buildFastifyAdapter } from './bootstrap/fastify-adapter';
import type { Env } from './bootstrap/config';

async function bootstrap(): Promise<void> {
  // Isolamento de falhas (F7.2): um erro não-tratado de uma sessão NÃO derruba o processo
  // (e, portanto, não derruba as outras sessões). Loga e segue — rede de segurança; os erros
  // são tratados localmente nos handlers da engine (wrapper `safe()`).
  process.on('uncaughtException', (err) => {
    Logger.error(
      `uncaughtException: ${err?.message ?? err}`,
      err?.stack,
      'Process',
    );
  });
  process.on('unhandledRejection', (reason) => {
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
    { bodyParser: false }, // usamos nosso parser tolerante (ver fastify-adapter.ts)
  );

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Security headers (item 19 da auditoria 07/2026). CSP desligada de propósito: isto é uma API
  // JSON — CSP só atrapalharia consumidores; os headers do dashboard ficam no nginx dele.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Rate limit global por IP (item 14): protege o login de brute-force e a API pública de abuso.
  // O login tem teto próprio bem mais baixo; /health fica de fora (healthcheck do Docker/Traefik
  // bate com frequência). RATE_LIMIT_MAX=0 desliga; default é folgado para o polling do dashboard.
  const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 600);
  if (Number.isFinite(rateMax) && rateMax > 0) {
    await app.register(rateLimit, {
      timeWindow: '1 minute',
      max: (req) => (req.url.startsWith('/api/auth/login') ? 10 : rateMax),
      allowList: (req) => req.url === '/health',
    });
  }

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
