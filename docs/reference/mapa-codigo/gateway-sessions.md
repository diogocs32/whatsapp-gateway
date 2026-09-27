<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `sessions`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/sessions/application/engine.port.ts` | 441 |
| `modules/sessions/application/session-config.service.ts` | 65 |
| `modules/sessions/application/session-manager.pairing.spec.ts` | 60 |
| `modules/sessions/application/session-manager.service.ts` | 839 |
| `modules/sessions/application/session-status-order.spec.ts` | 163 |
| `modules/sessions/domain/session-status.ts` | 15 |
| `modules/sessions/domain/session.entity.ts` | 24 |
| `modules/sessions/domain/session.repository.ts` | 41 |
| `modules/sessions/domain/wwebjs-version.spec.ts` | 48 |
| `modules/sessions/domain/wwebjs-version.ts` | 10 |
| `modules/sessions/infrastructure/baileys/baileys-cache-observer.spec.ts` | 36 |
| `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts` | 81 |
| `modules/sessions/infrastructure/baileys/baileys-content.spec.ts` | 448 |
| `modules/sessions/infrastructure/baileys/baileys-content.ts` | 548 |
| `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts` | 633 |
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | 2561 |
| `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts` | 1354 |
| `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts` | 812 |
| `modules/sessions/infrastructure/baileys/baileys.media.spec.ts` | 335 |
| `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts` | 165 |
| `modules/sessions/infrastructure/baileys/baileys.patch.spec.ts` | 129 |
| `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts` | 228 |
| `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts` | 92 |
| `modules/sessions/infrastructure/baileys/browser-fingerprint.ts` | 44 |
| `modules/sessions/infrastructure/baileys/disconnect-policy.ts` | 80 |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | 85 |
| `modules/sessions/infrastructure/baileys/upsert-decision.spec.ts` | 58 |
| `modules/sessions/infrastructure/baileys/upsert-decision.ts` | 36 |
| `modules/sessions/infrastructure/engine.factory.ts` | 17 |
| `modules/sessions/infrastructure/message-content.spec.ts` | 70 |
| `modules/sessions/infrastructure/message-content.ts` | 141 |
| `modules/sessions/infrastructure/prisma-session.repository.ts` | 157 |
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
| `modules/sessions/interface/sessions.controller.ts` | 417 |
| `modules/sessions/sessions.module.ts` | 33 |

## `modules/sessions/application/engine.port.ts`

441 linhas · caminho: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/events/interface/events.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs-content.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**class `PendingMediaSendError`** L23 · `extends Error`
- injeta (construtor): `completion: Promise<{ keyId: string; jid: string }>`
- `constructor(completion)` · L24
  - chamado por: `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)

**class `ForwardSourceError`** L301 · `extends Error`
- injeta (construtor): `code: ForwardErrorCode` · `message: string (param)`
- `constructor(code, message)` · L302
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1844), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)

**class `UnsupportedEngineOperationError`** L318 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L319
  - chamado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2052), `BaileysEngine.listChats` (baileys.engine.ts:2047), `BaileysEngine.setChatFlag` (baileys.engine.ts:2063)

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
    - chamado por: `ForwardService.sendOne` (forward.service.ts:402), `SessionManager.prepareForward` (session-manager.service.ts:673)
