<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 342 |
| `modules/sessions/application/session-config.service.ts` | 73 |
| `modules/sessions/application/session-manager.service.ts` | 697 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 1672 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 123 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 2649 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 226 |
| `modules/sessions/interface/dto.ts` | 53 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 414 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

342 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `UnsupportedEngineOperationError`** L223 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L224
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1259), `BaileysEngine.listChats` (baileys.engine.ts:1254), `BaileysEngine.setChatFlag` (baileys.engine.ts:1270)

**Tipos**
- interface `SessionStatePayload` L3 · 4 propriedade(s)
- type `MessageSource` L13
- interface `MessagePayload` L15 · 17 propriedade(s)
- type `AckStatus` L44
- interface `MessageAckPayload` L46 · 5 propriedade(s)
- interface `ReactionPayload` L55 · 6 propriedade(s)
- type `EngineEventName` L64
- type `EngineEventHandler` L66
- type `GuardrailEventName` L73
- type `WaEventName` L84
- interface `WaEventEnvelope` L87 · 7 propriedade(s)
- type `MediaSendType` L97
- interface `SendOptions` L102 · 3 propriedade(s)
- interface `SendMediaInput` L110 · 6 propriedade(s)
- interface `SendLocationInput` L120 · 4 propriedade(s)
- interface `SendPollInput` L126 · 3 propriedade(s)
- type `GroupParticipantRole` L133
- type `GroupParticipantAction` L134
- interface `GroupParticipantInfo` L136 · 4 propriedade(s)
- interface `GroupInfo` L142 · 8 propriedade(s)
- interface `ContactCheck` L152 · 3 propriedade(s)
- interface `MembershipRequest` L160 · 3 propriedade(s)
- type `GroupSettingKey` L167
- type `MembershipAction` L168
- interface `SaveContactInput` L173 · 3 propriedade(s)
- interface `ChannelInfo` L178 · 4 propriedade(s)
- interface `ChatSummary` L187 · 6 propriedade(s)
- type `ChatFlag` L198
- interface `HistoryMessage` L202 · 11 propriedade(s)
- type `PresenceState` L217
- interface `IEngine` L230 · 1 propriedade(s)
  - `IEngine.start()` · L234
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:510), `WWebJSEngine.start` (wwebjs.engine.ts:583)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.start` (session-manager.service.ts:295)
  - `IEngine.stop()` · L235
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1565), `WWebJSEngine.stop` (wwebjs.engine.ts:1264)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:269), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.onModuleDestroy` (session-manager.service.ts:95), `SessionManager.remove` (session-manager.service.ts:428), `SessionManager.stop` (session-manager.service.ts:368)
  - `IEngine.shutdown()` · L243
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:1614), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1292)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:95)
  - `IEngine.logout()` · L244
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:1628), `WWebJSEngine.logout` (wwebjs.engine.ts:1316)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:378)
  - `IEngine.requestPairingCode(phoneNumber)` · L245
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1557), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1353)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451)
  - `IEngine.sendText(to, text, opts)` · L246
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:969), `WWebJSEngine.sendText` (wwebjs.engine.ts:1366)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:466)
  - `IEngine.sendMedia(to, input)` · L251
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1001), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1396)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:480)
  - `IEngine.sendLocation(to, input)` · L256
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1056), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1470)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:488)
  - `IEngine.sendPoll(to, input)` · L260
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1079), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1498)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:496)
  - `IEngine.sendPresence(to, state)` · L264
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1134), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1554)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:504)
  - `IEngine.setProfileStatus(status)` · L266
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1144), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1543)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:512)
  - `IEngine.setProfileName(name)` · L267
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1147), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1546)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:515)
  - `IEngine.setProfilePhoto(image, mimetype)` · L268
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1150), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1549)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:518)
  - `IEngine.markRead(chatJid, msgId)` · L270
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1158), `WWebJSEngine.markRead` (wwebjs.engine.ts:1572)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:526)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L274
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1166), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1581)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:550)
  - `IEngine.getQrBase64()` · L280
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:487), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:372)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:443)
  - `IEngine.getPairingCode()` · L283
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:375)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:447)
  - `IEngine.getStatus()` · L284
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:483), `WWebJSEngine.getStatus` (wwebjs.engine.ts:369)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.sendText` (session-manager.service.ts:466), `SessionManager.working` (session-manager.service.ts:561)
  - `IEngine.listChats(limit)` · L289
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1254), `WWebJSEngine.listChats` (wwebjs.engine.ts:2196)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:531)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L290
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1259), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2216)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:534)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L294
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1270), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2267)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:541)
  - `IEngine.listGroups()` · L297
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1384), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2295)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:571)
  - `IEngine.groupInfo(jid)` · L298
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1392), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2323)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:574)
  - `IEngine.createGroup(subject, participants)` · L299
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1400), `WWebJSEngine.createGroup` (wwebjs.engine.ts:2457)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:577)
  - `IEngine.updateParticipants(jid, action, participants)` · L300
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1408), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:2472)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:584)
  - `IEngine.leaveGroup(jid)` · L305
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1416), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:2485)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:596)
  - `IEngine.setGroupSubject(jid, subject)` · L306
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1419), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:2489)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:599)
  - `IEngine.setGroupDescription(jid, description)` · L307
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1422), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:2493)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:606)
  - `IEngine.groupInviteCode(jid)` · L308
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1425), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:2497)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:613)
  - `IEngine.groupRevokeInvite(jid)` · L309
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1428), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:2501)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:616)
  - `IEngine.groupMembershipRequests(jid)` · L312
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1434), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:2509)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:619)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L313
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1446), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:2527)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:625)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L319
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1468), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:2542)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:637)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L325
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1485), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:2553)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:645)
  - `IEngine.checkNumbers(numbers)` · L328
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1494), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:2564)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:655)
  - `IEngine.profilePicture(jid)` · L329
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1509), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:2575)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:658)
  - `IEngine.setBlock(jid, action)` · L330
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1518), `WWebJSEngine.setBlock` (wwebjs.engine.ts:2586)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:661)
  - `IEngine.saveContact(jid, input)` · L332
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1521), `WWebJSEngine.saveContact` (wwebjs.engine.ts:2594)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:668)
  - `IEngine.removeContact(jid)` · L334
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1534), `WWebJSEngine.removeContact` (wwebjs.engine.ts:2605)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:675)
  - `IEngine.createChannel(name, description)` · L337
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1539), `WWebJSEngine.createChannel` (wwebjs.engine.ts:2610)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:680)
  - `IEngine.channelInfo(jid)` · L338
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1546), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:2628)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:687)
  - `IEngine.followChannel(jid)` · L339
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1550), `WWebJSEngine.followChannel` (wwebjs.engine.ts:2641)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:690)
  - `IEngine.unfollowChannel(jid)` · L340
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1553), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:2645)
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
  - chama: `IEngine.shutdown` (engine.port.ts:243), `IEngine.stop` (engine.port.ts:235)
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
  - chama: `IEngine.stop` (engine.port.ts:235)
  - chamado por: `persistStatus` L245
- `START_TIMEOUT_MS` · L293 · private · static · campo
- `start(sessionId)` · L295 · async
  - chama: `IEngine.start` (engine.port.ts:234), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L407, `onApplicationBootstrap` L69, `restart` L372, `SessionsController.create` (sessions.controller.ts:96), `SessionsController.start` (sessions.controller.ts:320)
- `startWithTimeout(sessionId, op)` · L306 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L451, `start` L295
- `withTimeout(op, ms)` · L346 · private · async
  - chamado por: `logout` L378, `newQr` L407, `remove` L428, `stop` L368
- `stop(sessionId)` · L368 · async
  - chama: `IEngine.stop` (engine.port.ts:235), `withTimeout` L346
  - chamado por: `restart` L372, `SessionsController.stop` (sessions.controller.ts:327)
- `restart(sessionId)` · L372 · async
  - chama: `start` L295, `stop` L368
  - chamado por: `SessionsController.restart` (sessions.controller.ts:334)
- `logout(sessionId)` · L378 · async
  - chama: `IEngine.logout` (engine.port.ts:244), `withTimeout` L346, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:577)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:341)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L407 · async
  - chama: `IEngine.stop` (engine.port.ts:235), `start` L295, `withTimeout` L346, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:577)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:372)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L428 · async
  - chama: `IEngine.stop` (engine.port.ts:235), `withTimeout` L346, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:577)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:348)
- `getQr(sessionId)` · L443
  - chama: `IEngine.getQrBase64` (engine.port.ts:280)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `getPairingCode(sessionId)` · L447
  - chama: `IEngine.getPairingCode` (engine.port.ts:283)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `requestPairingCode(sessionId, phoneNumber)` · L451 · async
  - chama: `IEngine.getStatus` (engine.port.ts:284), `IEngine.requestPairingCode` (engine.port.ts:245), `IEngine.start` (engine.port.ts:234), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:379)
- `sendText(sessionId, to, text, opts)` · L466 · async
  - chama: `IEngine.getStatus` (engine.port.ts:284), `IEngine.sendText` (engine.port.ts:246)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendText` (messages.controller.ts:483)
