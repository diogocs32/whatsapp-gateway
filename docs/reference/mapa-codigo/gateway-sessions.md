<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 351 |
| `modules/sessions/application/session-config.service.ts` | 73 |
| `modules/sessions/application/session-manager.service.ts` | 697 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 395 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 1718 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 706 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 123 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts` | 278 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts` | 246 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 2691 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 327 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 226 |
| `modules/sessions/interface/dto.ts` | 53 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 414 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

351 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `UnsupportedEngineOperationError`** L232 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L233
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1300), `BaileysEngine.listChats` (baileys.engine.ts:1295), `BaileysEngine.setChatFlag` (baileys.engine.ts:1311)

**Tipos**
- interface `SessionStatePayload` L3 · 4 propriedade(s)
- type `MessageSource` L13
- interface `MessagePayload` L15 · 19 propriedade(s)
- type `AckStatus` L51
- interface `MessageAckPayload` L53 · 5 propriedade(s)
- interface `ReactionPayload` L62 · 6 propriedade(s)
- type `EngineEventName` L71
- type `EngineEventHandler` L73
- type `GuardrailEventName` L80
- type `WaEventName` L91
- interface `WaEventEnvelope` L94 · 7 propriedade(s)
- type `MediaSendType` L104
- interface `SendOptions` L109 · 3 propriedade(s)
- interface `SendMediaInput` L117 · 6 propriedade(s)
- interface `SendLocationInput` L127 · 4 propriedade(s)
- interface `SendPollInput` L133 · 3 propriedade(s)
- type `GroupParticipantRole` L140
- type `GroupParticipantAction` L141
- interface `GroupParticipantInfo` L143 · 4 propriedade(s)
- interface `GroupInfo` L149 · 8 propriedade(s)
- interface `ContactCheck` L159 · 3 propriedade(s)
- interface `MembershipRequest` L167 · 3 propriedade(s)
- type `GroupSettingKey` L174
- type `MembershipAction` L175
- interface `SaveContactInput` L180 · 3 propriedade(s)
- interface `ChannelInfo` L185 · 4 propriedade(s)
- interface `ChatSummary` L194 · 6 propriedade(s)
- type `ChatFlag` L205
- interface `HistoryMessage` L209 · 13 propriedade(s)
- type `PresenceState` L226
- interface `IEngine` L239 · 1 propriedade(s)
  - `IEngine.start()` · L243
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:461), `WWebJSEngine.start` (wwebjs.engine.ts:589)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.start` (session-manager.service.ts:295)
  - `IEngine.stop()` · L244
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1611), `WWebJSEngine.stop` (wwebjs.engine.ts:1270)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:269), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.onModuleDestroy` (session-manager.service.ts:95), `SessionManager.remove` (session-manager.service.ts:428), `SessionManager.stop` (session-manager.service.ts:368)
  - `IEngine.shutdown()` · L252
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:1660), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1298)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:95)
  - `IEngine.logout()` · L253
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:1674), `WWebJSEngine.logout` (wwebjs.engine.ts:1322)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:378)
  - `IEngine.requestPairingCode(phoneNumber)` · L254
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1603), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1359)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451)
  - `IEngine.sendText(to, text, opts)` · L255
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1010), `WWebJSEngine.sendText` (wwebjs.engine.ts:1372)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:466)
  - `IEngine.sendMedia(to, input)` · L260
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1042), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1402)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:480)
  - `IEngine.sendLocation(to, input)` · L265
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1097), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1476)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:488)
  - `IEngine.sendPoll(to, input)` · L269
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1120), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1504)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:496)
  - `IEngine.sendPresence(to, state)` · L273
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1175), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1560)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:504)
  - `IEngine.setProfileStatus(status)` · L275
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1185), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1549)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:512)
  - `IEngine.setProfileName(name)` · L276
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1188), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1552)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:515)
  - `IEngine.setProfilePhoto(image, mimetype)` · L277
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1191), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1555)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:518)
  - `IEngine.markRead(chatJid, msgId)` · L279
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1199), `WWebJSEngine.markRead` (wwebjs.engine.ts:1578)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:526)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L283
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1207), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1587)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:550)
  - `IEngine.getQrBase64()` · L289
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:438), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:378)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:443)
  - `IEngine.getPairingCode()` · L292
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:381)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:447)
  - `IEngine.getStatus()` · L293
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:434), `WWebJSEngine.getStatus` (wwebjs.engine.ts:375)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.sendText` (session-manager.service.ts:466), `SessionManager.working` (session-manager.service.ts:561)
  - `IEngine.listChats(limit)` · L298
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1295), `WWebJSEngine.listChats` (wwebjs.engine.ts:2234)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:531)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L299
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1300), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2254)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:534)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L303
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1311), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2309)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:541)
  - `IEngine.listGroups()` · L306
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1430), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2337)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:571)
  - `IEngine.groupInfo(jid)` · L307
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1438), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2365)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:574)
  - `IEngine.createGroup(subject, participants)` · L308
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1446), `WWebJSEngine.createGroup` (wwebjs.engine.ts:2499)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:577)
  - `IEngine.updateParticipants(jid, action, participants)` · L309
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1454), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:2514)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:584)
  - `IEngine.leaveGroup(jid)` · L314
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1462), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:2527)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:596)
  - `IEngine.setGroupSubject(jid, subject)` · L315
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1465), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:2531)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:599)
  - `IEngine.setGroupDescription(jid, description)` · L316
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1468), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:2535)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:606)
  - `IEngine.groupInviteCode(jid)` · L317
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1471), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:2539)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:613)
  - `IEngine.groupRevokeInvite(jid)` · L318
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1474), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:2543)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:616)
  - `IEngine.groupMembershipRequests(jid)` · L321
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1480), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:2551)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:619)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L322
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1492), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:2569)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:625)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L328
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1514), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:2584)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:637)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L334
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1531), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:2595)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:645)
  - `IEngine.checkNumbers(numbers)` · L337
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1540), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:2606)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:655)
  - `IEngine.profilePicture(jid)` · L338
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1555), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:2617)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:658)
  - `IEngine.setBlock(jid, action)` · L339
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1564), `WWebJSEngine.setBlock` (wwebjs.engine.ts:2628)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:661)
  - `IEngine.saveContact(jid, input)` · L341
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1567), `WWebJSEngine.saveContact` (wwebjs.engine.ts:2636)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:668)
  - `IEngine.removeContact(jid)` · L343
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1580), `WWebJSEngine.removeContact` (wwebjs.engine.ts:2647)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:675)
  - `IEngine.createChannel(name, description)` · L346
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1585), `WWebJSEngine.createChannel` (wwebjs.engine.ts:2652)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:680)
  - `IEngine.channelInfo(jid)` · L347
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1592), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:2670)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:687)
  - `IEngine.followChannel(jid)` · L348
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1596), `WWebJSEngine.followChannel` (wwebjs.engine.ts:2683)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:690)
  - `IEngine.unfollowChannel(jid)` · L349
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1599), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:2687)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:693)

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

697 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionManager`** L48 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory`
- `logger` · L50 · private · campo
- `engines` · L51 · private · campo
- `names` · L52 · private · campo
- `lastStatusKey` · L56 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L58
- `onApplicationBootstrap()` · L69 · async
  - chama: `start` L295, `SessionRepository.findAutostart` (session.repository.ts:31)
- `onModuleDestroy()` · L95 · async
  - chama: `IEngine.shutdown` (engine.port.ts:252), `IEngine.stop` (engine.port.ts:244)
- `getOrCreateEngine(sessionId, engineType)` · L136 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:124), `handleEngineEvent` L190, `EngineFactory.create` (engine.factory.ts:11)
  - chamado por: `requestPairingCode` L451, `start` L295
- `handleEngineEvent(sessionId, name, payload)` · L190 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `persistStatus` L245, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L136
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p)` · L245 · private · async
  - chama: `discardOrphan` L269, `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `handleEngineEvent` L190
- `discarding` · L266 · private · campo
- `discardOrphan(sessionId)` · L269 · private · async
  - chama: `IEngine.stop` (engine.port.ts:244)
  - chamado por: `persistStatus` L245
- `START_TIMEOUT_MS` · L293 · private · static · campo
- `start(sessionId)` · L295 · async
  - chama: `IEngine.start` (engine.port.ts:243), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L407, `onApplicationBootstrap` L69, `restart` L372, `SessionsController.create` (sessions.controller.ts:96), `SessionsController.start` (sessions.controller.ts:320)
- `startWithTimeout(sessionId, op)` · L306 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L451, `start` L295
- `withTimeout(op, ms)` · L346 · private · async
  - chamado por: `logout` L378, `newQr` L407, `remove` L428, `stop` L368
- `stop(sessionId)` · L368 · async
  - chama: `IEngine.stop` (engine.port.ts:244), `withTimeout` L346
  - chamado por: `restart` L372, `SessionsController.stop` (sessions.controller.ts:327)
- `restart(sessionId)` · L372 · async
  - chama: `start` L295, `stop` L368
  - chamado por: `SessionsController.restart` (sessions.controller.ts:334)
- `logout(sessionId)` · L378 · async
  - chama: `IEngine.logout` (engine.port.ts:253), `withTimeout` L346, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:583)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:341)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L407 · async
  - chama: `IEngine.stop` (engine.port.ts:244), `start` L295, `withTimeout` L346, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:583)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:372)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L428 · async
  - chama: `IEngine.stop` (engine.port.ts:244), `withTimeout` L346, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:583)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:348)
- `getQr(sessionId)` · L443
  - chama: `IEngine.getQrBase64` (engine.port.ts:289)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `getPairingCode(sessionId)` · L447
  - chama: `IEngine.getPairingCode` (engine.port.ts:292)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `requestPairingCode(sessionId, phoneNumber)` · L451 · async
  - chama: `IEngine.getStatus` (engine.port.ts:293), `IEngine.requestPairingCode` (engine.port.ts:254), `IEngine.start` (engine.port.ts:243), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:379)
- `sendText(sessionId, to, text, opts)` · L466 · async
  - chama: `IEngine.getStatus` (engine.port.ts:293), `IEngine.sendText` (engine.port.ts:255)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendText` (messages.controller.ts:579)
