<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/connect-link.service.spec.ts` | 1305 |
| `modules/sessions/application/connect-link.service.ts` | 545 |
| `modules/sessions/application/engine.port.ts` | 441 |
| `modules/sessions/application/session-config.service.ts` | 65 |
| `modules/sessions/application/session-lease.error.ts` | 7 |
| `modules/sessions/application/session-manager.lifecycle.spec.ts` | 876 |
| `modules/sessions/application/session-manager.pairing.spec.ts` | 65 |
| `modules/sessions/application/session-manager.service.ts` | 1574 |
| `modules/sessions/application/session-status-order.spec.ts` | 190 |
| `modules/sessions/domain/connect-link.repository.ts` | 57 |
| `modules/sessions/domain/connect-link.spec.ts` | 784 |
| `modules/sessions/domain/connect-link.ts` | 231 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 26 |
| `modules/sessions/domain/session.repository.ts` | 57 |
| `modules/sessions/domain/wwebjs-version.spec.ts` | 48 |
| `modules/sessions/domain/wwebjs-version.ts` | 10 |
| `modules/sessions/infrastructure/baileys/baileys-cache-observer.spec.ts` | 36 |
| `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts` | 81 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 548 |
| `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts` | 641 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 2588 |
| `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts` | 1354 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 812 |
| `modules/sessions/infrastructure/baileys/baileys.media.spec.ts` | 335 |
| `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts` | 201 |
| `modules/sessions/infrastructure/baileys/baileys.patch.spec.ts` | 129 |
| `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts` | 228 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/disconnect-policy.ts` | 80 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 102 |
| `modules/sessions/infrastructure/baileys/upsert-decision.spec.ts` | 58 |
| `modules/sessions/infrastructure/baileys/upsert-decision.ts` | 36 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/postgres-session-lease.ts` | 158 |
| `modules/sessions/infrastructure/prisma-connect-link.repository.ts` | 174 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 196 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts` | 278 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts` | 308 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts` | 63 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts` | 75 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 3345 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts` | 136 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts` | 906 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 398 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 385 |
| `modules/sessions/interface/connect-link-token.guard.ts` | 38 |
| `modules/sessions/interface/connect-links.controller.ts` | 109 |
| `modules/sessions/interface/dto.ts` | 61 |
| `modules/sessions/interface/public-connect.controller.ts` | 44 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 428 |
| `modules/sessions/sessions.module.ts` | 47 |

## `modules/sessions/application/connect-link.service.spec.ts`

1305 linhas · caminho: `apps/gateway/src/modules/sessions/application/connect-link.service.spec.ts`
- importa (interno): `shared-kernel/crypto.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/domain/connect-link.ts`, `modules/sessions/domain/connect-link.repository.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`

- describe “ConnectLinkService.create (E27/P-086)” · L367
  - it “sessão inexistente → 404 CONNECT_LINK_NOT_FOUND sem gravar link” · L368
  - it “sessão WWEBJS → 409 CONNECT_LINK_ENGINE_UNSUPPORTED (só Baileys na v1)” · L379
  - it “banco WORKING → 409 CONNECT_LINK_SESSION_WORKING” · L388
  - it “engine viva WORKING com banco ainda STOPPED → 409 CONNECT_LINK_SESSION_WORKING” · L397
  - it “login salvo (paired) → 409 CONNECT_LINK_SESSION_PAIRED” · L406
  - it “ok → token base64url de 43 chars, banco guarda só o sha512 e expiresAt = now + ttl” · L416
  - it “tokens de links diferentes são diferentes” · L440
  - it “segundo create revoga o primeiro com REPLACED (um link ativo por sessão)” · L448
  - it “sessão vira WORKING entre a checagem e o insert → link já nasce consumido” · L469
- describe “ConnectLinkService.resolveToken (E27/P-086)” · L488
  - it “formato válido com hash desconhecido → 404 sem ecoar o token” · L513
  - it “link consumido depois da janela de graça → 410 CONNECT_LINK_USED” · L524
  - it “link vencido → 410 CONNECT_LINK_EXPIRED” · L547
  - it “link revogado por número errado → 410 CONNECT_LINK_WRONG_NUMBER” · L556
  - it “ACTIVE e CONNECTED passam (a página precisa ver o "conectado")” · L565
- describe “ConnectLinkService.publicState (E27/P-086)” · L580
  - it “sessão parada sem engine → fase IDLE com botão de gerar QR e dica do número” · L581
  - it “sem número esperado → expectedPhoneHint null” · L599
  - it “QR vivo → fase QR devolve o data URL e não oferece "gerar QR"” · L607
  - it “login salvo com QR vivo → não mostra QR (nunca oferece QR de sessão pareada)” · L653
  - it “operação de ciclo de vida em andamento → PREPARING sem botão” · L664
  - it “IDLE com a cota esgotada → available false e remaining 0” · L674
  - it “lastSeenAt é gravado no máximo 1×/min” · L686
  - it “evento WORKING no EventBus consome o link e o GET seguinte devolve CONNECTED” · L707
  - it “depois da janela de graça o mesmo link responde 410 CONNECT_LINK_USED” · L727
  - it “número diferente com a engine neste processo → revoga WRONG_NUMBER, desfaz a conexão e responde 410” · L792
  - it “número diferente lido numa réplica SEM a engine → não revoga (pending): a página segue preparando” · L814
  - it “evento WORKING com número errado sem a engine no processo → revoga e só avisa no log” · L830
  - it “meJid @lid com número esperado → falha fechada (WRONG_NUMBER)” · L841
  - it “sem número esperado → consome com qualquer conta” · L851
  - it “evento e leitura com número errado ao mesmo tempo → o logout é pedido 1× só” · L861
  - it “dois WORKING com número errado em paralelo → só quem revogou pede o logout” · L873
  - it “número errado lido primeiro numa réplica sem engine → a réplica dona ainda desfaz a conexão” · L887
  - it “fallback da timeline: WORKING registrado desde a criação do link → consome e responde CONNECTED” · L911
  - it “fallback da timeline com número esperado: lastMeJid diferente → WRONG_NUMBER e desfaz sem engine” · L928
  - it “fallback da timeline com número esperado: lastMeJid certo (sem o 9) → CONNECTED” · L951
  - it “WORKING na timeline ANTES da criação do link não consome” · L964
  - it “falha do repositório no assinante do evento só loga (não derruba o processo)” · L978
- describe “ConnectLinkService.requestNewQr (E27/P-086)” · L993
  - it “IDLE → gera o QR, gasta 1 da cota e responde com o intervalo” · L1052
  - it “segundo pedido em < 30 s → 429 NEW_QR_COOLDOWN com retryAfterSeconds; depois de 30 s passa” · L1075
  - it “6º pedido → 409 NEW_QR_LIMIT” · L1098
  - it “lock da sessão ocupado (SessionBusyError do failFast) → 409 CONNECT_LINK_BUSY sem gastar cota” · L1114
  - it “SessionBusyError depois do check (engine saiu do repouso) → 409 CONNECT_LINK_BUSY” · L1125
  - it “newQr falha com erro qualquer → 503 NEW_QR_FAILED com mensagem genérica (e loga o erro)” · L1134
  - it “newQr falha com 'Sessão não encontrada' → 404 CONNECT_LINK_NOT_FOUND” · L1153
  - it “link CONNECTED → 410 sem tocar na sessão” · L1162
  - it “link revogado entre o guard e o pedido → 410 CONNECT_LINK_REVOKED sem gerar QR” · L1172
- describe “ConnectLinkService.revoke / revokeOnOperatorStop (E27/P-086)” · L1185
  - it “revoke sem motivo usa MANUAL e devolve quantos revogou” · L1186
  - it “stop/logout do operador revoga o link ativo com SESSION_STOPPED” · L1194
  - it “não mexe em link já consumido (o "conectado" continua na janela de graça)” · L1207
  - it “erro do repositório só loga, nunca lança (não quebra a rota de stop/logout)” · L1216
- describe “toConnectLinkDto (E27/P-086)” · L1231
  - it “ACTIVE → datas ISO, nulos preservados e sem o hash do token” · L1248

## `modules/sessions/application/connect-link.service.ts`

545 linhas · caminho: `apps/gateway/src/modules/sessions/application/connect-link.service.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/crypto.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `modules/sessions/domain/connect-link.ts`, `modules/sessions/domain/connect-link.repository.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`
- importado por: `bootstrap/rate-limit.spec.ts`, `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/interface/connect-link-token.guard.ts`, `modules/sessions/interface/connect-links.controller.ts`, `modules/sessions/interface/public-connect.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/connect-links.e2e-spec.ts`

**class `ConnectLinkService`** L108 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `links: @Inject(CONNECT_LINK_REPOSITORY) ConnectLinkRepository` · `sessions: @Inject(SESSION_REPOSITORY) SessionRepository` · `manager: SessionManager` · `eventBus: EventBus`
- `logger` · L110 · private · campo
- `constructor(links, sessions, manager, eventBus)` · L112
- `now()` · L121 · protected
  - chamado por: `afterWorking` L373, `checkAndReserve` L423, `create` L144, `onSessionWorking` L494, `publicState` L279, `requestNewQr` L386, `resolveToken` L240, `revoke` L217, `revokeOnOperatorStop` L226
- `onModuleInit()` · L125
  - chama: `onSessionWorking` L494, `EventBus.subscribe` (event-bus.ts:26)
  - assina evento: `'wa.event'`
- `create(sessionId, input, actor)` · L144 · async
  - chama: `connectLinkError` L64, `assertCanCreate` L182, `isWorking` L206, `now` L121, `ConnectLinkRepository.consume` (connect-link.repository.ts:41), `ConnectLinkRepository.createReplacing` (connect-link.repository.ts:22), `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `SessionRepository.findConnectSnapshot` (session.repository.ts:50), `sha512` (crypto.ts:154), `newId` (ulid.ts:4)
  - chamado por: `ConnectLinksController.create` (connect-links.controller.ts:52)
- `assertCanCreate(snap)` · L182 · private
  - chama: `connectLinkError` L64, `isWorking` L206
  - chamado por: `create` L144
- `isWorking(snap)` · L206 · private
  - chama: `SessionManager.liveView` (session-manager.service.ts:572)
  - chamado por: `assertCanCreate` L182, `create` L144
- `latest(sessionId)` · L213
  - chama: `ConnectLinkRepository.findLatestBySession` (connect-link.repository.ts:24)
  - chamado por: `ConnectLinksController.current` (connect-links.controller.ts:93)
- `revoke(sessionId, reason)` · L217
  - chama: `now` L121, `ConnectLinkRepository.revokeActive` (connect-link.repository.ts:30)
  - chamado por: `ConnectLinksController.revoke` (connect-links.controller.ts:101)
- `revokeOnOperatorStop(sessionId)` · L226 · async
  - chama: `now` L121, `ConnectLinkRepository.revokeActive` (connect-link.repository.ts:30)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:350), `SessionsController.stop` (sessions.controller.ts:333)
- `resolveToken(raw)` · L240 · async
  - chama: `assertUsable` L248, `now` L121, `NOT_FOUND` L78, `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `sha512` (crypto.ts:154)
  - chamado por: `ConnectLinkTokenGuard.canActivate` (connect-link-token.guard.ts:23)
- `assertUsable(link, now)` · L248 · private
  - chama: `connectLinkError` L64, `linkState` (connect-link.ts:69)
  - chamado por: `afterWorking` L373, `checkAndReserve` L423, `resolveToken` L240
- `publicState(link)` · L279 · async
  - chama: `connected` L539, `afterWorking` L373, `newQrState` L358, `now` L121, `onSessionWorking` L494, `NOT_FOUND` L78, `SessionManager.isBusy` (session-manager.service.ts:559), `SessionManager.isRehydrated` (session-manager.service.ts:563), `SessionManager.liveView` (session-manager.service.ts:572), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019), `ConnectLinkRepository.consume` (connect-link.repository.ts:41), `ConnectLinkRepository.hasWorkingSince` (connect-link.repository.ts:53), `ConnectLinkRepository.revoke` (connect-link.repository.ts:35), `ConnectLinkRepository.touchSeen` (connect-link.repository.ts:50), `linkState` (connect-link.ts:69), `phoneHint` (connect-link.ts:204), `phoneMatches` (connect-link.ts:195), `publicPhase` (connect-link.ts:141), `SessionRepository.findConnectSnapshot` (session.repository.ts:50)
  - chamado por: `PublicConnectController.state` (public-connect.controller.ts:29)
- `newQrState(link, now, phaseAllows)` · L358 · private
  - chama: `newQrAllowance` (connect-link.ts:89)
  - chamado por: `publicState` L279, `requestNewQr` L386
- `afterWorking(tokenHash)` · L373 · private · async
  - chama: `connected` L539, `assertUsable` L248, `now` L121, `NOT_FOUND` L78, `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `linkState` (connect-link.ts:69)
  - chamado por: `publicState` L279
- `requestNewQr(link)` · L386 · async
  - chama: `connectLinkError` L64, `busy` L482, `checkAndReserve` L423, `newQrState` L358, `now` L121, `NOT_FOUND` L78, `SessionManager.newQrForConnectLink` (session-manager.service.ts:983), `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `linkState` (connect-link.ts:69)
  - chamado por: `PublicConnectController.newQr` (public-connect.controller.ts:36)
- `checkAndReserve(link)` · L423 · private · async
  - chama: `connectLinkError` L64, `assertUsable` L248, `busy` L482, `now` L121, `NOT_FOUND` L78, `SessionManager.isRehydrated` (session-manager.service.ts:563), `SessionManager.liveView` (session-manager.service.ts:572), `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `ConnectLinkRepository.reserveNewQr` (connect-link.repository.ts:44), `linkState` (connect-link.ts:69), `newQrAllowance` (connect-link.ts:89), `publicPhase` (connect-link.ts:141), `SessionRepository.findConnectSnapshot` (session.repository.ts:50)
  - chamado por: `requestNewQr` L386
- `busy()` · L482 · private
  - chama: `connectLinkError` L64
  - chamado por: `checkAndReserve` L423, `requestNewQr` L386
- `onSessionWorking(sessionId, meJid, source)` · L494 · async
  - chama: `now` L121, `SessionManager.hasEngine` (session-manager.service.ts:567), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019), `ConnectLinkRepository.consume` (connect-link.repository.ts:41), `ConnectLinkRepository.findActiveBySession` (connect-link.repository.ts:26), `ConnectLinkRepository.revoke` (connect-link.repository.ts:35), `phoneMatches` (connect-link.ts:195)
  - chamado por: `onModuleInit` L125, `publicState` L279

**Funções e constantes de topo**
- `WRONG_NUMBER_REASON` = `'Conectado com número diferente do esperado pelo link de conexão — a …` · L50
- `connectLinkError(status, code, message, extra, cause)` · L64
  - chamado por: `assertCanCreate` L182, `assertUsable` L248, `busy` L482, `checkAndReserve` L423, `create` L144, `requestNewQr` L386, `NOT_FOUND` L78
- `NOT_FOUND()` · L78
  - chama: `connectLinkError` L64
  - chamado por: `afterWorking` L373, `checkAndReserve` L423, `publicState` L279, `requestNewQr` L386, `resolveToken` L240
- `toConnectLinkDto(link, now)` · L85
  - chama: `linkState` (connect-link.ts:69)
  - chamado por: `ConnectLinksController.create` (connect-links.controller.ts:52), `ConnectLinksController.current` (connect-links.controller.ts:93)
- `connected(link)` · L539
  - chamado por: `afterWorking` L373, `publicState` L279

## `modules/sessions/application/engine.port.ts`