- type `ForwardErrorCode` L299
- type `PresenceState` L312
- interface `IEngine` L325 · 1 propriedade(s)
  - `IEngine.start()` · L329
    - implementado por: `BaileysEngine.start` (baileys.engine.ts:596), `WWebJSEngine.start` (wwebjs.engine.ts:703)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:541), `SessionManager.start` (session-manager.service.ts:385)
  - `IEngine.stop()` · L330
    - implementado por: `BaileysEngine.stop` (baileys.engine.ts:2447), `WWebJSEngine.stop` (wwebjs.engine.ts:1500)
    - chamado por: `SessionManager.discardOrphan` (session-manager.service.ts:359), `SessionManager.newQr` (session-manager.service.ts:497), `SessionManager.onModuleDestroy` (session-manager.service.ts:103), `SessionManager.remove` (session-manager.service.ts:518), `SessionManager.stop` (session-manager.service.ts:458)
  - `IEngine.shutdown()` · L338
    - implementado por: `BaileysEngine.shutdown` (baileys.engine.ts:2497), `WWebJSEngine.shutdown` (wwebjs.engine.ts:1528)
    - chamado por: `SessionManager.onModuleDestroy` (session-manager.service.ts:103)
  - `IEngine.logout()` · L339
    - implementado por: `BaileysEngine.logout` (baileys.engine.ts:2514), `WWebJSEngine.logout` (wwebjs.engine.ts:1553)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:468)
  - `IEngine.requestPairingCode(phoneNumber)` · L340
    - implementado por: `BaileysEngine.requestPairingCode` (baileys.engine.ts:2427), `WWebJSEngine.requestPairingCode` (wwebjs.engine.ts:1590)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:541)
  - `IEngine.sendText(to, text, opts)` · L341
    - implementado por: `BaileysEngine.sendText` (baileys.engine.ts:1615), `WWebJSEngine.sendText` (wwebjs.engine.ts:1603)
    - chamado por: `SessionManager.sendText` (session-manager.service.ts:575)
  - `IEngine.sendMedia(to, input)` · L346
    - implementado por: `BaileysEngine.sendMedia` (baileys.engine.ts:1648), `WWebJSEngine.sendMedia` (wwebjs.engine.ts:1633)
    - chamado por: `SessionManager.sendMedia` (session-manager.service.ts:585)
  - `IEngine.sendLocation(to, input)` · L351
    - implementado por: `BaileysEngine.sendLocation` (baileys.engine.ts:1703), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
    - chamado por: `SessionManager.sendLocation` (session-manager.service.ts:593)
  - `IEngine.sendPoll(to, input)` · L355
    - implementado por: `BaileysEngine.sendPoll` (baileys.engine.ts:1732), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
    - chamado por: `SessionManager.sendPoll` (session-manager.service.ts:601)
  - `IEngine.sendPresence(to, state)` · L359
    - implementado por: `BaileysEngine.sendPresence` (baileys.engine.ts:1794), `WWebJSEngine.sendPresence` (wwebjs.engine.ts:1823)
    - chamado por: `SessionManager.sendPresence` (session-manager.service.ts:609)
  - `IEngine.setProfileStatus(status)` · L361
    - implementado por: `BaileysEngine.setProfileStatus` (baileys.engine.ts:1804), `WWebJSEngine.setProfileStatus` (wwebjs.engine.ts:1812)
    - chamado por: `SessionManager.setProfileStatus` (session-manager.service.ts:617)
  - `IEngine.setProfileName(name)` · L362
    - implementado por: `BaileysEngine.setProfileName` (baileys.engine.ts:1807), `WWebJSEngine.setProfileName` (wwebjs.engine.ts:1815)
    - chamado por: `SessionManager.setProfileName` (session-manager.service.ts:620)
  - `IEngine.setProfilePhoto(image, mimetype)` · L363
    - implementado por: `BaileysEngine.setProfilePhoto` (baileys.engine.ts:1810), `WWebJSEngine.setProfilePhoto` (wwebjs.engine.ts:1818)
    - chamado por: `SessionManager.setProfilePhoto` (session-manager.service.ts:623)
  - `IEngine.markRead(chatJid, msgId)` · L365
    - implementado por: `BaileysEngine.markRead` (baileys.engine.ts:1818), `WWebJSEngine.markRead` (wwebjs.engine.ts:1841)
    - chamado por: `SessionManager.markRead` (session-manager.service.ts:631)
  - `IEngine.sendReaction(chatJid, msgId, fromMe, emoji)` · L369
    - implementado por: `BaileysEngine.sendReaction` (baileys.engine.ts:1826), `WWebJSEngine.sendReaction` (wwebjs.engine.ts:1850)
    - chamado por: `SessionManager.sendReaction` (session-manager.service.ts:655)
  - `IEngine.prepareForward(src)` · L378
    - implementado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1844), `WWebJSEngine.prepareForward` (wwebjs.engine.ts:1863)
    - chamado por: `SessionManager.prepareForward` (session-manager.service.ts:673)
  - `IEngine.getQrBase64()` · L379
    - implementado por: `BaileysEngine.getQrBase64` (baileys.engine.ts:573), `WWebJSEngine.getQrBase64` (wwebjs.engine.ts:431)
    - chamado por: `SessionManager.getQr` (session-manager.service.ts:533)
  - `IEngine.getPairingCode()` · L382
    - implementado por: `WWebJSEngine.getPairingCode` (wwebjs.engine.ts:434)
    - chamado por: `SessionManager.getPairingCode` (session-manager.service.ts:537)
  - `IEngine.getStatus()` · L383
    - implementado por: `BaileysEngine.getStatus` (baileys.engine.ts:569), `WWebJSEngine.getStatus` (wwebjs.engine.ts:428)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:541), `SessionManager.working` (session-manager.service.ts:703)
  - `IEngine.listChats(limit)` · L388
    - implementado por: `BaileysEngine.listChats` (baileys.engine.ts:2047), `WWebJSEngine.listChats` (wwebjs.engine.ts:2769)
    - chamado por: `SessionManager.listChats` (session-manager.service.ts:636)
  - `IEngine.fetchChatHistory(chatJid, limit)` · L389
    - implementado por: `BaileysEngine.fetchChatHistory` (baileys.engine.ts:2052), `WWebJSEngine.fetchChatHistory` (wwebjs.engine.ts:2789)
    - chamado por: `SessionManager.fetchChatHistory` (session-manager.service.ts:639)
  - `IEngine.setChatFlag(chatJid, flag, enabled)` · L393
    - implementado por: `BaileysEngine.setChatFlag` (baileys.engine.ts:2063), `WWebJSEngine.setChatFlag` (wwebjs.engine.ts:2844)
    - chamado por: `SessionManager.setChatFlag` (session-manager.service.ts:646)
  - `IEngine.listGroups()` · L396
    - implementado por: `BaileysEngine.listGroups` (baileys.engine.ts:2228), `WWebJSEngine.listGroups` (wwebjs.engine.ts:2872)
    - chamado por: `SessionManager.listGroups` (session-manager.service.ts:713)
  - `IEngine.groupInfo(jid)` · L397
    - implementado por: `BaileysEngine.groupInfo` (baileys.engine.ts:2236), `WWebJSEngine.groupInfo` (wwebjs.engine.ts:2900)
    - chamado por: `SessionManager.groupInfo` (session-manager.service.ts:716)
  - `IEngine.createGroup(subject, participants)` · L398
    - implementado por: `BaileysEngine.createGroup` (baileys.engine.ts:2244), `WWebJSEngine.createGroup` (wwebjs.engine.ts:3034)
    - chamado por: `SessionManager.createGroup` (session-manager.service.ts:719)
  - `IEngine.updateParticipants(jid, action, participants)` · L399
    - implementado por: `BaileysEngine.updateParticipants` (baileys.engine.ts:2252), `WWebJSEngine.updateParticipants` (wwebjs.engine.ts:3049)
    - chamado por: `SessionManager.updateParticipants` (session-manager.service.ts:726)
  - `IEngine.leaveGroup(jid)` · L404
    - implementado por: `BaileysEngine.leaveGroup` (baileys.engine.ts:2260), `WWebJSEngine.leaveGroup` (wwebjs.engine.ts:3062)
    - chamado por: `SessionManager.leaveGroup` (session-manager.service.ts:738)
  - `IEngine.setGroupSubject(jid, subject)` · L405
    - implementado por: `BaileysEngine.setGroupSubject` (baileys.engine.ts:2263), `WWebJSEngine.setGroupSubject` (wwebjs.engine.ts:3066)
    - chamado por: `SessionManager.setGroupSubject` (session-manager.service.ts:741)
  - `IEngine.setGroupDescription(jid, description)` · L406
    - implementado por: `BaileysEngine.setGroupDescription` (baileys.engine.ts:2266), `WWebJSEngine.setGroupDescription` (wwebjs.engine.ts:3070)
    - chamado por: `SessionManager.setGroupDescription` (session-manager.service.ts:748)
  - `IEngine.groupInviteCode(jid)` · L407
    - implementado por: `BaileysEngine.groupInviteCode` (baileys.engine.ts:2269), `WWebJSEngine.groupInviteCode` (wwebjs.engine.ts:3074)
    - chamado por: `SessionManager.groupInviteCode` (session-manager.service.ts:755)
  - `IEngine.groupRevokeInvite(jid)` · L408
    - implementado por: `BaileysEngine.groupRevokeInvite` (baileys.engine.ts:2272), `WWebJSEngine.groupRevokeInvite` (wwebjs.engine.ts:3078)
    - chamado por: `SessionManager.groupRevokeInvite` (session-manager.service.ts:758)
  - `IEngine.groupMembershipRequests(jid)` · L411
    - implementado por: `BaileysEngine.groupMembershipRequests` (baileys.engine.ts:2278), `WWebJSEngine.groupMembershipRequests` (wwebjs.engine.ts:3086)
    - chamado por: `SessionManager.groupMembershipRequests` (session-manager.service.ts:761)
  - `IEngine.groupMembershipAction(jid, action, participants)` · L412
    - implementado por: `BaileysEngine.groupMembershipAction` (baileys.engine.ts:2290), `WWebJSEngine.groupMembershipAction` (wwebjs.engine.ts:3104)
    - chamado por: `SessionManager.groupMembershipAction` (session-manager.service.ts:767)
  - `IEngine.setGroupSetting(jid, setting, enabled)` · L418
    - implementado por: `BaileysEngine.setGroupSetting` (baileys.engine.ts:2312), `WWebJSEngine.setGroupSetting` (wwebjs.engine.ts:3119)
    - chamado por: `SessionManager.setGroupSetting` (session-manager.service.ts:779)
  - `IEngine.setGroupPhoto(jid, image, mimetype)` · L424
    - implementado por: `BaileysEngine.setGroupPhoto` (baileys.engine.ts:2329), `WWebJSEngine.setGroupPhoto` (wwebjs.engine.ts:3130)
    - chamado por: `SessionManager.setGroupPhoto` (session-manager.service.ts:787)
  - `IEngine.checkNumbers(numbers)` · L427
    - implementado por: `BaileysEngine.checkNumbers` (baileys.engine.ts:2338), `WWebJSEngine.checkNumbers` (wwebjs.engine.ts:3141)
    - chamado por: `SessionManager.checkNumbers` (session-manager.service.ts:797)
  - `IEngine.profilePicture(jid)` · L428
    - implementado por: `BaileysEngine.profilePicture` (baileys.engine.ts:2353), `WWebJSEngine.profilePicture` (wwebjs.engine.ts:3152)
    - chamado por: `SessionManager.profilePicture` (session-manager.service.ts:800)
  - `IEngine.setBlock(jid, action)` · L429
    - implementado por: `BaileysEngine.setBlock` (baileys.engine.ts:2362), `WWebJSEngine.setBlock` (wwebjs.engine.ts:3163)
    - chamado por: `SessionManager.setBlock` (session-manager.service.ts:803)
  - `IEngine.saveContact(jid, input)` · L431
    - implementado por: `BaileysEngine.saveContact` (baileys.engine.ts:2365), `WWebJSEngine.saveContact` (wwebjs.engine.ts:3171)
    - chamado por: `SessionManager.saveContact` (session-manager.service.ts:810)
  - `IEngine.removeContact(jid)` · L433
    - implementado por: `BaileysEngine.removeContact` (baileys.engine.ts:2378), `WWebJSEngine.removeContact` (wwebjs.engine.ts:3182)
    - chamado por: `SessionManager.removeContact` (session-manager.service.ts:817)
  - `IEngine.createChannel(name, description)` · L436
    - implementado por: `BaileysEngine.createChannel` (baileys.engine.ts:2383), `WWebJSEngine.createChannel` (wwebjs.engine.ts:3187)
    - chamado por: `SessionManager.createChannel` (session-manager.service.ts:822)
  - `IEngine.channelInfo(jid)` · L437
    - implementado por: `BaileysEngine.channelInfo` (baileys.engine.ts:2390), `WWebJSEngine.channelInfo` (wwebjs.engine.ts:3205)
    - chamado por: `SessionManager.channelInfo` (session-manager.service.ts:829)
  - `IEngine.followChannel(jid)` · L438
    - implementado por: `BaileysEngine.followChannel` (baileys.engine.ts:2394), `WWebJSEngine.followChannel` (wwebjs.engine.ts:3218)
    - chamado por: `SessionManager.followChannel` (session-manager.service.ts:832)
  - `IEngine.unfollowChannel(jid)` · L439
    - implementado por: `BaileysEngine.unfollowChannel` (baileys.engine.ts:2397), `WWebJSEngine.unfollowChannel` (wwebjs.engine.ts:3222)
    - chamado por: `SessionManager.unfollowChannel` (session-manager.service.ts:835)

## `modules/sessions/application/session-config.service.ts`

65 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-config.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`

**class `SessionConfigService`** L15 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L17
- `get(sessionId)` · L20 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:191), `SessionsController.health` (sessions.controller.ts:182)
  - banco: `sessionConfig.upsert`
- `update(sessionId, patch)` · L28 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `SessionsController.patchConfig` (sessions.controller.ts:198)
  - banco: `sessionConfig.upsert`
- `capFor(cfg, state)` · L41
  - chamado por: `SessionsController.getConfig` (sessions.controller.ts:191), `SessionsController.health` (sessions.controller.ts:182), `SessionsController.patchConfig` (sessions.controller.ts:198)

**Tipos**
- type `SessionConfigPatch` L8
- interface `CapInfo` L10 · 2 propriedade(s)

## `modules/sessions/application/session-manager.pairing.spec.ts`

60 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.pairing.spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager.requestPairingCode (E12)” · L25
  - it “barra status WORKING antes de consultar creds ou iniciar socket” · L26
  - it “barra creds.me persistido de QR mesmo com registered=false” · L36
  - it “inicia sessão sem credenciais e encaminha o pedido sem sleep” · L51

## `modules/sessions/application/session-manager.service.ts`

839 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/session-manager.pairing.spec.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/setup-app.ts`

**class `SessionManager`** L52 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `prisma: PrismaService` · `config: ConfigService<Env, true>` · `eventBus: EventBus` · `proxyResolver: ProxyResolver` · `mediaStorage: MediaStorage` · `contactDirectory: ContactDirectory` · `engineFactory: EngineFactory` · `guardrail: GuardrailService`
- `logger` · L54 · private · campo
- `engines` · L55 · private · campo
- `names` · L56 · private · campo
- `lastStatusKey` · L60 · private · campo
- `statusWrites` · L63 · private · campo
- `constructor(repo, prisma, config, eventBus, proxyResolver, mediaStorage…)` · L65
- `onApplicationBootstrap()` · L77 · async
  - chama: `start` L385, `SessionRepository.findAutostart` (session.repository.ts:37)
- `onModuleDestroy()` · L103 · async
  - chama: `IEngine.shutdown` (engine.port.ts:338), `IEngine.stop` (engine.port.ts:330)
