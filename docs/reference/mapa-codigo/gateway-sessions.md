<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 427 |
| `modules/sessions/application/session-config.service.ts` | 65 |
| `modules/sessions/application/session-manager.service.ts` | 716 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/domain/wwebjs-version.spec.ts` | 48 |
| `modules/sessions/domain/wwebjs-version.ts` | 10 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 548 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 1939 |
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
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts` | 43 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts` | 72 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 3220 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts` | 136 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts` | 906 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts` | 398 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.spec.ts` | 261 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts` | 135 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts` | 340 |
| `modules/sessions/interface/dto.ts` | 61 |
| `modules/sessions/interface/session-ref.pipe.ts` | 30 |
| `modules/sessions/interface/sessions.controller.ts` | 416 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

427 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `PendingMediaSendError`** L17 · `extends Error`
- injeta (construtor): `completion: Promise<{ keyId: string; jid: string }>`
- `constructor(completion)` · L18
  - chamado por: `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

**class `ForwardSourceError`** L287 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L288
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1313), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)

**class `UnsupportedEngineOperationError`** L304 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L305
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1521), `BaileysEngine.listChats` (baileys.engine.ts:1516), `BaileysEngine.setChatFlag` (baileys.engine.ts:1532)

**Funções e constantes de topo**
- `MAX_FORWARD_TARGETS` = `5` · L242
- `FREQUENTLY_FORWARDED_MIN` = `5` · L243

**Tipos**
- interface `SessionStatePayload` L3 · 4 propriedade(s)
- type `MessageSource` L13
- interface `MessagePayload` L25 · 19 propriedade(s)
- type `AckStatus` L63
- interface `MessageAckPayload` L65 · 5 propriedade(s)
- interface `ReactionPayload` L74 · 6 propriedade(s)
- type `EngineEventName` L83
- type `EngineEventHandler` L85
- type `GuardrailEventName` L92
- type `WaEventName` L103
- interface `WaEventEnvelope` L106 · 7 propriedade(s)
- type `MediaSendType` L116
- interface `SendOptions` L121 · 3 propriedade(s)
- interface `SendMediaInput` L129 · 6 propriedade(s)
- interface `SendLocationInput` L139 · 4 propriedade(s)
- interface `SendPollInput` L145 · 3 propriedade(s)
- type `GroupParticipantRole` L152
- type `GroupParticipantAction` L153
- interface `GroupParticipantInfo` L155 · 4 propriedade(s)
- interface `GroupInfo` L161 · 8 propriedade(s)
- interface `ContactCheck` L171 · 3 propriedade(s)
- interface `MembershipRequest` L179 · 3 propriedade(s)
- type `GroupSettingKey` L186
- type `MembershipAction` L187
- interface `SaveContactInput` L192 · 3 propriedade(s)
- interface `ChannelInfo` L197 · 4 propriedade(s)
- interface `ChatSummary` L206 · 6 propriedade(s)
- type `ChatFlag` L217
- interface `HistoryMessage` L221 · 13 propriedade(s)
- interface `ForwardSource` L248 · 12 propriedade(s)
- interface `SendResult` L265 · 5 propriedade(s)
- interface `PreparedForward` L276 · 1 propriedade(s)
  - `PreparedForward.send(to, opts)` · L278
    - chamado por: `ForwardService.sendOne` (forward.service.ts:357)
- type `ForwardErrorCode` L285
- type `PresenceState` L298
- interface `IEngine` L311 · 1 propriedade(s)
  - `IEngine.start()` · L315
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:485), `WWebJSEngine.start` (wwebjs.engine.ts:703)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:460), `SessionManager.start` (session-manager.service.ts:304)
  - `IEngine.stop()` · L316
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1832), `WWebJSEngine.stop` (wwebjs.engine.ts:1500)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:278), `SessionManager.newQr` (session-manager.service.ts:416), `SessionManager.onModuleDestroy` (session-manager.service.ts:97), `SessionManager.remove` (session-manager.service.ts:437), `SessionManager.stop` (session-manager.service.ts:377)
  - `IEngine.shutdown()` · L324
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:1881), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1528)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:97)
  - `IEngine.logout()` · L325
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:1895), `WWebJSEngine.logout` (wwebjs.engine.ts:1553)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:387)
  - `IEngine.requestPairingCode(phoneNumber)` · L326
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1824), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1590)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:460)
  - `IEngine.sendText(to, text, opts)` · L327
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1085), `WWebJSEngine.sendText` (wwebjs.engine.ts:1603)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:475)
  - `IEngine.sendMedia(to, input)` · L332
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1117), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:489)
  - `IEngine.sendLocation(to, input)` · L337
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1172), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:497)
  - `IEngine.sendPoll(to, input)` · L341
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1201), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:505)
  - `IEngine.sendPresence(to, state)` · L345
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1263), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1823)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:513)
  - `IEngine.setProfileStatus(status)` · L347
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1273), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1812)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:521)
  - `IEngine.setProfileName(name)` · L348
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1276), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1815)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:524)
  - `IEngine.setProfilePhoto(image, mimetype)` · L349
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1279), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1818)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:527)
  - `IEngine.markRead(chatJid, msgId)` · L351
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1287), `WWebJSEngine.markRead` (wwebjs.engine.ts:1841)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:535)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L355
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1295), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1850)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:559)
  - `IEngine.prepareForward(src)` · L364
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1313), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:572)
  - `IEngine.getQrBase64()` · L365
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:462), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:431)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:452)
  - `IEngine.getPairingCode()` · L368
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:434)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:456)
  - `IEngine.getStatus()` · L369
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:458), `WWebJSEngine.getStatus` (wwebjs.engine.ts:428)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:460), `SessionManager.sendText` (session-manager.service.ts:475), `SessionManager.working` (session-manager.service.ts:580)
  - `IEngine.listChats(limit)` · L374
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1516), `WWebJSEngine.listChats` (wwebjs.engine.ts:2763)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:540)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L375
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1521), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2783)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:543)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L379
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1532), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2838)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:550)
  - `IEngine.listGroups()` · L382
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1651), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2866)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:590)
  - `IEngine.groupInfo(jid)` · L383
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1659), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2894)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:593)
  - `IEngine.createGroup(subject, participants)` · L384
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1667), `WWebJSEngine.createGroup` (wwebjs.engine.ts:3028)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:596)
  - `IEngine.updateParticipants(jid, action, participants)` · L385
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1675), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:3043)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:603)
  - `IEngine.leaveGroup(jid)` · L390
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1683), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:3056)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:615)
  - `IEngine.setGroupSubject(jid, subject)` · L391
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1686), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:3060)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:618)
  - `IEngine.setGroupDescription(jid, description)` · L392
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1689), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:3064)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:625)
  - `IEngine.groupInviteCode(jid)` · L393
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1692), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:3068)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:632)
  - `IEngine.groupRevokeInvite(jid)` · L394
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1695), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:3072)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:635)
  - `IEngine.groupMembershipRequests(jid)` · L397
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1701), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:3080)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:638)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L398
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1713), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:3098)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:644)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L404
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1735), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:3113)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:656)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L410
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1752), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:3124)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:664)
  - `IEngine.checkNumbers(numbers)` · L413
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1761), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:3135)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:674)
  - `IEngine.profilePicture(jid)` · L414
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1776), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:3146)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:677)
  - `IEngine.setBlock(jid, action)` · L415
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1785), `WWebJSEngine.setBlock` (wwebjs.engine.ts:3157)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:680)
  - `IEngine.saveContact(jid, input)` · L417
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1788), `WWebJSEngine.saveContact` (wwebjs.engine.ts:3165)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:687)
  - `IEngine.removeContact(jid)` · L419
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1801), `WWebJSEngine.removeContact` (wwebjs.engine.ts:3176)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:694)
  - `IEngine.createChannel(name, description)` · L422
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1806), `WWebJSEngine.createChannel` (wwebjs.engine.ts:3181)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:699)
  - `IEngine.channelInfo(jid)` · L423
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1813), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:3199)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:706)
  - `IEngine.followChannel(jid)` · L424
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1817), `WWebJSEngine.followChannel` (wwebjs.engine.ts:3212)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:709)
  - `IEngine.unfollowChannel(jid)` · L425
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1820), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:3216)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:712)

