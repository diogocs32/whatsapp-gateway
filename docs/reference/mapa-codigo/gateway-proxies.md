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
| `modules/proxies/application/proxy.service.ts` | 508 |
| `modules/proxies/application/proxy.service.usage.spec.ts` | 427 |
| `modules/proxies/domain/proxy-suggestion.spec.ts` | 193 |
| `modules/proxies/domain/proxy-suggestion.ts` | 50 |
| `modules/proxies/domain/proxy-types.ts` | 7 |
| `modules/proxies/domain/proxy-usage.spec.ts` | 93 |
| `modules/proxies/domain/proxy-usage.ts` | 48 |
| `modules/proxies/domain/proxy.entity.ts` | 38 |
| `modules/proxies/domain/proxy.repository.ts` | 112 |
| `modules/proxies/infrastructure/prisma-proxy.repository.ts` | 423 |
| `modules/proxies/infrastructure/proxy-agent.factory.ts` | 31 |
| `modules/proxies/infrastructure/proxy-health-tester.ts` | 80 |
| `modules/proxies/infrastructure/webshare.client.ts` | 60 |
| `modules/proxies/interface/dto.ts` | 73 |
| `modules/proxies/interface/proxies.controller.ts` | 243 |
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
  - chama: `hashString` L18, `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ProxyRepository.findById` (proxy.repository.ts:59), `ProxyRepository.getAssignment` (proxy.repository.ts:73), `ProxyRepository.listEnabledAlive` (proxy.repository.ts:61), `ProxyRepository.listInRange` (proxy.repository.ts:60), `ProxyRepository.setCurrentIfUnchanged` (proxy.repository.ts:81)
  - chamado por: `resolveBaileysTransport` L196, `resolveProxyConfig` L173
- `reportFailure(sessionId, reason, expectedProxyId, tx)` · L139 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:59), `ProxyRepository.getAssignment` (proxy.repository.ts:73), `ProxyRepository.updateTest` (proxy.repository.ts:62)
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
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`

**class `ProxyUnavailableError`** L2 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L3
  - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.ensureAvailable` (proxy.service.ts:302), `ProxyService.setAssignment` (proxy.service.ts:341), `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:227)

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

508 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-usage.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`, `modules/proxies/application/proxy-unavailable.error.ts`
- importado por: `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `ProxyService`** L98 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `repo: @Inject(PROXY_REPOSITORY) ProxyRepository` · `tester: ProxyHealthTester` · `webshare: WebshareClient`
- `logger` · L100 · private · campo
- `constructor(repo, tester, webshare)` · L102
- `onApplicationBootstrap()` · L112
  - chama: `testAll` L270
  - env: `NODE_ENV`, `PROXY_RETEST_INTERVAL_MIN`
- `list()` · L129
  - chama: `ProxyRepository.list` (proxy.repository.ts:58)
- `listWithUsage()` · L135 · async
  - chama: `ProxyRepository.list` (proxy.repository.ts:58), `ProxyRepository.proxyUsage` (proxy.repository.ts:91)
  - chamado por: `ProxiesController.list` (proxies.controller.ts:70)
- `create(data)` · L146 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:55), `ProxyRepository.nextPosition` (proxy.repository.ts:54)
  - chamado por: `ProxiesController.create` (proxies.controller.ts:117)
- `bulkImport(text, protocol)` · L163 · async
  - chama: `parseProxyLine` L472, `ProxyRepository.create` (proxy.repository.ts:55), `ProxyRepository.nextPosition` (proxy.repository.ts:54)
  - chamado por: `ProxiesController.bulk` (proxies.controller.ts:137)
- `remove(id)` · L213 · async
  - chama: `ProxyRepository.delete` (proxy.repository.ts:68)
  - chamado por: `ProxiesController.remove` (proxies.controller.ts:193)
- `removeMany(ids)` · L221 · async
  - chama: `ProxyRepository.deleteMany` (proxy.repository.ts:71)
  - chamado por: `ProxiesController.bulkDelete` (proxies.controller.ts:150)
- `setEnabled(id, enabled)` · L251 · async
  - chama: `ProxyRepository.setEnabled` (proxy.repository.ts:67)
  - chamado por: `ProxiesController.disable` (proxies.controller.ts:187), `ProxiesController.enable` (proxies.controller.ts:181)
- `test(id)` · L255 · async
  - chama: `ProxyRepository.findById` (proxy.repository.ts:59), `ProxyRepository.updateTest` (proxy.repository.ts:62), `ProxyHealthTester.test` (proxy-health-tester.ts:23)
  - chamado por: `testAll` L270, `ProxiesController.test` (proxies.controller.ts:172)
- `testAll()` · L270 · async
  - chama: `mapLimit` L78, `test` L255, `ProxyRepository.list` (proxy.repository.ts:58)
  - chamado por: `onApplicationBootstrap` L112, `ProxiesController.testAll` (proxies.controller.ts:162)
- `getAssignment(sessionId)` · L275
  - chama: `ProxyRepository.getAssignment` (proxy.repository.ts:73)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:200)
- `resolveSessionId(reference)` · L279
  - chama: `ProxyRepository.resolveSessionId` (proxy.repository.ts:78)
  - chamado por: `ProxiesController.getAssignment` (proxies.controller.ts:200), `ProxiesController.setAssignment` (proxies.controller.ts:216)
- `listAvailable()` · L287 · async
  - chama: `ProxyRepository.list` (proxy.repository.ts:58), `ProxyRepository.usedProxyIds` (proxy.repository.ts:87)
  - chamado por: `ProxiesController.listAvailable` (proxies.controller.ts:82)
- `ensureAvailable(proxyId, ownSessionId, opts)` · L302 · async
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ProxyRepository.findById` (proxy.repository.ts:59), `ProxyRepository.usedProxyIds` (proxy.repository.ts:87)
  - chamado por: `assignSingle` L325, `setAssignment` L341, `SessionsController.create` (sessions.controller.ts:102)