- `getOrCreateEngine(sessionId, engineType)` · L144 · private
  - chama: `ContactDirectory.lidMap` (contact-directory.service.ts:190), `ContactDirectory.namesFor` (contact-directory.service.ts:150), `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.recordMany` (contact-directory.service.ts:69), `MediaStorage.put` (media-storage.service.ts:103), `GuardrailService.recordReachoutRestriction` (guardrail.service.ts:456), `ProxyResolver.reportFailure` (proxy-resolver.service.ts:104), `ProxyResolver.resolveAgent` (proxy-resolver.service.ts:182), `ProxyResolver.resolveBaileysTransport` (proxy-resolver.service.ts:146), `ProxyResolver.resolveProxyConfig` (proxy-resolver.service.ts:127), `enqueueStatusWrite` L250, `handleEngineEvent` L274, `SessionRepository.updateLastErrorDetails` (session.repository.ts:32), `EngineFactory.create` (engine.factory.ts:11)
  - chamado por: `requestPairingCode` L541, `start` L385
  - banco: `sessionConfig.findUnique`
- `enqueueStatusWrite(sessionId, engine, operation, write)` · L250 · private
  - chamado por: `getOrCreateEngine` L144
- `handleEngineEvent(sessionId, name, payload)` · L274 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `persistStatus` L329, `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `getOrCreateEngine` L144
  - publica evento: `'wa.event'`
- `persistStatus(sessionId, p)` · L329 · private · async
  - chama: `discardOrphan` L359, `SessionRepository.updateStatus` (session.repository.ts:26)
  - chamado por: `handleEngineEvent` L274
- `discarding` · L356 · private · campo
- `discardOrphan(sessionId)` · L359 · private · async
  - chama: `IEngine.stop` (engine.port.ts:330)
  - chamado por: `persistStatus` L329
- `START_TIMEOUT_MS` · L383 · private · static · campo
- `start(sessionId)` · L385 · async
  - chama: `IEngine.start` (engine.port.ts:329), `getOrCreateEngine` L144, `startWithTimeout` L396, `SessionRepository.findById` (session.repository.ts:21)
  - chamado por: `newQr` L497, `onApplicationBootstrap` L77, `restart` L462, `SessionsController.create` (sessions.controller.ts:99), `SessionsController.start` (sessions.controller.ts:323)
- `startWithTimeout(sessionId, op)` · L396 · private · async
  - chama: `SessionRepository.updateStatus` (session.repository.ts:26)
  - chamado por: `requestPairingCode` L541, `start` L385
- `withTimeout(op, ms)` · L436 · private · async
  - chamado por: `logout` L468, `newQr` L497, `remove` L518, `stop` L458
- `stop(sessionId)` · L458 · async
  - chama: `IEngine.stop` (engine.port.ts:330), `withTimeout` L436
  - chamado por: `restart` L462, `SessionsController.stop` (sessions.controller.ts:330)
- `restart(sessionId)` · L462 · async
  - chama: `start` L385, `stop` L458
  - chamado por: `SessionsController.restart` (sessions.controller.ts:337)
- `logout(sessionId)` · L468 · async
  - chama: `IEngine.logout` (engine.port.ts:339), `withTimeout` L436, `SessionRepository.updateStatus` (session.repository.ts:26), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.logout` (sessions.controller.ts:344)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `newQr(sessionId)` · L497 · async
  - chama: `IEngine.stop` (engine.port.ts:330), `start` L385, `withTimeout` L436, `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.newQr` (sessions.controller.ts:375)
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`
- `remove(sessionId)` · L518 · async
  - chama: `IEngine.stop` (engine.port.ts:330), `withTimeout` L436, `SessionRepository.delete` (session.repository.ts:36), `WWebJSEngine.purgeAuthDir` (wwebjs.engine.ts:697)
  - chamado por: `SessionsController.remove` (sessions.controller.ts:351)
- `getQr(sessionId)` · L533
  - chama: `IEngine.getQrBase64` (engine.port.ts:379)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:359)
- `getPairingCode(sessionId)` · L537
  - chama: `IEngine.getPairingCode` (engine.port.ts:382)
  - chamado por: `SessionsController.qr` (sessions.controller.ts:359)
- `requestPairingCode(sessionId, phoneNumber)` · L541 · async
  - chama: `IEngine.getStatus` (engine.port.ts:383), `IEngine.requestPairingCode` (engine.port.ts:340), `IEngine.start` (engine.port.ts:329), `getOrCreateEngine` L144, `startWithTimeout` L396, `SessionRepository.findById` (session.repository.ts:21)
  - chamado por: `SessionsController.pairingCode` (sessions.controller.ts:382)
  - banco: `waSession.findUnique`
- `sendText(sessionId, to, text, opts)` · L575 · async
  - chama: `IEngine.sendText` (engine.port.ts:341), `sending` L694
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `MessagesController.sendText` (messages.controller.ts:616)
- `sendMedia(sessionId, to, input)` · L585 · async
  - chama: `IEngine.sendMedia` (engine.port.ts:346), `sending` L694
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `MessagesController.sendMedia` (messages.controller.ts:645), `MessagesController.sendMediaUrl` (messages.controller.ts:715)
- `sendLocation(sessionId, to, input)` · L593 · async
  - chama: `IEngine.sendLocation` (engine.port.ts:351), `sending` L694
  - chamado por: `MessagesController.sendLocation` (messages.controller.ts:787)
- `sendPoll(sessionId, to, input)` · L601 · async
  - chama: `IEngine.sendPoll` (engine.port.ts:355), `sending` L694
  - chamado por: `MessagesController.sendPoll` (messages.controller.ts:826)
- `sendPresence(sessionId, to, state)` · L609
  - chama: `IEngine.sendPresence` (engine.port.ts:359), `working` L703
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:142), `SessionsController.presence` (sessions.controller.ts:215)
- `setProfileStatus(sessionId, status)` · L617
  - chama: `IEngine.setProfileStatus` (engine.port.ts:361), `working` L703
  - chamado por: `SessionsController.profileStatus` (sessions.controller.ts:231)
- `setProfileName(sessionId, name)` · L620
  - chama: `IEngine.setProfileName` (engine.port.ts:362), `working` L703
  - chamado por: `SessionsController.profileName` (sessions.controller.ts:250)
- `setProfilePhoto(sessionId, image, mimetype)` · L623
  - chama: `IEngine.setProfilePhoto` (engine.port.ts:363), `working` L703
  - chamado por: `SessionsController.profilePhoto` (sessions.controller.ts:270)
- `markRead(sessionId, chatJid, msgId)` · L631
  - chama: `IEngine.markRead` (engine.port.ts:365), `working` L703
  - chamado por: `MessagesController.markRead` (messages.controller.ts:484)
- `listChats(sessionId, limit)` · L636
  - chama: `IEngine.listChats` (engine.port.ts:388), `working` L703
  - chamado por: `InboxSyncService.syncAll` (inbox-sync.service.ts:44)
- `fetchChatHistory(sessionId, chatJid, limit)` · L639
  - chama: `IEngine.fetchChatHistory` (engine.port.ts:389), `working` L703
  - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `setChatFlag(sessionId, chatJid, flag, enabled)` · L646
  - chama: `IEngine.setChatFlag` (engine.port.ts:393), `working` L703
  - chamado por: `MessagesController.chatFlag` (messages.controller.ts:410)
- `sendReaction(sessionId, chatJid, msgId, fromMe, emoji)` · L655 · async
  - chama: `IEngine.sendReaction` (engine.port.ts:369), `sending` L694
  - chamado por: `MessagesController.reaction` (messages.controller.ts:496)
- `prepareForward(sessionId, src)` · L673 · async
  - chama: `IEngine.prepareForward` (engine.port.ts:378), `PreparedForward.send` (engine.port.ts:292), `sending` L694, `working` L703
  - chamado por: `ForwardService.runReserved` (forward.service.ts:170)
- `sending(sessionId)` · L694 · private · async
  - chama: `GuardrailService.canSendMessage` (guardrail.service.ts:438), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6), `working` L703
  - chamado por: `prepareForward` L673, `sendLocation` L593, `sendMedia` L585, `sendPoll` L601, `sendReaction` L655, `sendText` L575
- `working(sessionId)` · L703 · private
  - chama: `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `channelInfo` L829, `checkNumbers` L797, `createChannel` L822, `createGroup` L719, `fetchChatHistory` L639, `followChannel` L832, `groupInfo` L716, `groupInviteCode` L755, `groupMembershipAction` L767, `groupMembershipRequests` L761, `groupRevokeInvite` L758, `leaveGroup` L738, `listChats` L636, `listGroups` L713, `markRead` L631, `prepareForward` L673, `profilePicture` L800, `removeContact` L817, `saveContact` L810, `sending` L694, `sendPresence` L609, `setBlock` L803, `setChatFlag` L646, `setGroupDescription` L748, `setGroupPhoto` L787, `setGroupSetting` L779, `setGroupSubject` L741, `setProfileName` L620, `setProfilePhoto` L623, `setProfileStatus` L617, `unfollowChannel` L835, `updateParticipants` L726
- `listGroups(sessionId)` · L713
  - chama: `IEngine.listGroups` (engine.port.ts:396), `working` L703
  - chamado por: `GroupsController.list` (groups.controller.ts:53)
- `groupInfo(sessionId, jid)` · L716
  - chama: `IEngine.groupInfo` (engine.port.ts:397), `working` L703
  - chamado por: `GroupsController.info` (groups.controller.ts:66), `GroupsController.leads` (groups.controller.ts:76)
- `createGroup(sessionId, subject, participants)` · L719
  - chama: `IEngine.createGroup` (engine.port.ts:398), `working` L703
  - chamado por: `GroupsController.create` (groups.controller.ts:58)
- `updateParticipants(sessionId, jid, action, participants)` · L726
  - chama: `IEngine.updateParticipants` (engine.port.ts:399), `working` L703
  - chamado por: `GroupsController.participants` (groups.controller.ts:100)
- `leaveGroup(sessionId, jid)` · L738
  - chama: `IEngine.leaveGroup` (engine.port.ts:404), `working` L703
  - chamado por: `GroupsController.leave` (groups.controller.ts:113)
- `setGroupSubject(sessionId, jid, subject)` · L741
  - chama: `IEngine.setGroupSubject` (engine.port.ts:405), `working` L703
  - chamado por: `GroupsController.subject` (groups.controller.ts:122)