## `modules/sessions/application/session-config.service.ts`

65 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-config.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionConfigService`** L15 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L17
- `get(sessionId)` · L20 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:190), `SessionsController.health` (sessions.controller.ts:181)
  - banco: `sessionConfig.upsert`
- `update(sessionId, patch)` · L28 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.patchConfig` (sessions.controller.ts:197)
  - banco: `sessionConfig.upsert`
- `capFor(cfg, state)` · L41
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:190), `SessionsController.health` (sessions.controller.ts:181), `SessionsController.patchConfig` (sessions.controller.ts:197)

**Tipos**
- type `SessionConfigPatch` L8
- interface `CapInfo` L10 · 2 propriedade(s)

## `modules/sessions/application/session-manager.service.ts`

716 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
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
  - chama: `start` L304, `SessionRepository.findAutostart` (session.repository.ts:31)
- `onModuleDestroy()` · L97 · async
  - chama: `IEngine.shutdown` (engine.port.ts:324), `IEngine.stop` (engine.port.ts:316)
- `getOrCreateEngine(sessionId, engineType)` · L138 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:124), `handleEngineEvent` L199, `EngineFactory.create` (engine.factory.ts:11)
  - chamado por: `requestPairingCode` L460, `start` L304
  - banco: `sessionConfig.findUnique`
- `handleEngineEvent(sessionId, name, payload)` · L199 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `persistStatus` L254, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L138
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p)` · L254 · private · async
  - chama: `discardOrphan` L278, `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `handleEngineEvent` L199
- `discarding` · L275 · private · campo
- `discardOrphan(sessionId)` · L278 · private · async
  - chama: `IEngine.stop` (engine.port.ts:316)
  - chamado por: `persistStatus` L254
- `START_TIMEOUT_MS` · L302 · private · static · campo
- `start(sessionId)` · L304 · async
  - chama: `IEngine.start` (engine.port.ts:315), `getOrCreateEngine` L138, `startWithTimeout` L315, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L416, `onApplicationBootstrap` L71, `restart` L381, `SessionsController.create` (sessions.controller.ts:98), `SessionsController.start` (sessions.controller.ts:322)
- `startWithTimeout(sessionId, op)` · L315 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L460, `start` L304
- `withTimeout(op, ms)` · L355 · private · async
  - chamado por: `logout` L387, `newQr` L416, `remove` L437, `stop` L377
- `stop(sessionId)` · L377 · async
  - chama: `IEngine.stop` (engine.port.ts:316), `withTimeout` L355
  - chamado por: `restart` L381, `SessionsController.stop` (sessions.controller.ts:329)
- `restart(sessionId)` · L381 · async
  - chama: `start` L304, `stop` L377
  - chamado por: `SessionsController.restart` (sessions.controller.ts:336)
- `logout(sessionId)` · L387 · async
  - chama: `IEngine.logout` (engine.port.ts:325), `withTimeout` L355, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:343)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L416 · async
  - chama: `IEngine.stop` (engine.port.ts:316), `start` L304, `withTimeout` L355, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:374)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L437 · async
  - chama: `IEngine.stop` (engine.port.ts:316), `withTimeout` L355, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:350)
- `getQr(sessionId)` · L452
  - chama: `IEngine.getQrBase64` (engine.port.ts:365)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:358)
- `getPairingCode(sessionId)` · L456
  - chama: `IEngine.getPairingCode` (engine.port.ts:368)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:358)
- `requestPairingCode(sessionId, phoneNumber)` · L460 · async
  - chama: `IEngine.getStatus` (engine.port.ts:369), `IEngine.requestPairingCode` (engine.port.ts:326), `IEngine.start` (engine.port.ts:315), `getOrCreateEngine` L138, `startWithTimeout` L315, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:381)
- `sendText(sessionId, to, text, opts)` · L475 · async
  - chama: `IEngine.getStatus` (engine.port.ts:369), `IEngine.sendText` (engine.port.ts:327)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendText` (messages.controller.ts:614)
- `sendMedia(sessionId, to, input)` · L489 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:332), `working` L580
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.sendMedia` (messages.controller.ts:643), `MessagesController.sendMediaUrl` (messages.controller.ts:713)
- `sendLocation(sessionId, to, input)` · L497
  - chama: `IEngine.sendLocation` (engine.port.ts:337), `working` L580
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:785)
- `sendPoll(sessionId, to, input)` · L505
  - chama: `IEngine.sendPoll` (engine.port.ts:341), `working` L580
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:824)
- `sendPresence(sessionId, to, state)` · L513
  - chama: `IEngine.sendPresence` (engine.port.ts:345), `working` L580
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `SessionsController.presence` (sessions.controller.ts:214)
- `setProfileStatus(sessionId, status)` · L521
  - chama: `IEngine.setProfileStatus` (engine.port.ts:347), `working` L580
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:230)
- `setProfileName(sessionId, name)` · L524
  - chama: `IEngine.setProfileName` (engine.port.ts:348), `working` L580
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:249)
- `setProfilePhoto(sessionId, image, mimetype)` · L527
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:349), `working` L580
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:269)
- `markRead(sessionId, chatJid, msgId)` · L535
  - chama: `IEngine.markRead` (engine.port.ts:351), `working` L580
  - chamado por: `MessagesController.markRead` (messages.controller.ts:484)
- `listChats(sessionId, limit)` · L540
  - chama: `IEngine.listChats` (engine.port.ts:374), `working` L580
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L543
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:375), `working` L580
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L550
  - chama: `IEngine.setChatFlag` (engine.port.ts:379), `working` L580
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:410)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L559
  - chama: `IEngine.sendReaction` (engine.port.ts:355), `working` L580
  - chamado por: `MessagesController.reaction` (messages.controller.ts:496)
- `prepareForward(sessionId, src)` · L572
  - chama: `IEngine.prepareForward` (engine.port.ts:364), `working` L580
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `working(sessionId)` · L580 · private
  - chama: `IEngine.getStatus` (engine.port.ts:369)
  - chamado por: `channelInfo` L706, `checkNumbers` L674, `createChannel` L699, `createGroup` L596, `fetchChatHistory` L543, `followChannel` L709, `groupInfo` L593, `groupInviteCode` L632, `groupMembershipAction` L644, `groupMembershipRequests` L638, `groupRevokeInvite` L635, `leaveGroup` L615, `listChats` L540, `listGroups` L590, `markRead` L535, `prepareForward` L572, `profilePicture` L677, `removeContact` L694, `saveContact` L687, `sendLocation` L497, `sendMedia` L489, `sendPoll` L505, `sendPresence` L513, `sendReaction` L559, `setBlock` L680, `setChatFlag` L550, `setGroupDescription` L625, `setGroupPhoto` L664, `setGroupSetting` L656, `setGroupSubject` L618, `setProfileName` L524, `setProfilePhoto` L527, `setProfileStatus` L521, `unfollowChannel` L712, `updateParticipants` L603
