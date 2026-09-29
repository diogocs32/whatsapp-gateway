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
| `modules/sessions/application/session-manager.lifecycle.spec.ts` | 902 |
| `modules/sessions/application/session-manager.pairing.spec.ts` | 65 |
| `modules/sessions/application/session-manager.service.ts` | 1603 |
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
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 2606 |
| `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts` | 1354 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 812 |
| `modules/sessions/infrastructure/baileys/baileys.media.spec.ts` | 335 |
| `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts` | 201 |
| `modules/sessions/infrastructure/baileys/baileys.patch.spec.ts` | 129 |
| `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts` | 201 |
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
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 3365 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts` | 136 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts` | 906 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 398 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 464 |
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
  - chama: `SessionManager.liveView` (session-manager.service.ts:601)
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
  - chama: `connected` L539, `afterWorking` L373, `newQrState` L358, `now` L121, `onSessionWorking` L494, `NOT_FOUND` L78, `SessionManager.isBusy` (session-manager.service.ts:588), `SessionManager.isRehydrated` (session-manager.service.ts:592), `SessionManager.liveView` (session-manager.service.ts:601), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048), `ConnectLinkRepository.consume` (connect-link.repository.ts:41), `ConnectLinkRepository.hasWorkingSince` (connect-link.repository.ts:53), `ConnectLinkRepository.revoke` (connect-link.repository.ts:35), `ConnectLinkRepository.touchSeen` (connect-link.repository.ts:50), `linkState` (connect-link.ts:69), `phoneHint` (connect-link.ts:204), `phoneMatches` (connect-link.ts:195), `publicPhase` (connect-link.ts:141), `SessionRepository.findConnectSnapshot` (session.repository.ts:50)
  - chamado por: `PublicConnectController.state` (public-connect.controller.ts:29)
- `newQrState(link, now, phaseAllows)` · L358 · private
  - chama: `newQrAllowance` (connect-link.ts:89)
  - chamado por: `publicState` L279, `requestNewQr` L386
- `afterWorking(tokenHash)` · L373 · private · async
  - chama: `connected` L539, `assertUsable` L248, `now` L121, `NOT_FOUND` L78, `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `linkState` (connect-link.ts:69)
  - chamado por: `publicState` L279
- `requestNewQr(link)` · L386 · async
  - chama: `connectLinkError` L64, `busy` L482, `checkAndReserve` L423, `newQrState` L358, `now` L121, `NOT_FOUND` L78, `SessionManager.newQrForConnectLink` (session-manager.service.ts:1012), `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `linkState` (connect-link.ts:69)
  - chamado por: `PublicConnectController.newQr` (public-connect.controller.ts:36)
- `checkAndReserve(link)` · L423 · private · async
  - chama: `connectLinkError` L64, `assertUsable` L248, `busy` L482, `now` L121, `NOT_FOUND` L78, `SessionManager.isRehydrated` (session-manager.service.ts:592), `SessionManager.liveView` (session-manager.service.ts:601), `ConnectLinkRepository.findByHash` (connect-link.repository.ts:23), `ConnectLinkRepository.reserveNewQr` (connect-link.repository.ts:44), `linkState` (connect-link.ts:69), `newQrAllowance` (connect-link.ts:89), `publicPhase` (connect-link.ts:141), `SessionRepository.findConnectSnapshot` (session.repository.ts:50)
  - chamado por: `requestNewQr` L386
- `busy()` · L482 · private
  - chama: `connectLinkError` L64
  - chamado por: `checkAndReserve` L423, `requestNewQr` L386
- `onSessionWorking(sessionId, meJid, source)` · L494 · async
  - chama: `now` L121, `SessionManager.hasEngine` (session-manager.service.ts:596), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048), `ConnectLinkRepository.consume` (connect-link.repository.ts:41), `ConnectLinkRepository.findActiveBySession` (connect-link.repository.ts:26), `ConnectLinkRepository.revoke` (connect-link.repository.ts:35), `phoneMatches` (connect-link.ts:195)
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
  - chamado por: `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1772)

**class `ForwardSourceError`** L301 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L302
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1876), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:2002)

**class `UnsupportedEngineOperationError`** L318 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L319
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2084), `BaileysEngine.listChats` (baileys.engine.ts:2079), `BaileysEngine.setChatFlag` (baileys.engine.ts:2095)

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
    - chamado por: `ForwardService.sendOne` (forward.service.ts:402), `SessionManager.prepareForward` (session-manager.service.ts:1377)
- type `ForwardErrorCode` L299
- type `PresenceState` L312
- interface `IEngine` L325 · 1 propriedade(s)
  - `IEngine.start()` · L329
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:607), `WWebJSEngine.start` (wwebjs.engine.ts:761)
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1201), `SessionManager.startUnlocked` (session-manager.service.ts:741)
  - `IEngine.stop()` · L330
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:2491), `WWebJSEngine.stop` (wwebjs.engine.ts:1591)
    - chamado por: `SessionManager.drain` (session-manager.service.ts:200), `SessionManager.logoutUnlocked` (session-manager.service.ts:939), `SessionManager.onModuleDestroy` (session-manager.service.ts:346), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048), `SessionManager.stopEngine` (session-manager.service.ts:868)
  - `IEngine.shutdown()` · L338
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:2541), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1631)
    - chamado por: `SessionManager.drain` (session-manager.service.ts:200), `SessionManager.logoutUnlocked` (session-manager.service.ts:939), `SessionManager.onModuleDestroy` (session-manager.service.ts:346), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048)
  - `IEngine.logout()` · L339
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:2558), `WWebJSEngine.logout` (wwebjs.engine.ts:1660)
    - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:939), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048)
  - `IEngine.requestPairingCode(phoneNumber)` · L340
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:2471), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1728)
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1201)
  - `IEngine.sendText(to, text, opts)` · L341
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1647), `WWebJSEngine.sendText` (wwebjs.engine.ts:1742)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:1265)
  - `IEngine.sendMedia(to, input)` · L346
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1680), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1772)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:1275)
  - `IEngine.sendLocation(to, input)` · L351
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1735), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1865)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:1283)
  - `IEngine.sendPoll(to, input)` · L355
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1764), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1899)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:1291)
  - `IEngine.sendPresence(to, state)` · L359
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1826), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1962)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:1299)
  - `IEngine.setProfileStatus(status)` · L361
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1836), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1951)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:1307)
  - `IEngine.setProfileName(name)` · L362
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1839), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1954)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:1310)
  - `IEngine.setProfilePhoto(image, mimetype)` · L363
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1842), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1957)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:1313)
  - `IEngine.markRead(chatJid, msgId)` · L365
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1850), `WWebJSEngine.markRead` (wwebjs.engine.ts:1980)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:1324)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L369
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1858), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1989)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:1359)
  - `IEngine.prepareForward(src)` · L378
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1876), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:2002)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:1377)
  - `IEngine.getQrBase64()` · L379
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:584), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:483)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:1187), `SessionManager.liveView` (session-manager.service.ts:601)
  - `IEngine.getPairingCode()` · L382
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:486)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:1191)
  - `IEngine.getStatus()` · L383
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:580), `WWebJSEngine.getStatus` (wwebjs.engine.ts:480)
    - chamado por: `SessionManager.liveView` (session-manager.service.ts:601), `SessionManager.newQrForConnectLink` (session-manager.service.ts:1012), `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1201), `SessionManager.working` (session-manager.service.ts:1426)
  - `IEngine.listChats(limit)` · L388
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:2079), `WWebJSEngine.listChats` (wwebjs.engine.ts:2908)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:1333)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L389
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2084), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2928)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:1336)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L393
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:2095), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2983)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:1346)
  - `IEngine.listGroups()` · L396
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:2270), `WWebJSEngine.listGroups` (wwebjs.engine.ts:3011)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:1457)
  - `IEngine.groupInfo(jid)` · L397
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:2278), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:3039)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:1460)
  - `IEngine.createGroup(subject, participants)` · L398
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:2286), `WWebJSEngine.createGroup` (wwebjs.engine.ts:3173)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:1463)
  - `IEngine.updateParticipants(jid, action, participants)` · L399
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:2296), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:3188)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:1473)
  - `IEngine.leaveGroup(jid)` · L404
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:2304), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:3201)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:1485)
  - `IEngine.setGroupSubject(jid, subject)` · L405
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:2307), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:3205)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:1488)
  - `IEngine.setGroupDescription(jid, description)` · L406
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:2310), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:3209)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:1495)
  - `IEngine.groupInviteCode(jid)` · L407
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:2313), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:3213)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:1505)
  - `IEngine.groupRevokeInvite(jid)` · L408
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:2316), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:3217)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:1508)
  - `IEngine.groupMembershipRequests(jid)` · L411
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:2322), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:3225)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:1511)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L412
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:2334), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:3243)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:1517)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L418
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:2356), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:3258)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:1529)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L424
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:2373), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:3269)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:1541)
  - `IEngine.checkNumbers(numbers)` · L427
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:2382), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:3280)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:1555)
  - `IEngine.profilePicture(jid)` · L428
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:2397), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:3291)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:1561)
  - `IEngine.setBlock(jid, action)` · L429
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:2406), `WWebJSEngine.setBlock` (wwebjs.engine.ts:3302)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:1564)
  - `IEngine.saveContact(jid, input)` · L431
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:2409), `WWebJSEngine.saveContact` (wwebjs.engine.ts:3310)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:1571)
  - `IEngine.removeContact(jid)` · L433
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:2422), `WWebJSEngine.removeContact` (wwebjs.engine.ts:3321)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:1578)
  - `IEngine.createChannel(name, description)` · L436
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:2427), `WWebJSEngine.createChannel` (wwebjs.engine.ts:3326)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:1583)
  - `IEngine.channelInfo(jid)` · L437
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:2434), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:3344)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:1593)
  - `IEngine.followChannel(jid)` · L438
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:2438), `WWebJSEngine.followChannel` (wwebjs.engine.ts:3357)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:1596)
  - `IEngine.unfollowChannel(jid)` · L439
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:2441), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:3361)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:1599)

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
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