- `sendMedia(sessionId, to, input)` · L480 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:251), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendMedia` (messages.controller.ts:512), `MessagesController.sendMediaUrl` (messages.controller.ts:582)
- `sendLocation(sessionId, to, input)` · L488
  - chama: `IEngine.sendLocation` (engine.port.ts:256), `working` L561
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:654)
- `sendPoll(sessionId, to, input)` · L496
  - chama: `IEngine.sendPoll` (engine.port.ts:260), `working` L561
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:693)
- `sendPresence(sessionId, to, state)` · L504
  - chama: `IEngine.sendPresence` (engine.port.ts:264), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `SessionsController.presence` (sessions.controller.ts:212)
- `setProfileStatus(sessionId, status)` · L512
  - chama: `IEngine.setProfileStatus` (engine.port.ts:266), `working` L561
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:228)
- `setProfileName(sessionId, name)` · L515
  - chama: `IEngine.setProfileName` (engine.port.ts:267), `working` L561
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:247)
- `setProfilePhoto(sessionId, image, mimetype)` · L518
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:268), `working` L561
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:267)
- `markRead(sessionId, chatJid, msgId)` · L526
  - chama: `IEngine.markRead` (engine.port.ts:270), `working` L561
  - chamado por: `MessagesController.markRead` (messages.controller.ts:389)
- `listChats(sessionId, limit)` · L531
  - chama: `IEngine.listChats` (engine.port.ts:289), `working` L561
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L534
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:290), `working` L561
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L541
  - chama: `IEngine.setChatFlag` (engine.port.ts:294), `working` L561
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:319)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L550
  - chama: `IEngine.sendReaction` (engine.port.ts:274), `working` L561
  - chamado por: `MessagesController.reaction` (messages.controller.ts:401)
- `working(sessionId)` · L561 · private
  - chama: `IEngine.getStatus` (engine.port.ts:284)
  - chamado por: `channelInfo` L687, `checkNumbers` L655, `createChannel` L680, `createGroup` L577, `fetchChatHistory` L534, `followChannel` L690, `groupInfo` L574, `groupInviteCode` L613, `groupMembershipAction` L625, `groupMembershipRequests` L619, `groupRevokeInvite` L616, `leaveGroup` L596, `listChats` L531, `listGroups` L571, `markRead` L526, `profilePicture` L658, `removeContact` L675, `saveContact` L668, `sendLocation` L488, `sendMedia` L480, `sendPoll` L496, `sendPresence` L504, `sendReaction` L550, `setBlock` L661, `setChatFlag` L541, `setGroupDescription` L606, `setGroupPhoto` L645, `setGroupSetting` L637, `setGroupSubject` L599, `setProfileName` L515, `setProfilePhoto` L518, `setProfileStatus` L512, `unfollowChannel` L693, `updateParticipants` L584
- `listGroups(sessionId)` · L571
  - chama: `IEngine.listGroups` (engine.port.ts:297), `working` L561
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L574
  - chama: `IEngine.groupInfo` (engine.port.ts:298), `working` L561
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L577
  - chama: `IEngine.createGroup` (engine.port.ts:299), `working` L561
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L584
  - chama: `IEngine.updateParticipants` (engine.port.ts:300), `working` L561
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L596
  - chama: `IEngine.leaveGroup` (engine.port.ts:305), `working` L561
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L599
  - chama: `IEngine.setGroupSubject` (engine.port.ts:306), `working` L561
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L606
  - chama: `IEngine.setGroupDescription` (engine.port.ts:307), `working` L561
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L613
  - chama: `IEngine.groupInviteCode` (engine.port.ts:308), `working` L561
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L616
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:309), `working` L561
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L619
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:312), `working` L561
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L625
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:313), `working` L561
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L637
  - chama: `IEngine.setGroupSetting` (engine.port.ts:319), `working` L561
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L645
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:325), `working` L561
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L655
  - chama: `IEngine.checkNumbers` (engine.port.ts:328), `working` L561
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L658
  - chama: `IEngine.profilePicture` (engine.port.ts:329), `working` L561
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L661
  - chama: `IEngine.setBlock` (engine.port.ts:330), `working` L561
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L668
  - chama: `IEngine.saveContact` (engine.port.ts:332), `working` L561
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L675
  - chama: `IEngine.removeContact` (engine.port.ts:334), `working` L561
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L680
  - chama: `IEngine.createChannel` (engine.port.ts:337), `working` L561
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L687
  - chama: `IEngine.channelInfo` (engine.port.ts:338), `working` L561
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L690
  - chama: `IEngine.followChannel` (engine.port.ts:339), `working` L561
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L693
  - chama: `IEngine.unfollowChannel` (engine.port.ts:340), `working` L561
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

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

1672 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L439 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L440 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L441 · private · campo
- `status` · L442 · private · campo
- `qrBase64` · L443 · private · campo
- `stopped` · L444 · private · campo
- `reconnectAttempts` · L445 · private · campo
- `lifecycle` · L451 · private · campo
- `sentMessages` · L453 · private · campo
- `lidToPn` · L455 · private · campo
- `connectGeneration` · L460 · private · campo
- `groupMetaCache` · L462 · private · campo
- `constructor(deps)` · L467
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L469 · private
  - chamado por: `connect` L520, `groupInfo` L1392, `listGroups` L1384
- `clearReconnectTimer()` · L478 · private
  - chamado por: `doLogout` L1633, `doStop` L1572, `onConnectionUpdate` L663, `shutdown` L1614, `start` L510
- `getStatus()` · L483
  - implementa: `IEngine.getStatus` (engine.port.ts:284)
- `getQrBase64()` · L487
  - implementa: `IEngine.getQrBase64` (engine.port.ts:280)
- `setStatus(status, extra)` · L491 · private
  - chamado por: `connect` L520, `doLogout` L1633, `doStop` L1572, `onConnectionUpdate` L663, `requestPairingCode` L1557
- `serialize(fn)` · L501 · private
  - chamado por: `logout` L1628, `onConnectionUpdate` L663, `start` L510, `stop` L1565
- `start()` · L510
  - implementa: `IEngine.start` (engine.port.ts:234)
  - chama: `clearReconnectTimer` L478, `connect` L520, `serialize` L501
- `connect()` · L520 · private · async
  - chama: `cacheGroupMeta` L469, `loadMessageForRetry` L1193, `onConnectionUpdate` L663, `onContacts` L1341, `onMessagesUpdate` L876, `onMessagesUpsert` L779, `onReactions` L653, `safe` L1228, `setStatus` L491, `latestBaileysVersion` L112, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L663, `start` L510
- `onReactions(reactions)` · L653 · private
  - chama: `mapBaileysReaction` L175
  - chamado por: `connect` L520
- `onConnectionUpdate(update)` · L663 · private · async
  - chama: `clearCredentials` L1656, `clearReconnectTimer` L478, `connect` L520, `detachSocketListeners` L1589, `serialize` L501, `setStatus` L491, `warmLidCache` L1289
  - chamado por: `connect` L520
- `onMessagesUpsert(upsert)` · L779 · private
  - chama: `handleIncomingMedia` L903, `mergeLidMessages` L1303, `mediaInfoOf` L206
  - chamado por: `connect` L520
- `onMessagesUpdate(updates)` · L876 · private
  - chama: `mapAckStatus` L273
  - chamado por: `connect` L520
- `handleIncomingMedia(m, base, media)` · L903 · private · async
  - chama: `extOf` L259
  - chamado por: `onMessagesUpsert` L779
- `sendText(to, text, opts)` · L969 · async
  - implementa: `IEngine.sendText` (engine.port.ts:246)
  - chama: `cacheSent` L1179, `resolveJid` L1129, `encodeProto` L155
- `sendMedia(to, input)` · L1001 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:251)
  - chama: `cacheSent` L1179, `resolveJid` L1129, `buildMediaContent` L291, `encodeProto` L155, `extOf` L259
- `sendLocation(to, input)` · L1056 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:256)
  - chama: `emitOutbound` L1097, `resolveJid` L1129
- `sendPoll(to, input)` · L1079 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:260)
  - chama: `emitOutbound` L1097, `resolveJid` L1129
- `emitOutbound(sent, jid, type, text, opts)` · L1097 · private
  - chama: `cacheSent` L1179, `encodeProto` L155
  - chamado por: `sendLocation` L1056, `sendPoll` L1079
- `resolveJid(to)` · L1129 · private · async
  - chama: `toJid` L1667
  - chamado por: `resolveParticipants` L1280, `sendLocation` L1056, `sendMedia` L1001, `sendPoll` L1079, `sendText` L969
- `sendPresence(to, state)` · L1134 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:264)
  - chama: `sk` L1247, `toJid` L1667
- `setProfileStatus(status)` · L1144 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:266)
  - chama: `sk` L1247
- `setProfileName(name)` · L1147 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:267)
  - chama: `sk` L1247
- `setProfilePhoto(image, _mimetype)` · L1150 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:268)
  - chama: `sk` L1247
- `markRead(chatJid, msgId)` · L1158 · async
  - implementa: `IEngine.markRead` (engine.port.ts:270)
  - chama: `sk` L1247, `toJid` L1667
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1166 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:274)
  - chama: `toJid` L1667
- `cacheSent(keyId, message)` · L1179 · private
  - chamado por: `emitOutbound` L1097, `loadMessageForRetry` L1193, `sendMedia` L1001, `sendText` L969
- `loadMessageForRetry(key)` · L1193 · private · async
  - chama: `cacheSent` L1179, `decodeProto` L158
  - chamado por: `connect` L520
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1228 · private
  - chamado por: `connect` L520
- `sk()` · L1247 · private
  - chamado por: `channelInfo` L1546, `checkNumbers` L1494, `createChannel` L1539, `createGroup` L1400, `followChannel` L1550, `groupInfo` L1392, `groupInviteCode` L1425, `groupMembershipAction` L1446, `groupMembershipRequests` L1434, `groupRevokeInvite` L1428, `leaveGroup` L1416, `listGroups` L1384, `markRead` L1158, `profilePicture` L1509, `removeContact` L1534, `saveContact` L1521, `sendPresence` L1134, `setBlock` L1518, `setGroupDescription` L1422, `setGroupPhoto` L1485, `setGroupSetting` L1468, `setGroupSubject` L1419, `setProfileName` L1147, `setProfilePhoto` L1150, `setProfileStatus` L1144, `unfollowChannel` L1553, `updateParticipants` L1408
- `listChats(_limit)` · L1254 · async
  - implementa: `IEngine.listChats` (engine.port.ts:289)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:224)
- `fetchChatHistory(_chatJid, _limit)` · L1259 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:290)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:224)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1270 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:294)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:224)
- `resolveParticipants(items)` · L1280 · private · async
  - chama: `resolveJid` L1129
  - chamado por: `createGroup` L1400, `groupMembershipAction` L1446, `updateParticipants` L1408
- `warmLidCache()` · L1289 · private · async
  - chama: `mergeKnownLids` L1321
  - chamado por: `onConnectionUpdate` L663
- `mergeLidMessages(lid, phoneJid)` · L1303 · private · async
  - chamado por: `mergeKnownLids` L1321, `onMessagesUpsert` L779
  - banco: `waMessage.updateMany`
- `mergeKnownLids()` · L1321 · private · async
  - chama: `mergeLidMessages` L1303
  - chamado por: `warmLidCache` L1289
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1341 · private
  - chama: `contactToRecord` L135
  - chamado por: `connect` L520
- `recordGroupParticipants(md)` · L1348 · private
  - chamado por: `groupInfo` L1392, `listGroups` L1384
- `resolveParticipantNames(groups)` · L1362 · private · async
  - chama: `resolveParticipantPhone` L331
  - chamado por: `groupInfo` L1392, `listGroups` L1384
- `listGroups()` · L1384 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:297)
  - chama: `cacheGroupMeta` L469, `recordGroupParticipants` L1348, `resolveParticipantNames` L1362, `sk` L1247, `toGroupInfo` L379
- `groupInfo(jid)` · L1392 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:298)
  - chama: `cacheGroupMeta` L469, `recordGroupParticipants` L1348, `resolveParticipantNames` L1362, `sk` L1247, `toGroupInfo` L379, `toGroupJid` L423
- `createGroup(subject, participants)` · L1400 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:299)
  - chama: `resolveParticipants` L1280, `sk` L1247, `toGroupInfo` L379
- `updateParticipants(jid, action, participants)` · L1408 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:300)
  - chama: `resolveParticipants` L1280, `sk` L1247, `toGroupJid` L423
- `leaveGroup(jid)` · L1416 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:305)
  - chama: `sk` L1247, `toGroupJid` L423
- `setGroupSubject(jid, subject)` · L1419 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:306)
  - chama: `sk` L1247, `toGroupJid` L423
- `setGroupDescription(jid, description)` · L1422 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:307)
  - chama: `sk` L1247, `toGroupJid` L423
- `groupInviteCode(jid)` · L1425 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:308)
  - chama: `sk` L1247, `toGroupJid` L423
- `groupRevokeInvite(jid)` · L1428 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:309)
  - chama: `sk` L1247, `toGroupJid` L423
- `groupMembershipRequests(jid)` · L1434 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:312)
  - chama: `sk` L1247, `toGroupJid` L423
- `groupMembershipAction(jid, action, participants)` · L1446 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:313)
  - chama: `resolveParticipants` L1280, `sk` L1247, `toGroupJid` L423
- `setGroupSetting(jid, setting, enabled)` · L1468 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:319)
  - chama: `sk` L1247, `toGroupJid` L423
- `setGroupPhoto(jid, image, _mimetype)` · L1485 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:325)
  - chama: `sk` L1247, `toGroupJid` L423
- `checkNumbers(numbers)` · L1494 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:328)
  - chama: `sk` L1247
- `profilePicture(jid)` · L1509 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:329)
  - chama: `sk` L1247, `toContactJid` L426
- `setBlock(jid, action)` · L1518 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:330)
  - chama: `sk` L1247, `toContactJid` L426
- `saveContact(jid, input)` · L1521 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:332)
  - chama: `sk` L1247, `toContactJid` L426
- `removeContact(jid)` · L1534 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:334)
  - chama: `sk` L1247, `toContactJid` L426
- `createChannel(name, description)` · L1539 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:337)
  - chama: `sk` L1247, `toChannelInfo` L412
- `channelInfo(jid)` · L1546 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:338)
  - chama: `sk` L1247, `toChannelInfo` L412
- `followChannel(jid)` · L1550 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:339)
  - chama: `sk` L1247
- `unfollowChannel(jid)` · L1553 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:340)
  - chama: `sk` L1247
- `requestPairingCode(phoneNumber)` · L1557 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:245)
  - chama: `setStatus` L491
- `stop()` · L1565
  - implementa: `IEngine.stop` (engine.port.ts:235)
  - chama: `doStop` L1572, `serialize` L501
- `doStop()` · L1572 · private · async
  - chama: `clearReconnectTimer` L478, `detachSocketListeners` L1589, `setStatus` L491
  - chamado por: `stop` L1565
- `detachSocketListeners()` · L1589 · private
  - chamado por: `doLogout` L1633, `doStop` L1572, `onConnectionUpdate` L663, `shutdown` L1614
- `shutdown()` · L1614 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:243)
  - chama: `clearReconnectTimer` L478, `detachSocketListeners` L1589
- `logout()` · L1628
  - implementa: `IEngine.logout` (engine.port.ts:244)
  - chama: `doLogout` L1633, `serialize` L501
- `doLogout()` · L1633 · private · async
  - chama: `clearCredentials` L1656, `clearReconnectTimer` L478, `detachSocketListeners` L1589, `setStatus` L491
  - chamado por: `logout` L1628
- `clearCredentials()` · L1656 · private · async
  - chamado por: `doLogout` L1633, `onConnectionUpdate` L663
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L112 · async
  - chamado por: `connect` L520
- `contactToRecord(c, source)` · L135
  - chamado por: `onContacts` L1341
- `encodeProto(msg)` · L155
  - chamado por: `emitOutbound` L1097, `sendMedia` L1001, `sendText` L969
- `decodeProto(value)` · L158
  - chamado por: `loadMessageForRetry` L1193
- `mapBaileysReaction(key, reaction, ourJid)` · L175
  - chama: `toNum` L196
  - chamado por: `onReactions` L653
- `toNum(v)` · L196
  - chamado por: `mapBaileysReaction` L175, `mediaInfoOf` L206
- `mediaInfoOf(msg)` · L206
  - chama: `toNum` L196
  - chamado por: `onMessagesUpsert` L779
- `extOf(mimetype, fileName)` · L259
  - chamado por: `handleIncomingMedia` L903, `sendMedia` L1001
- `mapAckStatus(status)` · L273
  - chamado por: `onMessagesUpdate` L876
- `buildMediaContent(input)` · L291
  - chamado por: `sendMedia` L1001
- `resolveParticipantPhone(p, lidToPn)` · L331
  - chamado por: `resolveParticipantNames` L1362, `toGroupInfo` L379
- `dirNameFor(p, phone, names)` · L365
  - chamado por: `toGroupInfo` L379
- `toGroupInfo(md, lidToPn, names)` · L379
  - chama: `dirNameFor` L365, `resolveParticipantPhone` L331
  - chamado por: `createGroup` L1400, `groupInfo` L1392, `listGroups` L1384
- `toChannelInfo(md)` · L412
  - chamado por: `channelInfo` L1546, `createChannel` L1539
- `toGroupJid(jid)` · L423
  - chamado por: `groupInfo` L1392, `groupInviteCode` L1425, `groupMembershipAction` L1446, `groupMembershipRequests` L1434, `groupRevokeInvite` L1428, `leaveGroup` L1416, `setGroupDescription` L1422, `setGroupPhoto` L1485, `setGroupSetting` L1468, `setGroupSubject` L1419, `updateParticipants` L1408
- `toContactJid(jid)` · L426
  - chamado por: `profilePicture` L1509, `removeContact` L1534, `saveContact` L1521, `setBlock` L1518
- `toJid(to)` · L1667
  - chamado por: `markRead` L1158, `resolveJid` L1129, `sendPresence` L1134, `sendReaction` L1166

**Tipos**
- interface `BaileysEngineDeps` L56 · 11 propriedade(s)
- type `BaileysVersion` L103
- interface `MediaInfo` L165 · 5 propriedade(s)
- type `RawParticipant` L318
- type `RawGroup` L345
- type `RawNewsletter` L355

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:520)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:520)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:467), `WWebJSEngine.constructor` (wwebjs.engine.ts:356)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:136)

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

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

2649 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `WWebJSEngine`** L302 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L303 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L304 · private · campo
- `status` · L305 · private · campo
- `qrBase64` · L306 · private · campo
- `stopped` · L307 · private · campo
- `lidToPnCache` · L310 · private · campo
- `pnToLidOutbound` · L314 · private · campo
- `sentByPanel` · L317 · private · campo
- `anonProxyUrl` · L320 · private · campo
- `lifecycle` · L327 · private · campo
- `reconnectAttempts` · L329 · private · campo
- `lastLoadingPct` · L333 · private · campo
- `logoutTimeoutMs` · L336 · private · campo
- `destroyTimeoutMs` · L340 · private · campo
- `generation` · L344 · private · campo
- `lastQrAt` · L346 · private · campo
- `qrHeals` · L348 · private · campo
- `qrWatchdogIntervalMs` · L350 · private · campo
- `qrStaleMs` · L351 · private · campo
- `initTimeoutMs` · L352 · private · campo
- `lastPairingCode` · L354 · private · campo
- `constructor(deps)` · L356
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L360 · private
  - chamado por: `handleDisconnect` L1107, `logout` L1316, `qrWatchdogTick` L420, `start` L583, `stop` L1264
- `getStatus()` · L369
  - implementa: `IEngine.getStatus` (engine.port.ts:284)
- `getQrBase64()` · L372
  - implementa: `IEngine.getQrBase64` (engine.port.ts:280)
- `getPairingCode()` · L375
  - implementa: `IEngine.getPairingCode` (engine.port.ts:283)
- `setStatus(status, extra)` · L379 · private
  - chama: `startQrWatchdog` L405, `startSyncWatchdog` L477, `stopQrWatchdog` L415, `stopSyncWatchdog` L488
  - chamado por: `doLogout` L1321, `doStart` L589, `doStop` L1271, `handleDisconnect` L1107, `handleInitFailure` L994, `qrWatchdogTick` L420, `requestPairingCode` L1353, `syncWatchdogTick` L495
- `startQrWatchdog()` · L405 · private
  - chama: `qrWatchdogTick` L420
  - chamado por: `setStatus` L379
- `stopQrWatchdog()` · L415 · private
  - chamado por: `qrWatchdogTick` L420, `setStatus` L379
- `qrWatchdogTick()` · L420 · private · async
  - chama: `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `doStart` L589, `serialize` L360, `setStatus` L379, `stopQrWatchdog` L415
  - chamado por: `startQrWatchdog` L405