- `sendMedia(sessionId, to, input)` · L480 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:260), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendMedia` (messages.controller.ts:608), `MessagesController.sendMediaUrl` (messages.controller.ts:678)
- `sendLocation(sessionId, to, input)` · L488
  - chama: `IEngine.sendLocation` (engine.port.ts:265), `working` L561
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:750)
- `sendPoll(sessionId, to, input)` · L496
  - chama: `IEngine.sendPoll` (engine.port.ts:269), `working` L561
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:789)
- `sendPresence(sessionId, to, state)` · L504
  - chama: `IEngine.sendPresence` (engine.port.ts:273), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `SessionsController.presence` (sessions.controller.ts:212)
- `setProfileStatus(sessionId, status)` · L512
  - chama: `IEngine.setProfileStatus` (engine.port.ts:275), `working` L561
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:228)
- `setProfileName(sessionId, name)` · L515
  - chama: `IEngine.setProfileName` (engine.port.ts:276), `working` L561
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:247)
- `setProfilePhoto(sessionId, image, mimetype)` · L518
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:277), `working` L561
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:267)
- `markRead(sessionId, chatJid, msgId)` · L526
  - chama: `IEngine.markRead` (engine.port.ts:279), `working` L561
  - chamado por: `MessagesController.markRead` (messages.controller.ts:485)
- `listChats(sessionId, limit)` · L531
  - chama: `IEngine.listChats` (engine.port.ts:298), `working` L561
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L534
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:299), `working` L561
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L541
  - chama: `IEngine.setChatFlag` (engine.port.ts:303), `working` L561
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:411)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L550
  - chama: `IEngine.sendReaction` (engine.port.ts:283), `working` L561
  - chamado por: `MessagesController.reaction` (messages.controller.ts:497)
- `working(sessionId)` · L561 · private
  - chama: `IEngine.getStatus` (engine.port.ts:293)
  - chamado por: `channelInfo` L687, `checkNumbers` L655, `createChannel` L680, `createGroup` L577, `fetchChatHistory` L534, `followChannel` L690, `groupInfo` L574, `groupInviteCode` L613, `groupMembershipAction` L625, `groupMembershipRequests` L619, `groupRevokeInvite` L616, `leaveGroup` L596, `listChats` L531, `listGroups` L571, `markRead` L526, `profilePicture` L658, `removeContact` L675, `saveContact` L668, `sendLocation` L488, `sendMedia` L480, `sendPoll` L496, `sendPresence` L504, `sendReaction` L550, `setBlock` L661, `setChatFlag` L541, `setGroupDescription` L606, `setGroupPhoto` L645, `setGroupSetting` L637, `setGroupSubject` L599, `setProfileName` L515, `setProfilePhoto` L518, `setProfileStatus` L512, `unfollowChannel` L693, `updateParticipants` L584
- `listGroups(sessionId)` · L571
  - chama: `IEngine.listGroups` (engine.port.ts:306), `working` L561
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L574
  - chama: `IEngine.groupInfo` (engine.port.ts:307), `working` L561
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L577
  - chama: `IEngine.createGroup` (engine.port.ts:308), `working` L561
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L584
  - chama: `IEngine.updateParticipants` (engine.port.ts:309), `working` L561
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L596
  - chama: `IEngine.leaveGroup` (engine.port.ts:314), `working` L561
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L599
  - chama: `IEngine.setGroupSubject` (engine.port.ts:315), `working` L561
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L606
  - chama: `IEngine.setGroupDescription` (engine.port.ts:316), `working` L561
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L613
  - chama: `IEngine.groupInviteCode` (engine.port.ts:317), `working` L561
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L616
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:318), `working` L561
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L619
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:321), `working` L561
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L625
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:322), `working` L561
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L637
  - chama: `IEngine.setGroupSetting` (engine.port.ts:328), `working` L561
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L645
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:334), `working` L561
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L655
  - chama: `IEngine.checkNumbers` (engine.port.ts:337), `working` L561
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L658
  - chama: `IEngine.profilePicture` (engine.port.ts:338), `working` L561
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L661
  - chama: `IEngine.setBlock` (engine.port.ts:339), `working` L561
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L668
  - chama: `IEngine.saveContact` (engine.port.ts:341), `working` L561
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L675
  - chama: `IEngine.removeContact` (engine.port.ts:343), `working` L561
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L680
  - chama: `IEngine.createChannel` (engine.port.ts:346), `working` L561
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L687
  - chama: `IEngine.channelInfo` (engine.port.ts:347), `working` L561
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L690
  - chama: `IEngine.followChannel` (engine.port.ts:348), `working` L561
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L693
  - chama: `IEngine.unfollowChannel` (engine.port.ts:349), `working` L561
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
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.start` (session-manager.service.ts:295), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:96), `SessionsController.ensure` (sessions.controller.ts:408)
  - `SessionRepository.findByName(name)` · L21
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:64)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:96)
  - `SessionRepository.list()` · L22
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:69)
    - chamado por: `SessionsController.create` (sessions.controller.ts:96), `SessionsController.list` (sessions.controller.ts:153)
  - `SessionRepository.updateStatus(id, status, patch)` · L25
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:76)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:378), `SessionManager.persistStatus` (session-manager.service.ts:245), `SessionManager.startWithTimeout` (session-manager.service.ts:306)
  - `SessionRepository.delete(id)` · L30
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:101)
    - chamado por: `SessionManager.remove` (session-manager.service.ts:428), `SessionsController.create` (sessions.controller.ts:96)
  - `SessionRepository.findAutostart()` · L31
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:105)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:69)

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

