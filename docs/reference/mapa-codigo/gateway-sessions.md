<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 348 |
| `modules/sessions/application/session-config.service.ts` | 73 |
| `modules/sessions/application/session-manager.service.ts` | 697 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 395 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 1651 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 379 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 123 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts` | 234 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts` | 227 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 2690 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 191 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 226 |
| `modules/sessions/interface/dto.ts` | 53 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 414 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

348 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `UnsupportedEngineOperationError`** L229 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L230
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1233), `BaileysEngine.listChats` (baileys.engine.ts:1228), `BaileysEngine.setChatFlag` (baileys.engine.ts:1244)

**Tipos**
- interface `SessionStatePayload` L3 · 4 propriedade(s)
- type `MessageSource` L13
- interface `MessagePayload` L15 · 19 propriedade(s)
- type `AckStatus` L48
- interface `MessageAckPayload` L50 · 5 propriedade(s)
- interface `ReactionPayload` L59 · 6 propriedade(s)
- type `EngineEventName` L68
- type `EngineEventHandler` L70
- type `GuardrailEventName` L77
- type `WaEventName` L88
- interface `WaEventEnvelope` L91 · 7 propriedade(s)
- type `MediaSendType` L101
- interface `SendOptions` L106 · 3 propriedade(s)
- interface `SendMediaInput` L114 · 6 propriedade(s)
- interface `SendLocationInput` L124 · 4 propriedade(s)
- interface `SendPollInput` L130 · 3 propriedade(s)
- type `GroupParticipantRole` L137
- type `GroupParticipantAction` L138
- interface `GroupParticipantInfo` L140 · 4 propriedade(s)
- interface `GroupInfo` L146 · 8 propriedade(s)
- interface `ContactCheck` L156 · 3 propriedade(s)
- interface `MembershipRequest` L164 · 3 propriedade(s)
- type `GroupSettingKey` L171
- type `MembershipAction` L172
- interface `SaveContactInput` L177 · 3 propriedade(s)
- interface `ChannelInfo` L182 · 4 propriedade(s)
- interface `ChatSummary` L191 · 6 propriedade(s)
- type `ChatFlag` L202
- interface `HistoryMessage` L206 · 13 propriedade(s)
- type `PresenceState` L223
- interface `IEngine` L236 · 1 propriedade(s)
  - `IEngine.start()` · L240
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:458), `WWebJSEngine.start` (wwebjs.engine.ts:588)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.start` (session-manager.service.ts:295)
  - `IEngine.stop()` · L241
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1544), `WWebJSEngine.stop` (wwebjs.engine.ts:1269)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:269), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.onModuleDestroy` (session-manager.service.ts:95), `SessionManager.remove` (session-manager.service.ts:428), `SessionManager.stop` (session-manager.service.ts:368)
  - `IEngine.shutdown()` · L249
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:1593), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1297)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:95)
  - `IEngine.logout()` · L250
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:1607), `WWebJSEngine.logout` (wwebjs.engine.ts:1321)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:378)
  - `IEngine.requestPairingCode(phoneNumber)` · L251
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1536), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1358)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451)
  - `IEngine.sendText(to, text, opts)` · L252
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:943), `WWebJSEngine.sendText` (wwebjs.engine.ts:1371)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:466)
  - `IEngine.sendMedia(to, input)` · L257
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:975), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1401)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:480)
  - `IEngine.sendLocation(to, input)` · L262
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1030), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1475)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:488)
  - `IEngine.sendPoll(to, input)` · L266
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1053), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1503)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:496)
  - `IEngine.sendPresence(to, state)` · L270
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1108), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1559)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:504)
  - `IEngine.setProfileStatus(status)` · L272
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1118), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1548)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:512)
  - `IEngine.setProfileName(name)` · L273
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1121), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1551)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:515)
  - `IEngine.setProfilePhoto(image, mimetype)` · L274
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1124), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1554)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:518)
  - `IEngine.markRead(chatJid, msgId)` · L276
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1132), `WWebJSEngine.markRead` (wwebjs.engine.ts:1577)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:526)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L280
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1140), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1586)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:550)
  - `IEngine.getQrBase64()` · L286
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:435), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:377)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:443)
  - `IEngine.getPairingCode()` · L289
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:380)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:447)
  - `IEngine.getStatus()` · L290
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:431), `WWebJSEngine.getStatus` (wwebjs.engine.ts:374)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:451), `SessionManager.sendText` (session-manager.service.ts:466), `SessionManager.working` (session-manager.service.ts:561)
  - `IEngine.listChats(limit)` · L295
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1228), `WWebJSEngine.listChats` (wwebjs.engine.ts:2232)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:531)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L296
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1233), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2252)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:534)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L300
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1244), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2308)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:541)
  - `IEngine.listGroups()` · L303
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1363), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2336)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:571)
  - `IEngine.groupInfo(jid)` · L304
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1371), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2364)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:574)
  - `IEngine.createGroup(subject, participants)` · L305
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1379), `WWebJSEngine.createGroup` (wwebjs.engine.ts:2498)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:577)
  - `IEngine.updateParticipants(jid, action, participants)` · L306
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1387), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:2513)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:584)
  - `IEngine.leaveGroup(jid)` · L311
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1395), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:2526)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:596)
  - `IEngine.setGroupSubject(jid, subject)` · L312
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1398), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:2530)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:599)
  - `IEngine.setGroupDescription(jid, description)` · L313
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1401), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:2534)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:606)
  - `IEngine.groupInviteCode(jid)` · L314
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1404), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:2538)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:613)
  - `IEngine.groupRevokeInvite(jid)` · L315
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1407), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:2542)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:616)
  - `IEngine.groupMembershipRequests(jid)` · L318
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1413), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:2550)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:619)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L319
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1425), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:2568)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:625)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L325
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1447), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:2583)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:637)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L331
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1464), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:2594)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:645)
  - `IEngine.checkNumbers(numbers)` · L334
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1473), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:2605)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:655)
  - `IEngine.profilePicture(jid)` · L335
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1488), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:2616)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:658)
  - `IEngine.setBlock(jid, action)` · L336
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1497), `WWebJSEngine.setBlock` (wwebjs.engine.ts:2627)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:661)
  - `IEngine.saveContact(jid, input)` · L338
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1500), `WWebJSEngine.saveContact` (wwebjs.engine.ts:2635)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:668)
  - `IEngine.removeContact(jid)` · L340
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1513), `WWebJSEngine.removeContact` (wwebjs.engine.ts:2646)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:675)
  - `IEngine.createChannel(name, description)` · L343
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1518), `WWebJSEngine.createChannel` (wwebjs.engine.ts:2651)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:680)
  - `IEngine.channelInfo(jid)` · L344
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1525), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:2669)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:687)
  - `IEngine.followChannel(jid)` · L345
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1529), `WWebJSEngine.followChannel` (wwebjs.engine.ts:2682)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:690)
  - `IEngine.unfollowChannel(jid)` · L346
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1532), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:2686)
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
  - chama: `IEngine.shutdown` (engine.port.ts:249), `IEngine.stop` (engine.port.ts:241)
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
  - chama: `IEngine.stop` (engine.port.ts:241)
  - chamado por: `persistStatus` L245
