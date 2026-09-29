<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `proxies`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/proxies/application/proxy-failure.spec.ts` | 41 |
| `modules/proxies/application/proxy-failure.ts` | 20 |
| `modules/proxies/application/proxy-resolver.media.spec.ts` | 117 |
| `modules/proxies/application/proxy-resolver.service.spec.ts` | 216 |
| `modules/proxies/application/proxy-resolver.service.ts` | 227 |
| `modules/proxies/application/proxy-unavailable.error.ts` | 8 |
| `modules/proxies/application/proxy.service.suggestion.spec.ts` | 355 |
| `modules/proxies/application/proxy.service.ts` | 432 |
| `modules/proxies/domain/proxy-suggestion.spec.ts` | 193 |
| `modules/proxies/domain/proxy-suggestion.ts` | 50 |
| `modules/proxies/domain/proxy-types.ts` | 7 |
| `modules/proxies/domain/proxy.entity.ts` | 38 |
| `modules/proxies/domain/proxy.repository.ts` | 90 |
| `modules/proxies/infrastructure/prisma-proxy.repository.ts` | 347 |
| `modules/proxies/infrastructure/proxy-agent.factory.ts` | 31 |
| `modules/proxies/infrastructure/proxy-health-tester.ts` | 80 |
| `modules/proxies/infrastructure/webshare.client.ts` | 60 |
| `modules/proxies/interface/dto.ts` | 58 |
| `modules/proxies/interface/proxies.controller.ts` | 216 |
| `modules/proxies/proxies.module.ts` | 27 |

## `modules/proxies/application/proxy-failure.spec.ts`

41 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-failure.spec.ts`
- importa (interno): `modules/proxies/application/proxy-failure.ts`

- describe “falha explícita de proxy (E15/P-058)” · L4

## `modules/proxies/application/proxy-failure.ts`

20 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-failure.ts`
- importado por: `modules/proxies/application/proxy-failure.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**Funções e constantes de topo**
- `classifyProxyFailure(message)` · L5
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:936), `WWebJSEngine.handleInitFailure` (wwebjs.engine.ts:1270)

**Tipos**
- type `ProxyFailure` L1

## `modules/proxies/application/proxy-resolver.media.spec.ts`

117 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.media.spec.ts`
- importa (interno): `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`

- describe “ProxyResolver — transporte Baileys (E10)” · L38
  - it “fetch global do Node usa o dispatcher no proxy HTTP falso, com auth codificada” · L39
  - it “SOCKS conserva o Agent do socket e não fornece dispatcher para CDN” · L105

## `modules/proxies/application/proxy-resolver.service.spec.ts`

216 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.service.spec.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy-unavailable.error.ts`

- describe “ProxyResolver — afinidade e saída fechada (E15)” · L74
  - it “UNTESTED continua elegível no SINGLE” · L136
  - it “RANGE exclui o pin que saiu da faixa” · L141
  - it “falha do Redis não vira conexão direta” · L169
  - it “PUT concorrente vence a seleção antiga” · L178
  - it “conflitos repetidos param com erro e limite de tentativas” · L188
  - it “falha reportada usa identidade capturada, nunca o pin novo do PUT” · L197

## `modules/proxies/application/proxy-resolver.service.ts`

227 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-resolver.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/application/proxy-resolver.media.spec.ts`, `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/application/session-manager.service.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`

**class `ProxyResolver`** L28 · @Injectable
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `redis: RedisService`
- `logger` · L30 · private · campo
- `constructor(repo, redis)` · L32
- `resolve(sessionId, attempt)` · L37 · async
  - chama: `hashString` L18, `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ProxyRepository.findById` (proxy.repository.ts:48), `ProxyRepository.getAssignment` (proxy.repository.ts:59), `ProxyRepository.listEnabledAlive` (proxy.repository.ts:50), `ProxyRepository.listInRange` (proxy.repository.ts:49), `ProxyRepository.setCurrentIfUnchanged` (proxy.repository.ts:67)
  - chamado por: `resolveBaileysTransport` L196, `resolveProxyConfig` L173
- `reportFailure(sessionId, reason, expectedProxyId, tx)` · L139 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:48), `ProxyRepository.getAssignment` (proxy.repository.ts:59), `ProxyRepository.updateTest` (proxy.repository.ts:51)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveProxyConfig(sessionId)` · L173 · async
  - chama: `resolve` L37
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveBaileysTransport(sessionId)` · L196 · async
  - chama: `resolve` L37, `buildMediaDispatcher` (proxy-agent.factory.ts:25), `buildProxyAgent` (proxy-agent.factory.ts:15)
  - chamado por: `resolveAgent` L223, `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `resolveAgent(sessionId)` · L223 · async
  - chama: `resolveBaileysTransport` L196
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)