395 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys-content.ts`
- importa (interno): `modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys-content.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `EXTRA_WRAPPERS` = `new Set([ 'lottieStickerMessage', 'groupMentionedMessage', 'botInvoke…` · L33
- `IGNORED` = `new Set([ 'protocolMessage', 'senderKeyDistributionMessage', 'fastRat…` · L47
- `POLLS` = `new Set([ 'pollCreationMessage', 'pollCreationMessageV2', 'pollCreati…` · L73
- `toNum(v)` · L81
  - chamado por: `describeBaileysMessage` L162, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:175)
- `str(v)` · L91
  - chama: `clean` (message-content.ts:71)
  - chamado por: `describeBaileysMessage` L162, `join` L95, `mediaInfoOf` L106
- `join(parts, sep)` · L95
  - chama: `str` L91, `clean` (message-content.ts:71)
  - chamado por: `describeBaileysMessage` L162
- `mediaInfoOf(msg)` · L106
  - chama: `str` L91, `toNum` L81
  - chamado por: `describeBaileysMessage` L162
- `describeBaileysMessage(message, fromMe)` · L162
  - chama: `join` L95, `mediaInfoOf` L106, `str` L91, `textOrOther` L389, `toNum` L81, `content` (message-content.ts:37), `formatContacts` (message-content.ts:108), `formatEvent` (message-content.ts:135), `formatLocation` (message-content.ts:83), `formatPoll` (message-content.ts:124), `forwarding` (message-content.ts:55), `ignore` (message-content.ts:33)
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:825)
- `textOrOther(text, fwd)` · L389
  - chama: `content` (message-content.ts:37)
  - chamado por: `describeBaileysMessage` L162

**Tipos**
- type `BaileysDescribed` L27

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

1718 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L387 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L388 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L389 · private · campo
- `status` · L390 · private · campo
- `qrBase64` · L391 · private · campo
- `stopped` · L392 · private · campo
- `reconnectAttempts` · L393 · private · campo
- `lifecycle` · L399 · private · campo
- `sentMessages` · L401 · private · campo
- `lidToPn` · L403 · private · campo
- `groupPushName` · L406 · private · campo
- `connectGeneration` · L411 · private · campo
- `groupMetaCache` · L413 · private · campo
- `constructor(deps)` · L418
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L420 · private
  - chamado por: `connect` L471, `groupInfo` L1438, `listGroups` L1430
- `clearReconnectTimer()` · L429 · private
  - chamado por: `doLogout` L1679, `doStop` L1618, `onConnectionUpdate` L709, `shutdown` L1660, `start` L461
- `getStatus()` · L434
  - implementa: `IEngine.getStatus` (engine.port.ts:293)
- `getQrBase64()` · L438
  - implementa: `IEngine.getQrBase64` (engine.port.ts:289)
- `setStatus(status, extra)` · L442 · private
  - chamado por: `connect` L471, `doLogout` L1679, `doStop` L1618, `onConnectionUpdate` L709, `requestPairingCode` L1603
- `serialize(fn)` · L452 · private
  - chamado por: `logout` L1674, `onConnectionUpdate` L709, `start` L461, `stop` L1611
- `start()` · L461
  - implementa: `IEngine.start` (engine.port.ts:243)
  - chama: `clearReconnectTimer` L429, `connect` L471, `serialize` L452
- `connect()` · L471 · private · async
  - chama: `cacheGroupMeta` L420, `loadMessageForRetry` L1234, `onConnectionUpdate` L709, `onContacts` L1387, `onMessagesUpdate` L915, `onMessagesUpsert` L825, `onReactions` L604, `safe` L1269, `setStatus` L442, `latestBaileysVersion` L113, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L709, `start` L461
- `onReactions(reactions)` · L604 · private
  - chama: `learnPair` L640, `resolveChatJid` L633, `mapBaileysReaction` L175
  - chamado por: `connect` L471
- `resolveChatJid(jid)` · L633 · private
  - chamado por: `groupSenderOf` L667, `onReactions` L604
- `learnPair(a, b)` · L640 · private
  - chama: `learnLid` L647
  - chamado por: `onReactions` L604
- `learnLid(lid, pn)` · L647 · private
  - chama: `mergeLidMessages` L1344
  - chamado por: `groupSenderOf` L667, `learnPair` L640, `onMessagesUpsert` L825
- `groupSenderOf(m)` · L667 · private
  - chama: `learnLid` L647, `rememberGroupPushName` L701, `resolveChatJid` L633, `phoneFirst` L202
  - chamado por: `onMessagesUpsert` L825
- `rememberGroupPushName(pn, pushName)` · L701 · private
  - chamado por: `groupSenderOf` L667
- `onConnectionUpdate(update)` · L709 · private · async
  - chama: `clearCredentials` L1702, `clearReconnectTimer` L429, `connect` L471, `detachSocketListeners` L1635, `serialize` L452, `setStatus` L442, `warmLidCache` L1330
  - chamado por: `connect` L471
- `onMessagesUpsert(upsert)` · L825 · private
  - chama: `describeBaileysMessage` (baileys-content.ts:162), `groupSenderOf` L667, `handleIncomingMedia` L942, `learnLid` L647
  - chamado por: `connect` L471
- `onMessagesUpdate(updates)` · L915 · private
  - chama: `mapAckStatus` L221
  - chamado por: `connect` L471