- `START_TIMEOUT_MS` · L293 · private · static · campo
- `start(sessionId)` · L295 · async
  - chama: `IEngine.start` (engine.port.ts:240), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L407, `onApplicationBootstrap` L69, `restart` L372, `SessionsController.create` (sessions.controller.ts:96), `SessionsController.start` (sessions.controller.ts:320)
- `startWithTimeout(sessionId, op)` · L306 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L451, `start` L295
- `withTimeout(op, ms)` · L346 · private · async
  - chamado por: `logout` L378, `newQr` L407, `remove` L428, `stop` L368
- `stop(sessionId)` · L368 · async
  - chama: `IEngine.stop` (engine.port.ts:241), `withTimeout` L346
  - chamado por: `restart` L372, `SessionsController.stop` (sessions.controller.ts:327)
- `restart(sessionId)` · L372 · async
  - chama: `start` L295, `stop` L368
  - chamado por: `SessionsController.restart` (sessions.controller.ts:334)
- `logout(sessionId)` · L378 · async
  - chama: `IEngine.logout` (engine.port.ts:250), `withTimeout` L346, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:582)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:341)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L407 · async
  - chama: `IEngine.stop` (engine.port.ts:241), `start` L295, `withTimeout` L346, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:582)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:372)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L428 · async
  - chama: `IEngine.stop` (engine.port.ts:241), `withTimeout` L346, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:582)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:348)
- `getQr(sessionId)` · L443
  - chama: `IEngine.getQrBase64` (engine.port.ts:286)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `getPairingCode(sessionId)` · L447
  - chama: `IEngine.getPairingCode` (engine.port.ts:289)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:356)
- `requestPairingCode(sessionId, phoneNumber)` · L451 · async
  - chama: `IEngine.getStatus` (engine.port.ts:290), `IEngine.requestPairingCode` (engine.port.ts:251), `IEngine.start` (engine.port.ts:240), `getOrCreateEngine` L136, `startWithTimeout` L306, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:379)
- `sendText(sessionId, to, text, opts)` · L466 · async
  - chama: `IEngine.getStatus` (engine.port.ts:290), `IEngine.sendText` (engine.port.ts:252)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendText` (messages.controller.ts:509)
- `sendMedia(sessionId, to, input)` · L480 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:257), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendMedia` (messages.controller.ts:538), `MessagesController.sendMediaUrl` (messages.controller.ts:608)
- `sendLocation(sessionId, to, input)` · L488
  - chama: `IEngine.sendLocation` (engine.port.ts:262), `working` L561
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:680)
- `sendPoll(sessionId, to, input)` · L496
  - chama: `IEngine.sendPoll` (engine.port.ts:266), `working` L561
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:719)
- `sendPresence(sessionId, to, state)` · L504
  - chama: `IEngine.sendPresence` (engine.port.ts:270), `working` L561
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `SessionsController.presence` (sessions.controller.ts:212)
- `setProfileStatus(sessionId, status)` · L512
  - chama: `IEngine.setProfileStatus` (engine.port.ts:272), `working` L561
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:228)
- `setProfileName(sessionId, name)` · L515
  - chama: `IEngine.setProfileName` (engine.port.ts:273), `working` L561
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:247)
- `setProfilePhoto(sessionId, image, mimetype)` · L518
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:274), `working` L561
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:267)
- `markRead(sessionId, chatJid, msgId)` · L526
  - chama: `IEngine.markRead` (engine.port.ts:276), `working` L561
  - chamado por: `MessagesController.markRead` (messages.controller.ts:415)
- `listChats(sessionId, limit)` · L531
  - chama: `IEngine.listChats` (engine.port.ts:295), `working` L561
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L534
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:296), `working` L561
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L541
  - chama: `IEngine.setChatFlag` (engine.port.ts:300), `working` L561
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:345)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L550
  - chama: `IEngine.sendReaction` (engine.port.ts:280), `working` L561
  - chamado por: `MessagesController.reaction` (messages.controller.ts:427)
- `working(sessionId)` · L561 · private
  - chama: `IEngine.getStatus` (engine.port.ts:290)
  - chamado por: `channelInfo` L687, `checkNumbers` L655, `createChannel` L680, `createGroup` L577, `fetchChatHistory` L534, `followChannel` L690, `groupInfo` L574, `groupInviteCode` L613, `groupMembershipAction` L625, `groupMembershipRequests` L619, `groupRevokeInvite` L616, `leaveGroup` L596, `listChats` L531, `listGroups` L571, `markRead` L526, `profilePicture` L658, `removeContact` L675, `saveContact` L668, `sendLocation` L488, `sendMedia` L480, `sendPoll` L496, `sendPresence` L504, `sendReaction` L550, `setBlock` L661, `setChatFlag` L541, `setGroupDescription` L606, `setGroupPhoto` L645, `setGroupSetting` L637, `setGroupSubject` L599, `setProfileName` L515, `setProfilePhoto` L518, `setProfileStatus` L512, `unfollowChannel` L693, `updateParticipants` L584
- `listGroups(sessionId)` · L571
  - chama: `IEngine.listGroups` (engine.port.ts:303), `working` L561
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L574
  - chama: `IEngine.groupInfo` (engine.port.ts:304), `working` L561
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L577
  - chama: `IEngine.createGroup` (engine.port.ts:305), `working` L561
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L584
  - chama: `IEngine.updateParticipants` (engine.port.ts:306), `working` L561
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L596
  - chama: `IEngine.leaveGroup` (engine.port.ts:311), `working` L561
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L599
  - chama: `IEngine.setGroupSubject` (engine.port.ts:312), `working` L561
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L606
  - chama: `IEngine.setGroupDescription` (engine.port.ts:313), `working` L561
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L613
  - chama: `IEngine.groupInviteCode` (engine.port.ts:314), `working` L561
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L616
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:315), `working` L561
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L619
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:318), `working` L561
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L625
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:319), `working` L561
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L637
  - chama: `IEngine.setGroupSetting` (engine.port.ts:325), `working` L561
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L645
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:331), `working` L561
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L655
  - chama: `IEngine.checkNumbers` (engine.port.ts:334), `working` L561
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L658
  - chama: `IEngine.profilePicture` (engine.port.ts:335), `working` L561
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L661
  - chama: `IEngine.setBlock` (engine.port.ts:336), `working` L561
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L668
  - chama: `IEngine.saveContact` (engine.port.ts:338), `working` L561
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L675
  - chama: `IEngine.removeContact` (engine.port.ts:340), `working` L561
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L680
  - chama: `IEngine.createChannel` (engine.port.ts:343), `working` L561
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L687
  - chama: `IEngine.channelInfo` (engine.port.ts:344), `working` L561
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L690
  - chama: `IEngine.followChannel` (engine.port.ts:345), `working` L561
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L693
  - chama: `IEngine.unfollowChannel` (engine.port.ts:346), `working` L561
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
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:766)
- `textOrOther(text, fwd)` · L389
  - chama: `content` (message-content.ts:37)
  - chamado por: `describeBaileysMessage` L162