**Funções e constantes de topo**
- `hashString(s)` · L18
  - chamado por: `resolve` L37

## `modules/proxies/application/proxy-unavailable.error.ts`

8 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy-unavailable.error.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`

**class `ProxyUnavailableError`** L2 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L3
  - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.ensureAvailable` (proxy.service.ts:238), `ProxyService.setAssignment` (proxy.service.ts:272), `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:208)

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

432 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`, `modules/proxies/application/proxy-unavailable.error.ts`
- importado por: `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `ProxyService`** L84 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `tester: ProxyHealthTester` · `webshare: WebshareClient`
- `logger` · L86 · private · campo
- `constructor(repo, tester, webshare)` · L88
- `onApplicationBootstrap()` · L98
  - chama: `testAll` L209
  - env: `NODE_ENV`, `PROXY_RETEST_INTERVAL_MIN`
- `list()` · L115
  - chama: `ProxyRepository.list` (proxy.repository.ts:47)
  - chamado por: `ProxiesController.list` (proxies.controller.ts:63)
- `create(data)` · L119 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:44), `ProxyRepository.nextPosition` (proxy.repository.ts:43)
  - chamado por: `ProxiesController.create` (proxies.controller.ts:105)
- `bulkImport(text, protocol)` · L136 · async
  - chama: `parseProxyLine` L396, `ProxyRepository.create` (proxy.repository.ts:44), `ProxyRepository.nextPosition` (proxy.repository.ts:43)
  - chamado por: `ProxiesController.bulk` (proxies.controller.ts:125)
- `remove(id)` · L186 · async
  - chama: `ProxyRepository.delete` (proxy.repository.ts:57)
  - chamado por: `ProxiesController.remove` (proxies.controller.ts:167)
- `setEnabled(id, enabled)` · L190 · async
  - chama: `ProxyRepository.setEnabled` (proxy.repository.ts:56)
  - chamado por: `ProxiesController.disable` (proxies.controller.ts:161), `ProxiesController.enable` (proxies.controller.ts:155)
- `test(id)` · L194 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:48), `ProxyRepository.updateTest` (proxy.repository.ts:51), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
  - chamado por: `testAll` L209, `ProxiesController.test` (proxies.controller.ts:146)
- `testAll()` · L209 · async
  - chama: `mapLimit` L64, `test` L194, `ProxyRepository.list` (proxy.repository.ts:47)
  - chamado por: `onApplicationBootstrap` L98, `ProxiesController.testAll` (proxies.controller.ts:136)
- `getAssignment(sessionId)` · L214
  - chama: `ProxyRepository.getAssignment` (proxy.repository.ts:59)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:174)
- `resolveSessionId(reference)` · L218
  - chama: `ProxyRepository.resolveSessionId` (proxy.repository.ts:64)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:174), `ProxiesController.setAssignment` (proxies.controller.ts:190)
- `listAvailable()` · L225 · async
  - chama: `ProxyRepository.list` (proxy.repository.ts:47), `ProxyRepository.usedProxyIds` (proxy.repository.ts:73)
  - chamado por: `ProxiesController.listAvailable` (proxies.controller.ts:70)
- `ensureAvailable(proxyId, ownSessionId)` · L238 · async
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ProxyRepository.findById` (proxy.repository.ts:48), `ProxyRepository.usedProxyIds` (proxy.repository.ts:73)
  - chamado por: `assignExclusive` L258, `setAssignment` L272, `SessionsController.create` (sessions.controller.ts:102)
- `assignExclusive(sessionId, proxyId)` · L258 · async
  - chama: `ensureAvailable` L238, `setAssignment` L272
  - chamado por: `SessionsController.create` (sessions.controller.ts:102)