441 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `PendingMediaSendError`** L23 · `extends Error`
- injeta (construtor): `completion: Promise<{ keyId: string; jid: string }>`
- `constructor(completion)` · L24
  - chamado por: `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1752)

**class `ForwardSourceError`** L301 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L302
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1858), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1982)

**class `UnsupportedEngineOperationError`** L318 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L319
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2066), `BaileysEngine.listChats` (baileys.engine.ts:2061), `BaileysEngine.setChatFlag` (baileys.engine.ts:2077)

**Funções e constantes de topo**
- `MAX_FORWARD_TARGETS` = `5` · L256
- `FREQUENTLY_FORWARDED_MIN` = `5` · L257

**Tipos**
- interface `SessionStatePayload` L8 · 5 propriedade(s)
- type `MessageSource` L19
- interface `MessagePayload` L31 · 19 propriedade(s)
- type `AckStatus` L69
- type `MessageAckPayload` L71
- interface `ReactionPayload` L74 · 6 propriedade(s)
- type `EngineEventName` L83
- type `EngineEventHandler` L89
- type `GuardrailEventName` L96
- interface `ReachoutRestrictionSignal` L109 · 4 propriedade(s)
- type `WaEventName` L117
- interface `WaEventEnvelope` L120 · 7 propriedade(s)
- type `MediaSendType` L130
- interface `SendOptions` L135 · 3 propriedade(s)
- interface `SendMediaInput` L143 · 6 propriedade(s)
- interface `SendLocationInput` L153 · 4 propriedade(s)
- interface `SendPollInput` L159 · 3 propriedade(s)
- type `GroupParticipantRole` L166
- type `GroupParticipantAction` L167
- interface `GroupParticipantInfo` L169 · 4 propriedade(s)
- interface `GroupInfo` L175 · 8 propriedade(s)
- interface `ContactCheck` L185 · 3 propriedade(s)
- interface `MembershipRequest` L193 · 3 propriedade(s)
- type `GroupSettingKey` L200
- type `MembershipAction` L201
- interface `SaveContactInput` L206 · 3 propriedade(s)
- interface `ChannelInfo` L211 · 4 propriedade(s)
- interface `ChatSummary` L220 · 6 propriedade(s)
- type `ChatFlag` L231
- interface `HistoryMessage` L235 · 13 propriedade(s)
- interface `ForwardSource` L262 · 12 propriedade(s)
- interface `SendResult` L279 · 5 propriedade(s)
- interface `PreparedForward` L290 · 1 propriedade(s)
  - `PreparedForward.send(to, opts)` · L292
    - chamado por: `ForwardService.sendOne` (forward.service.ts:402), `SessionManager.prepareForward` (session-manager.service.ts:1348)
- type `ForwardErrorCode` L299
- type `PresenceState` L312
- interface `IEngine` L325 · 1 propriedade(s)
  - `IEngine.start()` · L329
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:600), `WWebJSEngine.start` (wwebjs.engine.ts:758)
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1172), `SessionManager.startUnlocked` (session-manager.service.ts:712)
  - `IEngine.stop()` · L330
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:2473), `WWebJSEngine.stop` (wwebjs.engine.ts:1571)
    - chamado por: `SessionManager.drain` (session-manager.service.ts:187), `SessionManager.logoutUnlocked` (session-manager.service.ts:910), `SessionManager.onModuleDestroy` (session-manager.service.ts:321), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019), `SessionManager.stopEngine` (session-manager.service.ts:839)
  - `IEngine.shutdown()` · L338
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:2523), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1611)
    - chamado por: `SessionManager.drain` (session-manager.service.ts:187), `SessionManager.logoutUnlocked` (session-manager.service.ts:910), `SessionManager.onModuleDestroy` (session-manager.service.ts:321), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019)
  - `IEngine.logout()` · L339
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:2540), `WWebJSEngine.logout` (wwebjs.engine.ts:1640)
    - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:910), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019)
  - `IEngine.requestPairingCode(phoneNumber)` · L340
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:2453), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1708)
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1172)
  - `IEngine.sendText(to, text, opts)` · L341
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1629), `WWebJSEngine.sendText` (wwebjs.engine.ts:1722)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:1236)
  - `IEngine.sendMedia(to, input)` · L346
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1662), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1752)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:1246)
  - `IEngine.sendLocation(to, input)` · L351
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1717), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1845)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:1254)
  - `IEngine.sendPoll(to, input)` · L355
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1746), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1879)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:1262)
  - `IEngine.sendPresence(to, state)` · L359
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1808), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1942)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:1270)
  - `IEngine.setProfileStatus(status)` · L361
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1818), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1931)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:1278)
  - `IEngine.setProfileName(name)` · L362
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1821), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1934)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:1281)
  - `IEngine.setProfilePhoto(image, mimetype)` · L363
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1824), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1937)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:1284)
  - `IEngine.markRead(chatJid, msgId)` · L365
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1832), `WWebJSEngine.markRead` (wwebjs.engine.ts:1960)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:1295)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L369
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1840), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1969)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:1330)
  - `IEngine.prepareForward(src)` · L378
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1858), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1982)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:1348)
  - `IEngine.getQrBase64()` · L379
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:577), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:480)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:1158), `SessionManager.liveView` (session-manager.service.ts:572)
  - `IEngine.getPairingCode()` · L382
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:483)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:1162)
  - `IEngine.getStatus()` · L383
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:573), `WWebJSEngine.getStatus` (wwebjs.engine.ts:477)
    - chamado por: `SessionManager.liveView` (session-manager.service.ts:572), `SessionManager.newQrForConnectLink` (session-manager.service.ts:983), `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1172), `SessionManager.working` (session-manager.service.ts:1397)
  - `IEngine.listChats(limit)` · L388
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:2061), `WWebJSEngine.listChats` (wwebjs.engine.ts:2888)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:1304)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L389
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2066), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2908)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:1307)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L393
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:2077), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2963)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:1317)
  - `IEngine.listGroups()` · L396
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:2252), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2991)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:1428)
  - `IEngine.groupInfo(jid)` · L397
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:2260), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:3019)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:1431)
  - `IEngine.createGroup(subject, participants)` · L398
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:2268), `WWebJSEngine.createGroup` (wwebjs.engine.ts:3153)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:1434)
  - `IEngine.updateParticipants(jid, action, participants)` · L399
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:2278), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:3168)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:1444)
  - `IEngine.leaveGroup(jid)` · L404
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:2286), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:3181)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:1456)
  - `IEngine.setGroupSubject(jid, subject)` · L405
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:2289), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:3185)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:1459)
  - `IEngine.setGroupDescription(jid, description)` · L406
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:2292), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:3189)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:1466)
  - `IEngine.groupInviteCode(jid)` · L407
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:2295), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:3193)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:1476)
  - `IEngine.groupRevokeInvite(jid)` · L408
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:2298), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:3197)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:1479)
  - `IEngine.groupMembershipRequests(jid)` · L411
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:2304), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:3205)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:1482)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L412
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:2316), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:3223)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:1488)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L418
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:2338), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:3238)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:1500)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L424
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:2355), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:3249)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:1512)
  - `IEngine.checkNumbers(numbers)` · L427
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:2364), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:3260)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:1526)
  - `IEngine.profilePicture(jid)` · L428
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:2379), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:3271)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:1532)
  - `IEngine.setBlock(jid, action)` · L429
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:2388), `WWebJSEngine.setBlock` (wwebjs.engine.ts:3282)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:1535)
  - `IEngine.saveContact(jid, input)` · L431
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:2391), `WWebJSEngine.saveContact` (wwebjs.engine.ts:3290)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:1542)
  - `IEngine.removeContact(jid)` · L433
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:2404), `WWebJSEngine.removeContact` (wwebjs.engine.ts:3301)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:1549)
  - `IEngine.createChannel(name, description)` · L436
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:2409), `WWebJSEngine.createChannel` (wwebjs.engine.ts:3306)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:1554)
  - `IEngine.channelInfo(jid)` · L437
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:2416), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:3324)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:1564)
  - `IEngine.followChannel(jid)` · L438
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:2420), `WWebJSEngine.followChannel` (wwebjs.engine.ts:3337)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:1567)
  - `IEngine.unfollowChannel(jid)` · L439
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:2423), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:3341)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:1570)

## `modules/sessions/application/session-config.service.ts`

65 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-config.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionConfigService`** L15 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L17
- `get(sessionId)` · L20 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:194), `SessionsController.health` (sessions.controller.ts:185)
  - banco: `sessionConfig.upsert`
- `update(sessionId, patch)` · L28 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.patchConfig` (sessions.controller.ts:201)
  - banco: `sessionConfig.upsert`
- `capFor(cfg, state)` · L41
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:194), `SessionsController.health` (sessions.controller.ts:185), `SessionsController.patchConfig` (sessions.controller.ts:201)

**Tipos**
- type `SessionConfigPatch` L8
- interface `CapInfo` L10 · 2 propriedade(s)

## `modules/sessions/application/session-lease.error.ts`

7 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-lease.error.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**class `LeaseLostError`** L1 · `extends Error`
- `constructor()` · L2
  - chamado por: `SessionManager.epochOf` (session-manager.service.ts:120), `SessionManager.ownedWorking` (session-manager.service.ts:1410), `SessionManager.scheduleRenew` (session-manager.service.ts:144), `SessionManager.sending` (session-manager.service.ts:1369), `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)

## `modules/sessions/application/session-manager.lifecycle.spec.ts`

876 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.lifecycle.spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager — lock de ciclo de vida (E27/D-037)” · L258
  - it “renovação atrasada do ciclo antigo não encerra a engine nova” · L259
  - it “dois newQr concorrentes não se sobrepõem: o 2º espera o 1º terminar e cada engine nova sobe 1 vez” · L282
  - it “stop chamado durante um newQr roda DEPOIS dele e a engine final fica parada” · L326
  - it “restart termina sem deadlock e encadeia stop → start na mesma engine” · L375
  - it “start, stop, restart e stop disparados juntos rodam em fila, na ordem de chegada” · L386
  - it “stop pendurado libera o lock após 10 s, mas não solta o lease nem relança a engine viva” · L411
- describe “SessionManager.newQrForConnectLink (E27/P-086)” · L434
  - it “com outra operação em andamento rejeita SessionBusyError sem chamar o check nem mexer na fila” · L435
  - it “check que lança: erro propaga e nada de stop/deleteMany/purge/start; o lock é liberado” · L457
  - it “sem engine em memória: newQr roda (creds apagadas, purge, engine criada e iniciada)” · L540
- describe “SessionManager — erro e fila (E27/D-037)” · L562
  - it “erro numa operação volta só para o chamador dela e não trava as seguintes” · L563
  - it “start da engine nova falhando dentro do newQrForConnectLink propaga o erro e libera o lock” · L591
  - it “isBusy: true durante a operação e na fila, false quando tudo assenta; por sessão” · L608
  - it “logo após o await de uma operação, o failFast do link público não vê a sessão ocupada” · L622
- describe “SessionManager.remove — ordem para o carimbo de proxy (E26/D-038)” · L633
  - it “só resolve depois do delete cercado pelo lease e rejeita se ele rejeitar” · L638
- describe “SessionManager.requestPairingCode dentro do lock (E27, revisão do diff)” · L660
  - it “pedido de código pendurado estoura em 45 s (409 na rota) e libera o stop que esperava” · L668
- describe “SessionManager.rejectConnectedAccount (E27/P-086)” · L697
  - it “sem engine no mapa (réplica não dona) é no-op” · L698
  - it “com engine: logout, sai do mapa, persiste e publica STOPPED com o motivo e restaura lastMeJid” · L710
  - it “publica um único STOPPED (com o motivo): o STOPPED sem motivo do próprio logout é descartado” · L754
  - it “logout que falha não impede a rejeição (sai do mapa, STOPPED com motivo, lastMeJid)” · L786
  - it “entra na fila do lock (sem failFast): espera a operação em andamento” · L801
- describe “SessionManager — leituras do link (E27/P-086)” · L822
  - it “liveView devolve status+qr da mesma instância e null sem engine; hasEngine acompanha” · L823
  - it “isRehydrated: false antes do bootstrap, true depois sem candidatos” · L847
  - it “isRehydrated com candidatos: só vira true quando o laço termina, mesmo com falha no start” · L856

## `modules/sessions/application/session-manager.pairing.spec.ts`

65 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.pairing.spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager.requestPairingCode (E12)” · L28
  - it “barra status WORKING antes de consultar creds ou iniciar socket” · L29
  - it “barra creds.me persistido de QR mesmo com registered=false” · L40
  - it “inicia sessão sem credenciais e encaminha o pedido sem sleep” · L56

## `modules/sessions/application/session-manager.service.ts`

1574 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-manager.pairing.spec.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionBusyError`** L60 · `extends ConflictException`
- `constructor()` · L61
  - chamado por: `ensureLease` L125, `logoutUnlocked` L910, `newQrForConnectLink` L983, `newQrUnlocked` L1099, `rejectConnectedAccount` L1019, `removeUnlocked` L1124, `runExclusive` L540, `startUnlocked` L712, `stopUnlocked` L866, `working` L1397

**class `SessionManager`** L67 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory` · `guardrail: GuardrailService`
- `logger` · L69 · private · campo
- `engines` · L70 · private · campo
- `names` · L71 · private · campo
- `lastStatusKey` · L75 · private · campo
- `statusWrites` · L78 · private · campo
- `rehydrated` · L86 · private · campo
- `owned` · L88 · private · campo
- `bootRetries` · L92 · private · campo
- `pendingStops` · L96 · private · campo
- `draining` · L97 · private · campo
- `drainFailed` · L98 · private · campo
- `shuttingDown` · L99 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L101
  - chama: `PostgresSessionLease.constructor` (postgres-session-lease.ts:22)
- `isOwner(sessionId)` · L115 · private
  - chamado por: `enqueueStatusWrite` L506, `ensureLease` L125, `epochOf` L120, `getOrCreateEngine` L367, `handleEngineEvent` L581, `newQrForConnectLink` L983, `rejectConnectedAccount` L1019, `stopUnlocked` L866
- `epochOf(sessionId)` · L120 · private
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `isOwner` L115
  - chamado por: `ensureLease` L125, `getOrCreateEngine` L367, `handleEngineEvent` L581, `logoutUnlocked` L910, `ownedWorking` L1410, `persistStatus` L665, `rejectConnectedAccount` L1019, `removeUnlocked` L1124, `sending` L1369, `startUnlocked` L712, `startWithTimeout` L765, `working` L1397
- `ensureLease(sessionId)` · L125 · private · async
  - chama: `constructor` L61, `drain` L187, `epochOf` L120, `isOwner` L115, `scheduleRenew` L144, `PostgresSessionLease.acquire` (postgres-session-lease.ts:24)
  - chamado por: `logoutUnlocked` L910, `newQrForConnectLink` L983, `newQrUnlocked` L1099, `rejectConnectedAccount` L1019, `removeUnlocked` L1124, `requestPairingCodeUnlocked` L1172, `restart` L891, `startUnlocked` L712, `stopUnlocked` L866
- `scheduleRenew(sessionId, held)` · L144 · private
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L187, `scheduleBootRetry` L239, `PostgresSessionLease.renew` (postgres-session-lease.ts:39)
  - chamado por: `ensureLease` L125
- `drain(sessionId, expected)` · L187 · private · async
  - chama: `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `settledWithin` L814
  - chamado por: `ensureLease` L125, `ownedWorking` L1410, `persistStatus` L665, `scheduleRenew` L144, `sending` L1369
- `releaseLease(sessionId)` · L228 · private · async
  - chama: `PostgresSessionLease.release` (postgres-session-lease.ts:48)
  - chamado por: `logoutUnlocked` L910, `newQrForConnectLink` L983, `onModuleDestroy` L321, `rejectConnectedAccount` L1019, `removeUnlocked` L1124, `startUnlocked` L712, `stopUnlocked` L866
- `scheduleBootRetry(sessionId, delayMs)` · L239 · private
  - chama: `isTransientDatabaseError` L259, `startAutostart` L275
  - chamado por: `onApplicationBootstrap` L281, `scheduleRenew` L144
- `isTransientDatabaseError(e)` · L259 · private
  - chamado por: `onApplicationBootstrap` L281, `scheduleBootRetry` L239
- `startAutostart(sessionId)` · L275 · private
  - chama: `runExclusive` L540, `startUnlocked` L712
  - chamado por: `onApplicationBootstrap` L281, `scheduleBootRetry` L239
- `onApplicationBootstrap()` · L281 · async
  - chama: `isTransientDatabaseError` L259, `scheduleBootRetry` L239, `startAutostart` L275, `SessionRepository.findAutostart` (session.repository.ts:49)
- `onModuleDestroy()` · L321 · async
  - chama: `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `releaseLease` L228
- `getOrCreateEngine(sessionId, engineType)` · L367 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `GuardrailService.recordReachoutRestriction` (guardrail.service.ts:456), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:104), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:182), `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:146), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:127), `enqueueStatusWrite` L506, `epochOf` L120, `handleEngineEvent` L581, `isOwner` L115, `EngineFactory.create` (engine.factory.ts:11), `PostgresSessionLease.updateLastErrorDetails` (postgres-session-lease.ts:118)
  - chamado por: `requestPairingCodeUnlocked` L1172, `startUnlocked` L712
  - banco: `sessionConfig.findUnique`
- `enqueueStatusWrite(sessionId, engine, operation, write)` · L506 · private
  - chama: `isOwner` L115
  - chamado por: `getOrCreateEngine` L367
- `locks()` · L532 · private · getter
- `runExclusive(sessionId, fn, opts)` · L540 · private
  - chama: `constructor` L61
  - chamado por: `logout` L906, `newQr` L960, `newQrForConnectLink` L983, `rejectConnectedAccount` L1019, `remove` L1120, `requestPairingCode` L1166, `restart` L891, `start` L708, `startAutostart` L275, `stop` L862
- `isBusy(sessionId)` · L559
  - chamado por: `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `isRehydrated()` · L563
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `hasEngine(sessionId)` · L567
  - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494)
- `liveView(sessionId)` · L572
  - chama: `IEngine.getQrBase64` (engine.port.ts:379), `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.isWorking` (connect-link.service.ts:206), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `handleEngineEvent(sessionId, name, payload, expectedEngine, expectedEpoch)` · L581 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `epochOf` L120, `isOwner` L115, `persistStatus` L665, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L367, `rejectConnectedAccount` L1019
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p, expectedEpoch)` · L665 · private · async
  - chama: `drain` L187, `epochOf` L120, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `handleEngineEvent` L581
- `START_TIMEOUT_MS` · L706 · private · static · campo
- `start(sessionId)` · L708
  - chama: `runExclusive` L540, `startUnlocked` L712
  - chamado por: `SessionsController.create` (sessions.controller.ts:102), `SessionsController.start` (sessions.controller.ts:326)
- `startUnlocked(sessionId, autostartOnly)` · L712 · private · async
  - chama: `IEngine.start` (engine.port.ts:329), `constructor` L61, `ensureLease` L125, `epochOf` L120, `getOrCreateEngine` L367, `releaseLease` L228, `startWithTimeout` L765, `SessionRepository.findById` (session.repository.ts:33), `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)
  - chamado por: `newQrUnlocked` L1099, `restart` L891, `start` L708, `startAutostart` L275
  - banco: `waSession.findUnique`
- `startWithTimeout(sessionId, op)` · L765 · private · async
  - chama: `epochOf` L120, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `requestPairingCodeUnlocked` L1172, `startUnlocked` L712
- `settledWithin(op, ms)` · L814 · private · async
  - chamado por: `drain` L187, `logoutUnlocked` L910, `purgeAuthDir` L964, `rejectConnectedAccount` L1019, `removeUnlocked` L1124, `stopEngine` L839
- `stopEngine(sessionId, engine, ms)` · L839 · private
  - chama: `IEngine.stop` (engine.port.ts:330), `settledWithin` L814
  - chamado por: `newQrUnlocked` L1099, `removeUnlocked` L1124, `stopUnlocked` L866
- `stop(sessionId)` · L862
  - chama: `runExclusive` L540, `stopUnlocked` L866
  - chamado por: `SessionsController.stop` (sessions.controller.ts:333)
- `stopUnlocked(sessionId, keepLease)` · L866 · private · async
  - chama: `constructor` L61, `ensureLease` L125, `isOwner` L115, `releaseLease` L228, `stopEngine` L839, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `restart` L891, `stop` L862
- `restart(sessionId)` · L891
  - chama: `ensureLease` L125, `runExclusive` L540, `startUnlocked` L712, `stopUnlocked` L866
  - chamado por: `SessionsController.restart` (sessions.controller.ts:343)
- `logout(sessionId)` · L906
  - chama: `logoutUnlocked` L910, `runExclusive` L540
  - chamado por: `SessionsController.logout` (sessions.controller.ts:350)
- `logoutUnlocked(sessionId)` · L910 · private · async
  - chama: `IEngine.logout` (engine.port.ts:339), `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `constructor` L61, `ensureLease` L125, `epochOf` L120, `purgeAuthDir` L964, `releaseLease` L228, `settledWithin` L814, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133), `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `logout` L906
- `newQr(sessionId)` · L960
  - chama: `newQrUnlocked` L1099, `runExclusive` L540
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:386)
- `purgeAuthDir(sessionId, epoch)` · L964 · private · async
  - chama: `settledWithin` L814, `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `WWebJSEngine.detachAuthDir` (wwebjs.engine.ts:742), `WWebJSEngine.purgeDetachedAuthDir` (wwebjs.engine.ts:754)
  - chamado por: `logoutUnlocked` L910, `newQrUnlocked` L1099, `rejectConnectedAccount` L1019
- `newQrForConnectLink(sessionId, check)` · L983
  - chama: `IEngine.getStatus` (engine.port.ts:383), `constructor` L61, `ensureLease` L125, `isOwner` L115, `newQrUnlocked` L1099, `releaseLease` L228, `runExclusive` L540
  - chamado por: `ConnectLinkService.requestNewQr` (connect-link.service.ts:386)
- `rejectConnectedAccount(sessionId, reason, restoreLastMeJid, opts)` · L1019
  - chama: `IEngine.logout` (engine.port.ts:339), `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `constructor` L61, `ensureLease` L125, `epochOf` L120, `handleEngineEvent` L581, `isOwner` L115, `purgeAuthDir` L964, `releaseLease` L228, `runExclusive` L540, `settledWithin` L814, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133), `PostgresSessionLease.setLastMeJid` (postgres-session-lease.ts:145), `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `newQrUnlocked(sessionId)` · L1099 · private · async
  - chama: `constructor` L61, `ensureLease` L125, `purgeAuthDir` L964, `startUnlocked` L712, `stopEngine` L839, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133)
  - chamado por: `newQr` L960, `newQrForConnectLink` L983