**Tipos**
- type `BaileysDescribed` L27

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

1651 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
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
- `connectGeneration` · L408 · private · campo
- `groupMetaCache` · L410 · private · campo
- `constructor(deps)` · L415
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L417 · private
  - chamado por: `connect` L468, `groupInfo` L1371, `listGroups` L1363
- `clearReconnectTimer()` · L426 · private
  - chamado por: `doLogout` L1612, `doStop` L1551, `onConnectionUpdate` L650, `shutdown` L1593, `start` L458
- `getStatus()` · L431
  - implementa: `IEngine.getStatus` (engine.port.ts:290)
- `getQrBase64()` · L435
  - implementa: `IEngine.getQrBase64` (engine.port.ts:286)
- `setStatus(status, extra)` · L439 · private
  - chamado por: `connect` L468, `doLogout` L1612, `doStop` L1551, `onConnectionUpdate` L650, `requestPairingCode` L1536
- `serialize(fn)` · L449 · private
  - chamado por: `logout` L1607, `onConnectionUpdate` L650, `start` L458, `stop` L1544
- `start()` · L458
  - implementa: `IEngine.start` (engine.port.ts:240)
  - chama: `clearReconnectTimer` L426, `connect` L468, `serialize` L449
- `connect()` · L468 · private · async
  - chama: `cacheGroupMeta` L417, `loadMessageForRetry` L1167, `onConnectionUpdate` L650, `onContacts` L1320, `onMessagesUpdate` L848, `onMessagesUpsert` L766, `onReactions` L601, `safe` L1202, `setStatus` L439, `latestBaileysVersion` L113, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L650, `start` L458
- `onReactions(reactions)` · L601 · private
  - chama: `learnPair` L637, `resolveChatJid` L630, `mapBaileysReaction` L175
  - chamado por: `connect` L468
- `resolveChatJid(jid)` · L630 · private
  - chamado por: `onReactions` L601
- `learnPair(a, b)` · L637 · private
  - chama: `learnLid` L644
  - chamado por: `onReactions` L601
- `learnLid(lid, pn)` · L644 · private
  - chama: `mergeLidMessages` L1277
  - chamado por: `learnPair` L637, `onMessagesUpsert` L766
- `onConnectionUpdate(update)` · L650 · private · async
  - chama: `clearCredentials` L1635, `clearReconnectTimer` L426, `connect` L468, `detachSocketListeners` L1568, `serialize` L449, `setStatus` L439, `warmLidCache` L1263
  - chamado por: `connect` L468
- `onMessagesUpsert(upsert)` · L766 · private
  - chama: `describeBaileysMessage` (baileys-content.ts:162), `handleIncomingMedia` L875, `learnLid` L644
  - chamado por: `connect` L468
- `onMessagesUpdate(updates)` · L848 · private
  - chama: `mapAckStatus` L221
  - chamado por: `connect` L468
- `handleIncomingMedia(m, base, media)` · L875 · private · async
  - chama: `extOf` L207
  - chamado por: `onMessagesUpsert` L766
- `sendText(to, text, opts)` · L943 · async
  - implementa: `IEngine.sendText` (engine.port.ts:252)
  - chama: `cacheSent` L1153, `resolveJid` L1103, `encodeProto` L156
- `sendMedia(to, input)` · L975 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:257)
  - chama: `cacheSent` L1153, `resolveJid` L1103, `buildMediaContent` L239, `encodeProto` L156, `extOf` L207
- `sendLocation(to, input)` · L1030 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:262)
  - chama: `emitOutbound` L1071, `resolveJid` L1103
- `sendPoll(to, input)` · L1053 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:266)
  - chama: `emitOutbound` L1071, `resolveJid` L1103
- `emitOutbound(sent, jid, type, text, opts)` · L1071 · private
  - chama: `cacheSent` L1153, `encodeProto` L156
  - chamado por: `sendLocation` L1030, `sendPoll` L1053
- `resolveJid(to)` · L1103 · private · async
  - chama: `toJid` L1646
  - chamado por: `resolveParticipants` L1254, `sendLocation` L1030, `sendMedia` L975, `sendPoll` L1053, `sendText` L943
- `sendPresence(to, state)` · L1108 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:270)
  - chama: `sk` L1221, `toJid` L1646
- `setProfileStatus(status)` · L1118 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:272)
  - chama: `sk` L1221
- `setProfileName(name)` · L1121 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:273)
  - chama: `sk` L1221
- `setProfilePhoto(image, _mimetype)` · L1124 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:274)
  - chama: `sk` L1221
- `markRead(chatJid, msgId)` · L1132 · async
  - implementa: `IEngine.markRead` (engine.port.ts:276)
  - chama: `sk` L1221, `toJid` L1646
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1140 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:280)
  - chama: `toJid` L1646
- `cacheSent(keyId, message)` · L1153 · private
  - chamado por: `emitOutbound` L1071, `loadMessageForRetry` L1167, `sendMedia` L975, `sendText` L943
- `loadMessageForRetry(key)` · L1167 · private · async
  - chama: `cacheSent` L1153, `decodeProto` L159
  - chamado por: `connect` L468
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1202 · private
  - chamado por: `connect` L468
- `sk()` · L1221 · private
  - chamado por: `channelInfo` L1525, `checkNumbers` L1473, `createChannel` L1518, `createGroup` L1379, `followChannel` L1529, `groupInfo` L1371, `groupInviteCode` L1404, `groupMembershipAction` L1425, `groupMembershipRequests` L1413, `groupRevokeInvite` L1407, `leaveGroup` L1395, `listGroups` L1363, `markRead` L1132, `profilePicture` L1488, `removeContact` L1513, `saveContact` L1500, `sendPresence` L1108, `setBlock` L1497, `setGroupDescription` L1401, `setGroupPhoto` L1464, `setGroupSetting` L1447, `setGroupSubject` L1398, `setProfileName` L1121, `setProfilePhoto` L1124, `setProfileStatus` L1118, `unfollowChannel` L1532, `updateParticipants` L1387