**class `LeaseLostError`** L1 · `extends Error`
- `constructor()` · L2
  - chamado por: `SessionManager.epochOf` (session-manager.service.ts:133), `SessionManager.getOrCreateEngine` (session-manager.service.ts:392), `SessionManager.ownedWorking` (session-manager.service.ts:1439), `SessionManager.scheduleRenew` (session-manager.service.ts:157), `SessionManager.sending` (session-manager.service.ts:1398), `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)

## `modules/sessions/application/session-manager.lifecycle.spec.ts`

902 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.lifecycle.spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager — lock de ciclo de vida (E27/D-037)” · L262
  - it “renovação atrasada do ciclo antigo não encerra a engine nova” · L263
  - it “dois newQr concorrentes não se sobrepõem: o 2º espera o 1º terminar e cada engine nova sobe 1 vez” · L286
  - it “stop chamado durante um newQr roda DEPOIS dele e a engine final fica parada” · L330
  - it “restart termina sem deadlock e encadeia stop → start na mesma engine” · L379
  - it “start, stop, restart e stop disparados juntos rodam em fila, na ordem de chegada” · L390
  - it “stop pendurado libera o lock após 10 s, mas não solta o lease nem relança a engine viva” · L415
- describe “SessionManager.newQrForConnectLink (E27/P-086)” · L438
  - it “com outra operação em andamento rejeita SessionBusyError sem chamar o check nem mexer na fila” · L439
  - it “check que lança: erro propaga e nada de stop/deleteMany/purge/start; o lock é liberado” · L461
  - it “sem engine em memória: newQr roda (creds apagadas, purge, engine criada e iniciada)” · L544
- describe “SessionManager — erro e fila (E27/D-037)” · L566
  - it “erro numa operação volta só para o chamador dela e não trava as seguintes” · L567
  - it “start da engine nova falhando dentro do newQrForConnectLink propaga o erro e libera o lock” · L595
  - it “isBusy: true durante a operação e na fila, false quando tudo assenta; por sessão” · L612
  - it “logo após o await de uma operação, o failFast do link público não vê a sessão ocupada” · L626
- describe “SessionManager.remove — ordem para o carimbo de proxy (E26/D-038)” · L637
  - it “só resolve depois do delete cercado pelo lease e rejeita se ele rejeitar” · L642
- describe “SessionManager.requestPairingCode dentro do lock (E27, revisão do diff)” · L664
  - it “pedido de código pendurado estoura em 45 s (409 na rota) e libera o stop que esperava” · L672
- describe “SessionManager.rejectConnectedAccount (E27/P-086)” · L701
  - it “sem engine no mapa (réplica não dona) é no-op” · L702
  - it “com engine: logout, sai do mapa, persiste e publica STOPPED com o motivo e restaura lastMeJid” · L714
  - it “publica um único STOPPED (com o motivo): o STOPPED sem motivo do próprio logout é descartado” · L758
  - it “logout que falha não impede a rejeição (sai do mapa, STOPPED com motivo, lastMeJid)” · L790
  - it “entra na fila do lock (sem failFast): espera a operação em andamento” · L805
- describe “SessionManager — leituras do link (E27/P-086)” · L826
  - it “liveView devolve status+qr da mesma instância e null sem engine; hasEngine acompanha” · L827
  - it “isRehydrated: false antes do bootstrap, true depois sem candidatos” · L851
  - it “isRehydrated com candidatos: só vira true quando o laço termina, mesmo com falha no start” · L861
  - it “sessão fora de WORKING expõe erro tipado sem mudar a mensagem pública” · L888

## `modules/sessions/application/session-manager.pairing.spec.ts`

65 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.pairing.spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager.requestPairingCode (E12)” · L28
  - it “barra status WORKING antes de consultar creds ou iniciar socket” · L29
  - it “barra creds.me persistido de QR mesmo com registered=false” · L40
  - it “inicia sessão sem credenciais e encaminha o pedido sem sleep” · L56

## `modules/sessions/application/session-manager.service.ts`

1603 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/connect-link.service.spec.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-manager.pairing.spec.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionBusyError`** L60 · `extends ConflictException`
- `constructor()` · L61
  - chamado por: `ensureLease` L138, `logoutUnlocked` L939, `newQrForConnectLink` L1012, `newQrUnlocked` L1128, `rejectConnectedAccount` L1048, `removeUnlocked` L1153, `runExclusive` L569, `startUnlocked` L741, `stopUnlocked` L895, `working` L1426

**class `SessionNotWorkingError`** L69 · `extends Error`
- injeta (construtor): `message: 'Sessão não iniciada' | 'Sessão não está conectada' (param)`
- `constructor(message)` · L70
  - chamado por: `working` L1426

**class `SessionManager`** L76 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory` · `guardrail: GuardrailService`
- `logger` · L78 · private · campo
- `engines` · L79 · private · campo
- `names` · L80 · private · campo
- `lastStatusKey` · L84 · private · campo
- `statusWrites` · L87 · private · campo
- `rehydrated` · L95 · private · campo
- `rehydrationDone` · L97 · private · campo
- `owned` · L101 · private · campo
- `bootRetries` · L105 · private · campo
- `pendingStops` · L109 · private · campo
- `draining` · L110 · private · campo
- `drainFailed` · L111 · private · campo
- `shuttingDown` · L112 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L114
  - chama: `PostgresSessionLease.constructor` (postgres-session-lease.ts:22)
- `isOwner(sessionId)` · L128 · private
  - chamado por: `enqueueStatusWrite` L535, `ensureLease` L138, `epochOf` L133, `getOrCreateEngine` L392, `handleEngineEvent` L610, `newQrForConnectLink` L1012, `rejectConnectedAccount` L1048, `stopUnlocked` L895
- `epochOf(sessionId)` · L133 · private
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `isOwner` L128
  - chamado por: `ensureLease` L138, `getOrCreateEngine` L392, `handleEngineEvent` L610, `logoutUnlocked` L939, `ownedWorking` L1439, `persistStatus` L694, `rejectConnectedAccount` L1048, `removeUnlocked` L1153, `sending` L1398, `startUnlocked` L741, `startWithTimeout` L794, `working` L1426
- `ensureLease(sessionId)` · L138 · private · async
  - chama: `constructor` L61, `drain` L200, `epochOf` L133, `isOwner` L128, `scheduleRenew` L157, `PostgresSessionLease.acquire` (postgres-session-lease.ts:24)
  - chamado por: `logoutUnlocked` L939, `newQrForConnectLink` L1012, `newQrUnlocked` L1128, `rejectConnectedAccount` L1048, `removeUnlocked` L1153, `requestPairingCodeUnlocked` L1201, `restart` L920, `startUnlocked` L741, `stopUnlocked` L895
- `scheduleRenew(sessionId, held)` · L157 · private
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L200, `scheduleBootRetry` L252, `PostgresSessionLease.renew` (postgres-session-lease.ts:39)
  - chamado por: `ensureLease` L138
- `drain(sessionId, expected)` · L200 · private · async
  - chama: `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `settledWithin` L843
  - chamado por: `ensureLease` L138, `ownedWorking` L1439, `persistStatus` L694, `scheduleRenew` L157, `sending` L1398
- `releaseLease(sessionId)` · L241 · private · async
  - chama: `PostgresSessionLease.release` (postgres-session-lease.ts:48)
  - chamado por: `logoutUnlocked` L939, `newQrForConnectLink` L1012, `onModuleDestroy` L346, `rejectConnectedAccount` L1048, `removeUnlocked` L1153, `startUnlocked` L741, `stopUnlocked` L895
- `scheduleBootRetry(sessionId, delayMs)` · L252 · private
  - chama: `isTransientDatabaseError` L272, `startAutostart` L288
  - chamado por: `onApplicationBootstrap` L294, `scheduleRenew` L157
- `isTransientDatabaseError(e)` · L272 · private
  - chamado por: `onApplicationBootstrap` L294, `scheduleBootRetry` L252
- `startAutostart(sessionId)` · L288 · private
  - chama: `runExclusive` L569, `startUnlocked` L741
  - chamado por: `onApplicationBootstrap` L294, `scheduleBootRetry` L252
- `onApplicationBootstrap()` · L294 · async
  - chama: `finishRehydration` L337, `isTransientDatabaseError` L272, `scheduleBootRetry` L252, `startAutostart` L288, `SessionRepository.findAutostart` (session.repository.ts:49)
- `finishRehydration()` · L337 · private
  - chamado por: `onApplicationBootstrap` L294
- `whenRehydrated()` · L342
  - chamado por: `CampaignQueue.onApplicationBootstrap` (campaign-queue.ts:150)
- `onModuleDestroy()` · L346 · async
  - chama: `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `releaseLease` L241
- `getOrCreateEngine(sessionId, engineType)` · L392 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `GuardrailService.recordReachoutRestriction` (guardrail.service.ts:456), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:139), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:223), `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:196), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:173), `LeaseLostError.constructor` (session-lease.error.ts:2), `enqueueStatusWrite` L535, `epochOf` L133, `handleEngineEvent` L610, `isOwner` L128, `EngineFactory.create` (engine.factory.ts:11), `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `PostgresSessionLease.updateLastErrorDetails` (postgres-session-lease.ts:118)
  - chamado por: `requestPairingCodeUnlocked` L1201, `startUnlocked` L741
  - banco: `sessionConfig.findUnique`
- `enqueueStatusWrite(sessionId, engine, operation, write)` · L535 · private
  - chama: `isOwner` L128
  - chamado por: `getOrCreateEngine` L392
- `locks()` · L561 · private · getter
- `runExclusive(sessionId, fn, opts)` · L569 · private
  - chama: `constructor` L61
  - chamado por: `logout` L935, `newQr` L989, `newQrForConnectLink` L1012, `rejectConnectedAccount` L1048, `remove` L1149, `requestPairingCode` L1195, `restart` L920, `start` L737, `startAutostart` L288, `stop` L891
- `isBusy(sessionId)` · L588
  - chamado por: `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `isRehydrated()` · L592
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `hasEngine(sessionId)` · L596
  - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494)
- `liveView(sessionId)` · L601
  - chama: `IEngine.getQrBase64` (engine.port.ts:379), `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `ConnectLinkService.checkAndReserve` (connect-link.service.ts:423), `ConnectLinkService.isWorking` (connect-link.service.ts:206), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `handleEngineEvent(sessionId, name, payload, expectedEngine, expectedEpoch)` · L610 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `epochOf` L133, `isOwner` L128, `persistStatus` L694, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L392, `rejectConnectedAccount` L1048
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p, expectedEpoch)` · L694 · private · async
  - chama: `drain` L200, `epochOf` L133, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `handleEngineEvent` L610
- `START_TIMEOUT_MS` · L735 · private · static · campo
- `start(sessionId)` · L737
  - chama: `runExclusive` L569, `startUnlocked` L741
  - chamado por: `SessionsController.create` (sessions.controller.ts:102), `SessionsController.start` (sessions.controller.ts:326)
