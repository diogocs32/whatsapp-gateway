<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `proxies`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/proxies/application/proxy-resolver.media.spec.ts` | 117 |
| `modules/proxies/application/proxy-resolver.service.ts` | 186 |
| `modules/proxies/application/proxy.service.suggestion.spec.ts` | 355 |
| `modules/proxies/application/proxy.service.ts` | 419 |
| `modules/proxies/domain/proxy-suggestion.spec.ts` | 193 |
| `modules/proxies/domain/proxy-suggestion.ts` | 50 |
| `modules/proxies/domain/proxy-types.ts` | 7 |
| `modules/proxies/domain/proxy.entity.ts` | 38 |
| `modules/proxies/domain/proxy.repository.ts` | 78 |
| `modules/proxies/infrastructure/prisma-proxy.repository.ts` | 270 |
| `modules/proxies/infrastructure/proxy-agent.factory.ts` | 31 |
| `modules/proxies/infrastructure/proxy-health-tester.ts` | 80 |
| `modules/proxies/infrastructure/webshare.client.ts` | 60 |
| `modules/proxies/interface/dto.ts` | 58 |
| `modules/proxies/interface/proxies.controller.ts` | 207 |
| `modules/proxies/proxies.module.ts` | 27 |

## `modules/proxies/application/proxy-resolver.media.spec.ts`

117 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.media.spec.ts`
- importa (interno): `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`

- describe “ProxyResolver — transporte Baileys (E10)” · L38
  - it “fetch global do Node usa o dispatcher no proxy HTTP falso, com auth codificada” · L39
  - it “SOCKS conserva o Agent do socket e não fornece dispatcher para CDN” · L105

## `modules/proxies/application/proxy-resolver.service.ts`

186 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.service.ts`
- importa (interno): `infra/redis/redis.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/application/proxy-resolver.media.spec.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/application/session-manager.service.ts`

**class `ProxyResolver`** L26 · @Injectable
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `redis: RedisService`
- `logger` · L28 · private · campo
- `constructor(repo, redis)` · L30
- `resolve(sessionId)` · L35 · async
  - chama: `hashString` L16, `ProxyRepository.findById` (proxy.repository.ts:46), `ProxyRepository.getAssignment` (proxy.repository.ts:56), `ProxyRepository.listEnabledAlive` (proxy.repository.ts:48), `ProxyRepository.listInRange` (proxy.repository.ts:47), `ProxyRepository.setCurrent` (proxy.repository.ts:58)
  - chamado por: `resolveBaileysTransport` L146, `resolveProxyConfig` L127
- `reportFailure(sessionId, reason)` · L104 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:46), `ProxyRepository.getAssignment` (proxy.repository.ts:56), `ProxyRepository.updateTest` (proxy.repository.ts:49)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveProxyConfig(sessionId)` · L127 · async
  - chama: `resolve` L35
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveBaileysTransport(sessionId)` · L146 · async
  - chama: `resolve` L35, `ProxyRepository.getAssignment` (proxy.repository.ts:56), `buildMediaDispatcher` (proxy-agent.factory.ts:25), `buildProxyAgent` (proxy-agent.factory.ts:15)
  - chamado por: `resolveAgent` L182, `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveAgent(sessionId)` · L182 · async
  - chama: `resolveBaileysTransport` L146
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)

**Funções e constantes de topo**
- `hashString(s)` · L16
  - chamado por: `resolve` L35

## `modules/proxies/application/proxy.service.suggestion.spec.ts`

355 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.suggestion.spec.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/application/proxy.service.ts`

