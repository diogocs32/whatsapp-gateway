<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 417 |
| `modules/sessions/application/session-config.service.ts` | 73 |
| `modules/sessions/application/session-manager.service.ts` | 709 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 548 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 1937 |
| `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts` | 1354 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 706 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 123 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts` | 278 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts` | 308 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 2934 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts` | 136 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts` | 906 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 327 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 226 |
| `modules/sessions/interface/dto.ts` | 53 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 414 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

417 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `ForwardSourceError`** L277 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L278
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1311), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1641)

**class `UnsupportedEngineOperationError`** L294 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L295
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1519), `BaileysEngine.listChats` (baileys.engine.ts:1514), `BaileysEngine.setChatFlag` (baileys.engine.ts:1530)

**Funções e constantes de topo**
- `MAX_FORWARD_TARGETS` = `5` · L232
- `FREQUENTLY_FORWARDED_MIN` = `5` · L233

**Tipos**
- interface `SessionStatePayload` L3 · 4 propriedade(s)
- type `MessageSource` L13
- interface `MessagePayload` L15 · 19 propriedade(s)
- type `AckStatus` L53
- interface `MessageAckPayload` L55 · 5 propriedade(s)
- interface `ReactionPayload` L64 · 6 propriedade(s)
- type `EngineEventName` L73
- type `EngineEventHandler` L75
- type `GuardrailEventName` L82
- type `WaEventName` L93
- interface `WaEventEnvelope` L96 · 7 propriedade(s)
- type `MediaSendType` L106
- interface `SendOptions` L111 · 3 propriedade(s)
- interface `SendMediaInput` L119 · 6 propriedade(s)
- interface `SendLocationInput` L129 · 4 propriedade(s)
- interface `SendPollInput` L135 · 3 propriedade(s)
- type `GroupParticipantRole` L142
- type `GroupParticipantAction` L143
- interface `GroupParticipantInfo` L145 · 4 propriedade(s)
- interface `GroupInfo` L151 · 8 propriedade(s)
- interface `ContactCheck` L161 · 3 propriedade(s)
- interface `MembershipRequest` L169 · 3 propriedade(s)
- type `GroupSettingKey` L176
- type `MembershipAction` L177
- interface `SaveContactInput` L182 · 3 propriedade(s)
- interface `ChannelInfo` L187 · 4 propriedade(s)
- interface `ChatSummary` L196 · 6 propriedade(s)
- type `ChatFlag` L207
- interface `HistoryMessage` L211 · 13 propriedade(s)
- interface `ForwardSource` L238 · 12 propriedade(s)
- interface `SendResult` L255 · 5 propriedade(s)
- interface `PreparedForward` L266 · 1 propriedade(s)
  - `PreparedForward.send(to, opts)` · L268
    - chamado por: `ForwardService.sendOne` (forward.service.ts:357)
- type `ForwardErrorCode` L275
- type `PresenceState` L288
- interface `IEngine` L301 · 1 propriedade(s)
  - `IEngine.start()` · L305
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:483), `WWebJSEngine.start` (wwebjs.engine.ts:617)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:453), `SessionManager.start` (session-manager.service.ts:297)
  - `IEngine.stop()` · L306
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1830), `WWebJSEngine.stop` (wwebjs.engine.ts:1298)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:271), `SessionManager.newQr` (session-manager.service.ts:409), `SessionManager.onModuleDestroy` (session-manager.service.ts:97), `SessionManager.remove` (session-manager.service.ts:430), `SessionManager.stop` (session-manager.service.ts:370)
  - `IEngine.shutdown()` · L314
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:1879), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1326)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:97)
  - `IEngine.logout()` · L315
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:1893), `WWebJSEngine.logout` (wwebjs.engine.ts:1350)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:380)
  - `IEngine.requestPairingCode(phoneNumber)` · L316
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1822), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1387)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:453)
  - `IEngine.sendText(to, text, opts)` · L317
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1083), `WWebJSEngine.sendText` (wwebjs.engine.ts:1400)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:468)
  - `IEngine.sendMedia(to, input)` · L322
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1115), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1430)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:482)
  - `IEngine.sendLocation(to, input)` · L327
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1170), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1504)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:490)
  - `IEngine.sendPoll(to, input)` · L331
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1199), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1538)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:498)
  - `IEngine.sendPresence(to, state)` · L335
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1261), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1601)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:506)
  - `IEngine.setProfileStatus(status)` · L337
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1271), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1590)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:514)
  - `IEngine.setProfileName(name)` · L338
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1274), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1593)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:517)
  - `IEngine.setProfilePhoto(image, mimetype)` · L339
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1277), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1596)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:520)
  - `IEngine.markRead(chatJid, msgId)` · L341
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1285), `WWebJSEngine.markRead` (wwebjs.engine.ts:1619)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:528)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L345
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1293), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1628)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:552)
  - `IEngine.prepareForward(src)` · L354
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1311), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1641)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:565)
  - `IEngine.getQrBase64()` · L355
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:460), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:406)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:445)
  - `IEngine.getPairingCode()` · L358
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:409)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:449)
  - `IEngine.getStatus()` · L359
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:456), `WWebJSEngine.getStatus` (wwebjs.engine.ts:403)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:453), `SessionManager.sendText` (session-manager.service.ts:468), `SessionManager.working` (session-manager.service.ts:573)
  - `IEngine.listChats(limit)` · L364
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1514), `WWebJSEngine.listChats` (wwebjs.engine.ts:2477)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:533)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L365
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1519), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2497)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:536)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L369
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1530), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2552)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:543)
  - `IEngine.listGroups()` · L372
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1649), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2580)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:583)
  - `IEngine.groupInfo(jid)` · L373
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1657), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2608)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:586)
  - `IEngine.createGroup(subject, participants)` · L374
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1665), `WWebJSEngine.createGroup` (wwebjs.engine.ts:2742)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:589)
  - `IEngine.updateParticipants(jid, action, participants)` · L375
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1673), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:2757)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:596)
  - `IEngine.leaveGroup(jid)` · L380
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1681), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:2770)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:608)
  - `IEngine.setGroupSubject(jid, subject)` · L381
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1684), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:2774)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:611)
  - `IEngine.setGroupDescription(jid, description)` · L382
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1687), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:2778)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:618)
  - `IEngine.groupInviteCode(jid)` · L383
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1690), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:2782)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:625)
  - `IEngine.groupRevokeInvite(jid)` · L384
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1693), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:2786)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:628)
  - `IEngine.groupMembershipRequests(jid)` · L387
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1699), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:2794)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:631)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L388
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1711), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:2812)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:637)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L394
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1733), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:2827)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:649)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L400
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1750), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:2838)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:657)
  - `IEngine.checkNumbers(numbers)` · L403
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1759), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:2849)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:667)
  - `IEngine.profilePicture(jid)` · L404
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1774), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:2860)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:670)
  - `IEngine.setBlock(jid, action)` · L405
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1783), `WWebJSEngine.setBlock` (wwebjs.engine.ts:2871)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:673)
  - `IEngine.saveContact(jid, input)` · L407
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1786), `WWebJSEngine.saveContact` (wwebjs.engine.ts:2879)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:680)
  - `IEngine.removeContact(jid)` · L409
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1799), `WWebJSEngine.removeContact` (wwebjs.engine.ts:2890)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:687)
  - `IEngine.createChannel(name, description)` · L412
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1804), `WWebJSEngine.createChannel` (wwebjs.engine.ts:2895)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:692)
  - `IEngine.channelInfo(jid)` · L413
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1811), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:2913)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:699)
  - `IEngine.followChannel(jid)` · L414
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1815), `WWebJSEngine.followChannel` (wwebjs.engine.ts:2926)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:702)
  - `IEngine.unfollowChannel(jid)` · L415
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1818), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:2930)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:705)

## `modules/sessions/application/session-config.service.ts`

73 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-config.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionConfigService`** L23 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L25
- `get(sessionId)` · L28 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:188), `SessionsController.health` (sessions.controller.ts:179)
  - banco: `sessionConfig.upsert`
- `update(sessionId, patch)` · L36 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.patchConfig` (sessions.controller.ts:195)
  - banco: `sessionConfig.upsert`
- `capFor(cfg, state)` · L49
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:188), `SessionsController.health` (sessions.controller.ts:179), `SessionsController.patchConfig` (sessions.controller.ts:195)

**Tipos**
- interface `SessionConfigPatch` L7 · 8 propriedade(s)
- interface `CapInfo` L18 · 2 propriedade(s)

## `modules/sessions/application/session-manager.service.ts`

709 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionManager`** L50 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory`
- `logger` · L52 · private · campo
- `engines` · L53 · private · campo
- `names` · L54 · private · campo
- `lastStatusKey` · L58 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L60
- `onApplicationBootstrap()` · L71 · async
  - chama: `start` L297, `SessionRepository.findAutostart` (session.repository.ts:31)
- `onModuleDestroy()` · L97 · async
  - chama: `IEngine.shutdown` (engine.port.ts:314), `IEngine.stop` (engine.port.ts:306)