- `handleIncomingMedia(m, base, media)` · L942 · private · async
  - chama: `extOf` L207
  - chamado por: `onMessagesUpsert` L825
- `sendText(to, text, opts)` · L1010 · async
  - implementa: `IEngine.sendText` (engine.port.ts:255)
  - chama: `cacheSent` L1220, `resolveJid` L1170, `encodeProto` L156
- `sendMedia(to, input)` · L1042 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:260)
  - chama: `cacheSent` L1220, `resolveJid` L1170, `buildMediaContent` L239, `encodeProto` L156, `extOf` L207
- `sendLocation(to, input)` · L1097 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:265)
  - chama: `emitOutbound` L1138, `resolveJid` L1170
- `sendPoll(to, input)` · L1120 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:269)
  - chama: `emitOutbound` L1138, `resolveJid` L1170
- `emitOutbound(sent, jid, type, text, opts)` · L1138 · private
  - chama: `cacheSent` L1220, `encodeProto` L156
  - chamado por: `sendLocation` L1097, `sendPoll` L1120
- `resolveJid(to)` · L1170 · private · async
  - chama: `toJid` L1713
  - chamado por: `resolveParticipants` L1321, `sendLocation` L1097, `sendMedia` L1042, `sendPoll` L1120, `sendText` L1010
- `sendPresence(to, state)` · L1175 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:273)
  - chama: `sk` L1288, `toJid` L1713
- `setProfileStatus(status)` · L1185 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:275)
  - chama: `sk` L1288
- `setProfileName(name)` · L1188 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:276)
  - chama: `sk` L1288
- `setProfilePhoto(image, _mimetype)` · L1191 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:277)
  - chama: `sk` L1288
- `markRead(chatJid, msgId)` · L1199 · async
  - implementa: `IEngine.markRead` (engine.port.ts:279)
  - chama: `sk` L1288, `toJid` L1713
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1207 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:283)
  - chama: `toJid` L1713
- `cacheSent(keyId, message)` · L1220 · private
  - chamado por: `emitOutbound` L1138, `loadMessageForRetry` L1234, `sendMedia` L1042, `sendText` L1010
- `loadMessageForRetry(key)` · L1234 · private · async
  - chama: `cacheSent` L1220, `decodeProto` L159
  - chamado por: `connect` L471
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1269 · private
  - chamado por: `connect` L471
- `sk()` · L1288 · private
  - chamado por: `channelInfo` L1592, `checkNumbers` L1540, `createChannel` L1585, `createGroup` L1446, `followChannel` L1596, `groupInfo` L1438, `groupInviteCode` L1471, `groupMembershipAction` L1492, `groupMembershipRequests` L1480, `groupRevokeInvite` L1474, `leaveGroup` L1462, `listGroups` L1430, `markRead` L1199, `profilePicture` L1555, `removeContact` L1580, `saveContact` L1567, `sendPresence` L1175, `setBlock` L1564, `setGroupDescription` L1468, `setGroupPhoto` L1531, `setGroupSetting` L1514, `setGroupSubject` L1465, `setProfileName` L1188, `setProfilePhoto` L1191, `setProfileStatus` L1185, `unfollowChannel` L1599, `updateParticipants` L1454
- `listChats(_limit)` · L1295 · async
  - implementa: `IEngine.listChats` (engine.port.ts:298)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:233)
- `fetchChatHistory(_chatJid, _limit)` · L1300 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:299)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:233)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1311 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:303)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:233)
- `resolveParticipants(items)` · L1321 · private · async
  - chama: `resolveJid` L1170
  - chamado por: `createGroup` L1446, `groupMembershipAction` L1492, `updateParticipants` L1454
- `warmLidCache()` · L1330 · private · async
  - chama: `mergeKnownLids` L1367
  - chamado por: `onConnectionUpdate` L709
- `mergeLidMessages(lid, phoneJid)` · L1344 · private · async
  - chamado por: `learnLid` L647, `mergeKnownLids` L1367
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L1367 · private · async
  - chama: `mergeLidMessages` L1344
  - chamado por: `warmLidCache` L1330
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1387 · private
  - chama: `contactToRecord` L136
  - chamado por: `connect` L471
- `recordGroupParticipants(md)` · L1394 · private
  - chamado por: `groupInfo` L1438, `listGroups` L1430
- `resolveParticipantNames(groups)` · L1408 · private · async
  - chama: `resolveParticipantPhone` L279
  - chamado por: `groupInfo` L1438, `listGroups` L1430
- `listGroups()` · L1430 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:306)
  - chama: `cacheGroupMeta` L420, `recordGroupParticipants` L1394, `resolveParticipantNames` L1408, `sk` L1288, `toGroupInfo` L327
- `groupInfo(jid)` · L1438 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:307)
  - chama: `cacheGroupMeta` L420, `recordGroupParticipants` L1394, `resolveParticipantNames` L1408, `sk` L1288, `toGroupInfo` L327, `toGroupJid` L371
- `createGroup(subject, participants)` · L1446 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:308)
  - chama: `resolveParticipants` L1321, `sk` L1288, `toGroupInfo` L327
- `updateParticipants(jid, action, participants)` · L1454 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:309)
  - chama: `resolveParticipants` L1321, `sk` L1288, `toGroupJid` L371
- `leaveGroup(jid)` · L1462 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:314)
  - chama: `sk` L1288, `toGroupJid` L371
- `setGroupSubject(jid, subject)` · L1465 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:315)
  - chama: `sk` L1288, `toGroupJid` L371
- `setGroupDescription(jid, description)` · L1468 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:316)
  - chama: `sk` L1288, `toGroupJid` L371
- `groupInviteCode(jid)` · L1471 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:317)
  - chama: `sk` L1288, `toGroupJid` L371
- `groupRevokeInvite(jid)` · L1474 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:318)
  - chama: `sk` L1288, `toGroupJid` L371
- `groupMembershipRequests(jid)` · L1480 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:321)
  - chama: `sk` L1288, `toGroupJid` L371
- `groupMembershipAction(jid, action, participants)` · L1492 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:322)
  - chama: `resolveParticipants` L1321, `sk` L1288, `toGroupJid` L371
- `setGroupSetting(jid, setting, enabled)` · L1514 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:328)
  - chama: `sk` L1288, `toGroupJid` L371
- `setGroupPhoto(jid, image, _mimetype)` · L1531 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:334)
  - chama: `sk` L1288, `toGroupJid` L371
- `checkNumbers(numbers)` · L1540 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:337)
  - chama: `sk` L1288
- `profilePicture(jid)` · L1555 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:338)
  - chama: `sk` L1288, `toContactJid` L374
- `setBlock(jid, action)` · L1564 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:339)
  - chama: `sk` L1288, `toContactJid` L374
- `saveContact(jid, input)` · L1567 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:341)
  - chama: `sk` L1288, `toContactJid` L374
- `removeContact(jid)` · L1580 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:343)
  - chama: `sk` L1288, `toContactJid` L374
- `createChannel(name, description)` · L1585 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:346)
  - chama: `sk` L1288, `toChannelInfo` L360
