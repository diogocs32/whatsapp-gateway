import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { ProxiesModule } from '../proxies/proxies.module';
import { SessionManager } from './application/session-manager.service';
import { SESSION_REPOSITORY } from './domain/session.repository';
import { EngineFactory } from './infrastructure/engine.factory';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { SessionsController } from './interface/sessions.controller';

@Module({
  imports: [IamModule, ProxiesModule], // JwtAuthGuard / JwtModule + ProxyResolver (agent do Baileys)
  controllers: [SessionsController],
  providers: [
    SessionManager,
    EngineFactory,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  ],
  exports: [SessionManager],
})
export class SessionsModule {}