- `watchdogFails` · L472 · private · campo
- `watchdogDegraded` · L473 · private · campo
- `WATCHDOG_INTERVAL_MS` · L474 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L475 · private · static · campo
- `startSyncWatchdog()` · L477 · private
  - chama: `syncWatchdogTick` L495
  - chamado por: `setStatus` L379
- `stopSyncWatchdog()` · L488 · private
  - chamado por: `setStatus` L379, `shutdown` L1292
- `syncWatchdogTick()` · L495 · private · async
  - chama: `isPageCrashError` L85, `raceStoreOp` L275, `healWedgedPage` L2164, `setStatus` L379, `syncHint` L2149
  - chamado por: `startSyncWatchdog` L477
- `clearStaleSingletonLocks()` · L557 · private · async
  - chama: `authDirOf` L186
  - chamado por: `doStart` L589
- `purgeAuthDir(sessionId)` · L577 · static · async
  - chama: `authDirOf` L186
  - chamado por: `SessionManager.logout` (session-manager.service.ts:378), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.remove` (session-manager.service.ts:428), `doLogout` L1321
- `start()` · L583
  - implementa: `IEngine.start` (engine.port.ts:234)
  - chama: `doStart` L589, `serialize` L360
- `doStart(attempt, forceLive)` · L589 · private · async
  - chama: `buildAuthProxyUrl` L172, `raceStoreOp` L275, `userAgentFor` L103, `checkPinnedBuildAge` L877, `clearStaleSingletonLocks` L557, `closeAnonProxy` L1174, `consumeCleanShutdownMarker` L1234, `ensureWebVersionHtml` L923, `handleDisconnect` L1107, `handleInitFailure` L994, `mergeExistingLids` L1985, `onMessageAck` L1753, `onMessageCreate` L1600, `onReaction` L1775, `resolveWebVersion` L957, `setStatus` L379, `syncAddressBook` L2013
  - chamado por: `handleDisconnect` L1107, `handleInitFailure` L994, `qrWatchdogTick` L420, `start` L583
- `checkPinnedBuildAge(version)` · L877 · private · async
  - chama: `loadBuildCatalog` L192
  - chamado por: `doStart` L589
- `ensureWebVersionHtml(version)` · L923 · private · async
  - chamado por: `doStart` L589
- `resolveWebVersion(forceLive)` · L957 · private · async
  - chamado por: `doStart` L589
- `handleInitFailure(e, attempt, pinnedVersion)` · L994 · private · async
  - chama: `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `doStart` L589, `setStatus` L379
  - chamado por: `doStart` L589
