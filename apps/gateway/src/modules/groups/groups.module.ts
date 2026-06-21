import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { GroupsController } from './interface/groups.controller';

@Module({
  imports: [IamModule, SessionsModule], // JwtAuthGuard + SessionManager
  controllers: [GroupsController],
})
export class GroupsModule {}