- describe “ProxyService.suggestionFor” · L101
  - it “sem linhas carimbadas → null, sem buscar proxy nem dono” · L102
  - it “linha de outro nome que o repositório devolva é descartada → null” · L110
  - it “proxy livre → disponível, com o proxy e inUseBySession null” · L120
  - it “proxy UNTESTED e livre também é disponível” · L139
  - it “proxy em uso por outra sessão viva → IN_USE com o nome do dono” · L148
  - it “proxy DEAD → indisponível com reason DEAD” · L166
  - it “proxy desabilitado → DISABLED (mesmo DEAD)” · L181
  - it “proxy DEAD e desabilitado mas com dono vivo → IN_USE com o nome do dono” · L198
  - it “proxy excluído do pool → REMOVED com proxy null, sem consultar o dono” · L213
  - it “fromSession é o nome como a sessão foi apagada (caixa original) e releasedAt o do carimbo” · L230
  - it “com várias exclusões, usa a de caixa idêntica e busca o proxy dela” · L242
  - it “entre exclusões com o mesmo nome, usa a mais recente” · L260
  - it “linha sem currentProxyId que escape do SQL é ignorada → null” · L272
  - it “erro do repositório na busca propaga (o controller devolve 500)” · L281
- describe “ProxyService.markReleased” · L288
  - it “chama o repositório com sessionId, nome e a data de agora” · L289
  - it “carimbou ≥1 linha → loga sucesso com o nome, sem erro” · L307
  - it “0 linhas (sessão sem proxy fixo) → não loga sucesso nem erro” · L316
  - it “repositório lança Error → não lança e loga erro com sessionId, mensagem e stack” · L327
  - it “repositório rejeita com não-Error → ainda não lança e loga erro” · L344

## `modules/proxies/application/proxy.service.ts`

419 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`
- importado por: `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `ProxyService`** L83 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `tester: ProxyHealthTester` · `webshare: WebshareClient`
- `logger` · L85 · private · campo
- `constructor(repo, tester, webshare)` · L87
- `onApplicationBootstrap()` · L97
  - chama: `testAll` L208
  - env: `NODE_ENV`, `PROXY_RETEST_INTERVAL_MIN`
- `list()` · L114
  - chama: `ProxyRepository.list` (proxy.repository.ts:45)
  - chamado por: `ProxiesController.list` (proxies.controller.ts:62)
- `create(data)` · L118 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:42), `ProxyRepository.nextPosition` (proxy.repository.ts:41)
  - chamado por: `ProxiesController.create` (proxies.controller.ts:104)
- `bulkImport(text, protocol)` · L135 · async
  - chama: `parseProxyLine` L383, `ProxyRepository.create` (proxy.repository.ts:42), `ProxyRepository.nextPosition` (proxy.repository.ts:41)
  - chamado por: `ProxiesController.bulk` (proxies.controller.ts:124)
- `remove(id)` · L185 · async
  - chama: `ProxyRepository.delete` (proxy.repository.ts:54)
  - chamado por: `ProxiesController.remove` (proxies.controller.ts:166)
- `setEnabled(id, enabled)` · L189 · async
  - chama: `ProxyRepository.setEnabled` (proxy.repository.ts:53)
  - chamado por: `ProxiesController.disable` (proxies.controller.ts:160), `ProxiesController.enable` (proxies.controller.ts:154)
- `test(id)` · L193 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:46), `ProxyRepository.updateTest` (proxy.repository.ts:49), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
  - chamado por: `testAll` L208, `ProxiesController.test` (proxies.controller.ts:145)
- `testAll()` · L208 · async
  - chama: `mapLimit` L63, `test` L193, `ProxyRepository.list` (proxy.repository.ts:45)
  - chamado por: `onApplicationBootstrap` L97, `ProxiesController.testAll` (proxies.controller.ts:135)
- `getAssignment(sessionId)` · L213
  - chama: `ProxyRepository.getAssignment` (proxy.repository.ts:56)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:173)
- `listAvailable()` · L220 · async
  - chama: `ProxyRepository.list` (proxy.repository.ts:45), `ProxyRepository.usedProxyIds` (proxy.repository.ts:61)
  - chamado por: `ProxiesController.listAvailable` (proxies.controller.ts:69)
- `ensureAvailable(proxyId)` · L233 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:46), `ProxyRepository.usedProxyIds` (proxy.repository.ts:61)
  - chamado por: `assignExclusive` L247, `SessionsController.create` (sessions.controller.ts:102)