- `setGroupDescription(sessionId, jid, description)` · L748
  - chama: `IEngine.setGroupDescription` (engine.port.ts:406), `working` L703
  - chamado por: `GroupsController.description` (groups.controller.ts:133)
- `groupInviteCode(sessionId, jid)` · L755
  - chama: `IEngine.groupInviteCode` (engine.port.ts:407), `working` L703
  - chamado por: `GroupsController.invite` (groups.controller.ts:146)
- `groupRevokeInvite(sessionId, jid)` · L758
  - chama: `IEngine.groupRevokeInvite` (engine.port.ts:408), `working` L703
  - chamado por: `GroupsController.revoke` (groups.controller.ts:157)
- `groupMembershipRequests(sessionId, jid)` · L761
  - chama: `IEngine.groupMembershipRequests` (engine.port.ts:411), `working` L703
  - chamado por: `GroupsController.membershipRequests` (groups.controller.ts:169)
- `groupMembershipAction(sessionId, jid, action, participants)` · L767
  - chama: `IEngine.groupMembershipAction` (engine.port.ts:412), `working` L703
  - chamado por: `GroupsController.membership` (groups.controller.ts:178)
- `setGroupSetting(sessionId, jid, setting, enabled)` · L779
  - chama: `IEngine.setGroupSetting` (engine.port.ts:418), `working` L703
  - chamado por: `GroupsController.settings` (groups.controller.ts:192)
- `setGroupPhoto(sessionId, jid, image, mimetype)` · L787
  - chama: `IEngine.setGroupPhoto` (engine.port.ts:424), `working` L703
  - chamado por: `GroupsController.photo` (groups.controller.ts:213)
- `checkNumbers(sessionId, numbers)` · L797
  - chama: `IEngine.checkNumbers` (engine.port.ts:427), `working` L703
  - chamado por: `ContactsController.check` (contacts.controller.ts:89)
- `profilePicture(sessionId, jid)` · L800
  - chama: `IEngine.profilePicture` (engine.port.ts:428), `working` L703
  - chamado por: `ContactsController.profilePicture` (contacts.controller.ts:106)
- `setBlock(sessionId, jid, action)` · L803
  - chama: `IEngine.setBlock` (engine.port.ts:429), `working` L703
  - chamado por: `ContactsController.block` (contacts.controller.ts:121)
- `saveContact(sessionId, jid, input)` · L810
  - chama: `IEngine.saveContact` (engine.port.ts:431), `working` L703
  - chamado por: `ContactsController.save` (contacts.controller.ts:140)
- `removeContact(sessionId, jid)` · L817
  - chama: `IEngine.removeContact` (engine.port.ts:433), `working` L703
  - chamado por: `ContactsController.remove` (contacts.controller.ts:164)
- `createChannel(sessionId, name, description)` · L822
  - chama: `IEngine.createChannel` (engine.port.ts:436), `working` L703
  - chamado por: `ChannelsController.create` (channels.controller.ts:29)
- `channelInfo(sessionId, jid)` · L829
  - chama: `IEngine.channelInfo` (engine.port.ts:437), `working` L703
  - chamado por: `ChannelsController.info` (channels.controller.ts:42)
- `followChannel(sessionId, jid)` · L832
  - chama: `IEngine.followChannel` (engine.port.ts:438), `working` L703
  - chamado por: `ChannelsController.follow` (channels.controller.ts:47)
- `unfollowChannel(sessionId, jid)` · L835
  - chama: `IEngine.unfollowChannel` (engine.port.ts:439), `working` L703
  - chamado por: `ChannelsController.unfollow` (channels.controller.ts:56)

## `modules/sessions/application/session-status-order.spec.ts`

163 linhas · caminho: `apps/gateway/src/modules/sessions/application/session-status-order.spec.ts`
- importa (interno): `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/application/session-manager.service.ts`

- describe “SessionManager — ordem das escritas de status da mesma sessão” · L8
  - it “espera o FAILED pendente antes de gravar WORKING do novo open” · L9
  - it “grava o diagnóstico do close após o WORKING pendente, sem apagá-lo” · L80

## `modules/sessions/domain/session-status.ts`

15 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_STATUSES` = `[ 'STOPPED', 'STARTING', 'SCAN_QR_CODE', 'PAIRING_CODE', 'WORKING', '…` · L2
- `ENGINES` = `['BAILEYS', 'WWEBJS'] as const` · L13

**Tipos**
- type `SessionStatus` L11
- type `Engine` L14

## `modules/sessions/domain/session.entity.ts`

24 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.entity.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`
- importado por: `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `Session`** L8
- injeta (construtor): `id: string` · `name: string` · `engine: Engine` · `status: SessionStatus` · `meJid: string | null` · `mePushName: string | null` · `phoneNumber: string | null` · `autostart: boolean` · `lastError: string | null` · `createdAt: Date` · `updatedAt: Date` · `lastErrorDetails: SessionErrorDetails | null`
- `constructor(id, name, engine, status, meJid, mePushName, phoneNumber, a…)` · L9
  - chamado por: `PrismaSessionRepository.toDomain` (prisma-session.repository.ts:38)

**Tipos**
- interface `SessionErrorDetails` L3 · 2 propriedade(s)

## `modules/sessions/domain/session.repository.ts`

41 linhas · caminho: `apps/gateway/src/modules/sessions/domain/session.repository.ts`
- importa (interno): `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/sessions/sessions.module.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`

**Funções e constantes de topo**
- `SESSION_REPOSITORY` = `Symbol('SESSION_REPOSITORY')` · L40

**Tipos**
- interface `CreateSessionInput` L4 · 5 propriedade(s)
- interface `StatusPatch` L12 · 4 propriedade(s)
- interface `SessionRepository` L19
  - `SessionRepository.create(input)` · L20
    - implementado por: `PrismaSessionRepository.create` (prisma-session.repository.ts:55)
    - chamado por: `SessionsController.create` (sessions.controller.ts:99)
  - `SessionRepository.findById(id)` · L21
    - implementado por: `PrismaSessionRepository.findById` (prisma-session.repository.ts:69)
    - chamado por: `SessionManager.requestPairingCode` (session-manager.service.ts:541), `SessionManager.start` (session-manager.service.ts:385), `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:99), `SessionsController.ensure` (sessions.controller.ts:411)
  - `SessionRepository.findByName(name)` · L22
    - implementado por: `PrismaSessionRepository.findByName` (prisma-session.repository.ts:74)
    - chamado por: `SessionRefPipe.transform` (session-ref.pipe.ts:21), `SessionsController.create` (sessions.controller.ts:99)
  - `SessionRepository.list()` · L23
    - implementado por: `PrismaSessionRepository.list` (prisma-session.repository.ts:79)
    - chamado por: `SessionsController.create` (sessions.controller.ts:99), `SessionsController.list` (sessions.controller.ts:156)
  - `SessionRepository.updateStatus(id, status, patch)` · L26
    - implementado por: `PrismaSessionRepository.updateStatus` (prisma-session.repository.ts:86)
    - chamado por: `SessionManager.logout` (session-manager.service.ts:468), `SessionManager.persistStatus` (session-manager.service.ts:329), `SessionManager.startWithTimeout` (session-manager.service.ts:396)
  - `SessionRepository.updateLastErrorDetails(id, details)` · L32
    - implementado por: `PrismaSessionRepository.updateLastErrorDetails` (prisma-session.repository.ts:122)
    - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:144)
  - `SessionRepository.delete(id)` · L36
    - implementado por: `PrismaSessionRepository.delete` (prisma-session.repository.ts:135)
    - chamado por: `SessionManager.remove` (session-manager.service.ts:518), `SessionsController.create` (sessions.controller.ts:99)
  - `SessionRepository.findAutostart()` · L37
    - implementado por: `PrismaSessionRepository.findAutostart` (prisma-session.repository.ts:139)
    - chamado por: `SessionManager.onApplicationBootstrap` (session-manager.service.ts:77)

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:609)
- `snapshot(reason)` · L35 · async
  - chamado por: `close` L71, `constructor` L23, `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:905)
  - banco: `waAuthKey.count`
- `close(reason)` · L71
  - chama: `snapshot` L35
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:609), `BaileysEngine.doLogout` (baileys.engine.ts:2519), `BaileysEngine.doStop` (baileys.engine.ts:2454), `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:905), `BaileysEngine.shutdown` (baileys.engine.ts:2497)

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
  - chamado por: `describeBaileysMessage` L192, `forwardableContent` L523, `mediaInfoOf` L106, `mapBaileysReaction` (baileys.engine.ts:268)
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
  - chamado por: `BaileysEngine.forwardTo` (baileys.engine.ts:1914), `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1173)
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
  - chamado por: `BaileysEngine.prepareForward` (baileys.engine.ts:1844)

**Tipos**
- type `BaileysDescribed` L27
- type `BaileysForwardContent` L505

## `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`

