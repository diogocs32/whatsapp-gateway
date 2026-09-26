<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 435 |
| `modules/sessions/application/session-config.service.ts` | 65 |
| `modules/sessions/application/session-manager.service.ts` | 754 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 18 |
| `modules/sessions/domain/session.repository.ts` | 35 |
| `modules/sessions/domain/wwebjs-version.spec.ts` | 48 |
| `modules/sessions/domain/wwebjs-version.ts` | 10 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 548 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 2100 |
| `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts` | 1354 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 812 |
| `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts` | 138 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/baileys/upsert-decision.spec.ts` | 58 |
| `modules/sessions/infrastructure/baileys/upsert-decision.ts` | 36 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 123 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.spec.ts` | 278 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts` | 308 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.spec.ts` | 63 |
| `modules/sessions/infrastructure/wwebjs/wwebjs-media.ts` | 75 |
| `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts` | 3226 |
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

435 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `PendingMediaSendError`** L21 · `extends Error`
- injeta (construtor): `completion: Promise<{ keyId: string; jid: string }>`
- `constructor(completion)` · L22
  - chamado por: `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

**class `ForwardSourceError`** L295 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L296
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1476), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)

**class `UnsupportedEngineOperationError`** L312 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L313
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1684), `BaileysEngine.listChats` (baileys.engine.ts:1679), `BaileysEngine.setChatFlag` (baileys.engine.ts:1695)

**Funções e constantes de topo**
- `MAX_FORWARD_TARGETS` = `5` · L250
- `FREQUENTLY_FORWARDED_MIN` = `5` · L251

**Tipos**
- interface `SessionStatePayload` L7 · 4 propriedade(s)
- type `MessageSource` L17
- interface `MessagePayload` L29 · 19 propriedade(s)
- type `AckStatus` L67
- type `MessageAckPayload` L69
- interface `ReactionPayload` L72 · 6 propriedade(s)
- type `EngineEventName` L81
- type `EngineEventHandler` L83
- type `GuardrailEventName` L90
- interface `ReachoutRestrictionSignal` L103 · 4 propriedade(s)
- type `WaEventName` L111
- interface `WaEventEnvelope` L114 · 7 propriedade(s)
- type `MediaSendType` L124
- interface `SendOptions` L129 · 3 propriedade(s)
- interface `SendMediaInput` L137 · 6 propriedade(s)
- interface `SendLocationInput` L147 · 4 propriedade(s)
- interface `SendPollInput` L153 · 3 propriedade(s)
- type `GroupParticipantRole` L160
- type `GroupParticipantAction` L161
- interface `GroupParticipantInfo` L163 · 4 propriedade(s)
- interface `GroupInfo` L169 · 8 propriedade(s)
- interface `ContactCheck` L179 · 3 propriedade(s)
- interface `MembershipRequest` L187 · 3 propriedade(s)
- type `GroupSettingKey` L194
- type `MembershipAction` L195
- interface `SaveContactInput` L200 · 3 propriedade(s)
- interface `ChannelInfo` L205 · 4 propriedade(s)
- interface `ChatSummary` L214 · 6 propriedade(s)
- type `ChatFlag` L225
- interface `HistoryMessage` L229 · 13 propriedade(s)
- interface `ForwardSource` L256 · 12 propriedade(s)
- interface `SendResult` L273 · 5 propriedade(s)
- interface `PreparedForward` L284 · 1 propriedade(s)
  - `PreparedForward.send(to, opts)` · L286
    - chamado por: `ForwardService.sendOne` (forward.service.ts:402), `SessionManager.prepareForward` (session-manager.service.ts:588)
- type `ForwardErrorCode` L293
- type `PresenceState` L306
- interface `IEngine` L319 · 1 propriedade(s)
  - `IEngine.start()` · L323
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:523), `WWebJSEngine.start` (wwebjs.engine.ts:703)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:475), `SessionManager.start` (session-manager.service.ts:319)
  - `IEngine.stop()` · L324
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:1995), `WWebJSEngine.stop` (wwebjs.engine.ts:1500)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:293), `SessionManager.newQr` (session-manager.service.ts:431), `SessionManager.onModuleDestroy` (session-manager.service.ts:100), `SessionManager.remove` (session-manager.service.ts:452), `SessionManager.stop` (session-manager.service.ts:392)
  - `IEngine.shutdown()` · L332
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:2042), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1528)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:100)
  - `IEngine.logout()` · L333
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:2056), `WWebJSEngine.logout` (wwebjs.engine.ts:1553)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:402)
  - `IEngine.requestPairingCode(phoneNumber)` · L334
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:1987), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1590)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:475)
  - `IEngine.sendText(to, text, opts)` · L335
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1247), `WWebJSEngine.sendText` (wwebjs.engine.ts:1603)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:490)
  - `IEngine.sendMedia(to, input)` · L340
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1280), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:500)
  - `IEngine.sendLocation(to, input)` · L345
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1335), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:508)
  - `IEngine.sendPoll(to, input)` · L349
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1364), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:516)
  - `IEngine.sendPresence(to, state)` · L353
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1426), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1823)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:524)
  - `IEngine.setProfileStatus(status)` · L355
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1436), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1812)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:532)
  - `IEngine.setProfileName(name)` · L356
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1439), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1815)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:535)
  - `IEngine.setProfilePhoto(image, mimetype)` · L357
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1442), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1818)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:538)
  - `IEngine.markRead(chatJid, msgId)` · L359
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1450), `WWebJSEngine.markRead` (wwebjs.engine.ts:1841)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:546)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L363
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1458), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1850)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:570)
  - `IEngine.prepareForward(src)` · L372
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1476), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:588)
  - `IEngine.getQrBase64()` · L373
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:500), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:431)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:467)
  - `IEngine.getPairingCode()` · L376
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:434)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:471)
  - `IEngine.getStatus()` · L377
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:496), `WWebJSEngine.getStatus` (wwebjs.engine.ts:428)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:475), `SessionManager.working` (session-manager.service.ts:618)
  - `IEngine.listChats(limit)` · L382
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:1679), `WWebJSEngine.listChats` (wwebjs.engine.ts:2769)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:551)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L383
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:1684), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2789)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:554)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L387
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:1695), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2844)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:561)
  - `IEngine.listGroups()` · L390
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:1814), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2872)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:628)
  - `IEngine.groupInfo(jid)` · L391
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:1822), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2900)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:631)
  - `IEngine.createGroup(subject, participants)` · L392
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:1830), `WWebJSEngine.createGroup` (wwebjs.engine.ts:3034)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:634)
  - `IEngine.updateParticipants(jid, action, participants)` · L393
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:1838), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:3049)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:641)
  - `IEngine.leaveGroup(jid)` · L398
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:1846), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:3062)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:653)
  - `IEngine.setGroupSubject(jid, subject)` · L399
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:1849), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:3066)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:656)
  - `IEngine.setGroupDescription(jid, description)` · L400
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:1852), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:3070)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:663)
  - `IEngine.groupInviteCode(jid)` · L401
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:1855), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:3074)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:670)
  - `IEngine.groupRevokeInvite(jid)` · L402
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:1858), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:3078)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:673)
  - `IEngine.groupMembershipRequests(jid)` · L405
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:1864), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:3086)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:676)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L406
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:1876), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:3104)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:682)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L412
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:1898), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:3119)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:694)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L418
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:1915), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:3130)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:702)
  - `IEngine.checkNumbers(numbers)` · L421
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:1924), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:3141)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:712)
  - `IEngine.profilePicture(jid)` · L422
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:1939), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:3152)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:715)
  - `IEngine.setBlock(jid, action)` · L423
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:1948), `WWebJSEngine.setBlock` (wwebjs.engine.ts:3163)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:718)
  - `IEngine.saveContact(jid, input)` · L425
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:1951), `WWebJSEngine.saveContact` (wwebjs.engine.ts:3171)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:725)
  - `IEngine.removeContact(jid)` · L427
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:1964), `WWebJSEngine.removeContact` (wwebjs.engine.ts:3182)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:732)
  - `IEngine.createChannel(name, description)` · L430
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:1969), `WWebJSEngine.createChannel` (wwebjs.engine.ts:3187)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:737)
  - `IEngine.channelInfo(jid)` · L431
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:1976), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:3205)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:744)
  - `IEngine.followChannel(jid)` · L432
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:1980), `WWebJSEngine.followChannel` (wwebjs.engine.ts:3218)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:747)
  - `IEngine.unfollowChannel(jid)` · L433
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:1983), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:3222)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:750)

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

754 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionManager`** L52 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory` · `guardrail: GuardrailService`
- `logger` · L54 · private · campo
- `engines` · L55 · private · campo
- `names` · L56 · private · campo
- `lastStatusKey` · L60 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L62
- `onApplicationBootstrap()` · L74 · async
  - chama: `start` L319, `SessionRepository.findAutostart` (session.repository.ts:31)
- `onModuleDestroy()` · L100 · async
  - chama: `IEngine.shutdown` (engine.port.ts:332), `IEngine.stop` (engine.port.ts:324)
- `getOrCreateEngine(sessionId, engineType)` · L141 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `GuardrailService.recordReachoutRestriction` (guardrail.service.ts:456), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:101), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:142), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:124), `handleEngineEvent` L214, `EngineFactory.create` (engine.factory.ts:11)
  - chamado por: `requestPairingCode` L475, `start` L319
  - banco: `sessionConfig.findUnique`
- `handleEngineEvent(sessionId, name, payload)` · L214 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `persistStatus` L269, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L141
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p)` · L269 · private · async
  - chama: `discardOrphan` L293, `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `handleEngineEvent` L214
- `discarding` · L290 · private · campo
- `discardOrphan(sessionId)` · L293 · private · async
  - chama: `IEngine.stop` (engine.port.ts:324)
  - chamado por: `persistStatus` L269
- `START_TIMEOUT_MS` · L317 · private · static · campo
- `start(sessionId)` · L319 · async
  - chama: `IEngine.start` (engine.port.ts:323), `getOrCreateEngine` L141, `startWithTimeout` L330, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `newQr` L431, `onApplicationBootstrap` L74, `restart` L396, `SessionsController.create` (sessions.controller.ts:98), `SessionsController.start` (sessions.controller.ts:322)
- `startWithTimeout(sessionId, op)` · L330 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:25)
  - chamado por: `requestPairingCode` L475, `start` L319
- `withTimeout(op, ms)` · L370 · private · async
  - chamado por: `logout` L402, `newQr` L431, `remove` L452, `stop` L392
- `stop(sessionId)` · L392 · async
  - chama: `IEngine.stop` (engine.port.ts:324), `withTimeout` L370
  - chamado por: `restart` L396, `SessionsController.stop` (sessions.controller.ts:329)
- `restart(sessionId)` · L396 · async
  - chama: `start` L319, `stop` L392
  - chamado por: `SessionsController.restart` (sessions.controller.ts:336)
- `logout(sessionId)` · L402 · async
  - chama: `IEngine.logout` (engine.port.ts:333), `withTimeout` L370, `SessionRepository.updateStatus` (session.repository.ts:25), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:343)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L431 · async
  - chama: `IEngine.stop` (engine.port.ts:324), `start` L319, `withTimeout` L370, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:374)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L452 · async
  - chama: `IEngine.stop` (engine.port.ts:324), `withTimeout` L370, `SessionRepository.delete` (session.repository.ts:30), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:350)
- `getQr(sessionId)` · L467
  - chama: `IEngine.getQrBase64` (engine.port.ts:373)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:358)
- `getPairingCode(sessionId)` · L471
  - chama: `IEngine.getPairingCode` (engine.port.ts:376)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:358)
- `requestPairingCode(sessionId, phoneNumber)` · L475 · async
  - chama: `IEngine.getStatus` (engine.port.ts:377), `IEngine.requestPairingCode` (engine.port.ts:334), `IEngine.start` (engine.port.ts:323), `getOrCreateEngine` L141, `startWithTimeout` L330, `SessionRepository.findById` (session.repository.ts:20)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:381)
- `sendText(sessionId, to, text, opts)` · L490 · async
  - chama: `IEngine.sendText` (engine.port.ts:335), `sending` L609
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `MessagesController.sendText` (messages.controller.ts:616)
- `sendMedia(sessionId, to, input)` · L500 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:340), `sending` L609
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `MessagesController.sendMedia` (messages.controller.ts:645), `MessagesController.sendMediaUrl` (messages.controller.ts:715)
- `sendLocation(sessionId, to, input)` · L508 · async
  - chama: `IEngine.sendLocation` (engine.port.ts:345), `sending` L609
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:787)
- `sendPoll(sessionId, to, input)` · L516 · async
  - chama: `IEngine.sendPoll` (engine.port.ts:349), `sending` L609
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:826)
- `sendPresence(sessionId, to, state)` · L524
  - chama: `IEngine.sendPresence` (engine.port.ts:353), `working` L618
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `SessionsController.presence` (sessions.controller.ts:214)
- `setProfileStatus(sessionId, status)` · L532
  - chama: `IEngine.setProfileStatus` (engine.port.ts:355), `working` L618
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:230)
- `setProfileName(sessionId, name)` · L535
  - chama: `IEngine.setProfileName` (engine.port.ts:356), `working` L618
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:249)
- `setProfilePhoto(sessionId, image, mimetype)` · L538
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:357), `working` L618
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:269)
- `markRead(sessionId, chatJid, msgId)` · L546
  - chama: `IEngine.markRead` (engine.port.ts:359), `working` L618
  - chamado por: `MessagesController.markRead` (messages.controller.ts:484)
- `listChats(sessionId, limit)` · L551
  - chama: `IEngine.listChats` (engine.port.ts:382), `working` L618
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L554
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:383), `working` L618
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L561
  - chama: `IEngine.setChatFlag` (engine.port.ts:387), `working` L618
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:410)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L570 · async
  - chama: `IEngine.sendReaction` (engine.port.ts:363), `sending` L609
  - chamado por: `MessagesController.reaction` (messages.controller.ts:496)
- `prepareForward(sessionId, src)` · L588 · async
  - chama: `IEngine.prepareForward` (engine.port.ts:372), `PreparedForward.send` (engine.port.ts:286), `sending` L609, `working` L618
  - chamado por: `ForwardService.runReserved` (forward.service.ts:170)
- `sending(sessionId)` · L609 · private · async
  - chama: `GuardrailService.canSendMessage` (guardrail.service.ts:438), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6), `working` L618
  - chamado por: `prepareForward` L588, `sendLocation` L508, `sendMedia` L500, `sendPoll` L516, `sendReaction` L570, `sendText` L490
- `working(sessionId)` · L618 · private
  - chama: `IEngine.getStatus` (engine.port.ts:377)
  - chamado por: `channelInfo` L744, `checkNumbers` L712, `createChannel` L737, `createGroup` L634, `fetchChatHistory` L554, `followChannel` L747, `groupInfo` L631, `groupInviteCode` L670, `groupMembershipAction` L682, `groupMembershipRequests` L676, `groupRevokeInvite` L673, `leaveGroup` L653, `listChats` L551, `listGroups` L628, `markRead` L546, `prepareForward` L588, `profilePicture` L715, `removeContact` L732, `saveContact` L725, `sending` L609, `sendPresence` L524, `setBlock` L718, `setChatFlag` L561, `setGroupDescription` L663, `setGroupPhoto` L702, `setGroupSetting` L694, `setGroupSubject` L656, `setProfileName` L535, `setProfilePhoto` L538, `setProfileStatus` L532, `unfollowChannel` L750, `updateParticipants` L641
- `listGroups(sessionId)` · L628
  - chama: `IEngine.listGroups` (engine.port.ts:390), `working` L618
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L631
  - chama: `IEngine.groupInfo` (engine.port.ts:391), `working` L618
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L634
  - chama: `IEngine.createGroup` (engine.port.ts:392), `working` L618
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L641
  - chama: `IEngine.updateParticipants` (engine.port.ts:393), `working` L618
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L653
  - chama: `IEngine.leaveGroup` (engine.port.ts:398), `working` L618
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L656
  - chama: `IEngine.setGroupSubject` (engine.port.ts:399), `working` L618
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L663
  - chama: `IEngine.setGroupDescription` (engine.port.ts:400), `working` L618
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L670
  - chama: `IEngine.groupInviteCode` (engine.port.ts:401), `working` L618
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L673
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:402), `working` L618
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L676
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:405), `working` L618
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L682
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:406), `working` L618
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L694
  - chama: `IEngine.setGroupSetting` (engine.port.ts:412), `working` L618
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L702
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:418), `working` L618
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L712
  - chama: `IEngine.checkNumbers` (engine.port.ts:421), `working` L618
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L715
  - chama: `IEngine.profilePicture` (engine.port.ts:422), `working` L618
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L718
  - chama: `IEngine.setBlock` (engine.port.ts:423), `working` L618
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L725
  - chama: `IEngine.saveContact` (engine.port.ts:425), `working` L618
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L732
  - chama: `IEngine.removeContact` (engine.port.ts:427), `working` L618
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L737
  - chama: `IEngine.createChannel` (engine.port.ts:430), `working` L618
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L744
  - chama: `IEngine.channelInfo` (engine.port.ts:431), `working` L618
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L747
  - chama: `IEngine.followChannel` (engine.port.ts:432), `working` L618
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L750
  - chama: `IEngine.unfollowChannel` (engine.port.ts:433), `working` L618
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
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:475), `SessionManager.start` (session-manager.service.ts:319), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:98), `SessionsController.ensure` (sessions.controller.ts:410)
  - `SessionRepository.findByName(name)` · L21
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:64)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:98)
  - `SessionRepository.list()` · L22
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:69)
    - chamado por: `SessionsController.create` (sessions.controller.ts:98), `SessionsController.list` (sessions.controller.ts:155)
  - `SessionRepository.updateStatus(id, status, patch)` · L25
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:76)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:402), `SessionManager.persistStatus` (session-manager.service.ts:269), `SessionManager.startWithTimeout` (session-manager.service.ts:330)
  - `SessionRepository.delete(id)` · L30
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:101)
    - chamado por: `SessionManager.remove` (session-manager.service.ts:452), `SessionsController.create` (sessions.controller.ts:98)
  - `SessionRepository.findAutostart()` · L31
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:105)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:74)

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
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:205)
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
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1546), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:899)
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
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1476)

**Tipos**
- type `BaileysDescribed` L27
- type `BaileysForwardContent` L505

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

2100 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/upsert-decision.ts`, `shared-kernel/process-errors.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L444 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L445 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L446 · private · campo
- `status` · L447 · private · campo
- `qrBase64` · L448 · private · campo
- `stopped` · L449 · private · campo
- `reconnectAttempts` · L450 · private · campo
- `lifecycle` · L456 · private · campo
- `sentMessages` · L458 · private · campo
- `seenUpserts` · L461 · private · campo
- `lidToPn` · L463 · private · campo
- `groupPushName` · L466 · private · campo
- `connectGeneration` · L471 · private · campo
- `timelockFetch` · L472 · private · campo
- `lastTimelockFetchAt` · L473 · private · campo
- `groupMetaCache` · L475 · private · campo
- `constructor(deps)` · L480
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L482 · private
  - chamado por: `connect` L533, `groupInfo` L1822, `listGroups` L1814
- `clearReconnectTimer()` · L491 · private
  - chamado por: `doLogout` L2061, `doStop` L2002, `onConnectionUpdate` L765, `shutdown` L2042, `start` L523
- `getStatus()` · L496
  - implementa: `IEngine.getStatus` (engine.port.ts:377)
- `getQrBase64()` · L500
  - implementa: `IEngine.getQrBase64` (engine.port.ts:373)
- `setStatus(status, extra)` · L504 · private
  - chamado por: `connect` L533, `doLogout` L2061, `doStop` L2002, `onConnectionUpdate` L765, `requestPairingCode` L1987
- `serialize(fn)` · L514 · private
  - chamado por: `logout` L2056, `onConnectionUpdate` L765, `start` L523, `stop` L1995
- `start()` · L523
  - implementa: `IEngine.start` (engine.port.ts:323)
  - chama: `clearReconnectTimer` L491, `connect` L533, `serialize` L514
- `connect()` · L533 · private · async
  - chama: `cacheGroupMeta` L482, `detachSocketListeners` L2019, `loadMessageForRetry` L1618, `onConnectionUpdate` L765, `onContacts` L1771, `onMessageCapping` L1075, `onMessagesUpdate` L1013, `onMessagesUpsert` L899, `onReactions` L660, `safe` L1653, `setStatus` L504, `latestBaileysVersion` L136, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `onConnectionUpdate` L765, `start` L523
- `onReactions(reactions)` · L660 · private
  - chama: `learnPair` L696, `resolveChatJid` L689, `mapBaileysReaction` L205
  - chamado por: `connect` L533
- `resolveChatJid(jid)` · L689 · private
  - chamado por: `groupSenderOf` L723, `onReactions` L660
- `learnPair(a, b)` · L696 · private
  - chama: `learnLid` L703
  - chamado por: `onReactions` L660
- `learnLid(lid, pn)` · L703 · private
  - chama: `mergeLidMessages` L1728
  - chamado por: `groupSenderOf` L723, `learnPair` L696, `onMessagesUpsert` L899
- `groupSenderOf(m)` · L723 · private
  - chama: `learnLid` L703, `rememberGroupPushName` L757, `resolveChatJid` L689, `phoneFirst` L232
  - chamado por: `onMessagesUpsert` L899
- `rememberGroupPushName(pn, pushName)` · L757 · private
  - chamado por: `groupSenderOf` L723
- `onConnectionUpdate(update)` · L765 · private · async
  - chama: `clearCredentials` L2084, `clearReconnectTimer` L491, `connect` L533, `detachSocketListeners` L2019, `serialize` L514, `setStatus` L504, `warmLidCache` L1714, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L533
- `onMessagesUpsert(upsert)` · L899 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L723, `handleIncomingMedia` L1171, `learnLid` L703, `encodeProto` L184, `shouldAcceptUpsert` (upsert-decision.ts:8)
  - chamado por: `connect` L533
  - banco: `waMessage.findFirst`
- `onMessagesUpdate(updates)` · L1013 · private · async
  - chama: `fetchReachoutTimelock` L1101, `markMessage` L1152, `mapAckStatus` L251, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L533
- `onMessageCapping(info)` · L1075 · private · async
  - chama: `fetchReachoutTimelock` L1101, `cappingCycleEnd` L434, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L533
- `fetchReachoutTimelock()` · L1101 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `onMessageCapping` L1075, `onMessagesUpdate` L1013
- `markMessage(keyId, fromMe, field)` · L1152 · private
  - chamado por: `onMessagesUpdate` L1013
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1171 · private · async
  - chama: `encodeProto` L184, `extOf` L237
  - chamado por: `onMessagesUpsert` L899
- `sendText(to, text, opts)` · L1247 · async
  - implementa: `IEngine.sendText` (engine.port.ts:335)
  - chama: `cacheSent` L1604, `resolveJid` L1421, `encodeProto` L184
- `sendMedia(to, input)` · L1280 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:340)
  - chama: `cacheSent` L1604, `resolveJid` L1421, `buildMediaContent` L271, `encodeProto` L184, `extOf` L237
- `sendLocation(to, input)` · L1335 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:345)
  - chama: `emitOutbound` L1389, `resolveJid` L1421, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1364 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:349)
  - chama: `emitOutbound` L1389, `resolveJid` L1421, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1389 · private
  - chama: `cacheSent` L1604, `encodeProto` L184
  - chamado por: `sendLocation` L1335, `sendPoll` L1364
- `resolveJid(to)` · L1421 · private · async
  - chama: `toJid` L2095
  - chamado por: `forwardTo` L1546, `resolveParticipants` L1705, `sendLocation` L1335, `sendMedia` L1280, `sendPoll` L1364, `sendText` L1247
- `sendPresence(to, state)` · L1426 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:353)
  - chama: `sk` L1672, `toJid` L2095
- `setProfileStatus(status)` · L1436 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:355)
  - chama: `sk` L1672
- `setProfileName(name)` · L1439 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:356)
  - chama: `sk` L1672
- `setProfilePhoto(image, _mimetype)` · L1442 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:357)
  - chama: `sk` L1672
- `markRead(chatJid, msgId)` · L1450 · async
  - implementa: `IEngine.markRead` (engine.port.ts:359)
  - chama: `sk` L1672, `toJid` L2095
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1458 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:363)
  - chama: `toJid` L2095
- `prepareForward(src)` · L1476 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:372)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:296), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1546, `decodeProto` L187
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1546 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L1604, `resolveJid` L1421, `encodeProto` L184, `toJid` L2095
  - chamado por: `prepareForward` L1476
- `cacheSent(keyId, message)` · L1604 · private
  - chamado por: `emitOutbound` L1389, `forwardTo` L1546, `loadMessageForRetry` L1618, `sendMedia` L1280, `sendText` L1247
- `loadMessageForRetry(key)` · L1618 · private · async
  - chama: `cacheSent` L1604, `decodeProto` L187
  - chamado por: `connect` L533
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L1653 · private
  - chamado por: `connect` L533
- `sk()` · L1672 · private
  - chamado por: `channelInfo` L1976, `checkNumbers` L1924, `createChannel` L1969, `createGroup` L1830, `followChannel` L1980, `groupInfo` L1822, `groupInviteCode` L1855, `groupMembershipAction` L1876, `groupMembershipRequests` L1864, `groupRevokeInvite` L1858, `leaveGroup` L1846, `listGroups` L1814, `markRead` L1450, `profilePicture` L1939, `removeContact` L1964, `saveContact` L1951, `sendPresence` L1426, `setBlock` L1948, `setGroupDescription` L1852, `setGroupPhoto` L1915, `setGroupSetting` L1898, `setGroupSubject` L1849, `setProfileName` L1439, `setProfilePhoto` L1442, `setProfileStatus` L1436, `unfollowChannel` L1983, `updateParticipants` L1838
- `listChats(_limit)` · L1679 · async
  - implementa: `IEngine.listChats` (engine.port.ts:382)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:313)
- `fetchChatHistory(_chatJid, _limit)` · L1684 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:383)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:313)
- `setChatFlag(_chatJid, _flag, _enabled)` · L1695 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:387)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:313)
- `resolveParticipants(items)` · L1705 · private · async
  - chama: `resolveJid` L1421
  - chamado por: `createGroup` L1830, `groupMembershipAction` L1876, `updateParticipants` L1838
- `warmLidCache()` · L1714 · private · async
  - chama: `mergeKnownLids` L1751
  - chamado por: `onConnectionUpdate` L765
- `mergeLidMessages(lid, phoneJid)` · L1728 · private · async
  - chamado por: `learnLid` L703, `mergeKnownLids` L1751
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L1751 · private · async
  - chama: `mergeLidMessages` L1728
  - chamado por: `warmLidCache` L1714
  - banco: `waMessage.findMany`
- `onContacts(list)` · L1771 · private
  - chama: `contactToRecord` L159
  - chamado por: `connect` L533
- `recordGroupParticipants(md)` · L1778 · private
  - chamado por: `groupInfo` L1822, `listGroups` L1814
- `resolveParticipantNames(groups)` · L1792 · private · async
  - chama: `resolveParticipantPhone` L311
  - chamado por: `groupInfo` L1822, `listGroups` L1814
- `listGroups()` · L1814 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:390)
  - chama: `cacheGroupMeta` L482, `recordGroupParticipants` L1778, `resolveParticipantNames` L1792, `sk` L1672, `toGroupInfo` L359
- `groupInfo(jid)` · L1822 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:391)
  - chama: `cacheGroupMeta` L482, `recordGroupParticipants` L1778, `resolveParticipantNames` L1792, `sk` L1672, `toGroupInfo` L359, `toGroupJid` L403
- `createGroup(subject, participants)` · L1830 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:392)
  - chama: `resolveParticipants` L1705, `sk` L1672, `toGroupInfo` L359
- `updateParticipants(jid, action, participants)` · L1838 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:393)
  - chama: `resolveParticipants` L1705, `sk` L1672, `toGroupJid` L403
- `leaveGroup(jid)` · L1846 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:398)
  - chama: `sk` L1672, `toGroupJid` L403
- `setGroupSubject(jid, subject)` · L1849 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:399)
  - chama: `sk` L1672, `toGroupJid` L403
- `setGroupDescription(jid, description)` · L1852 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:400)
  - chama: `sk` L1672, `toGroupJid` L403
- `groupInviteCode(jid)` · L1855 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:401)
  - chama: `sk` L1672, `toGroupJid` L403
- `groupRevokeInvite(jid)` · L1858 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:402)
  - chama: `sk` L1672, `toGroupJid` L403
- `groupMembershipRequests(jid)` · L1864 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:405)
  - chama: `sk` L1672, `toGroupJid` L403
- `groupMembershipAction(jid, action, participants)` · L1876 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:406)
  - chama: `resolveParticipants` L1705, `sk` L1672, `toGroupJid` L403
- `setGroupSetting(jid, setting, enabled)` · L1898 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:412)
  - chama: `sk` L1672, `toGroupJid` L403
- `setGroupPhoto(jid, image, _mimetype)` · L1915 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:418)
  - chama: `sk` L1672, `toGroupJid` L403
- `checkNumbers(numbers)` · L1924 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:421)
  - chama: `sk` L1672
- `profilePicture(jid)` · L1939 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:422)
  - chama: `sk` L1672, `toContactJid` L406
- `setBlock(jid, action)` · L1948 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:423)
  - chama: `sk` L1672, `toContactJid` L406
- `saveContact(jid, input)` · L1951 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:425)
  - chama: `sk` L1672, `toContactJid` L406
- `removeContact(jid)` · L1964 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:427)
  - chama: `sk` L1672, `toContactJid` L406
- `createChannel(name, description)` · L1969 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:430)
  - chama: `sk` L1672, `toChannelInfo` L392
- `channelInfo(jid)` · L1976 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:431)
  - chama: `sk` L1672, `toChannelInfo` L392
- `followChannel(jid)` · L1980 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:432)
  - chama: `sk` L1672
- `unfollowChannel(jid)` · L1983 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:433)
  - chama: `sk` L1672
- `requestPairingCode(phoneNumber)` · L1987 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:334)
  - chama: `setStatus` L504
- `stop()` · L1995
  - implementa: `IEngine.stop` (engine.port.ts:324)
  - chama: `doStop` L2002, `serialize` L514
- `doStop()` · L2002 · private · async
  - chama: `clearReconnectTimer` L491, `detachSocketListeners` L2019, `setStatus` L504
  - chamado por: `stop` L1995
- `detachSocketListeners()` · L2019 · private
  - chamado por: `connect` L533, `doLogout` L2061, `doStop` L2002, `onConnectionUpdate` L765, `shutdown` L2042
- `shutdown()` · L2042 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:332)
  - chama: `clearReconnectTimer` L491, `detachSocketListeners` L2019
- `logout()` · L2056
  - implementa: `IEngine.logout` (engine.port.ts:333)
  - chama: `doLogout` L2061, `serialize` L514
- `doLogout()` · L2061 · private · async
  - chama: `clearCredentials` L2084, `clearReconnectTimer` L491, `detachSocketListeners` L2019, `setStatus` L504
  - chamado por: `logout` L2056
- `clearCredentials()` · L2084 · private · async
  - chamado por: `doLogout` L2061, `onConnectionUpdate` L765
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `latestBaileysVersion(logger)` · L136 · async
  - chamado por: `connect` L533
- `contactToRecord(c, source)` · L159
  - chamado por: `onContacts` L1771
- `encodeProto(msg)` · L184
  - chamado por: `emitOutbound` L1389, `forwardTo` L1546, `handleIncomingMedia` L1171, `onMessagesUpsert` L899, `sendMedia` L1280, `sendText` L1247
- `decodeProto(value)` · L187
  - chamado por: `loadMessageForRetry` L1618, `prepareForward` L1476
- `mapBaileysReaction(key, reaction, ourJid)` · L205
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L232
  - chamado por: `onReactions` L660
- `phoneFirst(a, b)` · L232
  - chamado por: `groupSenderOf` L723, `mapBaileysReaction` L205
- `extOf(mimetype, fileName)` · L237
  - chamado por: `handleIncomingMedia` L1171, `sendMedia` L1280
- `mapAckStatus(status)` · L251
  - chamado por: `onMessagesUpdate` L1013
- `buildMediaContent(input)` · L271
  - chamado por: `sendMedia` L1280
- `resolveParticipantPhone(p, lidToPn)` · L311
  - chamado por: `resolveParticipantNames` L1792, `toGroupInfo` L359
- `dirNameFor(p, phone, names)` · L345
  - chamado por: `toGroupInfo` L359
- `toGroupInfo(md, lidToPn, names)` · L359
  - chama: `dirNameFor` L345, `resolveParticipantPhone` L311
  - chamado por: `createGroup` L1830, `groupInfo` L1822, `listGroups` L1814
- `toChannelInfo(md)` · L392
  - chamado por: `channelInfo` L1976, `createChannel` L1969
- `toGroupJid(jid)` · L403
  - chamado por: `groupInfo` L1822, `groupInviteCode` L1855, `groupMembershipAction` L1876, `groupMembershipRequests` L1864, `groupRevokeInvite` L1858, `leaveGroup` L1846, `setGroupDescription` L1852, `setGroupPhoto` L1915, `setGroupSetting` L1898, `setGroupSubject` L1849, `updateParticipants` L1838
- `toContactJid(jid)` · L406
  - chamado por: `profilePicture` L1939, `removeContact` L1964, `saveContact` L1951, `setBlock` L1948
- `cappingCycleEnd(value)` · L434
  - chamado por: `onMessageCapping` L1075
- `toJid(to)` · L2095
  - chamado por: `forwardTo` L1546, `markRead` L1450, `resolveJid` L1421, `sendPresence` L1426, `sendReaction` L1458

**Tipos**
- interface `BaileysEngineDeps` L76 · 13 propriedade(s)
- type `BaileysVersion` L127
- type `RawParticipant` L298
- type `RawGroup` L325
- type `RawNewsletter` L335

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

## `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`

138 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`
- importa (interno): `shared-kernel/process-errors.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “Baileys rc14 — sinais nativos de restrição (E8)” · L73
  - it “ERROR 463 pausa antes da consulta e usa o timeEnforcementEnds retornado” · L74
  - it “connection.update ativo e capping CAPPED são sinais; warning não pausa” · L96
  - it “consulta pendurada vence em 3 s; 479 só é contado e ACK normal preservado” · L123

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:533)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:533)
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
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:899)

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:480), `WWebJSEngine.constructor` (wwebjs.engine.ts:415)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:141)

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
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1335), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1364), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
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
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2062), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2807)
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
  - chamado por: `WWebJSEngine.onMessageCreate` (wwebjs.engine.ts:2062), `WWebJSEngine.toHistoryMessage` (wwebjs.engine.ts:2807)
- `mapWwebjsReaction(r)` · L285
  - chama: `jidOf` L257, `serializedOf` L248
  - chamado por: `WWebJSEngine.onReaction` (wwebjs.engine.ts:2336)

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
  - chamado por: `WWebJSEngine.mediaQueue` (wwebjs.engine.ts:385)
- `run(task, signal)` · L11
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

**class `MediaDeadlineError`** L33 · `extends Error`
- injeta (construtor): `ms: number (param)`
- `constructor(ms)` · L34
  - chamado por: `mediaDeadline` L59

**Funções e constantes de topo**
- `collectMediaStream(stream, maxBytes)` · L39 · async
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146)
- `mediaDeadline(work, ms)` · L59 · async
  - chama: `constructor` L34
  - chamado por: `WWebJSEngine.handleIncomingMedia` (wwebjs.engine.ts:2146), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

## `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