- `listChats(_limit)` · L1228 · async
  - implementa: `IEngine.listChats` (engine.port.ts:295)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:230)
- `fetchChatHistory(_chatJid, _limit)` · L1233 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:296)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:230)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1244 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:300)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:230)
- `resolveParticipants(items)` · L1254 · private · async
  - chama: `resolveJid` L1103
  - chamado por: `createGroup` L1379, `groupMembershipAction` L1425, `updateParticipants` L1387
- `warmLidCache()` · L1263 · private · async
  - chama: `mergeKnownLids` L1300
  - chamado por: `onConnectionUpdate` L650
- `mergeLidMessages(lid, phoneJid)` · L1277 · private · async
  - chamado por: `learnLid` L644, `mergeKnownLids` L1300
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L1300 · private · async
  - chama: `mergeLidMessages` L1277
  - chamado por: `warmLidCache` L1263
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1320 · private
  - chama: `contactToRecord` L136
  - chamado por: `connect` L468
- `recordGroupParticipants(md)` · L1327 · private
  - chamado por: `groupInfo` L1371, `listGroups` L1363
- `resolveParticipantNames(groups)` · L1341 · private · async
  - chama: `resolveParticipantPhone` L279
  - chamado por: `groupInfo` L1371, `listGroups` L1363
- `listGroups()` · L1363 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:303)
  - chama: `cacheGroupMeta` L417, `recordGroupParticipants` L1327, `resolveParticipantNames` L1341, `sk` L1221, `toGroupInfo` L327
- `groupInfo(jid)` · L1371 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:304)
  - chama: `cacheGroupMeta` L417, `recordGroupParticipants` L1327, `resolveParticipantNames` L1341, `sk` L1221, `toGroupInfo` L327, `toGroupJid` L371
- `createGroup(subject, participants)` · L1379 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:305)
  - chama: `resolveParticipants` L1254, `sk` L1221, `toGroupInfo` L327
- `updateParticipants(jid, action, participants)` · L1387 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:306)
  - chama: `resolveParticipants` L1254, `sk` L1221, `toGroupJid` L371
- `leaveGroup(jid)` · L1395 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:311)
  - chama: `sk` L1221, `toGroupJid` L371
- `setGroupSubject(jid, subject)` · L1398 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:312)
  - chama: `sk` L1221, `toGroupJid` L371
- `setGroupDescription(jid, description)` · L1401 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:313)
  - chama: `sk` L1221, `toGroupJid` L371
- `groupInviteCode(jid)` · L1404 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:314)
  - chama: `sk` L1221, `toGroupJid` L371
- `groupRevokeInvite(jid)` · L1407 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:315)
  - chama: `sk` L1221, `toGroupJid` L371
- `groupMembershipRequests(jid)` · L1413 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:318)
  - chama: `sk` L1221, `toGroupJid` L371
- `groupMembershipAction(jid, action, participants)` · L1425 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:319)
  - chama: `resolveParticipants` L1254, `sk` L1221, `toGroupJid` L371
- `setGroupSetting(jid, setting, enabled)` · L1447 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:325)
  - chama: `sk` L1221, `toGroupJid` L371
- `setGroupPhoto(jid, image, _mimetype)` · L1464 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:331)
  - chama: `sk` L1221, `toGroupJid` L371
- `checkNumbers(numbers)` · L1473 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:334)
  - chama: `sk` L1221
- `profilePicture(jid)` · L1488 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:335)
  - chama: `sk` L1221, `toContactJid` L374
- `setBlock(jid, action)` · L1497 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:336)
  - chama: `sk` L1221, `toContactJid` L374
- `saveContact(jid, input)` · L1500 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:338)
  - chama: `sk` L1221, `toContactJid` L374
- `removeContact(jid)` · L1513 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:340)
  - chama: `sk` L1221, `toContactJid` L374
- `createChannel(name, description)` · L1518 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:343)
  - chama: `sk` L1221, `toChannelInfo` L360
- `channelInfo(jid)` · L1525 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:344)
  - chama: `sk` L1221, `toChannelInfo` L360
- `followChannel(jid)` · L1529 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:345)
  - chama: `sk` L1221
- `unfollowChannel(jid)` · L1532 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:346)
  - chama: `sk` L1221
- `requestPairingCode(phoneNumber)` · L1536 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:251)
  - chama: `setStatus` L439
- `stop()` · L1544
  - implementa: `IEngine.stop` (engine.port.ts:241)
  - chama: `doStop` L1551, `serialize` L449
- `doStop()` · L1551 · private · async
  - chama: `clearReconnectTimer` L426, `detachSocketListeners` L1568, `setStatus` L439
  - chamado por: `stop` L1544
- `detachSocketListeners()` · L1568 · private
  - chamado por: `doLogout` L1612, `doStop` L1551, `onConnectionUpdate` L650, `shutdown` L1593
- `shutdown()` · L1593 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:249)
  - chama: `clearReconnectTimer` L426, `detachSocketListeners` L1568
- `logout()` · L1607
  - implementa: `IEngine.logout` (engine.port.ts:250)
  - chama: `doLogout` L1612, `serialize` L449
- `doLogout()` · L1612 · private · async
  - chama: `clearCredentials` L1635, `clearReconnectTimer` L426, `detachSocketListeners` L1568, `setStatus` L439
  - chamado por: `logout` L1607
- `clearCredentials()` · L1635 · private · async
  - chamado por: `doLogout` L1612, `onConnectionUpdate` L650
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L113 · async
  - chamado por: `connect` L468
- `contactToRecord(c, source)` · L136
  - chamado por: `onContacts` L1320
- `encodeProto(msg)` · L156
  - chamado por: `emitOutbound` L1071, `sendMedia` L975, `sendText` L943
- `decodeProto(value)` · L159
  - chamado por: `loadMessageForRetry` L1167
- `mapBaileysReaction(key, reaction, ourJid)` · L175
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L202
  - chamado por: `onReactions` L601
- `phoneFirst(a, b)` · L202
  - chamado por: `mapBaileysReaction` L175
- `extOf(mimetype, fileName)` · L207
  - chamado por: `handleIncomingMedia` L875, `sendMedia` L975
- `mapAckStatus(status)` · L221
  - chamado por: `onMessagesUpdate` L848
- `buildMediaContent(input)` · L239
  - chamado por: `sendMedia` L975
- `resolveParticipantPhone(p, lidToPn)` · L279
  - chamado por: `resolveParticipantNames` L1341, `toGroupInfo` L327
- `dirNameFor(p, phone, names)` · L313
  - chamado por: `toGroupInfo` L327