633 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`
- importa (interno): `shared-kernel/disconnect-stats.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`

- describe “matriz pura DisconnectReason da rc14” · L98
  - it “preserva código e razão brutos sem mudar o texto estável para dedup” · L114
- describe “Baileys — desconexão por código (E9/P-049)” · L129
  - it “401 limpa credenciais, para e não reconecta” · L130
  - it “405 publica alerta client_too_old e evita novas tentativas” · L165
  - it “515 reinicia sem gastar o orçamento de tentativas” · L196
  - it “515 repetido mais de três vezes corta o loop sem consumir tentativas comuns” · L206
  - it “440 admite no máximo uma retentativa tardia e não persiste terminal” · L227
  - it “QR durante a retentativa quieta 440 não publica SCAN_QR_CODE” · L286
  - it “440 duplicado antes do timer mantém uma única tentativa agendada” · L302
  - it “500 esgota cinco tentativas antes de DEGRADED” · L317
  - it “conta o código bruto uma vez por close, inclusive quando o status não muda” · L336
  - it “stop cancela o timer; novo start invalida a geração antiga” · L350
  - it “connection.update continua provisório; só o resultado direto do RPC confirma prazo” · L369
- describe “Baileys — versão por conexão (E9/P-049)” · L400
  - it “stop durante resolveAgent pendente não cria socket após o retorno tardio” · L401
  - it “retry 440 não publica STARTING nem deixa o estado local WORKING com socket fechado” · L444
  - it “não cacheia fallback, limita consulta, compartilha flight e isola override no canário” · L516

## `modules/sessions/infrastructure/baileys/baileys.engine.ts`

2561 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/directory/contact-directory.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`, `modules/sessions/infrastructure/message-content.ts`, `modules/sessions/infrastructure/baileys/baileys-content.ts`, `modules/sessions/infrastructure/baileys/upsert-decision.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/disconnect-stats.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/infrastructure/baileys/disconnect-policy.ts`, `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.forward.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.media.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.shutdown.spec.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.forward.spec.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.inbound.spec.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-reaction.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/wwebjs-engine.e2e-spec.ts`

**class `BaileysEngine`** L508 · `implements IEngine`
- injeta (construtor): `deps: BaileysEngineDeps`
- `engineName` · L509 · campo
  - implementa: `IEngine.engineName` (engine.port.ts)
- `sock` · L510 · private · campo
- `cacheObserver` · L511 · private · campo
- `pairingReadySock` · L512 · private · campo
- `createMediaDispatcher()` · L515 · private
- `status` · L517 · private · campo
- `qrBase64` · L518 · private · campo
- `stopped` · L519 · private · campo
- `reconnectAttempts` · L520 · private · campo
- `replacedRetryUsed` · L521 · private · campo
- `replacedRetryAttempted` · L522 · private · campo
- `restartRequiredStreak` · L523 · private · campo
- `lifecycle` · L529 · private · campo
- `sentMessages` · L531 · private · campo
- `seenUpserts` · L534 · private · campo
- `lidToPn` · L536 · private · campo
- `groupPushName` · L539 · private · campo
- `connectGeneration` · L544 · private · campo
- `timelockFetch` · L545 · private · campo
- `lastTimelockFetchAt` · L546 · private · campo
- `groupMetaCache` · L548 · private · campo
- `constructor(deps)` · L553
  - chamado por: `EngineFactory.create` (engine.factory.ts:11)
- `cacheGroupMeta(md)` · L555 · private
  - chamado por: `connect` L609, `groupInfo` L2236, `listGroups` L2228
- `clearReconnectTimer()` · L564 · private
  - chamado por: `doLogout` L2519, `doStop` L2454, `onConnectionUpdate` L905, `scheduleBudgetedReconnect` L1106, `scheduleReconnect` L1121, `shutdown` L2497, `start` L596
- `getStatus()` · L569
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
  - chamado por: `requestPairingCode` L2427
- `getQrBase64()` · L573
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `setStatus(status, extra)` · L577 · private
  - chamado por: `connect` L609, `doLogout` L2519, `doStop` L2454, `onConnectionUpdate` L905, `requestPairingCode` L2427, `scheduleBudgetedReconnect` L1106
- `serialize(fn)` · L587 · private
  - chamado por: `connect` L609, `logout` L2514, `scheduleReconnect` L1121, `start` L596, `stop` L2447
- `start()` · L596
  - implementa: `IEngine.start` (engine.port.ts:329)
  - chama: `clearReconnectTimer` L564, `connect` L609, `serialize` L587
- `connect(persistStartingStatus)` · L609 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.constructor` (baileys-cache-observer.ts:23), `cacheGroupMeta` L555, `detachSocketListeners` L2474, `loadMessageForRetry` L1986, `onConnectionUpdate` L905, `onContacts` L2139, `onMessageCapping` L1349, `onMessagesUpdate` L1287, `onMessagesUpsert` L1173, `onReactions` L800, `safe` L2021, `serialize` L587, `setStatus` L577, `latestBaileysVersion` L165, `browserFingerprint` (browser-fingerprint.ts:41), `usePostgresAuthState` (postgres-auth-state.ts:20)
  - chamado por: `scheduleReconnect` L1121, `start` L596
- `onReactions(reactions)` · L800 · private
  - chama: `learnPair` L836, `resolveChatJid` L829, `mapBaileysReaction` L268
  - chamado por: `connect` L609
- `resolveChatJid(jid)` · L829 · private
  - chamado por: `groupSenderOf` L863, `onReactions` L800
- `learnPair(a, b)` · L836 · private
  - chama: `learnLid` L843
  - chamado por: `onReactions` L800
- `learnLid(lid, pn)` · L843 · private
  - chama: `mergeLidMessages` L2096
  - chamado por: `groupSenderOf` L863, `learnPair` L836, `onMessagesUpsert` L1173
- `groupSenderOf(m)` · L863 · private
  - chama: `learnLid` L843, `rememberGroupPushName` L897, `resolveChatJid` L829, `phoneFirst` L295
  - chamado por: `onMessagesUpsert` L1173
- `rememberGroupPushName(pn, pushName)` · L897 · private
  - chamado por: `groupSenderOf` L863
- `onConnectionUpdate(update, eventSock)` · L905 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `BaileysCacheObserver.snapshot` (baileys-cache-observer.ts:35), `clearCredentials` L2545, `clearReconnectTimer` L564, `detachSocketListeners` L2474, `fetchReachoutTimelock` L1375, `scheduleBudgetedReconnect` L1106, `scheduleReconnect` L1121, `setStatus` L577, `warmLidCache` L2082, `classifyDisconnect` (disconnect-policy.ts:29), `disconnectDetails` (disconnect-policy.ts:12), `recordDisconnect` (disconnect-stats.ts:10), `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L609
- `scheduleBudgetedReconnect(details)` · L1106 · private
  - chama: `clearReconnectTimer` L564, `scheduleReconnect` L1121, `setStatus` L577
  - chamado por: `onConnectionUpdate` L905, `scheduleReconnect` L1121
- `scheduleReconnect(delay, details, retryAfterConnectFailure, quietStart)` · L1121 · private
  - chama: `clearReconnectTimer` L564, `connect` L609, `scheduleBudgetedReconnect` L1106, `serialize` L587
  - chamado por: `onConnectionUpdate` L905, `scheduleBudgetedReconnect` L1106
- `onMessagesUpsert(upsert)` · L1173 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `groupSenderOf` L863, `handleIncomingMedia` L1471, `learnLid` L843, `encodeProto` L247, `shouldAcceptUpsert` (upsert-decision.ts:8)
  - chamado por: `connect` L609
  - banco: `waMessage.findFirst`
- `onMessagesUpdate(updates)` · L1287 · private · async
  - chama: `fetchReachoutTimelock` L1375, `markMessage` L1452, `mapAckStatus` L314, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L609
- `onMessageCapping(info)` · L1349 · private · async
  - chama: `fetchReachoutTimelock` L1375, `cappingCycleEnd` L498, `recordProcessError` (process-errors.ts:9)
  - chamado por: `connect` L609
- `fetchReachoutTimelock()` · L1375 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `onConnectionUpdate` L905, `onMessageCapping` L1349, `onMessagesUpdate` L1287
- `markMessage(keyId, fromMe, field)` · L1452 · private
  - chamado por: `onMessagesUpdate` L1287
  - banco: `waMessage.updateMany`
- `handleIncomingMedia(m, base, media, original)` · L1471 · private · async
  - chama: `encodeProto` L247, `extOf` L300
  - chamado por: `onMessagesUpsert` L1173
- `sendText(to, text, opts)` · L1615 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `cacheSent` L1972, `resolveJid` L1789, `encodeProto` L247
- `sendMedia(to, input)` · L1648 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `cacheSent` L1972, `resolveJid` L1789, `buildMediaContent` L334, `encodeProto` L247, `extOf` L300
- `sendLocation(to, input)` · L1703 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `emitOutbound` L1757, `resolveJid` L1789, `formatLocation` (message-content.ts:83)
- `sendPoll(to, input)` · L1732 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `emitOutbound` L1757, `resolveJid` L1789, `formatPoll` (message-content.ts:124)
- `emitOutbound(sent, jid, type, text, opts)` · L1757 · private
  - chama: `cacheSent` L1972, `encodeProto` L247
  - chamado por: `sendLocation` L1703, `sendPoll` L1732
- `resolveJid(to)` · L1789 · private · async
  - chama: `toJid` L2556
  - chamado por: `forwardTo` L1914, `resolveParticipants` L2073, `sendLocation` L1703, `sendMedia` L1648, `sendPoll` L1732, `sendText` L1615
- `sendPresence(to, state)` · L1794 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `sk` L2040, `toJid` L2556
- `setProfileStatus(status)` · L1804 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `sk` L2040
- `setProfileName(name)` · L1807 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `sk` L2040
- `setProfilePhoto(image, _mimetype)` · L1810 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `sk` L2040
- `markRead(chatJid, msgId)` · L1818 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `sk` L2040, `toJid` L2556
- `sendReaction(chatJid, msgId, fromMe, emoji)` · L1826 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `toJid` L2556
- `prepareForward(src)` · L1844 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `forwardableContent` (baileys-content.ts:523), `forwardTo` L1914, `decodeProto` L250
  - banco: `waMessage.findMany`
- `forwardTo(message, src, to, opts)` · L1914 · private · async
  - chama: `describeBaileysMessage` (baileys-content.ts:192), `cacheSent` L1972, `resolveJid` L1789, `encodeProto` L247, `toJid` L2556
  - chamado por: `prepareForward` L1844
- `cacheSent(keyId, message)` · L1972 · private
  - chamado por: `emitOutbound` L1757, `forwardTo` L1914, `loadMessageForRetry` L1986, `sendMedia` L1648, `sendText` L1615