- `startUnlocked(sessionId, autostartOnly)` · L741 · private · async
  - chama: `IEngine.start` (engine.port.ts:329), `constructor` L61, `ensureLease` L138, `epochOf` L133, `getOrCreateEngine` L392, `releaseLease` L241, `startWithTimeout` L794, `SessionRepository.findById` (session.repository.ts:33), `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)
  - chamado por: `newQrUnlocked` L1128, `restart` L920, `start` L737, `startAutostart` L288
  - banco: `waSession.findUnique`
- `startWithTimeout(sessionId, op)` · L794 · private · async
  - chama: `epochOf` L133, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `requestPairingCodeUnlocked` L1201, `startUnlocked` L741
- `settledWithin(op, ms)` · L843 · private · async
  - chamado por: `drain` L200, `logoutUnlocked` L939, `purgeAuthDir` L993, `rejectConnectedAccount` L1048, `removeUnlocked` L1153, `stopEngine` L868
- `stopEngine(sessionId, engine, ms)` · L868 · private
  - chama: `IEngine.stop` (engine.port.ts:330), `settledWithin` L843
  - chamado por: `newQrUnlocked` L1128, `removeUnlocked` L1153, `stopUnlocked` L895
- `stop(sessionId)` · L891
  - chama: `runExclusive` L569, `stopUnlocked` L895
  - chamado por: `SessionsController.stop` (sessions.controller.ts:333)
- `stopUnlocked(sessionId, keepLease)` · L895 · private · async
  - chama: `constructor` L61, `ensureLease` L138, `isOwner` L128, `releaseLease` L241, `stopEngine` L868, `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `restart` L920, `stop` L891
- `restart(sessionId)` · L920
  - chama: `ensureLease` L138, `runExclusive` L569, `startUnlocked` L741, `stopUnlocked` L895
  - chamado por: `SessionsController.restart` (sessions.controller.ts:343)
- `logout(sessionId)` · L935
  - chama: `logoutUnlocked` L939, `runExclusive` L569
  - chamado por: `SessionsController.logout` (sessions.controller.ts:350)
- `logoutUnlocked(sessionId)` · L939 · private · async
  - chama: `IEngine.logout` (engine.port.ts:339), `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `constructor` L61, `ensureLease` L138, `epochOf` L133, `purgeAuthDir` L993, `releaseLease` L241, `settledWithin` L843, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133), `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `logout` L935
- `newQr(sessionId)` · L989
  - chama: `newQrUnlocked` L1128, `runExclusive` L569
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:386)
- `purgeAuthDir(sessionId, epoch)` · L993 · private · async
  - chama: `settledWithin` L843, `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `WWebJSEngine.detachAuthDir` (wwebjs.engine.ts:745), `WWebJSEngine.purgeDetachedAuthDir` (wwebjs.engine.ts:757)
  - chamado por: `logoutUnlocked` L939, `newQrUnlocked` L1128, `rejectConnectedAccount` L1048
- `newQrForConnectLink(sessionId, check)` · L1012
  - chama: `IEngine.getStatus` (engine.port.ts:383), `constructor` L61, `ensureLease` L138, `isOwner` L128, `newQrUnlocked` L1128, `releaseLease` L241, `runExclusive` L569
  - chamado por: `ConnectLinkService.requestNewQr` (connect-link.service.ts:386)
- `rejectConnectedAccount(sessionId, reason, restoreLastMeJid, opts)` · L1048
  - chama: `IEngine.logout` (engine.port.ts:339), `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330), `constructor` L61, `ensureLease` L138, `epochOf` L133, `handleEngineEvent` L610, `isOwner` L128, `purgeAuthDir` L993, `releaseLease` L241, `runExclusive` L569, `settledWithin` L843, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133), `PostgresSessionLease.setLastMeJid` (postgres-session-lease.ts:145), `PostgresSessionLease.updateStatus` (postgres-session-lease.ts:83)
  - chamado por: `ConnectLinkService.onSessionWorking` (connect-link.service.ts:494), `ConnectLinkService.publicState` (connect-link.service.ts:279)
- `newQrUnlocked(sessionId)` · L1128 · private · async
  - chama: `constructor` L61, `ensureLease` L138, `purgeAuthDir` L993, `startUnlocked` L741, `stopEngine` L868, `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133)
  - chamado por: `newQr` L989, `newQrForConnectLink` L1012
- `remove(sessionId)` · L1149
  - chama: `removeUnlocked` L1153, `runExclusive` L569
  - chamado por: `SessionsController.remove` (sessions.controller.ts:358)
- `removeUnlocked(sessionId)` · L1153 · private · async
  - chama: `constructor` L61, `ensureLease` L138, `epochOf` L133, `releaseLease` L241, `settledWithin` L843, `stopEngine` L868, `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `WWebJSEngine.detachAuthDir` (wwebjs.engine.ts:745), `WWebJSEngine.purgeDetachedAuthDir` (wwebjs.engine.ts:757)
  - chamado por: `remove` L1149
  - banco: `waSession.delete`
- `getQr(sessionId)` · L1187
  - chama: `IEngine.getQrBase64` (engine.port.ts:379)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:370)
- `getPairingCode(sessionId)` · L1191
  - chama: `IEngine.getPairingCode` (engine.port.ts:382)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:370)
- `requestPairingCode(sessionId, phoneNumber)` · L1195
  - chama: `requestPairingCodeUnlocked` L1201, `runExclusive` L569
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:393)
- `requestPairingCodeUnlocked(sessionId, phoneNumber)` · L1201 · private · async
  - chama: `IEngine.getStatus` (engine.port.ts:383), `IEngine.requestPairingCode` (engine.port.ts:340), `IEngine.start` (engine.port.ts:329), `ensureLease` L138, `getOrCreateEngine` L392, `rejectAfter` L1248, `startWithTimeout` L794, `SessionRepository.findById` (session.repository.ts:33)
  - chamado por: `requestPairingCode` L1195
  - banco: `waSession.findUnique`
- `PAIRING_REQUEST_TIMEOUT_MS` · L1244 · private · static · campo
- `rejectAfter(op, ms, message)` · L1248 · private · async
  - chamado por: `requestPairingCodeUnlocked` L1201
- `sendText(sessionId, to, text, opts)` · L1265 · async
  - chama: `IEngine.sendText` (engine.port.ts:341), `sending` L1398
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:232), `MessagesController.sendText` (messages.controller.ts:616)
- `sendMedia(sessionId, to, input)` · L1275 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:346), `sending` L1398
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:232), `MessagesController.sendMedia` (messages.controller.ts:645), `MessagesController.sendMediaUrl` (messages.controller.ts:715)
- `sendLocation(sessionId, to, input)` · L1283 · async
  - chama: `IEngine.sendLocation` (engine.port.ts:351), `sending` L1398
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:787)
- `sendPoll(sessionId, to, input)` · L1291 · async
  - chama: `IEngine.sendPoll` (engine.port.ts:355), `sending` L1398
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:826)
- `sendPresence(sessionId, to, state)` · L1299 · async
  - chama: `IEngine.sendPresence` (engine.port.ts:359), `ownedWorking` L1439
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:232), `SessionsController.presence` (sessions.controller.ts:218)
- `setProfileStatus(sessionId, status)` · L1307 · async
  - chama: `IEngine.setProfileStatus` (engine.port.ts:361), `ownedWorking` L1439
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:234)
- `setProfileName(sessionId, name)` · L1310 · async
  - chama: `IEngine.setProfileName` (engine.port.ts:362), `ownedWorking` L1439
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:253)
- `setProfilePhoto(sessionId, image, mimetype)` · L1313 · async
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:363), `ownedWorking` L1439
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:273)
- `markRead(sessionId, chatJid, msgId)` · L1324 · async
  - chama: `IEngine.markRead` (engine.port.ts:365), `ownedWorking` L1439
  - chamado por: `MessagesController.markRead` (messages.controller.ts:484)
- `listChats(sessionId, limit)` · L1333 · async
  - chama: `IEngine.listChats` (engine.port.ts:388), `ownedWorking` L1439
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L1336 · async
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:389), `ownedWorking` L1439
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L1346 · async
  - chama: `IEngine.setChatFlag` (engine.port.ts:393), `ownedWorking` L1439
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:410)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L1359 · async
  - chama: `IEngine.sendReaction` (engine.port.ts:369), `sending` L1398
  - chamado por: `MessagesController.reaction` (messages.controller.ts:496)
- `prepareForward(sessionId, src)` · L1377 · async
  - chama: `IEngine.prepareForward` (engine.port.ts:378), `PreparedForward.send` (engine.port.ts:292), `ownedWorking` L1439, `sending` L1398
  - chamado por: `ForwardService.runReserved` (forward.service.ts:170)