- `assignExclusive(sessionId, proxyId)` · L247 · async
  - chama: `ensureAvailable` L233, `setAssignment` L261
  - chamado por: `SessionsController.create` (sessions.controller.ts:102)
- `setAssignment(sessionId, data)` · L261 · async
  - chama: `ProxyRepository.setAssignment` (proxy.repository.ts:57), `ProxyRepository.setCurrent` (proxy.repository.ts:58)
  - chamado por: `assignExclusive` L247, `ProxiesController.setAssignment` (proxies.controller.ts:188)
- `markReleased(sessionId, sessionName)` · L285 · async
  - chama: `ProxyRepository.markReleased` (proxy.repository.ts:67)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:358)
- `suggestionFor(sessionName)` · L306 · async
  - chama: `pickReleased` (proxy-suggestion.ts:18), `suggestionAvailability` (proxy-suggestion.ts:40), `ProxyRepository.findById` (proxy.repository.ts:46), `ProxyRepository.findReleasedByName` (proxy.repository.ts:74), `ProxyRepository.proxyOwnerName` (proxy.repository.ts:63)
  - chamado por: `ProxiesController.suggestion` (proxies.controller.ts:76)
- `webshareConfigured()` · L326
  - chama: `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.webshareStatus` (proxies.controller.ts:99)
- `syncWebshare()` · L331 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:42), `ProxyRepository.findByWebshareId` (proxy.repository.ts:43), `ProxyRepository.nextPosition` (proxy.repository.ts:41), `ProxyRepository.updateConnection` (proxy.repository.ts:44), `WebshareClient.fetchAll` (webshare.client.ts:34), `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.syncWebshare` (proxies.controller.ts:140)

**Funções e constantes de topo**
- `mapLimit(items, limit, fn)` · L63 · async
  - chamado por: `testAll` L208
- `parseProxyLine(line)` · L383
  - chamado por: `bulkImport` L135

**Tipos**
- interface `CreateProxyData` L25 · 6 propriedade(s)
- interface `TestResult` L34 · 5 propriedade(s)
- interface `ProxySuggestion` L45 · 6 propriedade(s)
- interface `SetAssignmentData` L54 · 5 propriedade(s)

## `modules/proxies/domain/proxy-suggestion.spec.ts`

193 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-suggestion.spec.ts`
- importa (interno): `modules/proxies/domain/proxy-suggestion.ts`

- describe “pickReleased” · L23
  - it “nome vazio → null (não consulta as linhas)” · L26
  - it “nome só com espaços → null” · L30
  - it “sem linhas → null” · L35
  - it “faz trim do pedido antes de comparar” · L39
  - it “casa sem diferenciar caixa quando só há a versão com outra caixa” · L43
  - it “prefere a caixa idêntica mesmo sendo mais antiga que a de caixa diferente” · L48
  - it “com trim, a caixa idêntica continua preferida” · L57
  - it “entre linhas de caixa idêntica, escolhe a exclusão mais recente” · L63
  - it “sem caixa idêntica, escolhe a mais recente entre as de caixa diferente” · L70
  - it “empate de releasedAt → sessionId maior (ULID criado depois), em qualquer ordem de entrada” · L76
  - it “empate de releasedAt com sessionId igual não quebra (estável)” · L83
  - it “linha 'a-b' não casa o pedido 'a_b' (o _ não é curinga)” · L89
  - it “linha 'a_b' casa só o pedido 'a_b' e não 'a-b'” · L95
  - it “'%' no pedido não vira curinga de LIKE” · L101
  - it “descarta linha com nome diferente que o SQL eventualmente devolva (segunda barreira)” · L106
  - it “currentProxyId null é descartado, mesmo sendo a mais recente e de caixa idêntica” · L113
  - it “só linhas com currentProxyId null → null” · L119
  - it “não altera a ordem do array recebido” · L128
- describe “suggestionAvailability” · L137
  - it “proxy null → REMOVED (indisponível)” · L138
  - it “em uso → IN_USE mesmo desabilitado ou DEAD” · L151
  - it “livre de dono: desabilitado → DISABLED, antes de DEAD” · L160
  - it “livre de dono, habilitado e DEAD → DEAD” · L169
  - it “habilitado, vivo e em uso → IN_USE” · L175
  - it “habilitado, não-DEAD e livre → disponível sem motivo (ALIVE e UNTESTED)” · L184

## `modules/proxies/domain/proxy-suggestion.ts`

50 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-suggestion.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy-suggestion.spec.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Funções e constantes de topo**
- `pickReleased(rows, name)` · L18
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:306)
- `suggestionAvailability(proxy, inUse)` · L40
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:306)

**Tipos**
- type `ProxySuggestionReason` L6
- interface `ReleasedAssignment` L8 · 4 propriedade(s)

## `modules/proxies/domain/proxy-types.ts`

7 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Tipos**
- type `ProxyProtocol` L1
- type `ProxySource` L2
- type `ProxyStatus` L3
- type `ProxyMode` L4
- type `ProxyStrategy` L5

## `modules/proxies/domain/proxy.entity.ts`

38 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.entity.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/interface/proxies.controller.ts`