- `loadMessageForRetry(key)` · L1986 · private · async
  - chama: `cacheSent` L1972, `decodeProto` L250
  - chamado por: `connect` L609
  - banco: `waMessage.findFirst`
- `safe(fn, ctx)` · L2021 · private
  - chamado por: `connect` L609
- `sk()` · L2040 · private
  - chamado por: `channelInfo` L2390, `checkNumbers` L2338, `createChannel` L2383, `createGroup` L2244, `followChannel` L2394, `groupInfo` L2236, `groupInviteCode` L2269, `groupMembershipAction` L2290, `groupMembershipRequests` L2278, `groupRevokeInvite` L2272, `leaveGroup` L2260, `listGroups` L2228, `markRead` L1818, `profilePicture` L2353, `removeContact` L2378, `saveContact` L2365, `sendPresence` L1794, `setBlock` L2362, `setGroupDescription` L2266, `setGroupPhoto` L2329, `setGroupSetting` L2312, `setGroupSubject` L2263, `setProfileName` L1807, `setProfilePhoto` L1810, `setProfileStatus` L1804, `unfollowChannel` L2397, `updateParticipants` L2252
- `listChats(_limit)` · L2047 · async
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `fetchChatHistory(_chatJid, _limit)` · L2052 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `setChatFlag(_chatJid, _flag, _enabled)` · L2063 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `UnsupportedEngineOperationError.constructor` (engine.port.ts:319)
- `resolveParticipants(items)` · L2073 · private · async
  - chama: `resolveJid` L1789
  - chamado por: `createGroup` L2244, `groupMembershipAction` L2290, `updateParticipants` L2252
- `warmLidCache()` · L2082 · private · async
  - chama: `mergeKnownLids` L2119
  - chamado por: `onConnectionUpdate` L905
- `mergeLidMessages(lid, phoneJid)` · L2096 · private · async
  - chamado por: `learnLid` L843, `mergeKnownLids` L2119
  - banco: `messageReaction.updateMany`, `waMessage.updateMany`
- `mergeKnownLids()` · L2119 · private · async
  - chama: `mergeLidMessages` L2096
  - chamado por: `warmLidCache` L2082
  - banco: `waMessage.findMany`
- `onContacts(list)` · L2139 · private
  - chama: `contactToRecord` L222
  - chamado por: `connect` L609
- `recordGroupParticipants(groups)` · L2146 · private · async
  - chama: `resolveParticipantPhone` L372
  - chamado por: `groupInfo` L2236, `listGroups` L2228
- `resolveParticipantNames(groups)` · L2206 · private · async
  - chama: `resolveParticipantPhone` L372
  - chamado por: `groupInfo` L2236, `listGroups` L2228
- `listGroups()` · L2228 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `cacheGroupMeta` L555, `recordGroupParticipants` L2146, `resolveParticipantNames` L2206, `sk` L2040, `toGroupInfo` L422
- `groupInfo(jid)` · L2236 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
  - chama: `cacheGroupMeta` L555, `recordGroupParticipants` L2146, `resolveParticipantNames` L2206, `sk` L2040, `toGroupInfo` L422, `toGroupJid` L466
- `createGroup(subject, participants)` · L2244 · async
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `resolveParticipants` L2073, `sk` L2040, `toGroupInfo` L422
- `updateParticipants(jid, action, participants)` · L2252 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `resolveParticipants` L2073, `sk` L2040, `toGroupJid` L466
- `leaveGroup(jid)` · L2260 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `sk` L2040, `toGroupJid` L466
- `setGroupSubject(jid, subject)` · L2263 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `sk` L2040, `toGroupJid` L466
- `setGroupDescription(jid, description)` · L2266 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `sk` L2040, `toGroupJid` L466
- `groupInviteCode(jid)` · L2269 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `sk` L2040, `toGroupJid` L466
- `groupRevokeInvite(jid)` · L2272 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `sk` L2040, `toGroupJid` L466
- `groupMembershipRequests(jid)` · L2278 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `sk` L2040, `toGroupJid` L466
- `groupMembershipAction(jid, action, participants)` · L2290 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `resolveParticipants` L2073, `sk` L2040, `toGroupJid` L466
- `setGroupSetting(jid, setting, enabled)` · L2312 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `sk` L2040, `toGroupJid` L466
- `setGroupPhoto(jid, image, _mimetype)` · L2329 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `sk` L2040, `toGroupJid` L466
- `checkNumbers(numbers)` · L2338 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `sk` L2040
- `profilePicture(jid)` · L2353 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `sk` L2040, `toContactJid` L469
- `setBlock(jid, action)` · L2362 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `sk` L2040, `toContactJid` L469
- `saveContact(jid, input)` · L2365 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `sk` L2040, `toContactJid` L469
- `removeContact(jid)` · L2378 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `sk` L2040, `toContactJid` L469
- `createChannel(name, description)` · L2383 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `sk` L2040, `toChannelInfo` L455
- `channelInfo(jid)` · L2390 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `sk` L2040, `toChannelInfo` L455
- `followChannel(jid)` · L2394 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `sk` L2040
- `unfollowChannel(jid)` · L2397 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
  - chama: `sk` L2040
- `waitForPairingReady(sock)` · L2401 · private · async
  - chamado por: `requestPairingCode` L2427
- `requestPairingCode(phoneNumber)` · L2427 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `getStatus` L569, `setStatus` L577, `waitForPairingReady` L2401
- `stop()` · L2447
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L2454, `serialize` L587
- `doStop()` · L2454 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L564, `detachSocketListeners` L2474, `setStatus` L577
  - chamado por: `stop` L2447
- `detachSocketListeners()` · L2474 · private
  - chamado por: `connect` L609, `doLogout` L2519, `doStop` L2454, `onConnectionUpdate` L905, `shutdown` L2497
- `shutdown()` · L2497 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearReconnectTimer` L564, `detachSocketListeners` L2474
- `logout()` · L2514
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L2519, `serialize` L587
- `doLogout()` · L2519 · private · async
  - chama: `BaileysCacheObserver.close` (baileys-cache-observer.ts:71), `clearCredentials` L2545, `clearReconnectTimer` L564, `detachSocketListeners` L2474, `setStatus` L577
  - chamado por: `logout` L2514
- `clearCredentials()` · L2545 · private · async
  - chamado por: `doLogout` L2519, `onConnectionUpdate` L905
  - banco: `waAuthKey.deleteMany`, `waSession.updateMany`

**Funções e constantes de topo**
- `staleVersion()` · L159
  - chamado por: `latestBaileysVersion` L165
- `latestBaileysVersion(logger)` · L165 · async
  - chama: `staleVersion` L159
  - chamado por: `connect` L609
- `contactToRecord(c, source)` · L222
  - chamado por: `onContacts` L2139
- `encodeProto(msg)` · L247
  - chamado por: `emitOutbound` L1757, `forwardTo` L1914, `handleIncomingMedia` L1471, `onMessagesUpsert` L1173, `sendMedia` L1648, `sendText` L1615
- `decodeProto(value)` · L250
  - chamado por: `loadMessageForRetry` L1986, `prepareForward` L1844
- `mapBaileysReaction(key, reaction, ourJid)` · L268
  - chama: `toNum` (baileys-content.ts:81), `phoneFirst` L295
  - chamado por: `onReactions` L800
- `phoneFirst(a, b)` · L295
  - chamado por: `groupSenderOf` L863, `mapBaileysReaction` L268
- `extOf(mimetype, fileName)` · L300
  - chamado por: `handleIncomingMedia` L1471, `sendMedia` L1648
- `mapAckStatus(status)` · L314
  - chamado por: `onMessagesUpdate` L1287
- `buildMediaContent(input)` · L334
  - chamado por: `sendMedia` L1648
- `resolveParticipantPhone(p, lidToPn)` · L372
  - chamado por: `recordGroupParticipants` L2146, `resolveParticipantNames` L2206, `toGroupInfo` L422
- `dirNameFor(p, phone, names)` · L408
  - chamado por: `toGroupInfo` L422
- `toGroupInfo(md, lidToPn, names)` · L422
  - chama: `dirNameFor` L408, `resolveParticipantPhone` L372
  - chamado por: `createGroup` L2244, `groupInfo` L2236, `listGroups` L2228
- `toChannelInfo(md)` · L455
  - chamado por: `channelInfo` L2390, `createChannel` L2383
- `toGroupJid(jid)` · L466
  - chamado por: `groupInfo` L2236, `groupInviteCode` L2269, `groupMembershipAction` L2290, `groupMembershipRequests` L2278, `groupRevokeInvite` L2272, `leaveGroup` L2260, `setGroupDescription` L2266, `setGroupPhoto` L2329, `setGroupSetting` L2312, `setGroupSubject` L2263, `updateParticipants` L2252
- `toContactJid(jid)` · L469
  - chamado por: `profilePicture` L2353, `removeContact` L2378, `saveContact` L2365, `setBlock` L2362
- `cappingCycleEnd(value)` · L498
  - chamado por: `onMessageCapping` L1349
- `toJid(to)` · L2556
  - chamado por: `forwardTo` L1914, `markRead` L1818, `resolveJid` L1789, `sendPresence` L1794, `sendReaction` L1826

**Tipos**
- interface `BaileysEngineDeps` L81 · 18 propriedade(s)
- type `BaileysVersion` L140
- type `VersionSelection` L143
- type `RawParticipant` L361
- type `RawGroup` L388
- type `RawNewsletter` L398

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

165 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.pairing-roster.spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “Baileys rc14 — código de pareamento E12” · L70
  - it “recusa WORKING sem alterar credenciais nem chamar o socket” · L71
  - it “recusa creds.me de sessão pareada por QR mesmo com registered=false” · L79
  - it “espera connecting sem sleep fixo, normaliza o número e publica PAIRING_CODE” · L87
  - it “o primeiro QR também libera; timeout e close recusam sem chamar o socket” · L101
- describe “Baileys rc14 — roster LID E12” · L124
  - it “registra phoneNumber do roster, sem lookup local desnecessário” · L125
  - it “usa apenas lidMapping local quando falta phoneNumber e tira sufixo de device” · L141
  - it “mantém o LID anônimo quando o mapping local não tem PN” · L155

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:609)

**Tipos**
- type `BrowserFingerprint` L13

## `modules/sessions/infrastructure/baileys/disconnect-policy.ts`

80 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/baileys/disconnect-policy.ts`
- importa (interno): `modules/sessions/domain/session.entity.ts`
- importado por: `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `disconnectDetails(error)` · L12
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:905)
- `classifyDisconnect(code, _reason)` · L29
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:905)

**Tipos**
- type `DisconnectAction` L4

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
  - chamado por: `BaileysEngine.connect` (baileys.engine.ts:609)
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
  - chamado por: `BaileysEngine.onMessagesUpsert` (baileys.engine.ts:1173)

## `modules/sessions/infrastructure/engine.factory.ts`

17 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/engine.factory.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- importado por: `modules/sessions/application/session-manager.service.ts`, `modules/sessions/sessions.module.ts`

**class `EngineFactory`** L9 · @Injectable
- `create(engineType, deps)` · L11
  - chama: `BaileysEngine.constructor` (baileys.engine.ts:553), `WWebJSEngine.constructor` (wwebjs.engine.ts:415)
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:144)

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
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendLocation` (baileys.engine.ts:1703), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendLocation` (wwebjs.engine.ts:1726)
- `formatContacts(cards)` · L108
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)
- `formatPoll(name, options)` · L124
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `BaileysEngine.sendPoll` (baileys.engine.ts:1732), `describeWwebjsMessage` (wwebjs-content.ts:78), `WWebJSEngine.sendPoll` (wwebjs.engine.ts:1760)
- `formatEvent(name, description)` · L135
  - chama: `clean` L71
  - chamado por: `describeBaileysMessage` (baileys-content.ts:192), `describeWwebjsMessage` (wwebjs-content.ts:78)

**Tipos**
- interface `ContentMedia` L14 · 5 propriedade(s)
- type `DescribedMessage` L22

## `modules/sessions/infrastructure/prisma-session.repository.ts`

157 linhas · caminho: `apps/gateway/src/modules/sessions/infrastructure/prisma-session.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/domain/session-status.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`
- importado por: `modules/sessions/sessions.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`

**class `PrismaSessionRepository`** L34 · @Injectable · `implements SessionRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L36
- `toDomain(r)` · L38 · private
  - chama: `Session.constructor` (session.entity.ts:9), `parseErrorDetails` L26
  - chamado por: `create` L55, `findAutostart` L139, `findById` L69, `findByName` L74, `list` L79