- `toGroupInfo(md, lidToPn, names)` · L327
  - chama: `dirNameFor` L313, `resolveParticipantPhone` L279
  - chamado por: `createGroup` L1379, `groupInfo` L1371, `listGroups` L1363
- `toChannelInfo(md)` · L360
  - chamado por: `channelInfo` L1525, `createChannel` L1518
- `toGroupJid(jid)` · L371
  - chamado por: `groupInfo` L1371, `groupInviteCode` L1404, `groupMembershipAction` L1425, `groupMembershipRequests` L1413, `groupRevokeInvite` L1407, `leaveGroup` L1395, `setGroupDescription` L1401, `setGroupPhoto` L1464, `setGroupSetting` L1447, `setGroupSubject` L1398, `updateParticipants` L1387
- `toContactJid(jid)` · L374
  - chamado por: `profilePicture` L1488, `removeContact` L1513, `saveContact` L1500, `setBlock` L1497
- `toJid(to)` · L1646
  - chamado por: `markRead` L1132, `resolveJid` L1103, `sendPresence` L1108, `sendReaction` L1140

**Tipos**
- interface `BaileysEngineDeps` L57 · 11 propriedade(s)
- type `BaileysVersion` L104
- type `RawParticipant` L266
- type `RawGroup` L293
- type `RawNewsletter` L303

## `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`

379 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`
- importa (interno): `modules/messaging/application/reaction-key.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “BaileysEngine.onMessagesUpsert (P-066)” · L63
  - it “reação do contato no upsert NÃO vira evento message” · L64
  - it “reação NOSSA pelo celular (fromMe) também não — sem handoff falso” · L77
  - it “localização encaminhada sai como message type location com texto e selo” · L95
  - it “texto comum segue igual (fromMe do celular = source phone, não encaminhada)” · L123
  - it “voto do contato numa enquete → message poll_vote (continua contando como resposta)” · L136
  - it “o par LID↔telefone de uma reação ignorada ainda é aprendido (e funde a conversa)” · L149
- describe “BaileysEngine.onReactions — grupo (E22)” · L200
  - it “remetente é QUEM REAGIU (reaction.key.participant), não o autor da mensagem-alvo” · L201
- describe “BaileysEngine.onReactions — endereçamento por TELEFONE (modo PN: o *Alt é o @lid)” · L245
  - it “1:1: remetente e chat saem com o telefone (não o @lid do remoteJidAlt) e o par é aprendido” · L246
  - it “grupo: participant telefone + participantAlt @lid → telefone; a mesma pessoa mantém o senderKey depois de o p…” · L272
  - it “reação NOSSA: o *Alt (pode ser o nosso LID) não é aprendido como par de ninguém” · L308
- describe “BaileysEngine.onMessagesUpsert — mídia em invólucro que a lib não abre (E22)” · L329
  - it “figurinha lottie: o download recebe o conteúdo DESEMBRULHADO, com a key original (reupload)” · L337
  - it “imagem comum: o download recebe a MESMA mensagem (identidade)” · L362

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:468)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:468)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:415), `WWebJSEngine.constructor` (wwebjs.engine.ts:361)
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

234 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`

- describe “describeWwebjsMessage — tipos visíveis (P-066)” · L107
  - it “mídia é decidida pelo TYPE: imagem sem directPath (hasMedia false) segue imagem, sem o body cru” · L116
- describe “describeWwebjsMessage — sistema/reação/ligação não são mensagem” · L132
- describe “describeWwebjsMessage — selo "Encaminhada"” · L148
  - it “isForwarded + forwardingScore” · L149
  - it “isForwarded ausente (undefined na lib) e score 0 → false/null” · L159
- describe “mapWwebjsReaction (E22 — defensivo contra o rename `_serialized` → `$1`)” · L166
  - it “chave-alvo com _serialized e remote string → payload com timestamp inteiro” · L174
  - it “chave-alvo só com $1 (builds ≥ 2.3000.104x) → não descarta” · L193
  - it “remote como Wid ({_serialized}) → não lança” · L202
  - it “removida = emoji vazio; reação nossa = fromMe” · L214
  - it “sem chave-alvo ou status@broadcast → null” · L224

## `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`

227 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/message-content.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**Funções e constantes de topo**
- `IGNORED` = `new Set([ 'revoked', 'reaction', 'protocol', 'ciphertext', 'gp2', 'e2…` · L44
- `str(v)` · L72
  - chama: `clean` (message-content.ts:71)
  - chamado por: `describeWwebjsMessage` L78
- `describeWwebjsMessage(msg)` · L78
  - chama: `content` (message-content.ts:37), `formatContacts` (message-content.ts:108), `formatEvent` (message-content.ts:135), `formatLocation` (message-content.ts:83), `formatPoll` (message-content.ts:124), `forwarding` (message-content.ts:55), `ignore` (message-content.ts:33), `str` L72
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:1605), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2270)
- `serializedOf(k)` · L186
  - chamado por: `jidOf` L195, `mapWwebjsReaction` L204
- `jidOf(v)` · L195
  - chama: `serializedOf` L186
  - chamado por: `mapWwebjsReaction` L204
- `mapWwebjsReaction(r)` · L204
  - chama: `jidOf` L195, `serializedOf` L186
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:1816)

**Tipos**
- interface `WwebjsMessageLike` L17 · 15 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

2690 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `WWebJSEngine`** L307 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L308 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L309 · private · campo
- `status` · L310 · private · campo
- `qrBase64` · L311 · private · campo
- `stopped` · L312 · private · campo
- `lidToPnCache` · L315 · private · campo
- `pnToLidOutbound` · L319 · private · campo
- `sentByPanel` · L322 · private · campo
- `anonProxyUrl` · L325 · private · campo
- `lifecycle` · L332 · private · campo
- `reconnectAttempts` · L334 · private · campo
- `lastLoadingPct` · L338 · private · campo
- `logoutTimeoutMs` · L341 · private · campo
- `destroyTimeoutMs` · L345 · private · campo
- `generation` · L349 · private · campo
- `lastQrAt` · L351 · private · campo
- `qrHeals` · L353 · private · campo
- `qrWatchdogIntervalMs` · L355 · private · campo
- `qrStaleMs` · L356 · private · campo
- `initTimeoutMs` · L357 · private · campo
- `lastPairingCode` · L359 · private · campo
- `constructor(deps)` · L361
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L365 · private
  - chamado por: `handleDisconnect` L1112, `logout` L1321, `qrWatchdogTick` L425, `start` L588, `stop` L1269
- `getStatus()` · L374
  - implementa: `IEngine.getStatus` (engine.port.ts:290)
- `getQrBase64()` · L377
  - implementa: `IEngine.getQrBase64` (engine.port.ts:286)
