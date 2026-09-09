import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './bootstrap/config';
import { logSerializers, LOG_REDACT_PATHS } from './bootstrap/log-redaction';
import { SharedKernelModule } from './shared-kernel/shared-kernel.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { StorageModule } from './infra/storage/storage.module';
import { DirectoryModule } from './infra/directory/directory.module';
import { HealthModule } from './modules/health/health.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { IamModule } from './modules/iam/iam.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { EventsModule } from './modules/events/events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProxiesModule } from './modules/proxies/proxies.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { GuardrailModule } from './modules/guardrail/guardrail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Logs estruturados da app inteira (item 18 da auditoria 07/2026): JSON em produção
    // (grep/Loki-ready — a engine Baileys já logava JSON via pino; isto unifica), pretty em dev,
    // silencioso nos e2e. Request-log só para mutações e erros — GET 2xx é silencioso (o polling
    // do dashboard inundaria o console); /health e /metrics nunca logam. Nível via LOG_LEVEL.
    LoggerModule.forRoot({
      pinoHttp: {
        level:
          process.env.LOG_LEVEL ??
          (process.env.NODE_ENV === 'test'
            ? 'silent'
            : process.env.NODE_ENV === 'production'
              ? 'info'
              : 'debug'),
        // Segredos fora do log (ABE-08): cookie da sessão, set-cookie do login, ?token= do
        // SSE/metrics, Authorization/X-Api-Key. Serializers redigem cópias (URL inclusa); a
        // lista `redact` é a 2ª camada para caminhos fixos.
        redact: LOG_REDACT_PATHS,
        serializers: logSerializers(),
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: {
          ignore: (req) =>
            req.url === '/health' || (req.url ?? '').startsWith('/metrics'),
        },
        customLogLevel: (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return req.method === 'GET' ? 'silent' : 'info';
        },
      },
    }),
    SharedKernelModule,
    PrismaModule,
    RedisModule,
    StorageModule,
    DirectoryModule,
    HealthModule,
    ObservabilityModule,
    IamModule,
    SessionsModule,
    MessagingModule,
    EventsModule,
    WebhooksModule,
    ProxiesModule,
    GroupsModule,
    ContactsModule,
    ChannelsModule,
    CampaignsModule,
    GuardrailModule,
  ],
})
export class AppModule {}
