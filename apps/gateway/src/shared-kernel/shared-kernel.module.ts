import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus/event-bus';
import { CLOCK, SystemClock } from './clock';

// Shared Kernel — utilitários compartilhados por todos os módulos (blueprint §4.5).
@Global()
@Module({
  providers: [EventBus, { provide: CLOCK, useClass: SystemClock }],
  exports: [EventBus, CLOCK],
})
export class SharedKernelModule {}