- `remove(sessionId)` · L1120
  - chama: `removeUnlocked` L1124, `runExclusive` L540
  - chamado por: `SessionsController.remove` (sessions.controller.ts:358)
- `removeUnlocked(sessionId)` · L1124 · private · async
  - chama: `constructor` L61, `ensureLease` L125, `epochOf` L120, `releaseLease` L228, `settledWithin` L814, `stopEngine` L839, `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `WWebJSEngine.detachAuthDir` (wwebjs.engine.ts:742), `WWebJSEngine.purgeDetachedAuthDir` (wwebjs.engine.ts:754)
  - chamado por: `remove` L1120
  - banco: `waSession.delete`
- `getQr(sessionId)` · L1158
  - chama: `IEngine.getQrBase64` (engine.port.ts:379)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:370)
- `getPairingCode(sessionId)` · L1162
  - chama: `IEngine.getPairingCode` (engine.port.ts:382)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:370)
- `requestPairingCode(sessionId, phoneNumber)` · L1166
  - chama: `requestPairingCodeUnlocked` L1172, `runExclusive` L540
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:393)
- `requestPairingCodeUnlocked(sessionId, phoneNumber)` · L1172 · private · async
  - chama: `IEngine.getStatus` (engine.port.ts:383), `IEngine.requestPairingCode` (engine.port.ts:340), `IEngine.start` (engine.port.ts:329), `ensureLease` L125, `getOrCreateEngine` L367, `rejectAfter` L1219, `startWithTimeout` L765, `SessionRepository.findById` (session.repository.ts:33)
  - chamado por: `requestPairingCode` L1166
  - banco: `waSession.findUnique`
- `PAIRING_REQUEST_TIMEOUT_MS` · L1215 · private · static · campo
- `rejectAfter(op, ms, message)` · L1219 · private · async
  - chamado por: `requestPairingCodeUnlocked` L1172
- `sendText(sessionId, to, text, opts)` · L1236 · async
  - chama: `IEngine.sendText` (engine.port.ts:341), `sending` L1369
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:146), `MessagesController.sendText` (messages.controller.ts:616)
- `sendMedia(sessionId, to, input)` · L1246 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:346), `sending` L1369
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:146), `MessagesController.sendMedia` (messages.controller.ts:645), `MessagesController.sendMediaUrl` (messages.controller.ts:715)
- `sendLocation(sessionId, to, input)` · L1254 · async
  - chama: `IEngine.sendLocation` (engine.port.ts:351), `sending` L1369
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:787)
- `sendPoll(sessionId, to, input)` · L1262 · async
  - chama: `IEngine.sendPoll` (engine.port.ts:355), `sending` L1369
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:826)
- `sendPresence(sessionId, to, state)` · L1270 · async
  - chama: `IEngine.sendPresence` (engine.port.ts:359), `ownedWorking` L1410
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:146), `SessionsController.presence` (sessions.controller.ts:218)
- `setProfileStatus(sessionId, status)` · L1278 · async
  - chama: `IEngine.setProfileStatus` (engine.port.ts:361), `ownedWorking` L1410
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:234)
- `setProfileName(sessionId, name)` · L1281 · async
  - chama: `IEngine.setProfileName` (engine.port.ts:362), `ownedWorking` L1410
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:253)
- `setProfilePhoto(sessionId, image, mimetype)` · L1284 · async
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:363), `ownedWorking` L1410
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:273)
- `markRead(sessionId, chatJid, msgId)` · L1295 · async
  - chama: `IEngine.markRead` (engine.port.ts:365), `ownedWorking` L1410
  - chamado por: `MessagesController.markRead` (messages.controller.ts:484)
- `listChats(sessionId, limit)` · L1304 · async
  - chama: `IEngine.listChats` (engine.port.ts:388), `ownedWorking` L1410
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L1307 · async
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:389), `ownedWorking` L1410
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L1317 · async
  - chama: `IEngine.setChatFlag` (engine.port.ts:393), `ownedWorking` L1410
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:410)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L1330 · async
  - chama: `IEngine.sendReaction` (engine.port.ts:369), `sending` L1369
  - chamado por: `MessagesController.reaction` (messages.controller.ts:496)
- `prepareForward(sessionId, src)` · L1348 · async
  - chama: `IEngine.prepareForward` (engine.port.ts:378), `PreparedForward.send` (engine.port.ts:292), `ownedWorking` L1410, `sending` L1369
  - chamado por: `ForwardService.runReserved` (forward.service.ts:170)
- `sending(sessionId)` · L1369 · private · async
  - chama: `GuardrailService.canSendMessage` (guardrail.service.ts:438), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6), `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L187, `epochOf` L120, `working` L1397, `PostgresSessionLease.isCurrent` (postgres-session-lease.ts:55)
  - chamado por: `prepareForward` L1348, `sendLocation` L1254, `sendMedia` L1246, `sendPoll` L1262, `sendReaction` L1330, `sendText` L1236
- `working(sessionId)` · L1397 · private
  - chama: `IEngine.getStatus` (engine.port.ts:383), `constructor` L61, `epochOf` L120
  - chamado por: `ownedWorking` L1410, `sending` L1369
- `ownedWorking(sessionId)` · L1410 · private · async
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L187, `epochOf` L120, `working` L1397, `PostgresSessionLease.isCurrent` (postgres-session-lease.ts:55)
  - chamado por: `channelInfo` L1564, `checkNumbers` L1526, `createChannel` L1554, `createGroup` L1434, `fetchChatHistory` L1307, `followChannel` L1567, `groupInfo` L1431, `groupInviteCode` L1476, `groupMembershipAction` L1488, `groupMembershipRequests` L1482, `groupRevokeInvite` L1479, `leaveGroup` L1456, `listChats` L1304, `listGroups` L1428, `markRead` L1295, `prepareForward` L1348, `profilePicture` L1532, `removeContact` L1549, `saveContact` L1542, `sendPresence` L1270, `setBlock` L1535, `setChatFlag` L1317, `setGroupDescription` L1466, `setGroupPhoto` L1512, `setGroupSetting` L1500, `setGroupSubject` L1459, `setProfileName` L1281, `setProfilePhoto` L1284, `setProfileStatus` L1278, `unfollowChannel` L1570, `updateParticipants` L1444
- `listGroups(sessionId)` · L1428 · async
  - chama: `IEngine.listGroups` (engine.port.ts:396), `ownedWorking` L1410
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L1431 · async
  - chama: `IEngine.groupInfo` (engine.port.ts:397), `ownedWorking` L1410
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L1434 · async
  - chama: `IEngine.createGroup` (engine.port.ts:398), `ownedWorking` L1410
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L1444 · async
  - chama: `IEngine.updateParticipants` (engine.port.ts:399), `ownedWorking` L1410
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L1456 · async
  - chama: `IEngine.leaveGroup` (engine.port.ts:404), `ownedWorking` L1410
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L1459 · async
  - chama: `IEngine.setGroupSubject` (engine.port.ts:405), `ownedWorking` L1410
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L1466 · async
  - chama: `IEngine.setGroupDescription` (engine.port.ts:406), `ownedWorking` L1410
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L1476 · async
  - chama: `IEngine.groupInviteCode` (engine.port.ts:407), `ownedWorking` L1410
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L1479 · async
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:408), `ownedWorking` L1410
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L1482 · async
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:411), `ownedWorking` L1410
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L1488 · async
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:412), `ownedWorking` L1410
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L1500 · async
  - chama: `IEngine.setGroupSetting` (engine.port.ts:418), `ownedWorking` L1410
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L1512 · async
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:424), `ownedWorking` L1410
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L1526 · async
  - chama: `IEngine.checkNumbers` (engine.port.ts:427), `ownedWorking` L1410
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L1532 · async
  - chama: `IEngine.profilePicture` (engine.port.ts:428), `ownedWorking` L1410
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L1535 · async
  - chama: `IEngine.setBlock` (engine.port.ts:429), `ownedWorking` L1410
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L1542 · async
  - chama: `IEngine.saveContact` (engine.port.ts:431), `ownedWorking` L1410
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L1549 · async
  - chama: `IEngine.removeContact` (engine.port.ts:433), `ownedWorking` L1410
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L1554 · async
  - chama: `IEngine.createChannel` (engine.port.ts:436), `ownedWorking` L1410
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L1564 · async
  - chama: `IEngine.channelInfo` (engine.port.ts:437), `ownedWorking` L1410
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L1567 · async
  - chama: `IEngine.followChannel` (engine.port.ts:438), `ownedWorking` L1410
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L1570 · async
  - chama: `IEngine.unfollowChannel` (engine.port.ts:439), `ownedWorking` L1410
  - chamado por: `ChannelsController.unfollow` (channels.controller.ts:56)

## `modules/sessions/application/session-status-order.spec.ts`

190 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-status-order.spec.ts`
- importa (interno): `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager — ordem das escritas de status da mesma sessão” · L33
  - it “espera o FAILED pendente antes de gravar WORKING do novo open” · L34
  - it “grava o diagnóstico do close após o WORKING pendente, sem apagá-lo” · L106

## `modules/sessions/domain/connect-link.repository.ts`

57 linhas · caminho: `apps/gateway/src/modules/sessions/domain/connect-link.repository.ts`
- importa (interno): `modules/sessions/domain/connect-link.ts`
- importado por: `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/infrastructure/prisma-connect-link.repository.ts`, `modules/sessions/sessions.module.ts`

**Funções e constantes de topo**
- `CONNECT_LINK_REPOSITORY` = `Symbol('CONNECT_LINK_REPOSITORY')` · L56

**Tipos**
- interface `CreateConnectLinkInput` L6 · 7 propriedade(s)
- interface `ConnectLinkRepository` L19
  - `ConnectLinkRepository.createReplacing(input)` · L22
    - implementado por: `PrismaConnectLinkRepository.createReplacing` (prisma-connect-link.repository.ts:38)
    - chamado por: `ConnectLinkService.create` (connect-link.service.ts:144)
  - `ConnectLinkRepository.findByHash(tokenHash)` · L23
    - implementado por: `PrismaConnectLinkRepository.findByHash` (prisma-connect-link.repository.ts:78)
    - chamado por: `ConnectLinkService.afterWorking` (connect-link.service.ts:373), `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.create` (connect-link.service.ts:144), `ConnectLinkService.requestNewQr` (connect-link.service.ts:386), `ConnectLinkService.resolveToken` (connect-link.service.ts:240)
  - `ConnectLinkRepository.findLatestBySession(sessionId)` · L24
    - implementado por: `PrismaConnectLinkRepository.findLatestBySession` (prisma-connect-link.repository.ts:85)
    - chamado por: `ConnectLinkService.latest` (connect-link.service.ts:213)
  - `ConnectLinkRepository.findActiveBySession(sessionId, now)` · L26
    - implementado por: `PrismaConnectLinkRepository.findActiveBySession` (prisma-connect-link.repository.ts:93)
    - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494)
  - `ConnectLinkRepository.revokeActive(sessionId, now, reason)` · L30
    - implementado por: `PrismaConnectLinkRepository.revokeActive` (prisma-connect-link.repository.ts:104)
    - chamado por: `ConnectLinkService.revoke` (connect-link.service.ts:217), `ConnectLinkService.revokeOnOperatorStop` (connect-link.service.ts:226)
  - `ConnectLinkRepository.revoke(id, now, reason)` · L35
    - implementado por: `PrismaConnectLinkRepository.revoke` (prisma-connect-link.repository.ts:116)
    - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494), `ConnectLinkService.publicState` (connect-link.service.ts:279)
  - `ConnectLinkRepository.consume(id, now)` · L41
    - implementado por: `PrismaConnectLinkRepository.consume` (prisma-connect-link.repository.ts:128)
    - chamado por: `ConnectLinkService.create` (connect-link.service.ts:144), `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494), `ConnectLinkService.publicState` (connect-link.service.ts:279)
  - `ConnectLinkRepository.reserveNewQr(id, now, max, cooldownMs)` · L44
    - implementado por: `PrismaConnectLinkRepository.reserveNewQr` (prisma-connect-link.repository.ts:136)
    - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423)
  - `ConnectLinkRepository.touchSeen(id, now)` · L50
    - implementado por: `PrismaConnectLinkRepository.touchSeen` (prisma-connect-link.repository.ts:159)
    - chamado por: `ConnectLinkService.publicState` (connect-link.service.ts:279)
  - `ConnectLinkRepository.hasWorkingSince(sessionId, since)` · L53
    - implementado por: `PrismaConnectLinkRepository.hasWorkingSince` (prisma-connect-link.repository.ts:166)
    - chamado por: `ConnectLinkService.publicState` (connect-link.service.ts:279)

## `modules/sessions/domain/connect-link.spec.ts`

784 linhas · caminho: `apps/gateway/src/modules/sessions/domain/connect-link.spec.ts`
- importa (interno): `modules/sessions/domain/connect-link.ts`, `modules/sessions/domain/session-status.ts`

- describe “linkState — estado do link (E27/P-086)” · L56
- describe “newQrAllowance — cota e intervalo do "gerar QR" (E27/P-086)” · L136
- describe “publicPhase — fase da página pública (E27/P-086, D-037 item 7)” · L236
  - it “invariantes: IDLE nunca com Wwebjs/login salvo/FAILED/lock/QR recente/engine em movimento; QR só com QR vivo …” · L517
- describe “phoneDigitsFromJid (E27/P-086)” · L567
- describe “phoneMatches — número conectado é o esperado? (E27/P-086)” · L589
- describe “phoneHint — só os 2 últimos dígitos (E27/P-086)” · L665
- describe “isQrDataUrl — só PNG base64 vai para <img src> (E27/P-086)” · L679
- describe “normalizeExpectedPhone — número esperado vindo do painel (E27/P-086)” · L705
  - it “com o 55 o mesmo número passa e casa com o meJid (com e sem o 9)” · L739
- describe “CONNECT_LINK_TOKEN_RE — 32 bytes em base64url (E27/P-086)” · L750
  - it “aceita 200 tokens randomBytes(32).toString("base64url") (43 chars)” · L751
  - it “rejeita base64 padrão (44 chars com "=" e possivelmente "+"/"/")” · L759
  - it “aceita o alfabeto base64url completo ("-" e "_")” · L780

## `modules/sessions/domain/connect-link.ts`

231 linhas · caminho: `apps/gateway/src/modules/sessions/domain/connect-link.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/domain/connect-link.repository.ts`, `modules/sessions/domain/connect-link.spec.ts`, `modules/sessions/infrastructure/prisma-connect-link.repository.ts`, `modules/sessions/interface/connect-link-token.guard.ts`, `modules/sessions/interface/connect-links.controller.ts`

**Funções e constantes de topo**
- `CONNECT_LINK_TTL_DEFAULT_MIN` = `1440` · L9
- `CONNECT_LINK_TTL_MIN_MIN` = `10` · L10
- `CONNECT_LINK_TTL_MAX_MIN` = `4320` · L11
- `CONNECT_LINK_NEW_QR_MAX` = `5` · L12
- `CONNECT_LINK_NEW_QR_COOLDOWN_MS` = `30_000` · L13
- `CONNECT_LINK_CONNECTED_GRACE_MS` = `15 * 60_000` · L16
- `CONNECT_LINK_SEEN_THROTTLE_MS` = `60_000` · L18
- `CONNECT_LINK_RECENT_NEW_QR_MS` = `45_000` · L21
- `CONNECT_LINK_RETENTION_MS` = `30 * 24 * 60 * 60_000` · L23
- `CONNECT_LINK_TOKEN_RE` = `/^[A-Za-z0-9_-]{43}$/` · L25
- `CONNECT_LINK_ERROR` = `{ NOT_FOUND: 'CONNECT_LINK_NOT_FOUND', USED: 'CONNECT_LINK_USED', REV…` · L27
- `linkState(link, now)` · L69
  - chamado por: `ConnectLinkService.afterWorking` (connect-link.service.ts:373), `ConnectLinkService.assertUsable` (connect-link.service.ts:248), `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.publicState` (connect-link.service.ts:279), `ConnectLinkService.requestNewQr` (connect-link.service.ts:386), `toConnectLinkDto` (connect-link.service.ts:85)
- `newQrAllowance(link, now)` · L89
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.newQrState` (connect-link.service.ts:358)
- `isQrDataUrl(value)` · L129
  - chamado por: `publicPhase` L141
- `publicPhase(p)` · L141
  - chama: `isQrDataUrl` L129
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `phoneDigitsFromJid(jid)` · L172
  - chamado por: `phoneMatches` L195
- `brVariants(digits)` · L183
  - chamado por: `phoneMatches` L195
- `phoneMatches(expected, meJid)` · L195
  - chama: `brVariants` L183, `phoneDigitsFromJid` L172
  - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `phoneHint(expected)` · L204
  - chamado por: `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `BR_NATIONAL_RE` = `/^[1-9]{2}(9[6-9]\d{7}|[2-9]\d{7})$/` · L212
- `looksLikeBrNational(digits)` · L216
  - chamado por: `normalizeExpectedPhone` L223
- `normalizeExpectedPhone(raw)` · L223
  - chama: `looksLikeBrNational` L216
  - chamado por: `ConnectLinksController.create` (connect-links.controller.ts:52)

**Tipos**
- type `ConnectLinkErrorCodeValue` L42
- type `ConnectLinkState` L45
- type `ConnectLinkRevokedReason` L48
- interface `ConnectLinkRecord` L51 · 13 propriedade(s)
- interface `NewQrAllowance` L84 · 2 propriedade(s)
- type `PublicConnectPhase` L105
- interface `PhaseInput` L108 · 8 propriedade(s)

## `modules/sessions/domain/session-status.ts`

15 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/domain/connect-link.spec.ts`, `modules/sessions/domain/connect-link.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_STATUSES` = `[ 'STOPPED', 'STARTING', 'SCAN_QR_CODE', 'PAIRING_CODE', 'WORKING', '…` · L2
- `ENGINES` = `['BAILEYS', 'WWEBJS'] as const` · L13

**Tipos**
- type `SessionStatus` L11
- type `Engine` L14

## `modules/sessions/domain/session.entity.ts`

26 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.entity.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `Session`** L8
- injeta (construtor): `id: string` · `name: string` · `engine: Engine` · `status: SessionStatus` · `meJid: string | null` · `mePushName: string | null` · `phoneNumber: string | null` · `autostart: boolean` · `lastError: string | null` · `createdAt: Date` · `updatedAt: Date` · `lastErrorDetails: SessionErrorDetails | null` · `lastMeJid: string | null`
- `constructor(id, name, engine, status, meJid, mePushName, phoneNumber, a…)` · L9
  - chamado por: `PrismaSessionRepository.toDomain` (prisma-session.repository.ts:40)

**Tipos**
- interface `SessionErrorDetails` L3 · 2 propriedade(s)

## `modules/sessions/domain/session.repository.ts`

57 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.repository.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_REPOSITORY` = `Symbol('SESSION_REPOSITORY')` · L56

**Tipos**
- interface `CreateSessionInput` L4 · 5 propriedade(s)
- interface `StatusPatch` L12 · 4 propriedade(s)
- interface `ConnectSnapshot` L22 · 6 propriedade(s)
- interface `SessionRepository` L31
  - `SessionRepository.create(input)` · L32
    - implementado por: `PrismaSessionRepository.create` (prisma-session.repository.ts:58)
    - chamado por: `SessionsController.create` (sessions.controller.ts:102)
  - `SessionRepository.findById(id)` · L33
    - implementado por: `PrismaSessionRepository.findById` (prisma-session.repository.ts:72)
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1172), `SessionManager.startUnlocked` (session-manager.service.ts:712), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:102), `SessionsController.ensure` (sessions.controller.ts:422)
  - `SessionRepository.findByName(name)` · L34
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:77)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:102)
  - `SessionRepository.list()` · L35
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:82)
    - chamado por: `SessionsController.create` (sessions.controller.ts:102), `SessionsController.list` (sessions.controller.ts:159)
  - `SessionRepository.updateStatus(id, status, patch)` · L38
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:89)
  - `SessionRepository.updateLastErrorDetails(id, details)` · L44
    - implementado por: `PrismaSessionRepository.updateLastErrorDetails` (prisma-session.repository.ts:127)
  - `SessionRepository.delete(id)` · L48
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:140)
    - chamado por: `SessionsController.create` (sessions.controller.ts:102)
  - `SessionRepository.findAutostart()` · L49
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:178)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:281)
  - `SessionRepository.findConnectSnapshot(id)` · L50
    - implementado por: `PrismaSessionRepository.findConnectSnapshot` (prisma-session.repository.ts:144)
    - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.create` (connect-link.service.ts:144), `ConnectLinkService.publicState` (connect-link.service.ts:279)
  - `SessionRepository.setLastMeJid(id, jid)` · L53
    - implementado por: `PrismaSessionRepository.setLastMeJid` (prisma-session.repository.ts:171)

## `modules/sessions/domain/wwebjs-version.spec.ts`

48 linhas · caminho: `apps/gateway/src/modules/sessions/domain/wwebjs-version.spec.ts`
- importa (interno): `modules/sessions/domain/wwebjs-version.ts`

- describe “versão WA Web da sessão e cache da lib patchada” · L17
  - it “aceita modos explícitos e a build alpha; rejeita separadores e traversal” · L18
  - it “o cache instalado lê e grava a build alpha dentro da pasta e recusa traversal” · L33

## `modules/sessions/domain/wwebjs-version.ts`

10 linhas · caminho: `apps/gateway/src/modules/sessions/domain/wwebjs-version.ts`
- importado por: `modules/sessions/domain/wwebjs-version.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/interface/dto.ts`

**Funções e constantes de topo**
- `isWwebjsVersionMode(value)` · L2
  - chamado por: `WWebJSEngine.doStart` (wwebjs.engine.ts:772), `WWebJSEngine.resolveWebVersion` (wwebjs.engine.ts:1207)

## `modules/sessions/infrastructure/baileys/baileys-cache-observer.spec.ts`

36 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys-cache-observer.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`

- describe “BaileysCacheObserver (E12)” · L4
  - it “mede caches e conta apenas pre-keys da sessão no banco sintético” · L5

## `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`

81 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys-cache-observer.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `gateway/test/sessions.e2e-spec.ts`

**class `BaileysCacheObserver`** L9
- injeta (construtor): `sessionId: string` · `prisma: PrismaService` · `logger: Logger`
- `msgRetryCounterCache` · L11 · campo
- `userDevicesCache` · L15 · campo
- `startedAt` · L20 · private · campo
- `closed` · L21 · private · campo
- `constructor(sessionId, prisma, logger)` · L23
  - chama: `snapshot` L35
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:613)
- `snapshot(reason)` · L35 · async
  - chamado por: `close` L71, `constructor` L23, `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:914)
  - banco: `waAuthKey.count`
