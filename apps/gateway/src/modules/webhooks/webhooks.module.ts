import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { WebhookDispatcher } from './application/webhook-dispatcher.service';
import { WEBHOOK_REPOSITORY } from './domain/webhook.repository';
import { PrismaWebhookRepository } from './infrastructure/prisma-webhook.repository';
import { WebhookQueue } from './infrastructure/webhook-queue';
import { WebhooksController } from './interface/webhooks.controller';

@Module({
  imports: [IamModule],
  controllers: [WebhooksController],
  providers: [
    WebhookQueue,
    WebhookDispatcher,
    { provide: WEBHOOK_REPOSITORY, useClass: PrismaWebhookRepository },
  ],
})
export class WebhooksModule {}