- `listGroups(sessionId)` · L590
  - chama: `IEngine.listGroups` (engine.port.ts:382), `working` L580
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L593
  - chama: `IEngine.groupInfo` (engine.port.ts:383), `working` L580
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L596
  - chama: `IEngine.createGroup` (engine.port.ts:384), `working` L580
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L603
  - chama: `IEngine.updateParticipants` (engine.port.ts:385), `working` L580
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L615
  - chama: `IEngine.leaveGroup` (engine.port.ts:390), `working` L580
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L618
  - chama: `IEngine.setGroupSubject` (engine.port.ts:391), `working` L580
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L625
  - chama: `IEngine.setGroupDescription` (engine.port.ts:392), `working` L580
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L632
  - chama: `IEngine.groupInviteCode` (engine.port.ts:393), `working` L580
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L635
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:394), `working` L580
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L638
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:397), `working` L580
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L644
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:398), `working` L580
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L656
  - chama: `IEngine.setGroupSetting` (engine.port.ts:404), `working` L580
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L664
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:410), `working` L580
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L674
  - chama: `IEngine.checkNumbers` (engine.port.ts:413), `working` L580
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L677
  - chama: `IEngine.profilePicture` (engine.port.ts:414), `working` L580
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L680
  - chama: `IEngine.setBlock` (engine.port.ts:415), `working` L580
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L687
  - chama: `IEngine.saveContact` (engine.port.ts:417), `working` L580
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L694
  - chama: `IEngine.removeContact` (engine.port.ts:419), `working` L580
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L699
  - chama: `IEngine.createChannel` (engine.port.ts:422), `working` L580
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L706
  - chama: `IEngine.channelInfo` (engine.port.ts:423), `working` L580
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L709
  - chama: `IEngine.followChannel` (engine.port.ts:424), `working` L580
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L712
  - chama: `IEngine.unfollowChannel` (engine.port.ts:425), `working` L580
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
    - chamado por: `SessionsController.create` (sessions.controller.ts:98)
  - `SessionRepository.findById(id)` · L20
    - implementado por: `PrismaSessionRepository.findById` (prisma-session.repository.ts:59)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:460), `SessionManager.start` (session-manager.service.ts:304), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:98), `SessionsController.ensure` (sessions.controller.ts:410)
  - `SessionRepository.findByName(name)` · L21
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:64)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:98)
  - `SessionRepository.list()` · L22
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:69)
    - chamado por: `SessionsController.create` (sessions.controller.ts:98), `SessionsController.list` (sessions.controller.ts:155)
  - `SessionRepository.updateStatus(id, status, patch)` · L25
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:76)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:387), `SessionManager.persistStatus` (session-manager.service.ts:254), `SessionManager.startWithTimeout` (session-manager.service.ts:315)
  - `SessionRepository.delete(id)` · L30
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:101)
    - chamado por: `SessionManager.remove` (session-manager.service.ts:437), `SessionsController.create` (sessions.controller.ts:98)
  - `SessionRepository.findAutostart()` · L31
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:105)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:71)

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
  - chamado por: `WWebJSEngine.doStart` (wwebjs.engine.ts:717), `WWebJSEngine.resolveWebVersion` (wwebjs.engine.ts:1140)

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
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:199)
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
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1383), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:849)
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
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1313)

**Tipos**
- type `BaileysDescribed` L27
- type `BaileysForwardContent` L505

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

1939 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L411 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L412 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L413 · private · campo
- `status` · L414 · private · campo
- `qrBase64` · L415 · private · campo
- `stopped` · L416 · private · campo
- `reconnectAttempts` · L417 · private · campo
- `lifecycle` · L423 · private · campo
- `sentMessages` · L425 · private · campo
- `lidToPn` · L427 · private · campo
- `groupPushName` · L430 · private · campo
- `connectGeneration` · L435 · private · campo
- `groupMetaCache` · L437 · private · campo
- `constructor(deps)` · L442
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L444 · private
  - chamado por: `connect` L495, `groupInfo` L1659, `listGroups` L1651
- `clearReconnectTimer()` · L453 · private
  - chamado por: `doLogout` L1900, `doStop` L1839, `onConnectionUpdate` L733, `shutdown` L1881, `start` L485
- `getStatus()` · L458
  - implementa: `IEngine.getStatus` (engine.port.ts:369)
- `getQrBase64()` · L462
  - implementa: `IEngine.getQrBase64` (engine.port.ts:365)
- `setStatus(status, extra)` · L466 · private
  - chamado por: `connect` L495, `doLogout` L1900, `doStop` L1839, `onConnectionUpdate` L733, `requestPairingCode` L1824
- `serialize(fn)` · L476 · private
  - chamado por: `logout` L1895, `onConnectionUpdate` L733, `start` L485, `stop` L1832
- `start()` · L485
  - implementa: `IEngine.start` (engine.port.ts:315)
  - chama: `clearReconnectTimer` L453, `connect` L495, `serialize` L476
- `connect()` · L495 · private · async
  - chama: `cacheGroupMeta` L444, `loadMessageForRetry` L1455, `onConnectionUpdate` L733, `onContacts` L1608, `onMessagesUpdate` L943, `onMessagesUpsert` L849, `onReactions` L628, `safe` L1490, `setStatus` L466, `latestBaileysVersion` L130, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L733, `start` L485
- `onReactions(reactions)` · L628 · private
  - chama: `learnPair` L664, `resolveChatJid` L657, `mapBaileysReaction` L199
  - chamado por: `connect` L495
- `resolveChatJid(jid)` · L657 · private
  - chamado por: `groupSenderOf` L691, `onReactions` L628
- `learnPair(a, b)` · L664 · private
  - chama: `learnLid` L671
  - chamado por: `onReactions` L628
- `learnLid(lid, pn)` · L671 · private
  - chama: `mergeLidMessages` L1565
  - chamado por: `groupSenderOf` L691, `learnPair` L664, `onMessagesUpsert` L849
- `groupSenderOf(m)` · L691 · private
  - chama: `learnLid` L671, `rememberGroupPushName` L725, `resolveChatJid` L657, `phoneFirst` L226
  - chamado por: `onMessagesUpsert` L849
- `rememberGroupPushName(pn, pushName)` · L725 · private
  - chamado por: `groupSenderOf` L691
- `onConnectionUpdate(update)` · L733 · private · async
  - chama: `clearCredentials` L1923, `clearReconnectTimer` L453, `connect` L495, `detachSocketListeners` L1856, `serialize` L476, `setStatus` L466, `warmLidCache` L1551
  - chamado por: `connect` L495
- `onMessagesUpsert(upsert)` · L849 · private
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L691, `handleIncomingMedia` L1009, `learnLid` L671, `encodeProto` L178
  - chamado por: `connect` L495
- `onMessagesUpdate(updates)` · L943 · private
  - chama: `markMessage` L990, `mapAckStatus` L245
  - chamado por: `connect` L495
- `markMessage(keyId, fromMe, field)` · L990 · private
  - chamado por: `onMessagesUpdate` L943
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1009 · private · async
  - chama: `encodeProto` L178, `extOf` L231
  - chamado por: `onMessagesUpsert` L849
- `sendText(to, text, opts)` · L1085 · async
  - implementa: `IEngine.sendText` (engine.port.ts:327)
  - chama: `cacheSent` L1441, `resolveJid` L1258, `encodeProto` L178
- `sendMedia(to, input)` · L1117 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:332)
  - chama: `cacheSent` L1441, `resolveJid` L1258, `buildMediaContent` L263, `encodeProto` L178, `extOf` L231
- `sendLocation(to, input)` · L1172 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:337)
  - chama: `emitOutbound` L1226, `resolveJid` L1258, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1201 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:341)
  - chama: `emitOutbound` L1226, `resolveJid` L1258, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1226 · private
  - chama: `cacheSent` L1441, `encodeProto` L178
  - chamado por: `sendLocation` L1172, `sendPoll` L1201
- `resolveJid(to)` · L1258 · private · async
  - chama: `toJid` L1934
  - chamado por: `forwardTo` L1383, `resolveParticipants` L1542, `sendLocation` L1172, `sendMedia` L1117, `sendPoll` L1201, `sendText` L1085
- `sendPresence(to, state)` · L1263 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:345)
  - chama: `sk` L1509, `toJid` L1934
- `setProfileStatus(status)` · L1273 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:347)
  - chama: `sk` L1509
- `setProfileName(name)` · L1276 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:348)
  - chama: `sk` L1509
- `setProfilePhoto(image, _mimetype)` · L1279 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:349)
  - chama: `sk` L1509
- `markRead(chatJid, msgId)` · L1287 · async
  - implementa: `IEngine.markRead` (engine.port.ts:351)
  - chama: `sk` L1509, `toJid` L1934
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1295 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:355)
  - chama: `toJid` L1934
- `prepareForward(src)` · L1313 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:364)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:288), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1383, `decodeProto` L181
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1383 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L1441, `resolveJid` L1258, `encodeProto` L178, `toJid` L1934
  - chamado por: `prepareForward` L1313