- `handleDisconnect(reason)` · L1107 · private · async
  - chama: `raceStoreOp` L275, `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `doStart` L589, `serialize` L360, `setStatus` L379
  - chamado por: `doStart` L589
- `closeAnonProxy()` · L1174 · private · async
  - chamado por: `doLogout` L1321, `doStart` L589, `doStop` L1271, `handleDisconnect` L1107, `handleInitFailure` L994, `qrWatchdogTick` L420, `shutdown` L1292
- `destroyWithTimeout()` · L1193 · private · async
  - chamado por: `doLogout` L1321, `doStop` L1271, `handleDisconnect` L1107, `handleInitFailure` L994, `qrWatchdogTick` L420, `shutdown` L1292
- `markCleanShutdown()` · L1217 · private · async
  - chama: `authDirOf` L186
  - chamado por: `doStop` L1271, `shutdown` L1292
- `consumeCleanShutdownMarker()` · L1234 · private · async
  - chama: `authDirOf` L186
  - chamado por: `doStart` L589
- `stop()` · L1264
  - implementa: `IEngine.stop` (engine.port.ts:235)
  - chama: `doStop` L1271, `serialize` L360
- `doStop()` · L1271 · private · async
  - chama: `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `markCleanShutdown` L1217, `setStatus` L379
  - chamado por: `stop` L1264