- `sending(sessionId)` · L1398 · private · async
  - chama: `GuardrailService.canSendMessage` (guardrail.service.ts:438), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6), `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L200, `epochOf` L133, `working` L1426, `PostgresSessionLease.isCurrent` (postgres-session-lease.ts:55)
  - chamado por: `prepareForward` L1377, `sendLocation` L1283, `sendMedia` L1275, `sendPoll` L1291, `sendReaction` L1359, `sendText` L1265
- `working(sessionId)` · L1426 · private
  - chama: `IEngine.getStatus` (engine.port.ts:383), `constructor` L61, `epochOf` L133, `constructor` L70
  - chamado por: `ownedWorking` L1439, `sending` L1398
- `ownedWorking(sessionId)` · L1439 · private · async
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2), `drain` L200, `epochOf` L133, `working` L1426, `PostgresSessionLease.isCurrent` (postgres-session-lease.ts:55)
  - chamado por: `channelInfo` L1593, `checkNumbers` L1555, `createChannel` L1583, `createGroup` L1463, `fetchChatHistory` L1336, `followChannel` L1596, `groupInfo` L1460, `groupInviteCode` L1505, `groupMembershipAction` L1517, `groupMembershipRequests` L1511, `groupRevokeInvite` L1508, `leaveGroup` L1485, `listChats` L1333, `listGroups` L1457, `markRead` L1324, `prepareForward` L1377, `profilePicture` L1561, `removeContact` L1578, `saveContact` L1571, `sendPresence` L1299, `setBlock` L1564, `setChatFlag` L1346, `setGroupDescription` L1495, `setGroupPhoto` L1541, `setGroupSetting` L1529, `setGroupSubject` L1488, `setProfileName` L1310, `setProfilePhoto` L1313, `setProfileStatus` L1307, `unfollowChannel` L1599, `updateParticipants` L1473
- `listGroups(sessionId)` · L1457 · async
  - chama: `IEngine.listGroups` (engine.port.ts:396), `ownedWorking` L1439
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L1460 · async
  - chama: `IEngine.groupInfo` (engine.port.ts:397), `ownedWorking` L1439
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L1463 · async
  - chama: `IEngine.createGroup` (engine.port.ts:398), `ownedWorking` L1439
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L1473 · async
  - chama: `IEngine.updateParticipants` (engine.port.ts:399), `ownedWorking` L1439
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L1485 · async
  - chama: `IEngine.leaveGroup` (engine.port.ts:404), `ownedWorking` L1439
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L1488 · async
  - chama: `IEngine.setGroupSubject` (engine.port.ts:405), `ownedWorking` L1439
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L1495 · async
  - chama: `IEngine.setGroupDescription` (engine.port.ts:406), `ownedWorking` L1439
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L1505 · async
  - chama: `IEngine.groupInviteCode` (engine.port.ts:407), `ownedWorking` L1439
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L1508 · async
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:408), `ownedWorking` L1439
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L1511 · async
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:411), `ownedWorking` L1439
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L1517 · async
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:412), `ownedWorking` L1439
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L1529 · async
  - chama: `IEngine.setGroupSetting` (engine.port.ts:418), `ownedWorking` L1439
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L1541 · async
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:424), `ownedWorking` L1439
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L1555 · async
  - chama: `IEngine.checkNumbers` (engine.port.ts:427), `ownedWorking` L1439
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L1561 · async
  - chama: `IEngine.profilePicture` (engine.port.ts:428), `ownedWorking` L1439
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L1564 · async
  - chama: `IEngine.setBlock` (engine.port.ts:429), `ownedWorking` L1439
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L1571 · async
  - chama: `IEngine.saveContact` (engine.port.ts:431), `ownedWorking` L1439
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L1578 · async
  - chama: `IEngine.removeContact` (engine.port.ts:433), `ownedWorking` L1439
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L1583 · async
  - chama: `IEngine.createChannel` (engine.port.ts:436), `ownedWorking` L1439
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L1593 · async
  - chama: `IEngine.channelInfo` (engine.port.ts:437), `ownedWorking` L1439
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L1596 · async
  - chama: `IEngine.followChannel` (engine.port.ts:438), `ownedWorking` L1439
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L1599 · async
  - chama: `IEngine.unfollowChannel` (engine.port.ts:439), `ownedWorking` L1439
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
    - chamado por: `SessionManager.requestPairingCodeUnlocked` (session-manager.service.ts:1201), `SessionManager.startUnlocked` (session-manager.service.ts:741), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:102), `SessionsController.ensure` (sessions.controller.ts:422)
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
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:294)
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
  - chamado por: `WWebJSEngine.doStart` (wwebjs.engine.ts:775), `WWebJSEngine.resolveWebVersion` (wwebjs.engine.ts:1223)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:620)
- `snapshot(reason)` · L35 · async
  - chamado por: `close` L71, `constructor` L23, `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:936)
  - banco: `waAuthKey.count`
- `close(reason)` · L71
  - chama: `snapshot` L35
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:620), `BaileysEngine.doLogout` (baileys.engine.ts:2563), `BaileysEngine.doStop` (baileys.engine.ts:2498), `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:936), `BaileysEngine.shutdown` (baileys.engine.ts:2541)

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
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:278)
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
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1946), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1205)
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
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1876)

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

2606 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/upsert-decision.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/disconnect-stats.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`, `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/application/proxy-failure.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.media.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L518 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L519 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L520 · private · campo
- `cacheObserver` · L521 · private · campo
- `pairingReadySock` · L522 · private · campo
- `createMediaDispatcher()` · L526 · private
- `status` · L528 · private · campo
- `qrBase64` · L529 · private · campo
- `stopped` · L530 · private · campo
- `reconnectAttempts` · L531 · private · campo
- `replacedRetryUsed` · L532 · private · campo
- `replacedRetryAttempted` · L533 · private · campo
- `restartRequiredStreak` · L534 · private · campo
- `lifecycle` · L540 · private · campo
- `sentMessages` · L542 · private · campo
- `seenUpserts` · L545 · private · campo
- `lidToPn` · L547 · private · campo
- `groupPushName` · L550 · private · campo
- `connectGeneration` · L555 · private · campo
- `timelockFetch` · L556 · private · campo
- `lastTimelockFetchAt` · L557 · private · campo
- `groupMetaCache` · L559 · private · campo
- `constructor(deps)` · L564
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L566 · private
  - chamado por: `connect` L620, `groupInfo` L2278, `listGroups` L2270
- `clearReconnectTimer()` · L575 · private
  - chamado por: `connect` L620, `doLogout` L2563, `doStop` L2498, `onConnectionUpdate` L936, `scheduleBudgetedReconnect` L1133, `scheduleReconnect` L1153, `shutdown` L2541, `start` L607
- `getStatus()` · L580
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `requestPairingCode` L2471
- `getQrBase64()` · L584
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `setStatus(status, extra)` · L588 · private
  - chamado por: `connect` L620, `doLogout` L2563, `doStop` L2498, `onConnectionUpdate` L936, `requestPairingCode` L2471, `scheduleBudgetedReconnect` L1133
- `serialize(fn)` · L598 · private
  - chamado por: `connect` L620, `logout` L2558, `scheduleReconnect` L1153, `start` L607, `stop` L2491
- `start()` · L607
  - implementa: `IEngine.start` (engine.port.ts:329)
  - chama: `clearReconnectTimer` L575, `connect` L620, `serialize` L598
- `connect(persistStartingStatus)` · L620 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.constructor` (baileys-cache-observer.ts:23), `cacheGroupMeta` L566, `clearReconnectTimer` L575, `detachSocketListeners` L2518, `loadMessageForRetry` L2018, `onConnectionUpdate` L936, `onContacts` L2171, `onMessageCapping` L1381, `onMessagesUpdate` L1319, `onMessagesUpsert` L1205, `onReactions` L831, `safe` L2053, `serialize` L598, `setStatus` L588, `latestBaileysVersion` L175, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:21)
  - chamado por: `scheduleReconnect` L1153, `start` L607
- `onReactions(reactions)` · L831 · private
  - chama: `learnPair` L867, `resolveChatJid` L860, `mapBaileysReaction` L278
  - chamado por: `connect` L620
- `resolveChatJid(jid)` · L860 · private
  - chamado por: `groupSenderOf` L894, `onReactions` L831
- `learnPair(a, b)` · L867 · private
  - chama: `learnLid` L874
  - chamado por: `onReactions` L831
- `learnLid(lid, pn)` · L874 · private
  - chama: `mergeLidMessages` L2128
  - chamado por: `groupSenderOf` L894, `learnPair` L867, `onMessagesUpsert` L1205
- `groupSenderOf(m)` · L894 · private
  - chama: `learnLid` L874, `rememberGroupPushName` L928, `resolveChatJid` L860, `phoneFirst` L305
  - chamado por: `onMessagesUpsert` L1205
- `rememberGroupPushName(pn, pushName)` · L928 · private
  - chamado por: `groupSenderOf` L894