3226 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
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
  - chamado por: `doStart` L717, `handleDisconnect` L1300, `healWedgedPage` L2720, `logout` L1553, `qrWatchdogTick` L540, `start` L703, `stop` L1500
- `getStatus()` · L428
  - implementa: `IEngine.getStatus` (engine.port.ts:377)
- `getQrBase64()` · L431
  - implementa: `IEngine.getQrBase64` (engine.port.ts:373)
- `getPairingCode()` · L434
  - implementa: `IEngine.getPairingCode` (engine.port.ts:376)
- `setStatus(status, extra)` · L438 · private
  - chama: `startQrWatchdog` L525, `startSyncWatchdog` L597, `stopMemoryProfile` L476, `stopQrWatchdog` L535, `stopSyncWatchdog` L608
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2720, `qrWatchdogTick` L540, `requestPairingCode` L1590, `syncWatchdogTick` L615
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
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `healWedgedPage` L2720, `setStatus` L438, `syncHint` L2705
  - chamado por: `startSyncWatchdog` L597
- `clearStaleSingletonLocks()` · L677 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStart` L717
- `purgeAuthDir(sessionId)` · L697 · static · async
  - chama: `authDirOf` L219
  - chamado por: `SessionManager.logout` (session-manager.service.ts:402), `SessionManager.newQr` (session-manager.service.ts:431), `SessionManager.remove` (session-manager.service.ts:452), `doLogout` L1558
- `start()` · L703
  - implementa: `IEngine.start` (engine.port.ts:323)
  - chama: `doStart` L717, `serialize` L419
- `doStart(attempt, forceLive)` · L717 · private · async
  - chama: `isWwebjsVersionMode` (wwebjs-version.ts:2), `buildAuthProxyUrl` L205, `raceStoreOp` L321, `userAgentFor` L134, `checkPinnedBuildAge` L1060, `clearStaleSingletonLocks` L677, `closeAnonProxy` L1385, `consumeCleanShutdownMarker` L1470, `destroyWithTimeout` L1403, `ensureWebVersionHtml` L1106, `handleDisconnect` L1300, `handleInitFailure` L1187, `mergeExistingLids` L2541, `onMessageAck` L2312, `onMessageCreate` L2062, `onReaction` L2336, `resolveWebVersion` L1140, `serialize` L419, `setStatus` L438, `startMemoryProfile` L462, `syncAddressBook` L2569
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
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2720, `qrWatchdogTick` L540, `shutdown` L1528
- `destroyWithTimeout()` · L1403 · private · async
  - chama: `stopMemoryProfile` L476, `chromiumProcessTree` (memory.ts:17)
  - chamado por: `doLogout` L1558, `doStart` L717, `doStop` L1507, `handleDisconnect` L1300, `handleInitFailure` L1187, `healWedgedPage` L2720, `qrWatchdogTick` L540, `shutdown` L1528
- `markCleanShutdown()` · L1453 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStop` L1507, `shutdown` L1528
- `consumeCleanShutdownMarker()` · L1470 · private · async
  - chama: `authDirOf` L219
  - chamado por: `doStart` L717