- `assignSingle(sessionId, proxyId, opts)` · L325 · async
  - chama: `ensureAvailable` L302, `setAssignment` L341
  - chamado por: `SessionsController.create` (sessions.controller.ts:102)
- `setAssignment(sessionId, data)` · L341 · async
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `ensureAvailable` L302, `ProxyRepository.liveSinglePin` (proxy.repository.ts:94), `ProxyRepository.setAssignment` (proxy.repository.ts:79)
  - chamado por: `assignSingle` L325, `ProxiesController.setAssignment` (proxies.controller.ts:216)
- `markReleased(sessionId, sessionName)` · L374 · async
  - chama: `ProxyRepository.markReleased` (proxy.repository.ts:101)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:369)
- `suggestionFor(sessionName)` · L395 · async
  - chama: `pickReleased` (proxy-suggestion.ts:18), `suggestionAvailability` (proxy-suggestion.ts:40), `ProxyRepository.findById` (proxy.repository.ts:59), `ProxyRepository.findReleasedByName` (proxy.repository.ts:108), `ProxyRepository.proxyOwnerName` (proxy.repository.ts:89)
  - chamado por: `ProxiesController.suggestion` (proxies.controller.ts:89)
- `webshareConfigured()` · L415
  - chama: `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.webshareStatus` (proxies.controller.ts:112)
- `syncWebshare()` · L420 · async
  - chama: `ProxyRepository.create` (proxy.repository.ts:55), `ProxyRepository.findByWebshareId` (proxy.repository.ts:56), `ProxyRepository.nextPosition` (proxy.repository.ts:54), `ProxyRepository.updateConnection` (proxy.repository.ts:57), `WebshareClient.fetchAll` (webshare.client.ts:34), `WebshareClient.isConfigured` (webshare.client.ts:29)
  - chamado por: `ProxiesController.syncWebshare` (proxies.controller.ts:167)