- `channelInfo(jid)` · L1592 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:347)
  - chama: `sk` L1288, `toChannelInfo` L360
- `followChannel(jid)` · L1596 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:348)
  - chama: `sk` L1288
- `unfollowChannel(jid)` · L1599 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:349)
  - chama: `sk` L1288
- `requestPairingCode(phoneNumber)` · L1603 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:254)
  - chama: `setStatus` L442
- `stop()` · L1611
  - implementa: `IEngine.stop` (engine.port.ts:244)
  - chama: `doStop` L1618, `serialize` L452
- `doStop()` · L1618 · private · async
  - chama: `clearReconnectTimer` L429, `detachSocketListeners` L1635, `setStatus` L442
  - chamado por: `stop` L1611
- `detachSocketListeners()` · L1635 · private
  - chamado por: `doLogout` L1679, `doStop` L1618, `onConnectionUpdate` L709, `shutdown` L1660
- `shutdown()` · L1660 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:252)
  - chama: `clearReconnectTimer` L429, `detachSocketListeners` L1635
- `logout()` · L1674
  - implementa: `IEngine.logout` (engine.port.ts:253)
  - chama: `doLogout` L1679, `serialize` L452
- `doLogout()` · L1679 · private · async
  - chama: `clearCredentials` L1702, `clearReconnectTimer` L429, `detachSocketListeners` L1635, `setStatus` L442
  - chamado por: `logout` L1674
- `clearCredentials()` · L1702 · private · async
  - chamado por: `doLogout` L1679, `onConnectionUpdate` L709
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L113 · async
  - chamado por: `connect` L471
- `contactToRecord(c, source)` · L136
  - chamado por: `onContacts` L1387
- `encodeProto(msg)` · L156
  - chamado por: `emitOutbound` L1138, `sendMedia` L1042, `sendText` L1010
- `decodeProto(value)` · L159
  - chamado por: `loadMessageForRetry` L1234
- `mapBaileysReaction(key, reaction, ourJid)` · L175
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L202
  - chamado por: `onReactions` L604
- `phoneFirst(a, b)` · L202
  - chamado por: `groupSenderOf` L667, `mapBaileysReaction` L175
- `extOf(mimetype, fileName)` · L207
  - chamado por: `handleIncomingMedia` L942, `sendMedia` L1042
- `mapAckStatus(status)` · L221
  - chamado por: `onMessagesUpdate` L915
- `buildMediaContent(input)` · L239
  - chamado por: `sendMedia` L1042
- `resolveParticipantPhone(p, lidToPn)` · L279
  - chamado por: `resolveParticipantNames` L1408, `toGroupInfo` L327
- `dirNameFor(p, phone, names)` · L313
  - chamado por: `toGroupInfo` L327
- `toGroupInfo(md, lidToPn, names)` · L327
  - chama: `dirNameFor` L313, `resolveParticipantPhone` L279
  - chamado por: `createGroup` L1446, `groupInfo` L1438, `listGroups` L1430
- `toChannelInfo(md)` · L360
  - chamado por: `channelInfo` L1592, `createChannel` L1585
- `toGroupJid(jid)` · L371
  - chamado por: `groupInfo` L1438, `groupInviteCode` L1471, `groupMembershipAction` L1492, `groupMembershipRequests` L1480, `groupRevokeInvite` L1474, `leaveGroup` L1462, `setGroupDescription` L1468, `setGroupPhoto` L1531, `setGroupSetting` L1514, `setGroupSubject` L1465, `updateParticipants` L1454
- `toContactJid(jid)` · L374
  - chamado por: `profilePicture` L1555, `removeContact` L1580, `saveContact` L1567, `setBlock` L1564
- `toJid(to)` · L1713
  - chamado por: `markRead` L1199, `resolveJid` L1170, `sendPresence` L1175, `sendReaction` L1207

**Tipos**
- interface `BaileysEngineDeps` L57 · 11 propriedade(s)
- type `BaileysVersion` L104
- type `RawParticipant` L266
- type `RawGroup` L293
- type `RawNewsletter` L303

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:471)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:471)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:418), `WWebJSEngine.constructor` (wwebjs.engine.ts:362)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:136)

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
- importado por: `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/message-content.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`

**Funções e constantes de topo**
- `ignore(reason)` · L33
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `content(type, text, fwd, media)` · L37
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `textOrOther` (baileys-content.ts:389), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `forwarding(isForwarded, score)` · L55
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `clean(text)` · L71
  - chamado por: `join` (baileys-content.ts:95), `str` (baileys-content.ts:91), `content` L37, `formatContacts` L108, `formatEvent` L135, `formatLocation` L83, `formatPoll` L124, `str` (wwebjs-content.ts:72)
- `coord(v)` · L76
  - chamado por: `formatLocation` L83
- `formatLocation(loc)` · L83
  - chama: `clean` L71, `coord` L76
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatEvent(name, description)` · L135
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:162), `describeWwebjsMessage` (wwebjs-content.ts:78)

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

246 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**Funções e constantes de topo**
- `IGNORED` = `new Set([ 'revoked', 'reaction', 'protocol', 'ciphertext', 'gp2', 'e2…` · L44
- `str(v)` · L72
  - chama: `clean` (message-content.ts:71)
  - chamado por: `describeWwebjsMessage` L78
- `describeWwebjsMessage(msg)` · L78
  - chama: `content` (message-content.ts:37), `formatContacts` (message-content.ts:108), `formatEvent` (message-content.ts:135), `formatLocation` (message-content.ts:83), `formatPoll` (message-content.ts:124), `forwarding` (message-content.ts:55), `ignore` (message-content.ts:33), `str` L72
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:1606), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2272)
- `serializedOf(k)` · L186
  - chamado por: `jidOf` L195, `mapWwebjsReaction` L223
- `jidOf(v)` · L195
  - chama: `serializedOf` L186
  - chamado por: `mapWwebjsReaction` L223, `wwebjsGroupSender` L207
- `wwebjsGroupSender(chatRaw, author, lidToPn)` · L207
  - chama: `jidOf` L195
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:1606), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2272)
- `mapWwebjsReaction(r)` · L223
  - chama: `jidOf` L195, `serializedOf` L186
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:1818)

**Tipos**
- interface `WwebjsMessageLike` L17 · 15 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

2691 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `WWebJSEngine`** L308 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L309 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L310 · private · campo
- `status` · L311 · private · campo
- `qrBase64` · L312 · private · campo
- `stopped` · L313 · private · campo
- `lidToPnCache` · L316 · private · campo
- `pnToLidOutbound` · L320 · private · campo
- `sentByPanel` · L323 · private · campo
- `anonProxyUrl` · L326 · private · campo
- `lifecycle` · L333 · private · campo
- `reconnectAttempts` · L335 · private · campo
- `lastLoadingPct` · L339 · private · campo
- `logoutTimeoutMs` · L342 · private · campo
- `destroyTimeoutMs` · L346 · private · campo
- `generation` · L350 · private · campo
- `lastQrAt` · L352 · private · campo
- `qrHeals` · L354 · private · campo
- `qrWatchdogIntervalMs` · L356 · private · campo
- `qrStaleMs` · L357 · private · campo
- `initTimeoutMs` · L358 · private · campo
- `lastPairingCode` · L360 · private · campo
- `constructor(deps)` · L362
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L366 · private
  - chamado por: `handleDisconnect` L1113, `logout` L1322, `qrWatchdogTick` L426, `start` L589, `stop` L1270