- `onConnectionUpdate(update, eventSock)` · L936 · private · async
  - chama: `classifyProxyFailure` (proxy-failure.ts:5), `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.snapshot` (baileys-cache-observer.ts:35), `clearCredentials` L2589, `clearReconnectTimer` L575, `detachSocketListeners` L2518, `fetchReachoutTimelock` L1407, `scheduleBudgetedReconnect` L1133, `scheduleReconnect` L1153, `setStatus` L588, `warmLidCache` L2114, `classifyDisconnect` (disconnect-policy.ts:29), `disconnectDetails` (disconnect-policy.ts:12), `recordDisconnect` (disconnect-stats.ts:10), `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L620
- `scheduleBudgetedReconnect(details)` · L1133 · private
  - chama: `clearReconnectTimer` L575, `scheduleReconnect` L1153, `setStatus` L588
  - chamado por: `onConnectionUpdate` L936, `scheduleReconnect` L1153
- `scheduleReconnect(delay, details, retryAfterConnectFailure, quietStart)` · L1153 · private
  - chama: `clearReconnectTimer` L575, `connect` L620, `scheduleBudgetedReconnect` L1133, `serialize` L598
  - chamado por: `onConnectionUpdate` L936, `scheduleBudgetedReconnect` L1133
- `onMessagesUpsert(upsert)` · L1205 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L894, `handleIncomingMedia` L1503, `learnLid` L874, `encodeProto` L257, `shouldAcceptUpsert` (upsert-decision.ts:8)
  - chamado por: `connect` L620
  - banco: `waMessage.findFirst`
- `onMessagesUpdate(updates)` · L1319 · private · async
  - chama: `fetchReachoutTimelock` L1407, `markMessage` L1484, `mapAckStatus` L324, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L620
- `onMessageCapping(info)` · L1381 · private · async
  - chama: `fetchReachoutTimelock` L1407, `cappingCycleEnd` L508, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L620
- `fetchReachoutTimelock()` · L1407 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `onConnectionUpdate` L936, `onMessageCapping` L1381, `onMessagesUpdate` L1319
- `markMessage(keyId, fromMe, field)` · L1484 · private
  - chamado por: `onMessagesUpdate` L1319
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1503 · private · async
  - chama: `encodeProto` L257, `extOf` L310
  - chamado por: `onMessagesUpsert` L1205
- `sendText(to, text, opts)` · L1647 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `cacheSent` L2004, `resolveJid` L1821, `encodeProto` L257
- `sendMedia(to, input)` · L1680 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `cacheSent` L2004, `resolveJid` L1821, `buildMediaContent` L344, `encodeProto` L257, `extOf` L310
- `sendLocation(to, input)` · L1735 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `emitOutbound` L1789, `resolveJid` L1821, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1764 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `emitOutbound` L1789, `resolveJid` L1821, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1789 · private
  - chama: `cacheSent` L2004, `encodeProto` L257
  - chamado por: `sendLocation` L1735, `sendPoll` L1764
- `resolveJid(to)` · L1821 · private · async
  - chama: `toJid` L2601
  - chamado por: `forwardTo` L1946, `resolveParticipants` L2105, `sendLocation` L1735, `sendMedia` L1680, `sendPoll` L1764, `sendText` L1647
- `sendPresence(to, state)` · L1826 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `sk` L2072, `toJid` L2601
- `setProfileStatus(status)` · L1836 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `sk` L2072
- `setProfileName(name)` · L1839 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `sk` L2072
- `setProfilePhoto(image, _mimetype)` · L1842 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `sk` L2072
- `markRead(chatJid, msgId)` · L1850 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `sk` L2072, `toJid` L2601
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1858 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `toJid` L2601
- `prepareForward(src)` · L1876 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1946, `decodeProto` L260
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1946 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L2004, `resolveJid` L1821, `encodeProto` L257, `toJid` L2601
  - chamado por: `prepareForward` L1876
- `cacheSent(keyId, message)` · L2004 · private
  - chamado por: `emitOutbound` L1789, `forwardTo` L1946, `loadMessageForRetry` L2018, `sendMedia` L1680, `sendText` L1647
- `loadMessageForRetry(key)` · L2018 · private · async
  - chama: `cacheSent` L2004, `decodeProto` L260
  - chamado por: `connect` L620
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L2053 · private
  - chamado por: `connect` L620
- `sk()` · L2072 · private
  - chamado por: `channelInfo` L2434, `checkNumbers` L2382, `createChannel` L2427, `createGroup` L2286, `followChannel` L2438, `groupInfo` L2278, `groupInviteCode` L2313, `groupMembershipAction` L2334, `groupMembershipRequests` L2322, `groupRevokeInvite` L2316, `leaveGroup` L2304, `listGroups` L2270, `markRead` L1850, `profilePicture` L2397, `removeContact` L2422, `saveContact` L2409, `sendPresence` L1826, `setBlock` L2406, `setGroupDescription` L2310, `setGroupPhoto` L2373, `setGroupSetting` L2356, `setGroupSubject` L2307, `setProfileName` L1839, `setProfilePhoto` L1842, `setProfileStatus` L1836, `unfollowChannel` L2441, `updateParticipants` L2296
- `listChats(_limit)` · L2079 · async
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `fetchChatHistory(_chatJid, _limit)` · L2084 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `setChatFlag(_chatJid, _flag, _enabled)` · L2095 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `resolveParticipants(items)` · L2105 · private · async
  - chama: `resolveJid` L1821
  - chamado por: `createGroup` L2286, `groupMembershipAction` L2334, `updateParticipants` L2296
- `warmLidCache()` · L2114 · private · async
  - chama: `mergeKnownLids` L2151
  - chamado por: `onConnectionUpdate` L936
- `mergeLidMessages(lid, phoneJid)` · L2128 · private · async
  - chamado por: `learnLid` L874, `mergeKnownLids` L2151
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L2151 · private · async
  - chama: `mergeLidMessages` L2128
  - chamado por: `warmLidCache` L2114
  - banco: `waMessage.findMany`
- `onContacts(list)` · L2171 · private
  - chama: `contactToRecord` L232
  - chamado por: `connect` L620
- `recordGroupParticipants(groups)` · L2178 · private · async
  - chama: `resolveParticipantPhone` L382
  - chamado por: `createGroup` L2286, `groupInfo` L2278, `listGroups` L2270
- `resolveParticipantNames(groups, rosterLidToPn)` · L2247 · private · async
  - chama: `resolveParticipantPhone` L382
  - chamado por: `groupInfo` L2278, `listGroups` L2270
- `listGroups()` · L2270 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `cacheGroupMeta` L566, `recordGroupParticipants` L2178, `resolveParticipantNames` L2247, `sk` L2072, `toGroupInfo` L432
- `groupInfo(jid)` · L2278 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
  - chama: `cacheGroupMeta` L566, `recordGroupParticipants` L2178, `resolveParticipantNames` L2247, `sk` L2072, `toGroupInfo` L432, `toGroupJid` L476
- `createGroup(subject, participants)` · L2286 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `recordGroupParticipants` L2178, `resolveParticipants` L2105, `sk` L2072, `toGroupInfo` L432
- `updateParticipants(jid, action, participants)` · L2296 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `resolveParticipants` L2105, `sk` L2072, `toGroupJid` L476
- `leaveGroup(jid)` · L2304 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `sk` L2072, `toGroupJid` L476
- `setGroupSubject(jid, subject)` · L2307 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `sk` L2072, `toGroupJid` L476
- `setGroupDescription(jid, description)` · L2310 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `sk` L2072, `toGroupJid` L476
- `groupInviteCode(jid)` · L2313 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `sk` L2072, `toGroupJid` L476
- `groupRevokeInvite(jid)` · L2316 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `sk` L2072, `toGroupJid` L476
- `groupMembershipRequests(jid)` · L2322 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `sk` L2072, `toGroupJid` L476
- `groupMembershipAction(jid, action, participants)` · L2334 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `resolveParticipants` L2105, `sk` L2072, `toGroupJid` L476
- `setGroupSetting(jid, setting, enabled)` · L2356 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `sk` L2072, `toGroupJid` L476
- `setGroupPhoto(jid, image, _mimetype)` · L2373 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `sk` L2072, `toGroupJid` L476
- `checkNumbers(numbers)` · L2382 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `sk` L2072
- `profilePicture(jid)` · L2397 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `sk` L2072, `toContactJid` L479
- `setBlock(jid, action)` · L2406 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `sk` L2072, `toContactJid` L479
- `saveContact(jid, input)` · L2409 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `sk` L2072, `toContactJid` L479
- `removeContact(jid)` · L2422 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `sk` L2072, `toContactJid` L479
- `createChannel(name, description)` · L2427 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `sk` L2072, `toChannelInfo` L465
- `channelInfo(jid)` · L2434 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `sk` L2072, `toChannelInfo` L465
- `followChannel(jid)` · L2438 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `sk` L2072
- `unfollowChannel(jid)` · L2441 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
  - chama: `sk` L2072
- `waitForPairingReady(sock)` · L2445 · private · async
  - chamado por: `requestPairingCode` L2471
- `requestPairingCode(phoneNumber)` · L2471 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `getStatus` L580, `setStatus` L588, `waitForPairingReady` L2445
- `stop()` · L2491
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L2498, `serialize` L598
- `doStop()` · L2498 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L575, `detachSocketListeners` L2518, `setStatus` L588
  - chamado por: `stop` L2491
- `detachSocketListeners()` · L2518 · private
  - chamado por: `connect` L620, `doLogout` L2563, `doStop` L2498, `onConnectionUpdate` L936, `shutdown` L2541
- `shutdown()` · L2541 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L575, `detachSocketListeners` L2518
- `logout()` · L2558
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L2563, `serialize` L598
- `doLogout()` · L2563 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearCredentials` L2589, `clearReconnectTimer` L575, `detachSocketListeners` L2518, `setStatus` L588
  - chamado por: `logout` L2558
- `clearCredentials()` · L2589 · private · async
  - chama: `PostgresSessionLease.clearAuth` (postgres-session-lease.ts:133)
  - chamado por: `doLogout` L2563, `onConnectionUpdate` L936

**Funções e constantes de topo**
- `staleVersion()` · L169
  - chamado por: `latestBaileysVersion` L175
- `latestBaileysVersion(logger)` · L175 · async
  - chama: `staleVersion` L169
  - chamado por: `connect` L620
- `contactToRecord(c, source)` · L232
  - chamado por: `onContacts` L2171
- `encodeProto(msg)` · L257
  - chamado por: `emitOutbound` L1789, `forwardTo` L1946, `handleIncomingMedia` L1503, `onMessagesUpsert` L1205, `sendMedia` L1680, `sendText` L1647
- `decodeProto(value)` · L260
  - chamado por: `loadMessageForRetry` L2018, `prepareForward` L1876
- `mapBaileysReaction(key, reaction, ourJid)` · L278
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L305
  - chamado por: `onReactions` L831
- `phoneFirst(a, b)` · L305
  - chamado por: `groupSenderOf` L894, `mapBaileysReaction` L278
- `extOf(mimetype, fileName)` · L310
  - chamado por: `handleIncomingMedia` L1503, `sendMedia` L1680
- `mapAckStatus(status)` · L324
  - chamado por: `onMessagesUpdate` L1319
- `buildMediaContent(input)` · L344
  - chamado por: `sendMedia` L1680
- `resolveParticipantPhone(p, lidToPn)` · L382
  - chamado por: `recordGroupParticipants` L2178, `resolveParticipantNames` L2247, `toGroupInfo` L432
- `dirNameFor(p, phone, names)` · L418
  - chamado por: `toGroupInfo` L432
- `toGroupInfo(md, lidToPn, names)` · L432
  - chama: `dirNameFor` L418, `resolveParticipantPhone` L382
  - chamado por: `createGroup` L2286, `groupInfo` L2278, `listGroups` L2270
- `toChannelInfo(md)` · L465
  - chamado por: `channelInfo` L2434, `createChannel` L2427
- `toGroupJid(jid)` · L476
  - chamado por: `groupInfo` L2278, `groupInviteCode` L2313, `groupMembershipAction` L2334, `groupMembershipRequests` L2322, `groupRevokeInvite` L2316, `leaveGroup` L2304, `setGroupDescription` L2310, `setGroupPhoto` L2373, `setGroupSetting` L2356, `setGroupSubject` L2307, `updateParticipants` L2296
- `toContactJid(jid)` · L479
  - chamado por: `profilePicture` L2397, `removeContact` L2422, `saveContact` L2409, `setBlock` L2406
- `cappingCycleEnd(value)` · L508
  - chamado por: `onMessageCapping` L1381
- `toJid(to)` · L2601
  - chamado por: `forwardTo` L1946, `markRead` L1850, `resolveJid` L1821, `sendPresence` L1826, `sendReaction` L1858

**Tipos**
- interface `BaileysEngineDeps` L84 · 21 propriedade(s)
- type `BaileysVersion` L150
- type `VersionSelection` L153
- type `RawParticipant` L371
- type `RawGroup` L398
- type `RawNewsletter` L408

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

## `modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`

201 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.proxy.spec.ts`
- importa (interno): `modules/proxies/application/proxy-unavailable.error.ts`, `modules/sessions/application/session-lease.error.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “Baileys — proxy obrigatório pela atribuição (E15/P-058)” · L81
  - it “SINGLE inválido fica FAILED antes de consultar versão/criar socket, mesmo sem guard global” · L82
  - it “pool esgotado na reconexão não cria outro socket nem cai para saída direta” · L111
  - it “falha de proxy no retry quieto 440 não publica FAILED de uma réplica substituída” · L142

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:620)

**Tipos**
- type `BrowserFingerprint` L13

## `modules/sessions/infrastructure/baileys/disconnect-policy.ts`

80 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/disconnect-policy.ts`
- importa (interno): `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `disconnectDetails(error)` · L12
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:936)
- `classifyDisconnect(code, _reason)` · L29
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:936)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:620)
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
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1205)

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:564), `WWebJSEngine.constructor` (wwebjs.engine.ts:467)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)

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
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1735), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1865)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1764), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1899)
- `formatEvent(name, description)` · L135
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)

**Tipos**
- interface `ContentMedia` L14 · 5 propriedade(s)
- type `DescribedMessage` L22

## `modules/sessions/infrastructure/postgres-session-lease.ts`