- `getPairingCode()` · L380
  - implementa: `IEngine.getPairingCode` (engine.port.ts:289)
- `setStatus(status, extra)` · L384 · private
  - chama: `startQrWatchdog` L410, `startSyncWatchdog` L482, `stopQrWatchdog` L420, `stopSyncWatchdog` L493
  - chamado por: `doLogout` L1326, `doStart` L594, `doStop` L1276, `handleDisconnect` L1112, `handleInitFailure` L999, `qrWatchdogTick` L425, `requestPairingCode` L1358, `syncWatchdogTick` L500
- `startQrWatchdog()` · L410 · private
  - chama: `qrWatchdogTick` L425
  - chamado por: `setStatus` L384
- `stopQrWatchdog()` · L420 · private
  - chamado por: `qrWatchdogTick` L425, `setStatus` L384
- `qrWatchdogTick()` · L425 · private · async
  - chama: `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `doStart` L594, `serialize` L365, `setStatus` L384, `stopQrWatchdog` L420
  - chamado por: `startQrWatchdog` L410
- `watchdogFails` · L477 · private · campo
- `watchdogDegraded` · L478 · private · campo
- `WATCHDOG_INTERVAL_MS` · L479 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L480 · private · static · campo
- `startSyncWatchdog()` · L482 · private
  - chama: `syncWatchdogTick` L500
  - chamado por: `setStatus` L384
- `stopSyncWatchdog()` · L493 · private
  - chamado por: `setStatus` L384, `shutdown` L1297
- `syncWatchdogTick()` · L500 · private · async
  - chama: `isPageCrashError` L90, `raceStoreOp` L280, `healWedgedPage` L2200, `setStatus` L384, `syncHint` L2185
  - chamado por: `startSyncWatchdog` L482
- `clearStaleSingletonLocks()` · L562 · private · async
  - chama: `authDirOf` L191
  - chamado por: `doStart` L594
- `purgeAuthDir(sessionId)` · L582 · static · async
  - chama: `authDirOf` L191
  - chamado por: `SessionManager.logout` (session-manager.service.ts:378), `SessionManager.newQr` (session-manager.service.ts:407), `SessionManager.remove` (session-manager.service.ts:428), `doLogout` L1326
- `start()` · L588
  - implementa: `IEngine.start` (engine.port.ts:240)
  - chama: `doStart` L594, `serialize` L365
- `doStart(attempt, forceLive)` · L594 · private · async
  - chama: `buildAuthProxyUrl` L177, `raceStoreOp` L280, `userAgentFor` L108, `checkPinnedBuildAge` L882, `clearStaleSingletonLocks` L562, `closeAnonProxy` L1179, `consumeCleanShutdownMarker` L1239, `ensureWebVersionHtml` L928, `handleDisconnect` L1112, `handleInitFailure` L999, `mergeExistingLids` L2021, `onMessageAck` L1792, `onMessageCreate` L1605, `onReaction` L1816, `resolveWebVersion` L962, `setStatus` L384, `syncAddressBook` L2049
  - chamado por: `handleDisconnect` L1112, `handleInitFailure` L999, `qrWatchdogTick` L425, `start` L588
- `checkPinnedBuildAge(version)` · L882 · private · async
  - chama: `loadBuildCatalog` L197
  - chamado por: `doStart` L594
- `ensureWebVersionHtml(version)` · L928 · private · async
  - chamado por: `doStart` L594
- `resolveWebVersion(forceLive)` · L962 · private · async
  - chamado por: `doStart` L594
- `handleInitFailure(e, attempt, pinnedVersion)` · L999 · private · async
  - chama: `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `doStart` L594, `setStatus` L384
  - chamado por: `doStart` L594
- `handleDisconnect(reason)` · L1112 · private · async
  - chama: `raceStoreOp` L280, `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `doStart` L594, `serialize` L365, `setStatus` L384
  - chamado por: `doStart` L594
- `closeAnonProxy()` · L1179 · private · async
  - chamado por: `doLogout` L1326, `doStart` L594, `doStop` L1276, `handleDisconnect` L1112, `handleInitFailure` L999, `qrWatchdogTick` L425, `shutdown` L1297
- `destroyWithTimeout()` · L1198 · private · async
  - chamado por: `doLogout` L1326, `doStop` L1276, `handleDisconnect` L1112, `handleInitFailure` L999, `qrWatchdogTick` L425, `shutdown` L1297
- `markCleanShutdown()` · L1222 · private · async
  - chama: `authDirOf` L191
  - chamado por: `doStop` L1276, `shutdown` L1297
- `consumeCleanShutdownMarker()` · L1239 · private · async
  - chama: `authDirOf` L191
  - chamado por: `doStart` L594
- `stop()` · L1269
  - implementa: `IEngine.stop` (engine.port.ts:241)
  - chama: `doStop` L1276, `serialize` L365
- `doStop()` · L1276 · private · async
  - chama: `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `markCleanShutdown` L1222, `setStatus` L384
  - chamado por: `stop` L1269