- `setAssignment(sessionId, data)` · L272 · async
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ensureAvailable` L238, `ProxyRepository.setAssignment` (proxy.repository.ts:65)
  - chamado por: `assignExclusive` L258, `ProxiesController.setAssignment` (proxies.controller.ts:190)
- `markReleased(sessionId, sessionName)` · L298 · async
  - chama: `ProxyRepository.markReleased` (proxy.repository.ts:79)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:358)
- `suggestionFor(sessionName)` · L319 · async
  - chama: `pickReleased` (proxy-suggestion.ts:18), `suggestionAvailability` (proxy-suggestion.ts:40), `ProxyRepository.findById` (proxy.repository.ts:48), `ProxyRepository.findReleasedByName` (proxy.repository.ts:86), `ProxyRepository.proxyOwnerName` (proxy.repository.ts:75)
  - chamado por: `ProxiesController.suggestion` (proxies.controller.ts:77)
- `webshareConfigured()` · L339
  - chama: `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.webshareStatus` (proxies.controller.ts:100)
- `syncWebshare()` · L344 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:44), `ProxyRepository.findByWebshareId` (proxy.repository.ts:45), `ProxyRepository.nextPosition` (proxy.repository.ts:43), `ProxyRepository.updateConnection` (proxy.repository.ts:46), `WebshareClient.fetchAll` (webshare.client.ts:34), `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.syncWebshare` (proxies.controller.ts:141)

**Funções e constantes de topo**
- `mapLimit(items, limit, fn)` · L64 · async
  - chamado por: `testAll` L209
- `parseProxyLine(line)` · L396
  - chamado por: `bulkImport` L136

**Tipos**
- interface `CreateProxyData` L26 · 6 propriedade(s)
- interface `TestResult` L35 · 5 propriedade(s)
- interface `ProxySuggestion` L46 · 6 propriedade(s)
- interface `SetAssignmentData` L55 · 5 propriedade(s)

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
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:319)
- `suggestionAvailability(proxy, inUse)` · L40
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:319)

**Tipos**
- type `ProxySuggestionReason` L6
- interface `ReleasedAssignment` L8 · 4 propriedade(s)

## `modules/proxies/domain/proxy-types.ts`

7 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Tipos**
- type `ProxyProtocol` L1
- type `ProxySource` L2
- type `ProxyStatus` L3
- type `ProxyMode` L4
- type `ProxyStrategy` L5

## `modules/proxies/domain/proxy.entity.ts`

38 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.entity.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/interface/proxies.controller.ts`

**class `Proxy`** L9
- injeta (construtor): `id: string` · `position: number` · `label: string | null` · `protocol: ProxyProtocol` · `host: string` · `port: number` · `username: string | null` · `password: string | null` · `source: ProxySource` · `country: string | null` · `exitIp: string | null` · `latencyMs: number | null` · `status: ProxyStatus` · `enabled: boolean`
- `constructor(id, position, label, protocol, host, port, username, passwo…)` · L10
  - chamado por: `toProxy` (prisma-proxy.repository.ts:50)

**class `ProxyAssignment`** L28
- injeta (construtor): `sessionId: string` · `mode: ProxyMode` · `rangeStart: number | null` · `rangeEnd: number | null` · `strategy: ProxyStrategy` · `currentProxyId: string | null`
- `constructor(sessionId, mode, rangeStart, rangeEnd, strategy, currentPro…)` · L29
  - chamado por: `toAssignment` (prisma-proxy.repository.ts:69)

## `modules/proxies/domain/proxy.repository.ts`

90 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.repository.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `infra/prisma/prisma.service.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/proxies.module.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`

**Funções e constantes de topo**
- `PROXY_REPOSITORY` = `Symbol('PROXY_REPOSITORY')` · L89

