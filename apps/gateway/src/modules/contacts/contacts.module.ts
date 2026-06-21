import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ContactsController } from './interface/contacts.controller';

@Module({
  imports: [IamModule, SessionsModule],
  controllers: [ContactsController],
})
export class ContactsModule {}