- `stop()` · L1500
  - implementa: `IEngine.stop` (engine.port.ts:324)
  - chama: `doStop` L1507, `serialize` L419
- `doStop()` · L1507 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `setStatus` L438
  - chamado por: `stop` L1500
- `shutdown()` · L1528 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:332)
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `stopMemoryProfile` L476, `stopSyncWatchdog` L608
- `logout()` · L1553
  - implementa: `IEngine.logout` (engine.port.ts:333)
  - chama: `doLogout` L1558, `serialize` L419
- `doLogout()` · L1558 · private · async
  - chama: `raceStoreOp` L321, `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `purgeAuthDir` L697, `setStatus` L438
  - chamado por: `logout` L1553
- `requestPairingCode(phoneNumber)` · L1590 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:334)
  - chama: `req` L2613, `setStatus` L438
- `sendText(to, text, opts)` · L1603 · async
  - implementa: `IEngine.sendText` (engine.port.ts:335)
  - chama: `assertPageResponsive` L2678, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `toMentionIds` L2053, `withLidFallback` L2445
- `sendMedia(to, input)` · L1633 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:340)
  - chama: `PendingMediaSendError.constructor` (engine.port.ts:22), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `sendMediaQueued` L1652
- `sendMediaQueued(to, input)` · L1652 · private · async
  - chama: `extOf` L156, `assertPageResponsive` L2678, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `toMentionIds` L2053, `withLidFallback` L2445
  - chamado por: `sendMedia` L1633
- `sendLocation(to, input)` · L1726 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:345)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2678, `emitOutbound` L1790, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `sendPoll(to, input)` · L1760 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:349)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2678, `emitOutbound` L1790, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `emitOutbound(keyId, jid, type, text, opts)` · L1790 · private
  - chamado por: `sendLocation` L1726, `sendPoll` L1760
- `setProfileStatus(status)` · L1812 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:355)
  - chama: `req` L2613
- `setProfileName(name)` · L1815 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:356)
  - chama: `req` L2613
- `setProfilePhoto(image, mimetype)` · L1818 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:357)
  - chama: `req` L2613
- `sendPresence(to, state)` · L1823 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:353)
  - chama: `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `markRead(chatJid, _msgId)` · L1841 · async
  - implementa: `IEngine.markRead` (engine.port.ts:359)
  - chama: `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1850 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:363)
  - chama: `req` L2613, `withStoreReady` L2630
- `prepareForward(src)` · L1863 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:372)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:296), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2678, `forwardTo` L1900, `req` L2613, `withStoreReady` L2630
- `forwardTo(msg, type, text, src, to, opts)` · L1900 · private · async
  - chama: `assertPageResponsive` L2678, `req` L2613, `toChatId` L2608, `withLidFallback` L2445, `ForwardEchoRegistry.expect` (wwebjs.forward-echo.ts:60)
  - chamado por: `prepareForward` L1863
- `matchForwardEcho(msg, d, keyId)` · L1988 · private
  - chama: `ForwardEchoRegistry.match` (wwebjs.forward-echo.ts:103)
  - chamado por: `onMessageCreate` L2062
- `emitForwardEcho(msg, d, keyId, echo)` · L2008 · private
  - chama: `handleIncomingMedia` L2146, `rememberPanel` L2350
  - chamado por: `onMessageCreate` L2062
- `toMentionIds(mentions)` · L2053 · private
  - chama: `toChatId` L2608
  - chamado por: `sendMediaQueued` L1652, `sendText` L1603
- `onMessageCreate(msg)` · L2062 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L171, `emitForwardEcho` L2008, `handleIncomingMedia` L2146, `matchForwardEcho` L1988, `resolveNumberJid` L2361
  - chamado por: `doStart` L717
- `handleIncomingMedia(msg, base, mediaType, caption, type)` · L2146 · private · async
  - chama: `collectMediaStream` (wwebjs-media.ts:39), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `extOf` L156, `isPageCrashError` L110, `mapInboundMediaType` L171, `healWedgedPage` L2720
  - chamado por: `emitForwardEcho` L2008, `onMessageCreate` L2062
- `mapAck(ack)` · L2298 · private
  - chamado por: `onMessageAck` L2312
- `onMessageAck(msg, ack)` · L2312 · private
  - chama: `mapAck` L2298
  - chamado por: `doStart` L717
- `onReaction(r)` · L2336 · private · async
  - chama: `mapWwebjsReaction` (wwebjs-content.ts:285), `resolveNumberJid` L2361
  - chamado por: `doStart` L717
- `rememberPanel(keyId)` · L2350 · private
  - chamado por: `emitForwardEcho` L2008, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendText` L1603