- `close(reason)` · L71
  - chama: `snapshot` L35
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:613), `BaileysEngine.doLogout` (baileys.engine.ts:2545), `BaileysEngine.doStop` (baileys.engine.ts:2480), `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:914), `BaileysEngine.shutdown` (baileys.engine.ts:2523)

## `modules/sessions/infrastructure/baileys/baileys-content.spec.ts`

448 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys-content.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys-content.ts`

- describe “describeBaileysMessage — tipos visíveis (P-066)” · L288
  - it “mídia traz metadados; lottie traz o conteúdo desembrulhado para o download” · L299
- describe “describeBaileysMessage — o que NÃO é mensagem no chat (P-066 / D-028)” · L323
  - it “voto de enquete: do contato vira poll_vote (conta como resposta); o nosso é ignorado” · L377
- describe “describeBaileysMessage — selo "Encaminhada" (contextInfo dentro do conteúdo)” · L393
  - it “texto encaminhado 5× → isForwarded + score 5” · L394
  - it “localização e documento-com-legenda encaminhados (contextInfo interno)” · L405
  - it “não encaminhada → false/null; texto simples (conversation) nunca tem contextInfo” · L433

## `modules/sessions/infrastructure/baileys/baileys-content.ts`

548 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys-content.ts`
- importa (interno): `modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys-content.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`

**Funções e constantes de topo**
- `EXTRA_WRAPPERS` = `new Set([ 'lottieStickerMessage', 'groupMentionedMessage', 'botInvoke…` · L33
- `IGNORED` = `new Set([ 'protocolMessage', 'senderKeyDistributionMessage', 'fastRat…` · L47
- `POLLS` = `new Set([ 'pollCreationMessage', 'pollCreationMessageV2', 'pollCreati…` · L73
- `toNum(v)` · L81
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:272)
- `str(v)` · L91
  - chama: `clean` (message-content.ts:71)
  - chamado por: `describeBaileysMessage` L192, `join` L95, `mediaInfoOf` L106
- `join(parts, sep)` · L95
  - chama: `str` L91, `clean` (message-content.ts:71)
  - chamado por: `describeBaileysMessage` L192
- `mediaInfoOf(msg)` · L106
  - chama: `str` L91, `toNum` L81
  - chamado por: `describeBaileysMessage` L192
- `unwrapBaileys(message)` · L164
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523
- `describeBaileysMessage(message, fromMe)` · L192
  - chama: `join` L95, `mediaInfoOf` L106, `str` L91, `textOrOther` L403, `toNum` L81, `unwrapBaileys` L164, `content` (message-content.ts:37), `formatContacts` (message-content.ts:108), `formatEvent` (message-content.ts:135), `formatLocation` (message-content.ts:83), `formatPoll` (message-content.ts:124), `forwarding` (message-content.ts:55), `ignore` (message-content.ts:33)
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1928), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1187)
- `textOrOther(text, fwd)` · L403
  - chama: `content` (message-content.ts:37)
  - chamado por: `describeBaileysMessage` L192
- `FORWARDABLE` = `new Set<string>([ 'conversation', 'extendedTextMessage', 'imageMessag…` · L417
- `VIEW_ONCE` = `new Set([ 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2E…` · L431
- `findAtWrapperLevels(message, keys, viewOnceFlag)` · L439
  - chamado por: `forwardableContent` L523, `isViewOnce` L467
- `isViewOnce(message)` · L467
  - chama: `findAtWrapperLevels` L439
  - chamado por: `forwardableContent` L523
- `BUSINESS_TEMPLATES` = `new Set(['buttonsMessage', 'templateMessage'])` · L474
- `unsupportedLabel(ctype)` · L476
  - chamado por: `forwardableContent` L523
- `forwardableContent(message)` · L523
  - chama: `findAtWrapperLevels` L439, `isViewOnce` L467, `toNum` L81, `unsupportedLabel` L476, `unwrapBaileys` L164
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1858)

**Tipos**
- type `BaileysDescribed` L27
- type `BaileysForwardContent` L505

## `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`

641 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`
- importa (interno): `shared-kernel/disconnect-stats.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`

- describe “matriz pura DisconnectReason da rc14” · L100
  - it “preserva código e razão brutos sem mudar o texto estável para dedup” · L116
- describe “Baileys — desconexão por código (E9/P-049)” · L131
  - it “401 limpa credenciais, para e não reconecta” · L132
  - it “405 publica alerta client_too_old e evita novas tentativas” · L167
  - it “515 reinicia sem gastar o orçamento de tentativas” · L198
  - it “515 repetido mais de três vezes corta o loop sem consumir tentativas comuns” · L208
  - it “440 admite no máximo uma retentativa tardia e não persiste terminal” · L229
  - it “QR durante a retentativa quieta 440 não publica SCAN_QR_CODE” · L288
  - it “440 duplicado antes do timer mantém uma única tentativa agendada” · L304
  - it “500 esgota cinco tentativas antes de DEGRADED” · L319
  - it “conta o código bruto uma vez por close, inclusive quando o status não muda” · L338
  - it “stop cancela o timer; novo start invalida a geração antiga” · L352
  - it “connection.update continua provisório; só o resultado direto do RPC confirma prazo” · L371
- describe “Baileys — versão por conexão (E9/P-049)” · L402
  - it “stop durante resolveAgent pendente não cria socket após o retorno tardio” · L403
  - it “retry 440 não publica STARTING nem deixa o estado local WORKING com socket fechado” · L448
  - it “não cacheia fallback, limita consulta, compartilha flight e isola override no canário” · L522

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

2588 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/upsert-decision.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/disconnect-stats.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`, `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.media.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L512 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L513 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L514 · private · campo
- `cacheObserver` · L515 · private · campo
- `pairingReadySock` · L516 · private · campo
- `createMediaDispatcher()` · L519 · private
- `status` · L521 · private · campo
- `qrBase64` · L522 · private · campo
- `stopped` · L523 · private · campo
- `reconnectAttempts` · L524 · private · campo
- `replacedRetryUsed` · L525 · private · campo
- `replacedRetryAttempted` · L526 · private · campo
- `restartRequiredStreak` · L527 · private · campo
- `lifecycle` · L533 · private · campo
- `sentMessages` · L535 · private · campo
- `seenUpserts` · L538 · private · campo
- `lidToPn` · L540 · private · campo
- `groupPushName` · L543 · private · campo
- `connectGeneration` · L548 · private · campo
- `timelockFetch` · L549 · private · campo
- `lastTimelockFetchAt` · L550 · private · campo
- `groupMetaCache` · L552 · private · campo
- `constructor(deps)` · L557
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L559 · private
  - chamado por: `connect` L613, `groupInfo` L2260, `listGroups` L2252
- `clearReconnectTimer()` · L568 · private
  - chamado por: `doLogout` L2545, `doStop` L2480, `onConnectionUpdate` L914, `scheduleBudgetedReconnect` L1115, `scheduleReconnect` L1135, `shutdown` L2523, `start` L600
- `getStatus()` · L573
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `requestPairingCode` L2453
- `getQrBase64()` · L577
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `setStatus(status, extra)` · L581 · private
  - chamado por: `connect` L613, `doLogout` L2545, `doStop` L2480, `onConnectionUpdate` L914, `requestPairingCode` L2453, `scheduleBudgetedReconnect` L1115
- `serialize(fn)` · L591 · private
  - chamado por: `connect` L613, `logout` L2540, `scheduleReconnect` L1135, `start` L600, `stop` L2473
- `start()` · L600
  - implementa: `IEngine.start` (engine.port.ts:329)
  - chama: `clearReconnectTimer` L568, `connect` L613, `serialize` L591
- `connect(persistStartingStatus)` · L613 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.constructor` (baileys-cache-observer.ts:23), `cacheGroupMeta` L559, `detachSocketListeners` L2500, `loadMessageForRetry` L2000, `onConnectionUpdate` L914, `onContacts` L2153, `onMessageCapping` L1363, `onMessagesUpdate` L1301, `onMessagesUpsert` L1187, `onReactions` L809, `safe` L2035, `serialize` L591, `setStatus` L581, `latestBaileysVersion` L169, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:21)
  - chamado por: `scheduleReconnect` L1135, `start` L600
- `onReactions(reactions)` · L809 · private
  - chama: `learnPair` L845, `resolveChatJid` L838, `mapBaileysReaction` L272
  - chamado por: `connect` L613
- `resolveChatJid(jid)` · L838 · private
  - chamado por: `groupSenderOf` L872, `onReactions` L809
- `learnPair(a, b)` · L845 · private
  - chama: `learnLid` L852
  - chamado por: `onReactions` L809
- `learnLid(lid, pn)` · L852 · private
  - chama: `mergeLidMessages` L2110
  - chamado por: `groupSenderOf` L872, `learnPair` L845, `onMessagesUpsert` L1187
- `groupSenderOf(m)` · L872 · private
  - chama: `learnLid` L852, `rememberGroupPushName` L906, `resolveChatJid` L838, `phoneFirst` L299
  - chamado por: `onMessagesUpsert` L1187
- `rememberGroupPushName(pn, pushName)` · L906 · private
  - chamado por: `groupSenderOf` L872
- `onConnectionUpdate(update, eventSock)` · L914 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.snapshot` (baileys-cache-observer.ts:35), `clearCredentials` L2571, `clearReconnectTimer` L568, `detachSocketListeners` L2500, `fetchReachoutTimelock` L1389, `scheduleBudgetedReconnect` L1115, `scheduleReconnect` L1135, `setStatus` L581, `warmLidCache` L2096, `classifyDisconnect` (disconnect-policy.ts:29), `disconnectDetails` (disconnect-policy.ts:12), `recordDisconnect` (disconnect-stats.ts:10), `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L613
- `scheduleBudgetedReconnect(details)` · L1115 · private
  - chama: `clearReconnectTimer` L568, `scheduleReconnect` L1135, `setStatus` L581
  - chamado por: `onConnectionUpdate` L914, `scheduleReconnect` L1135
- `scheduleReconnect(delay, details, retryAfterConnectFailure, quietStart)` · L1135 · private
  - chama: `clearReconnectTimer` L568, `connect` L613, `scheduleBudgetedReconnect` L1115, `serialize` L591
  - chamado por: `onConnectionUpdate` L914, `scheduleBudgetedReconnect` L1115
- `onMessagesUpsert(upsert)` · L1187 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L872, `handleIncomingMedia` L1485, `learnLid` L852, `encodeProto` L251, `shouldAcceptUpsert` (upsert-decision.ts:8)
  - chamado por: `connect` L613
  - banco: `waMessage.findFirst`
- `onMessagesUpdate(updates)` · L1301 · private · async
  - chama: `fetchReachoutTimelock` L1389, `markMessage` L1466, `mapAckStatus` L318, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L613
- `onMessageCapping(info)` · L1363 · private · async
  - chama: `fetchReachoutTimelock` L1389, `cappingCycleEnd` L502, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L613
- `fetchReachoutTimelock()` · L1389 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `onConnectionUpdate` L914, `onMessageCapping` L1363, `onMessagesUpdate` L1301
- `markMessage(keyId, fromMe, field)` · L1466 · private
  - chamado por: `onMessagesUpdate` L1301
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1485 · private · async
  - chama: `encodeProto` L251, `extOf` L304
  - chamado por: `onMessagesUpsert` L1187
- `sendText(to, text, opts)` · L1629 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `cacheSent` L1986, `resolveJid` L1803, `encodeProto` L251
- `sendMedia(to, input)` · L1662 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `cacheSent` L1986, `resolveJid` L1803, `buildMediaContent` L338, `encodeProto` L251, `extOf` L304
- `sendLocation(to, input)` · L1717 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `emitOutbound` L1771, `resolveJid` L1803, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1746 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `emitOutbound` L1771, `resolveJid` L1803, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1771 · private
  - chama: `cacheSent` L1986, `encodeProto` L251
  - chamado por: `sendLocation` L1717, `sendPoll` L1746
- `resolveJid(to)` · L1803 · private · async
  - chama: `toJid` L2583
  - chamado por: `forwardTo` L1928, `resolveParticipants` L2087, `sendLocation` L1717, `sendMedia` L1662, `sendPoll` L1746, `sendText` L1629
- `sendPresence(to, state)` · L1808 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `sk` L2054, `toJid` L2583
- `setProfileStatus(status)` · L1818 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `sk` L2054
- `setProfileName(name)` · L1821 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `sk` L2054
- `setProfilePhoto(image, _mimetype)` · L1824 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `sk` L2054
- `markRead(chatJid, msgId)` · L1832 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `sk` L2054, `toJid` L2583
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1840 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `toJid` L2583
- `prepareForward(src)` · L1858 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1928, `decodeProto` L254
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1928 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L1986, `resolveJid` L1803, `encodeProto` L251, `toJid` L2583
  - chamado por: `prepareForward` L1858
- `cacheSent(keyId, message)` · L1986 · private
  - chamado por: `emitOutbound` L1771, `forwardTo` L1928, `loadMessageForRetry` L2000, `sendMedia` L1662, `sendText` L1629
- `loadMessageForRetry(key)` · L2000 · private · async
  - chama: `cacheSent` L1986, `decodeProto` L254
  - chamado por: `connect` L613
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L2035 · private
  - chamado por: `connect` L613
- `sk()` · L2054 · private
  - chamado por: `channelInfo` L2416, `checkNumbers` L2364, `createChannel` L2409, `createGroup` L2268, `followChannel` L2420, `groupInfo` L2260, `groupInviteCode` L2295, `groupMembershipAction` L2316, `groupMembershipRequests` L2304, `groupRevokeInvite` L2298, `leaveGroup` L2286, `listGroups` L2252, `markRead` L1832, `profilePicture` L2379, `removeContact` L2404, `saveContact` L2391, `sendPresence` L1808, `setBlock` L2388, `setGroupDescription` L2292, `setGroupPhoto` L2355, `setGroupSetting` L2338, `setGroupSubject` L2289, `setProfileName` L1821, `setProfilePhoto` L1824, `setProfileStatus` L1818, `unfollowChannel` L2423, `updateParticipants` L2278
- `listChats(_limit)` · L2061 · async
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `fetchChatHistory(_chatJid, _limit)` · L2066 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `setChatFlag(_chatJid, _flag, _enabled)` · L2077 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `resolveParticipants(items)` · L2087 · private · async
  - chama: `resolveJid` L1803
  - chamado por: `createGroup` L2268, `groupMembershipAction` L2316, `updateParticipants` L2278
- `warmLidCache()` · L2096 · private · async
  - chama: `mergeKnownLids` L2133
  - chamado por: `onConnectionUpdate` L914
- `mergeLidMessages(lid, phoneJid)` · L2110 · private · async
  - chamado por: `learnLid` L852, `mergeKnownLids` L2133
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L2133 · private · async
  - chama: `mergeLidMessages` L2110
  - chamado por: `warmLidCache` L2096
  - banco: `waMessage.findMany`
- `onContacts(list)` · L2153 · private
  - chama: `contactToRecord` L226
  - chamado por: `connect` L613
- `recordGroupParticipants(groups)` · L2160 · private · async
  - chama: `resolveParticipantPhone` L376
  - chamado por: `createGroup` L2268, `groupInfo` L2260, `listGroups` L2252
- `resolveParticipantNames(groups, rosterLidToPn)` · L2229 · private · async
  - chama: `resolveParticipantPhone` L376
  - chamado por: `groupInfo` L2260, `listGroups` L2252
- `listGroups()` · L2252 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `cacheGroupMeta` L559, `recordGroupParticipants` L2160, `resolveParticipantNames` L2229, `sk` L2054, `toGroupInfo` L426
- `groupInfo(jid)` · L2260 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
  - chama: `cacheGroupMeta` L559, `recordGroupParticipants` L2160, `resolveParticipantNames` L2229, `sk` L2054, `toGroupInfo` L426, `toGroupJid` L470