- `getStatus()` · L375
  - implementa: `IEngine.getStatus` (engine.port.ts:293)
- `getQrBase64()` · L378
  - implementa: `IEngine.getQrBase64` (engine.port.ts:289)
- `getPairingCode()` · L381
  - implementa: `IEngine.getPairingCode` (engine.port.ts:292)
- `setStatus(status, extra)` · L385 · private
  - chama: `startQrWatchdog` L411, `startSyncWatchdog` L483, `stopQrWatchdog` L421, `stopSyncWatchdog` L494
  - chamado por: `doLogout` L1327, `doStart` L595, `doStop` L1277, `handleDisconnect` L1113, `handleInitFailure` L1000, `qrWatchdogTick` L426, `requestPairingCode` L1359, `syncWatchdogTick` L501
- `startQrWatchdog()` · L411 · private
  - chama: `qrWatchdogTick` L426
  - chamado por: `setStatus` L385
- `stopQrWatchdog()` · L421 · private
  - chamado por: `qrWatchdogTick` L426, `setStatus` L385
- `qrWatchdogTick()` · L426 · private · async
  - chama: `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `doStart` L595, `serialize` L366, `setStatus` L385, `stopQrWatchdog` L421
  - chamado por: `startQrWatchdog` L411
- `watchdogFails` · L478 · private · campo
- `watchdogDegraded` · L479 · private · campo
- `WATCHDOG_INTERVAL_MS` · L480 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L481 · private · static · campo
- `startSyncWatchdog()` · L483 · private
  - chama: `syncWatchdogTick` L501
  - chamado por: `setStatus` L385
- `stopSyncWatchdog()` · L494 · private
  - chamado por: `setStatus` L385, `shutdown` L1298
- `syncWatchdogTick()` · L501 · private · async
  - chama: `isPageCrashError` L91, `raceStoreOp` L281, `healWedgedPage` L2202, `setStatus` L385, `syncHint` L2187
  - chamado por: `startSyncWatchdog` L483
- `clearStaleSingletonLocks()` · L563 · private · async
  - chama: `authDirOf` L192
  - chamado por: `doStart` L595
- `purgeAuthDir(sessionId)` · L583 · static · async
  - chama: `authDirOf` L192
  - chamado por: `SessionManager.logout` (session-manager.service.ts:378), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.remove` (session-manager.service.ts:428), `doLogout` L1327
- `start()` · L589
  - implementa: `IEngine.start` (engine.port.ts:243)
  - chama: `doStart` L595, `serialize` L366
- `doStart(attempt, forceLive)` · L595 · private · async
  - chama: `buildAuthProxyUrl` L178, `raceStoreOp` L281, `userAgentFor` L109, `checkPinnedBuildAge` L883, `clearStaleSingletonLocks` L563, `closeAnonProxy` L1180, `consumeCleanShutdownMarker` L1240, `ensureWebVersionHtml` L929, `handleDisconnect` L1113, `handleInitFailure` L1000, `mergeExistingLids` L2023, `onMessageAck` L1794, `onMessageCreate` L1606, `onReaction` L1818, `resolveWebVersion` L963, `setStatus` L385, `syncAddressBook` L2051
  - chamado por: `handleDisconnect` L1113, `handleInitFailure` L1000, `qrWatchdogTick` L426, `start` L589
- `checkPinnedBuildAge(version)` · L883 · private · async
  - chama: `loadBuildCatalog` L198
  - chamado por: `doStart` L595
- `ensureWebVersionHtml(version)` · L929 · private · async
  - chamado por: `doStart` L595
- `resolveWebVersion(forceLive)` · L963 · private · async
  - chamado por: `doStart` L595
- `handleInitFailure(e, attempt, pinnedVersion)` · L1000 · private · async
  - chama: `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `doStart` L595, `setStatus` L385
  - chamado por: `doStart` L595
- `handleDisconnect(reason)` · L1113 · private · async
  - chama: `raceStoreOp` L281, `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `doStart` L595, `serialize` L366, `setStatus` L385
  - chamado por: `doStart` L595
- `closeAnonProxy()` · L1180 · private · async
  - chamado por: `doLogout` L1327, `doStart` L595, `doStop` L1277, `handleDisconnect` L1113, `handleInitFailure` L1000, `qrWatchdogTick` L426, `shutdown` L1298
- `destroyWithTimeout()` · L1199 · private · async
  - chamado por: `doLogout` L1327, `doStop` L1277, `handleDisconnect` L1113, `handleInitFailure` L1000, `qrWatchdogTick` L426, `shutdown` L1298
- `markCleanShutdown()` · L1223 · private · async
  - chama: `authDirOf` L192
  - chamado por: `doStop` L1277, `shutdown` L1298
- `consumeCleanShutdownMarker()` · L1240 · private · async
  - chama: `authDirOf` L192
  - chamado por: `doStart` L595
- `stop()` · L1270
  - implementa: `IEngine.stop` (engine.port.ts:244)
  - chama: `doStop` L1277, `serialize` L366
- `doStop()` · L1277 · private · async
  - chama: `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `markCleanShutdown` L1223, `setStatus` L385
  - chamado por: `stop` L1270
- `shutdown()` · L1298 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:252)
  - chama: `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `markCleanShutdown` L1223, `stopSyncWatchdog` L494
- `logout()` · L1322
  - implementa: `IEngine.logout` (engine.port.ts:253)
  - chama: `doLogout` L1327, `serialize` L366
- `doLogout()` · L1327 · private · async
  - chama: `raceStoreOp` L281, `closeAnonProxy` L1180, `destroyWithTimeout` L1199, `purgeAuthDir` L583, `setStatus` L385
  - chamado por: `logout` L1322
- `requestPairingCode(phoneNumber)` · L1359 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:254)
  - chama: `req` L2095, `setStatus` L385
- `sendText(to, text, opts)` · L1372 · async
  - implementa: `IEngine.sendText` (engine.port.ts:255)
  - chama: `assertPageResponsive` L2160, `rememberPanel` L1832, `req` L2095, `toChatId` L2090, `toMentionIds` L1597, `withLidFallback` L1927
- `sendMedia(to, input)` · L1402 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:260)
  - chama: `extOf` L129, `assertPageResponsive` L2160, `rememberPanel` L1832, `req` L2095, `toChatId` L2090, `toMentionIds` L1597, `withLidFallback` L1927
- `sendLocation(to, input)` · L1476 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:265)
  - chama: `assertPageResponsive` L2160, `emitOutbound` L1527, `rememberPanel` L1832, `req` L2095, `toChatId` L2090, `withLidFallback` L1927
- `sendPoll(to, input)` · L1504 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:269)
  - chama: `assertPageResponsive` L2160, `emitOutbound` L1527, `rememberPanel` L1832, `req` L2095, `toChatId` L2090, `withLidFallback` L1927