**Tipos**
- interface `CreateProxyInput` L12 · 10 propriedade(s)
- interface `UpdateConnectionInput` L25 · 5 propriedade(s)
- interface `SetAssignmentInput` L33 · 6 propriedade(s)
- interface `ProxyRepository` L42
  - `ProxyRepository.nextPosition()` · L43
    - implementado por: `PrismaProxyRepository.nextPosition` (prisma-proxy.repository.ts:85)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:136), `ProxyService.create` (proxy.service.ts:119), `ProxyService.syncWebshare` (proxy.service.ts:344)
  - `ProxyRepository.create(input)` · L44
    - implementado por: `PrismaProxyRepository.create` (prisma-proxy.repository.ts:90)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:136), `ProxyService.create` (proxy.service.ts:119), `ProxyService.syncWebshare` (proxy.service.ts:344)
  - `ProxyRepository.findByWebshareId(webshareId)` · L45
    - implementado por: `PrismaProxyRepository.findByWebshareId` (prisma-proxy.repository.ts:109)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:344)
  - `ProxyRepository.updateConnection(id, input)` · L46
    - implementado por: `PrismaProxyRepository.updateConnection` (prisma-proxy.repository.ts:114)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:344)
  - `ProxyRepository.list()` · L47
    - implementado por: `PrismaProxyRepository.list` (prisma-proxy.repository.ts:130)
    - chamado por: `ProxyService.list` (proxy.service.ts:115), `ProxyService.listAvailable` (proxy.service.ts:225), `ProxyService.testAll` (proxy.service.ts:209)
  - `ProxyRepository.findById(id, tx)` · L48
    - implementado por: `PrismaProxyRepository.findById` (prisma-proxy.repository.ts:137)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.ensureAvailable` (proxy.service.ts:238), `ProxyService.suggestionFor` (proxy.service.ts:319), `ProxyService.test` (proxy.service.ts:194)
  - `ProxyRepository.listInRange(start, end)` · L49
    - implementado por: `PrismaProxyRepository.listInRange` (prisma-proxy.repository.ts:145)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.listEnabledAlive()` · L50
    - implementado por: `PrismaProxyRepository.listEnabledAlive` (prisma-proxy.repository.ts:153)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.updateTest(id, r, tx)` · L51
    - implementado por: `PrismaProxyRepository.updateTest` (prisma-proxy.repository.ts:161)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyService.test` (proxy.service.ts:194)
  - `ProxyRepository.setEnabled(id, enabled)` · L56
    - implementado por: `PrismaProxyRepository.setEnabled` (prisma-proxy.repository.ts:177)
    - chamado por: `ProxyService.setEnabled` (proxy.service.ts:190)
  - `ProxyRepository.delete(id)` · L57
    - implementado por: `PrismaProxyRepository.delete` (prisma-proxy.repository.ts:181)
    - chamado por: `ProxyService.remove` (proxy.service.ts:186)
  - `ProxyRepository.getAssignment(sessionId, tx)` · L59
    - implementado por: `PrismaProxyRepository.getAssignment` (prisma-proxy.repository.ts:185)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.getAssignment` (proxy.service.ts:214)
  - `ProxyRepository.resolveSessionId(reference)` · L64
    - implementado por: `PrismaProxyRepository.resolveSessionId` (prisma-proxy.repository.ts:195)
    - chamado por: `ProxyService.resolveSessionId` (proxy.service.ts:218)
  - `ProxyRepository.setAssignment(input)` · L65
    - implementado por: `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:208)
    - chamado por: `ProxyService.setAssignment` (proxy.service.ts:272)
  - `ProxyRepository.setCurrent(sessionId, proxyId)` · L66
    - implementado por: `PrismaProxyRepository.setCurrent` (prisma-proxy.repository.ts:267)
  - `ProxyRepository.setCurrentIfUnchanged(expected, proxyId)` · L67
    - implementado por: `PrismaProxyRepository.setCurrentIfUnchanged` (prisma-proxy.repository.ts:274)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.usedProxyIds(excludeSessionId)` · L73
    - implementado por: `PrismaProxyRepository.usedProxyIds` (prisma-proxy.repository.ts:292)
    - chamado por: `ProxyService.ensureAvailable` (proxy.service.ts:238), `ProxyService.listAvailable` (proxy.service.ts:225)
  - `ProxyRepository.proxyOwnerName(proxyId)` · L75
    - implementado por: `PrismaProxyRepository.proxyOwnerName` (prisma-proxy.repository.ts:306)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:319)
  - `ProxyRepository.markReleased(sessionId, sessionName, at)` · L79
    - implementado por: `PrismaProxyRepository.markReleased` (prisma-proxy.repository.ts:320)
    - chamado por: `ProxyService.markReleased` (proxy.service.ts:298)
  - `ProxyRepository.findReleasedByName(name)` · L86
    - implementado por: `PrismaProxyRepository.findReleasedByName` (prisma-proxy.repository.ts:332)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:319)

## `modules/proxies/infrastructure/prisma-proxy.repository.ts`

347 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/prisma-proxy.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `PrismaProxyRepository`** L80 · @Injectable · `implements ProxyRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L82
- `nextPosition()` · L85 · async
  - implementa: `ProxyRepository.nextPosition` (proxy.repository.ts:43)
  - banco: `proxy.aggregate`