- `cacheSent(keyId, message)` · L1441 · private
  - chamado por: `emitOutbound` L1226, `forwardTo` L1383, `loadMessageForRetry` L1455, `sendMedia` L1117, `sendText` L1085
- `loadMessageForRetry(key)` · L1455 · private · async
  - chama: `cacheSent` L1441, `decodeProto` L181
  - chamado por: `connect` L495
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1490 · private
  - chamado por: `connect` L495
- `sk()` · L1509 · private
  - chamado por: `channelInfo` L1813, `checkNumbers` L1761, `createChannel` L1806, `createGroup` L1667, `followChannel` L1817, `groupInfo` L1659, `groupInviteCode` L1692, `groupMembershipAction` L1713, `groupMembershipRequests` L1701, `groupRevokeInvite` L1695, `leaveGroup` L1683, `listGroups` L1651, `markRead` L1287, `profilePicture` L1776, `removeContact` L1801, `saveContact` L1788, `sendPresence` L1263, `setBlock` L1785, `setGroupDescription` L1689, `setGroupPhoto` L1752, `setGroupSetting` L1735, `setGroupSubject` L1686, `setProfileName` L1276, `setProfilePhoto` L1279, `setProfileStatus` L1273, `unfollowChannel` L1820, `updateParticipants` L1675
- `listChats(_limit)` · L1516 · async
  - implementa: `IEngine.listChats` (engine.port.ts:374)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:305)
- `fetchChatHistory(_chatJid, _limit)` · L1521 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:375)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:305)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1532 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:379)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:305)
- `resolveParticipants(items)` · L1542 · private · async
  - chama: `resolveJid` L1258
  - chamado por: `createGroup` L1667, `groupMembershipAction` L1713, `updateParticipants` L1675
- `warmLidCache()` · L1551 · private · async
  - chama: `mergeKnownLids` L1588
  - chamado por: `onConnectionUpdate` L733
- `mergeLidMessages(lid, phoneJid)` · L1565 · private · async
  - chamado por: `learnLid` L671, `mergeKnownLids` L1588
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L1588 · private · async
  - chama: `mergeLidMessages` L1565
  - chamado por: `warmLidCache` L1551
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1608 · private
  - chama: `contactToRecord` L153
  - chamado por: `connect` L495
- `recordGroupParticipants(md)` · L1615 · private
  - chamado por: `groupInfo` L1659, `listGroups` L1651
- `resolveParticipantNames(groups)` · L1629 · private · async
  - chama: `resolveParticipantPhone` L303
  - chamado por: `groupInfo` L1659, `listGroups` L1651
- `listGroups()` · L1651 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:382)
  - chama: `cacheGroupMeta` L444, `recordGroupParticipants` L1615, `resolveParticipantNames` L1629, `sk` L1509, `toGroupInfo` L351
- `groupInfo(jid)` · L1659 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:383)
  - chama: `cacheGroupMeta` L444, `recordGroupParticipants` L1615, `resolveParticipantNames` L1629, `sk` L1509, `toGroupInfo` L351, `toGroupJid` L395
- `createGroup(subject, participants)` · L1667 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:384)
  - chama: `resolveParticipants` L1542, `sk` L1509, `toGroupInfo` L351
- `updateParticipants(jid, action, participants)` · L1675 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:385)
  - chama: `resolveParticipants` L1542, `sk` L1509, `toGroupJid` L395
- `leaveGroup(jid)` · L1683 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:390)
  - chama: `sk` L1509, `toGroupJid` L395
- `setGroupSubject(jid, subject)` · L1686 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:391)
  - chama: `sk` L1509, `toGroupJid` L395
- `setGroupDescription(jid, description)` · L1689 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:392)
  - chama: `sk` L1509, `toGroupJid` L395
- `groupInviteCode(jid)` · L1692 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:393)
  - chama: `sk` L1509, `toGroupJid` L395
- `groupRevokeInvite(jid)` · L1695 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:394)
  - chama: `sk` L1509, `toGroupJid` L395
- `groupMembershipRequests(jid)` · L1701 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:397)
  - chama: `sk` L1509, `toGroupJid` L395
- `groupMembershipAction(jid, action, participants)` · L1713 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:398)
  - chama: `resolveParticipants` L1542, `sk` L1509, `toGroupJid` L395
- `setGroupSetting(jid, setting, enabled)` · L1735 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:404)
  - chama: `sk` L1509, `toGroupJid` L395
- `setGroupPhoto(jid, image, _mimetype)` · L1752 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:410)
  - chama: `sk` L1509, `toGroupJid` L395
- `checkNumbers(numbers)` · L1761 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:413)
  - chama: `sk` L1509
- `profilePicture(jid)` · L1776 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:414)
  - chama: `sk` L1509, `toContactJid` L398
- `setBlock(jid, action)` · L1785 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:415)
  - chama: `sk` L1509, `toContactJid` L398
- `saveContact(jid, input)` · L1788 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:417)
  - chama: `sk` L1509, `toContactJid` L398
- `removeContact(jid)` · L1801 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:419)
  - chama: `sk` L1509, `toContactJid` L398
- `createChannel(name, description)` · L1806 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:422)
  - chama: `sk` L1509, `toChannelInfo` L384
- `channelInfo(jid)` · L1813 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:423)
  - chama: `sk` L1509, `toChannelInfo` L384
- `followChannel(jid)` · L1817 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:424)
  - chama: `sk` L1509
- `unfollowChannel(jid)` · L1820 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:425)
  - chama: `sk` L1509
- `requestPairingCode(phoneNumber)` · L1824 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:326)
  - chama: `setStatus` L466
- `stop()` · L1832
  - implementa: `IEngine.stop` (engine.port.ts:316)
  - chama: `doStop` L1839, `serialize` L476
- `doStop()` · L1839 · private · async
  - chama: `clearReconnectTimer` L453, `detachSocketListeners` L1856, `setStatus` L466
  - chamado por: `stop` L1832
- `detachSocketListeners()` · L1856 · private
  - chamado por: `doLogout` L1900, `doStop` L1839, `onConnectionUpdate` L733, `shutdown` L1881
- `shutdown()` · L1881 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:324)
  - chama: `clearReconnectTimer` L453, `detachSocketListeners` L1856
- `logout()` · L1895
  - implementa: `IEngine.logout` (engine.port.ts:325)
  - chama: `doLogout` L1900, `serialize` L476
- `doLogout()` · L1900 · private · async
  - chama: `clearCredentials` L1923, `clearReconnectTimer` L453, `detachSocketListeners` L1856, `setStatus` L466
  - chamado por: `logout` L1895
- `clearCredentials()` · L1923 · private · async
  - chamado por: `doLogout` L1900, `onConnectionUpdate` L733
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L130 · async
  - chamado por: `connect` L495
- `contactToRecord(c, source)` · L153
  - chamado por: `onContacts` L1608
- `encodeProto(msg)` · L178
  - chamado por: `emitOutbound` L1226, `forwardTo` L1383, `handleIncomingMedia` L1009, `onMessagesUpsert` L849, `sendMedia` L1117, `sendText` L1085
- `decodeProto(value)` · L181
  - chamado por: `loadMessageForRetry` L1455, `prepareForward` L1313
- `mapBaileysReaction(key, reaction, ourJid)` · L199
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L226
  - chamado por: `onReactions` L628
- `phoneFirst(a, b)` · L226
  - chamado por: `groupSenderOf` L691, `mapBaileysReaction` L199
- `extOf(mimetype, fileName)` · L231
  - chamado por: `handleIncomingMedia` L1009, `sendMedia` L1117
- `mapAckStatus(status)` · L245
  - chamado por: `onMessagesUpdate` L943
- `buildMediaContent(input)` · L263
  - chamado por: `sendMedia` L1117
- `resolveParticipantPhone(p, lidToPn)` · L303
  - chamado por: `resolveParticipantNames` L1629, `toGroupInfo` L351
- `dirNameFor(p, phone, names)` · L337
  - chamado por: `toGroupInfo` L351