- `emitOutbound(keyId, jid, type, text, opts)` · L1527 · private
  - chamado por: `sendLocation` L1476, `sendPoll` L1504
- `setProfileStatus(status)` · L1549 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:275)
  - chama: `req` L2095
- `setProfileName(name)` · L1552 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:276)
  - chama: `req` L2095
- `setProfilePhoto(image, mimetype)` · L1555 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:277)
  - chama: `req` L2095
- `sendPresence(to, state)` · L1560 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:273)
  - chama: `req` L2095, `toChatId` L2090, `withLidFallback` L1927
- `markRead(chatJid, _msgId)` · L1578 · async
  - implementa: `IEngine.markRead` (engine.port.ts:279)
  - chama: `req` L2095, `toChatId` L2090, `withLidFallback` L1927
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1587 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:283)
  - chama: `req` L2095, `withStoreReady` L2112
- `toMentionIds(mentions)` · L1597 · private
  - chama: `toChatId` L2090
  - chamado por: `sendMedia` L1402, `sendText` L1372
- `onMessageCreate(msg)` · L1606 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:207), `mapInboundMediaType` L144, `handleIncomingMedia` L1684, `resolveNumberJid` L1843
  - chamado por: `doStart` L595
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L1684 · private · async
  - chama: `extOf` L129, `isPageCrashError` L91, `mapInboundMediaType` L144, `healWedgedPage` L2202
  - chamado por: `onMessageCreate` L1606
- `mapAck(ack)` · L1780 · private
  - chamado por: `onMessageAck` L1794
- `onMessageAck(msg, ack)` · L1794 · private
  - chama: `mapAck` L1780
  - chamado por: `doStart` L595
- `onReaction(r)` · L1818 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:223), `resolveNumberJid` L1843
  - chamado por: `doStart` L595
- `rememberPanel(keyId)` · L1832 · private
  - chamado por: `sendLocation` L1476, `sendMedia` L1402, `sendPoll` L1504, `sendText` L1372
- `resolveNumberJid(rawId)` · L1843 · private · async
  - chama: `cacheLidPn` L1864, `mergeLidMessages` L1999, `resolveLidToPhone` L1875
  - chamado por: `mergeExistingLids` L2023, `onMessageCreate` L1606, `onReaction` L1818, `toHistoryMessage` L2272
- `cacheLidPn(lid, phoneJid)` · L1864 · private
  - chamado por: `rememberOutboundLid` L1976, `resolveNumberJid` L1843, `resolvePendingLids` L2463
- `resolveLidToPhone(lid)` · L1875 · private · async
  - chamado por: `resolveNumberJid` L1843, `resolvePendingLids` L2463
- `withLidFallback(pnJid, op)` · L1927 · private · async
  - chama: `rememberOutboundLid` L1976, `resolvePhoneToLid` L1951, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `markRead` L1578, `sendLocation` L1476, `sendMedia` L1402, `sendPoll` L1504, `sendPresence` L1560, `sendText` L1372
- `resolvePhoneToLid(phoneJid)` · L1951 · private · async
  - chamado por: `withLidFallback` L1927
- `rememberOutboundLid(pnJid, lid)` · L1976 · private
  - chama: `cacheLidPn` L1864
  - chamado por: `withLidFallback` L1927
- `mergeLidMessages(lid, phoneJid)` · L1999 · private · async
  - chamado por: `resolveNumberJid` L1843
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2023 · private · async
  - chama: `resolveNumberJid` L1843
  - chamado por: `doStart` L595
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2051 · private · async
  - chama: `req` L2095, `withStoreReady` L2112
  - chamado por: `doStart` L595
- `toChatId(to)` · L2090 · private
  - chamado por: `createGroup` L2499, `fetchChatHistory` L2254, `groupMembershipAction` L2569, `markRead` L1578, `profilePicture` L2617, `sendLocation` L1476, `sendMedia` L1402, `sendPoll` L1504, `sendPresence` L1560, `sendText` L1372, `setBlock` L2628, `setChatFlag` L2309, `toMentionIds` L1597, `updateParticipants` L2514
- `req()` · L2095 · private
  - chamado por: `channelInfo` L2670, `checkNumbers` L2606, `createChannel` L2652, `createGroup` L2499, `fetchChatHistory` L2254, `followChannel` L2683, `getGroupChat` L2356, `listChats` L2234, `listGroups` L2337, `markRead` L1578, `profilePicture` L2617, `removeContact` L2647, `requestPairingCode` L1359, `resolvePendingLids` L2463, `saveContact` L2636, `sendLocation` L1476, `sendMedia` L1402, `sendPoll` L1504, `sendPresence` L1560, `sendReaction` L1587, `sendText` L1372, `setBlock` L2628, `setChatFlag` L2309, `setProfileName` L1552, `setProfilePhoto` L1555, `setProfileStatus` L1549, `syncAddressBook` L2051, `unfollowChannel` L2687
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2112 · private · async
  - chama: `isPageCrashError` L91, `raceStoreOp` L281, `assertPageResponsive` L2160, `healWedgedPage` L2202, `syncHint` L2187
  - chamado por: `channelInfo` L2670, `checkNumbers` L2606, `createChannel` L2652, `createGroup` L2499, `fetchChatHistory` L2254, `followChannel` L2683, `getGroupChat` L2356, `listChats` L2234, `listGroups` L2337, `profilePicture` L2617, `removeContact` L2647, `saveContact` L2636, `sendReaction` L1587, `setBlock` L2628, `setChatFlag` L2309, `syncAddressBook` L2051, `unfollowChannel` L2687
- `assertPageResponsive(probeTimeoutMs)` · L2160 · private · async
  - chama: `isPageCrashError` L91, `raceStoreOp` L281, `healWedgedPage` L2202, `syncHint` L2187
  - chamado por: `sendLocation` L1476, `sendMedia` L1402, `sendPoll` L1504, `sendText` L1372, `withStoreReady` L2112
- `syncHint()` · L2187 · private
  - chamado por: `assertPageResponsive` L2160, `syncWatchdogTick` L501, `withStoreReady` L2112
- `lastHealAt` · L2198 · private · campo
- `healing` · L2199 · private · campo
- `HEAL_COOLDOWN_MS` · L2200 · private · static · campo
- `healWedgedPage()` · L2202 · private · async
  - chamado por: `assertPageResponsive` L2160, `handleIncomingMedia` L1684, `syncWatchdogTick` L501, `withStoreReady` L2112
- `listChats(limit)` · L2234 · async
  - implementa: `IEngine.listChats` (engine.port.ts:298)
  - chama: `req` L2095, `withStoreReady` L2112
- `fetchChatHistory(chatJid, limit)` · L2254 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:299)
  - chama: `req` L2095, `toChatId` L2090, `toHistoryMessage` L2272, `withStoreReady` L2112
- `toHistoryMessage(msg)` · L2272 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:207), `mapInboundMediaType` L144, `resolveNumberJid` L1843
  - chamado por: `fetchChatHistory` L2254