- `getOrCreateEngine(sessionId, engineType)` · L138 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:124), `handleEngineEvent` L192, `EngineFactory.create` (engine.factory.ts:11)
  - chamado por: `requestPairingCode` L453, `start` L297
- `handleEngineEvent(sessionId, name, payload)` · L192 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `persistStatus` L247, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L138
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p)` · L247 · private · async
  - chama: `discardOrphan` L271, `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `handleEngineEvent` L192
- `discarding` · L268 · private · campo
- `discardOrphan(sessionId)` · L271 · private · async
  - chama: `IEngine.stop` (engine.port.ts:306)
  - chamado por: `persistStatus` L247
- `START_TIMEOUT_MS` · L295 · private · static · campo
- `start(sessionId)` · L297 · async
  - chama: `IEngine.start` (engine.port.ts:305), `getOrCreateEngine` L138, `startWithTimeout` L308, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L409, `onApplicationBootstrap` L71, `restart` L374, `SessionsController.create` (sessions.controller.ts:96), `SessionsController.start` (sessions.controller.ts:320)
- `startWithTimeout(sessionId, op)` · L308 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L453, `start` L297
- `withTimeout(op, ms)` · L348 · private · async
  - chamado por: `logout` L380, `newQr` L409, `remove` L430, `stop` L370
- `stop(sessionId)` · L370 · async
  - chama: `IEngine.stop` (engine.port.ts:306), `withTimeout` L348
  - chamado por: `restart` L374, `SessionsController.stop` (sessions.controller.ts:327)
- `restart(sessionId)` · L374 · async
  - chama: `start` L297, `stop` L370
  - chamado por: `SessionsController.restart` (sessions.controller.ts:334)
- `logout(sessionId)` · L380 · async
  - chama: `IEngine.logout` (engine.port.ts:315), `withTimeout` L348, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:611)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:341)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L409 · async
  - chama: `IEngine.stop` (engine.port.ts:306), `start` L297, `withTimeout` L348, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:611)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:372)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L430 · async
  - chama: `IEngine.stop` (engine.port.ts:306), `withTimeout` L348, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:611)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:348)
- `getQr(sessionId)` · L445
  - chama: `IEngine.getQrBase64` (engine.port.ts:355)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `getPairingCode(sessionId)` · L449
  - chama: `IEngine.getPairingCode` (engine.port.ts:358)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `requestPairingCode(sessionId, phoneNumber)` · L453 · async
  - chama: `IEngine.getStatus` (engine.port.ts:359), `IEngine.requestPairingCode` (engine.port.ts:316), `IEngine.start` (engine.port.ts:305), `getOrCreateEngine` L138, `startWithTimeout` L308, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:379)
- `sendText(sessionId, to, text, opts)` · L468 · async
  - chama: `IEngine.getStatus` (engine.port.ts:359), `IEngine.sendText` (engine.port.ts:317)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendText` (messages.controller.ts:596)
- `sendMedia(sessionId, to, input)` · L482 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:322), `working` L573
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendMedia` (messages.controller.ts:625), `MessagesController.sendMediaUrl` (messages.controller.ts:695)
- `sendLocation(sessionId, to, input)` · L490
  - chama: `IEngine.sendLocation` (engine.port.ts:327), `working` L573
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:767)
- `sendPoll(sessionId, to, input)` · L498
  - chama: `IEngine.sendPoll` (engine.port.ts:331), `working` L573
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:806)
- `sendPresence(sessionId, to, state)` · L506
  - chama: `IEngine.sendPresence` (engine.port.ts:335), `working` L573
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `SessionsController.presence` (sessions.controller.ts:212)
- `setProfileStatus(sessionId, status)` · L514
  - chama: `IEngine.setProfileStatus` (engine.port.ts:337), `working` L573
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:228)
- `setProfileName(sessionId, name)` · L517
  - chama: `IEngine.setProfileName` (engine.port.ts:338), `working` L573
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:247)
- `setProfilePhoto(sessionId, image, mimetype)` · L520
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:339), `working` L573
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:267)
- `markRead(sessionId, chatJid, msgId)` · L528
  - chama: `IEngine.markRead` (engine.port.ts:341), `working` L573
  - chamado por: `MessagesController.markRead` (messages.controller.ts:483)
- `listChats(sessionId, limit)` · L533
  - chama: `IEngine.listChats` (engine.port.ts:364), `working` L573
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L536
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:365), `working` L573
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L543
  - chama: `IEngine.setChatFlag` (engine.port.ts:369), `working` L573
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:409)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L552
  - chama: `IEngine.sendReaction` (engine.port.ts:345), `working` L573
  - chamado por: `MessagesController.reaction` (messages.controller.ts:495)
- `prepareForward(sessionId, src)` · L565
  - chama: `IEngine.prepareForward` (engine.port.ts:354), `working` L573
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `working(sessionId)` · L573 · private
  - chama: `IEngine.getStatus` (engine.port.ts:359)
  - chamado por: `channelInfo` L699, `checkNumbers` L667, `createChannel` L692, `createGroup` L589, `fetchChatHistory` L536, `followChannel` L702, `groupInfo` L586, `groupInviteCode` L625, `groupMembershipAction` L637, `groupMembershipRequests` L631, `groupRevokeInvite` L628, `leaveGroup` L608, `listChats` L533, `listGroups` L583, `markRead` L528, `prepareForward` L565, `profilePicture` L670, `removeContact` L687, `saveContact` L680, `sendLocation` L490, `sendMedia` L482, `sendPoll` L498, `sendPresence` L506, `sendReaction` L552, `setBlock` L673, `setChatFlag` L543, `setGroupDescription` L618, `setGroupPhoto` L657, `setGroupSetting` L649, `setGroupSubject` L611, `setProfileName` L517, `setProfilePhoto` L520, `setProfileStatus` L514, `unfollowChannel` L705, `updateParticipants` L596
- `listGroups(sessionId)` · L583
  - chama: `IEngine.listGroups` (engine.port.ts:372), `working` L573
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L586
  - chama: `IEngine.groupInfo` (engine.port.ts:373), `working` L573
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L589
  - chama: `IEngine.createGroup` (engine.port.ts:374), `working` L573
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L596
  - chama: `IEngine.updateParticipants` (engine.port.ts:375), `working` L573
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L608
  - chama: `IEngine.leaveGroup` (engine.port.ts:380), `working` L573
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L611
  - chama: `IEngine.setGroupSubject` (engine.port.ts:381), `working` L573
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L618
  - chama: `IEngine.setGroupDescription` (engine.port.ts:382), `working` L573
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L625
  - chama: `IEngine.groupInviteCode` (engine.port.ts:383), `working` L573
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L628
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:384), `working` L573
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L631
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:387), `working` L573
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L637
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:388), `working` L573
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L649
  - chama: `IEngine.setGroupSetting` (engine.port.ts:394), `working` L573
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L657
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:400), `working` L573
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L667
  - chama: `IEngine.checkNumbers` (engine.port.ts:403), `working` L573
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L670
  - chama: `IEngine.profilePicture` (engine.port.ts:404), `working` L573
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L673
  - chama: `IEngine.setBlock` (engine.port.ts:405), `working` L573
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L680
  - chama: `IEngine.saveContact` (engine.port.ts:407), `working` L573
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L687
  - chama: `IEngine.removeContact` (engine.port.ts:409), `working` L573
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L692
  - chama: `IEngine.createChannel` (engine.port.ts:412), `working` L573
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L699
  - chama: `IEngine.channelInfo` (engine.port.ts:413), `working` L573
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L702
  - chama: `IEngine.followChannel` (engine.port.ts:414), `working` L573
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L705
  - chama: `IEngine.unfollowChannel` (engine.port.ts:415), `working` L573
  - chamado por: `ChannelsController.unfollow` (channels.controller.ts:56)

## `modules/sessions/domain/session-status.ts`