**class `Proxy`** L9
- injeta (construtor): `id: string` · `position: number` · `label: string | null` · `protocol: ProxyProtocol` · `host: string` · `port: number` · `username: string | null` · `password: string | null` · `source: ProxySource` · `country: string | null` · `exitIp: string | null` · `latencyMs: number | null` · `status: ProxyStatus` · `enabled: boolean`
- `constructor(id, position, label, protocol, host, port, username, passwo…)` · L10
  - chamado por: `toProxy` (prisma-proxy.repository.ts:46)

**class `ProxyAssignment`** L28
- injeta (construtor): `sessionId: string` · `mode: ProxyMode` · `rangeStart: number | null` · `rangeEnd: number | null` · `strategy: ProxyStrategy` · `currentProxyId: string | null`
- `constructor(sessionId, mode, rangeStart, rangeEnd, strategy, currentPro…)` · L29
  - chamado por: `toAssignment` (prisma-proxy.repository.ts:65)

## `modules/proxies/domain/proxy.repository.ts`

78 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.repository.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/proxies.module.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`

**Funções e constantes de topo**
- `PROXY_REPOSITORY` = `Symbol('PROXY_REPOSITORY')` · L77

**Tipos**
- interface `CreateProxyInput` L11 · 10 propriedade(s)
- interface `UpdateConnectionInput` L24 · 5 propriedade(s)
- interface `SetAssignmentInput` L32 · 5 propriedade(s)
- interface `ProxyRepository` L40
  - `ProxyRepository.nextPosition()` · L41
    - implementado por: `PrismaProxyRepository.nextPosition` (prisma-proxy.repository.ts:81)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:135), `ProxyService.create` (proxy.service.ts:118), `ProxyService.syncWebshare` (proxy.service.ts:331)
  - `ProxyRepository.create(input)` · L42
    - implementado por: `PrismaProxyRepository.create` (prisma-proxy.repository.ts:86)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:135), `ProxyService.create` (proxy.service.ts:118), `ProxyService.syncWebshare` (proxy.service.ts:331)
  - `ProxyRepository.findByWebshareId(webshareId)` · L43
    - implementado por: `PrismaProxyRepository.findByWebshareId` (prisma-proxy.repository.ts:105)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:331)
  - `ProxyRepository.updateConnection(id, input)` · L44
    - implementado por: `PrismaProxyRepository.updateConnection` (prisma-proxy.repository.ts:110)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:331)
  - `ProxyRepository.list()` · L45
    - implementado por: `PrismaProxyRepository.list` (prisma-proxy.repository.ts:126)
    - chamado por: `ProxyService.list` (proxy.service.ts:114), `ProxyService.listAvailable` (proxy.service.ts:220), `ProxyService.testAll` (proxy.service.ts:208)
  - `ProxyRepository.findById(id)` · L46
    - implementado por: `PrismaProxyRepository.findById` (prisma-proxy.repository.ts:133)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:104), `ProxyResolver.resolve` (proxy-resolver.service.ts:35), `ProxyService.ensureAvailable` (proxy.service.ts:233), `ProxyService.suggestionFor` (proxy.service.ts:306), `ProxyService.test` (proxy.service.ts:193)
  - `ProxyRepository.listInRange(start, end)` · L47
    - implementado por: `PrismaProxyRepository.listInRange` (prisma-proxy.repository.ts:138)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:35)
  - `ProxyRepository.listEnabledAlive()` · L48
    - implementado por: `PrismaProxyRepository.listEnabledAlive` (prisma-proxy.repository.ts:146)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:35)
  - `ProxyRepository.updateTest(id, r)` · L49
    - implementado por: `PrismaProxyRepository.updateTest` (prisma-proxy.repository.ts:154)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:104), `ProxyService.test` (proxy.service.ts:193)
  - `ProxyRepository.setEnabled(id, enabled)` · L53
    - implementado por: `PrismaProxyRepository.setEnabled` (prisma-proxy.repository.ts:169)
    - chamado por: `ProxyService.setEnabled` (proxy.service.ts:189)
  - `ProxyRepository.delete(id)` · L54
    - implementado por: `PrismaProxyRepository.delete` (prisma-proxy.repository.ts:173)
    - chamado por: `ProxyService.remove` (proxy.service.ts:185)
  - `ProxyRepository.getAssignment(sessionId)` · L56
    - implementado por: `PrismaProxyRepository.getAssignment` (prisma-proxy.repository.ts:177)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:104), `ProxyResolver.resolve` (proxy-resolver.service.ts:35), `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:146), `ProxyService.getAssignment` (proxy.service.ts:213)
  - `ProxyRepository.setAssignment(input)` · L57
    - implementado por: `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:184)
    - chamado por: `ProxyService.setAssignment` (proxy.service.ts:261)
  - `ProxyRepository.setCurrent(sessionId, proxyId)` · L58
    - implementado por: `PrismaProxyRepository.setCurrent` (prisma-proxy.repository.ts:208)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:35), `ProxyService.setAssignment` (proxy.service.ts:261)
  - `ProxyRepository.usedProxyIds()` · L61
    - implementado por: `PrismaProxyRepository.usedProxyIds` (prisma-proxy.repository.ts:215)
    - chamado por: `ProxyService.ensureAvailable` (proxy.service.ts:233), `ProxyService.listAvailable` (proxy.service.ts:220)
  - `ProxyRepository.proxyOwnerName(proxyId)` · L63
    - implementado por: `PrismaProxyRepository.proxyOwnerName` (prisma-proxy.repository.ts:229)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:306)
  - `ProxyRepository.markReleased(sessionId, sessionName, at)` · L67
    - implementado por: `PrismaProxyRepository.markReleased` (prisma-proxy.repository.ts:243)
    - chamado por: `ProxyService.markReleased` (proxy.service.ts:285)
  - `ProxyRepository.findReleasedByName(name)` · L74
    - implementado por: `PrismaProxyRepository.findReleasedByName` (prisma-proxy.repository.ts:255)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:306)

## `modules/proxies/infrastructure/prisma-proxy.repository.ts`

270 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/prisma-proxy.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `PrismaProxyRepository`** L76 · @Injectable · `implements ProxyRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L78
- `nextPosition()` · L81 · async
  - implementa: `ProxyRepository.nextPosition` (proxy.repository.ts:41)
  - banco: `proxy.aggregate`