- `toGroupInfo(md, lidToPn, names)` · L351
  - chama: `dirNameFor` L337, `resolveParticipantPhone` L303
  - chamado por: `createGroup` L1667, `groupInfo` L1659, `listGroups` L1651
- `toChannelInfo(md)` · L384
  - chamado por: `channelInfo` L1813, `createChannel` L1806
- `toGroupJid(jid)` · L395
  - chamado por: `groupInfo` L1659, `groupInviteCode` L1692, `groupMembershipAction` L1713, `groupMembershipRequests` L1701, `groupRevokeInvite` L1695, `leaveGroup` L1683, `setGroupDescription` L1689, `setGroupPhoto` L1752, `setGroupSetting` L1735, `setGroupSubject` L1686, `updateParticipants` L1675
- `toContactJid(jid)` · L398
  - chamado por: `profilePicture` L1776, `removeContact` L1801, `saveContact` L1788, `setBlock` L1785
- `toJid(to)` · L1934
  - chamado por: `forwardTo` L1383, `markRead` L1287, `resolveJid` L1258, `sendPresence` L1263, `sendReaction` L1295

**Tipos**
- interface `BaileysEngineDeps` L72 · 12 propriedade(s)
- type `BaileysVersion` L121
- type `RawParticipant` L290
- type `RawGroup` L317
- type `RawNewsletter` L327

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:495)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:495)
  - banco: `waAuthKey.deleteMany`, `waAuthKey.findMany`, `waAuthKey.upsert`, `waSession.findUnique`, `waSession.update`

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:442), `WWebJSEngine.constructor` (wwebjs.engine.ts:415)
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
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1172), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1201), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
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
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2062), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2801)
- `FORWARDABLE_TYPES` = `new Set([ 'chat', 'image', 'video', 'ptv', 'audio', 'ptt', 'document'…` · L190
- `wwebjsForwardBlock(msg)` · L210
  - chamado por: `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)
- `serializedOf(k)` · L248
  - chamado por: `jidOf` L257, `mapWwebjsReaction` L285
- `jidOf(v)` · L257
  - chama: `serializedOf` L248
  - chamado por: `mapWwebjsReaction` L285, `wwebjsGroupSender` L269
- `wwebjsGroupSender(chatRaw, author, lidToPn)` · L269
  - chama: `jidOf` L257
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2062), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2801)
- `mapWwebjsReaction(r)` · L285
  - chama: `jidOf` L257, `serializedOf` L248
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:2330)

**Tipos**
- interface `WwebjsMessageLike` L17 · 15 propriedade(s)
- interface `WwebjsForwardLike` L204 · 2 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`

43 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`

- describe “fila e stream de mídia WWEBJS (P-060)” · L5
  - it “serializa operações e recusa fila cheia sem iniciar o terceiro download” · L6
  - it “recompõe blocos e destrói stream que ultrapassa o teto real” · L31

## `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`

72 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**class `SessionMediaQueue`** L5
- injeta (construtor): `maxPending: ?`
- `tail` · L6 · private · campo
- `pending` · L7 · private · campo
- `constructor(maxPending)` · L9
  - chamado por: `WWebJSEngine.mediaQueue` (wwebjs.engine.ts:385)
- `run(task)` · L11
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

**class `MediaDeadlineError`** L30 · `extends Error`
- injeta (construtor): `ms: number (param)`
- `constructor(ms)` · L31
  - chamado por: `mediaDeadline` L56

**Funções e constantes de topo**
- `collectMediaStream(stream, maxBytes)` · L36 · async
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146)
- `mediaDeadline(work, ms)` · L56 · async
  - chama: `constructor` L31
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

3220 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.lid-outbound.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts`, `modules/sessions/infrastructure/message-content.ts`, `shared-kernel/memory.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/wwebjs-version.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `WWebJSEngine`** L348 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L349 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `client` · L350 · private · campo
- `status` · L351 · private · campo
- `qrBase64` · L352 · private · campo
- `stopped` · L353 · private · campo
- `lidToPnCache` · L356 · private · campo
- `pnToLidOutbound` · L360 · private · campo
- `sentByPanel` · L363 · private · campo
- `forwardEchoes` · L365 · private · campo
  - chama: `ForwardEchoRegistry.constructor` (wwebjs.forward-echo.ts:51)
- `forwardEchoWaitMs` · L367 · private · campo
- `forwardEchoTtlMs` · L368 · private · campo
- `forwardEchoGraceMs` · L369 · private · campo
- `forwardOpTimeoutMs` · L370 · private · campo
- `anonProxyUrl` · L373 · private · campo
- `lifecycle` · L380 · private · campo
- `reconnectAttempts` · L382 · private · campo
- `pairingRenewals` · L383 · private · campo
- `pageHeals` · L384 · private · campo
- `mediaQueue` · L385 · private · campo
  - chama: `SessionMediaQueue.constructor` (wwebjs-media.ts:9)
- `autoDownloadGroupMedia` · L386 · private · campo
- `addressBookSynced` · L387 · private · campo
- `lastLoadingPct` · L392 · private · campo
- `logoutTimeoutMs` · L395 · private · campo
- `destroyTimeoutMs` · L399 · private · campo
- `generation` · L403 · private · campo
- `lastQrAt` · L405 · private · campo
- `qrHeals` · L407 · private · campo
- `qrWatchdogIntervalMs` · L409 · private · campo
- `qrStaleMs` · L410 · private · campo
- `initTimeoutMs` · L411 · private · campo
- `lastPairingCode` · L413 · private · campo
- `constructor(deps)` · L415
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `serialize(fn)` · L419 · private
  - chamado por: `doStart` L717, `handleDisconnect` L1300, `healWedgedPage` L2714, `logout` L1553, `qrWatchdogTick` L540, `start` L703, `stop` L1500
- `getStatus()` · L428
  - implementa: `IEngine.getStatus` (engine.port.ts:369)
- `getQrBase64()` · L431
  - implementa: `IEngine.getQrBase64` (engine.port.ts:365)
- `getPairingCode()` · L434
  - implementa: `IEngine.getPairingCode` (engine.port.ts:368)
- `setStatus(status, extra)` · L438 · private
  - chama: `startQrWatchdog` L525, `startSyncWatchdog` L597, `stopMemoryProfile` L476, `stopQrWatchdog` L535, `stopSyncWatchdog` L608
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2714, `qrWatchdogTick` L540, `requestPairingCode` L1590, `syncWatchdogTick` L615
- `startMemoryProfile(client)` · L462 · private
  - chama: `recordMemoryProfile` L481
  - chamado por: `doStart` L717
- `stopMemoryProfile()` · L476 · private
  - chamado por: `destroyWithTimeout` L1403, `setStatus` L438, `shutdown` L1528
- `recordMemoryProfile(client)` · L481 · private · async
  - chama: `chromiumTreePss` (memory.ts:43)
  - chamado por: `startMemoryProfile` L462
- `startQrWatchdog()` · L525 · private
  - chama: `qrWatchdogTick` L540
  - chamado por: `setStatus` L438
- `stopQrWatchdog()` · L535 · private
  - chamado por: `qrWatchdogTick` L540, `setStatus` L438
- `qrWatchdogTick()` · L540 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `doStart` L717, `serialize` L419, `setStatus` L438, `stopQrWatchdog` L535
  - chamado por: `startQrWatchdog` L525
- `watchdogFails` · L592 · private · campo
- `watchdogDegraded` · L593 · private · campo
- `WATCHDOG_INTERVAL_MS` · L594 · private · static · campo
- `WATCHDOG_FAILS_TO_DEGRADE` · L595 · private · static · campo
- `startSyncWatchdog()` · L597 · private
  - chama: `syncWatchdogTick` L615
  - chamado por: `setStatus` L438
- `stopSyncWatchdog()` · L608 · private
  - chamado por: `setStatus` L438, `shutdown` L1528
- `syncWatchdogTick()` · L615 · private · async
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `healWedgedPage` L2714, `setStatus` L438, `syncHint` L2699
  - chamado por: `startSyncWatchdog` L597
- `clearStaleSingletonLocks()` · L677 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStart` L717
- `purgeAuthDir(sessionId)` · L697 · static · async
  - chama: `authDirOf` L219
  - chamado por: `SessionManager.logout` (session-manager.service.ts:387), `SessionManager.newQr` (session-manager.service.ts:416), `SessionManager.remove` (session-manager.service.ts:437), `doLogout` L1558