- `createGroup(subject, participants)` · L2268 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `recordGroupParticipants` L2160, `resolveParticipants` L2087, `sk` L2054, `toGroupInfo` L426
- `updateParticipants(jid, action, participants)` · L2278 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `resolveParticipants` L2087, `sk` L2054, `toGroupJid` L470
- `leaveGroup(jid)` · L2286 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `sk` L2054, `toGroupJid` L470
- `setGroupSubject(jid, subject)` · L2289 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `sk` L2054, `toGroupJid` L470
- `setGroupDescription(jid, description)` · L2292 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `sk` L2054, `toGroupJid` L470
- `groupInviteCode(jid)` · L2295 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `sk` L2054, `toGroupJid` L470
- `groupRevokeInvite(jid)` · L2298 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `sk` L2054, `toGroupJid` L470
- `groupMembershipRequests(jid)` · L2304 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `sk` L2054, `toGroupJid` L470
- `groupMembershipAction(jid, action, participants)` · L2316 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `resolveParticipants` L2087, `sk` L2054, `toGroupJid` L470
- `setGroupSetting(jid, setting, enabled)` · L2338 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `sk` L2054, `toGroupJid` L470
- `setGroupPhoto(jid, image, _mimetype)` · L2355 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `sk` L2054, `toGroupJid` L470
- `checkNumbers(numbers)` · L2364 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `sk` L2054
- `profilePicture(jid)` · L2379 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `sk` L2054, `toContactJid` L473
- `setBlock(jid, action)` · L2388 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `sk` L2054, `toContactJid` L473
- `saveContact(jid, input)` · L2391 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `sk` L2054, `toContactJid` L473
- `removeContact(jid)` · L2404 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `sk` L2054, `toContactJid` L473
- `createChannel(name, description)` · L2409 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `sk` L2054, `toChannelInfo` L459
- `channelInfo(jid)` · L2416 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `sk` L2054, `toChannelInfo` L459
- `followChannel(jid)` · L2420 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `sk` L2054
- `unfollowChannel(jid)` · L2423 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
  - chama: `sk` L2054
- `waitForPairingReady(sock)` · L2427 · private · async
  - chamado por: `requestPairingCode` L2453
- `requestPairingCode(phoneNumber)` · L2453 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `getStatus` L573, `setStatus` L581, `waitForPairingReady` L2427
- `stop()` · L2473
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L2480, `serialize` L591
- `doStop()` · L2480 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L568, `detachSocketListeners` L2500, `setStatus` L581
  - chamado por: `stop` L2473
- `detachSocketListeners()` · L2500 · private
  - chamado por: `connect` L613, `doLogout` L2545, `doStop` L2480, `onConnectionUpdate` L914, `shutdown` L2523
- `shutdown()` · L2523 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L568, `detachSocketListeners` L2500
- `logout()` · L2540
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L2545, `serialize` L591
- `doLogout()` · L2545 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearCredentials` L2571, `clearReconnectTimer` L568, `detachSocketListeners` L2500, `setStatus` L581
  - chamado por: `logout` L2540
- `clearCredentials()` · L2571 · private · async
  - chama: `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133)
  - chamado por: `doLogout` L2545, `onConnectionUpdate` L914

**Funções e constantes de topo**
- `staleVersion()` · L163
  - chamado por: `latestBaileysVersion` L169
- `latestBaileysVersion(logger)` · L169 · async
  - chama: `staleVersion` L163
  - chamado por: `connect` L613
- `contactToRecord(c, source)` · L226
  - chamado por: `onContacts` L2153
- `encodeProto(msg)` · L251
  - chamado por: `emitOutbound` L1771, `forwardTo` L1928, `handleIncomingMedia` L1485, `onMessagesUpsert` L1187, `sendMedia` L1662, `sendText` L1629
- `decodeProto(value)` · L254
  - chamado por: `loadMessageForRetry` L2000, `prepareForward` L1858
- `mapBaileysReaction(key, reaction, ourJid)` · L272
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L299
  - chamado por: `onReactions` L809
- `phoneFirst(a, b)` · L299
  - chamado por: `groupSenderOf` L872, `mapBaileysReaction` L272
- `extOf(mimetype, fileName)` · L304
  - chamado por: `handleIncomingMedia` L1485, `sendMedia` L1662
- `mapAckStatus(status)` · L318
  - chamado por: `onMessagesUpdate` L1301
- `buildMediaContent(input)` · L338
  - chamado por: `sendMedia` L1662
- `resolveParticipantPhone(p, lidToPn)` · L376
  - chamado por: `recordGroupParticipants` L2160, `resolveParticipantNames` L2229, `toGroupInfo` L426
- `dirNameFor(p, phone, names)` · L412
  - chamado por: `toGroupInfo` L426
- `toGroupInfo(md, lidToPn, names)` · L426
  - chama: `dirNameFor` L412, `resolveParticipantPhone` L376
  - chamado por: `createGroup` L2268, `groupInfo` L2260, `listGroups` L2252
- `toChannelInfo(md)` · L459
  - chamado por: `channelInfo` L2416, `createChannel` L2409
- `toGroupJid(jid)` · L470
  - chamado por: `groupInfo` L2260, `groupInviteCode` L2295, `groupMembershipAction` L2316, `groupMembershipRequests` L2304, `groupRevokeInvite` L2298, `leaveGroup` L2286, `setGroupDescription` L2292, `setGroupPhoto` L2355, `setGroupSetting` L2338, `setGroupSubject` L2289, `updateParticipants` L2278
- `toContactJid(jid)` · L473
  - chamado por: `profilePicture` L2379, `removeContact` L2404, `saveContact` L2391, `setBlock` L2388
- `cappingCycleEnd(value)` · L502
  - chamado por: `onMessageCapping` L1363
- `toJid(to)` · L2583
  - chamado por: `forwardTo` L1928, `markRead` L1832, `resolveJid` L1803, `sendPresence` L1808, `sendReaction` L1840

**Tipos**
- interface `BaileysEngineDeps` L82 · 21 propriedade(s)
- type `BaileysVersion` L144
- type `VersionSelection` L147
- type `RawParticipant` L365
- type `RawGroup` L392
- type `RawNewsletter` L402

## `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`

1354 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “forwardableContent (P-068) — o que vai para o generateForwardMessageContent” · L109
  - it “conversation: vai só o nó; a lib troca por extendedTextMessage com o selo 1” · L110
  - it “texto com citação/menções/score 3: citação e menções NÃO vão para o destino; score sobe para 4” · L122
  - it “imagem de GRUPO (SKDM + messageContextInfo + citação): só o imageMessage; selo 1 e nada da citação” · L136
  - it “premissa (lib real): a original INTEIRA vaza a citação e fica sem selo — por isso o recorte” · L154
  - it “ptv com messageContextInfo: o selo fica no ptvMessage (era o bug do Object.keys()[0])” · L161
  - it “forwardingScore da ORIGINAL (4) é o devolvido — a cópia (5) quem calcula é a lib” · L177
- describe “BaileysEngine.prepareForward — mensagem temporária” · L528
  - it “vencida (timestamp + expiration no passado) → FORWARD_UNSUPPORTED, sem enviar” · L542
  - it “ainda dentro do prazo → encaminha (sem a expiration na cópia)” · L554
- describe “BaileysEngine.prepareForward/send (P-068)” · L570
  - it “texto recebido: um nó para o destino, eco único source api com selo, cold e chave” · L571
  - it “o append da própria lib e um notify com o mesmo id NÃO geram segundo evento” · L639
  - it “keyId repetido: linha sem raw antes e com raw depois → usa a que TEM a original” · L651
  - it “imagem de grupo recebida (ciclo completo upsert → raw → encaminhar): só o nó, mesma mídia, mediaKey S3 da ori…” · L664
  - it “mídia sem mimetype/tamanho no proto: o eco completa com os da ForwardSource” · L717
  - it “original NOSSA (fromMe): sai sem selo, como no app (sem force)” · L753
  - it “original com score 4: prepare devolve 4 (o limite de destinos decide por ele); a cópia sai com 5” · L773
  - it “o mesmo prepared para dois destinos: ids distintos e o MESMO selo (a original não é mutada)” · L793
  - it “GIF do GIPHY: o enum sobrevive ao raw (fromObject) e à cópia da lib” · L810
  - it “localização encaminhada: eco com o mesmo texto da recebida (rótulo + link do mapa)” · L828
  - it “sem raw + texto: remonta extendedTextMessage com o texto; selo = score da coluna + 1” · L853
  - it “sem raw + texto nunca encaminhado: selo 1” · L874
  - it “raw ilegível (o fromObject lança) → FORWARD_SOURCE_UNAVAILABLE e log” · L898
  - it “raw de enquete → FORWARD_UNSUPPORTED (enquete), nada enviado” · L913
  - it “sem socket: prepare lança "Sessão não conectada" sem ir ao banco” · L934
  - it “socket cai entre o prepare e o envio: send lança "Sessão não conectada" e não há eco” · L943
- describe “BaileysEngine.loadMessageForRetry — decodeProto com fromObject (E24)” · L954
  - it “GIF GIPHY guardado em raw: o proto do retry, re-encodado, mantém gifAttribution 1 (antes virava 0)” · L955
  - it “fonte do texto (enum FontType) também sobrevive” · L978
- describe “BaileysEngine.onMessagesUpsert — raw das RECEBIDAS (E24)” · L993
  - it “texto recebido (notify): o evento leva raw JSON puro (jsonb) que volta ao proto” · L994
  - it “imagem recebida: o base entregue ao download já tem o raw com a mídia” · L1005
  - it “o raw do evento de mídia é serializado da ORIGINAL na hora de emitir (pega o reupload)” · L1031
  - it “imagem recebida cujo download falha (sem url — nenhuma rede): o evento final mantém o raw” · L1079
- describe “BaileysEngine.onMessagesUpdate — apagada/editada (E24)” · L1155
  - it “REVOKE (message:null + stub): marca revokedAt nas linhas do keyId desta sessão, sem message.ack” · L1158
  - it “EDIT (message.editedMessage): marca editedAt, sem message.ack” · L1173
  - it “a marca só vale do MESMO lado (fromMe da key entra no filtro)” · L1195
  - it “DELIVERY_ACK continua virando message.ack (e não marca nada)” · L1209
  - it “falha do banco ao marcar é logada (warn com err/keyId/field) e não estoura” · L1231
- describe “P-077 — eco de localização e enquete enviadas pela API” · L1280
  - it “sendLocation: texto do eco = formatLocation (rótulo + link do mapa)” · L1281
  - it “sendPoll: texto do eco = formatPoll (pergunta + "• opção"); escolha única = V3” · L1322
  - it “sendPoll múltipla: selectableCount 0 e o mesmo texto” · L1339

## `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`

812 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`
- importa (interno): `modules/messaging/application/reaction-key.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “BaileysEngine.onMessagesUpsert (P-047)” · L78
  - it “lote misto decide por mensagem, preserva remetente de grupo e raw; repetições não emitem” · L79
  - it “após restart, keyId já persistido é barrado antes do webhook” · L144
- describe “BaileysEngine.onMessagesUpsert (P-066)” · L160
  - it “reação do contato no upsert NÃO vira evento message” · L161
  - it “reação NOSSA pelo celular (fromMe) também não — sem handoff falso” · L174
  - it “localização encaminhada sai como message type location com texto e selo” · L192
  - it “texto comum segue igual (fromMe do celular = source phone, não encaminhada)” · L220
  - it “voto do contato numa enquete → message poll_vote (continua contando como resposta)” · L235
  - it “o par LID↔telefone de uma reação ignorada ainda é aprendido (e funde a conversa)” · L248
- describe “BaileysEngine.onReactions — grupo (E22)” · L299
  - it “remetente é QUEM REAGIU (reaction.key.participant), não o autor da mensagem-alvo” · L300
- describe “BaileysEngine.onReactions — endereçamento por TELEFONE (modo PN: o *Alt é o @lid)” · L344
  - it “1:1: remetente e chat saem com o telefone (não o @lid do remoteJidAlt) e o par é aprendido” · L345
  - it “grupo: participant telefone + participantAlt @lid → telefone; a mesma pessoa mantém o senderKey depois de o p…” · L371
  - it “reação NOSSA: o *Alt (pode ser o nosso LID) não é aprendido como par de ninguém” · L407
- describe “BaileysEngine.onMessagesUpsert — mídia em invólucro que a lib não abre (E22)” · L428
  - it “figurinha lottie: o download recebe o conteúdo DESEMBRULHADO, com a key original (reupload)” · L436
  - it “imagem comum: o download recebe a MESMA mensagem (identidade)” · L461
- describe “BaileysEngine.onMessagesUpsert — remetente em grupo (E23 · P-074)” · L483
  - it “modo LID: senderJid = telefone do participant_pn; par aprendido (merge) e gravado no diretório 1× com o pushN…” · L493
  - it “modo PN (participantAlt = @lid): senderJid = TELEFONE — trava a fórmula `participantAlt ?? participant`, que …” · L531
  - it “LID sem Alt e sem par conhecido (número oculto): fica o @lid, sem diretório nem merge” · L553
  - it “aparelho (:NN) some do participant e do participantAlt” · L567
  - it “1:1 inalterado (participant vazio do cleanMessage; @lid com remoteJidAlt)” · L587
  - it “fromMe em grupo (celular): senderJid = a conta, source phone; o *Alt (nosso LID) não é aprendido” · L599
  - it “grupo sem participant: mantém o jid do grupo (comportamento antigo)” · L619
  - it “reação de grupo no upsert (ignorada) ainda ensina o par do participante” · L625
  - it “mídia em grupo: o download recebe o base com o senderJid do participante” · L645
- describe “BaileysEngine.onMessagesUpsert — pushName do participante no diretório (revisão E23)” · L680
  - it “par vindo do diretório (restart) + pushName → grava 1×; repetido → 0×; nome novo → grava de novo” · L700
  - it “sem par NESTA mensagem (só o @lid, telefone pelo cache) → grava o nome no telefone, com o @lid” · L720
  - it “1ª mensagem sem pushName e 2ª com → grava só na 2ª” · L732
  - it “par NOVO sem pushName grava o par; o nome que chega depois também é gravado” · L747
  - it “par aprendido por REAÇÃO (fica só no cache) → a mensagem seguinte grava o nome” · L756
  - it “só telefone (sem @lid na chave) + pushName → grava 1× sem lid” · L779
  - it “@lid sem telefone conhecido → não grava (o contacts.update da lib já guarda o nome no @lid)” · L792
  - it “memória do último nome gravado tem teto (FIFO de 5000): o mais antigo é esquecido” · L798

## `modules/sessions/infrastructure/baileys/baileys.media.spec.ts`

335 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.media.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “BaileysEngine — mídia recebida E10” · L118
  - it “leva o dispatcher da sessão até o fetch real da rc14 e armazena o binário” · L119
  - it “publica os metadados em até 90 s quando o stream responde mas nunca termina” · L149
  - it “falha sem fetch direto quando o proxy da sessão não tem dispatcher suportado” · L184
  - it “falha sem reupload para erro da CDN diferente de 404/410” · L199
  - it “limita a espera do reupload, ignora rejeição tardia e não tenta um segundo fetch” · L262
  - it “o segundo download usa o saldo do teto total de 90 s” · L294

## `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`

201 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “Baileys rc14 — código de pareamento E12” · L76
  - it “recusa WORKING sem alterar credenciais nem chamar o socket” · L77
  - it “recusa creds.me de sessão pareada por QR mesmo com registered=false” · L85
  - it “espera connecting sem sleep fixo, normaliza o número e publica PAIRING_CODE” · L93
  - it “o primeiro QR também libera; timeout e close recusam sem chamar o socket” · L107
- describe “Baileys rc14 — roster LID E12” · L130
  - it “registra phoneNumber do roster, sem lookup local desnecessário” · L131
  - it “prioriza phoneNumber do lote quando o mesmo LID aparece em dois grupos” · L147
  - it “usa apenas lidMapping local quando falta phoneNumber e tira sufixo de device” · L163
  - it “mantém o LID anônimo quando o mapping local não tem PN” · L177
  - it “não usa par aprendido de mensagens como fallback do roster” · L187

## `modules/sessions/infrastructure/baileys/baileys.patch.spec.ts`

129 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.patch.spec.ts`

- describe “patch Baileys rc14 — assinatura e domínio de device” · L12
  - it “aceita assinatura válida e rejeita assinatura de 64 bytes alterada” · L13
  - it “não propaga o domínio hosted para o device seguinte” · L28
- describe “patch Baileys rc14 — stream cifrado sintético” · L55
  - it “decifra a resposta íntegra” · L61
  - it “propaga erro do corpo HTTP após os headers ao consumidor” · L78
  - it “encerra a fonte quando o consumidor cancela o stream” · L108

## `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`

228 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`
- importa (interno): `shared-kernel/process-errors.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “Baileys rc14 — sinais nativos de restrição (E8)” · L73
  - it “ERROR 463 pausa antes da consulta e usa o timeEnforcementEnds retornado” · L74
  - it “connection.update ativo e capping CAPPED são sinais; warning não pausa” · L96
  - it “notificação provisória é substituída pelo prazo confirmado no RPC” · L129
  - it “RPC ativo sem prazo remoto não confirma a data fabricada pela notificação” · L159
  - it “consulta pendurada vence em 3 s; 479 só é contado e ACK normal preservado” · L176
  - it “RPC que responde depois do timeout ainda confirma o prazo sem segurar o ACK” · L191

## `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`

92 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “BaileysEngine — shutdown() vs stop() (P-042: reidratação no deploy stop-first)” · L48
  - it “shutdown() fecha o socket SEM emitir session.status (status persistido fica intacto)” · L49
  - it “stop() (contraste) EMITE session.status STOPPED com erro nulo — o que quebrava a reidratação” · L68
  - it “shutdown() sem socket aberto é no-op seguro (não emite status, não lança)” · L85

## `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`

44 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/browser-fingerprint.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `gateway/test/browser-fingerprint.e2e-spec.ts`

**Funções e constantes de topo**
- `hashString(s)` · L32
  - chamado por: `browserFingerprint` L41
- `browserFingerprint(sessionId)` · L41
  - chama: `hashString` L32
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:613)

**Tipos**
- type `BrowserFingerprint` L13

## `modules/sessions/infrastructure/baileys/disconnect-policy.ts`

80 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/disconnect-policy.ts`
- importa (interno): `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `disconnectDetails(error)` · L12
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:914)
- `classifyDisconnect(code, _reason)` · L29
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:914)

**Tipos**
- type `DisconnectAction` L4

## `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`

102 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/postgres-auth-state.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `gateway/test/session-lease.e2e-spec.ts`

**Funções e constantes de topo**
- `encode(value)` · L12
  - chamado por: `usePostgresAuthState` L21
- `decode(value)` · L15
  - chamado por: `usePostgresAuthState` L21
- `usePostgresAuthState(_prisma, sessionId, lease, authEpoch)` · L21 · async
  - chama: `decode` L15, `encode` L12, `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:613)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/baileys/upsert-decision.spec.ts`

58 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/upsert-decision.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/upsert-decision.ts`