- `create(input)` · L90 · async
  - implementa: `ProxyRepository.create` (proxy.repository.ts:44)
  - chama: `toProxy` L50, `newId` (ulid.ts:4)
  - banco: `proxy.create`
- `findByWebshareId(webshareId)` · L109 · async
  - implementa: `ProxyRepository.findByWebshareId` (proxy.repository.ts:45)
  - chama: `toProxy` L50
  - banco: `proxy.findUnique`
- `updateConnection(id, input)` · L114 · async
  - implementa: `ProxyRepository.updateConnection` (proxy.repository.ts:46)
  - banco: `proxy.update`
- `list()` · L130 · async
  - implementa: `ProxyRepository.list` (proxy.repository.ts:47)
  - banco: `proxy.findMany`
- `findById(id, tx)` · L137 · async
  - implementa: `ProxyRepository.findById` (proxy.repository.ts:48)
  - chama: `toProxy` L50
- `listInRange(start, end)` · L145 · async
  - implementa: `ProxyRepository.listInRange` (proxy.repository.ts:49)
  - banco: `proxy.findMany`
- `listEnabledAlive()` · L153 · async
  - implementa: `ProxyRepository.listEnabledAlive` (proxy.repository.ts:50)
  - banco: `proxy.findMany`
- `updateTest(id, r, tx)` · L161 · async
  - implementa: `ProxyRepository.updateTest` (proxy.repository.ts:51)
- `setEnabled(id, enabled)` · L177 · async
  - implementa: `ProxyRepository.setEnabled` (proxy.repository.ts:56)
  - banco: `proxy.update`
- `delete(id)` · L181 · async
  - implementa: `ProxyRepository.delete` (proxy.repository.ts:57)
  - banco: `proxy.delete`
- `getAssignment(sessionId, tx)` · L185 · async
  - implementa: `ProxyRepository.getAssignment` (proxy.repository.ts:59)
  - chama: `toAssignment` L69
- `resolveSessionId(reference)` · L195 · async
  - implementa: `ProxyRepository.resolveSessionId` (proxy.repository.ts:64)
  - banco: `waSession.findUnique`
- `setAssignment(input)` · L208 · async
  - implementa: `ProxyRepository.setAssignment` (proxy.repository.ts:65)
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `toAssignment` L69
  - banco: `proxy.findUnique`, `sessionProxyAssignment.upsert`
- `setCurrent(sessionId, proxyId)` · L267 · async
  - implementa: `ProxyRepository.setCurrent` (proxy.repository.ts:66)
  - banco: `sessionProxyAssignment.update`
- `setCurrentIfUnchanged(expected, proxyId)` · L274 · async
  - implementa: `ProxyRepository.setCurrentIfUnchanged` (proxy.repository.ts:67)
  - banco: `sessionProxyAssignment.updateMany`
- `usedProxyIds(excludeSessionId)` · L292 · async
  - implementa: `ProxyRepository.usedProxyIds` (proxy.repository.ts:73)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findMany`
- `proxyOwnerName(proxyId)` · L306 · async
  - implementa: `ProxyRepository.proxyOwnerName` (proxy.repository.ts:75)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findFirst`
- `markReleased(sessionId, sessionName, at)` · L320 · async
  - implementa: `ProxyRepository.markReleased` (proxy.repository.ts:79)
  - banco: `sessionProxyAssignment.updateMany`
- `findReleasedByName(name)` · L332 · async
  - implementa: `ProxyRepository.findReleasedByName` (proxy.repository.ts:86)

**Funções e constantes de topo**
- `toProxy(r)` · L50
  - chama: `Proxy.constructor` (proxy.entity.ts:10)
  - chamado por: `create` L90, `findById` L137, `findByWebshareId` L109