**Funções e constantes de topo**
- `mapLimit(items, limit, fn)` · L78 · async
  - chamado por: `testAll` L270
- `parseProxyLine(line)` · L472
  - chamado por: `bulkImport` L163

**Tipos**
- interface `CreateProxyData` L27 · 6 propriedade(s)
- interface `TestResult` L36 · 5 propriedade(s)
- interface `ProxySuggestion` L47 · 6 propriedade(s)
- interface `SetAssignmentData` L56 · 6 propriedade(s)
- interface `ShareOptions` L67 · 1 propriedade(s)
- interface `ProxyWithUsage` L72 · 2 propriedade(s)

## `modules/proxies/application/proxy.service.usage.spec.ts`

427 linhas · caminho: `apps/gateway/src/modules/proxies/application/proxy.service.usage.spec.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-types.ts`, `modules/proxies/domain/proxy-usage.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy-unavailable.error.ts`

- describe “ProxyService.listWithUsage” · L108
  - it “cada proxy do pool, em ordem de posição, com as sessões que o usam” · L109
  - it “proxy usado só por atribuição órfã não aparece no mapa → sessões vazias” · L125
- describe “ProxyService.removeMany” · L134
  - it “apaga os existentes, devolve a contagem e os inexistentes em notFound” · L135
  - it “ids repetidos contam uma vez (o repositório recebe a lista sem repetição, na ordem)” · L147
  - it “o aviso usa o uso devolvido pela própria exclusão (lido sob o lock), sem leitura separada” · L157
  - it “loga as posições apagadas e avisa, nomeando as sessões, quando algum estava em uso” · L165
  - it “nenhum em uso → só o log do lote, sem aviso” · L189
  - it “nada apagado (todos inexistentes) → sem log nem aviso” · L197
- describe “ProxyService.ensureAvailable — exclusividade padrão × allowShared (D-051)” · L206
  - it “padrão: proxy de outra sessão → 400 "em uso" (D-008/D-041 intactos)” · L214
  - it “padrão: o próprio pin da sessão continua aceito” · L224
  - it “allowShared: proxy de outra sessão é aceito sem consultar o uso” · L231
- describe “ProxyService.setAssignment / assignSingle — allowShared chega ao repositório” · L260
  - it “SINGLE com allowShared → grava compartilhado (o lock do repositório pula o dono)” · L268
  - it “SINGLE sem allowShared → 400 antes de gravar” · L289
  - it “SINGLE com proxy livre e sem a flag → repositório recebe allowShared false” · L303
  - it “assignSingle padrão continua exclusivo” · L337
  - it “assignSingle com allowShared grava SINGLE/STICKY compartilhado” · L343
- describe “ProxyService.setAssignment — repetir o próprio SINGLE (achado da revisão E28)” · L358
  - it “o mesmo SINGLE sem a flag passa (não é compartilhar de novo) e o repositório reconfere sob lock” · L379
  - it “vale para as duas sessões que dividem o proxy” · L391
  - it “sessão sem SINGLE nesse proxy (ex.: RANGE com afinidade nele) continua precisando da flag” · L398
  - it “trocar o próprio SINGLE para OUTRO proxy em uso continua precisando da flag” · L410
  - it “o próprio pin não libera proxy que ficou DEAD” · L419

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
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:395)
- `suggestionAvailability(proxy, inUse)` · L40
  - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:395)

**Tipos**
- type `ProxySuggestionReason` L6
- interface `ReleasedAssignment` L8 · 4 propriedade(s)

## `modules/proxies/domain/proxy-types.ts`

7 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-usage.spec.ts`, `modules/proxies/domain/proxy-usage.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Tipos**
- type `ProxyProtocol` L1
- type `ProxySource` L2
- type `ProxyStatus` L3
- type `ProxyMode` L4
- type `ProxyStrategy` L5