- `resolveNumberJid(rawId)` · L2361 · private · async
  - chama: `cacheLidPn` L2382, `mergeLidMessages` L2517, `resolveLidToPhone` L2393
  - chamado por: `mergeExistingLids` L2541, `onMessageCreate` L2062, `onReaction` L2336, `toHistoryMessage` L2807
- `cacheLidPn(lid, phoneJid)` · L2382 · private
  - chamado por: `rememberOutboundLid` L2494, `resolveNumberJid` L2361, `resolvePendingLids` L2998
- `resolveLidToPhone(lid)` · L2393 · private · async
  - chamado por: `resolveNumberJid` L2361, `resolvePendingLids` L2998
- `withLidFallback(pnJid, op)` · L2445 · private · async
  - chama: `rememberOutboundLid` L2494, `resolvePhoneToLid` L2469, `withLidFallback` (wwebjs.lid-outbound.ts:51)
  - chamado por: `forwardTo` L1900, `markRead` L1841, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendText` L1603
- `resolvePhoneToLid(phoneJid)` · L2469 · private · async
  - chamado por: `withLidFallback` L2445
- `rememberOutboundLid(pnJid, lid)` · L2494 · private
  - chama: `cacheLidPn` L2382
  - chamado por: `withLidFallback` L2445
- `mergeLidMessages(lid, phoneJid)` · L2517 · private · async
  - chamado por: `resolveNumberJid` L2361
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeExistingLids()` · L2541 · private · async
  - chama: `resolveNumberJid` L2361
  - chamado por: `doStart` L717
  - banco: `waMessage.findMany`