- `shutdown()` · L1297 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:249)
  - chama: `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `markCleanShutdown` L1222, `stopSyncWatchdog` L493
- `logout()` · L1321
  - implementa: `IEngine.logout` (engine.port.ts:250)
  - chama: `doLogout` L1326, `serialize` L365
- `doLogout()` · L1326 · private · async
  - chama: `raceStoreOp` L280, `closeAnonProxy` L1179, `destroyWithTimeout` L1198, `purgeAuthDir` L582, `setStatus` L384
  - chamado por: `logout` L1321
- `requestPairingCode(phoneNumber)` · L1358 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:251)
  - chama: `req` L2093, `setStatus` L384
- `sendText(to, text, opts)` · L1371 · async
  - implementa: `IEngine.sendText` (engine.port.ts:252)
  - chama: `assertPageResponsive` L2158, `rememberPanel` L1830, `req` L2093, `toChatId` L2088, `toMentionIds` L1596, `withLidFallback` L1925
- `sendMedia(to, input)` · L1401 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:257)
  - chama: `extOf` L128, `assertPageResponsive` L2158, `rememberPanel` L1830, `req` L2093, `toChatId` L2088, `toMentionIds` L1596, `withLidFallback` L1925
- `sendLocation(to, input)` · L1475 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:262)
  - chama: `assertPageResponsive` L2158, `emitOutbound` L1526, `rememberPanel` L1830, `req` L2093, `toChatId` L2088, `withLidFallback` L1925
- `sendPoll(to, input)` · L1503 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:266)
  - chama: `assertPageResponsive` L2158, `emitOutbound` L1526, `rememberPanel` L1830, `req` L2093, `toChatId` L2088, `withLidFallback` L1925
- `emitOutbound(keyId, jid, type, text, opts)` · L1526 · private
  - chamado por: `sendLocation` L1475, `sendPoll` L1503
- `setProfileStatus(status)` · L1548 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:272)
  - chama: `req` L2093
- `setProfileName(name)` · L1551 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:273)
  - chama: `req` L2093
- `setProfilePhoto(image, mimetype)` · L1554 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:274)
  - chama: `req` L2093
- `sendPresence(to, state)` · L1559 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:270)
  - chama: `req` L2093, `toChatId` L2088, `withLidFallback` L1925
- `markRead(chatJid, _msgId)` · L1577 · async
  - implementa: `IEngine.markRead` (engine.port.ts:276)
  - chama: `req` L2093, `toChatId` L2088, `withLidFallback` L1925
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1586 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:280)
  - chama: `req` L2093, `withStoreReady` L2110
- `toMentionIds(mentions)` · L1596 · private
  - chama: `toChatId` L2088
  - chamado por: `sendMedia` L1401, `sendText` L1371
- `onMessageCreate(msg)` · L1605 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `mapInboundMediaType` L143, `handleIncomingMedia` L1682, `resolveNumberJid` L1841
  - chamado por: `doStart` L594
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L1682 · private · async
  - chama: `extOf` L128, `isPageCrashError` L90, `mapInboundMediaType` L143, `healWedgedPage` L2200
  - chamado por: `onMessageCreate` L1605
- `mapAck(ack)` · L1778 · private
  - chamado por: `onMessageAck` L1792
- `onMessageAck(msg, ack)` · L1792 · private
  - chama: `mapAck` L1778
  - chamado por: `doStart` L594
- `onReaction(r)` · L1816 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:204), `resolveNumberJid` L1841
  - chamado por: `doStart` L594
- `rememberPanel(keyId)` · L1830 · private
  - chamado por: `sendLocation` L1475, `sendMedia` L1401, `sendPoll` L1503, `sendText` L1371
- `resolveNumberJid(rawId)` · L1841 · private · async
  - chama: `cacheLidPn` L1862, `mergeLidMessages` L1997, `resolveLidToPhone` L1873
  - chamado por: `mergeExistingLids` L2021, `onMessageCreate` L1605, `onReaction` L1816, `toHistoryMessage` L2270
- `cacheLidPn(lid, phoneJid)` · L1862 · private
  - chamado por: `rememberOutboundLid` L1974, `resolveNumberJid` L1841, `resolvePendingLids` L2462
- `resolveLidToPhone(lid)` · L1873 · private · async
  - chamado por: `resolveNumberJid` L1841, `resolvePendingLids` L2462
- `withLidFallback(pnJid, op)` · L1925 · private · async
  - chama: `rememberOutboundLid` L1974, `resolvePhoneToLid` L1949, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `markRead` L1577, `sendLocation` L1475, `sendMedia` L1401, `sendPoll` L1503, `sendPresence` L1559, `sendText` L1371
- `resolvePhoneToLid(phoneJid)` · L1949 · private · async
  - chamado por: `withLidFallback` L1925
- `rememberOutboundLid(pnJid, lid)` · L1974 · private
  - chama: `cacheLidPn` L1862
  - chamado por: `withLidFallback` L1925
- `mergeLidMessages(lid, phoneJid)` · L1997 · private · async
  - chamado por: `resolveNumberJid` L1841
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2021 · private · async
  - chama: `resolveNumberJid` L1841
  - chamado por: `doStart` L594
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2049 · private · async
  - chama: `req` L2093, `withStoreReady` L2110
  - chamado por: `doStart` L594
- `toChatId(to)` · L2088 · private
  - chamado por: `createGroup` L2498, `fetchChatHistory` L2252, `groupMembershipAction` L2568, `markRead` L1577, `profilePicture` L2616, `sendLocation` L1475, `sendMedia` L1401, `sendPoll` L1503, `sendPresence` L1559, `sendText` L1371, `setBlock` L2627, `setChatFlag` L2308, `toMentionIds` L1596, `updateParticipants` L2513
- `req()` · L2093 · private
  - chamado por: `channelInfo` L2669, `checkNumbers` L2605, `createChannel` L2651, `createGroup` L2498, `fetchChatHistory` L2252, `followChannel` L2682, `getGroupChat` L2355, `listChats` L2232, `listGroups` L2336, `markRead` L1577, `profilePicture` L2616, `removeContact` L2646, `requestPairingCode` L1358, `resolvePendingLids` L2462, `saveContact` L2635, `sendLocation` L1475, `sendMedia` L1401, `sendPoll` L1503, `sendPresence` L1559, `sendReaction` L1586, `sendText` L1371, `setBlock` L2627, `setChatFlag` L2308, `setProfileName` L1551, `setProfilePhoto` L1554, `setProfileStatus` L1548, `syncAddressBook` L2049, `unfollowChannel` L2686
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2110 · private · async
  - chama: `isPageCrashError` L90, `raceStoreOp` L280, `assertPageResponsive` L2158, `healWedgedPage` L2200, `syncHint` L2185
  - chamado por: `channelInfo` L2669, `checkNumbers` L2605, `createChannel` L2651, `createGroup` L2498, `fetchChatHistory` L2252, `followChannel` L2682, `getGroupChat` L2355, `listChats` L2232, `listGroups` L2336, `profilePicture` L2616, `removeContact` L2646, `saveContact` L2635, `sendReaction` L1586, `setBlock` L2627, `setChatFlag` L2308, `syncAddressBook` L2049, `unfollowChannel` L2686
- `assertPageResponsive(probeTimeoutMs)` · L2158 · private · async
  - chama: `isPageCrashError` L90, `raceStoreOp` L280, `healWedgedPage` L2200, `syncHint` L2185
  - chamado por: `sendLocation` L1475, `sendMedia` L1401, `sendPoll` L1503, `sendText` L1371, `withStoreReady` L2110
- `syncHint()` · L2185 · private
  - chamado por: `assertPageResponsive` L2158, `syncWatchdogTick` L500, `withStoreReady` L2110
- `lastHealAt` · L2196 · private · campo
- `healing` · L2197 · private · campo
- `HEAL_COOLDOWN_MS` · L2198 · private · static · campo
- `healWedgedPage()` · L2200 · private · async
  - chamado por: `assertPageResponsive` L2158, `handleIncomingMedia` L1682, `syncWatchdogTick` L500, `withStoreReady` L2110
- `listChats(limit)` · L2232 · async
  - implementa: `IEngine.listChats` (engine.port.ts:295)
  - chama: `req` L2093, `withStoreReady` L2110
- `fetchChatHistory(chatJid, limit)` · L2252 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:296)
  - chama: `req` L2093, `toChatId` L2088, `toHistoryMessage` L2270, `withStoreReady` L2110
- `toHistoryMessage(msg)` · L2270 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `mapInboundMediaType` L143, `resolveNumberJid` L1841
  - chamado por: `fetchChatHistory` L2252
- `setChatFlag(chatJid, flag, enabled)` · L2308 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:300)
  - chama: `req` L2093, `toChatId` L2088, `withStoreReady` L2110
- `listGroups()` · L2336 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:303)
  - chama: `groupFlags` L162, `req` L2093, `withStoreReady` L2110
- `getGroupChat(jid)` · L2355 · private · async
  - chama: `req` L2093, `toGroupId` L2494, `withStoreReady` L2110
  - chamado por: `groupInfo` L2364, `groupInviteCode` L2538, `groupMembershipAction` L2568, `groupMembershipRequests` L2550, `groupRevokeInvite` L2542, `leaveGroup` L2526, `setGroupDescription` L2534, `setGroupPhoto` L2594, `setGroupSetting` L2583, `setGroupSubject` L2530, `updateParticipants` L2513
- `groupInfo(jid)` · L2364 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:304)
  - chama: `groupFlags` L162, `getGroupChat` L2355, `resolveParticipantsBatch` L2392
  - chamado por: `createGroup` L2498
- `LID_BATCH` · L2381 · private · static · campo
- `resolveParticipantsBatch(list)` · L2392 · private · async
  - chama: `resolvePendingLids` L2462
  - chamado por: `groupInfo` L2364
- `resolvePendingLids(rows)` · L2462 · private · async
  - chama: `cacheLidPn` L1862, `req` L2093, `resolveLidToPhone` L1873
  - chamado por: `resolveParticipantsBatch` L2392
- `toGroupId(jid)` · L2494 · private
  - chamado por: `getGroupChat` L2355
- `createGroup(subject, participants)` · L2498 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:305)
  - chama: `groupInfo` L2364, `req` L2093, `toChatId` L2088, `withStoreReady` L2110
- `updateParticipants(jid, action, participants)` · L2513 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:306)
  - chama: `getGroupChat` L2355, `toChatId` L2088
- `leaveGroup(jid)` · L2526 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:311)
  - chama: `getGroupChat` L2355
- `setGroupSubject(jid, subject)` · L2530 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:312)
  - chama: `getGroupChat` L2355
- `setGroupDescription(jid, description)` · L2534 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:313)
  - chama: `getGroupChat` L2355
- `groupInviteCode(jid)` · L2538 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:314)
  - chama: `getGroupChat` L2355
- `groupRevokeInvite(jid)` · L2542 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:315)
  - chama: `getGroupChat` L2355
- `groupMembershipRequests(jid)` · L2550 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:318)
  - chama: `getGroupChat` L2355
- `groupMembershipAction(jid, action, participants)` · L2568 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:319)
  - chama: `getGroupChat` L2355, `toChatId` L2088
- `setGroupSetting(jid, setting, enabled)` · L2583 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:325)
  - chama: `getGroupChat` L2355
- `setGroupPhoto(jid, image, mimetype)` · L2594 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:331)
  - chama: `getGroupChat` L2355
- `checkNumbers(numbers)` · L2605 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:334)
  - chama: `req` L2093, `withStoreReady` L2110
- `profilePicture(jid)` · L2616 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:335)
  - chama: `req` L2093, `toChatId` L2088, `withStoreReady` L2110
- `setBlock(jid, action)` · L2627 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:336)
  - chama: `req` L2093, `toChatId` L2088, `withStoreReady` L2110
- `saveContact(jid, input)` · L2635 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:338)
  - chama: `req` L2093, `withStoreReady` L2110
- `removeContact(jid)` · L2646 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:340)
  - chama: `req` L2093, `withStoreReady` L2110
- `createChannel(name, description)` · L2651 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:343)
  - chama: `req` L2093, `withStoreReady` L2110
- `channelInfo(jid)` · L2669 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:344)
  - chama: `req` L2093, `withStoreReady` L2110
- `followChannel(jid)` · L2682 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:345)
  - chama: `req` L2093, `withStoreReady` L2110
- `unfollowChannel(jid)` · L2686 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:346)
  - chama: `req` L2093, `withStoreReady` L2110

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L86
- `isPageCrashError(message)` · L90
  - chamado por: `assertPageResponsive` L2158, `handleIncomingMedia` L1682, `syncWatchdogTick` L500, `withStoreReady` L2110
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L98
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `userAgentFor(sessionId)` · L108
  - chamado por: `doStart` L594
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L128
  - chamado por: `handleIncomingMedia` L1682, `sendMedia` L1401
- `mapInboundMediaType(t)` · L143
  - chamado por: `handleIncomingMedia` L1682, `onMessageCreate` L1605, `toHistoryMessage` L2270
- `groupFlags(g)` · L162
  - chamado por: `groupInfo` L2364, `listGroups` L2336
- `buildAuthProxyUrl(server, username, password)` · L177
  - chamado por: `doStart` L594
- `authDirOf(sessionId)` · L191
  - chamado por: `clearStaleSingletonLocks` L562, `consumeCleanShutdownMarker` L1239, `markCleanShutdown` L1222, `purgeAuthDir` L582
- `loadBuildCatalog()` · L197 · async
  - chamado por: `checkPinnedBuildAge` L882
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L246
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L274
- `raceStoreOp(op, ms, timeoutMsg)` · L280 · async
  - chamado por: `assertPageResponsive` L2158, `doLogout` L1326, `doStart` L594, `handleDisconnect` L1112, `syncWatchdogTick` L500, `withStoreReady` L2110

**Tipos**
- interface `BuildCatalogEntry` L257 · 3 propriedade(s)
- interface `BuildCatalog` L262 · 3 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`

191 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

- describe “WWebJSEngine.onMessageCreate (P-066)” · L59
  - it “tipo de sistema DO CELULAR (fromMe) sai na hora, sem evento (não espera 3 s nem vira handoff)” · L60
  - it “localização sai com type location e o texto do cartão (nunca o body de miniatura)” · L68
  - it “imagem sem arquivo (hasMedia false): não chama downloadMedia, emite só os metadados” · L97
  - it “tipo sem cartão de mídia COM arquivo (produto): baixa como documento e mantém type other” · L118
- describe “WWebJSEngine.onReaction (E22 — chave-alvo em $1, remote como Wid)” · L142
  - it “emite message.reaction com keyId do $1, chat do Wid e timestamp inteiro” · L143
- describe “WWebJSEngine.toHistoryMessage (backfill com a mesma descrição)” · L168
  - it “ignora notificação de sistema e descreve enquete” · L169

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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:1925)
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
