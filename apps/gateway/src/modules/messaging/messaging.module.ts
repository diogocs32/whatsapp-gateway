import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { MessagePersister } from './application/message-persister.service';
import { MESSAGE_REPOSITORY } from './domain/message.repository';
import { PrismaMessageRepository } from './infrastructure/prisma-message.repository';
import { MessagesController } from './interface/messages.controller';

@Module({
  imports: [IamModule, SessionsModule],
  controllers: [MessagesController],
  providers: [
    MessagePersister,
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
  ],
})
export class MessagingModule {}