- describe “decisão de messages.upsert (Baileys rc14)” · L16
  - it “aceita notify e append recente por mensagem, inclusive limite de 48 h” · L17
  - it “recusa eco próprio, canais, status e timestamp inválido em append” · L36

## `modules/sessions/infrastructure/baileys/upsert-decision.ts`

36 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/upsert-decision.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/upsert-decision.spec.ts`

**Funções e constantes de topo**
- `OFFLINE_UPSERT_MAX_AGE_SECONDS` = `48 * 60 * 60` · L5
- `shouldAcceptUpsert(message, type, nowSeconds)` · L8
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1187)

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:557), `WWebJSEngine.constructor` (wwebjs.engine.ts:464)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:367)

## `modules/sessions/infrastructure/message-content.spec.ts`

70 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/message-content.spec.ts`
- importa (interno): `modules/sessions/infrastructure/message-content.ts`

- describe “forwarding (selo "Encaminhada")” · L10
  - it “score só quando encaminhada de fato; limita ao integer da coluna” · L11
- describe “formatLocation” · L39
  - it “coordenada 0,0 ou inválida não vira link” · L40
- describe “formatContacts” · L48
  - it “sem displayName usa o FN do vCard; vários TEL” · L49
  - it “vazio → null” · L59
- describe “formatPoll” · L64
  - it “ignora opções vazias; sem nada → null” · L65

## `modules/sessions/infrastructure/message-content.ts`

141 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/message-content.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**Funções e constantes de topo**
- `ignore(reason)` · L33
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `content(type, text, fwd, media)` · L37
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `textOrOther` (baileys-content.ts:403), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `forwarding(isForwarded, score)` · L55
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `clean(text)` · L71
  - chamado por: `join` (baileys-content.ts:95), `str` (baileys-content.ts:91), `content` L37, `formatContacts` L108, `formatEvent` L135, `formatLocation` L83, `formatPoll` L124, `str` (wwebjs-content.ts:72)
- `coord(v)` · L76
  - chamado por: `formatLocation` L83
- `formatLocation(loc)` · L83
  - chama: `clean` L71, `coord` L76
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1717), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1845)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1746), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1879)
- `formatEvent(name, description)` · L135
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)

**Tipos**
- interface `ContentMedia` L14 · 5 propriedade(s)
- type `DescribedMessage` L22

## `modules/sessions/infrastructure/postgres-session-lease.ts`

158 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/postgres-session-lease.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/application/session-lease.error.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `gateway/test/session-lease.e2e-spec.ts`

**class `PostgresSessionLease`** L18
- injeta (construtor): `prisma: PrismaService`
- `owner` · L19 · campo
- `TTL_MS` · L20 · static · campo
- `constructor(prisma)` · L22
  - chamado por: `SessionManager.constructor` (session-manager.service.ts:101)
- `acquire(sessionId)` · L24 · async
  - chamado por: `SessionManager.ensureLease` (session-manager.service.ts:125)
- `renew(sessionId, epoch)` · L39 · async
  - chamado por: `SessionManager.scheduleRenew` (session-manager.service.ts:144)
- `release(sessionId, epoch)` · L48 · async
  - chamado por: `SessionManager.releaseLease` (session-manager.service.ts:228)
- `isCurrent(sessionId, epoch)` · L55 · async
  - chamado por: `SessionManager.ownedWorking` (session-manager.service.ts:1410), `SessionManager.sending` (session-manager.service.ts:1369)
- `fenced(sessionId, epoch, action, timeoutMs)` · L63 · async
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2)
  - chamado por: `SessionManager.purgeAuthDir` (session-manager.service.ts:964), `SessionManager.removeUnlocked` (session-manager.service.ts:1124), `SessionManager.startUnlocked` (session-manager.service.ts:712), `usePostgresAuthState` (postgres-auth-state.ts:21), `clearAuth` L133, `setLastMeJid` L145, `updateLastErrorDetails` L118, `updateStatus` L83, `FencedLocalAuth.beforeBrowserInitialized` (wwebjs.engine.ts:103), `FencedLocalAuth.logout` (wwebjs.engine.ts:111)
- `updateStatus(sessionId, epoch, status, patch)` · L83 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:910), `SessionManager.persistStatus` (session-manager.service.ts:665), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019), `SessionManager.startWithTimeout` (session-manager.service.ts:765), `SessionManager.stopUnlocked` (session-manager.service.ts:866)
  - banco: `waSession.update`
- `updateLastErrorDetails(sessionId, epoch, details)` · L118 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:367)
  - banco: `waSession.update`
- `clearAuth(sessionId, epoch)` · L133 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:910), `SessionManager.newQrUnlocked` (session-manager.service.ts:1099), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019), `BaileysEngine.clearCredentials` (baileys.engine.ts:2571)
  - banco: `waAuthKey.deleteMany`, `waSession.update`
- `setLastMeJid(sessionId, epoch, jid)` · L145 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1019)
  - banco: `waSession.update`

**Tipos**
- interface `SessionFence` L10 · 2 propriedade(s)

## `modules/sessions/infrastructure/prisma-connect-link.repository.ts`

174 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/prisma-connect-link.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/connect-link.ts`, `modules/sessions/domain/connect-link.repository.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `PrismaConnectLinkRepository`** L34 · @Injectable · `implements ConnectLinkRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L36
- `createReplacing(input)` · L38 · async
  - implementa: `ConnectLinkRepository.createReplacing` (connect-link.repository.ts:22)
  - chama: `active` L30
  - banco: `connectLink.create`, `connectLink.deleteMany`, `connectLink.updateMany`
- `findByHash(tokenHash)` · L78
  - implementa: `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23)
  - banco: `connectLink.findUnique`
- `findLatestBySession(sessionId)` · L85
  - implementa: `ConnectLinkRepository.findLatestBySession` (connect-link.repository.ts:24)
  - banco: `connectLink.findFirst`
- `findActiveBySession(sessionId, now)` · L93
  - implementa: `ConnectLinkRepository.findActiveBySession` (connect-link.repository.ts:26)
  - chama: `active` L30
  - banco: `connectLink.findFirst`
- `revokeActive(sessionId, now, reason)` · L104 · async
  - implementa: `ConnectLinkRepository.revokeActive` (connect-link.repository.ts:30)
  - chama: `active` L30
  - banco: `connectLink.updateMany`
- `revoke(id, now, reason)` · L116 · async
  - implementa: `ConnectLinkRepository.revoke` (connect-link.repository.ts:35)
  - banco: `connectLink.updateMany`
- `consume(id, now)` · L128 · async
  - implementa: `ConnectLinkRepository.consume` (connect-link.repository.ts:41)
  - chama: `active` L30
  - banco: `connectLink.updateMany`
- `reserveNewQr(id, now, max, cooldownMs)` · L136 · async
  - implementa: `ConnectLinkRepository.reserveNewQr` (connect-link.repository.ts:44)
  - chama: `active` L30
  - banco: `connectLink.updateMany`
- `touchSeen(id, now)` · L159 · async
  - implementa: `ConnectLinkRepository.touchSeen` (connect-link.repository.ts:50)
  - banco: `connectLink.updateMany`
- `hasWorkingSince(sessionId, since)` · L166 · async
  - implementa: `ConnectLinkRepository.hasWorkingSince` (connect-link.repository.ts:53)
  - banco: `waSessionEvent.findFirst`

**Funções e constantes de topo**
- `active(now)` · L30
  - chamado por: `consume` L128, `createReplacing` L38, `findActiveBySession` L93, `reserveNewQr` L136, `revokeActive` L104

## `modules/sessions/infrastructure/prisma-session.repository.ts`

196 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/prisma-session.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`
- importado por: `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`

**class `PrismaSessionRepository`** L36 · @Injectable · `implements SessionRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L38
- `toDomain(r)` · L40 · private
  - chama: `Session.constructor` (session.entity.ts:9), `parseErrorDetails` L28
  - chamado por: `create` L58, `findAutostart` L178, `findById` L72, `findByName` L77, `list` L82
- `create(input)` · L58 · async
  - implementa: `SessionRepository.create` (session.repository.ts:32)
  - chama: `toDomain` L40
  - banco: `waSession.create`
- `findById(id)` · L72 · async
  - implementa: `SessionRepository.findById` (session.repository.ts:33)
  - chama: `toDomain` L40
  - banco: `waSession.findUnique`
- `findByName(name)` · L77 · async
  - implementa: `SessionRepository.findByName` (session.repository.ts:34)
  - chama: `toDomain` L40
  - banco: `waSession.findUnique`
- `list()` · L82 · async
  - implementa: `SessionRepository.list` (session.repository.ts:35)
  - chama: `toDomain` L40
  - banco: `waSession.findMany`
- `updateStatus(id, status, patch)` · L89 · async
  - implementa: `SessionRepository.updateStatus` (session.repository.ts:38)
  - banco: `waSession.updateMany`
- `updateLastErrorDetails(id, details)` · L127 · async
  - implementa: `SessionRepository.updateLastErrorDetails` (session.repository.ts:44)
  - banco: `waSession.updateMany`
- `delete(id)` · L140 · async
  - implementa: `SessionRepository.delete` (session.repository.ts:48)
  - banco: `waSession.delete`
- `findConnectSnapshot(id)` · L144 · async
  - implementa: `SessionRepository.findConnectSnapshot` (session.repository.ts:50)
- `setLastMeJid(id, jid)` · L171 · async
  - implementa: `SessionRepository.setLastMeJid` (session.repository.ts:53)
  - banco: `waSession.updateMany`
- `findAutostart()` · L178 · async
  - implementa: `SessionRepository.findAutostart` (session.repository.ts:49)
  - chama: `toDomain` L40
  - banco: `waSession.findMany`

**Funções e constantes de topo**
- `parseErrorDetails(value)` · L28
  - chamado por: `toDomain` L40

**Tipos**
- interface `Row` L12 · 13 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`

278 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`

- describe “describeWwebjsMessage — tipos visíveis (P-066)” · L108
  - it “mídia é decidida pelo TYPE: imagem sem directPath (hasMedia false) segue imagem, sem o body cru” · L117
- describe “describeWwebjsMessage — sistema/reação/ligação não são mensagem” · L133
- describe “describeWwebjsMessage — selo "Encaminhada"” · L149
  - it “isForwarded + forwardingScore” · L150
  - it “isForwarded ausente (undefined na lib) e score 0 → false/null” · L160
- describe “mapWwebjsReaction (E22 — defensivo contra o rename `_serialized` → `$1`)” · L167
  - it “chave-alvo com _serialized e remote string → payload com timestamp inteiro” · L175
  - it “chave-alvo só com $1 (builds ≥ 2.3000.104x) → não descarta” · L194
  - it “remote como Wid ({_serialized}) → não lança” · L203
  - it “removida = emoji vazio; reação nossa = fromMe” · L215
  - it “sem chave-alvo ou status@broadcast → null” · L225
- describe “wwebjsGroupSender (E23 · P-074)” · L238
  - it “author @c.us (string ou Wid) → o próprio author” · L242
  - it “@lid com par no cache → telefone @c.us; sem par → fica o @lid” · L251
  - it “sufixo de aparelho (:NN@) sai antes do cache” · L260
  - it “fora de grupo ou sem author → null (o chamador mantém o chatJid)” · L269

## `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`

308 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

**Funções e constantes de topo**
- `IGNORED` = `new Set([ 'revoked', 'reaction', 'protocol', 'ciphertext', 'gp2', 'e2…` · L44
- `str(v)` · L72
  - chama: `clean` (message-content.ts:71)
  - chamado por: `describeWwebjsMessage` L78
- `describeWwebjsMessage(msg)` · L78
  - chama: `content` (message-content.ts:37), `formatContacts` (message-content.ts:108), `formatEvent` (message-content.ts:135), `formatLocation` (message-content.ts:83), `formatPoll` (message-content.ts:124), `forwarding` (message-content.ts:55), `ignore` (message-content.ts:33), `str` L72
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2181), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1982), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2926)
- `FORWARDABLE_TYPES` = `new Set([ 'chat', 'image', 'video', 'ptv', 'audio', 'ptt', 'document'…` · L190
- `wwebjsForwardBlock(msg)` · L210
  - chamado por: `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1982)
- `serializedOf(k)` · L248
  - chamado por: `jidOf` L257, `mapWwebjsReaction` L285
- `jidOf(v)` · L257
  - chama: `serializedOf` L248
  - chamado por: `mapWwebjsReaction` L285, `wwebjsGroupSender` L269
- `wwebjsGroupSender(chatRaw, author, lidToPn)` · L269
  - chama: `jidOf` L257
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2181), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2926)
- `mapWwebjsReaction(r)` · L285
  - chama: `jidOf` L257, `serializedOf` L248
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:2455)

**Tipos**
- interface `WwebjsMessageLike` L17 · 15 propriedade(s)
- interface `WwebjsForwardLike` L204 · 2 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`

63 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`

- describe “fila e stream de mídia WWEBJS (P-060)” · L5
  - it “serializa operações e recusa fila cheia sem iniciar o terceiro download” · L6
  - it “recompõe blocos e destrói stream que ultrapassa o teto real” · L31
  - it “não inicia download que expirou enquanto aguardava a fila” · L43

## `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`

75 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**class `SessionMediaQueue`** L5
- injeta (construtor): `maxPending: ?`
- `tail` · L6 · private · campo
- `pending` · L7 · private · campo
- `constructor(maxPending)` · L9
  - chamado por: `WWebJSEngine.mediaQueue` (wwebjs.engine.ts:434)
- `run(task, signal)` · L11
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2265), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1752)

**class `MediaDeadlineError`** L33 · `extends Error`
- injeta (construtor): `ms: number (param)`
- `constructor(ms)` · L34
  - chamado por: `mediaDeadline` L59

**Funções e constantes de topo**
- `collectMediaStream(stream, maxBytes)` · L39 · async
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2265)
- `mediaDeadline(work, ms)` · L59 · async
  - chama: `constructor` L34
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2265), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1752)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

3345 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/application/session-lease.error.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`, `modules/sessions/infrastructure/message-content.ts`, `shared-kernel/memory.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/wwebjs-version.ts`
- importado por: `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `FencedLocalAuth`** L91 · `extends LocalAuth`
- injeta (construtor): `sessionId: string (param)` · `lease: NonNullable<BaileysEngineDeps['lease']>` · `epoch: bigint` · `isCurrentClient: () => boolean` · `mayInitialize: () => boolean` · `onLogout: () => void`
- `constructor(sessionId, lease, epoch, isCurrentClient, mayInitialize, on…)` · L92
  - chamado por: `doStart` L772
- `beforeBrowserInitialized()` · L103 · async
  - chama: `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)
- `logout()` · L111 · async
  - chama: `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `detachAuthDir` L742, `purgeDetachedAuthDir` L754

**class `WWebJSEngine`** L395 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L396 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L397 · private · campo
- `logoutPending` · L398 · private · campo
- `logoutAttempted` · L399 · private · campo
- `status` · L400 · private · campo
- `qrBase64` · L401 · private · campo
- `stopped` · L402 · private · campo
- `lidToPnCache` · L405 · private · campo
- `pnToLidOutbound` · L409 · private · campo
- `sentByPanel` · L412 · private · campo
- `forwardEchoes` · L414 · private · campo
  - chama: `ForwardEchoRegistry.constructor` (wwebjs.forward-echo.ts:51)
- `forwardEchoWaitMs` · L416 · private · campo
- `forwardEchoTtlMs` · L417 · private · campo
- `forwardEchoGraceMs` · L418 · private · campo
- `forwardOpTimeoutMs` · L419 · private · campo
- `anonProxyUrl` · L422 · private · campo
- `lifecycle` · L429 · private · campo
- `reconnectAttempts` · L431 · private · campo
- `pairingRenewals` · L432 · private · campo
- `pageHeals` · L433 · private · campo
- `mediaQueue` · L434 · private · campo
  - chama: `SessionMediaQueue.constructor` (wwebjs-media.ts:9)
- `autoDownloadGroupMedia` · L435 · private · campo
- `addressBookSynced` · L436 · private · campo
- `lastLoadingPct` · L441 · private · campo
- `logoutTimeoutMs` · L444 · private · campo
- `destroyTimeoutMs` · L448 · private · campo
- `generation` · L452 · private · campo
- `lastQrAt` · L454 · private · campo
- `qrHeals` · L456 · private · campo
- `qrWatchdogIntervalMs` · L458 · private · campo
- `qrStaleMs` · L459 · private · campo
- `initTimeoutMs` · L460 · private · campo
- `lastPairingCode` · L462 · private · campo
- `constructor(deps)` · L464
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L468 · private
  - chamado por: `doStart` L772, `handleDisconnect` L1367, `healWedgedPage` L2839, `logout` L1640, `qrWatchdogTick` L589, `start` L758, `stop` L1571
- `getStatus()` · L477
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
- `getQrBase64()` · L480
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `getPairingCode()` · L483
  - implementa: `IEngine.getPairingCode` (engine.port.ts:382)
- `setStatus(status, extra)` · L487 · private
  - chama: `startQrWatchdog` L574, `startSyncWatchdog` L646, `stopMemoryProfile` L525, `stopQrWatchdog` L584, `stopSyncWatchdog` L657
  - chamado por: `doLogout` L1645, `doStart` L772, `doStop` L1578, `handleDisconnect` L1367, `handleInitFailure` L1254, `healWedgedPage` L2839, `qrWatchdogTick` L589, `requestPairingCode` L1708, `syncWatchdogTick` L664
- `startMemoryProfile(client)` · L511 · private
  - chama: `recordMemoryProfile` L530
  - chamado por: `doStart` L772
- `stopMemoryProfile()` · L525 · private
  - chamado por: `destroyWithTimeout` L1474, `setStatus` L487, `shutdown` L1611
- `recordMemoryProfile(client)` · L530 · private · async
  - chama: `chromiumTreePss` (memory.ts:43)
  - chamado por: `startMemoryProfile` L511
- `startQrWatchdog()` · L574 · private
  - chama: `qrWatchdogTick` L589
  - chamado por: `setStatus` L487
- `stopQrWatchdog()` · L584 · private
  - chamado por: `qrWatchdogTick` L589, `setStatus` L487
- `qrWatchdogTick()` · L589 · private · async
  - chama: `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `doStart` L772, `serialize` L468, `setStatus` L487, `stopQrWatchdog` L584
  - chamado por: `startQrWatchdog` L574
- `watchdogFails` · L641 · private · campo
- `watchdogDegraded` · L642 · private · campo
- `WATCHDOG_INTERVAL_MS` · L643 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L644 · private · static · campo
- `startSyncWatchdog()` · L646 · private
  - chama: `syncWatchdogTick` L664
  - chamado por: `setStatus` L487
- `stopSyncWatchdog()` · L657 · private
  - chamado por: `setStatus` L487, `shutdown` L1611
- `syncWatchdogTick()` · L664 · private · async
  - chama: `isPageCrashError` L157, `raceStoreOp` L368, `healWedgedPage` L2839, `setStatus` L487, `syncHint` L2824
  - chamado por: `startSyncWatchdog` L646
- `clearStaleSingletonLocks()` · L726 · private · async
  - chama: `authDirOf` L266
  - chamado por: `doStart` L772