- `start()` · L703
  - implementa: `IEngine.start` (engine.port.ts:315)
  - chama: `doStart` L717, `serialize` L419
- `doStart(attempt, forceLive)` · L717 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2), `buildAuthProxyUrl` L205, `raceStoreOp` L321, `userAgentFor` L134, `checkPinnedBuildAge` L1060, `clearStaleSingletonLocks` L677, `closeAnonProxy` L1385, `consumeCleanShutdownMarker` L1470, `destroyWithTimeout` L1403, `ensureWebVersionHtml` L1106, `handleDisconnect` L1300, `handleInitFailure` L1187, `mergeExistingLids` L2535, `onMessageAck` L2306, `onMessageCreate` L2062, `onReaction` L2330, `resolveWebVersion` L1140, `serialize` L419, `setStatus` L438, `startMemoryProfile` L462, `syncAddressBook` L2563
  - chamado por: `handleDisconnect` L1300, `handleInitFailure` L1187, `qrWatchdogTick` L540, `start` L703
- `checkPinnedBuildAge(version)` · L1060 · private · async
  - chama: `loadBuildCatalog` L225
  - chamado por: `doStart` L717
- `ensureWebVersionHtml(version)` · L1106 · private · async
  - chamado por: `doStart` L717
- `resolveWebVersion(mode, forceLive)` · L1140 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2)
  - chamado por: `doStart` L717
- `handleInitFailure(e, attempt, pinnedVersion)` · L1187 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `doStart` L717, `setStatus` L438
  - chamado por: `doStart` L717
- `handleDisconnect(reason)` · L1300 · private · async
  - chama: `raceStoreOp` L321, `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `doStart` L717, `serialize` L419, `setStatus` L438
  - chamado por: `doStart` L717
- `closeAnonProxy()` · L1385 · private · async
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2714, `qrWatchdogTick` L540, `shutdown` L1528
- `destroyWithTimeout()` · L1403 · private · async
  - chama: `stopMemoryProfile` L476, `chromiumProcessTree` (memory.ts:17)
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2714, `qrWatchdogTick` L540, `shutdown` L1528
- `markCleanShutdown()` · L1453 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStop` L1507, `shutdown` L1528
- `consumeCleanShutdownMarker()` · L1470 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStart` L717
- `stop()` · L1500
  - implementa: `IEngine.stop` (engine.port.ts:316)
  - chama: `doStop` L1507, `serialize` L419
- `doStop()` · L1507 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `setStatus` L438
  - chamado por: `stop` L1500
- `shutdown()` · L1528 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:324)
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `stopMemoryProfile` L476, `stopSyncWatchdog` L608
- `logout()` · L1553
  - implementa: `IEngine.logout` (engine.port.ts:325)
  - chama: `doLogout` L1558, `serialize` L419
- `doLogout()` · L1558 · private · async
  - chama: `raceStoreOp` L321, `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `purgeAuthDir` L697, `setStatus` L438
  - chamado por: `logout` L1553
- `requestPairingCode(phoneNumber)` · L1590 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:326)
  - chama: `req` L2607, `setStatus` L438
- `sendText(to, text, opts)` · L1603 · async
  - implementa: `IEngine.sendText` (engine.port.ts:327)
  - chama: `assertPageResponsive` L2672, `rememberPanel` L2344, `req` L2607, `toChatId` L2602, `toMentionIds` L2053, `withLidFallback` L2439
- `sendMedia(to, input)` · L1633 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:332)
  - chama: `PendingMediaSendError.constructor` (engine.port.ts:18), `mediaDeadline` (wwebjs-media.ts:56), `SessionMediaQueue.run` (wwebjs-media.ts:11), `sendMediaQueued` L1652
- `sendMediaQueued(to, input)` · L1652 · private · async
  - chama: `extOf` L156, `assertPageResponsive` L2672, `rememberPanel` L2344, `req` L2607, `toChatId` L2602, `toMentionIds` L2053, `withLidFallback` L2439
  - chamado por: `sendMedia` L1633
- `sendLocation(to, input)` · L1726 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:337)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2672, `emitOutbound` L1790, `rememberPanel` L2344, `req` L2607, `toChatId` L2602, `withLidFallback` L2439
- `sendPoll(to, input)` · L1760 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:341)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2672, `emitOutbound` L1790, `rememberPanel` L2344, `req` L2607, `toChatId` L2602, `withLidFallback` L2439
- `emitOutbound(keyId, jid, type, text, opts)` · L1790 · private
  - chamado por: `sendLocation` L1726, `sendPoll` L1760
- `setProfileStatus(status)` · L1812 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:347)
  - chama: `req` L2607
- `setProfileName(name)` · L1815 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:348)
  - chama: `req` L2607
- `setProfilePhoto(image, mimetype)` · L1818 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:349)
  - chama: `req` L2607
- `sendPresence(to, state)` · L1823 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:345)
  - chama: `req` L2607, `toChatId` L2602, `withLidFallback` L2439
- `markRead(chatJid, _msgId)` · L1841 · async
  - implementa: `IEngine.markRead` (engine.port.ts:351)
  - chama: `req` L2607, `toChatId` L2602, `withLidFallback` L2439
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1850 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:355)
  - chama: `req` L2607, `withStoreReady` L2624
- `prepareForward(src)` · L1863 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:364)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:288), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2672, `forwardTo` L1900, `req` L2607, `withStoreReady` L2624
- `forwardTo(msg, type, text, src, to, opts)` · L1900 · private · async
  - chama: `assertPageResponsive` L2672, `req` L2607, `toChatId` L2602, `withLidFallback` L2439, `ForwardEchoRegistry.expect` (wwebjs.forward-echo.ts:60)
  - chamado por: `prepareForward` L1863
- `matchForwardEcho(msg, d, keyId)` · L1988 · private
  - chama: `ForwardEchoRegistry.match` (wwebjs.forward-echo.ts:103)
  - chamado por: `onMessageCreate` L2062
- `emitForwardEcho(msg, d, keyId, echo)` · L2008 · private
  - chama: `handleIncomingMedia` L2146, `rememberPanel` L2344
  - chamado por: `onMessageCreate` L2062
- `toMentionIds(mentions)` · L2053 · private
  - chama: `toChatId` L2602
  - chamado por: `sendMediaQueued` L1652, `sendText` L1603
- `onMessageCreate(msg)` · L2062 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L171, `emitForwardEcho` L2008, `handleIncomingMedia` L2146, `matchForwardEcho` L1988, `resolveNumberJid` L2355
  - chamado por: `doStart` L717
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L2146 · private · async
  - chama: `collectMediaStream` (wwebjs-media.ts:36), `mediaDeadline` (wwebjs-media.ts:56), `SessionMediaQueue.run` (wwebjs-media.ts:11), `extOf` L156, `isPageCrashError` L110, `mapInboundMediaType` L171, `healWedgedPage` L2714
  - chamado por: `emitForwardEcho` L2008, `onMessageCreate` L2062
- `mapAck(ack)` · L2292 · private
  - chamado por: `onMessageAck` L2306
- `onMessageAck(msg, ack)` · L2306 · private
  - chama: `mapAck` L2292
  - chamado por: `doStart` L717
- `onReaction(r)` · L2330 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:285), `resolveNumberJid` L2355
  - chamado por: `doStart` L717
- `rememberPanel(keyId)` · L2344 · private
  - chamado por: `emitForwardEcho` L2008, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendText` L1603
- `resolveNumberJid(rawId)` · L2355 · private · async
  - chama: `cacheLidPn` L2376, `mergeLidMessages` L2511, `resolveLidToPhone` L2387
  - chamado por: `mergeExistingLids` L2535, `onMessageCreate` L2062, `onReaction` L2330, `toHistoryMessage` L2801
- `cacheLidPn(lid, phoneJid)` · L2376 · private
  - chamado por: `rememberOutboundLid` L2488, `resolveNumberJid` L2355, `resolvePendingLids` L2992
- `resolveLidToPhone(lid)` · L2387 · private · async
  - chamado por: `resolveNumberJid` L2355, `resolvePendingLids` L2992
- `withLidFallback(pnJid, op)` · L2439 · private · async
  - chama: `rememberOutboundLid` L2488, `resolvePhoneToLid` L2463, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `forwardTo` L1900, `markRead` L1841, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendText` L1603