- `toAssignment(r)` · L69
  - chama: `ProxyAssignment.constructor` (proxy.entity.ts:29)
  - chamado por: `getAssignment` L185, `setAssignment` L208

**Tipos**
- type `ProxyRow` L24
- type `AssignmentRow` L41

## `modules/proxies/infrastructure/proxy-agent.factory.ts`

31 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-agent.factory.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`
- importado por: `modules/proxies/application/proxy-resolver.media.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`

**Funções e constantes de topo**
- `buildProxyUrl(p)` · L7
  - chamado por: `buildMediaDispatcher` L25, `buildProxyAgent` L15
- `buildProxyAgent(p)` · L15
  - chama: `buildProxyUrl` L7
  - chamado por: `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:196), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
- `buildMediaDispatcher(p)` · L25
  - chama: `buildProxyUrl` L7
  - chamado por: `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:196)

## `modules/proxies/infrastructure/proxy-health-tester.ts`

80 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/proxy-health-tester.ts`
- importa (interno): `bootstrap/config.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`
- importado por: `modules/proxies/application/proxy.service.ts`, `modules/proxies/proxies.module.ts`

**class `ProxyHealthTester`** L19 · @Injectable
- injeta (construtor): `config: ConfigService<Env, true>`
- `constructor(config)` · L21
- `test(proxy)` · L23 · async
  - chama: `buildProxyAgent` (proxy-agent.factory.ts:15)
  - chamado por: `ProxyService.test` (proxy.service.ts:194)

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
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:344), `ProxyService.webshareConfigured` (proxy.service.ts:339)
- `fetchAll()` · L34 · async
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:344)

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

216 linhas · caminho: `apps/gateway/src/modules/proxies/interface/proxies.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `ProxiesController`** L57 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller
- injeta (construtor): `service: ProxyService`
- `constructor(service)` · L61
- `list()` · L63 · async · @Get('proxies')
  - chama: `ProxyService.list` (proxy.service.ts:115)
- `listAvailable()` · L70 · async · @Get('proxies/available')
  - chama: `ProxyService.listAvailable` (proxy.service.ts:225)
- `suggestion(sessionName)` · L77 · async · @Get('proxies/suggestion')
  - chama: `ProxyService.suggestionFor` (proxy.service.ts:319), `toDto` L28
- `webshareStatus()` · L100 · @Get('proxies/webshare/status')
  - chama: `ProxyService.webshareConfigured` (proxy.service.ts:339)
- `create(body)` · L105 · async · @Post('proxies')
  - chama: `ProxyService.create` (proxy.service.ts:119), `toDto` L28
- `bulk(body)` · L125 · async · @Post('proxies/bulk')
  - chama: `ProxyService.bulkImport` (proxy.service.ts:136)
- `testAll()` · L136 · @Post('proxies/test-all')
  - chama: `ProxyService.testAll` (proxy.service.ts:209)
- `syncWebshare()` · L141 · @Post('proxies/webshare/sync')
  - chama: `ProxyService.syncWebshare` (proxy.service.ts:344)
- `test(id)` · L146 · async · @Post('proxies/:id/test')
  - chama: `ProxyService.test` (proxy.service.ts:194)
- `enable(id)` · L155 · async · @Post('proxies/:id/enable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:190)
- `disable(id)` · L161 · async · @Post('proxies/:id/disable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:190)
- `remove(id)` · L167 · async · @Delete('proxies/:id')
  - chama: `ProxyService.remove` (proxy.service.ts:186)
- `getAssignment(id)` · L174 · async · @Get('sessions/:id/proxy')
  - chama: `ProxyService.getAssignment` (proxy.service.ts:214), `ProxyService.resolveSessionId` (proxy.service.ts:218), `assignmentToDto` L46
- `setAssignment(id, body)` · L190 · async · @Put('sessions/:id/proxy')
  - chama: `ProxyService.resolveSessionId` (proxy.service.ts:218), `ProxyService.setAssignment` (proxy.service.ts:272), `assignmentToDto` L46

**Funções e constantes de topo**
- `toDto(p)` · L28
  - chamado por: `create` L105, `suggestion` L77
- `assignmentToDto(a)` · L46
  - chamado por: `getAssignment` L174, `setAssignment` L190

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