- `syncAddressBook()` · L2569 · private · async
  - chama: `req` L2613, `withStoreReady` L2630
  - chamado por: `doStart` L717
- `toChatId(to)` · L2608 · private
  - chamado por: `createGroup` L3034, `fetchChatHistory` L2789, `forwardTo` L1900, `groupMembershipAction` L3104, `markRead` L1841, `profilePicture` L3152, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendText` L1603, `setBlock` L3163, `setChatFlag` L2844, `toMentionIds` L2053, `updateParticipants` L3049
- `req()` · L2613 · private
  - chamado por: `channelInfo` L3205, `checkNumbers` L3141, `createChannel` L3187, `createGroup` L3034, `fetchChatHistory` L2789, `followChannel` L3218, `forwardTo` L1900, `getGroupChat` L2891, `listChats` L2769, `listGroups` L2872, `markRead` L1841, `prepareForward` L1863, `profilePicture` L3152, `removeContact` L3182, `requestPairingCode` L1590, `resolvePendingLids` L2998, `saveContact` L3171, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendPresence` L1823, `sendReaction` L1850, `sendText` L1603, `setBlock` L3163, `setChatFlag` L2844, `setProfileName` L1815, `setProfilePhoto` L1818, `setProfileStatus` L1812, `syncAddressBook` L2569, `unfollowChannel` L3222