- `setChatFlag(chatJid, flag, enabled)` · L2309 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:303)
  - chama: `req` L2095, `toChatId` L2090, `withStoreReady` L2112
- `listGroups()` · L2337 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:306)
  - chama: `groupFlags` L163, `req` L2095, `withStoreReady` L2112
- `getGroupChat(jid)` · L2356 · private · async
  - chama: `req` L2095, `toGroupId` L2495, `withStoreReady` L2112
  - chamado por: `groupInfo` L2365, `groupInviteCode` L2539, `groupMembershipAction` L2569, `groupMembershipRequests` L2551, `groupRevokeInvite` L2543, `leaveGroup` L2527, `setGroupDescription` L2535, `setGroupPhoto` L2595, `setGroupSetting` L2584, `setGroupSubject` L2531, `updateParticipants` L2514
- `groupInfo(jid)` · L2365 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:307)
  - chama: `groupFlags` L163, `getGroupChat` L2356, `resolveParticipantsBatch` L2393
  - chamado por: `createGroup` L2499
- `LID_BATCH` · L2382 · private · static · campo
- `resolveParticipantsBatch(list)` · L2393 · private · async
  - chama: `resolvePendingLids` L2463
  - chamado por: `groupInfo` L2365
- `resolvePendingLids(rows)` · L2463 · private · async
  - chama: `cacheLidPn` L1864, `req` L2095, `resolveLidToPhone` L1875
  - chamado por: `resolveParticipantsBatch` L2393
- `toGroupId(jid)` · L2495 · private
  - chamado por: `getGroupChat` L2356
- `createGroup(subject, participants)` · L2499 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:308)
  - chama: `groupInfo` L2365, `req` L2095, `toChatId` L2090, `withStoreReady` L2112
- `updateParticipants(jid, action, participants)` · L2514 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:309)
  - chama: `getGroupChat` L2356, `toChatId` L2090
- `leaveGroup(jid)` · L2527 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:314)
  - chama: `getGroupChat` L2356
- `setGroupSubject(jid, subject)` · L2531 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:315)
  - chama: `getGroupChat` L2356
- `setGroupDescription(jid, description)` · L2535 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:316)
  - chama: `getGroupChat` L2356
- `groupInviteCode(jid)` · L2539 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:317)
  - chama: `getGroupChat` L2356
- `groupRevokeInvite(jid)` · L2543 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:318)
  - chama: `getGroupChat` L2356
- `groupMembershipRequests(jid)` · L2551 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:321)
  - chama: `getGroupChat` L2356
- `groupMembershipAction(jid, action, participants)` · L2569 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:322)
  - chama: `getGroupChat` L2356, `toChatId` L2090
- `setGroupSetting(jid, setting, enabled)` · L2584 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:328)
  - chama: `getGroupChat` L2356
- `setGroupPhoto(jid, image, mimetype)` · L2595 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:334)
  - chama: `getGroupChat` L2356
- `checkNumbers(numbers)` · L2606 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:337)
  - chama: `req` L2095, `withStoreReady` L2112
- `profilePicture(jid)` · L2617 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:338)
  - chama: `req` L2095, `toChatId` L2090, `withStoreReady` L2112
- `setBlock(jid, action)` · L2628 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:339)
  - chama: `req` L2095, `toChatId` L2090, `withStoreReady` L2112
- `saveContact(jid, input)` · L2636 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:341)
  - chama: `req` L2095, `withStoreReady` L2112
- `removeContact(jid)` · L2647 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:343)
  - chama: `req` L2095, `withStoreReady` L2112
- `createChannel(name, description)` · L2652 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:346)
  - chama: `req` L2095, `withStoreReady` L2112
- `channelInfo(jid)` · L2670 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:347)
  - chama: `req` L2095, `withStoreReady` L2112
- `followChannel(jid)` · L2683 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:348)
  - chama: `req` L2095, `withStoreReady` L2112
- `unfollowChannel(jid)` · L2687 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:349)
  - chama: `req` L2095, `withStoreReady` L2112

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L87
- `isPageCrashError(message)` · L91
  - chamado por: `assertPageResponsive` L2160, `handleIncomingMedia` L1684, `syncWatchdogTick` L501, `withStoreReady` L2112
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L99
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `userAgentFor(sessionId)` · L109
  - chamado por: `doStart` L595
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L129
  - chamado por: `handleIncomingMedia` L1684, `sendMedia` L1402
- `mapInboundMediaType(t)` · L144
  - chamado por: `handleIncomingMedia` L1684, `onMessageCreate` L1606, `toHistoryMessage` L2272
- `groupFlags(g)` · L163
  - chamado por: `groupInfo` L2365, `listGroups` L2337
- `buildAuthProxyUrl(server, username, password)` · L178
  - chamado por: `doStart` L595
- `authDirOf(sessionId)` · L192
  - chamado por: `clearStaleSingletonLocks` L563, `consumeCleanShutdownMarker` L1240, `markCleanShutdown` L1223, `purgeAuthDir` L583
- `loadBuildCatalog()` · L198 · async
  - chamado por: `checkPinnedBuildAge` L883
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L247
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L275
- `raceStoreOp(op, ms, timeoutMsg)` · L281 · async
  - chamado por: `assertPageResponsive` L2160, `doLogout` L1327, `doStart` L595, `handleDisconnect` L1113, `syncWatchdogTick` L501, `withStoreReady` L2112

**Tipos**
- interface `BuildCatalogEntry` L258 · 3 propriedade(s)
- interface `BuildCatalog` L263 · 3 propriedade(s)

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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:1927)
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
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:232), `ProxyService.ensureAvailable` (proxy.service.ts:218), `SessionManager.start` (session-manager.service.ts:295), `SessionRepository.create` (session.repository.ts:19), `SessionRepository.delete` (session.repository.ts:30), `SessionRepository.findById` (session.repository.ts:20), `SessionRepository.findByName` (session.repository.ts:21), `SessionRepository.list` (session.repository.ts:22), `toDto` L45, `newId` (ulid.ts:4)
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
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:504)
- `profileStatus(id, body)` · L228 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:512)
- `profileName(id, body)` · L247 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:515)
- `profilePhoto(id, body)` · L267 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:518), `fetchImageByUrl` (safe-fetch.ts:204)
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
  - chama: `SessionManager.start` (session-manager.service.ts:295), `ensure` L408
- `stop(id)` · L327 · async · @Post(':id/stop')
  - chama: `SessionManager.stop` (session-manager.service.ts:368), `ensure` L408
- `restart(id)` · L334 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:372), `ensure` L408
- `logout(id)` · L341 · async · @Post(':id/logout')
  - chama: `SessionManager.logout` (session-manager.service.ts:378), `ensure` L408
- `remove(id)` · L348 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `SessionManager.remove` (session-manager.service.ts:428), `ensure` L408
- `qr(id)` · L356 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:447), `SessionManager.getQr` (session-manager.service.ts:443), `ensure` L408
- `newQr(id)` · L372 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:407), `ensure` L408
- `pairingCode(id, body)` · L379 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `ensure` L408
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
