import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './bootstrap/config';
import { httpLoggerOptions } from './bootstrap/http-logger';
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
    // (grep/Loki-ready — a engine Baileys já logava JSON via pino; isto unifica). Regras do
    // request-log (níveis, /health e /metrics, redação) em bootstrap/http-logger.ts.
    LoggerModule.forRoot({ pinoHttp: httpLoggerOptions() }),
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
