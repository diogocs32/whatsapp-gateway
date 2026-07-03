import { Global, Module } from '@nestjs/common';
import { EventFanout } from './event-fanout';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, EventFanout],
  exports: [RedisService],
})
export class RedisModule {}