- `create(input)` · L86 · async
  - implementa: `ProxyRepository.create` (proxy.repository.ts:42)
  - chama: `toProxy` L46, `newId` (ulid.ts:4)
  - banco: `proxy.create`
- `findByWebshareId(webshareId)` · L105 · async
  - implementa: `ProxyRepository.findByWebshareId` (proxy.repository.ts:43)
  - chama: `toProxy` L46
  - banco: `proxy.findUnique`
- `updateConnection(id, input)` · L110 · async
  - implementa: `ProxyRepository.updateConnection` (proxy.repository.ts:44)
  - banco: `proxy.update`
- `list()` · L126 · async
  - implementa: `ProxyRepository.list` (proxy.repository.ts:45)
  - banco: `proxy.findMany`
- `findById(id)` · L133 · async
  - implementa: `ProxyRepository.findById` (proxy.repository.ts:46)
  - chama: `toProxy` L46
  - banco: `proxy.findUnique`
- `listInRange(start, end)` · L138 · async
  - implementa: `ProxyRepository.listInRange` (proxy.repository.ts:47)
  - banco: `proxy.findMany`
- `listEnabledAlive()` · L146 · async
  - implementa: `ProxyRepository.listEnabledAlive` (proxy.repository.ts:48)
  - banco: `proxy.findMany`