## `modules/proxies/domain/proxy-usage.spec.ts`

93 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-usage.spec.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`, `modules/proxies/domain/proxy-usage.ts`

- describe “proxyUsageMap” · L22
  - it “sem atribuições → mapa vazio” · L23
  - it “SINGLE de sessão viva conta para o proxy dela” · L27
  - it “RANGE e GLOBAL contam pela afinidade atual (currentProxyId)” · L32
  - it “mode NONE não conta, mesmo com currentProxyId sobrando na linha” · L40
  - it “RANGE/GLOBAL que ainda não escolheu proxy (currentProxyId null) não conta” · L45
  - it “atribuição órfã (sessão apagada, memória E26) não segura o proxy” · L53
  - it “proxy compartilhado lista todas as sessões, em ordem de nome sem diferenciar caixa” · L62
  - it “empate sem caixa ordena pela comparação exata (determinístico)” · L76
  - it “não muta as entradas e devolve só id/nome” · L84

## `modules/proxies/domain/proxy-usage.ts`

48 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy-usage.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/domain/proxy-usage.spec.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`

**Funções e constantes de topo**
- `byName(a, b)` · L20
- `proxyUsageMap(assignments, liveSessions)` · L30
  - chamado por: `PrismaProxyRepository.usageOf` (prisma-proxy.repository.ts:365)

**Tipos**
- interface `UsageAssignment` L7 · 3 propriedade(s)
- interface `ProxyUsageSession` L13 · 2 propriedade(s)

## `modules/proxies/domain/proxy.entity.ts`

