import { Module } from '@nestjs/common';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { IamModule } from '../iam/iam.module';
import { ProxiesModule } from '../proxies/proxies.module';
import { SessionManager } from './application/session-manager.service';
import { SESSION_REPOSITORY } from './domain/session.repository';
import { EngineFactory } from './infrastructure/engine.factory';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { SessionRefPipe } from './interface/session-ref.pipe';
import { SessionsController } from './interface/sessions.controller';

@Module({
  imports: [IamModule, ProxiesModule, GuardrailModule], // + GuardrailService (health/override/filtro G7)
  controllers: [SessionsController],
  providers: [
    SessionManager,
    EngineFactory,
    SessionRefPipe,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  ],
  // SESSION_REPOSITORY exportado: o SessionRefPipe é instanciado no módulo de cada controller
  // (groups, messaging, …) e precisa resolver o repositório por lá.
  exports: [SessionManager, SessionRefPipe, SESSION_REPOSITORY],
})
export class SessionsModule {}
