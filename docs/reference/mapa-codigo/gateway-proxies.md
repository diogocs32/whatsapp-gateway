<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `proxies`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/proxies/application/proxy-resolver.service.ts` | 166 |
| `modules/proxies/application/proxy.service.ts` | 361 |
| `modules/proxies/domain/proxy-types.ts` | 7 |
| `modules/proxies/domain/proxy.entity.ts` | 38 |
| `modules/proxies/domain/proxy.repository.ts` | 64 |
| `modules/proxies/infrastructure/prisma-proxy.repository.ts` | 224 |
| `modules/proxies/infrastructure/proxy-agent.factory.ts` | 21 |
| `modules/proxies/infrastructure/proxy-health-tester.ts` | 80 |
| `modules/proxies/infrastructure/webshare.client.ts` | 60 |
| `modules/proxies/interface/dto.ts` | 50 |
| `modules/proxies/interface/proxies.controller.ts` | 179 |
| `modules/proxies/proxies.module.ts` | 27 |

## `modules/proxies/application/proxy-resolver.service.ts`

166 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.service.ts`
- importa (interno): `infra/redis/redis.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/proxies.module.ts`, `modules/sessions/application/session-manager.service.ts`

**class `ProxyResolver`** L23 · @Injectable
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `redis: RedisService`
- `logger` · L25 · private · campo
- `constructor(repo, redis)` · L27
- `resolve(sessionId)` · L32 · async
  - chama: `hashString` L13, `ProxyRepository.findById` (proxy.repository.ts:45), `ProxyRepository.getAssignment` (proxy.repository.ts:55), `ProxyRepository.listEnabledAlive` (proxy.repository.ts:47), `ProxyRepository.listInRange` (proxy.repository.ts:46), `ProxyRepository.setCurrent` (proxy.repository.ts:57)
  - chamado por: `resolveAgent` L142, `resolveProxyConfig` L124
- `reportFailure(sessionId, reason)` · L101 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:45), `ProxyRepository.getAssignment` (proxy.repository.ts:55), `ProxyRepository.updateTest` (proxy.repository.ts:48)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:136)
- `resolveProxyConfig(sessionId)` · L124 · async
  - chama: `resolve` L32
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:136)
- `resolveAgent(sessionId)` · L142 · async
  - chama: `resolve` L32, `ProxyRepository.getAssignment` (proxy.repository.ts:55), `buildProxyAgent` (proxy-agent.factory.ts:14)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:136)

**Funções e constantes de topo**
- `hashString(s)` · L13
  - chamado por: `resolve` L32

## `modules/proxies/application/proxy.service.ts`

361 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`
- importado por: `modules/proxies/interface/proxies.controller.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `ProxyService`** L68 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `tester: ProxyHealthTester` · `webshare: WebshareClient`
- `logger` · L70 · private · campo
- `constructor(repo, tester, webshare)` · L72
- `onApplicationBootstrap()` · L82
  - chama: `testAll` L193
  - env: `NODE_ENV`, `PROXY_RETEST_INTERVAL_MIN`
- `list()` · L99
  - chama: `ProxyRepository.list` (proxy.repository.ts:44)
  - chamado por: `ProxiesController.list` (proxies.controller.ts:59)
- `create(data)` · L103 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:41), `ProxyRepository.nextPosition` (proxy.repository.ts:40)
  - chamado por: `ProxiesController.create` (proxies.controller.ts:76)
- `bulkImport(text, protocol)` · L120 · async
  - chama: `parseProxyLine` L325, `ProxyRepository.create` (proxy.repository.ts:41), `ProxyRepository.nextPosition` (proxy.repository.ts:40)
  - chamado por: `ProxiesController.bulk` (proxies.controller.ts:96)
- `remove(id)` · L170 · async
  - chama: `ProxyRepository.delete` (proxy.repository.ts:53)
  - chamado por: `ProxiesController.remove` (proxies.controller.ts:138)
- `setEnabled(id, enabled)` · L174 · async
  - chama: `ProxyRepository.setEnabled` (proxy.repository.ts:52)
  - chamado por: `ProxiesController.disable` (proxies.controller.ts:132), `ProxiesController.enable` (proxies.controller.ts:126)