- `withStoreReady(fn, attempts, delayMs, opTimeoutMs, probeTimeoutMs)` · L2630 · private · async
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `assertPageResponsive` L2678, `healWedgedPage` L2720, `syncHint` L2705
  - chamado por: `channelInfo` L3205, `checkNumbers` L3141, `createChannel` L3187, `createGroup` L3034, `fetchChatHistory` L2789, `followChannel` L3218, `getGroupChat` L2891, `listChats` L2769, `listGroups` L2872, `prepareForward` L1863, `profilePicture` L3152, `removeContact` L3182, `saveContact` L3171, `sendReaction` L1850, `setBlock` L3163, `setChatFlag` L2844, `syncAddressBook` L2569, `unfollowChannel` L3222
- `assertPageResponsive(probeTimeoutMs)` · L2678 · private · async
  - chama: `isPageCrashError` L110, `raceStoreOp` L321, `healWedgedPage` L2720, `syncHint` L2705
  - chamado por: `forwardTo` L1900, `prepareForward` L1863, `sendLocation` L1726, `sendMediaQueued` L1652, `sendPoll` L1760, `sendText` L1603, `withStoreReady` L2630
- `syncHint()` · L2705 · private
  - chamado por: `assertPageResponsive` L2678, `syncWatchdogTick` L615, `withStoreReady` L2630