- `create(input)` · L55 · async
  - implementa: `SessionRepository.create` (session.repository.ts:20)
  - chama: `toDomain` L38
  - banco: `waSession.create`
- `findById(id)` · L69 · async
  - implementa: `SessionRepository.findById` (session.repository.ts:21)
  - chama: `toDomain` L38
  - banco: `waSession.findUnique`
- `findByName(name)` · L74 · async
  - implementa: `SessionRepository.findByName` (session.repository.ts:22)
  - chama: `toDomain` L38
  - banco: `waSession.findUnique`
- `list()` · L79 · async
  - implementa: `SessionRepository.list` (session.repository.ts:23)
  - chama: `toDomain` L38
  - banco: `waSession.findMany`
- `updateStatus(id, status, patch)` · L86 · async
  - implementa: `SessionRepository.updateStatus` (session.repository.ts:26)
  - banco: `waSession.updateMany`
- `updateLastErrorDetails(id, details)` · L122 · async
  - implementa: `SessionRepository.updateLastErrorDetails` (session.repository.ts:32)
  - banco: `waSession.updateMany`
- `delete(id)` · L135 · async
  - implementa: `SessionRepository.delete` (session.repository.ts:36)
  - banco: `waSession.delete`
- `findAutostart()` · L139 · async
  - implementa: `SessionRepository.findAutostart` (session.repository.ts:37)
  - chama: `toDomain` L38
  - banco: `waSession.findMany`

**Funções e constantes de topo**
- `parseErrorDetails(value)` · L26
  - chamado por: `toDomain` L38

**Tipos**
- interface `Row` L11 · 12 propriedade(s)

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
  - implementa: `IEngine.getStatus` (engine.port.ts:383)
- `getQrBase64()` · L431
  - implementa: `IEngine.getQrBase64` (engine.port.ts:379)
- `getPairingCode()` · L434
  - implementa: `IEngine.getPairingCode` (engine.port.ts:382)
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
  - chamado por: `SessionManager.logout` (session-manager.service.ts:468), `SessionManager.newQr` (session-manager.service.ts:497), `SessionManager.remove` (session-manager.service.ts:518), `doLogout` L1558
- `start()` · L703
  - implementa: `IEngine.start` (engine.port.ts:329)
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
  - implementa: `IEngine.stop` (engine.port.ts:330)
  - chama: `doStop` L1507, `serialize` L419
- `doStop()` · L1507 · private · async
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `setStatus` L438
  - chamado por: `stop` L1500
- `shutdown()` · L1528 · async
  - implementa: `IEngine.shutdown` (engine.port.ts:338)
  - chama: `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `markCleanShutdown` L1453, `stopMemoryProfile` L476, `stopSyncWatchdog` L608
- `logout()` · L1553
  - implementa: `IEngine.logout` (engine.port.ts:339)
  - chama: `doLogout` L1558, `serialize` L419
- `doLogout()` · L1558 · private · async
  - chama: `raceStoreOp` L321, `closeAnonProxy` L1385, `destroyWithTimeout` L1403, `purgeAuthDir` L697, `setStatus` L438
  - chamado por: `logout` L1553
- `requestPairingCode(phoneNumber)` · L1590 · async
  - implementa: `IEngine.requestPairingCode` (engine.port.ts:340)
  - chama: `req` L2613, `setStatus` L438
- `sendText(to, text, opts)` · L1603 · async
  - implementa: `IEngine.sendText` (engine.port.ts:341)
  - chama: `assertPageResponsive` L2678, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `toMentionIds` L2053, `withLidFallback` L2445
- `sendMedia(to, input)` · L1633 · async
  - implementa: `IEngine.sendMedia` (engine.port.ts:346)
  - chama: `PendingMediaSendError.constructor` (engine.port.ts:24), `mediaDeadline` (wwebjs-media.ts:59), `SessionMediaQueue.run` (wwebjs-media.ts:11), `sendMediaQueued` L1652
- `sendMediaQueued(to, input)` · L1652 · private · async
  - chama: `extOf` L156, `assertPageResponsive` L2678, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `toMentionIds` L2053, `withLidFallback` L2445
  - chamado por: `sendMedia` L1633
- `sendLocation(to, input)` · L1726 · async
  - implementa: `IEngine.sendLocation` (engine.port.ts:351)
  - chama: `formatLocation` (message-content.ts:83), `assertPageResponsive` L2678, `emitOutbound` L1790, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `sendPoll(to, input)` · L1760 · async
  - implementa: `IEngine.sendPoll` (engine.port.ts:355)
  - chama: `formatPoll` (message-content.ts:124), `assertPageResponsive` L2678, `emitOutbound` L1790, `rememberPanel` L2350, `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `emitOutbound(keyId, jid, type, text, opts)` · L1790 · private
  - chamado por: `sendLocation` L1726, `sendPoll` L1760
- `setProfileStatus(status)` · L1812 · async
  - implementa: `IEngine.setProfileStatus` (engine.port.ts:361)
  - chama: `req` L2613
- `setProfileName(name)` · L1815 · async
  - implementa: `IEngine.setProfileName` (engine.port.ts:362)
  - chama: `req` L2613
- `setProfilePhoto(image, mimetype)` · L1818 · async
  - implementa: `IEngine.setProfilePhoto` (engine.port.ts:363)
  - chama: `req` L2613
- `sendPresence(to, state)` · L1823 · async
  - implementa: `IEngine.sendPresence` (engine.port.ts:359)
  - chama: `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `markRead(chatJid, _msgId)` · L1841 · async
  - implementa: `IEngine.markRead` (engine.port.ts:365)
  - chama: `req` L2613, `toChatId` L2608, `withLidFallback` L2445
- `sendReaction(_chatJid, msgId, _fromMe, emoji)` · L1850 · async
  - implementa: `IEngine.sendReaction` (engine.port.ts:369)
  - chama: `req` L2613, `withStoreReady` L2630
- `prepareForward(src)` · L1863 · async
  - implementa: `IEngine.prepareForward` (engine.port.ts:378)
  - chama: `ForwardSourceError.constructor` (engine.port.ts:302), `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsForwardBlock` (wwebjs-content.ts:210), `assertPageResponsive` L2678, `forwardTo` L1900, `req` L2613, `withStoreReady` L2630
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
  - implementa: `IEngine.listChats` (engine.port.ts:388)
  - chama: `req` L2613, `withStoreReady` L2630
- `fetchChatHistory(chatJid, limit)` · L2789 · async
  - implementa: `IEngine.fetchChatHistory` (engine.port.ts:389)
  - chama: `req` L2613, `toChatId` L2608, `toHistoryMessage` L2807, `withStoreReady` L2630
- `toHistoryMessage(msg)` · L2807 · private · async
  - chama: `describeWwebjsMessage` (wwebjs-content.ts:78), `wwebjsGroupSender` (wwebjs-content.ts:269), `mapInboundMediaType` L171, `resolveNumberJid` L2361
  - chamado por: `fetchChatHistory` L2789
- `setChatFlag(chatJid, flag, enabled)` · L2844 · async
  - implementa: `IEngine.setChatFlag` (engine.port.ts:393)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `listGroups()` · L2872 · async
  - implementa: `IEngine.listGroups` (engine.port.ts:396)
  - chama: `groupFlags` L190, `req` L2613, `withStoreReady` L2630
- `getGroupChat(jid)` · L2891 · private · async
  - chama: `req` L2613, `toGroupId` L3030, `withStoreReady` L2630
  - chamado por: `groupInfo` L2900, `groupInviteCode` L3074, `groupMembershipAction` L3104, `groupMembershipRequests` L3086, `groupRevokeInvite` L3078, `leaveGroup` L3062, `setGroupDescription` L3070, `setGroupPhoto` L3130, `setGroupSetting` L3119, `setGroupSubject` L3066, `updateParticipants` L3049
- `groupInfo(jid)` · L2900 · async
  - implementa: `IEngine.groupInfo` (engine.port.ts:397)
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
  - implementa: `IEngine.createGroup` (engine.port.ts:398)
  - chama: `groupInfo` L2900, `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `updateParticipants(jid, action, participants)` · L3049 · async
  - implementa: `IEngine.updateParticipants` (engine.port.ts:399)
  - chama: `getGroupChat` L2891, `toChatId` L2608