- `test(id)` · L178 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:45), `ProxyRepository.updateTest` (proxy.repository.ts:48), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
  - chamado por: `testAll` L193, `ProxiesController.test` (proxies.controller.ts:117)
- `testAll()` · L193 · async
  - chama: `mapLimit` L48, `test` L178, `ProxyRepository.list` (proxy.repository.ts:44)
  - chamado por: `onApplicationBootstrap` L82, `ProxiesController.testAll` (proxies.controller.ts:107)
- `getAssignment(sessionId)` · L198
  - chama: `ProxyRepository.getAssignment` (proxy.repository.ts:55)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:145)
- `listAvailable()` · L205 · async
  - chama: `ProxyRepository.list` (proxy.repository.ts:44), `ProxyRepository.usedProxyIds` (proxy.repository.ts:60)
  - chamado por: `ProxiesController.listAvailable` (proxies.controller.ts:66)
- `ensureAvailable(proxyId)` · L218 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:45), `ProxyRepository.usedProxyIds` (proxy.repository.ts:60)
  - chamado por: `assignExclusive` L232, `SessionsController.create` (sessions.controller.ts:95)
- `assignExclusive(sessionId, proxyId)` · L232 · async
  - chama: `ensureAvailable` L218, `setAssignment` L246
  - chamado por: `SessionsController.create` (sessions.controller.ts:95)
- `setAssignment(sessionId, data)` · L246 · async
  - chama: `ProxyRepository.setAssignment` (proxy.repository.ts:56), `ProxyRepository.setCurrent` (proxy.repository.ts:57)
  - chamado por: `assignExclusive` L232, `ProxiesController.setAssignment` (proxies.controller.ts:160)
- `webshareConfigured()` · L268
  - chama: `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.webshareStatus` (proxies.controller.ts:71)
- `syncWebshare()` · L273 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:41), `ProxyRepository.findByWebshareId` (proxy.repository.ts:42), `ProxyRepository.nextPosition` (proxy.repository.ts:40), `ProxyRepository.updateConnection` (proxy.repository.ts:43), `WebshareClient.fetchAll` (webshare.client.ts:34), `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.syncWebshare` (proxies.controller.ts:112)

**Funções e constantes de topo**
- `mapLimit(items, limit, fn)` · L48 · async
  - chamado por: `testAll` L193
- `parseProxyLine(line)` · L325
  - chamado por: `bulkImport` L120

**Tipos**
- interface `CreateProxyData` L20 · 6 propriedade(s)
- interface `TestResult` L29 · 5 propriedade(s)
- interface `SetAssignmentData` L39 · 5 propriedade(s)

## `modules/proxies/domain/proxy-types.ts`

7 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Tipos**
- type `ProxyProtocol` L1
- type `ProxySource` L2
- type `ProxyStatus` L3
- type `ProxyMode` L4
- type `ProxyStrategy` L5

## `modules/proxies/domain/proxy.entity.ts`

38 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.entity.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/interface/proxies.controller.ts`

**class `Proxy`** L9
- injeta (construtor): `id: string` · `position: number` · `label: string | null` · `protocol: ProxyProtocol` · `host: string` · `port: number` · `username: string | null` · `password: string | null` · `source: ProxySource` · `country: string | null` · `exitIp: string | null` · `latencyMs: number | null` · `status: ProxyStatus` · `enabled: boolean`
- `constructor(id, position, label, protocol, host, port, username, passwo…)` · L10
  - chamado por: `toProxy` (prisma-proxy.repository.ts:45)

**class `ProxyAssignment`** L28
- injeta (construtor): `sessionId: string` · `mode: ProxyMode` · `rangeStart: number | null` · `rangeEnd: number | null` · `strategy: ProxyStrategy` · `currentProxyId: string | null`
- `constructor(sessionId, mode, rangeStart, rangeEnd, strategy, currentPro…)` · L29
  - chamado por: `toAssignment` (prisma-proxy.repository.ts:64)

## `modules/proxies/domain/proxy.repository.ts`

64 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.repository.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/proxies.module.ts`

**Funções e constantes de topo**
- `PROXY_REPOSITORY` = `Symbol('PROXY_REPOSITORY')` · L63

