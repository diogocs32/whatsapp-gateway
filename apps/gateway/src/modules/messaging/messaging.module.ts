import { Module } from '@nestjs/common';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { InboxSyncService } from './application/inbox-sync.service';
import { MessagePersister } from './application/message-persister.service';
import { SendIntentService } from './application/send-intent.service';
import { INBOX_REPOSITORY } from './domain/inbox.repository';
import { MESSAGE_REPOSITORY } from './domain/message.repository';
import { PrismaInboxRepository } from './infrastructure/prisma-inbox.repository';
import { PrismaMessageRepository } from './infrastructure/prisma-message.repository';
import { InboxController } from './interface/inbox.controller';
import { MessagesController } from './interface/messages.controller';

@Module({
  imports: [IamModule, SessionsModule, GuardrailModule],
  controllers: [MessagesController, InboxController],
  providers: [
    MessagePersister,
    InboxSyncService,
    SendIntentService,
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    // Caixa única de triagem (página Atendimento): leitura agregada de todas as sessões.
    { provide: INBOX_REPOSITORY, useClass: PrismaInboxRepository },
  ],
})
export class MessagingModule {}