15 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_STATUSES` = `[ 'STOPPED', 'STARTING', 'SCAN_QR_CODE', 'PAIRING_CODE', 'WORKING', '…` · L2
- `ENGINES` = `['BAILEYS', 'WWEBJS'] as const` · L13

**Tipos**
- type `SessionStatus` L11
- type `Engine` L14

## `modules/sessions/domain/session.entity.ts`

18 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.entity.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `Session`** L3
- injeta (construtor): `id: string` · `name: string` · `engine: Engine` · `status: SessionStatus` · `meJid: string | null` · `mePushName: string | null` · `phoneNumber: string | null` · `autostart: boolean` · `lastError: string | null` · `createdAt: Date` · `updatedAt: Date`
- `constructor(id, name, engine, status, meJid, mePushName, phoneNumber, a…)` · L4
  - chamado por: `PrismaSessionRepository.toDomain` (prisma-session.repository.ts:29)

## `modules/sessions/domain/session.repository.ts`

35 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.repository.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_REPOSITORY` = `Symbol('SESSION_REPOSITORY')` · L34

**Tipos**
- interface `CreateSessionInput` L4 · 5 propriedade(s)
- interface `StatusPatch` L12 · 3 propriedade(s)
- interface `SessionRepository` L18
  - `SessionRepository.create(input)` · L19
    - implementado por: `PrismaSessionRepository.create` (prisma-session.repository.ts:45)
    - chamado por: `SessionsController.create` (sessions.controller.ts:96)
  - `SessionRepository.findById(id)` · L20
    - implementado por: `PrismaSessionRepository.findById` (prisma-session.repository.ts:59)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:453), `SessionManager.start` (session-manager.service.ts:297), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:96), `SessionsController.ensure` (sessions.controller.ts:408)
  - `SessionRepository.findByName(name)` · L21
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:64)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:96)
  - `SessionRepository.list()` · L22
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:69)
    - chamado por: `SessionsController.create` (sessions.controller.ts:96), `SessionsController.list` (sessions.controller.ts:153)
  - `SessionRepository.updateStatus(id, status, patch)` · L25
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:76)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:380), `SessionManager.persistStatus` (session-manager.service.ts:247), `SessionManager.startWithTimeout` (session-manager.service.ts:308)
  - `SessionRepository.delete(id)` · L30
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:101)
    - chamado por: `SessionManager.remove` (session-manager.service.ts:430), `SessionsController.create` (sessions.controller.ts:96)
  - `SessionRepository.findAutostart()` · L31
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:105)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:71)

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
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:197)
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
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1381), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:847)
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
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1311)

**Tipos**
- type `BaileysDescribed` L27
- type `BaileysForwardContent` L505

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

1937 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L409 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L410 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L411 · private · campo
- `status` · L412 · private · campo
- `qrBase64` · L413 · private · campo
- `stopped` · L414 · private · campo
- `reconnectAttempts` · L415 · private · campo
- `lifecycle` · L421 · private · campo
- `sentMessages` · L423 · private · campo
- `lidToPn` · L425 · private · campo
- `groupPushName` · L428 · private · campo
- `connectGeneration` · L433 · private · campo
- `groupMetaCache` · L435 · private · campo
- `constructor(deps)` · L440
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L442 · private
  - chamado por: `connect` L493, `groupInfo` L1657, `listGroups` L1649
- `clearReconnectTimer()` · L451 · private
  - chamado por: `doLogout` L1898, `doStop` L1837, `onConnectionUpdate` L731, `shutdown` L1879, `start` L483
- `getStatus()` · L456
  - implementa: `IEngine.getStatus` (engine.port.ts:359)
- `getQrBase64()` · L460
  - implementa: `IEngine.getQrBase64` (engine.port.ts:355)
- `setStatus(status, extra)` · L464 · private
  - chamado por: `connect` L493, `doLogout` L1898, `doStop` L1837, `onConnectionUpdate` L731, `requestPairingCode` L1822
- `serialize(fn)` · L474 · private
  - chamado por: `logout` L1893, `onConnectionUpdate` L731, `start` L483, `stop` L1830
- `start()` · L483
  - implementa: `IEngine.start` (engine.port.ts:305)
  - chama: `clearReconnectTimer` L451, `connect` L493, `serialize` L474
- `connect()` · L493 · private · async
  - chama: `cacheGroupMeta` L442, `loadMessageForRetry` L1453, `onConnectionUpdate` L731, `onContacts` L1606, `onMessagesUpdate` L941, `onMessagesUpsert` L847, `onReactions` L626, `safe` L1488, `setStatus` L464, `latestBaileysVersion` L128, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L731, `start` L483
- `onReactions(reactions)` · L626 · private
  - chama: `learnPair` L662, `resolveChatJid` L655, `mapBaileysReaction` L197
  - chamado por: `connect` L493
- `resolveChatJid(jid)` · L655 · private
  - chamado por: `groupSenderOf` L689, `onReactions` L626
- `learnPair(a, b)` · L662 · private
  - chama: `learnLid` L669
  - chamado por: `onReactions` L626
- `learnLid(lid, pn)` · L669 · private
  - chama: `mergeLidMessages` L1563
  - chamado por: `groupSenderOf` L689, `learnPair` L662, `onMessagesUpsert` L847
- `groupSenderOf(m)` · L689 · private
  - chama: `learnLid` L669, `rememberGroupPushName` L723, `resolveChatJid` L655, `phoneFirst` L224
  - chamado por: `onMessagesUpsert` L847
- `rememberGroupPushName(pn, pushName)` · L723 · private
  - chamado por: `groupSenderOf` L689
- `onConnectionUpdate(update)` · L731 · private · async
  - chama: `clearCredentials` L1921, `clearReconnectTimer` L451, `connect` L493, `detachSocketListeners` L1854, `serialize` L474, `setStatus` L464, `warmLidCache` L1549
  - chamado por: `connect` L493
- `onMessagesUpsert(upsert)` · L847 · private
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L689, `handleIncomingMedia` L1007, `learnLid` L669, `encodeProto` L176
  - chamado por: `connect` L493
- `onMessagesUpdate(updates)` · L941 · private
  - chama: `markMessage` L988, `mapAckStatus` L243
  - chamado por: `connect` L493
- `markMessage(keyId, fromMe, field)` · L988 · private
  - chamado por: `onMessagesUpdate` L941
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1007 · private · async
  - chama: `encodeProto` L176, `extOf` L229
  - chamado por: `onMessagesUpsert` L847
- `sendText(to, text, opts)` · L1083 · async
  - implementa: `IEngine.sendText` (engine.port.ts:317)
  - chama: `cacheSent` L1439, `resolveJid` L1256, `encodeProto` L176
- `sendMedia(to, input)` · L1115 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:322)
  - chama: `cacheSent` L1439, `resolveJid` L1256, `buildMediaContent` L261, `encodeProto` L176, `extOf` L229
- `sendLocation(to, input)` · L1170 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:327)
  - chama: `emitOutbound` L1224, `resolveJid` L1256, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1199 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:331)
  - chama: `emitOutbound` L1224, `resolveJid` L1256, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1224 · private
  - chama: `cacheSent` L1439, `encodeProto` L176
  - chamado por: `sendLocation` L1170, `sendPoll` L1199
- `resolveJid(to)` · L1256 · private · async
  - chama: `toJid` L1932
  - chamado por: `forwardTo` L1381, `resolveParticipants` L1540, `sendLocation` L1170, `sendMedia` L1115, `sendPoll` L1199, `sendText` L1083
- `sendPresence(to, state)` · L1261 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:335)
  - chama: `sk` L1507, `toJid` L1932
- `setProfileStatus(status)` · L1271 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:337)
  - chama: `sk` L1507
- `setProfileName(name)` · L1274 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:338)
  - chama: `sk` L1507
- `setProfilePhoto(image, _mimetype)` · L1277 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:339)
  - chama: `sk` L1507
- `markRead(chatJid, msgId)` · L1285 · async
  - implementa: `IEngine.markRead` (engine.port.ts:341)
  - chama: `sk` L1507, `toJid` L1932
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1293 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:345)
  - chama: `toJid` L1932
- `prepareForward(src)` · L1311 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:354)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:278), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1381, `decodeProto` L179
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1381 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L1439, `resolveJid` L1256, `encodeProto` L176, `toJid` L1932
  - chamado por: `prepareForward` L1311
- `cacheSent(keyId, message)` · L1439 · private
  - chamado por: `emitOutbound` L1224, `forwardTo` L1381, `loadMessageForRetry` L1453, `sendMedia` L1115, `sendText` L1083
- `loadMessageForRetry(key)` · L1453 · private · async
  - chama: `cacheSent` L1439, `decodeProto` L179
  - chamado por: `connect` L493
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1488 · private
  - chamado por: `connect` L493
- `sk()` · L1507 · private
  - chamado por: `channelInfo` L1811, `checkNumbers` L1759, `createChannel` L1804, `createGroup` L1665, `followChannel` L1815, `groupInfo` L1657, `groupInviteCode` L1690, `groupMembershipAction` L1711, `groupMembershipRequests` L1699, `groupRevokeInvite` L1693, `leaveGroup` L1681, `listGroups` L1649, `markRead` L1285, `profilePicture` L1774, `removeContact` L1799, `saveContact` L1786, `sendPresence` L1261, `setBlock` L1783, `setGroupDescription` L1687, `setGroupPhoto` L1750, `setGroupSetting` L1733, `setGroupSubject` L1684, `setProfileName` L1274, `setProfilePhoto` L1277, `setProfileStatus` L1271, `unfollowChannel` L1818, `updateParticipants` L1673
- `listChats(_limit)` · L1514 · async
  - implementa: `IEngine.listChats` (engine.port.ts:364)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:295)
- `fetchChatHistory(_chatJid, _limit)` · L1519 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:365)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:295)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1530 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:369)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:295)
- `resolveParticipants(items)` · L1540 · private · async
  - chama: `resolveJid` L1256
  - chamado por: `createGroup` L1665, `groupMembershipAction` L1711, `updateParticipants` L1673
- `warmLidCache()` · L1549 · private · async
  - chama: `mergeKnownLids` L1586
  - chamado por: `onConnectionUpdate` L731
- `mergeLidMessages(lid, phoneJid)` · L1563 · private · async
  - chamado por: `learnLid` L669, `mergeKnownLids` L1586
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L1586 · private · async
  - chama: `mergeLidMessages` L1563
  - chamado por: `warmLidCache` L1549
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1606 · private
  - chama: `contactToRecord` L151
  - chamado por: `connect` L493
- `recordGroupParticipants(md)` · L1613 · private
  - chamado por: `groupInfo` L1657, `listGroups` L1649
- `resolveParticipantNames(groups)` · L1627 · private · async
  - chama: `resolveParticipantPhone` L301
  - chamado por: `groupInfo` L1657, `listGroups` L1649
- `listGroups()` · L1649 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:372)
  - chama: `cacheGroupMeta` L442, `recordGroupParticipants` L1613, `resolveParticipantNames` L1627, `sk` L1507, `toGroupInfo` L349
- `groupInfo(jid)` · L1657 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:373)
  - chama: `cacheGroupMeta` L442, `recordGroupParticipants` L1613, `resolveParticipantNames` L1627, `sk` L1507, `toGroupInfo` L349, `toGroupJid` L393
- `createGroup(subject, participants)` · L1665 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:374)
  - chama: `resolveParticipants` L1540, `sk` L1507, `toGroupInfo` L349
- `updateParticipants(jid, action, participants)` · L1673 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:375)
  - chama: `resolveParticipants` L1540, `sk` L1507, `toGroupJid` L393
- `leaveGroup(jid)` · L1681 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:380)
  - chama: `sk` L1507, `toGroupJid` L393
- `setGroupSubject(jid, subject)` · L1684 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:381)
  - chama: `sk` L1507, `toGroupJid` L393
- `setGroupDescription(jid, description)` · L1687 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:382)
  - chama: `sk` L1507, `toGroupJid` L393
- `groupInviteCode(jid)` · L1690 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:383)
  - chama: `sk` L1507, `toGroupJid` L393
- `groupRevokeInvite(jid)` · L1693 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:384)
  - chama: `sk` L1507, `toGroupJid` L393
- `groupMembershipRequests(jid)` · L1699 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:387)
  - chama: `sk` L1507, `toGroupJid` L393
- `groupMembershipAction(jid, action, participants)` · L1711 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:388)
  - chama: `resolveParticipants` L1540, `sk` L1507, `toGroupJid` L393
- `setGroupSetting(jid, setting, enabled)` · L1733 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:394)
  - chama: `sk` L1507, `toGroupJid` L393
- `setGroupPhoto(jid, image, _mimetype)` · L1750 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:400)
  - chama: `sk` L1507, `toGroupJid` L393
- `checkNumbers(numbers)` · L1759 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:403)
  - chama: `sk` L1507
- `profilePicture(jid)` · L1774 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:404)
  - chama: `sk` L1507, `toContactJid` L396
- `setBlock(jid, action)` · L1783 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:405)
  - chama: `sk` L1507, `toContactJid` L396
- `saveContact(jid, input)` · L1786 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:407)
  - chama: `sk` L1507, `toContactJid` L396
- `removeContact(jid)` · L1799 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:409)
  - chama: `sk` L1507, `toContactJid` L396
- `createChannel(name, description)` · L1804 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:412)
  - chama: `sk` L1507, `toChannelInfo` L382
- `channelInfo(jid)` · L1811 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:413)
  - chama: `sk` L1507, `toChannelInfo` L382
- `followChannel(jid)` · L1815 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:414)
  - chama: `sk` L1507
- `unfollowChannel(jid)` · L1818 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:415)
  - chama: `sk` L1507
- `requestPairingCode(phoneNumber)` · L1822 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:316)
  - chama: `setStatus` L464
- `stop()` · L1830
  - implementa: `IEngine.stop` (engine.port.ts:306)
  - chama: `doStop` L1837, `serialize` L474
- `doStop()` · L1837 · private · async
  - chama: `clearReconnectTimer` L451, `detachSocketListeners` L1854, `setStatus` L464
  - chamado por: `stop` L1830
- `detachSocketListeners()` · L1854 · private
  - chamado por: `doLogout` L1898, `doStop` L1837, `onConnectionUpdate` L731, `shutdown` L1879
- `shutdown()` · L1879 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:314)
  - chama: `clearReconnectTimer` L451, `detachSocketListeners` L1854
- `logout()` · L1893
  - implementa: `IEngine.logout` (engine.port.ts:315)
  - chama: `doLogout` L1898, `serialize` L474
- `doLogout()` · L1898 · private · async
  - chama: `clearCredentials` L1921, `clearReconnectTimer` L451, `detachSocketListeners` L1854, `setStatus` L464
  - chamado por: `logout` L1893
- `clearCredentials()` · L1921 · private · async
  - chamado por: `doLogout` L1898, `onConnectionUpdate` L731
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L128 · async
  - chamado por: `connect` L493
- `contactToRecord(c, source)` · L151
  - chamado por: `onContacts` L1606
- `encodeProto(msg)` · L176
  - chamado por: `emitOutbound` L1224, `forwardTo` L1381, `handleIncomingMedia` L1007, `onMessagesUpsert` L847, `sendMedia` L1115, `sendText` L1083
- `decodeProto(value)` · L179
  - chamado por: `loadMessageForRetry` L1453, `prepareForward` L1311
- `mapBaileysReaction(key, reaction, ourJid)` · L197
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L224
  - chamado por: `onReactions` L626
- `phoneFirst(a, b)` · L224
  - chamado por: `groupSenderOf` L689, `mapBaileysReaction` L197
- `extOf(mimetype, fileName)` · L229
  - chamado por: `handleIncomingMedia` L1007, `sendMedia` L1115
- `mapAckStatus(status)` · L243
  - chamado por: `onMessagesUpdate` L941
- `buildMediaContent(input)` · L261
  - chamado por: `sendMedia` L1115
- `resolveParticipantPhone(p, lidToPn)` · L301
  - chamado por: `resolveParticipantNames` L1627, `toGroupInfo` L349
- `dirNameFor(p, phone, names)` · L335
  - chamado por: `toGroupInfo` L349
- `toGroupInfo(md, lidToPn, names)` · L349
  - chama: `dirNameFor` L335, `resolveParticipantPhone` L301
  - chamado por: `createGroup` L1665, `groupInfo` L1657, `listGroups` L1649
- `toChannelInfo(md)` · L382
  - chamado por: `channelInfo` L1811, `createChannel` L1804
- `toGroupJid(jid)` · L393
  - chamado por: `groupInfo` L1657, `groupInviteCode` L1690, `groupMembershipAction` L1711, `groupMembershipRequests` L1699, `groupRevokeInvite` L1693, `leaveGroup` L1681, `setGroupDescription` L1687, `setGroupPhoto` L1750, `setGroupSetting` L1733, `setGroupSubject` L1684, `updateParticipants` L1673
- `toContactJid(jid)` · L396
  - chamado por: `profilePicture` L1774, `removeContact` L1799, `saveContact` L1786, `setBlock` L1783
- `toJid(to)` · L1932
  - chamado por: `forwardTo` L1381, `markRead` L1285, `resolveJid` L1256, `sendPresence` L1261, `sendReaction` L1293

**Tipos**
- interface `BaileysEngineDeps` L72 · 11 propriedade(s)
- type `BaileysVersion` L119
- type `RawParticipant` L288
- type `RawGroup` L315
- type `RawNewsletter` L325

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

706 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`
- importa (interno): `modules/messaging/application/reaction-key.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “BaileysEngine.onMessagesUpsert (P-066)” · L74
  - it “reação do contato no upsert NÃO vira evento message” · L75
  - it “reação NOSSA pelo celular (fromMe) também não — sem handoff falso” · L88
  - it “localização encaminhada sai como message type location com texto e selo” · L106
  - it “texto comum segue igual (fromMe do celular = source phone, não encaminhada)” · L134
  - it “voto do contato numa enquete → message poll_vote (continua contando como resposta)” · L147
  - it “o par LID↔telefone de uma reação ignorada ainda é aprendido (e funde a conversa)” · L160
- describe “BaileysEngine.onReactions — grupo (E22)” · L211
  - it “remetente é QUEM REAGIU (reaction.key.participant), não o autor da mensagem-alvo” · L212
- describe “BaileysEngine.onReactions — endereçamento por TELEFONE (modo PN: o *Alt é o @lid)” · L256
  - it “1:1: remetente e chat saem com o telefone (não o @lid do remoteJidAlt) e o par é aprendido” · L257
  - it “grupo: participant telefone + participantAlt @lid → telefone; a mesma pessoa mantém o senderKey depois de o p…” · L283
  - it “reação NOSSA: o *Alt (pode ser o nosso LID) não é aprendido como par de ninguém” · L319
- describe “BaileysEngine.onMessagesUpsert — mídia em invólucro que a lib não abre (E22)” · L340
  - it “figurinha lottie: o download recebe o conteúdo DESEMBRULHADO, com a key original (reupload)” · L348
  - it “imagem comum: o download recebe a MESMA mensagem (identidade)” · L373
- describe “BaileysEngine.onMessagesUpsert — remetente em grupo (E23 · P-074)” · L395
  - it “modo LID: senderJid = telefone do participant_pn; par aprendido (merge) e gravado no diretório 1× com o pushN…” · L405
  - it “modo PN (participantAlt = @lid): senderJid = TELEFONE — trava a fórmula `participantAlt ?? participant`, que …” · L443
  - it “LID sem Alt e sem par conhecido (número oculto): fica o @lid, sem diretório nem merge” · L465
  - it “aparelho (:NN) some do participant e do participantAlt” · L479
  - it “1:1 inalterado (participant vazio do cleanMessage; @lid com remoteJidAlt)” · L499
  - it “fromMe em grupo (celular): senderJid = a conta, source phone; o *Alt (nosso LID) não é aprendido” · L511
  - it “grupo sem participant: mantém o jid do grupo (comportamento antigo)” · L531
  - it “reação de grupo no upsert (ignorada) ainda ensina o par do participante” · L537
  - it “mídia em grupo: o download recebe o base com o senderJid do participante” · L557
- describe “BaileysEngine.onMessagesUpsert — pushName do participante no diretório (revisão E23)” · L592
  - it “par vindo do diretório (restart) + pushName → grava 1×; repetido → 0×; nome novo → grava de novo” · L612
  - it “sem par NESTA mensagem (só o @lid, telefone pelo cache) → grava o nome no telefone, com o @lid” · L628
  - it “1ª mensagem sem pushName e 2ª com → grava só na 2ª” · L638
  - it “par NOVO sem pushName grava o par; o nome que chega depois também é gravado” · L649
  - it “par aprendido por REAÇÃO (fica só no cache) → a mensagem seguinte grava o nome” · L656
  - it “só telefone (sem @lid na chave) + pushName → grava 1× sem lid” · L677
  - it “@lid sem telefone conhecido → não grava (o contacts.update da lib já guarda o nome no @lid)” · L686
  - it “memória do último nome gravado tem teto (FIFO de 5000): o mais antigo é esquecido” · L692

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:493)

**Tipos**
- type `BrowserFingerprint` L13

## `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`

85 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/postgres-auth-state.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `encode(value)` · L11
  - chamado por: `usePostgresAuthState` L20
- `decode(value)` · L14
  - chamado por: `usePostgresAuthState` L20
- `usePostgresAuthState(prisma, sessionId)` · L20 · async
  - chama: `decode` L14, `encode` L11
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:493)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:440), `WWebJSEngine.constructor` (wwebjs.engine.ts:390)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:138)

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
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1170), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1504)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1199), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1538)
- `formatEvent(name, description)` · L135
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)

**Tipos**
- interface `ContentMedia` L14 · 5 propriedade(s)
- type `DescribedMessage` L22

## `modules/sessions/infrastructure/prisma-session.repository.ts`

123 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/prisma-session.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `PrismaSessionRepository`** L25 · @Injectable · `implements SessionRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L27
- `toDomain(r)` · L29 · private
  - chama: `Session.constructor` (session.entity.ts:4)
  - chamado por: `create` L45, `findAutostart` L105, `findById` L59, `findByName` L64, `list` L69
- `create(input)` · L45 · async
  - implementa: `SessionRepository.create` (session.repository.ts:19)
  - chama: `toDomain` L29
  - banco: `waSession.create`
- `findById(id)` · L59 · async
  - implementa: `SessionRepository.findById` (session.repository.ts:20)
  - chama: `toDomain` L29
  - banco: `waSession.findUnique`
- `findByName(name)` · L64 · async
  - implementa: `SessionRepository.findByName` (session.repository.ts:21)
  - chama: `toDomain` L29
  - banco: `waSession.findUnique`
- `list()` · L69 · async
  - implementa: `SessionRepository.list` (session.repository.ts:22)
  - chama: `toDomain` L29
  - banco: `waSession.findMany`
- `updateStatus(id, status, patch)` · L76 · async
  - implementa: `SessionRepository.updateStatus` (session.repository.ts:25)
  - banco: `waSession.updateMany`
- `delete(id)` · L101 · async
  - implementa: `SessionRepository.delete` (session.repository.ts:30)
  - banco: `waSession.delete`
- `findAutostart()` · L105 · async
  - implementa: `SessionRepository.findAutostart` (session.repository.ts:31)
  - chama: `toDomain` L29
  - banco: `waSession.findMany`

**Tipos**
- interface `Row` L11 · 11 propriedade(s)

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
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:1840), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1641), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2515)
- `FORWARDABLE_TYPES` = `new Set([ 'chat', 'image', 'video', 'ptv', 'audio', 'ptt', 'document'…` · L190
- `wwebjsForwardBlock(msg)` · L210
  - chamado por: `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1641)
- `serializedOf(k)` · L248
  - chamado por: `jidOf` L257, `mapWwebjsReaction` L285
- `jidOf(v)` · L257
  - chama: `serializedOf` L248
  - chamado por: `mapWwebjsReaction` L285, `wwebjsGroupSender` L269
- `wwebjsGroupSender(chatRaw, author, lidToPn)` · L269
  - chama: `jidOf` L257
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:1840), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2515)
- `mapWwebjsReaction(r)` · L285
  - chama: `jidOf` L257, `serializedOf` L248
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:2061)

**Tipos**
- interface `WwebjsMessageLike` L17 · 15 propriedade(s)
- interface `WwebjsForwardLike` L204 · 2 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

2934 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `WWebJSEngine`** L329 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L330 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L331 · private · campo
- `status` · L332 · private · campo
- `qrBase64` · L333 · private · campo
- `stopped` · L334 · private · campo
- `lidToPnCache` · L337 · private · campo
- `pnToLidOutbound` · L341 · private · campo
- `sentByPanel` · L344 · private · campo
- `forwardEchoes` · L346 · private · campo
  - chama: `ForwardEchoRegistry.constructor` (wwebjs.forward-echo.ts:51)
- `forwardEchoWaitMs` · L348 · private · campo
- `forwardEchoTtlMs` · L349 · private · campo
- `forwardEchoGraceMs` · L350 · private · campo
- `forwardOpTimeoutMs` · L351 · private · campo
- `anonProxyUrl` · L354 · private · campo
- `lifecycle` · L361 · private · campo
- `reconnectAttempts` · L363 · private · campo
- `lastLoadingPct` · L367 · private · campo
- `logoutTimeoutMs` · L370 · private · campo
- `destroyTimeoutMs` · L374 · private · campo
- `generation` · L378 · private · campo
- `lastQrAt` · L380 · private · campo
- `qrHeals` · L382 · private · campo
- `qrWatchdogIntervalMs` · L384 · private · campo
- `qrStaleMs` · L385 · private · campo
- `initTimeoutMs` · L386 · private · campo
- `lastPairingCode` · L388 · private · campo
- `constructor(deps)` · L390
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L394 · private
  - chamado por: `handleDisconnect` L1141, `logout` L1350, `qrWatchdogTick` L454, `start` L617, `stop` L1298
- `getStatus()` · L403
  - implementa: `IEngine.getStatus` (engine.port.ts:359)
- `getQrBase64()` · L406
  - implementa: `IEngine.getQrBase64` (engine.port.ts:355)
- `getPairingCode()` · L409
  - implementa: `IEngine.getPairingCode` (engine.port.ts:358)
- `setStatus(status, extra)` · L413 · private
  - chama: `startQrWatchdog` L439, `startSyncWatchdog` L511, `stopQrWatchdog` L449, `stopSyncWatchdog` L522
  - chamado por: `doLogout` L1355, `doStart` L623, `doStop` L1305, `handleDisconnect` L1141, `handleInitFailure` L1028, `qrWatchdogTick` L454, `requestPairingCode` L1387, `syncWatchdogTick` L529
- `startQrWatchdog()` · L439 · private
  - chama: `qrWatchdogTick` L454
  - chamado por: `setStatus` L413
- `stopQrWatchdog()` · L449 · private
  - chamado por: `qrWatchdogTick` L454, `setStatus` L413
- `qrWatchdogTick()` · L454 · private · async
  - chama: `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `doStart` L623, `serialize` L394, `setStatus` L413, `stopQrWatchdog` L449
  - chamado por: `startQrWatchdog` L439