- `updateTest(id, r)` · L154 · async
  - implementa: `ProxyRepository.updateTest` (proxy.repository.ts:49)
  - banco: `proxy.update`
- `setEnabled(id, enabled)` · L169 · async
  - implementa: `ProxyRepository.setEnabled` (proxy.repository.ts:53)
  - banco: `proxy.update`
- `delete(id)` · L173 · async
  - implementa: `ProxyRepository.delete` (proxy.repository.ts:54)
  - banco: `proxy.delete`
- `getAssignment(sessionId)` · L177 · async
  - implementa: `ProxyRepository.getAssignment` (proxy.repository.ts:56)
  - chama: `toAssignment` L65
  - banco: `sessionProxyAssignment.findUnique`
- `setAssignment(input)` · L184 · async
  - implementa: `ProxyRepository.setAssignment` (proxy.repository.ts:57)
  - chama: `toAssignment` L65
  - banco: `sessionProxyAssignment.upsert`
- `setCurrent(sessionId, proxyId)` · L208 · async
  - implementa: `ProxyRepository.setCurrent` (proxy.repository.ts:58)
  - banco: `sessionProxyAssignment.update`
- `usedProxyIds()` · L215 · async
  - implementa: `ProxyRepository.usedProxyIds` (proxy.repository.ts:61)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findMany`
- `proxyOwnerName(proxyId)` · L229 · async
  - implementa: `ProxyRepository.proxyOwnerName` (proxy.repository.ts:63)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findFirst`
- `markReleased(sessionId, sessionName, at)` · L243 · async
  - implementa: `ProxyRepository.markReleased` (proxy.repository.ts:67)
  - banco: `sessionProxyAssignment.updateMany`
- `findReleasedByName(name)` · L255 · async
  - implementa: `ProxyRepository.findReleasedByName` (proxy.repository.ts:74)

**Funções e constantes de topo**
- `toProxy(r)` · L46
  - chama: `Proxy.constructor` (proxy.entity.ts:10)
  - chamado por: `create` L86, `findById` L133, `findByWebshareId` L105
- `toAssignment(r)` · L65
  - chama: `ProxyAssignment.constructor` (proxy.entity.ts:29)
  - chamado por: `getAssignment` L177, `setAssignment` L184

**Tipos**
- type `ProxyRow` L20
- type `AssignmentRow` L37

## `modules/proxies/infrastructure/proxy-agent.factory.ts`

31 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-agent.factory.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`
- importado por: `modules/proxies/application/proxy-resolver.media.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`

**Funções e constantes de topo**
- `buildProxyUrl(p)` · L7
  - chamado por: `buildMediaDispatcher` L25, `buildProxyAgent` L15
- `buildProxyAgent(p)` · L15
  - chama: `buildProxyUrl` L7
  - chamado por: `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:146), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
- `buildMediaDispatcher(p)` · L25
  - chama: `buildProxyUrl` L7
  - chamado por: `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:146)

## `modules/proxies/infrastructure/proxy-health-tester.ts`

80 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-health-tester.ts`
- importa (interno): `bootstrap/config.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/application/proxy.service.ts`, `modules/proxies/proxies.module.ts`