- `shutdown()` · L1292 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:243)
  - chama: `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `markCleanShutdown` L1217, `stopSyncWatchdog` L488
- `logout()` · L1316
  - implementa: `IEngine.logout` (engine.port.ts:244)
  - chama: `doLogout` L1321, `serialize` L360
- `doLogout()` · L1321 · private · async
  - chama: `raceStoreOp` L275, `closeAnonProxy` L1174, `destroyWithTimeout` L1193, `purgeAuthDir` L577, `setStatus` L379
  - chamado por: `logout` L1316
- `requestPairingCode(phoneNumber)` · L1353 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:245)
  - chama: `req` L2057, `setStatus` L379
- `sendText(to, text, opts)` · L1366 · async
  - implementa: `IEngine.sendText` (engine.port.ts:246)
  - chama: `assertPageResponsive` L2122, `rememberPanel` L1799, `req` L2057, `toChatId` L2052, `toMentionIds` L1591, `withLidFallback` L1894
- `sendMedia(to, input)` · L1396 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:251)
  - chama: `extOf` L123, `assertPageResponsive` L2122, `rememberPanel` L1799, `req` L2057, `toChatId` L2052, `toMentionIds` L1591, `withLidFallback` L1894
- `sendLocation(to, input)` · L1470 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:256)
  - chama: `assertPageResponsive` L2122, `emitOutbound` L1521, `rememberPanel` L1799, `req` L2057, `toChatId` L2052, `withLidFallback` L1894
- `sendPoll(to, input)` · L1498 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:260)
  - chama: `assertPageResponsive` L2122, `emitOutbound` L1521, `rememberPanel` L1799, `req` L2057, `toChatId` L2052, `withLidFallback` L1894
- `emitOutbound(keyId, jid, type, text, opts)` · L1521 · private
  - chamado por: `sendLocation` L1470, `sendPoll` L1498
- `setProfileStatus(status)` · L1543 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:266)
  - chama: `req` L2057
- `setProfileName(name)` · L1546 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:267)
  - chama: `req` L2057
- `setProfilePhoto(image, mimetype)` · L1549 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:268)
  - chama: `req` L2057
- `sendPresence(to, state)` · L1554 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:264)
  - chama: `req` L2057, `toChatId` L2052, `withLidFallback` L1894
- `markRead(chatJid, _msgId)` · L1572 · async
  - implementa: `IEngine.markRead` (engine.port.ts:270)
  - chama: `req` L2057, `toChatId` L2052, `withLidFallback` L1894
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1581 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:274)
  - chama: `req` L2057, `withStoreReady` L2074
- `toMentionIds(mentions)` · L1591 · private
  - chama: `toChatId` L2052
  - chamado por: `sendMedia` L1396, `sendText` L1366
- `onMessageCreate(msg)` · L1600 · private · async
  - chama: `handleIncomingMedia` L1648, `resolveNumberJid` L1810
  - chamado por: `doStart` L589
- `handleIncomingMedia(msg, base)` · L1648 · private · async
  - chama: `extOf` L123, `isPageCrashError` L85, `mapInboundMediaType` L138, `healWedgedPage` L2164
  - chamado por: `onMessageCreate` L1600
- `mapAck(ack)` · L1739 · private
  - chamado por: `onMessageAck` L1753
- `onMessageAck(msg, ack)` · L1753 · private
  - chama: `mapAck` L1739
  - chamado por: `doStart` L589
- `onReaction(r)` · L1775 · private · async
  - chama: `resolveNumberJid` L1810
  - chamado por: `doStart` L589
- `rememberPanel(keyId)` · L1799 · private
  - chamado por: `sendLocation` L1470, `sendMedia` L1396, `sendPoll` L1498, `sendText` L1366
- `resolveNumberJid(rawId)` · L1810 · private · async
  - chama: `cacheLidPn` L1831, `mergeLidMessages` L1966, `resolveLidToPhone` L1842
  - chamado por: `mergeExistingLids` L1985, `onMessageCreate` L1600, `onReaction` L1775, `toHistoryMessage` L2234
- `cacheLidPn(lid, phoneJid)` · L1831 · private
  - chamado por: `rememberOutboundLid` L1943, `resolveNumberJid` L1810, `resolvePendingLids` L2421
- `resolveLidToPhone(lid)` · L1842 · private · async
  - chamado por: `resolveNumberJid` L1810, `resolvePendingLids` L2421
- `withLidFallback(pnJid, op)` · L1894 · private · async
  - chama: `rememberOutboundLid` L1943, `resolvePhoneToLid` L1918, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `markRead` L1572, `sendLocation` L1470, `sendMedia` L1396, `sendPoll` L1498, `sendPresence` L1554, `sendText` L1366
- `resolvePhoneToLid(phoneJid)` · L1918 · private · async
  - chamado por: `withLidFallback` L1894
- `rememberOutboundLid(pnJid, lid)` · L1943 · private
  - chama: `cacheLidPn` L1831
  - chamado por: `withLidFallback` L1894
- `mergeLidMessages(lid, phoneJid)` · L1966 · private · async
  - chamado por: `resolveNumberJid` L1810
  - banco: `waMessage.updateMany`
- `mergeExistingLids()` · L1985 · private · async
  - chama: `resolveNumberJid` L1810
  - chamado por: `doStart` L589
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2013 · private · async
  - chama: `req` L2057, `withStoreReady` L2074
  - chamado por: `doStart` L589
- `toChatId(to)` · L2052 · private
  - chamado por: `createGroup` L2457, `fetchChatHistory` L2216, `groupMembershipAction` L2527, `markRead` L1572, `profilePicture` L2575, `sendLocation` L1470, `sendMedia` L1396, `sendPoll` L1498, `sendPresence` L1554, `sendText` L1366, `setBlock` L2586, `setChatFlag` L2267, `toMentionIds` L1591, `updateParticipants` L2472
- `req()` · L2057 · private
  - chamado por: `channelInfo` L2628, `checkNumbers` L2564, `createChannel` L2610, `createGroup` L2457, `fetchChatHistory` L2216, `followChannel` L2641, `getGroupChat` L2314, `listChats` L2196, `listGroups` L2295, `markRead` L1572, `profilePicture` L2575, `removeContact` L2605, `requestPairingCode` L1353, `resolvePendingLids` L2421, `saveContact` L2594, `sendLocation` L1470, `sendMedia` L1396, `sendPoll` L1498, `sendPresence` L1554, `sendReaction` L1581, `sendText` L1366, `setBlock` L2586, `setChatFlag` L2267, `setProfileName` L1546, `setProfilePhoto` L1549, `setProfileStatus` L1543, `syncAddressBook` L2013, `unfollowChannel` L2645
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2074 · private · async
  - chama: `isPageCrashError` L85, `raceStoreOp` L275, `assertPageResponsive` L2122, `healWedgedPage` L2164, `syncHint` L2149
  - chamado por: `channelInfo` L2628, `checkNumbers` L2564, `createChannel` L2610, `createGroup` L2457, `fetchChatHistory` L2216, `followChannel` L2641, `getGroupChat` L2314, `listChats` L2196, `listGroups` L2295, `profilePicture` L2575, `removeContact` L2605, `saveContact` L2594, `sendReaction` L1581, `setBlock` L2586, `setChatFlag` L2267, `syncAddressBook` L2013, `unfollowChannel` L2645
- `assertPageResponsive(probeTimeoutMs)` · L2122 · private · async
  - chama: `isPageCrashError` L85, `raceStoreOp` L275, `healWedgedPage` L2164, `syncHint` L2149
  - chamado por: `sendLocation` L1470, `sendMedia` L1396, `sendPoll` L1498, `sendText` L1366, `withStoreReady` L2074
- `syncHint()` · L2149 · private
  - chamado por: `assertPageResponsive` L2122, `syncWatchdogTick` L495, `withStoreReady` L2074
- `lastHealAt` · L2160 · private · campo
- `healing` · L2161 · private · campo
- `HEAL_COOLDOWN_MS` · L2162 · private · static · campo
- `healWedgedPage()` · L2164 · private · async
  - chamado por: `assertPageResponsive` L2122, `handleIncomingMedia` L1648, `syncWatchdogTick` L495, `withStoreReady` L2074
- `listChats(limit)` · L2196 · async
  - implementa: `IEngine.listChats` (engine.port.ts:289)
  - chama: `req` L2057, `withStoreReady` L2074
- `fetchChatHistory(chatJid, limit)` · L2216 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:290)
  - chama: `req` L2057, `toChatId` L2052, `toHistoryMessage` L2234, `withStoreReady` L2074
- `toHistoryMessage(msg)` · L2234 · private · async
  - chama: `mapInboundMediaType` L138, `resolveNumberJid` L1810
  - chamado por: `fetchChatHistory` L2216
- `setChatFlag(chatJid, flag, enabled)` · L2267 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:294)
  - chama: `req` L2057, `toChatId` L2052, `withStoreReady` L2074
- `listGroups()` · L2295 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:297)
  - chama: `groupFlags` L157, `req` L2057, `withStoreReady` L2074
- `getGroupChat(jid)` · L2314 · private · async
  - chama: `req` L2057, `toGroupId` L2453, `withStoreReady` L2074
  - chamado por: `groupInfo` L2323, `groupInviteCode` L2497, `groupMembershipAction` L2527, `groupMembershipRequests` L2509, `groupRevokeInvite` L2501, `leaveGroup` L2485, `setGroupDescription` L2493, `setGroupPhoto` L2553, `setGroupSetting` L2542, `setGroupSubject` L2489, `updateParticipants` L2472
- `groupInfo(jid)` · L2323 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:298)
  - chama: `groupFlags` L157, `getGroupChat` L2314, `resolveParticipantsBatch` L2351
  - chamado por: `createGroup` L2457
- `LID_BATCH` · L2340 · private · static · campo
- `resolveParticipantsBatch(list)` · L2351 · private · async
  - chama: `resolvePendingLids` L2421
  - chamado por: `groupInfo` L2323
- `resolvePendingLids(rows)` · L2421 · private · async
  - chama: `cacheLidPn` L1831, `req` L2057, `resolveLidToPhone` L1842
  - chamado por: `resolveParticipantsBatch` L2351
- `toGroupId(jid)` · L2453 · private
  - chamado por: `getGroupChat` L2314
- `createGroup(subject, participants)` · L2457 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:299)
  - chama: `groupInfo` L2323, `req` L2057, `toChatId` L2052, `withStoreReady` L2074
- `updateParticipants(jid, action, participants)` · L2472 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:300)
  - chama: `getGroupChat` L2314, `toChatId` L2052
- `leaveGroup(jid)` · L2485 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:305)
  - chama: `getGroupChat` L2314
- `setGroupSubject(jid, subject)` · L2489 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:306)
  - chama: `getGroupChat` L2314
- `setGroupDescription(jid, description)` · L2493 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:307)
  - chama: `getGroupChat` L2314
- `groupInviteCode(jid)` · L2497 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:308)
  - chama: `getGroupChat` L2314
- `groupRevokeInvite(jid)` · L2501 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:309)
  - chama: `getGroupChat` L2314
- `groupMembershipRequests(jid)` · L2509 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:312)
  - chama: `getGroupChat` L2314
- `groupMembershipAction(jid, action, participants)` · L2527 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:313)
  - chama: `getGroupChat` L2314, `toChatId` L2052
- `setGroupSetting(jid, setting, enabled)` · L2542 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:319)
  - chama: `getGroupChat` L2314
- `setGroupPhoto(jid, image, mimetype)` · L2553 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:325)
  - chama: `getGroupChat` L2314
- `checkNumbers(numbers)` · L2564 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:328)
  - chama: `req` L2057, `withStoreReady` L2074
- `profilePicture(jid)` · L2575 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:329)
  - chama: `req` L2057, `toChatId` L2052, `withStoreReady` L2074
- `setBlock(jid, action)` · L2586 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:330)
  - chama: `req` L2057, `toChatId` L2052, `withStoreReady` L2074
- `saveContact(jid, input)` · L2594 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:332)
  - chama: `req` L2057, `withStoreReady` L2074
- `removeContact(jid)` · L2605 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:334)
  - chama: `req` L2057, `withStoreReady` L2074
- `createChannel(name, description)` · L2610 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:337)
  - chama: `req` L2057, `withStoreReady` L2074
- `channelInfo(jid)` · L2628 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:338)
  - chama: `req` L2057, `withStoreReady` L2074
- `followChannel(jid)` · L2641 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:339)
  - chama: `req` L2057, `withStoreReady` L2074
- `unfollowChannel(jid)` · L2645 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:340)
  - chama: `req` L2057, `withStoreReady` L2074

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L81
- `isPageCrashError(message)` · L85
  - chamado por: `assertPageResponsive` L2122, `handleIncomingMedia` L1648, `syncWatchdogTick` L495, `withStoreReady` L2074
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L93
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `userAgentFor(sessionId)` · L103
  - chamado por: `doStart` L589
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L123
  - chamado por: `handleIncomingMedia` L1648, `sendMedia` L1396
- `mapInboundMediaType(t)` · L138
  - chamado por: `handleIncomingMedia` L1648, `toHistoryMessage` L2234
- `groupFlags(g)` · L157
  - chamado por: `groupInfo` L2323, `listGroups` L2295
- `buildAuthProxyUrl(server, username, password)` · L172
  - chamado por: `doStart` L589
- `authDirOf(sessionId)` · L186
  - chamado por: `clearStaleSingletonLocks` L557, `consumeCleanShutdownMarker` L1234, `markCleanShutdown` L1217, `purgeAuthDir` L577
- `loadBuildCatalog()` · L192 · async
  - chamado por: `checkPinnedBuildAge` L877
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L241
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L269
- `raceStoreOp(op, ms, timeoutMsg)` · L275 · async
  - chamado por: `assertPageResponsive` L2122, `doLogout` L1321, `doStart` L589, `handleDisconnect` L1107, `syncWatchdogTick` L495, `withStoreReady` L2074

**Tipos**
- interface `BuildCatalogEntry` L252 · 3 propriedade(s)
- interface `BuildCatalog` L257 · 3 propriedade(s)

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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:1894)
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