**Tipos**
- interface `CreateProxyInput` L10 · 10 propriedade(s)
- interface `UpdateConnectionInput` L23 · 5 propriedade(s)
- interface `SetAssignmentInput` L31 · 5 propriedade(s)
- interface `ProxyRepository` L39
  - `ProxyRepository.nextPosition()` · L40
    - implementado por: `PrismaProxyRepository.nextPosition` (prisma-proxy.repository.ts:80)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:120), `ProxyService.create` (proxy.service.ts:103), `ProxyService.syncWebshare` (proxy.service.ts:273)
  - `ProxyRepository.create(input)` · L41
    - implementado por: `PrismaProxyRepository.create` (prisma-proxy.repository.ts:85)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:120), `ProxyService.create` (proxy.service.ts:103), `ProxyService.syncWebshare` (proxy.service.ts:273)
  - `ProxyRepository.findByWebshareId(webshareId)` · L42
    - implementado por: `PrismaProxyRepository.findByWebshareId` (prisma-proxy.repository.ts:104)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:273)
  - `ProxyRepository.updateConnection(id, input)` · L43
    - implementado por: `PrismaProxyRepository.updateConnection` (prisma-proxy.repository.ts:109)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:273)
  - `ProxyRepository.list()` · L44
    - implementado por: `PrismaProxyRepository.list` (prisma-proxy.repository.ts:125)
    - chamado por: `ProxyService.list` (proxy.service.ts:99), `ProxyService.listAvailable` (proxy.service.ts:205), `ProxyService.testAll` (proxy.service.ts:193)
  - `ProxyRepository.findById(id)` · L45
    - implementado por: `PrismaProxyRepository.findById` (prisma-proxy.repository.ts:132)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolve` (proxy-resolver.service.ts:32), `ProxyService.ensureAvailable` (proxy.service.ts:218), `ProxyService.test` (proxy.service.ts:178)
  - `ProxyRepository.listInRange(start, end)` · L46
    - implementado por: `PrismaProxyRepository.listInRange` (prisma-proxy.repository.ts:137)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:32)
  - `ProxyRepository.listEnabledAlive()` · L47
    - implementado por: `PrismaProxyRepository.listEnabledAlive` (prisma-proxy.repository.ts:145)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:32)
  - `ProxyRepository.updateTest(id, r)` · L48
    - implementado por: `PrismaProxyRepository.updateTest` (prisma-proxy.repository.ts:153)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyService.test` (proxy.service.ts:178)
  - `ProxyRepository.setEnabled(id, enabled)` · L52
    - implementado por: `PrismaProxyRepository.setEnabled` (prisma-proxy.repository.ts:168)
    - chamado por: `ProxyService.setEnabled` (proxy.service.ts:174)
  - `ProxyRepository.delete(id)` · L53
    - implementado por: `PrismaProxyRepository.delete` (prisma-proxy.repository.ts:172)
    - chamado por: `ProxyService.remove` (proxy.service.ts:170)
  - `ProxyRepository.getAssignment(sessionId)` · L55
    - implementado por: `PrismaProxyRepository.getAssignment` (prisma-proxy.repository.ts:176)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolve` (proxy-resolver.service.ts:32), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyService.getAssignment` (proxy.service.ts:198)
  - `ProxyRepository.setAssignment(input)` · L56
    - implementado por: `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:183)
    - chamado por: `ProxyService.setAssignment` (proxy.service.ts:246)
  - `ProxyRepository.setCurrent(sessionId, proxyId)` · L57
    - implementado por: `PrismaProxyRepository.setCurrent` (prisma-proxy.repository.ts:203)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:32), `ProxyService.setAssignment` (proxy.service.ts:246)
  - `ProxyRepository.usedProxyIds()` · L60
    - implementado por: `PrismaProxyRepository.usedProxyIds` (prisma-proxy.repository.ts:210)
    - chamado por: `ProxyService.ensureAvailable` (proxy.service.ts:218), `ProxyService.listAvailable` (proxy.service.ts:205)

## `modules/proxies/infrastructure/prisma-proxy.repository.ts`

224 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/prisma-proxy.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `PrismaProxyRepository`** L75 · @Injectable · `implements ProxyRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L77
- `nextPosition()` · L80 · async
  - implementa: `ProxyRepository.nextPosition` (proxy.repository.ts:40)
  - banco: `proxy.aggregate`