- `watchdogFails` · L506 · private · campo
- `watchdogDegraded` · L507 · private · campo
- `WATCHDOG_INTERVAL_MS` · L508 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L509 · private · static · campo
- `startSyncWatchdog()` · L511 · private
  - chama: `syncWatchdogTick` L529
  - chamado por: `setStatus` L413
- `stopSyncWatchdog()` · L522 · private
  - chamado por: `setStatus` L413, `shutdown` L1326
- `syncWatchdogTick()` · L529 · private · async
  - chama: `isPageCrashError` L99, `raceStoreOp` L302, `healWedgedPage` L2445, `setStatus` L413, `syncHint` L2430
  - chamado por: `startSyncWatchdog` L511
- `clearStaleSingletonLocks()` · L591 · private · async
  - chama: `authDirOf` L200
  - chamado por: `doStart` L623
- `purgeAuthDir(sessionId)` · L611 · static · async
  - chama: `authDirOf` L200
  - chamado por: `SessionManager.logout` (session-manager.service.ts:380), `SessionManager.newQr` (session-manager.service.ts:409), `SessionManager.remove` (session-manager.service.ts:430), `doLogout` L1355
- `start()` · L617
  - implementa: `IEngine.start` (engine.port.ts:305)
  - chama: `doStart` L623, `serialize` L394