158 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/postgres-session-lease.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/application/session-lease.error.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`

**class `PostgresSessionLease`** L18
- injeta (construtor): `prisma: PrismaService`
- `owner` · L19 · campo
- `TTL_MS` · L20 · static · campo
- `constructor(prisma)` · L22
  - chamado por: `SessionManager.constructor` (session-manager.service.ts:114)
- `acquire(sessionId)` · L24 · async
  - chamado por: `SessionManager.ensureLease` (session-manager.service.ts:138)
- `renew(sessionId, epoch)` · L39 · async
  - chamado por: `SessionManager.scheduleRenew` (session-manager.service.ts:157)
- `release(sessionId, epoch)` · L48 · async
  - chamado por: `SessionManager.releaseLease` (session-manager.service.ts:241)
- `isCurrent(sessionId, epoch)` · L55 · async
  - chamado por: `SessionManager.ownedWorking` (session-manager.service.ts:1439), `SessionManager.sending` (session-manager.service.ts:1398)
- `fenced(sessionId, epoch, action, timeoutMs)` · L63 · async
  - chama: `LeaseLostError.constructor` (session-lease.error.ts:2)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392), `SessionManager.purgeAuthDir` (session-manager.service.ts:993), `SessionManager.removeUnlocked` (session-manager.service.ts:1153), `SessionManager.startUnlocked` (session-manager.service.ts:741), `usePostgresAuthState` (postgres-auth-state.ts:21), `clearAuth` L133, `setLastMeJid` L145, `updateLastErrorDetails` L118, `updateStatus` L83, `FencedLocalAuth.beforeBrowserInitialized` (wwebjs.engine.ts:105), `FencedLocalAuth.logout` (wwebjs.engine.ts:113)
- `updateStatus(sessionId, epoch, status, patch)` · L83 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:939), `SessionManager.persistStatus` (session-manager.service.ts:694), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048), `SessionManager.startWithTimeout` (session-manager.service.ts:794), `SessionManager.stopUnlocked` (session-manager.service.ts:895)
  - banco: `waSession.update`
- `updateLastErrorDetails(sessionId, epoch, details)` · L118 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
  - banco: `waSession.update`
- `clearAuth(sessionId, epoch)` · L133 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.logoutUnlocked` (session-manager.service.ts:939), `SessionManager.newQrUnlocked` (session-manager.service.ts:1128), `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048), `BaileysEngine.clearCredentials` (baileys.engine.ts:2589)
  - banco: `waAuthKey.deleteMany`, `waSession.update`
- `setLastMeJid(sessionId, epoch, jid)` · L145 · async
  - chama: `fenced` L63
  - chamado por: `SessionManager.rejectConnectedAccount` (session-manager.service.ts:1048)
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
- importado por: `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`

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
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2201), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:2002), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2946)
- `FORWARDABLE_TYPES` = `new Set([ 'chat', 'image', 'video', 'ptv', 'audio', 'ptt', 'document'…` · L190
- `wwebjsForwardBlock(msg)` · L210
  - chamado por: `WWebJSEngine.prepareForward` (wwebjs.engine.ts:2002)
- `serializedOf(k)` · L248
  - chamado por: `jidOf` L257, `mapWwebjsReaction` L285
- `jidOf(v)` · L257
  - chama: `serializedOf` L248
  - chamado por: `mapWwebjsReaction` L285, `wwebjsGroupSender` L269
- `wwebjsGroupSender(chatRaw, author, lidToPn)` · L269
  - chama: `jidOf` L257
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2201), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2946)
- `mapWwebjsReaction(r)` · L285
  - chama: `jidOf` L257, `serializedOf` L248
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:2475)

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
  - chamado por: `WWebJSEngine.mediaQueue` (wwebjs.engine.ts:437)
- `run(task, signal)` · L11
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2285), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1772)

**class `MediaDeadlineError`** L33 · `extends Error`
- injeta (construtor): `ms: number (param)`
- `constructor(ms)` · L34
  - chamado por: `mediaDeadline` L59

**Funções e constantes de topo**
- `collectMediaStream(stream, maxBytes)` · L39 · async
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2285)
- `mediaDeadline(work, ms)` · L59 · async
  - chama: `constructor` L34
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2285), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1772)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

3365 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/application/session-lease.error.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`, `modules/sessions/infrastructure/message-content.ts`, `shared-kernel/memory.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/wwebjs-version.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/proxies/application/proxy-failure.ts`
- importado por: `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `FencedLocalAuth`** L93 · `extends LocalAuth`
- injeta (construtor): `sessionId: string (param)` · `lease: NonNullable<BaileysEngineDeps['lease']>` · `epoch: bigint` · `isCurrentClient: () => boolean` · `mayInitialize: () => boolean` · `onLogout: () => void`
- `constructor(sessionId, lease, epoch, isCurrentClient, mayInitialize, on…)` · L94
  - chamado por: `doStart` L775
- `beforeBrowserInitialized()` · L105 · async
  - chama: `PostgresSessionLease.fenced` (postgres-session-lease.ts:63)
- `logout()` · L113 · async
  - chama: `PostgresSessionLease.fenced` (postgres-session-lease.ts:63), `detachAuthDir` L745, `purgeDetachedAuthDir` L757

**class `WWebJSEngine`** L397 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L398 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L399 · private · campo
- `logoutPending` · L400 · private · campo
- `logoutAttempted` · L401 · private · campo
- `status` · L402 · private · campo
- `qrBase64` · L403 · private · campo
- `stopped` · L404 · private · campo
- `lidToPnCache` · L407 · private · campo
- `pnToLidOutbound` · L411 · private · campo
- `sentByPanel` · L414 · private · campo
- `forwardEchoes` · L416 · private · campo
  - chama: `ForwardEchoRegistry.constructor` (wwebjs.forward-echo.ts:51)
- `forwardEchoWaitMs` · L418 · private · campo
- `forwardEchoTtlMs` · L419 · private · campo
- `forwardEchoGraceMs` · L420 · private · campo
- `forwardOpTimeoutMs` · L421 · private · campo
- `anonProxyUrl` · L424 · private · campo
- `lifecycle` · L432 · private · campo
- `reconnectAttempts` · L434 · private · campo
- `pairingRenewals` · L435 · private · campo
- `pageHeals` · L436 · private · campo
- `mediaQueue` · L437 · private · campo
  - chama: `SessionMediaQueue.constructor` (wwebjs-media.ts:9)
- `autoDownloadGroupMedia` · L438 · private · campo
- `addressBookSynced` · L439 · private · campo
- `lastLoadingPct` · L444 · private · campo
- `logoutTimeoutMs` · L447 · private · campo
- `destroyTimeoutMs` · L451 · private · campo
- `generation` · L455 · private · campo
- `lastQrAt` · L457 · private · campo
- `qrHeals` · L459 · private · campo
- `qrWatchdogIntervalMs` · L461 · private · campo
- `qrStaleMs` · L462 · private · campo
- `initTimeoutMs` · L463 · private · campo
- `lastPairingCode` · L465 · private · campo
- `constructor(deps)` · L467
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L471 · private
  - chamado por: `doStart` L775, `handleDisconnect` L1387, `healWedgedPage` L2859, `logout` L1660, `qrWatchdogTick` L592, `start` L761, `stop` L1591
- `getStatus()` · L480
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
- `getQrBase64()` · L483
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `getPairingCode()` · L486
  - implementa: `IEngine.getPairingCode` (engine.port.ts:382)
- `setStatus(status, extra)` · L490 · private
  - chama: `startQrWatchdog` L577, `startSyncWatchdog` L649, `stopMemoryProfile` L528, `stopQrWatchdog` L587, `stopSyncWatchdog` L660
  - chamado por: `doLogout` L1665, `doStart` L775, `doStop` L1598, `handleDisconnect` L1387, `handleInitFailure` L1270, `healWedgedPage` L2859, `qrWatchdogTick` L592, `requestPairingCode` L1728, `syncWatchdogTick` L667
- `startMemoryProfile(client)` · L514 · private
  - chama: `recordMemoryProfile` L533
  - chamado por: `doStart` L775
- `stopMemoryProfile()` · L528 · private
  - chamado por: `destroyWithTimeout` L1494, `setStatus` L490, `shutdown` L1631
- `recordMemoryProfile(client)` · L533 · private · async
  - chama: `chromiumTreePss` (memory.ts:43)
  - chamado por: `startMemoryProfile` L514
- `startQrWatchdog()` · L577 · private
  - chama: `qrWatchdogTick` L592
  - chamado por: `setStatus` L490
- `stopQrWatchdog()` · L587 · private
  - chamado por: `qrWatchdogTick` L592, `setStatus` L490
- `qrWatchdogTick()` · L592 · private · async
  - chama: `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `doStart` L775, `serialize` L471, `setStatus` L490, `stopQrWatchdog` L587
  - chamado por: `startQrWatchdog` L577
- `watchdogFails` · L644 · private · campo
- `watchdogDegraded` · L645 · private · campo
- `WATCHDOG_INTERVAL_MS` · L646 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L647 · private · static · campo
- `startSyncWatchdog()` · L649 · private
  - chama: `syncWatchdogTick` L667
  - chamado por: `setStatus` L490
- `stopSyncWatchdog()` · L660 · private
  - chamado por: `setStatus` L490, `shutdown` L1631
- `syncWatchdogTick()` · L667 · private · async
  - chama: `isPageCrashError` L159, `raceStoreOp` L370, `healWedgedPage` L2859, `setStatus` L490, `syncHint` L2844
  - chamado por: `startSyncWatchdog` L649
- `clearStaleSingletonLocks()` · L729 · private · async
  - chama: `authDirOf` L268
  - chamado por: `doStart` L775
- `detachAuthDir(sessionId)` · L745 · static
  - chama: `authDirOf` L268
  - chamado por: `SessionManager.purgeAuthDir` (session-manager.service.ts:993), `SessionManager.removeUnlocked` (session-manager.service.ts:1153), `logout` L113
- `purgeDetachedAuthDir(detached)` · L757 · static · async
  - chamado por: `SessionManager.purgeAuthDir` (session-manager.service.ts:993), `SessionManager.removeUnlocked` (session-manager.service.ts:1153), `logout` L113
- `start()` · L761
  - implementa: `IEngine.start` (engine.port.ts:329)
  - chama: `doStart` L775, `serialize` L471
- `doStart(attempt, forceLive)` · L775 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2), `buildAuthProxyUrl` L254, `constructor` L94, `raceStoreOp` L370, `userAgentFor` L183, `checkPinnedBuildAge` L1143, `clearStaleSingletonLocks` L729, `closeAnonProxy` L1476, `consumeCleanShutdownMarker` L1561, `destroyWithTimeout` L1494, `ensureWebVersionHtml` L1189, `handleDisconnect` L1387, `handleInitFailure` L1270, `mergeExistingLids` L2680, `onMessageAck` L2451, `onMessageCreate` L2201, `onReaction` L2475, `resolveWebVersion` L1223, `serialize` L471, `setStatus` L490, `startMemoryProfile` L514, `syncAddressBook` L2708
  - chamado por: `handleDisconnect` L1387, `handleInitFailure` L1270, `qrWatchdogTick` L592, `start` L761
- `checkPinnedBuildAge(version)` · L1143 · private · async
  - chama: `loadBuildCatalog` L274
  - chamado por: `doStart` L775
- `ensureWebVersionHtml(version)` · L1189 · private · async
  - chamado por: `doStart` L775
- `resolveWebVersion(mode, forceLive)` · L1223 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2)
  - chamado por: `doStart` L775