- `lastHealAt` · L2716 · private · campo
- `healing` · L2717 · private · campo
- `HEAL_COOLDOWN_MS` · L2718 · private · static · campo
- `healWedgedPage()` · L2720 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `serialize` L419, `setStatus` L438
  - chamado por: `assertPageResponsive` L2678, `handleIncomingMedia` L2146, `syncWatchdogTick` L615, `withStoreReady` L2630
- `listChats(limit)` · L2769 · async
  - implementa: `IEngine.listChats` (engine.port.ts:382)
  - chama: `req` L2613, `withStoreReady` L2630
- `fetchChatHistory(chatJid, limit)` · L2789 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:383)
  - chama: `req` L2613, `toChatId` L2608, `toHistoryMessage` L2807, `withStoreReady` L2630
- `toHistoryMessage(msg)` · L2807 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L171, `resolveNumberJid` L2361
  - chamado por: `fetchChatHistory` L2789
- `setChatFlag(chatJid, flag, enabled)` · L2844 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:387)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `listGroups()` · L2872 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:390)
  - chama: `groupFlags` L190, `req` L2613, `withStoreReady` L2630
- `getGroupChat(jid)` · L2891 · private · async
  - chama: `req` L2613, `toGroupId` L3030, `withStoreReady` L2630
  - chamado por: `groupInfo` L2900, `groupInviteCode` L3074, `groupMembershipAction` L3104, `groupMembershipRequests` L3086, `groupRevokeInvite` L3078, `leaveGroup` L3062, `setGroupDescription` L3070, `setGroupPhoto` L3130, `setGroupSetting` L3119, `setGroupSubject` L3066, `updateParticipants` L3049