38 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.entity.ts`
- importa (interno): `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.spec.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.suggestion.spec.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/infrastructure/proxy-agent.factory.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/interface/proxies.controller.ts`

**class `Proxy`** L9
- injeta (construtor): `id: string` · `position: number` · `label: string | null` · `protocol: ProxyProtocol` · `host: string` · `port: number` · `username: string | null` · `password: string | null` · `source: ProxySource` · `country: string | null` · `exitIp: string | null` · `latencyMs: number | null` · `status: ProxyStatus` · `enabled: boolean`
- `constructor(id, position, label, protocol, host, port, username, passwo…)` · L10
  - chamado por: `toProxy` (prisma-proxy.repository.ts:49)

**class `ProxyAssignment`** L28
- injeta (construtor): `sessionId: string` · `mode: ProxyMode` · `rangeStart: number | null` · `rangeEnd: number | null` · `strategy: ProxyStrategy` · `currentProxyId: string | null`
- `constructor(sessionId, mode, rangeStart, rangeEnd, strategy, currentPro…)` · L29
  - chamado por: `toAssignment` (prisma-proxy.repository.ts:68)

## `modules/proxies/domain/proxy.repository.ts`

112 linhas · caminho: `apps/gateway/src/modules/proxies/domain/proxy.repository.ts`
- importa (interno): `modules/proxies/domain/proxy.entity.ts`, `infra/prisma/prisma.service.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-usage.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy.service.usage.spec.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/proxies/proxies.module.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`

**Funções e constantes de topo**
- `PROXY_REPOSITORY` = `Symbol('PROXY_REPOSITORY')` · L111

**Tipos**
- interface `CreateProxyInput` L13 · 10 propriedade(s)
- interface `DeletedProxy` L26 · 3 propriedade(s)
- interface `UpdateConnectionInput` L33 · 5 propriedade(s)
- interface `SetAssignmentInput` L41 · 7 propriedade(s)
- interface `ProxyRepository` L53
  - `ProxyRepository.nextPosition()` · L54
    - implementado por: `PrismaProxyRepository.nextPosition` (prisma-proxy.repository.ts:84)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:163), `ProxyService.create` (proxy.service.ts:146), `ProxyService.syncWebshare` (proxy.service.ts:420)
  - `ProxyRepository.create(input)` · L55
    - implementado por: `PrismaProxyRepository.create` (prisma-proxy.repository.ts:89)
    - chamado por: `ProxyService.bulkImport` (proxy.service.ts:163), `ProxyService.create` (proxy.service.ts:146), `ProxyService.syncWebshare` (proxy.service.ts:420)
  - `ProxyRepository.findByWebshareId(webshareId)` · L56
    - implementado por: `PrismaProxyRepository.findByWebshareId` (prisma-proxy.repository.ts:108)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:420)
  - `ProxyRepository.updateConnection(id, input)` · L57
    - implementado por: `PrismaProxyRepository.updateConnection` (prisma-proxy.repository.ts:113)
    - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:420)
  - `ProxyRepository.list()` · L58
    - implementado por: `PrismaProxyRepository.list` (prisma-proxy.repository.ts:129)
    - chamado por: `ProxyService.list` (proxy.service.ts:129), `ProxyService.listAvailable` (proxy.service.ts:287), `ProxyService.listWithUsage` (proxy.service.ts:135), `ProxyService.testAll` (proxy.service.ts:270)
  - `ProxyRepository.findById(id, tx)` · L59
    - implementado por: `PrismaProxyRepository.findById` (prisma-proxy.repository.ts:136)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.ensureAvailable` (proxy.service.ts:302), `ProxyService.suggestionFor` (proxy.service.ts:395), `ProxyService.test` (proxy.service.ts:255)
  - `ProxyRepository.listInRange(start, end)` · L60
    - implementado por: `PrismaProxyRepository.listInRange` (prisma-proxy.repository.ts:144)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.listEnabledAlive()` · L61
    - implementado por: `PrismaProxyRepository.listEnabledAlive` (prisma-proxy.repository.ts:152)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.updateTest(id, r, tx)` · L62
    - implementado por: `PrismaProxyRepository.updateTest` (prisma-proxy.repository.ts:160)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyService.test` (proxy.service.ts:255)
  - `ProxyRepository.setEnabled(id, enabled)` · L67
    - implementado por: `PrismaProxyRepository.setEnabled` (prisma-proxy.repository.ts:176)
    - chamado por: `ProxyService.setEnabled` (proxy.service.ts:251)
  - `ProxyRepository.delete(id)` · L68
    - implementado por: `PrismaProxyRepository.delete` (prisma-proxy.repository.ts:180)
    - chamado por: `ProxyService.remove` (proxy.service.ts:213)
  - `ProxyRepository.deleteMany(ids)` · L71
    - implementado por: `PrismaProxyRepository.deleteMany` (prisma-proxy.repository.ts:188)
    - chamado por: `ProxyService.removeMany` (proxy.service.ts:221)
  - `ProxyRepository.getAssignment(sessionId, tx)` · L73
    - implementado por: `PrismaProxyRepository.getAssignment` (prisma-proxy.repository.ts:204)
    - chamado por: `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyResolver.resolve` (proxy-resolver.service.ts:37), `ProxyService.getAssignment` (proxy.service.ts:275)
  - `ProxyRepository.resolveSessionId(reference)` · L78
    - implementado por: `PrismaProxyRepository.resolveSessionId` (prisma-proxy.repository.ts:214)
    - chamado por: `ProxyService.resolveSessionId` (proxy.service.ts:279)
  - `ProxyRepository.setAssignment(input)` · L79
    - implementado por: `PrismaProxyRepository.setAssignment` (prisma-proxy.repository.ts:227)
    - chamado por: `ProxyService.setAssignment` (proxy.service.ts:341)
  - `ProxyRepository.setCurrent(sessionId, proxyId)` · L80
    - implementado por: `PrismaProxyRepository.setCurrent` (prisma-proxy.repository.ts:293)
  - `ProxyRepository.setCurrentIfUnchanged(expected, proxyId)` · L81
    - implementado por: `PrismaProxyRepository.setCurrentIfUnchanged` (prisma-proxy.repository.ts:300)
    - chamado por: `ProxyResolver.resolve` (proxy-resolver.service.ts:37)
  - `ProxyRepository.usedProxyIds(excludeSessionId)` · L87
    - implementado por: `PrismaProxyRepository.usedProxyIds` (prisma-proxy.repository.ts:318)
    - chamado por: `ProxyService.ensureAvailable` (proxy.service.ts:302), `ProxyService.listAvailable` (proxy.service.ts:287)
  - `ProxyRepository.proxyOwnerName(proxyId)` · L89
    - implementado por: `PrismaProxyRepository.proxyOwnerName` (prisma-proxy.repository.ts:332)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:395)
  - `ProxyRepository.proxyUsage()` · L91
    - implementado por: `PrismaProxyRepository.proxyUsage` (prisma-proxy.repository.ts:346)
    - chamado por: `ProxyService.listWithUsage` (proxy.service.ts:135)
  - `ProxyRepository.liveSinglePin(sessionId, tx)` · L94
    - implementado por: `PrismaProxyRepository.liveSinglePin` (prisma-proxy.repository.ts:350)
    - chamado por: `ProxyService.setAssignment` (proxy.service.ts:341)
  - `ProxyRepository.markReleased(sessionId, sessionName, at)` · L101
    - implementado por: `PrismaProxyRepository.markReleased` (prisma-proxy.repository.ts:396)
    - chamado por: `ProxyService.markReleased` (proxy.service.ts:374)
  - `ProxyRepository.findReleasedByName(name)` · L108
    - implementado por: `PrismaProxyRepository.findReleasedByName` (prisma-proxy.repository.ts:408)
    - chamado por: `ProxyService.suggestionFor` (proxy.service.ts:395)

## `modules/proxies/infrastructure/prisma-proxy.repository.ts`

423 linhas · caminho: `apps/gateway/src/modules/proxies/infrastructure/prisma-proxy.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/domain/proxy-suggestion.ts`, `modules/proxies/domain/proxy-usage.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/domain/proxy-types.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `PrismaProxyRepository`** L79 · @Injectable · `implements ProxyRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L81
- `nextPosition()` · L84 · async
  - implementa: `ProxyRepository.nextPosition` (proxy.repository.ts:54)
  - banco: `proxy.aggregate`
- `create(input)` · L89 · async
  - implementa: `ProxyRepository.create` (proxy.repository.ts:55)
  - chama: `toProxy` L49, `newId` (ulid.ts:4)
  - banco: `proxy.create`
- `findByWebshareId(webshareId)` · L108 · async
  - implementa: `ProxyRepository.findByWebshareId` (proxy.repository.ts:56)
  - chama: `toProxy` L49
  - banco: `proxy.findUnique`
- `updateConnection(id, input)` · L113 · async
  - implementa: `ProxyRepository.updateConnection` (proxy.repository.ts:57)
  - banco: `proxy.update`
- `list()` · L129 · async
  - implementa: `ProxyRepository.list` (proxy.repository.ts:58)
  - banco: `proxy.findMany`
- `findById(id, tx)` · L136 · async
  - implementa: `ProxyRepository.findById` (proxy.repository.ts:59)
  - chama: `toProxy` L49
- `listInRange(start, end)` · L144 · async
  - implementa: `ProxyRepository.listInRange` (proxy.repository.ts:60)
  - banco: `proxy.findMany`
- `listEnabledAlive()` · L152 · async
  - implementa: `ProxyRepository.listEnabledAlive` (proxy.repository.ts:61)
  - banco: `proxy.findMany`
- `updateTest(id, r, tx)` · L160 · async
  - implementa: `ProxyRepository.updateTest` (proxy.repository.ts:62)
- `setEnabled(id, enabled)` · L176 · async
  - implementa: `ProxyRepository.setEnabled` (proxy.repository.ts:67)
  - banco: `proxy.update`
- `delete(id)` · L180 · async
  - implementa: `ProxyRepository.delete` (proxy.repository.ts:68)
  - banco: `proxy.delete`
- `deleteMany(ids)` · L188 · async
  - implementa: `ProxyRepository.deleteMany` (proxy.repository.ts:71)
  - chama: `usageOf` L365
  - banco: `proxy.deleteMany`
- `getAssignment(sessionId, tx)` · L204 · async
  - implementa: `ProxyRepository.getAssignment` (proxy.repository.ts:73)
  - chama: `toAssignment` L68
- `resolveSessionId(reference)` · L214 · async
  - implementa: `ProxyRepository.resolveSessionId` (proxy.repository.ts:78)
  - banco: `waSession.findUnique`
- `setAssignment(input)` · L227 · async
  - implementa: `ProxyRepository.setAssignment` (proxy.repository.ts:79)
  - chama: `ProxyUnavailableError.constructor` (proxy-unavailable.error.ts:3), `liveSinglePin` L350, `toAssignment` L68
  - banco: `proxy.findUnique`, `sessionProxyAssignment.upsert`
- `setCurrent(sessionId, proxyId)` · L293 · async
  - implementa: `ProxyRepository.setCurrent` (proxy.repository.ts:80)
  - banco: `sessionProxyAssignment.update`
- `setCurrentIfUnchanged(expected, proxyId)` · L300 · async
  - implementa: `ProxyRepository.setCurrentIfUnchanged` (proxy.repository.ts:81)
  - banco: `sessionProxyAssignment.updateMany`
- `usedProxyIds(excludeSessionId)` · L318 · async
  - implementa: `ProxyRepository.usedProxyIds` (proxy.repository.ts:87)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findMany`