- `resolvePhoneToLid(phoneJid)` · L2463 · private · async
  - chamado por: `withLidFallback` L2439
- `rememberOutboundLid(pnJid, lid)` · L2488 · private
  - chama: `cacheLidPn` L2376
  - chamado por: `withLidFallback` L2439
- `mergeLidMessages(lid, phoneJid)` · L2511 · private · async
  - chamado por: `resolveNumberJid` L2355
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2535 · private · async
  - chama: `resolveNumberJid` L2355
  - chamado por: `doStart` L717
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2563 · private · async
  - chama: `req` L2607, `withStoreReady` L2624
  - chamado por: `doStart` L717
- `toChatId(to)` · L2602 · private
  - chamado por: `createGroup` L3028, `fetchChatHistory` L2783, `forwardTo` L1900, `groupMembershipAction` L3098, `markRead` L1841, `profilePicture` L3146, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendText` L1603, `setBlock` L3157, `setChatFlag` L2838, `toMentionIds` L2053, `updateParticipants` L3043
- `req()` · L2607 · private
  - chamado por: `channelInfo` L3199, `checkNumbers` L3135, `createChannel` L3181, `createGroup` L3028, `fetchChatHistory` L2783, `followChannel` L3212, `forwardTo` L1900, `getGroupChat` L2885, `listChats` L2763, `listGroups` L2866, `markRead` L1841, `prepareForward` L1863, `profilePicture` L3146, `removeContact` L3176, `requestPairingCode` L1590, `resolvePendingLids` L2992, `saveContact` L3165, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendReaction` L1850, `sendText` L1603, `setBlock` L3157, `setChatFlag` L2838, `setProfileName` L1815, `setProfilePhoto` L1818, `setProfileStatus` L1812, `syncAddressBook` L2563, `unfollowChannel` L3216
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2624 · private · async
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `assertPageResponsive` L2672, `healWedgedPage` L2714, `syncHint` L2699
  - chamado por: `channelInfo` L3199, `checkNumbers` L3135, `createChannel` L3181, `createGroup` L3028, `fetchChatHistory` L2783, `followChannel` L3212, `getGroupChat` L2885, `listChats` L2763, `listGroups` L2866, `prepareForward` L1863, `profilePicture` L3146, `removeContact` L3176, `saveContact` L3165, `sendReaction` L1850, `setBlock` L3157, `setChatFlag` L2838, `syncAddressBook` L2563, `unfollowChannel` L3216
- `assertPageResponsive(probeTimeoutMs)` · L2672 · private · async
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `healWedgedPage` L2714, `syncHint` L2699
  - chamado por: `forwardTo` L1900, `prepareForward` L1863, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendText` L1603, `withStoreReady` L2624
- `syncHint()` · L2699 · private
  - chamado por: `assertPageResponsive` L2672, `syncWatchdogTick` L615, `withStoreReady` L2624
- `lastHealAt` · L2710 · private · campo
- `healing` · L2711 · private · campo
- `HEAL_COOLDOWN_MS` · L2712 · private · static · campo
- `healWedgedPage()` · L2714 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `serialize` L419, `setStatus` L438
  - chamado por: `assertPageResponsive` L2672, `handleIncomingMedia` L2146, `syncWatchdogTick` L615, `withStoreReady` L2624
- `listChats(limit)` · L2763 · async
  - implementa: `IEngine.listChats` (engine.port.ts:374)
  - chama: `req` L2607, `withStoreReady` L2624
- `fetchChatHistory(chatJid, limit)` · L2783 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:375)
  - chama: `req` L2607, `toChatId` L2602, `toHistoryMessage` L2801, `withStoreReady` L2624
- `toHistoryMessage(msg)` · L2801 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L171, `resolveNumberJid` L2355
  - chamado por: `fetchChatHistory` L2783
- `setChatFlag(chatJid, flag, enabled)` · L2838 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:379)
  - chama: `req` L2607, `toChatId` L2602, `withStoreReady` L2624
- `listGroups()` · L2866 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:382)
  - chama: `groupFlags` L190, `req` L2607, `withStoreReady` L2624
- `getGroupChat(jid)` · L2885 · private · async
  - chama: `req` L2607, `toGroupId` L3024, `withStoreReady` L2624
  - chamado por: `groupInfo` L2894, `groupInviteCode` L3068, `groupMembershipAction` L3098, `groupMembershipRequests` L3080, `groupRevokeInvite` L3072, `leaveGroup` L3056, `setGroupDescription` L3064, `setGroupPhoto` L3124, `setGroupSetting` L3113, `setGroupSubject` L3060, `updateParticipants` L3043
- `groupInfo(jid)` · L2894 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:383)
  - chama: `groupFlags` L190, `getGroupChat` L2885, `resolveParticipantsBatch` L2922
  - chamado por: `createGroup` L3028
- `LID_BATCH` · L2911 · private · static · campo
- `resolveParticipantsBatch(list)` · L2922 · private · async
  - chama: `resolvePendingLids` L2992
  - chamado por: `groupInfo` L2894
- `resolvePendingLids(rows)` · L2992 · private · async
  - chama: `cacheLidPn` L2376, `req` L2607, `resolveLidToPhone` L2387
  - chamado por: `resolveParticipantsBatch` L2922
- `toGroupId(jid)` · L3024 · private
  - chamado por: `getGroupChat` L2885
- `createGroup(subject, participants)` · L3028 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:384)
  - chama: `groupInfo` L2894, `req` L2607, `toChatId` L2602, `withStoreReady` L2624
- `updateParticipants(jid, action, participants)` · L3043 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:385)
  - chama: `getGroupChat` L2885, `toChatId` L2602
- `leaveGroup(jid)` · L3056 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:390)
  - chama: `getGroupChat` L2885
- `setGroupSubject(jid, subject)` · L3060 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:391)
  - chama: `getGroupChat` L2885
- `setGroupDescription(jid, description)` · L3064 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:392)
  - chama: `getGroupChat` L2885
- `groupInviteCode(jid)` · L3068 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:393)
  - chama: `getGroupChat` L2885
- `groupRevokeInvite(jid)` · L3072 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:394)
  - chama: `getGroupChat` L2885
- `groupMembershipRequests(jid)` · L3080 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:397)
  - chama: `getGroupChat` L2885
- `groupMembershipAction(jid, action, participants)` · L3098 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:398)
  - chama: `getGroupChat` L2885, `toChatId` L2602
- `setGroupSetting(jid, setting, enabled)` · L3113 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:404)
  - chama: `getGroupChat` L2885
- `setGroupPhoto(jid, image, mimetype)` · L3124 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:410)
  - chama: `getGroupChat` L2885
- `checkNumbers(numbers)` · L3135 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:413)
  - chama: `req` L2607, `withStoreReady` L2624
- `profilePicture(jid)` · L3146 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:414)
  - chama: `req` L2607, `toChatId` L2602, `withStoreReady` L2624
- `setBlock(jid, action)` · L3157 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:415)
  - chama: `req` L2607, `toChatId` L2602, `withStoreReady` L2624
- `saveContact(jid, input)` · L3165 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:417)
  - chama: `req` L2607, `withStoreReady` L2624
- `removeContact(jid)` · L3176 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:419)
  - chama: `req` L2607, `withStoreReady` L2624
- `createChannel(name, description)` · L3181 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:422)
  - chama: `req` L2607, `withStoreReady` L2624
- `channelInfo(jid)` · L3199 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:423)
  - chama: `req` L2607, `withStoreReady` L2624
- `followChannel(jid)` · L3212 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:424)
  - chama: `req` L2607, `withStoreReady` L2624
- `unfollowChannel(jid)` · L3216 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:425)
  - chama: `req` L2607, `withStoreReady` L2624

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L106
- `isPageCrashError(message)` · L110
  - chamado por: `assertPageResponsive` L2672, `handleIncomingMedia` L2146, `syncWatchdogTick` L615, `withStoreReady` L2624
- `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` = `Number(process.env.WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES) || 24 * 1024 * 10…` · L118
  - env: `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`
- `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` = `/^(true|1|yes|on)$/i.test( process.env.WWEBJS_AUTO_DOWNLOAD_GROUP_MED…` · L123
  - env: `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA`
- `userAgentFor(sessionId)` · L134
  - chamado por: `doStart` L717
  - env: `WWEBJS_USER_AGENT`
- `extOf(mimetype, fileName)` · L156
  - chamado por: `handleIncomingMedia` L2146, `sendMediaQueued` L1652
- `mapInboundMediaType(t)` · L171
  - chamado por: `handleIncomingMedia` L2146, `onMessageCreate` L2062, `toHistoryMessage` L2801
- `groupFlags(g)` · L190
  - chamado por: `groupInfo` L2894, `listGroups` L2866
- `buildAuthProxyUrl(server, username, password)` · L205
  - chamado por: `doStart` L717
- `authDirOf(sessionId)` · L219
  - chamado por: `clearStaleSingletonLocks` L677, `consumeCleanShutdownMarker` L1470, `markCleanShutdown` L1453, `purgeAuthDir` L697
- `loadBuildCatalog()` · L225 · async
  - chamado por: `checkPinnedBuildAge` L1060
- `WWEBJS_MSG_ID` = `/^(true|false)_[^_]+_[^_]+(_[^_]+)?$/` · L276
- `INIT_TIMEOUT_MS` = `Number(process.env.WWEBJS_INIT_TIMEOUT_MS) || 240_000` · L287
  - env: `WWEBJS_INIT_TIMEOUT_MS`
- `CLEAN_SHUTDOWN_MARKER` = `'.gateway-clean-shutdown'` · L315
- `raceStoreOp(op, ms, timeoutMsg)` · L321 · async
  - chamado por: `assertPageResponsive` L2672, `doLogout` L1558, `doStart` L717, `handleDisconnect` L1300, `syncWatchdogTick` L615, `withStoreReady` L2624

**Tipos**
- interface `BuildCatalogEntry` L298 · 3 propriedade(s)
- interface `BuildCatalog` L303 · 3 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`

136 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.forward-echo.ts`
- importado por: `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`

**class `ForwardEchoRegistry`** L48
- injeta (construtor): `now: () => number`
- `pending` · L49 · private · campo
- `constructor(now)` · L51
  - chamado por: `WWebJSEngine.forwardEchoes` (wwebjs.engine.ts:365)
- `size()` · L53 · getter
- `expect(input, ttlMs)` · L60
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.forwardTo` (wwebjs.engine.ts:1900)
- `match(tos, type, text, keyId, fwd)` · L103
  - chama: `sweep` L126
  - chamado por: `WWebJSEngine.matchForwardEcho` (wwebjs.engine.ts:1988)
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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:2439)
- `pageResolvePnToLid(pnJid)` · L92

