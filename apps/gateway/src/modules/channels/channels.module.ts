import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ChannelsController } from './interface/channels.controller';

@Module({
  imports: [IamModule, SessionsModule],
  controllers: [ChannelsController],
})
export class ChannelsModule {}