- `proxyOwnerName(proxyId)` · L332 · async
  - implementa: `ProxyRepository.proxyOwnerName` (proxy.repository.ts:89)
  - banco: `sessionProxyAssignment.findMany`, `waSession.findFirst`
- `proxyUsage()` · L346 · async
  - implementa: `ProxyRepository.proxyUsage` (proxy.repository.ts:91)
  - chama: `usageOf` L365
- `liveSinglePin(sessionId, tx)` · L350 · async
  - implementa: `ProxyRepository.liveSinglePin` (proxy.repository.ts:94)
  - chamado por: `setAssignment` L227
- `usageOf(client, proxyIds)` · L365 · private · async
  - chama: `proxyUsageMap` (proxy-usage.ts:30)
  - chamado por: `deleteMany` L188, `proxyUsage` L346
- `markReleased(sessionId, sessionName, at)` · L396 · async
  - implementa: `ProxyRepository.markReleased` (proxy.repository.ts:101)
  - banco: `sessionProxyAssignment.updateMany`
- `findReleasedByName(name)` · L408 · async
  - implementa: `ProxyRepository.findReleasedByName` (proxy.repository.ts:108)

**Funções e constantes de topo**
- `toProxy(r)` · L49
  - chama: `Proxy.constructor` (proxy.entity.ts:10)
  - chamado por: `create` L89, `findById` L136, `findByWebshareId` L108