- `create(input)` · L85 · async
  - implementa: `ProxyRepository.create` (proxy.repository.ts:41)
  - chama: `toProxy` L45, `newId` (ulid.ts:4)
  - banco: `proxy.create`
- `findByWebshareId(webshareId)` · L104 · async
  - implementa: `ProxyRepository.findByWebshareId` (proxy.repository.ts:42)
  - chama: `toProxy` L45
  - banco: `proxy.findUnique`
- `updateConnection(id, input)` · L109 · async
  - implementa: `ProxyRepository.updateConnection` (proxy.repository.ts:43)
  - banco: `proxy.update`
- `list()` · L125 · async
  - implementa: `ProxyRepository.list` (proxy.repository.ts:44)
  - banco: `proxy.findMany`
- `findById(id)` · L132 · async
  - implementa: `ProxyRepository.findById` (proxy.repository.ts:45)
  - chama: `toProxy` L45
  - banco: `proxy.findUnique`
- `listInRange(start, end)` · L137 · async
  - implementa: `ProxyRepository.listInRange` (proxy.repository.ts:46)
  - banco: `proxy.findMany`
- `listEnabledAlive()` · L145 · async
  - implementa: `ProxyRepository.listEnabledAlive` (proxy.repository.ts:47)
  - banco: `proxy.findMany`
- `updateTest(id, r)` · L153 · async
  - implementa: `ProxyRepository.updateTest` (proxy.repository.ts:48)
  - banco: `proxy.update`
- `setEnabled(id, enabled)` · L168 · async
  - implementa: `ProxyRepository.setEnabled` (proxy.repository.ts:52)
  - banco: `proxy.update`
- `delete(id)` · L172 · async
  - implementa: `ProxyRepository.delete` (proxy.repository.ts:53)
  - banco: `proxy.delete`
- `getAssignment(sessionId)` · L176 · async
  - implementa: `ProxyRepository.getAssignment` (proxy.repository.ts:55)
  - chama: `toAssignment` L64
  - banco: `sessionProxyAssignment.findUnique`
- `setAssignment(input)` · L183 · async
  - implementa: `ProxyRepository.setAssignment` (proxy.repository.ts:56)
  - chama: `toAssignment` L64
  - banco: `sessionProxyAssignment.upsert`
- `setCurrent(sessionId, proxyId)` · L203 · async
  - implementa: `ProxyRepository.setCurrent` (proxy.repository.ts:57)
  - banco: `sessionProxyAssignment.update`
- `usedProxyIds()` · L210 · async
  - implementa: `ProxyRepository.usedProxyIds` (proxy.repository.ts:60)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findMany`

**Funções e constantes de topo**
- `toProxy(r)` · L45
  - chama: `Proxy.constructor` (proxy.entity.ts:10)
  - chamado por: `create` L85, `findById` L132, `findByWebshareId` L104
- `toAssignment(r)` · L64
  - chama: `ProxyAssignment.constructor` (proxy.entity.ts:29)
  - chamado por: `getAssignment` L176, `setAssignment` L183

**Tipos**
- type `ProxyRow` L19
- type `AssignmentRow` L36

## `modules/proxies/infrastructure/proxy-agent.factory.ts`

21 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-agent.factory.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`

**Funções e constantes de topo**
- `buildProxyUrl(p)` · L6
  - chamado por: `buildProxyAgent` L14
- `buildProxyAgent(p)` · L14
  - chama: `buildProxyUrl` L6
  - chamado por: `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyHealthTester.test` (proxy-health-tester.ts:23)

## `modules/proxies/infrastructure/proxy-health-tester.ts`

80 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-health-tester.ts`
- importa (interno): `bootstrap/config.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/application/proxy.service.ts`, `modules/proxies/proxies.module.ts`

**class `ProxyHealthTester`** L19 · @Injectable
- injeta (construtor): `config: ConfigService<Env, true>`
- `constructor(config)` · L21
- `test(proxy)` · L23 · async
  - chama: `buildProxyAgent` (proxy-agent.factory.ts:14)
  - chamado por: `ProxyService.test` (proxy.service.ts:178)

**Tipos**
- interface `HealthResult` L9 · 4 propriedade(s)

## `modules/proxies/infrastructure/webshare.client.ts`

60 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/webshare.client.ts`
- importa (interno): `bootstrap/config.ts`
- importado por: `modules/proxies/application/proxy.service.ts`, `modules/proxies/proxies.module.ts`

