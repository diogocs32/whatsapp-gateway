import { Module } from '@nestjs/common';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ForwardService } from './application/forward.service';
import { InboxSyncService } from './application/inbox-sync.service';
import { MessagePersister } from './application/message-persister.service';
import { ReactionPersister } from './application/reaction-persister.service';
import { SendIntentService } from './application/send-intent.service';
import { INBOX_REPOSITORY } from './domain/inbox.repository';
import { MESSAGE_REPOSITORY } from './domain/message.repository';
import { REACTION_REPOSITORY } from './domain/reaction.repository';
import { PrismaInboxRepository } from './infrastructure/prisma-inbox.repository';
import { PrismaMessageRepository } from './infrastructure/prisma-message.repository';
import { PrismaReactionRepository } from './infrastructure/prisma-reaction.repository';
import { InboxController } from './interface/inbox.controller';
import { MessagesController } from './interface/messages.controller';

@Module({
  imports: [IamModule, SessionsModule, GuardrailModule],
  controllers: [MessagesController, InboxController],
  providers: [
    MessagePersister,
    // P-066 (E22): reações em tabela própria (wa_message_reactions), fora de wa_messages.
    ReactionPersister,
    InboxSyncService,
    SendIntentService,
    // P-068 (E24): encaminhar — laço por destino com intenção, gate cold e intervalo.
    ForwardService,
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    { provide: REACTION_REPOSITORY, useClass: PrismaReactionRepository },
    // Caixa única de triagem (página Atendimento): leitura agregada de todas as sessões.
    { provide: INBOX_REPOSITORY, useClass: PrismaInboxRepository },
  ],
})
export class MessagingModule {}