**Tipos**
- interface `LidFallbackDeps` L29 · 5 propriedade(s)

## `modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

340 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.lifecycle.spec.ts`

- describe “WWebJSEngine — ciclo de vida com teto (WA-08/WA-09/P-025)” · L109
  - it “initialize pendurado: 1 retentativa, depois FAILED com motivo — e o mutex fica livre” · L118
  - it “callbacks do client antigo (geração morta) não mexem no status da sessão” · L140
  - it “QR emitido vira SCAN_QR_CODE; QR sem renovação dispara a recuperação (destroy + start)” · L162
  - it “ready → WORKING zera a fase de QR (watchdog de QR parado não dispara)” · L191
  - it “sem requireProxy, inicia com fake sem subir Chromium (P-073)” · L210
  - it “override da sessão escolhe a build do canário no próximo start” · L223
  - it “override inválido não alcança o cache nem cria cliente” · L249
  - it “limita renovação do código e recargas de página por ciclo” · L286
  - it “pairing code: fica disponível em getPairingCode() e some ao parar (WA-18)” · L319

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

416 linhas · caminho: `apps/gateway/src/modules/sessions/interface/sessions.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/license.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/interface/dto.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `SessionsController`** L86 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions')
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `manager: SessionManager` · `license: LicenseService` · `guardrail: GuardrailService` · `sessionConfig: SessionConfigService` · `proxies: ProxyService`
- `constructor(repo, manager, license, guardrail, sessionConfig, proxies)` · L89
- `create(body)` · L98 · async · @Post · @MinRole('ADMIN')
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:232), `ProxyService.ensureAvailable` (proxy.service.ts:218), `SessionManager.start` (session-manager.service.ts:304), `SessionRepository.create` (session.repository.ts:19), `SessionRepository.delete` (session.repository.ts:30), `SessionRepository.findById` (session.repository.ts:20), `SessionRepository.findByName` (session.repository.ts:21), `SessionRepository.list` (session.repository.ts:22), `toDto` L45, `newId` (ulid.ts:4)
- `list(state)` · L155 · async · @Get
  - chama: `GuardrailService.statesFor` (guardrail.service.ts:495), `SessionRepository.list` (session.repository.ts:22), `toDto` L45
- `get(id)` · L175 · async · @Get(':id')
  - chama: `ensure` L410, `toDto` L45
- `health(id)` · L181 · async · @Get(':id/health')
  - chama: `GuardrailService.health` (guardrail.service.ts:473), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20)
- `getConfig(id)` · L190 · async · @Get(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:203), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20), `configDto` L62
- `patchConfig(id, body)` · L197 · async · @Patch(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:203), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.update` (session-config.service.ts:28), `configDto` L62
- `presence(id, body)` · L214 · async · @Post(':id/presence')
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:513)
- `profileStatus(id, body)` · L230 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:521)
- `profileName(id, body)` · L249 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:524)
- `profilePhoto(id, body)` · L269 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:527), `fetchImageByUrl` (safe-fetch.ts:204)
- `quarantine(id)` · L297 · @Post(':id/quarantine')
  - chama: `override` L317
- `warmup(id)` · L302 · @Post(':id/warmup')
  - chama: `override` L317
- `activate(id)` · L307 · @Post(':id/activate')
  - chama: `override` L317
- `pause(id)` · L312 · @Post(':id/pause')
  - chama: `override` L317
- `override(id, action)` · L317 · private · async
  - chama: `GuardrailService.setManualState` (guardrail.service.ts:457)
  - chamado por: `activate` L307, `pause` L312, `quarantine` L297, `warmup` L302
- `start(id)` · L322 · async · @Post(':id/start')
  - chama: `SessionManager.start` (session-manager.service.ts:304), `ensure` L410
- `stop(id)` · L329 · async · @Post(':id/stop')
  - chama: `SessionManager.stop` (session-manager.service.ts:377), `ensure` L410
- `restart(id)` · L336 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:381), `ensure` L410
- `logout(id)` · L343 · async · @Post(':id/logout')
  - chama: `SessionManager.logout` (session-manager.service.ts:387), `ensure` L410
- `remove(id)` · L350 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `SessionManager.remove` (session-manager.service.ts:437), `ensure` L410
- `qr(id)` · L358 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:456), `SessionManager.getQr` (session-manager.service.ts:452), `ensure` L410
- `newQr(id)` · L374 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:416), `ensure` L410
- `pairingCode(id, body)` · L381 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:460), `ensure` L410
- `ensure(id)` · L410 · private · async
  - chama: `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `get` L175, `logout` L343, `newQr` L374, `pairingCode` L381, `qr` L358, `remove` L350, `restart` L336, `start` L322, `stop` L329

**Funções e constantes de topo**
- `toDto(s)` · L45
  - chamado por: `create` L98, `get` L175, `list` L155
- `configDto(c)` · L62
  - chamado por: `getConfig` L190, `patchConfig` L197

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