- `toAssignment(r)` · L68
  - chama: `ProxyAssignment.constructor` (proxy.entity.ts:29)
  - chamado por: `getAssignment` L204, `setAssignment` L227

**Tipos**
- type `ProxyRow` L23
- type `AssignmentRow` L40

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
  - chamado por: `ProxyService.test` (proxy.service.ts:255)

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
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:420), `ProxyService.webshareConfigured` (proxy.service.ts:415)
- `fetchAll()` · L34 · async
  - chamado por: `ProxyService.syncWebshare` (proxy.service.ts:420)

**Tipos**
- interface `WebshareProxy` L7 · 8 propriedade(s)
- interface `WebshareListResponse` L18 · 4 propriedade(s)

## `modules/proxies/interface/dto.ts`

73 linhas · caminho: `apps/gateway/src/modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/interface/proxies.controller.ts`

**Funções e constantes de topo**
- `protocolSchema` = `z.enum(['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'])` · L3
- `createProxySchema` = `z .object({ label: z.string().max(120).optional(), protocol: protocol…` · L5
- `bulkImportSchema` = `z.object({ text: z.string().min(1), protocol: protocolSchema.default(…` · L20
- `bulkDeleteSchema` = `z.object({ ids: z .array(z.string().regex(/^[0-9A-Za-z_-]{1,64}$/, 'i…` · L28
- `setAssignmentSchema` = `z .object({ mode: z.enum(['NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_RO…` · L37
- `proxySuggestionQuerySchema` = `z .string({ message: 'sessionName é obrigatório' }) .trim() .min(1, '…` · L67