- `groupInfo(jid)` · L2900 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:391)
  - chama: `groupFlags` L190, `getGroupChat` L2891, `resolveParticipantsBatch` L2928
  - chamado por: `createGroup` L3034
- `LID_BATCH` · L2917 · private · static · campo
- `resolveParticipantsBatch(list)` · L2928 · private · async
  - chama: `resolvePendingLids` L2998
  - chamado por: `groupInfo` L2900
- `resolvePendingLids(rows)` · L2998 · private · async
  - chama: `cacheLidPn` L2382, `req` L2613, `resolveLidToPhone` L2393
  - chamado por: `resolveParticipantsBatch` L2928
- `toGroupId(jid)` · L3030 · private
  - chamado por: `getGroupChat` L2891
- `createGroup(subject, participants)` · L3034 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:392)
  - chama: `groupInfo` L2900, `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `updateParticipants(jid, action, participants)` · L3049 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:393)
  - chama: `getGroupChat` L2891, `toChatId` L2608
- `leaveGroup(jid)` · L3062 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:398)
  - chama: `getGroupChat` L2891
- `setGroupSubject(jid, subject)` · L3066 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:399)
  - chama: `getGroupChat` L2891
- `setGroupDescription(jid, description)` · L3070 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:400)
  - chama: `getGroupChat` L2891
- `groupInviteCode(jid)` · L3074 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:401)
  - chama: `getGroupChat` L2891
- `groupRevokeInvite(jid)` · L3078 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:402)
  - chama: `getGroupChat` L2891
- `groupMembershipRequests(jid)` · L3086 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:405)
  - chama: `getGroupChat` L2891
- `groupMembershipAction(jid, action, participants)` · L3104 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:406)
  - chama: `getGroupChat` L2891, `toChatId` L2608
- `setGroupSetting(jid, setting, enabled)` · L3119 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:412)
  - chama: `getGroupChat` L2891
- `setGroupPhoto(jid, image, mimetype)` · L3130 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:418)
  - chama: `getGroupChat` L2891
- `checkNumbers(numbers)` · L3141 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:421)
  - chama: `req` L2613, `withStoreReady` L2630
- `profilePicture(jid)` · L3152 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:422)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `setBlock(jid, action)` · L3163 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:423)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `saveContact(jid, input)` · L3171 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:425)
  - chama: `req` L2613, `withStoreReady` L2630
- `removeContact(jid)` · L3182 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:427)
  - chama: `req` L2613, `withStoreReady` L2630
- `createChannel(name, description)` · L3187 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:430)
  - chama: `req` L2613, `withStoreReady` L2630
- `channelInfo(jid)` · L3205 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:431)
  - chama: `req` L2613, `withStoreReady` L2630
- `followChannel(jid)` · L3218 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:432)
  - chama: `req` L2613, `withStoreReady` L2630
- `unfollowChannel(jid)` · L3222 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:433)
  - chama: `req` L2613, `withStoreReady` L2630

**Funções e constantes de topo**
- `WEB_CACHE_DIR` = `join(resolve(AUTH_PATH), '.webcache')` · L106
- `isPageCrashError(message)` · L110
  - chamado por: `assertPageResponsive` L2678, `handleIncomingMedia` L2146, `syncWatchdogTick` L615, `withStoreReady` L2630
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
  - chamado por: `handleIncomingMedia` L2146, `onMessageCreate` L2062, `toHistoryMessage` L2807
- `groupFlags(g)` · L190
  - chamado por: `groupInfo` L2900, `listGroups` L2872
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
  - chamado por: `assertPageResponsive` L2678, `doLogout` L1558, `doStart` L717, `handleDisconnect` L1300, `syncWatchdogTick` L615, `withStoreReady` L2630

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
  - chamado por: `WWebJSEngine.withLidFallback` (wwebjs.engine.ts:2445)
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
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:232), `ProxyService.ensureAvailable` (proxy.service.ts:218), `SessionManager.start` (session-manager.service.ts:319), `SessionRepository.create` (session.repository.ts:19), `SessionRepository.delete` (session.repository.ts:30), `SessionRepository.findById` (session.repository.ts:20), `SessionRepository.findByName` (session.repository.ts:21), `SessionRepository.list` (session.repository.ts:22), `toDto` L45, `newId` (ulid.ts:4)
- `list(state)` · L155 · async · @Get
  - chama: `GuardrailService.statesFor` (guardrail.service.ts:605), `SessionRepository.list` (session.repository.ts:22), `toDto` L45
- `get(id)` · L175 · async · @Get(':id')
  - chama: `ensure` L410, `toDto` L45
- `health(id)` · L181 · async · @Get(':id/health')
  - chama: `GuardrailService.health` (guardrail.service.ts:579), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20)
- `getConfig(id)` · L190 · async · @Get(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20), `configDto` L62
- `patchConfig(id, body)` · L197 · async · @Patch(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.update` (session-config.service.ts:28), `configDto` L62
- `presence(id, body)` · L214 · async · @Post(':id/presence')
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:524)
- `profileStatus(id, body)` · L230 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:532)
- `profileName(id, body)` · L249 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:535)
- `profilePhoto(id, body)` · L269 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:538), `fetchImageByUrl` (safe-fetch.ts:204)
- `quarantine(id)` · L297 · @Post(':id/quarantine')
  - chama: `override` L317
- `warmup(id)` · L302 · @Post(':id/warmup')
  - chama: `override` L317
- `activate(id)` · L307 · @Post(':id/activate')
  - chama: `override` L317
- `pause(id)` · L312 · @Post(':id/pause')
  - chama: `override` L317
- `override(id, action)` · L317 · private · async
  - chama: `GuardrailService.setManualState` (guardrail.service.ts:563)
  - chamado por: `activate` L307, `pause` L312, `quarantine` L297, `warmup` L302
- `start(id)` · L322 · async · @Post(':id/start')
  - chama: `SessionManager.start` (session-manager.service.ts:319), `ensure` L410
- `stop(id)` · L329 · async · @Post(':id/stop')
  - chama: `SessionManager.stop` (session-manager.service.ts:392), `ensure` L410
- `restart(id)` · L336 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:396), `ensure` L410
- `logout(id)` · L343 · async · @Post(':id/logout')
  - chama: `SessionManager.logout` (session-manager.service.ts:402), `ensure` L410
- `remove(id)` · L350 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `SessionManager.remove` (session-manager.service.ts:452), `ensure` L410
- `qr(id)` · L358 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:471), `SessionManager.getQr` (session-manager.service.ts:467), `ensure` L410
- `newQr(id)` · L374 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:431), `ensure` L410
- `pairingCode(id, body)` · L381 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:475), `ensure` L410
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