- `leaveGroup(jid)` · L3062 · async
  - implementa: `IEngine.leaveGroup` (engine.port.ts:404)
  - chama: `getGroupChat` L2891
- `setGroupSubject(jid, subject)` · L3066 · async
  - implementa: `IEngine.setGroupSubject` (engine.port.ts:405)
  - chama: `getGroupChat` L2891
- `setGroupDescription(jid, description)` · L3070 · async
  - implementa: `IEngine.setGroupDescription` (engine.port.ts:406)
  - chama: `getGroupChat` L2891
- `groupInviteCode(jid)` · L3074 · async
  - implementa: `IEngine.groupInviteCode` (engine.port.ts:407)
  - chama: `getGroupChat` L2891
- `groupRevokeInvite(jid)` · L3078 · async
  - implementa: `IEngine.groupRevokeInvite` (engine.port.ts:408)
  - chama: `getGroupChat` L2891
- `groupMembershipRequests(jid)` · L3086 · async
  - implementa: `IEngine.groupMembershipRequests` (engine.port.ts:411)
  - chama: `getGroupChat` L2891
- `groupMembershipAction(jid, action, participants)` · L3104 · async
  - implementa: `IEngine.groupMembershipAction` (engine.port.ts:412)
  - chama: `getGroupChat` L2891, `toChatId` L2608
- `setGroupSetting(jid, setting, enabled)` · L3119 · async
  - implementa: `IEngine.setGroupSetting` (engine.port.ts:418)
  - chama: `getGroupChat` L2891
- `setGroupPhoto(jid, image, mimetype)` · L3130 · async
  - implementa: `IEngine.setGroupPhoto` (engine.port.ts:424)
  - chama: `getGroupChat` L2891
- `checkNumbers(numbers)` · L3141 · async
  - implementa: `IEngine.checkNumbers` (engine.port.ts:427)
  - chama: `req` L2613, `withStoreReady` L2630
- `profilePicture(jid)` · L3152 · async
  - implementa: `IEngine.profilePicture` (engine.port.ts:428)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `setBlock(jid, action)` · L3163 · async
  - implementa: `IEngine.setBlock` (engine.port.ts:429)
  - chama: `req` L2613, `toChatId` L2608, `withStoreReady` L2630
- `saveContact(jid, input)` · L3171 · async
  - implementa: `IEngine.saveContact` (engine.port.ts:431)
  - chama: `req` L2613, `withStoreReady` L2630
- `removeContact(jid)` · L3182 · async
  - implementa: `IEngine.removeContact` (engine.port.ts:433)
  - chama: `req` L2613, `withStoreReady` L2630
- `createChannel(name, description)` · L3187 · async
  - implementa: `IEngine.createChannel` (engine.port.ts:436)
  - chama: `req` L2613, `withStoreReady` L2630
- `channelInfo(jid)` · L3205 · async
  - implementa: `IEngine.channelInfo` (engine.port.ts:437)
  - chama: `req` L2613, `withStoreReady` L2630
- `followChannel(jid)` · L3218 · async
  - implementa: `IEngine.followChannel` (engine.port.ts:438)
  - chama: `req` L2613, `withStoreReady` L2630
- `unfollowChannel(jid)` · L3222 · async
  - implementa: `IEngine.unfollowChannel` (engine.port.ts:439)
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
  - chama: `SessionRepository.findById` (session.repository.ts:21), `SessionRepository.findByName` (session.repository.ts:22)

## `modules/sessions/interface/sessions.controller.ts`

417 linhas · caminho: `apps/gateway/src/modules/sessions/interface/sessions.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/license.service.ts`, `modules/proxies/application/proxy.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/sessions/domain/session.entity.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/interface/dto.ts`
- importado por: `modules/sessions/sessions.module.ts`

**class `SessionsController`** L87 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions')
- injeta (construtor): `repo: @Inject(SESSION_REPOSITORY) SessionRepository` · `manager: SessionManager` · `license: LicenseService` · `guardrail: GuardrailService` · `sessionConfig: SessionConfigService` · `proxies: ProxyService`
- `constructor(repo, manager, license, guardrail, sessionConfig, proxies)` · L90
- `create(body)` · L99 · async · @Post · @MinRole('ADMIN')
  - chama: `LicenseService.effective` (license.service.ts:35), `MinRole` (roles.decorator.ts:8), `ProxyService.assignExclusive` (proxy.service.ts:232), `ProxyService.ensureAvailable` (proxy.service.ts:218), `SessionManager.start` (session-manager.service.ts:385), `SessionRepository.create` (session.repository.ts:20), `SessionRepository.delete` (session.repository.ts:36), `SessionRepository.findById` (session.repository.ts:21), `SessionRepository.findByName` (session.repository.ts:22), `SessionRepository.list` (session.repository.ts:23), `toDto` L45, `newId` (ulid.ts:4)
- `list(state)` · L156 · async · @Get
  - chama: `GuardrailService.statesFor` (guardrail.service.ts:617), `SessionRepository.list` (session.repository.ts:23), `toDto` L45
- `get(id)` · L176 · async · @Get(':id')
  - chama: `ensure` L411, `toDto` L45
- `health(id)` · L182 · async · @Get(':id/health')
  - chama: `GuardrailService.health` (guardrail.service.ts:591), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20)
- `getConfig(id)` · L191 · async · @Get(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.get` (session-config.service.ts:20), `configDto` L63
- `patchConfig(id, body)` · L198 · async · @Patch(':id/config')
  - chama: `GuardrailService.getState` (guardrail.service.ts:216), `SessionConfigService.capFor` (session-config.service.ts:41), `SessionConfigService.update` (session-config.service.ts:28), `configDto` L63
- `presence(id, body)` · L215 · async · @Post(':id/presence')
  - chama: `SessionManager.sendPresence` (session-manager.service.ts:609)
- `profileStatus(id, body)` · L231 · async · @Post(':id/profile/status')
  - chama: `SessionManager.setProfileStatus` (session-manager.service.ts:617)
- `profileName(id, body)` · L250 · async · @Post(':id/profile/name')
  - chama: `SessionManager.setProfileName` (session-manager.service.ts:620)
- `profilePhoto(id, body)` · L270 · async · @Post(':id/profile/photo')
  - chama: `SessionManager.setProfilePhoto` (session-manager.service.ts:623), `fetchImageByUrl` (safe-fetch.ts:204)
- `quarantine(id)` · L298 · @Post(':id/quarantine')
  - chama: `override` L318
- `warmup(id)` · L303 · @Post(':id/warmup')
  - chama: `override` L318
- `activate(id)` · L308 · @Post(':id/activate')
  - chama: `override` L318
- `pause(id)` · L313 · @Post(':id/pause')
  - chama: `override` L318
- `override(id, action)` · L318 · private · async
  - chama: `GuardrailService.setManualState` (guardrail.service.ts:575)
  - chamado por: `activate` L308, `pause` L313, `quarantine` L298, `warmup` L303
- `start(id)` · L323 · async · @Post(':id/start')
  - chama: `SessionManager.start` (session-manager.service.ts:385), `ensure` L411
- `stop(id)` · L330 · async · @Post(':id/stop')
  - chama: `SessionManager.stop` (session-manager.service.ts:458), `ensure` L411
- `restart(id)` · L337 · async · @Post(':id/restart')
  - chama: `SessionManager.restart` (session-manager.service.ts:462), `ensure` L411
- `logout(id)` · L344 · async · @Post(':id/logout')
  - chama: `SessionManager.logout` (session-manager.service.ts:468), `ensure` L411
- `remove(id)` · L351 · async · @Delete(':id') · @MinRole('ADMIN')
  - chama: `MinRole` (roles.decorator.ts:8), `SessionManager.remove` (session-manager.service.ts:518), `ensure` L411
- `qr(id)` · L359 · async · @Get(':id/qr')
  - chama: `SessionManager.getPairingCode` (session-manager.service.ts:537), `SessionManager.getQr` (session-manager.service.ts:533), `ensure` L411
- `newQr(id)` · L375 · async · @Post(':id/new-qr')
  - chama: `SessionManager.newQr` (session-manager.service.ts:497), `ensure` L411
- `pairingCode(id, body)` · L382 · async · @Post(':id/pairing-code')
  - chama: `SessionManager.requestPairingCode` (session-manager.service.ts:541), `ensure` L411
- `ensure(id)` · L411 · private · async
  - chama: `SessionRepository.findById` (session.repository.ts:21)
  - chamado por: `get` L176, `logout` L344, `newQr` L375, `pairingCode` L382, `qr` L359, `remove` L351, `restart` L337, `start` L323, `stop` L330

**Funções e constantes de topo**
- `toDto(s)` · L45
  - chamado por: `create` L99, `get` L176, `list` L156
- `configDto(c)` · L63
  - chamado por: `getConfig` L191, `patchConfig` L198

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
