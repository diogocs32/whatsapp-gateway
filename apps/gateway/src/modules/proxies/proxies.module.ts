import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { ProxyResolver } from './application/proxy-resolver.service';
import { ProxyService } from './application/proxy.service';
import { PROXY_REPOSITORY } from './domain/proxy.repository';
import { PrismaProxyRepository } from './infrastructure/prisma-proxy.repository';
import { ProxyHealthTester } from './infrastructure/proxy-health-tester';
import { WebshareClient } from './infrastructure/webshare.client';
import { ProxiesController } from './interface/proxies.controller';

@Module({
  imports: [IamModule],
  controllers: [ProxiesController],
  providers: [
    ProxyService,
    ProxyResolver,
    ProxyHealthTester,
    WebshareClient,
    { provide: PROXY_REPOSITORY, useClass: PrismaProxyRepository },
  ],
  // ProxyResolver é exportado para o SessionsModule resolver o agent na conexão do Baileys (§7.4).
  // ProxyService é exportado para o create de sessão atribuir proxy exclusivo (D-008) —
  // sessions NÃO escreve em session_proxy_assignments direto (tabela do módulo proxies, R10).
  exports: [ProxyResolver, ProxyService],
})
export class ProxiesModule {}