- `handleInitFailure(e, attempt, pinnedVersion)` · L1270 · private · async
  - chama: `classifyProxyFailure` (proxy-failure.ts:5), `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `doStart` L775, `setStatus` L490
  - chamado por: `doStart` L775
- `handleDisconnect(reason)` · L1387 · private · async
  - chama: `raceStoreOp` L370, `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `doStart` L775, `serialize` L471, `setStatus` L490
  - chamado por: `doStart` L775
- `closeAnonProxy()` · L1476 · private · async
  - chamado por: `doLogout` L1665, `doStart` L775, `doStop` L1598, `handleDisconnect` L1387, `handleInitFailure` L1270, `healWedgedPage` L2859, `qrWatchdogTick` L592, `shutdown` L1631
- `destroyWithTimeout()` · L1494 · private · async
  - chama: `stopMemoryProfile` L528, `chromiumProcessTree` (memory.ts:17)
  - chamado por: `doLogout` L1665, `doStart` L775, `doStop` L1598, `handleDisconnect` L1387, `handleInitFailure` L1270, `healWedgedPage` L2859, `qrWatchdogTick` L592, `shutdown` L1631
- `markCleanShutdown()` · L1544 · private · async
  - chama: `authDirOf` L268
  - chamado por: `doStop` L1598, `shutdown` L1631
- `consumeCleanShutdownMarker()` · L1561 · private · async
  - chama: `authDirOf` L268
  - chamado por: `doStart` L775
- `stop()` · L1591
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L1598, `serialize` L471
- `doStop()` · L1598 · private · async
  - chama: `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `markCleanShutdown` L1544, `setStatus` L490
  - chamado por: `stop` L1591
- `shutdown()` · L1631 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `markCleanShutdown` L1544, `stopMemoryProfile` L528, `stopSyncWatchdog` L660
- `logout()` · L1660
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L1665, `serialize` L471
- `doLogout()` · L1665 · private · async
  - chama: `raceStoreOp` L370, `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `setStatus` L490
  - chamado por: `logout` L1660
- `requestPairingCode(phoneNumber)` · L1728 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `req` L2752, `setStatus` L490
- `sendText(to, text, opts)` · L1742 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `assertPageResponsive` L2817, `rememberPanel` L2489, `req` L2752, `toChatId` L2747, `toMentionIds` L2192, `withLidFallback` L2584
- `sendMedia(to, input)` · L1772 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `PendingMediaSendError.constructor` (engine.port.ts:24), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `sendMediaQueued` L1791
- `sendMediaQueued(to, input)` · L1791 · private · async
  - chama: `extOf` L205, `assertPageResponsive` L2817, `rememberPanel` L2489, `req` L2752, `toChatId` L2747, `toMentionIds` L2192, `withLidFallback` L2584
  - chamado por: `sendMedia` L1772
- `sendLocation(to, input)` · L1865 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2817, `emitOutbound` L1929, `rememberPanel` L2489, `req` L2752, `toChatId` L2747, `withLidFallback` L2584
- `sendPoll(to, input)` · L1899 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2817, `emitOutbound` L1929, `rememberPanel` L2489, `req` L2752, `toChatId` L2747, `withLidFallback` L2584
- `emitOutbound(keyId, jid, type, text, opts)` · L1929 · private
  - chamado por: `sendLocation` L1865, `sendPoll` L1899
- `setProfileStatus(status)` · L1951 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `req` L2752
- `setProfileName(name)` · L1954 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `req` L2752
- `setProfilePhoto(image, mimetype)` · L1957 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `req` L2752
- `sendPresence(to, state)` · L1962 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `req` L2752, `toChatId` L2747, `withLidFallback` L2584
- `markRead(chatJid, _msgId)` · L1980 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `req` L2752, `toChatId` L2747, `withLidFallback` L2584
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1989 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `req` L2752, `withStoreReady` L2769
- `prepareForward(src)` · L2002 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2817, `forwardTo` L2039, `req` L2752, `withStoreReady` L2769
- `forwardTo(msg, type, text, src, to, opts)` · L2039 · private · async
  - chama: `assertPageResponsive` L2817, `req` L2752, `toChatId` L2747, `withLidFallback` L2584, `ForwardEchoRegistry.expect` (wwebjs.forward-echo.ts:60)
  - chamado por: `prepareForward` L2002
- `matchForwardEcho(msg, d, keyId)` · L2127 · private
  - chama: `ForwardEchoRegistry.match` (wwebjs.forward-echo.ts:103)
  - chamado por: `onMessageCreate` L2201
- `emitForwardEcho(msg, d, keyId, echo)` · L2147 · private
  - chama: `handleIncomingMedia` L2285, `rememberPanel` L2489
  - chamado por: `onMessageCreate` L2201
- `toMentionIds(mentions)` · L2192 · private
  - chama: `toChatId` L2747
  - chamado por: `sendMediaQueued` L1791, `sendText` L1742
- `onMessageCreate(msg)` · L2201 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L220, `emitForwardEcho` L2147, `handleIncomingMedia` L2285, `matchForwardEcho` L2127, `resolveNumberJid` L2500
  - chamado por: `doStart` L775
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L2285 · private · async
  - chama: `collectMediaStream` (wwebjs-media.ts:39), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `extOf` L205, `isPageCrashError` L159, `mapInboundMediaType` L220, `healWedgedPage` L2859
  - chamado por: `emitForwardEcho` L2147, `onMessageCreate` L2201
- `mapAck(ack)` · L2437 · private
  - chamado por: `onMessageAck` L2451
- `onMessageAck(msg, ack)` · L2451 · private
  - chama: `mapAck` L2437
  - chamado por: `doStart` L775
- `onReaction(r)` · L2475 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:285), `resolveNumberJid` L2500
  - chamado por: `doStart` L775
- `rememberPanel(keyId)` · L2489 · private
  - chamado por: `emitForwardEcho` L2147, `sendLocation` L1865, `sendMediaQueued` L1791, `sendPoll` L1899, `sendText` L1742
- `resolveNumberJid(rawId)` · L2500 · private · async
  - chama: `cacheLidPn` L2521, `mergeLidMessages` L2656, `resolveLidToPhone` L2532
  - chamado por: `mergeExistingLids` L2680, `onMessageCreate` L2201, `onReaction` L2475, `toHistoryMessage` L2946
- `cacheLidPn(lid, phoneJid)` · L2521 · private
  - chamado por: `rememberOutboundLid` L2633, `resolveNumberJid` L2500, `resolvePendingLids` L3137
- `resolveLidToPhone(lid)` · L2532 · private · async
  - chamado por: `resolveNumberJid` L2500, `resolvePendingLids` L3137
- `withLidFallback(pnJid, op)` · L2584 · private · async
  - chama: `rememberOutboundLid` L2633, `resolvePhoneToLid` L2608, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `forwardTo` L2039, `markRead` L1980, `sendLocation` L1865, `sendMediaQueued` L1791, `sendPoll` L1899, `sendPresence` L1962, `sendText` L1742
- `resolvePhoneToLid(phoneJid)` · L2608 · private · async
  - chamado por: `withLidFallback` L2584
- `rememberOutboundLid(pnJid, lid)` · L2633 · private
  - chama: `cacheLidPn` L2521
  - chamado por: `withLidFallback` L2584
- `mergeLidMessages(lid, phoneJid)` · L2656 · private · async
  - chamado por: `resolveNumberJid` L2500
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2680 · private · async
  - chama: `resolveNumberJid` L2500
  - chamado por: `doStart` L775
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2708 · private · async
  - chama: `req` L2752, `withStoreReady` L2769
  - chamado por: `doStart` L775
- `toChatId(to)` · L2747 · private
  - chamado por: `createGroup` L3173, `fetchChatHistory` L2928, `forwardTo` L2039, `groupMembershipAction` L3243, `markRead` L1980, `profilePicture` L3291, `sendLocation` L1865, `sendMediaQueued` L1791, `sendPoll` L1899, `sendPresence` L1962, `sendText` L1742, `setBlock` L3302, `setChatFlag` L2983, `toMentionIds` L2192, `updateParticipants` L3188
- `req()` · L2752 · private
  - chamado por: `channelInfo` L3344, `checkNumbers` L3280, `createChannel` L3326, `createGroup` L3173, `fetchChatHistory` L2928, `followChannel` L3357, `forwardTo` L2039, `getGroupChat` L3030, `listChats` L2908, `listGroups` L3011, `markRead` L1980, `prepareForward` L2002, `profilePicture` L3291, `removeContact` L3321, `requestPairingCode` L1728, `resolvePendingLids` L3137, `saveContact` L3310, `sendLocation` L1865, `sendMediaQueued` L1791, `sendPoll` L1899, `sendPresence` L1962, `sendReaction` L1989, `sendText` L1742, `setBlock` L3302, `setChatFlag` L2983, `setProfileName` L1954, `setProfilePhoto` L1957, `setProfileStatus` L1951, `syncAddressBook` L2708, `unfollowChannel` L3361
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2769 · private · async
  - chama: `isPageCrashError` L159, `raceStoreOp` L370, `assertPageResponsive` L2817, `healWedgedPage` L2859, `syncHint` L2844
  - chamado por: `channelInfo` L3344, `checkNumbers` L3280, `createChannel` L3326, `createGroup` L3173, `fetchChatHistory` L2928, `followChannel` L3357, `getGroupChat` L3030, `listChats` L2908, `listGroups` L3011, `prepareForward` L2002, `profilePicture` L3291, `removeContact` L3321, `saveContact` L3310, `sendReaction` L1989, `setBlock` L3302, `setChatFlag` L2983, `syncAddressBook` L2708, `unfollowChannel` L3361