- `doStart(attempt, forceLive)` · L623 · private · async
  - chama: `buildAuthProxyUrl` L186, `raceStoreOp` L302, `userAgentFor` L117, `checkPinnedBuildAge` L911, `clearStaleSingletonLocks` L591, `closeAnonProxy` L1208, `consumeCleanShutdownMarker` L1268, `ensureWebVersionHtml` L957, `handleDisconnect` L1141, `handleInitFailure` L1028, `mergeExistingLids` L2266, `onMessageAck` L2037, `onMessageCreate` L1840, `onReaction` L2061, `resolveWebVersion` L991, `setStatus` L413, `syncAddressBook` L2294
  - chamado por: `handleDisconnect` L1141, `handleInitFailure` L1028, `qrWatchdogTick` L454, `start` L617
- `checkPinnedBuildAge(version)` · L911 · private · async
  - chama: `loadBuildCatalog` L206
  - chamado por: `doStart` L623
- `ensureWebVersionHtml(version)` · L957 · private · async
  - chamado por: `doStart` L623
- `resolveWebVersion(forceLive)` · L991 · private · async
  - chamado por: `doStart` L623
- `handleInitFailure(e, attempt, pinnedVersion)` · L1028 · private · async
  - chama: `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `doStart` L623, `setStatus` L413
  - chamado por: `doStart` L623
- `handleDisconnect(reason)` · L1141 · private · async
  - chama: `raceStoreOp` L302, `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `doStart` L623, `serialize` L394, `setStatus` L413
  - chamado por: `doStart` L623