- `detachAuthDir(sessionId)` · L742 · static
  - chama: `authDirOf` L266
  - chamado por: `SessionManager.purgeAuthDir` (session-manager.service.ts:964), `SessionManager.removeUnlocked` (session-manager.service.ts:1124), `logout` L111
- `purgeDetachedAuthDir(detached)` · L754 · static · async
  - chamado por: `SessionManager.purgeAuthDir` (session-manager.service.ts:964), `SessionManager.removeUnlocked` (session-manager.service.ts:1124), `logout` L111
- `start()` · L758
  - implementa: `IEngine.start` (engine.port.ts:329)
  - chama: `doStart` L772, `serialize` L468
- `doStart(attempt, forceLive)` · L772 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2), `buildAuthProxyUrl` L252, `constructor` L92, `raceStoreOp` L368, `userAgentFor` L181, `checkPinnedBuildAge` L1127, `clearStaleSingletonLocks` L726, `closeAnonProxy` L1456, `consumeCleanShutdownMarker` L1541, `destroyWithTimeout` L1474, `ensureWebVersionHtml` L1173, `handleDisconnect` L1367, `handleInitFailure` L1254, `mergeExistingLids` L2660, `onMessageAck` L2431, `onMessageCreate` L2181, `onReaction` L2455, `resolveWebVersion` L1207, `serialize` L468, `setStatus` L487, `startMemoryProfile` L511, `syncAddressBook` L2688
  - chamado por: `handleDisconnect` L1367, `handleInitFailure` L1254, `qrWatchdogTick` L589, `start` L758
- `checkPinnedBuildAge(version)` · L1127 · private · async
  - chama: `loadBuildCatalog` L272
  - chamado por: `doStart` L772
- `ensureWebVersionHtml(version)` · L1173 · private · async
  - chamado por: `doStart` L772
- `resolveWebVersion(mode, forceLive)` · L1207 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2)
  - chamado por: `doStart` L772
- `handleInitFailure(e, attempt, pinnedVersion)` · L1254 · private · async
  - chama: `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `doStart` L772, `setStatus` L487
  - chamado por: `doStart` L772
- `handleDisconnect(reason)` · L1367 · private · async
  - chama: `raceStoreOp` L368, `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `doStart` L772, `serialize` L468, `setStatus` L487
  - chamado por: `doStart` L772
- `closeAnonProxy()` · L1456 · private · async
  - chamado por: `doLogout` L1645, `doStart` L772, `doStop` L1578, `handleDisconnect` L1367, `handleInitFailure` L1254, `healWedgedPage` L2839, `qrWatchdogTick` L589, `shutdown` L1611
- `destroyWithTimeout()` · L1474 · private · async
  - chama: `stopMemoryProfile` L525, `chromiumProcessTree` (memory.ts:17)
  - chamado por: `doLogout` L1645, `doStart` L772, `doStop` L1578, `handleDisconnect` L1367, `handleInitFailure` L1254, `healWedgedPage` L2839, `qrWatchdogTick` L589, `shutdown` L1611
- `markCleanShutdown()` · L1524 · private · async
  - chama: `authDirOf` L266
  - chamado por: `doStop` L1578, `shutdown` L1611
- `consumeCleanShutdownMarker()` · L1541 · private · async
  - chama: `authDirOf` L266
  - chamado por: `doStart` L772
- `stop()` · L1571
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L1578, `serialize` L468
- `doStop()` · L1578 · private · async
  - chama: `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `markCleanShutdown` L1524, `setStatus` L487
  - chamado por: `stop` L1571
- `shutdown()` · L1611 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `markCleanShutdown` L1524, `stopMemoryProfile` L525, `stopSyncWatchdog` L657
- `logout()` · L1640
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L1645, `serialize` L468
- `doLogout()` · L1645 · private · async
  - chama: `raceStoreOp` L368, `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `setStatus` L487
  - chamado por: `logout` L1640
- `requestPairingCode(phoneNumber)` · L1708 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `req` L2732, `setStatus` L487
- `sendText(to, text, opts)` · L1722 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `assertPageResponsive` L2797, `rememberPanel` L2469, `req` L2732, `toChatId` L2727, `toMentionIds` L2172, `withLidFallback` L2564
- `sendMedia(to, input)` · L1752 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `PendingMediaSendError.constructor` (engine.port.ts:24), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `sendMediaQueued` L1771
- `sendMediaQueued(to, input)` · L1771 · private · async
  - chama: `extOf` L203, `assertPageResponsive` L2797, `rememberPanel` L2469, `req` L2732, `toChatId` L2727, `toMentionIds` L2172, `withLidFallback` L2564
  - chamado por: `sendMedia` L1752
- `sendLocation(to, input)` · L1845 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2797, `emitOutbound` L1909, `rememberPanel` L2469, `req` L2732, `toChatId` L2727, `withLidFallback` L2564
- `sendPoll(to, input)` · L1879 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2797, `emitOutbound` L1909, `rememberPanel` L2469, `req` L2732, `toChatId` L2727, `withLidFallback` L2564
- `emitOutbound(keyId, jid, type, text, opts)` · L1909 · private
  - chamado por: `sendLocation` L1845, `sendPoll` L1879
- `setProfileStatus(status)` · L1931 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `req` L2732
- `setProfileName(name)` · L1934 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `req` L2732
- `setProfilePhoto(image, mimetype)` · L1937 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `req` L2732
- `sendPresence(to, state)` · L1942 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `req` L2732, `toChatId` L2727, `withLidFallback` L2564
- `markRead(chatJid, _msgId)` · L1960 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `req` L2732, `toChatId` L2727, `withLidFallback` L2564
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1969 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `req` L2732, `withStoreReady` L2749
- `prepareForward(src)` · L1982 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2797, `forwardTo` L2019, `req` L2732, `withStoreReady` L2749
- `forwardTo(msg, type, text, src, to, opts)` · L2019 · private · async
  - chama: `assertPageResponsive` L2797, `req` L2732, `toChatId` L2727, `withLidFallback` L2564, `ForwardEchoRegistry.expect` (wwebjs.forward-echo.ts:60)
  - chamado por: `prepareForward` L1982
- `matchForwardEcho(msg, d, keyId)` · L2107 · private
  - chama: `ForwardEchoRegistry.match` (wwebjs.forward-echo.ts:103)
  - chamado por: `onMessageCreate` L2181
- `emitForwardEcho(msg, d, keyId, echo)` · L2127 · private
  - chama: `handleIncomingMedia` L2265, `rememberPanel` L2469
  - chamado por: `onMessageCreate` L2181
- `toMentionIds(mentions)` · L2172 · private
  - chama: `toChatId` L2727
  - chamado por: `sendMediaQueued` L1771, `sendText` L1722
- `onMessageCreate(msg)` · L2181 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L218, `emitForwardEcho` L2127, `handleIncomingMedia` L2265, `matchForwardEcho` L2107, `resolveNumberJid` L2480
  - chamado por: `doStart` L772
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L2265 · private · async
  - chama: `collectMediaStream` (wwebjs-media.ts:39), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `extOf` L203, `isPageCrashError` L157, `mapInboundMediaType` L218, `healWedgedPage` L2839
  - chamado por: `emitForwardEcho` L2127, `onMessageCreate` L2181
- `mapAck(ack)` · L2417 · private
  - chamado por: `onMessageAck` L2431
- `onMessageAck(msg, ack)` · L2431 · private
  - chama: `mapAck` L2417
  - chamado por: `doStart` L772
- `onReaction(r)` · L2455 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:285), `resolveNumberJid` L2480
  - chamado por: `doStart` L772
- `rememberPanel(keyId)` · L2469 · private
  - chamado por: `emitForwardEcho` L2127, `sendLocation` L1845, `sendMediaQueued` L1771, `sendPoll` L1879, `sendText` L1722
- `resolveNumberJid(rawId)` · L2480 · private · async
  - chama: `cacheLidPn` L2501, `mergeLidMessages` L2636, `resolveLidToPhone` L2512
  - chamado por: `mergeExistingLids` L2660, `onMessageCreate` L2181, `onReaction` L2455, `toHistoryMessage` L2926
- `cacheLidPn(lid, phoneJid)` · L2501 · private
  - chamado por: `rememberOutboundLid` L2613, `resolveNumberJid` L2480, `resolvePendingLids` L3117
- `resolveLidToPhone(lid)` · L2512 · private · async
  - chamado por: `resolveNumberJid` L2480, `resolvePendingLids` L3117
- `withLidFallback(pnJid, op)` · L2564 · private · async
  - chama: `rememberOutboundLid` L2613, `resolvePhoneToLid` L2588, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `forwardTo` L2019, `markRead` L1960, `sendLocation` L1845, `sendMediaQueued` L1771, `sendPoll` L1879, `sendPresence` L1942, `sendText` L1722
- `resolvePhoneToLid(phoneJid)` · L2588 · private · async
  - chamado por: `withLidFallback` L2564
- `rememberOutboundLid(pnJid, lid)` · L2613 · private
  - chama: `cacheLidPn` L2501
  - chamado por: `withLidFallback` L2564
- `mergeLidMessages(lid, phoneJid)` · L2636 · private · async
  - chamado por: `resolveNumberJid` L2480
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2660 · private · async
  - chama: `resolveNumberJid` L2480
  - chamado por: `doStart` L772
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2688 · private · async
  - chama: `req` L2732, `withStoreReady` L2749
  - chamado por: `doStart` L772
- `toChatId(to)` · L2727 · private
  - chamado por: `createGroup` L3153, `fetchChatHistory` L2908, `forwardTo` L2019, `groupMembershipAction` L3223, `markRead` L1960, `profilePicture` L3271, `sendLocation` L1845, `sendMediaQueued` L1771, `sendPoll` L1879, `sendPresence` L1942, `sendText` L1722, `setBlock` L3282, `setChatFlag` L2963, `toMentionIds` L2172, `updateParticipants` L3168
- `req()` · L2732 · private
  - chamado por: `channelInfo` L3324, `checkNumbers` L3260, `createChannel` L3306, `createGroup` L3153, `fetchChatHistory` L2908, `followChannel` L3337, `forwardTo` L2019, `getGroupChat` L3010, `listChats` L2888, `listGroups` L2991, `markRead` L1960, `prepareForward` L1982, `profilePicture` L3271, `removeContact` L3301, `requestPairingCode` L1708, `resolvePendingLids` L3117, `saveContact` L3290, `sendLocation` L1845, `sendMediaQueued` L1771, `sendPoll` L1879, `sendPresence` L1942, `sendReaction` L1969, `sendText` L1722, `setBlock` L3282, `setChatFlag` L2963, `setProfileName` L1934, `setProfilePhoto` L1937, `setProfileStatus` L1931, `syncAddressBook` L2688, `unfollowChannel` L3341
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2749 · private · async
  - chama: `isPageCrashError` L157, `raceStoreOp` L368, `assertPageResponsive` L2797, `healWedgedPage` L2839, `syncHint` L2824
  - chamado por: `channelInfo` L3324, `checkNumbers` L3260, `createChannel` L3306, `createGroup` L3153, `fetchChatHistory` L2908, `followChannel` L3337, `getGroupChat` L3010, `listChats` L2888, `listGroups` L2991, `prepareForward` L1982, `profilePicture` L3271, `removeContact` L3301, `saveContact` L3290, `sendReaction` L1969, `setBlock` L3282, `setChatFlag` L2963, `syncAddressBook` L2688, `unfollowChannel` L3341
- `assertPageResponsive(probeTimeoutMs)` · L2797 · private · async
  - chama: `isPageCrashError` L157, `raceStoreOp` L368, `healWedgedPage` L2839, `syncHint` L2824
  - chamado por: `forwardTo` L2019, `prepareForward` L1982, `sendLocation` L1845, `sendMediaQueued` L1771, `sendPoll` L1879, `sendText` L1722, `withStoreReady` L2749
- `syncHint()` · L2824 · private
  - chamado por: `assertPageResponsive` L2797, `syncWatchdogTick` L664, `withStoreReady` L2749
- `lastHealAt` · L2835 · private · campo
- `healing` · L2836 · private · campo
- `HEAL_COOLDOWN_MS` · L2837 · private · static · campo
- `healWedgedPage()` · L2839 · private · async
  - chama: `closeAnonProxy` L1456, `destroyWithTimeout` L1474, `serialize` L468, `setStatus` L487
  - chamado por: `assertPageResponsive` L2797, `handleIncomingMedia` L2265, `syncWatchdogTick` L664, `withStoreReady` L2749
- `listChats(limit)` · L2888 · async
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `req` L2732, `withStoreReady` L2749
- `fetchChatHistory(chatJid, limit)` · L2908 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `req` L2732, `toChatId` L2727, `toHistoryMessage` L2926, `withStoreReady` L2749
- `toHistoryMessage(msg)` · L2926 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L218, `resolveNumberJid` L2480
  - chamado por: `fetchChatHistory` L2908
- `setChatFlag(chatJid, flag, enabled)` · L2963 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `req` L2732, `toChatId` L2727, `withStoreReady` L2749
- `listGroups()` · L2991 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `groupFlags` L237, `req` L2732, `withStoreReady` L2749
- `getGroupChat(jid)` · L3010 · private · async
  - chama: `req` L2732, `toGroupId` L3149, `withStoreReady` L2749
  - chamado por: `groupInfo` L3019, `groupInviteCode` L3193, `groupMembershipAction` L3223, `groupMembershipRequests` L3205, `groupRevokeInvite` L3197, `leaveGroup` L3181, `setGroupDescription` L3189, `setGroupPhoto` L3249, `setGroupSetting` L3238, `setGroupSubject` L3185, `updateParticipants` L3168
- `groupInfo(jid)` · L3019 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
  - chama: `groupFlags` L237, `getGroupChat` L3010, `resolveParticipantsBatch` L3047
  - chamado por: `createGroup` L3153
- `LID_BATCH` · L3036 · private · static · campo
- `resolveParticipantsBatch(list)` · L3047 · private · async
  - chama: `resolvePendingLids` L3117
  - chamado por: `groupInfo` L3019
- `resolvePendingLids(rows)` · L3117 · private · async
  - chama: `cacheLidPn` L2501, `req` L2732, `resolveLidToPhone` L2512
  - chamado por: `resolveParticipantsBatch` L3047
- `toGroupId(jid)` · L3149 · private
  - chamado por: `getGroupChat` L3010