- `assertPageResponsive(probeTimeoutMs)` · L2817 · private · async
  - chama: `isPageCrashError` L159, `raceStoreOp` L370, `healWedgedPage` L2859, `syncHint` L2844
  - chamado por: `forwardTo` L2039, `prepareForward` L2002, `sendLocation` L1865, `sendMediaQueued` L1791, `sendPoll` L1899, `sendText` L1742, `withStoreReady` L2769
- `syncHint()` · L2844 · private
  - chamado por: `assertPageResponsive` L2817, `syncWatchdogTick` L667, `withStoreReady` L2769
- `lastHealAt` · L2855 · private · campo
- `healing` · L2856 · private · campo
- `HEAL_COOLDOWN_MS` · L2857 · private · static · campo
- `healWedgedPage()` · L2859 · private · async
  - chama: `closeAnonProxy` L1476, `destroyWithTimeout` L1494, `serialize` L471, `setStatus` L490
  - chamado por: `assertPageResponsive` L2817, `handleIncomingMedia` L2285, `syncWatchdogTick` L667, `withStoreReady` L2769
- `listChats(limit)` · L2908 · async
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `req` L2752, `withStoreReady` L2769
- `fetchChatHistory(chatJid, limit)` · L2928 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `req` L2752, `toChatId` L2747, `toHistoryMessage` L2946, `withStoreReady` L2769
- `toHistoryMessage(msg)` · L2946 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L220, `resolveNumberJid` L2500
  - chamado por: `fetchChatHistory` L2928
- `setChatFlag(chatJid, flag, enabled)` · L2983 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `req` L2752, `toChatId` L2747, `withStoreReady` L2769
- `listGroups()` · L3011 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `groupFlags` L239, `req` L2752, `withStoreReady` L2769
- `getGroupChat(jid)` · L3030 · private · async
  - chama: `req` L2752, `toGroupId` L3169, `withStoreReady` L2769
  - chamado por: `groupInfo` L3039, `groupInviteCode` L3213, `groupMembershipAction` L3243, `groupMembershipRequests` L3225, `groupRevokeInvite` L3217, `leaveGroup` L3201, `setGroupDescription` L3209, `setGroupPhoto` L3269, `setGroupSetting` L3258, `setGroupSubject` L3205, `updateParticipants` L3188
- `groupInfo(jid)` · L3039 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
  - chama: `groupFlags` L239, `getGroupChat` L3030, `resolveParticipantsBatch` L3067
  - chamado por: `createGroup` L3173
- `LID_BATCH` · L3056 · private · static · campo
- `resolveParticipantsBatch(list)` · L3067 · private · async
  - chama: `resolvePendingLids` L3137
  - chamado por: `groupInfo` L3039
- `resolvePendingLids(rows)` · L3137 · private · async
  - chama: `cacheLidPn` L2521, `req` L2752, `resolveLidToPhone` L2532
  - chamado por: `resolveParticipantsBatch` L3067
- `toGroupId(jid)` · L3169 · private
  - chamado por: `getGroupChat` L3030
- `createGroup(subject, participants)` · L3173 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `groupInfo` L3039, `req` L2752, `toChatId` L2747, `withStoreReady` L2769
- `updateParticipants(jid, action, participants)` · L3188 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `getGroupChat` L3030, `toChatId` L2747
- `leaveGroup(jid)` · L3201 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `getGroupChat` L3030
- `setGroupSubject(jid, subject)` · L3205 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `getGroupChat` L3030
- `setGroupDescription(jid, description)` · L3209 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `getGroupChat` L3030
- `groupInviteCode(jid)` · L3213 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `getGroupChat` L3030
- `groupRevokeInvite(jid)` · L3217 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `getGroupChat` L3030
- `groupMembershipRequests(jid)` · L3225 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `getGroupChat` L3030
- `groupMembershipAction(jid, action, participants)` · L3243 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `getGroupChat` L3030, `toChatId` L2747
- `setGroupSetting(jid, setting, enabled)` · L3258 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `getGroupChat` L3030
- `setGroupPhoto(jid, image, mimetype)` · L3269 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `getGroupChat` L3030
- `checkNumbers(numbers)` · L3280 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `req` L2752, `withStoreReady` L2769
- `profilePicture(jid)` · L3291 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `req` L2752, `toChatId` L2747, `withStoreReady` L2769
- `setBlock(jid, action)` · L3302 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `req` L2752, `toChatId` L2747, `withStoreReady` L2769
- `saveContact(jid, input)` · L3310 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `req` L2752, `withStoreReady` L2769
- `removeContact(jid)` · L3321 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `req` L2752, `withStoreReady` L2769
- `createChannel(name, description)` · L3326 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `req` L2752, `withStoreReady` L2769
- `channelInfo(jid)` · L3344 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `req` L2752, `withStoreReady` L2769
- `followChannel(jid)` · L3357 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `req` L2752, `withStoreReady` L2769
- `unfollowChannel(jid)` · L3361 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
  - chama: `req` L2752, `withStoreReady` L2769

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L155
- `isPageCrashError(message)` · L159
  - chamado por: `assertPageResponsive` L2817, `handleIncomingMedia` L2285, `syncWatchdogTick` L667, `withStoreReady` L2769
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L167
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` = `/^(true|1|yes|on)$/i.test( process.env.WWEBJS_AUTO_DOWNLOAD_GROUP_MED…` · L172
  - env: `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA`
- `userAgentFor(sessionId)` · L183
  - chamado por: `doStart` L775
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L205
  - chamado por: `handleIncomingMedia` L2285, `sendMediaQueued` L1791
- `mapInboundMediaType(t)` · L220
  - chamado por: `handleIncomingMedia` L2285, `onMessageCreate` L2201, `toHistoryMessage` L2946
- `groupFlags(g)` · L239
  - chamado por: `groupInfo` L3039, `listGroups` L3011
- `buildAuthProxyUrl(server, username, password)` · L254
  - chamado por: `doStart` L775
- `authDirOf(sessionId)` · L268
  - chamado por: `clearStaleSingletonLocks` L729, `consumeCleanShutdownMarker` L1561, `detachAuthDir` L745, `markCleanShutdown` L1544
- `loadBuildCatalog()` · L274 · async
  - chamado por: `checkPinnedBuildAge` L1143
- `WWEBJS_MSG_ID` = `/^(true|false)_[^_]+_[^_]+(_[^_]+)?$/` · L325
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L336
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L364
- `raceStoreOp(op, ms, timeoutMsg)` · L370 · async
  - chamado por: `assertPageResponsive` L2817, `doLogout` L1665, `doStart` L775, `handleDisconnect` L1387, `syncWatchdogTick` L667, `withStoreReady` L2769

**Tipos**
- interface `BuildCatalogEntry` L347 · 3 propriedade(s)
- interface `BuildCatalog` L352 · 3 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`

136 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

**class `ForwardEchoRegistry`** L48
- injeta (construtor): `now: () => number`
- `pending` · L49 · private · campo
- `constructor(now)` · L51
  - chamado por: `WWebJSEngine.forwardEchoes` (wwebjs.engine.ts:416)
- `size()` · L53 · getter
- `expect(input, ttlMs)` · L60
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.forwardTo` (wwebjs.engine.ts:2039)
- `match(tos, type, text, keyId, fwd)` · L103
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.matchForwardEcho` (wwebjs.engine.ts:2127)
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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:2584)
- `pageResolvePnToLid(pnJid)` · L92

**Tipos**
- interface `LidFallbackDeps` L29 · 5 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

464 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`
- importa (interno): `modules/proxies/application/proxy-unavailable.error.ts`, `modules/sessions/application/session-lease.error.ts`

- describe “WWebJSEngine — ciclo de vida com teto (WA-08/WA-09/P-025)” · L124
  - it “proxy inválido fica FAILED antes do Client, mesmo com guard global desligado (E15)” · L133
  - it “RANGE esgotado após túnel falho não relança Client sem proxy (E15)” · L167
  - it “initialize pendurado: 1 retentativa, depois FAILED com motivo — e o mutex fica livre” · L208
  - it “callbacks do client antigo (geração morta) não mexem no status da sessão” · L230
  - it “QR emitido vira SCAN_QR_CODE; QR sem renovação dispara a recuperação (destroy + start)” · L252
  - it “ready → WORKING zera a fase de QR (watchdog de QR parado não dispara)” · L281
  - it “destroy sem confirmação rejeita stop/shutdown; uma segunda tentativa confirmada libera a engine” · L300
  - it “sem requireProxy, inicia com fake sem subir Chromium (P-073)” · L327
  - it “override da sessão escolhe a build do canário no próximo start” · L340
  - it “override inválido não alcança o cache nem cria cliente” · L366
  - it “limita renovação do código e recargas de página por ciclo” · L410
  - it “pairing code: fica disponível em getPairingCode() e some ao parar (WA-18)” · L443

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
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:258), `ProxyService.ensureAvailable` (proxy.service.ts:238), `SessionManager.start` (session-manager.service.ts:737), `SessionRepository.create` (session.repository.ts:32), `SessionRepository.delete` (session.repository.ts:48), `SessionRepository.findById` (session.repository.ts:33), `SessionRepository.findByName` (session.repository.ts:34), `SessionRepository.list` (session.repository.ts:35), `toDto` L46, `newId` (ulid.ts:4)
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
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:1299)
- `profileStatus(id, body)` · L234 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:1307)
- `profileName(id, body)` · L253 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:1310)
- `profilePhoto(id, body)` · L273 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:1313), `fetchImageByUrl` (safe-fetch.ts:204)
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
  - chama: `SessionManager.start` (session-manager.service.ts:737), `ensure` L422
- `stop(id)` · L333 · async · @Post(':id/stop')
  - chama: `ConnectLinkService.revokeOnOperatorStop` (connect-link.service.ts:226), `SessionManager.stop` (session-manager.service.ts:891), `ensure` L422
- `restart(id)` · L343 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:920), `ensure` L422
- `logout(id)` · L350 · async · @Post(':id/logout')
  - chama: `ConnectLinkService.revokeOnOperatorStop` (connect-link.service.ts:226), `SessionManager.logout` (session-manager.service.ts:935), `ensure` L422
- `remove(id)` · L358 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `ProxyService.markReleased` (proxy.service.ts:298), `SessionManager.remove` (session-manager.service.ts:1149), `ensure` L422
- `qr(id)` · L370 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:1191), `SessionManager.getQr` (session-manager.service.ts:1187), `ensure` L422
- `newQr(id)` · L386 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:989), `ensure` L422
- `pairingCode(id, body)` · L393 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:1195), `ensure` L422
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