- `closeAnonProxy()` · L1208 · private · async
  - chamado por: `doLogout` L1355, `doStart` L623, `doStop` L1305, `handleDisconnect` L1141, `handleInitFailure` L1028, `qrWatchdogTick` L454, `shutdown` L1326
- `destroyWithTimeout()` · L1227 · private · async
  - chamado por: `doLogout` L1355, `doStop` L1305, `handleDisconnect` L1141, `handleInitFailure` L1028, `qrWatchdogTick` L454, `shutdown` L1326
- `markCleanShutdown()` · L1251 · private · async
  - chama: `authDirOf` L200
  - chamado por: `doStop` L1305, `shutdown` L1326
- `consumeCleanShutdownMarker()` · L1268 · private · async
  - chama: `authDirOf` L200
  - chamado por: `doStart` L623
- `stop()` · L1298
  - implementa: `IEngine.stop` (engine.port.ts:306)
  - chama: `doStop` L1305, `serialize` L394
- `doStop()` · L1305 · private · async
  - chama: `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `markCleanShutdown` L1251, `setStatus` L413
  - chamado por: `stop` L1298
- `shutdown()` · L1326 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:314)
  - chama: `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `markCleanShutdown` L1251, `stopSyncWatchdog` L522
- `logout()` · L1350
  - implementa: `IEngine.logout` (engine.port.ts:315)
  - chama: `doLogout` L1355, `serialize` L394
- `doLogout()` · L1355 · private · async
  - chama: `raceStoreOp` L302, `closeAnonProxy` L1208, `destroyWithTimeout` L1227, `purgeAuthDir` L611, `setStatus` L413
  - chamado por: `logout` L1350
- `requestPairingCode(phoneNumber)` · L1387 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:316)
  - chama: `req` L2338, `setStatus` L413
- `sendText(to, text, opts)` · L1400 · async
  - implementa: `IEngine.sendText` (engine.port.ts:317)
  - chama: `assertPageResponsive` L2403, `rememberPanel` L2075, `req` L2338, `toChatId` L2333, `toMentionIds` L1831, `withLidFallback` L2170
- `sendMedia(to, input)` · L1430 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:322)
  - chama: `extOf` L137, `assertPageResponsive` L2403, `rememberPanel` L2075, `req` L2338, `toChatId` L2333, `toMentionIds` L1831, `withLidFallback` L2170
- `sendLocation(to, input)` · L1504 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:327)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2403, `emitOutbound` L1568, `rememberPanel` L2075, `req` L2338, `toChatId` L2333, `withLidFallback` L2170
- `sendPoll(to, input)` · L1538 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:331)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2403, `emitOutbound` L1568, `rememberPanel` L2075, `req` L2338, `toChatId` L2333, `withLidFallback` L2170
- `emitOutbound(keyId, jid, type, text, opts)` · L1568 · private
  - chamado por: `sendLocation` L1504, `sendPoll` L1538
- `setProfileStatus(status)` · L1590 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:337)
  - chama: `req` L2338
- `setProfileName(name)` · L1593 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:338)
  - chama: `req` L2338
- `setProfilePhoto(image, mimetype)` · L1596 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:339)
  - chama: `req` L2338
- `sendPresence(to, state)` · L1601 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:335)
  - chama: `req` L2338, `toChatId` L2333, `withLidFallback` L2170
- `markRead(chatJid, _msgId)` · L1619 · async
  - implementa: `IEngine.markRead` (engine.port.ts:341)
  - chama: `req` L2338, `toChatId` L2333, `withLidFallback` L2170
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1628 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:345)
  - chama: `req` L2338, `withStoreReady` L2355
- `prepareForward(src)` · L1641 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:354)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:278), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2403, `forwardTo` L1678, `req` L2338, `withStoreReady` L2355
- `forwardTo(msg, type, text, src, to, opts)` · L1678 · private · async
  - chama: `assertPageResponsive` L2403, `req` L2338, `toChatId` L2333, `withLidFallback` L2170, `ForwardEchoRegistry.expect` (wwebjs.forward-echo.ts:60)
  - chamado por: `prepareForward` L1641
- `matchForwardEcho(msg, d, keyId)` · L1766 · private
  - chama: `ForwardEchoRegistry.match` (wwebjs.forward-echo.ts:103)
  - chamado por: `onMessageCreate` L1840
- `emitForwardEcho(msg, d, keyId, echo)` · L1786 · private
  - chama: `handleIncomingMedia` L1924, `rememberPanel` L2075
  - chamado por: `onMessageCreate` L1840
- `toMentionIds(mentions)` · L1831 · private
  - chama: `toChatId` L2333
  - chamado por: `sendMedia` L1430, `sendText` L1400
- `onMessageCreate(msg)` · L1840 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L152, `emitForwardEcho` L1786, `handleIncomingMedia` L1924, `matchForwardEcho` L1766, `resolveNumberJid` L2086
  - chamado por: `doStart` L623
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L1924 · private · async
  - chama: `extOf` L137, `isPageCrashError` L99, `mapInboundMediaType` L152, `healWedgedPage` L2445
  - chamado por: `emitForwardEcho` L1786, `onMessageCreate` L1840
- `mapAck(ack)` · L2023 · private
  - chamado por: `onMessageAck` L2037
- `onMessageAck(msg, ack)` · L2037 · private
  - chama: `mapAck` L2023
  - chamado por: `doStart` L623
- `onReaction(r)` · L2061 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:285), `resolveNumberJid` L2086
  - chamado por: `doStart` L623
- `rememberPanel(keyId)` · L2075 · private
  - chamado por: `emitForwardEcho` L1786, `sendLocation` L1504, `sendMedia` L1430, `sendPoll` L1538, `sendText` L1400
- `resolveNumberJid(rawId)` · L2086 · private · async
  - chama: `cacheLidPn` L2107, `mergeLidMessages` L2242, `resolveLidToPhone` L2118
  - chamado por: `mergeExistingLids` L2266, `onMessageCreate` L1840, `onReaction` L2061, `toHistoryMessage` L2515
- `cacheLidPn(lid, phoneJid)` · L2107 · private
  - chamado por: `rememberOutboundLid` L2219, `resolveNumberJid` L2086, `resolvePendingLids` L2706
- `resolveLidToPhone(lid)` · L2118 · private · async
  - chamado por: `resolveNumberJid` L2086, `resolvePendingLids` L2706
- `withLidFallback(pnJid, op)` · L2170 · private · async
  - chama: `rememberOutboundLid` L2219, `resolvePhoneToLid` L2194, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `forwardTo` L1678, `markRead` L1619, `sendLocation` L1504, `sendMedia` L1430, `sendPoll` L1538, `sendPresence` L1601, `sendText` L1400
- `resolvePhoneToLid(phoneJid)` · L2194 · private · async
  - chamado por: `withLidFallback` L2170
- `rememberOutboundLid(pnJid, lid)` · L2219 · private
  - chama: `cacheLidPn` L2107
  - chamado por: `withLidFallback` L2170
- `mergeLidMessages(lid, phoneJid)` · L2242 · private · async
  - chamado por: `resolveNumberJid` L2086
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2266 · private · async
  - chama: `resolveNumberJid` L2086
  - chamado por: `doStart` L623
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2294 · private · async
  - chama: `req` L2338, `withStoreReady` L2355
  - chamado por: `doStart` L623
- `toChatId(to)` · L2333 · private
  - chamado por: `createGroup` L2742, `fetchChatHistory` L2497, `forwardTo` L1678, `groupMembershipAction` L2812, `markRead` L1619, `profilePicture` L2860, `sendLocation` L1504, `sendMedia` L1430, `sendPoll` L1538, `sendPresence` L1601, `sendText` L1400, `setBlock` L2871, `setChatFlag` L2552, `toMentionIds` L1831, `updateParticipants` L2757