- `createGroup(subject, participants)` · L3153 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `groupInfo` L3019, `req` L2732, `toChatId` L2727, `withStoreReady` L2749
- `updateParticipants(jid, action, participants)` · L3168 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `getGroupChat` L3010, `toChatId` L2727
- `leaveGroup(jid)` · L3181 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `getGroupChat` L3010
- `setGroupSubject(jid, subject)` · L3185 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `getGroupChat` L3010
- `setGroupDescription(jid, description)` · L3189 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `getGroupChat` L3010
- `groupInviteCode(jid)` · L3193 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `getGroupChat` L3010
- `groupRevokeInvite(jid)` · L3197 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `getGroupChat` L3010
- `groupMembershipRequests(jid)` · L3205 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `getGroupChat` L3010
- `groupMembershipAction(jid, action, participants)` · L3223 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `getGroupChat` L3010, `toChatId` L2727
- `setGroupSetting(jid, setting, enabled)` · L3238 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `getGroupChat` L3010
- `setGroupPhoto(jid, image, mimetype)` · L3249 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `getGroupChat` L3010
- `checkNumbers(numbers)` · L3260 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `req` L2732, `withStoreReady` L2749
- `profilePicture(jid)` · L3271 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `req` L2732, `toChatId` L2727, `withStoreReady` L2749
- `setBlock(jid, action)` · L3282 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `req` L2732, `toChatId` L2727, `withStoreReady` L2749
- `saveContact(jid, input)` · L3290 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `req` L2732, `withStoreReady` L2749
- `removeContact(jid)` · L3301 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `req` L2732, `withStoreReady` L2749
- `createChannel(name, description)` · L3306 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `req` L2732, `withStoreReady` L2749
- `channelInfo(jid)` · L3324 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `req` L2732, `withStoreReady` L2749
- `followChannel(jid)` · L3337 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `req` L2732, `withStoreReady` L2749
- `unfollowChannel(jid)` · L3341 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
  - chama: `req` L2732, `withStoreReady` L2749

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L153
- `isPageCrashError(message)` · L157
  - chamado por: `assertPageResponsive` L2797, `handleIncomingMedia` L2265, `syncWatchdogTick` L664, `withStoreReady` L2749
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L165
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` = `/^(true|1|yes|on)$/i.test( process.env.WWEBJS_AUTO_DOWNLOAD_GROUP_MED…` · L170
  - env: `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA`
- `userAgentFor(sessionId)` · L181
  - chamado por: `doStart` L772
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L203
  - chamado por: `handleIncomingMedia` L2265, `sendMediaQueued` L1771
- `mapInboundMediaType(t)` · L218
  - chamado por: `handleIncomingMedia` L2265, `onMessageCreate` L2181, `toHistoryMessage` L2926
- `groupFlags(g)` · L237
  - chamado por: `groupInfo` L3019, `listGroups` L2991
- `buildAuthProxyUrl(server, username, password)` · L252
  - chamado por: `doStart` L772
- `authDirOf(sessionId)` · L266
  - chamado por: `clearStaleSingletonLocks` L726, `consumeCleanShutdownMarker` L1541, `detachAuthDir` L742, `markCleanShutdown` L1524
- `loadBuildCatalog()` · L272 · async
  - chamado por: `checkPinnedBuildAge` L1127
- `WWEBJS_MSG_ID` = `/^(true|false)_[^_]+_[^_]+(_[^_]+)?$/` · L323
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L334
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L362
- `raceStoreOp(op, ms, timeoutMsg)` · L368 · async
  - chamado por: `assertPageResponsive` L2797, `doLogout` L1645, `doStart` L772, `handleDisconnect` L1367, `syncWatchdogTick` L664, `withStoreReady` L2749

**Tipos**
- interface `BuildCatalogEntry` L345 · 3 propriedade(s)
- interface `BuildCatalog` L350 · 3 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`

136 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

**class `ForwardEchoRegistry`** L48
- injeta (construtor): `now: () => number`
- `pending` · L49 · private · campo
- `constructor(now)` · L51
  - chamado por: `WWebJSEngine.forwardEchoes` (wwebjs.engine.ts:414)
- `size()` · L53 · getter
- `expect(input, ttlMs)` · L60
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.forwardTo` (wwebjs.engine.ts:2019)
- `match(tos, type, text, keyId, fwd)` · L103
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.matchForwardEcho` (wwebjs.engine.ts:2107)
- `sweep()` · L126 · private
  - chamado por: `expect` L60, `match` L103

**Tipos**
- interface `ForwardEchoMedia` L20 · 5 propriedade(s)
- interface `ForwardEcho` L28 · 10 propriedade(s)
- interface `Pending` L43 · 2 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

906 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

- describe “ForwardEchoRegistry (correlação do eco — P-068)” · L172
  - it “casa o MAIS ANTIGO compatível (FIFO) e só com chat E tipo iguais” · L182
  - it “chat diferente ou tipo diferente → null e a expectativa continua (o celular não é engolido)” · L198
  - it “match preenche keyId/isForwarded/forwardingScore no MESMO objeto que o forwardTo lê” · L206
  - it “chat acrescentado depois do expect (o @lid do reroteio) também casa” · L225
  - it “expectativa de TEXTO só casa com o mesmo texto; sem texto (mídia) casa por chat + tipo” · L235
  - it “casa por QUALQUER uma das formas do destino (to cru @lid + o telefone do cache)” · L250
  - it “vencida (now injetado) é varrida: match → null, size 0 e o wait resolve null SEM esperar o timeout” · L257
  - it “o próprio expect varre as vencidas (sem match no meio)” · L269
  - it “cancel remove e o wait resolve null na hora” · L279
  - describe “wait (timers falsos)” · L290
    - it “null no timeout, a expectativa SEGUE viva; um match depois resolve o próximo wait com o keyId” · L294
- describe “wwebjsForwardBlock (o que o gateway recusa ANTES de encaminhar)” · L316
- describe “WWebJSEngine.prepareForward (carrega e confere a original UMA vez)” · L394
  - it “keyId fora do formato do WhatsApp Web (gravado pelo Baileys) → SOURCE_UNAVAILABLE sem chamar getMessageById” · L404
  - it “keyId de grupo (4 partes, com o autor) passa no formato e vai ao aparelho” · L413
  - it “original fora do aparelho (getMessageById → null) → SOURCE_UNAVAILABLE” · L420
  - it “devolve o forwardingScore VIVO da original (o do banco pode ser null) e não encaminha nada ainda” · L444
  - it “sessão sem client → erro de sessão, não ForwardSourceError” · L454
- describe “WWebJSEngine.forwardTo + eco no message_create (P-068)” · L465
  - it “eco DENTRO do forward → UM evento api com cold/chave do pedido, SendResult confirmado; nada de phone depois d…” · L469
  - it “controle: fromMe de OUTRO chat durante o encaminhar e do MESMO chat depois do eco consumido seguem phone (o h…” · L519
  - it “eco depois da espera (forwardEchoWaitMs curto) mas dentro do TTL → confirmed:false sem id; o eco tardio ainda…” · L553
  - it “sem eco na espera: resultado sem isForwarded e a expectativa vive só o grace (depois, celular = phone)” · L586
  - it “eco de mídia com a original SEM binário (mediaKey null) → baixa a da cópia pelo caminho normal, com cold/chav…” · L603
  - it “eco depois do TTL → a expectativa morreu: sai phone (não segura o handoff para sempre)” · L632
  - it “sendText da API no mesmo chat com a expectativa viva não é confundido com o eco do encaminhar” · L645
  - it “mídia: eco image sai com o mediaKey/mimetype/fileSize da ORIGINAL, sem downloadMedia; texto do celular no mes…” · L683
  - it “LID memorizado: forward UMA vez com o @lid (o op devolve o destino) e o eco com to @lid casa” · L747
  - it “eco com `to` @lid que a engine JÁ conhece como o destino (lidToPnCache) também é o encaminhar — não phone” · L779
  - it “forward rejeita → erro sobe e a expectativa é cancelada (fromMe seguinte no mesmo chat vira phone)” · L799
  - it “forward que não responde → erro "não respondeu" no teto; a expectativa segue viva e o eco tardio sai api” · L818
- describe “P-077 — eco de localização/enquete com o texto da RECEBIDA” · L848
  - it “sendLocation: texto = formatLocation (rótulo + link), igual ao da localização recebida” · L849
  - it “sendLocation sem rótulo: só o link (antes o eco saía com text null)” · L876
  - it “sendPoll: texto = formatPoll (pergunta + "• opção"), igual ao da enquete recebida” · L883

## `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`

398 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

- describe “WWebJSEngine.onMessageCreate (P-066)” · L62
  - it “envio WWEBJS acima de 24 MB recusa antes de codificar/chamar o client” · L63
  - it “tipo de sistema DO CELULAR (fromMe) sai na hora, sem evento (não espera 3 s nem vira handoff)” · L78
  - it “localização sai com type location e o texto do cartão (nunca o body de miniatura)” · L86
  - it “imagem sem arquivo (hasMedia false): não chama downloadMedia, emite só os metadados” · L115
  - it “tipo sem cartão de mídia COM arquivo (produto): baixa como documento e mantém type other” · L136
  - it “mídia 1:1 usa stream em blocos de 2 MB e mantém mediaKey no evento” · L159
- describe “WWebJSEngine.onReaction (E22 — chave-alvo em $1, remote como Wid)” · L189
  - it “emite message.reaction com keyId do $1, chat do Wid e timestamp inteiro” · L190
- describe “WWebJSEngine.toHistoryMessage (backfill com a mesma descrição)” · L215
  - it “ignora notificação de sistema e descreve enquete” · L216
- describe “WWebJSEngine — remetente em grupo (E23 · P-074)” · L242
  - it “author @c.us → senderJid = author; chatJid segue o grupo” · L265
  - it “author @lid com par no cache → telefone @c.us” · L276
  - it “author @lid SEM cache → fica o @lid e NÃO consulta o WhatsApp Web (zero evaluate/rede)” · L283
  - it “1:1 inalterado, mesmo com author espúrio” · L291
  - it “grupo sem author → mantém o jid do grupo (comportamento antigo)” · L299
  - it “fromMe em grupo (celular) → senderJid = a conta, source phone” · L308
  - it “mídia em grupo: o evento com o arquivo sai com o senderJid do autor” · L333
  - it “grupo sem opt-in preserva metadados e não baixa binário” · L357
  - it “backfill (toHistoryMessage): mesmo remetente do ao vivo — @lid pelo cache, aparelho removido, sem evaluate” · L381

## `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts`

261 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`

- describe “isNoLidForUserError” · L30
  - it “reconhece o erro cru da página e o embrulhado pelo evaluate” · L31
  - it “NÃO casa com outros erros do caminho de envio (senão reroteava tudo)” · L41
- describe “canRetryViaLid” · L54
  - it “só o jid individual clássico é elegível” · L55
- describe “pageResolvePnToLid (rodada aqui com require mockado — na página é o window.require)” · L63
  - it “devolve o LID quando getCurrentLid conhece o mapeamento” · L64
  - it “cai para getAlternateUserWid quando getCurrentLid não sabe ou devolve não-LID” · L74
  - it “devolve null quando o Store local não conhece o par (nunca inventa)” · L85
  - it “recusa @hosted.lid (reroteio só para LID clássico)” · L96
  - it “é à prova de página quebrada: módulo ausente, API que lança, require inexistente” · L106
- describe “withLidFallback (invariantes da máquina de decisão)” · L125
  - it “caminho feliz: op roda com o PN, nada é resolvido nem memorizado” · L137
  - it “erro que NÃO é "No LID" sobe INTACTO (mesma instância), sem resolver” · L147
  - it “Store local sem o LID → o ERRO ORIGINAL sobe (mesma instância, falha honesta)” · L156
  - it “retry via LID com sucesso → devolve o resultado e memoriza o par” · L165
  - it “retry resolve null sem lançar (lib não obteve o chat) → erro ORIGINAL, nada memorizado” · L177
  - it “retry que lança OUTRO erro → sobe o erro do retry e avisa onRetryError com o original” · L190
  - it “mapeado: vai direto ao LID; em throw esquece e relança; em null esquece e refaz pelo PN” · L206
  - it “grupo (@g.us) nunca reroteia, mesmo com o texto do erro parecido” · L231
- describe “guarda anti-contact-check (política do dono, 31/08: envio nunca consulta existência)” · L241
  - it “o código injetado não referencia nenhuma via de rede/checagem de existência” · L242
  - it “o engine só toca getNumberId no checkNumbers (endpoint à parte) — nunca no caminho de envio” · L253

## `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`

135 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts`

**Funções e constantes de topo**
- `isNoLidForUserError(e)` · L17
  - chamado por: `withLidFallback` L51
- `canRetryViaLid(jid)` · L23
  - chamado por: `withLidFallback` L51
- `withLidFallback(pnJid, op, deps)` · L51 · async
  - chama: `canRetryViaLid` L23, `isNoLidForUserError` L17
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:2564)
- `pageResolvePnToLid(pnJid)` · L92

**Tipos**
- interface `LidFallbackDeps` L29 · 5 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

385 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

- describe “WWebJSEngine — ciclo de vida com teto (WA-08/WA-09/P-025)” · L120
  - it “initialize pendurado: 1 retentativa, depois FAILED com motivo — e o mutex fica livre” · L129
  - it “callbacks do client antigo (geração morta) não mexem no status da sessão” · L151
  - it “QR emitido vira SCAN_QR_CODE; QR sem renovação dispara a recuperação (destroy + start)” · L173
  - it “ready → WORKING zera a fase de QR (watchdog de QR parado não dispara)” · L202
  - it “destroy sem confirmação rejeita stop/shutdown; uma segunda tentativa confirmada libera a engine” · L221
  - it “sem requireProxy, inicia com fake sem subir Chromium (P-073)” · L248
  - it “override da sessão escolhe a build do canário no próximo start” · L261
  - it “override inválido não alcança o cache nem cria cliente” · L287
  - it “limita renovação do código e recargas de página por ciclo” · L331
  - it “pairing code: fica disponível em getPairingCode() e some ao parar (WA-18)” · L364

## `modules/sessions/interface/connect-link-token.guard.ts`

38 linhas · caminho: `apps/gateway/src/modules/sessions/interface/connect-link-token.guard.ts`
- importa (interno): `modules/sessions/application/connect-link.service.ts`, `modules/sessions/domain/connect-link.ts`
- importado por: `modules/sessions/interface/public-connect.controller.ts`, `modules/sessions/sessions.module.ts`

**class `ConnectLinkTokenGuard`** L19 · @Injectable · `implements CanActivate`
- injeta (construtor): `links: ConnectLinkService`
- `constructor(links)` · L21
- `canActivate(context)` · L23 · async
  - chama: `ConnectLinkService.resolveToken` (connect-link.service.ts:240)

**Tipos**
- type `ConnectLinkRequest` L11

## `modules/sessions/interface/connect-links.controller.ts`

109 linhas · caminho: `apps/gateway/src/modules/sessions/interface/connect-links.controller.ts`
- importa (interno): `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/domain/connect-link.ts`, `modules/sessions/interface/session-ref.pipe.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `ConnectLinksController`** L47 · @UseGuards(JwtAuthGuard, RolesGuard) · @Controller('sessions')
- injeta (construtor): `links: ConnectLinkService`
- `constructor(links)` · L50
- `create(id, body, req)` · L52 · async · @Post(':id/connect-link')
  - chama: `ConnectLinkService.create` (connect-link.service.ts:144), `toConnectLinkDto` (connect-link.service.ts:85), `normalizeExpectedPhone` (connect-link.ts:223)
- `current(id)` · L93 · async · @Get(':id/connect-link')
  - chama: `ConnectLinkService.latest` (connect-link.service.ts:213), `toConnectLinkDto` (connect-link.service.ts:85)
- `revoke(id)` · L101 · async · @Delete(':id/connect-link')
  - chama: `ConnectLinkService.revoke` (connect-link.service.ts:217)

**Funções e constantes de topo**
- `createSchema` = `z.object({ ttlMinutes: z .number() .int() .min(CONNECT_LINK_TTL_MIN_M…` · L33

## `modules/sessions/interface/dto.ts`

61 linhas · caminho: `apps/gateway/src/modules/sessions/interface/dto.ts`
- importa (interno): `modules/sessions/domain/wwebjs-version.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`

**Funções e constantes de topo**
- `createSessionSchema` = `z.object({ name: z .string() .min(1) .max(64) .regex(/^[a-zA-Z0-9_-]+…` · L4
- `pairingSchema` = `z.object({ phoneNumber: z.string().min(8).max(20), })` · L19
- `sessionConfigSchema` = `z .object({ capBase: z.number().int().min(0).max(10000), warmupCurve:…` · L24
- `presenceSchema` = `z.object({ to: z.string().min(5).max(40), type: z.enum([ 'composing',…` · L45
- `profileStatusSchema` = `z.object({ status: z.string().max(139) })` · L57
- `profileNameSchema` = `z.object({ name: z.string().min(1).max(25) })` · L58
- `profilePhotoSchema` = `z.object({ url: z.string().url() })` · L60

## `modules/sessions/interface/public-connect.controller.ts`

44 linhas · caminho: `apps/gateway/src/modules/sessions/interface/public-connect.controller.ts`
- importa (interno): `bootstrap/rate-limit.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/interface/connect-link-token.guard.ts`
- importado por: `bootstrap/rate-limit.spec.ts`, `modules/sessions/sessions.module.ts`

**class `PublicConnectController`** L24 · @UseGuards(ConnectLinkTokenGuard) · @Controller('public/connect')
- injeta (construtor): `links: ConnectLinkService`
- `constructor(links)` · L27
- `state(req)` · L29 · @Get · @RouteConfig({ rateLimit: PUBLIC_CONNECT_READ_RATE_LIMIT }) · @Header('Cache-Control', 'no-store')
  - chama: `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `newQr(req)` · L36 · @Post('new-qr') · @HttpCode(200) · @RouteConfig({ rateLimit: PUBLIC_CONNECT_NEW_QR_RATE_LIMIT }) · @Header('Cache-Control', 'no-store')
  - chama: `ConnectLinkService.requestNewQr` (connect-link.service.ts:386)

## `modules/sessions/interface/session-ref.pipe.ts`

30 linhas · caminho: `apps/gateway/src/modules/sessions/interface/session-ref.pipe.ts`
- importa (interno): `modules/sessions/domain/session.repository.ts`
- importado por: `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/connect-links.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionRefPipe`** L15 · @Injectable · `implements PipeTransform`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository`
- `constructor(repo)` · L17
- `transform(value)` · L21 · async
  - chama: `SessionRepository.findById` (session.repository.ts:33), `SessionRepository.findByName` (session.repository.ts:34)

## `modules/sessions/interface/sessions.controller.ts`

428 linhas · caminho: `apps/gateway/src/modules/sessions/interface/sessions.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/license.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/interface/dto.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `SessionsController`** L89 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions')
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `manager: SessionManager` · `license: LicenseService` · `guardrail: GuardrailService` · `sessionConfig: SessionConfigService` · `proxies: ProxyService` · `connectLinks: ConnectLinkService`
- `constructor(repo, manager, license, guardrail, sessionConfig, proxies, …)` · L92
- `create(body)` · L102 · async · @Post · @MinRole('ADMIN')
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:247), `ProxyService.ensureAvailable` (proxy.service.ts:233), `SessionManager.start` (session-manager.service.ts:708), `SessionRepository.create` (session.repository.ts:32), `SessionRepository.delete` (session.repository.ts:48), `SessionRepository.findById` (session.repository.ts:33), `SessionRepository.findByName` (session.repository.ts:34), `SessionRepository.list` (session.repository.ts:35), `toDto` L46, `newId` (ulid.ts:4)
- `list(state)` · L159 · async · @Get
  - chama: `GuardrailService.statesFor` (guardrail.service.ts:617), `SessionRepository.list` (session.repository.ts:35), `toDto` L46
- `get(id)` · L179 · async · @Get(':id')
  - chama: `ensure` L422, `toDto` L46
- `health(id)` · L185 · async · @Get(':id/health')
  - chama: `GuardrailService.health` (guardrail.service.ts:591), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20)
- `getConfig(id)` · L194 · async · @Get(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20), `configDto` L65
- `patchConfig(id, body)` · L201 · async · @Patch(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.update` (session-config.service.ts:28), `configDto` L65
- `presence(id, body)` · L218 · async · @Post(':id/presence')
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:1270)
- `profileStatus(id, body)` · L234 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:1278)
- `profileName(id, body)` · L253 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:1281)
- `profilePhoto(id, body)` · L273 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:1284), `fetchImageByUrl` (safe-fetch.ts:204)
- `quarantine(id)` · L301 · @Post(':id/quarantine')
  - chama: `override` L321
- `warmup(id)` · L306 · @Post(':id/warmup')
  - chama: `override` L321
- `activate(id)` · L311 · @Post(':id/activate')
  - chama: `override` L321
- `pause(id)` · L316 · @Post(':id/pause')
  - chama: `override` L321
- `override(id, action)` · L321 · private · async
  - chama: `GuardrailService.setManualState` (guardrail.service.ts:575)
  - chamado por: `activate` L311, `pause` L316, `quarantine` L301, `warmup` L306
- `start(id)` · L326 · async · @Post(':id/start')
  - chama: `SessionManager.start` (session-manager.service.ts:708), `ensure` L422
- `stop(id)` · L333 · async · @Post(':id/stop')
  - chama: `ConnectLinkService.revokeOnOperatorStop` (connect-link.service.ts:226), `SessionManager.stop` (session-manager.service.ts:862), `ensure` L422
- `restart(id)` · L343 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:891), `ensure` L422
- `logout(id)` · L350 · async · @Post(':id/logout')
  - chama: `ConnectLinkService.revokeOnOperatorStop` (connect-link.service.ts:226), `SessionManager.logout` (session-manager.service.ts:906), `ensure` L422
- `remove(id)` · L358 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `ProxyService.markReleased` (proxy.service.ts:285), `SessionManager.remove` (session-manager.service.ts:1120), `ensure` L422
- `qr(id)` · L370 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:1162), `SessionManager.getQr` (session-manager.service.ts:1158), `ensure` L422
- `newQr(id)` · L386 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:960), `ensure` L422
- `pairingCode(id, body)` · L393 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:1166), `ensure` L422
- `ensure(id)` · L422 · private · async
  - chama: `SessionRepository.findById` (session.repository.ts:33)
  - chamado por: `get` L179, `logout` L350, `newQr` L386, `pairingCode` L393, `qr` L370, `remove` L358, `restart` L343, `start` L326, `stop` L333

**Funções e constantes de topo**
- `toDto(s)` · L46
  - chamado por: `create` L102, `get` L179, `list` L159
- `configDto(c)` · L65
  - chamado por: `getConfig` L194, `patchConfig` L201

## `modules/sessions/sessions.module.ts`

47 linhas · caminho: `apps/gateway/src/modules/sessions/sessions.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/connect-link.repository.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/prisma-connect-link.repository.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/connect-link-token.guard.ts`, `modules/sessions/interface/connect-links.controller.ts`, `modules/sessions/interface/public-connect.controller.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/interface/sessions.controller.ts`
- importado por: `app.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/channels/channels.module.ts`, `modules/contacts/contacts.module.ts`, `modules/groups/groups.module.ts`, `modules/messaging/messaging.module.ts`

**@Module `SessionsModule`** L19
- imports: `[IamModule, ProxiesModule, GuardrailModule]`
- controllers: `[ SessionsController, ConnectLinksController, PublicConnectController, ]`
- providers: `[ SessionManager, SessionConfigService, ConnectLinkService, ConnectLinkTokenGuard, { provide: CONNECT_LINK_REPOSITORY, useClass: PrismaConnectLinkRepository }, EngineFactory, SessionRefPipe, { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository }, ]`
- exports: `[ SessionManager, SessionConfigService, SessionRefPipe, SESSION_REPOSITORY, ]`

**class `SessionsModule`** L19 · @Module({ imports: [IamModule, ProxiesModule, GuardrailModule], // …)