## `modules/proxies/interface/proxies.controller.ts`

243 linhas · caminho: `apps/gateway/src/modules/proxies/interface/proxies.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/proxies/application/proxy.service.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/domain/proxy.entity.ts`, `modules/proxies/interface/dto.ts`
- importado por: `modules/proxies/proxies.module.ts`

**class `ProxiesController`** L63 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller
- injeta (construtor): `service: ProxyService`
- `constructor(service)` · L67
- `list()` · L70 · async · @Get('proxies')
  - chama: `ProxyService.listWithUsage` (proxy.service.ts:135), `toDto` L34
- `listAvailable()` · L82 · async · @Get('proxies/available')
  - chama: `ProxyService.listAvailable` (proxy.service.ts:287)
- `suggestion(sessionName)` · L89 · async · @Get('proxies/suggestion')
  - chama: `ProxyService.suggestionFor` (proxy.service.ts:395), `toDto` L34
- `webshareStatus()` · L112 · @Get('proxies/webshare/status')
  - chama: `ProxyService.webshareConfigured` (proxy.service.ts:415)
- `create(body)` · L117 · async · @Post('proxies')
  - chama: `ProxyService.create` (proxy.service.ts:146), `toDto` L34
- `bulk(body)` · L137 · async · @Post('proxies/bulk')
  - chama: `ProxyService.bulkImport` (proxy.service.ts:163)
- `bulkDelete(body)` · L150 · async · @Post('proxies/bulk-delete') · @HttpCode(200)
  - chama: `ProxyService.removeMany` (proxy.service.ts:221)
- `testAll()` · L162 · @Post('proxies/test-all')
  - chama: `ProxyService.testAll` (proxy.service.ts:270)
- `syncWebshare()` · L167 · @Post('proxies/webshare/sync')
  - chama: `ProxyService.syncWebshare` (proxy.service.ts:420)
- `test(id)` · L172 · async · @Post('proxies/:id/test')
  - chama: `ProxyService.test` (proxy.service.ts:255)
- `enable(id)` · L181 · async · @Post('proxies/:id/enable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:251)
- `disable(id)` · L187 · async · @Post('proxies/:id/disable')
  - chama: `ProxyService.setEnabled` (proxy.service.ts:251)
- `remove(id)` · L193 · async · @Delete('proxies/:id')
  - chama: `ProxyService.remove` (proxy.service.ts:213)
- `getAssignment(id)` · L200 · async · @Get('sessions/:id/proxy')
  - chama: `ProxyService.getAssignment` (proxy.service.ts:275), `ProxyService.resolveSessionId` (proxy.service.ts:279), `assignmentToDto` L52
- `setAssignment(id, body)` · L216 · async · @Put('sessions/:id/proxy')
  - chama: `ProxyService.resolveSessionId` (proxy.service.ts:279), `ProxyService.setAssignment` (proxy.service.ts:341), `assignmentToDto` L52

**Funções e constantes de topo**
- `toDto(p)` · L34
  - chamado por: `create` L117, `list` L70, `suggestion` L89
- `assignmentToDto(a)` · L52
  - chamado por: `getAssignment` L200, `setAssignment` L216

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