- `req()` · L2338 · private
  - chamado por: `channelInfo` L2913, `checkNumbers` L2849, `createChannel` L2895, `createGroup` L2742, `fetchChatHistory` L2497, `followChannel` L2926, `forwardTo` L1678, `getGroupChat` L2599, `listChats` L2477, `listGroups` L2580, `markRead` L1619, `prepareForward` L1641, `profilePicture` L2860, `removeContact` L2890, `requestPairingCode` L1387, `resolvePendingLids` L2706, `saveContact` L2879, `sendLocation` L1504, `sendMedia` L1430, `sendPoll` L1538, `sendPresence` L1601, `sendReaction` L1628, `sendText` L1400, `setBlock` L2871, `setChatFlag` L2552, `setProfileName` L1593, `setProfilePhoto` L1596, `setProfileStatus` L1590, `syncAddressBook` L2294, `unfollowChannel` L2930
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2355 · private · async
  - chama: `isPageCrashError` L99, `raceStoreOp` L302, `assertPageResponsive` L2403, `healWedgedPage` L2445, `syncHint` L2430
  - chamado por: `channelInfo` L2913, `checkNumbers` L2849, `createChannel` L2895, `createGroup` L2742, `fetchChatHistory` L2497, `followChannel` L2926, `getGroupChat` L2599, `listChats` L2477, `listGroups` L2580, `prepareForward` L1641, `profilePicture` L2860, `removeContact` L2890, `saveContact` L2879, `sendReaction` L1628, `setBlock` L2871, `setChatFlag` L2552, `syncAddressBook` L2294, `unfollowChannel` L2930
- `assertPageResponsive(probeTimeoutMs)` · L2403 · private · async
  - chama: `isPageCrashError` L99, `raceStoreOp` L302, `healWedgedPage` L2445, `syncHint` L2430
  - chamado por: `forwardTo` L1678, `prepareForward` L1641, `sendLocation` L1504, `sendMedia` L1430, `sendPoll` L1538, `sendText` L1400, `withStoreReady` L2355
- `syncHint()` · L2430 · private
  - chamado por: `assertPageResponsive` L2403, `syncWatchdogTick` L529, `withStoreReady` L2355
- `lastHealAt` · L2441 · private · campo
- `healing` · L2442 · private · campo
- `HEAL_COOLDOWN_MS` · L2443 · private · static · campo
- `healWedgedPage()` · L2445 · private · async
  - chamado por: `assertPageResponsive` L2403, `handleIncomingMedia` L1924, `syncWatchdogTick` L529, `withStoreReady` L2355
- `listChats(limit)` · L2477 · async
  - implementa: `IEngine.listChats` (engine.port.ts:364)
  - chama: `req` L2338, `withStoreReady` L2355
- `fetchChatHistory(chatJid, limit)` · L2497 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:365)
  - chama: `req` L2338, `toChatId` L2333, `toHistoryMessage` L2515, `withStoreReady` L2355
- `toHistoryMessage(msg)` · L2515 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L152, `resolveNumberJid` L2086
  - chamado por: `fetchChatHistory` L2497
- `setChatFlag(chatJid, flag, enabled)` · L2552 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:369)
  - chama: `req` L2338, `toChatId` L2333, `withStoreReady` L2355
- `listGroups()` · L2580 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:372)
  - chama: `groupFlags` L171, `req` L2338, `withStoreReady` L2355
- `getGroupChat(jid)` · L2599 · private · async
  - chama: `req` L2338, `toGroupId` L2738, `withStoreReady` L2355
  - chamado por: `groupInfo` L2608, `groupInviteCode` L2782, `groupMembershipAction` L2812, `groupMembershipRequests` L2794, `groupRevokeInvite` L2786, `leaveGroup` L2770, `setGroupDescription` L2778, `setGroupPhoto` L2838, `setGroupSetting` L2827, `setGroupSubject` L2774, `updateParticipants` L2757
- `groupInfo(jid)` · L2608 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:373)
  - chama: `groupFlags` L171, `getGroupChat` L2599, `resolveParticipantsBatch` L2636
  - chamado por: `createGroup` L2742
- `LID_BATCH` · L2625 · private · static · campo
- `resolveParticipantsBatch(list)` · L2636 · private · async
  - chama: `resolvePendingLids` L2706
  - chamado por: `groupInfo` L2608
- `resolvePendingLids(rows)` · L2706 · private · async
  - chama: `cacheLidPn` L2107, `req` L2338, `resolveLidToPhone` L2118
  - chamado por: `resolveParticipantsBatch` L2636
- `toGroupId(jid)` · L2738 · private
  - chamado por: `getGroupChat` L2599
- `createGroup(subject, participants)` · L2742 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:374)
  - chama: `groupInfo` L2608, `req` L2338, `toChatId` L2333, `withStoreReady` L2355
- `updateParticipants(jid, action, participants)` · L2757 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:375)
  - chama: `getGroupChat` L2599, `toChatId` L2333
- `leaveGroup(jid)` · L2770 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:380)
  - chama: `getGroupChat` L2599
- `setGroupSubject(jid, subject)` · L2774 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:381)
  - chama: `getGroupChat` L2599
- `setGroupDescription(jid, description)` · L2778 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:382)
  - chama: `getGroupChat` L2599
- `groupInviteCode(jid)` · L2782 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:383)
  - chama: `getGroupChat` L2599
- `groupRevokeInvite(jid)` · L2786 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:384)
  - chama: `getGroupChat` L2599
- `groupMembershipRequests(jid)` · L2794 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:387)
  - chama: `getGroupChat` L2599
- `groupMembershipAction(jid, action, participants)` · L2812 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:388)
  - chama: `getGroupChat` L2599, `toChatId` L2333
- `setGroupSetting(jid, setting, enabled)` · L2827 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:394)
  - chama: `getGroupChat` L2599
- `setGroupPhoto(jid, image, mimetype)` · L2838 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:400)
  - chama: `getGroupChat` L2599
- `checkNumbers(numbers)` · L2849 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:403)
  - chama: `req` L2338, `withStoreReady` L2355
- `profilePicture(jid)` · L2860 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:404)
  - chama: `req` L2338, `toChatId` L2333, `withStoreReady` L2355
- `setBlock(jid, action)` · L2871 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:405)
  - chama: `req` L2338, `toChatId` L2333, `withStoreReady` L2355
- `saveContact(jid, input)` · L2879 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:407)
  - chama: `req` L2338, `withStoreReady` L2355
- `removeContact(jid)` · L2890 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:409)
  - chama: `req` L2338, `withStoreReady` L2355
- `createChannel(name, description)` · L2895 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:412)
  - chama: `req` L2338, `withStoreReady` L2355
- `channelInfo(jid)` · L2913 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:413)
  - chama: `req` L2338, `withStoreReady` L2355
- `followChannel(jid)` · L2926 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:414)
  - chama: `req` L2338, `withStoreReady` L2355
- `unfollowChannel(jid)` · L2930 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:415)
  - chama: `req` L2338, `withStoreReady` L2355

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L95
- `isPageCrashError(message)` · L99
  - chamado por: `assertPageResponsive` L2403, `handleIncomingMedia` L1924, `syncWatchdogTick` L529, `withStoreReady` L2355
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L107
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `userAgentFor(sessionId)` · L117
  - chamado por: `doStart` L623
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L137
  - chamado por: `handleIncomingMedia` L1924, `sendMedia` L1430
- `mapInboundMediaType(t)` · L152
  - chamado por: `handleIncomingMedia` L1924, `onMessageCreate` L1840, `toHistoryMessage` L2515
- `groupFlags(g)` · L171
  - chamado por: `groupInfo` L2608, `listGroups` L2580
- `buildAuthProxyUrl(server, username, password)` · L186
  - chamado por: `doStart` L623
- `authDirOf(sessionId)` · L200
  - chamado por: `clearStaleSingletonLocks` L591, `consumeCleanShutdownMarker` L1268, `markCleanShutdown` L1251, `purgeAuthDir` L611
- `loadBuildCatalog()` · L206 · async
  - chamado por: `checkPinnedBuildAge` L911
- `WWEBJS_MSG_ID` = `/^(true|false)_[^_]+_[^_]+(_[^_]+)?$/` · L257
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L268
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L296
- `raceStoreOp(op, ms, timeoutMsg)` · L302 · async
  - chamado por: `assertPageResponsive` L2403, `doLogout` L1355, `doStart` L623, `handleDisconnect` L1141, `syncWatchdogTick` L529, `withStoreReady` L2355

