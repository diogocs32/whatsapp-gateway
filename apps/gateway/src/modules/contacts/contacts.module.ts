import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ContactsController } from './interface/contacts.controller';
import { ContactCheckQuotaService } from './application/contact-check-quota.service';

@Module({
  imports: [IamModule, SessionsModule],
  controllers: [ContactsController],
  providers: [ContactCheckQuotaService],
})
export class ContactsModule {}
