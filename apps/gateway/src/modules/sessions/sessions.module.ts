import { Module } from '@nestjs/common';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { IamModule } from '../iam/iam.module';
import { ProxiesModule } from '../proxies/proxies.module';
import { ConnectLinkService } from './application/connect-link.service';
import { SessionConfigService } from './application/session-config.service';
import { SessionAccountInventoryService } from './application/session-account-inventory.service';
import { SessionManager } from './application/session-manager.service';
import { CONNECT_LINK_REPOSITORY } from './domain/connect-link.repository';
import { SESSION_REPOSITORY } from './domain/session.repository';
import { EngineFactory } from './infrastructure/engine.factory';
import { PrismaConnectLinkRepository } from './infrastructure/prisma-connect-link.repository';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { ConnectLinkTokenGuard } from './interface/connect-link-token.guard';
import { ConnectLinksController } from './interface/connect-links.controller';
import { PublicConnectController } from './interface/public-connect.controller';
import { SessionRefPipe } from './interface/session-ref.pipe';
import { SessionsController } from './interface/sessions.controller';
import { SessionAccountInventoryController } from './interface/session-account-inventory.controller';

@Module({
  imports: [IamModule, ProxiesModule, GuardrailModule], // + GuardrailService (health/override/filtro G7)
  // E27: link público de conexão (ConnectLinksController autenticado + PublicConnectController).
  controllers: [
    SessionsController,
    SessionAccountInventoryController,
    ConnectLinksController,
    PublicConnectController,
  ],
  providers: [
    SessionManager,
    SessionConfigService,
    SessionAccountInventoryService,
    ConnectLinkService,
    ConnectLinkTokenGuard,
    { provide: CONNECT_LINK_REPOSITORY, useClass: PrismaConnectLinkRepository },
    EngineFactory,
    SessionRefPipe,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  ],
  // SESSION_REPOSITORY exportado: o SessionRefPipe é instanciado no módulo de cada controller
  // (groups, messaging, …) e precisa resolver o repositório por lá.
  exports: [
    SessionManager,
    SessionConfigService,
    SessionRefPipe,
    SESSION_REPOSITORY,
  ],
})
export class SessionsModule {}