**Tipos**
- interface `BuildCatalogEntry` L279 · 3 propriedade(s)
- interface `BuildCatalog` L284 · 3 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`

136 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

**class `ForwardEchoRegistry`** L48
- injeta (construtor): `now: () => number`
- `pending` · L49 · private · campo
- `constructor(now)` · L51
  - chamado por: `WWebJSEngine.forwardEchoes` (wwebjs.engine.ts:346)
- `size()` · L53 · getter
- `expect(input, ttlMs)` · L60
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.forwardTo` (wwebjs.engine.ts:1678)
- `match(tos, type, text, keyId, fwd)` · L103
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.matchForwardEcho` (wwebjs.engine.ts:1766)
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

327 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

- describe “WWebJSEngine.onMessageCreate (P-066)” · L60
  - it “tipo de sistema DO CELULAR (fromMe) sai na hora, sem evento (não espera 3 s nem vira handoff)” · L61
  - it “localização sai com type location e o texto do cartão (nunca o body de miniatura)” · L69
  - it “imagem sem arquivo (hasMedia false): não chama downloadMedia, emite só os metadados” · L98
  - it “tipo sem cartão de mídia COM arquivo (produto): baixa como documento e mantém type other” · L119
- describe “WWebJSEngine.onReaction (E22 — chave-alvo em $1, remote como Wid)” · L143
  - it “emite message.reaction com keyId do $1, chat do Wid e timestamp inteiro” · L144
- describe “WWebJSEngine.toHistoryMessage (backfill com a mesma descrição)” · L169
  - it “ignora notificação de sistema e descreve enquete” · L170
- describe “WWebJSEngine — remetente em grupo (E23 · P-074)” · L196
  - it “author @c.us → senderJid = author; chatJid segue o grupo” · L219
  - it “author @lid com par no cache → telefone @c.us” · L230
  - it “author @lid SEM cache → fica o @lid e NÃO consulta o WhatsApp Web (zero evaluate/rede)” · L237
  - it “1:1 inalterado, mesmo com author espúrio” · L245
  - it “grupo sem author → mantém o jid do grupo (comportamento antigo)” · L253
  - it “fromMe em grupo (celular) → senderJid = a conta, source phone” · L262
  - it “mídia em grupo: o evento com o arquivo sai com o senderJid do autor” · L287
  - it “backfill (toHistoryMessage): mesmo remetente do ao vivo — @lid pelo cache, aparelho removido, sem evaluate” · L310

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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:2170)
- `pageResolvePnToLid(pnJid)` · L92

**Tipos**
- interface `LidFallbackDeps` L29 · 5 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

226 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

- describe “WWebJSEngine — ciclo de vida com teto (WA-08/WA-09/P-025)” · L104
  - it “initialize pendurado: 1 retentativa, depois FAILED com motivo — e o mutex fica livre” · L113
  - it “callbacks do client antigo (geração morta) não mexem no status da sessão” · L135
  - it “QR emitido vira SCAN_QR_CODE; QR sem renovação dispara a recuperação (destroy + start)” · L157
  - it “ready → WORKING zera a fase de QR (watchdog de QR parado não dispara)” · L186
  - it “pairing code: fica disponível em getPairingCode() e some ao parar (WA-18)” · L205

## `modules/sessions/interface/dto.ts`

53 linhas · caminho: `apps/gateway/src/modules/sessions/interface/dto.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`

**Funções e constantes de topo**
- `createSessionSchema` = `z.object({ name: z .string() .min(1) .max(64) .regex(/^[a-zA-Z0-9_-]+…` · L3
- `pairingSchema` = `z.object({ phoneNumber: z.string().min(8).max(20), })` · L18
- `sessionConfigSchema` = `z .object({ capBase: z.number().int().min(0).max(10000), warmupCurve:…` · L23
- `presenceSchema` = `z.object({ to: z.string().min(5).max(40), type: z.enum([ 'composing',…` · L37
- `profileStatusSchema` = `z.object({ status: z.string().max(139) })` · L49
- `profileNameSchema` = `z.object({ name: z.string().min(1).max(25) })` · L50
- `profilePhotoSchema` = `z.object({ url: z.string().url() })` · L52

## `modules/sessions/interface/session-ref.pipe.ts`

30 linhas · caminho: `apps/gateway/src/modules/sessions/interface/session-ref.pipe.ts`
- importa (interno): `modules/sessions/domain/session.repository.ts`
- importado por: `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionRefPipe`** L15 · @Injectable · `implements PipeTransform`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository`
- `constructor(repo)` · L17
- `transform(value)` · L21 · async
  - chama: `SessionRepository.findById` (session.repository.ts:20), `SessionRepository.findByName` (session.repository.ts:21)

## `modules/sessions/interface/sessions.controller.ts`

414 linhas · caminho: `apps/gateway/src/modules/sessions/interface/sessions.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/license.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/interface/dto.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `SessionsController`** L84 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions')
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `manager: SessionManager` · `license: LicenseService` · `guardrail: GuardrailService` · `sessionConfig: SessionConfigService` · `proxies: ProxyService`
- `constructor(repo, manager, license, guardrail, sessionConfig, proxies)` · L87
- `create(body)` · L96 · async · @Post · @MinRole('ADMIN')
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:232), `ProxyService.ensureAvailable` (proxy.service.ts:218), `SessionManager.start` (session-manager.service.ts:297), `SessionRepository.create` (session.repository.ts:19), `SessionRepository.delete` (session.repository.ts:30), `SessionRepository.findById` (session.repository.ts:20), `SessionRepository.findByName` (session.repository.ts:21), `SessionRepository.list` (session.repository.ts:22), `toDto` L45, `newId` (ulid.ts:4)
- `list(state)` · L153 · async · @Get
  - chama: `GuardrailService.statesFor` (guardrail.service.ts:495), `SessionRepository.list` (session.repository.ts:22), `toDto` L45
- `get(id)` · L173 · async · @Get(':id')
  - chama: `ensure` L408, `toDto` L45
- `health(id)` · L179 · async · @Get(':id/health')
  - chama: `GuardrailService.health` (guardrail.service.ts:473), `SessionConfigService.capFor` (session-config.service.ts:49), `SessionConfigService.get` (session-config.service.ts:28)
- `getConfig(id)` · L188 · async · @Get(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:203), `SessionConfigService.capFor` (session-config.service.ts:49), `SessionConfigService.get` (session-config.service.ts:28), `configDto` L62
- `patchConfig(id, body)` · L195 · async · @Patch(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:203), `SessionConfigService.capFor` (session-config.service.ts:49), `SessionConfigService.update` (session-config.service.ts:36), `configDto` L62
- `presence(id, body)` · L212 · async · @Post(':id/presence')
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:506)
- `profileStatus(id, body)` · L228 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:514)
- `profileName(id, body)` · L247 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:517)
- `profilePhoto(id, body)` · L267 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:520), `fetchImageByUrl` (safe-fetch.ts:204)
- `quarantine(id)` · L295 · @Post(':id/quarantine')
  - chama: `override` L315
- `warmup(id)` · L300 · @Post(':id/warmup')
  - chama: `override` L315
- `activate(id)` · L305 · @Post(':id/activate')
  - chama: `override` L315
- `pause(id)` · L310 · @Post(':id/pause')
  - chama: `override` L315
- `override(id, action)` · L315 · private · async
  - chama: `GuardrailService.setManualState` (guardrail.service.ts:457)
  - chamado por: `activate` L305, `pause` L310, `quarantine` L295, `warmup` L300
- `start(id)` · L320 · async · @Post(':id/start')
  - chama: `SessionManager.start` (session-manager.service.ts:297), `ensure` L408
- `stop(id)` · L327 · async · @Post(':id/stop')
  - chama: `SessionManager.stop` (session-manager.service.ts:370), `ensure` L408
- `restart(id)` · L334 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:374), `ensure` L408
- `logout(id)` · L341 · async · @Post(':id/logout')
  - chama: `SessionManager.logout` (session-manager.service.ts:380), `ensure` L408
- `remove(id)` · L348 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `SessionManager.remove` (session-manager.service.ts:430), `ensure` L408
- `qr(id)` · L356 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:449), `SessionManager.getQr` (session-manager.service.ts:445), `ensure` L408
- `newQr(id)` · L372 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:409), `ensure` L408
- `pairingCode(id, body)` · L379 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:453), `ensure` L408
- `ensure(id)` · L408 · private · async
  - chama: `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `get` L173, `logout` L341, `newQr` L372, `pairingCode` L379, `qr` L356, `remove` L348, `restart` L334, `start` L320, `stop` L327

**Funções e constantes de topo**
- `toDto(s)` · L45
  - chamado por: `create` L96, `get` L173, `list` L153
- `configDto(c)` · L62
  - chamado por: `getConfig` L188, `patchConfig` L195

## `modules/sessions/sessions.module.ts`

33 linhas · caminho: `apps/gateway/src/modules/sessions/sessions.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/interface/sessions.controller.ts`
- importado por: `app.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/channels/channels.module.ts`, `modules/contacts/contacts.module.ts`, `modules/groups/groups.module.ts`, `modules/messaging/messaging.module.ts`

**@Module `SessionsModule`** L13
- imports: `[IamModule, ProxiesModule, GuardrailModule]`
- controllers: `[SessionsController]`
- providers: `[ SessionManager, SessionConfigService, EngineFactory, SessionRefPipe, { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository }, ]`
- exports: `[ SessionManager, SessionConfigService, SessionRefPipe, SESSION_REPOSITORY, ]`

**class `SessionsModule`** L13 · @Module({ imports: [IamModule, ProxiesModule, GuardrailModule], // …)
