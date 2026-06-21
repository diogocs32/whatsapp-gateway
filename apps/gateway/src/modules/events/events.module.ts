import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { EventsController } from './interface/events.controller';
import { SseAuthGuard } from './interface/sse-auth.guard';

@Module({
  imports: [IamModule],
  controllers: [EventsController],
  providers: [SseAuthGuard],
})
export class EventsModule {}