**class `WebshareClient`** L25 · @Injectable
- injeta (construtor): `config: ConfigService<Env, true>`
- `constructor(config)` · L27
- `isConfigured()` · L29
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:273), `ProxyService.webshareConfigured` (proxy.service.ts:268)
- `fetchAll()` · L34 · async
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:273)

**Tipos**
- interface `WebshareProxy` L7 · 8 propriedade(s)
- interface `WebshareListResponse` L18 · 4 propriedade(s)

## `modules/proxies/interface/dto.ts`

50 linhas · caminho: `apps/gateway/src/modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/interface/proxies.controller.ts`

**Funções e constantes de topo**
- `protocolSchema` = `z.enum(['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'])` · L3
- `createProxySchema` = `z .object({ label: z.string().max(120).optional(), protocol: protocol…` · L5
- `bulkImportSchema` = `z.object({ text: z.string().min(1), protocol: protocolSchema.default(…` · L20
- `setAssignmentSchema` = `z .object({ mode: z.enum(['NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_RO…` · L25

## `modules/proxies/interface/proxies.controller.ts`

179 linhas · caminho: `apps/gateway/src/modules/proxies/interface/proxies.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `ProxiesController`** L53 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller
- injeta (construtor): `service: ProxyService`
- `constructor(service)` · L57
- `list()` · L59 · async · @Get('proxies')
  - chama: `ProxyService.list` (proxy.service.ts:99)
- `listAvailable()` · L66 · async · @Get('proxies/available')
  - chama: `ProxyService.listAvailable` (proxy.service.ts:205)
- `webshareStatus()` · L71 · @Get('proxies/webshare/status')
  - chama: `ProxyService.webshareConfigured` (proxy.service.ts:268)
- `create(body)` · L76 · async · @Post('proxies')
  - chama: `ProxyService.create` (proxy.service.ts:103), `toDto` L24
- `bulk(body)` · L96 · async · @Post('proxies/bulk')
  - chama: `ProxyService.bulkImport` (proxy.service.ts:120)
- `testAll()` · L107 · @Post('proxies/test-all')
  - chama: `ProxyService.testAll` (proxy.service.ts:193)
- `syncWebshare()` · L112 · @Post('proxies/webshare/sync')
  - chama: `ProxyService.syncWebshare` (proxy.service.ts:273)
- `test(id)` · L117 · async · @Post('proxies/:id/test')
  - chama: `ProxyService.test` (proxy.service.ts:178)
- `enable(id)` · L126 · async · @Post('proxies/:id/enable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:174)
- `disable(id)` · L132 · async · @Post('proxies/:id/disable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:174)
- `remove(id)` · L138 · async · @Delete('proxies/:id')
  - chama: `ProxyService.remove` (proxy.service.ts:170)
- `getAssignment(id)` · L145 · async · @Get('sessions/:id/proxy')
  - chama: `ProxyService.getAssignment` (proxy.service.ts:198), `assignmentToDto` L42
- `setAssignment(id, body)` · L160 · async · @Put('sessions/:id/proxy')
  - chama: `ProxyService.setAssignment` (proxy.service.ts:246), `assignmentToDto` L42

**Funções e constantes de topo**
- `toDto(p)` · L24
  - chamado por: `create` L76
- `assignmentToDto(a)` · L42
  - chamado por: `getAssignment` L145, `setAssignment` L160

## `modules/proxies/proxies.module.ts`

27 linhas · caminho: `apps/gateway/src/modules/proxies/proxies.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`, `modules/proxies/interface/proxies.controller.ts`
- importado por: `app.module.ts`, `modules/sessions/sessions.module.ts`

**@Module `ProxiesModule`** L11
- imports: `[IamModule]`
- controllers: `[ProxiesController]`
- providers: `[ ProxyService, ProxyResolver, ProxyHealthTester, WebshareClient, { provide: PROXY_REPOSITORY, useClass: PrismaProxyRepository }, ]`
- exports: `[ProxyResolver, ProxyService]`

**class `ProxiesModule`** L11 · @Module({ imports: [IamModule], controllers: [ProxiesController], p…)
