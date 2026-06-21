import 'reflect-metadata';
import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { buildFastifyAdapter } from './bootstrap/fastify-adapter';
import type { Env } from './bootstrap/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    buildFastifyAdapter(),
    { bodyParser: false }, // usamos nosso parser tolerante (ver fastify-adapter.ts)
  );

  const config = app.get<ConfigService<Env, true>>(ConfigService);

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