**class `ProxyHealthTester`** L19 · @Injectable
- injeta (construtor): `config: ConfigService<Env, true>`
- `constructor(config)` · L21
- `test(proxy)` · L23 · async
  - chama: `buildProxyAgent` (proxy-agent.factory.ts:15)
  - chamado por: `ProxyService.test` (proxy.service.ts:193)

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
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:331), `ProxyService.webshareConfigured` (proxy.service.ts:326)
- `fetchAll()` · L34 · async
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:331)

**Tipos**
- interface `WebshareProxy` L7 · 8 propriedade(s)
- interface `WebshareListResponse` L18 · 4 propriedade(s)

## `modules/proxies/interface/dto.ts`

58 linhas · caminho: `apps/gateway/src/modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/interface/proxies.controller.ts`

**Funções e constantes de topo**
- `protocolSchema` = `z.enum(['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'])` · L3
- `createProxySchema` = `z .object({ label: z.string().max(120).optional(), protocol: protocol…` · L5
- `bulkImportSchema` = `z.object({ text: z.string().min(1), protocol: protocolSchema.default(…` · L20
- `setAssignmentSchema` = `z .object({ mode: z.enum(['NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_RO…` · L25
- `proxySuggestionQuerySchema` = `z .string({ message: 'sessionName é obrigatório' }) .trim() .min(1, '…` · L52

## `modules/proxies/interface/proxies.controller.ts`

207 linhas · caminho: `apps/gateway/src/modules/proxies/interface/proxies.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `ProxiesController`** L56 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller
- injeta (construtor): `service: ProxyService`
- `constructor(service)` · L60
- `list()` · L62 · async · @Get('proxies')
  - chama: `ProxyService.list` (proxy.service.ts:114)
- `listAvailable()` · L69 · async · @Get('proxies/available')
  - chama: `ProxyService.listAvailable` (proxy.service.ts:220)
- `suggestion(sessionName)` · L76 · async · @Get('proxies/suggestion')
  - chama: `ProxyService.suggestionFor` (proxy.service.ts:306), `toDto` L27
- `webshareStatus()` · L99 · @Get('proxies/webshare/status')
  - chama: `ProxyService.webshareConfigured` (proxy.service.ts:326)
- `create(body)` · L104 · async · @Post('proxies')
  - chama: `ProxyService.create` (proxy.service.ts:118), `toDto` L27
- `bulk(body)` · L124 · async · @Post('proxies/bulk')
  - chama: `ProxyService.bulkImport` (proxy.service.ts:135)
- `testAll()` · L135 · @Post('proxies/test-all')
  - chama: `ProxyService.testAll` (proxy.service.ts:208)
- `syncWebshare()` · L140 · @Post('proxies/webshare/sync')
  - chama: `ProxyService.syncWebshare` (proxy.service.ts:331)
- `test(id)` · L145 · async · @Post('proxies/:id/test')
  - chama: `ProxyService.test` (proxy.service.ts:193)
- `enable(id)` · L154 · async · @Post('proxies/:id/enable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:189)
- `disable(id)` · L160 · async · @Post('proxies/:id/disable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:189)
- `remove(id)` · L166 · async · @Delete('proxies/:id')
  - chama: `ProxyService.remove` (proxy.service.ts:185)
- `getAssignment(id)` · L173 · async · @Get('sessions/:id/proxy')
  - chama: `ProxyService.getAssignment` (proxy.service.ts:213), `assignmentToDto` L45
- `setAssignment(id, body)` · L188 · async · @Put('sessions/:id/proxy')
  - chama: `ProxyService.setAssignment` (proxy.service.ts:261), `assignmentToDto` L45

**Funções e constantes de topo**
- `toDto(p)` · L27
  - chamado por: `create` L104, `suggestion` L76
- `assignmentToDto(a)` · L45
  - chamado por: `getAssignment` L173, `setAssignment` L188

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
