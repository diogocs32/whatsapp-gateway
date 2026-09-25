<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `messaging`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/messaging/application/inbox-sync.service.ts` | 88 |
| `modules/messaging/application/message-persister.service.ts` | 69 |
| `modules/messaging/application/send-intent.decision.spec.ts` | 71 |
| `modules/messaging/application/send-intent.decision.ts` | 57 |
| `modules/messaging/application/send-intent.service.ts` | 121 |
| `modules/messaging/application/triage-status.spec.ts` | 107 |
| `modules/messaging/application/triage-status.ts` | 41 |
| `modules/messaging/domain/inbox.repository.ts` | 81 |
| `modules/messaging/domain/message.repository.ts` | 112 |
| `modules/messaging/infrastructure/prisma-inbox.repository.ts` | 204 |
| `modules/messaging/infrastructure/prisma-message.repository.ts` | 283 |
| `modules/messaging/interface/inbox.controller.ts` | 199 |
| `modules/messaging/interface/messages.controller.ts` | 720 |
| `modules/messaging/messaging.module.ts` | 28 |

## `modules/messaging/application/inbox-sync.service.ts`

88 linhas · caminho: `apps/gateway/src/modules/messaging/application/inbox-sync.service.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**class `InboxSyncService`** L15 · @Injectable
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `manager: SessionManager`
- `logger` · L17 · private · campo
- `constructor(repo, manager)` · L19
- `syncChat(sessionId, chatJid, limit)` · L25 · async
  - chama: `toInput` L65, `MessageRepository.saveHistorical` (message.repository.ts:70), `SessionManager.fetchChatHistory` (session-manager.service.ts:534)
  - chamado por: `syncAll` L44, `MessagesController.sync` (messages.controller.ts:290)
- `syncAll(sessionId, opts)` · L44 · async
  - chama: `syncChat` L25, `SessionManager.listChats` (session-manager.service.ts:531)
  - chamado por: `MessagesController.sync` (messages.controller.ts:290)
- `toInput(sessionId, h)` · L65 · private
  - chamado por: `syncChat` L25

## `modules/messaging/application/message-persister.service.ts`

69 linhas · caminho: `apps/gateway/src/modules/messaging/application/message-persister.service.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `MessagePersister`** L15 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `eventBus: EventBus`
- `logger` · L17 · private · campo
- `constructor(repo, eventBus)` · L19
- `onModuleInit()` · L24
  - chama: `MessageRepository.save` (message.repository.ts:66), `MessageRepository.updateStatusByKey` (message.repository.ts:77), `EventBus.subscribe` (event-bus.ts:26)
  - assina evento: `'wa.event'`

## `modules/messaging/application/send-intent.decision.spec.ts`

71 linhas · caminho: `apps/gateway/src/modules/messaging/application/send-intent.decision.spec.ts`
- importa (interno): `modules/messaging/application/send-intent.decision.ts`

- describe “decideOnExistingIntent” · L22
  - it “mesma key com payload diferente → conflict (antes de qualquer outra regra)” · L23
  - it “já enviada → replay com keyId/chatJid gravados” · L32
  - it “pending recente → in-flight; pending antiga (processo caiu) → takeover” · L42
  - it “failed → takeover (retry com a mesma key é permitido)” · L55
- describe “sendFingerprint” · L62
  - it “é estável à ordem das chaves e sensível ao conteúdo” · L63

## `modules/messaging/application/send-intent.decision.ts`

57 linhas · caminho: `apps/gateway/src/modules/messaging/application/send-intent.decision.ts`
- importado por: `modules/messaging/application/send-intent.decision.spec.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/interface/messages.controller.ts`

**Funções e constantes de topo**
- `PENDING_INTENT_TTL_MS` = `2 * 60_000` · L27
- `decideOnExistingIntent(row, fingerprint, now, pendingTtlMs)` · L29
  - chamado por: `SendIntentService.reserve` (send-intent.service.ts:26)
- `sendFingerprint(parts)` · L53
  - chamado por: `MessagesController.sendMedia` (messages.controller.ts:509), `MessagesController.sendWithIntent` (messages.controller.ts:447)

**Tipos**
- interface `ExistingIntent` L11 · 5 propriedade(s)
- type `IntentDecision` L19

## `modules/messaging/application/send-intent.service.ts`

121 linhas · caminho: `apps/gateway/src/modules/messaging/application/send-intent.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/application/send-intent.decision.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**class `SendIntentService`** L20 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `logger` · L22 · private · campo
- `constructor(prisma)` · L24
- `reserve(sessionId, idempotencyKey, fingerprint)` · L26 · async
  - chama: `decideOnExistingIntent` (send-intent.decision.ts:29), `newId` (ulid.ts:4)
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:447)
  - banco: `sendIntent.create`, `sendIntent.findUnique`, `sendIntent.updateMany`
- `complete(intentId, keyId, chatJid)` · L88 · async
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:447)
  - banco: `sendIntent.update`
- `fail(intentId, error)` · L105 · async
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:447)
  - banco: `sendIntent.update`
- `PENDING_TTL_MS` · L119 · static · campo

**Tipos**
- type `ReserveResult` L9

## `modules/messaging/application/triage-status.spec.ts`

107 linhas · caminho: `apps/gateway/src/modules/messaging/application/triage-status.spec.ts`
- importa (interno): `modules/messaging/application/triage-status.ts`

- describe “deriveTriageStatus (semáforo da caixa única)” · L18
  - it “última mensagem é do contato e nada foi feito → pending (🔴)” · L19
  - it “respondi pelo CELULAR (fromMe, source=phone) → answered (🟢) sem tocar no painel” · L23
  - it “marquei "não preciso responder" na entrada atual → ignored (🟡)” · L27
  - it “REGRA DE OURO: entrada NOVA depois do amarelo → volta a pending (🔴)” · L38
  - it “REGRA DE OURO: entrada NOVA depois de respondido → volta a pending (🔴)” · L51
  - it “resposta vence a marca amarela: respondi depois de ter marcado → answered (🟢)” · L57
  - it “marca sem keyId (âncora por tempo): entrada mais nova invalida, entrada antiga não” · L69
  - it “keyId da entrada desconhecido mas marca com keyId → decide pelo tempo (não trava em 🟡)” · L94

## `modules/messaging/application/triage-status.ts`

41 linhas · caminho: `apps/gateway/src/modules/messaging/application/triage-status.ts`
- importa (interno): `modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/application/triage-status.spec.ts`, `modules/messaging/interface/inbox.controller.ts`

**Funções e constantes de topo**
- `deriveTriageStatus(input)` · L22
  - chama: `isTriageAnchorCurrent` L31
  - chamado por: `InboxController.conversations` (inbox.controller.ts:107)
- `isTriageAnchorCurrent(input)` · L31
  - chamado por: `deriveTriageStatus` L22

**Tipos**
- interface `TriageInput` L4 · 5 propriedade(s)

## `modules/messaging/domain/inbox.repository.ts`

81 linhas · caminho: `apps/gateway/src/modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/application/triage-status.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/messaging.module.ts`

**Funções e constantes de topo**
- `INBOX_REPOSITORY` = `Symbol('INBOX_REPOSITORY')` · L80

**Tipos**
- type `TriageStatus` L12
- interface `InboxConversationRow` L16 · 17 propriedade(s)
- interface `InboxFeedRow` L38 · 11 propriedade(s)
- interface `InboxRepository` L52
  - `InboxRepository.listConversations(opts)` · L54
    - implementado por: `PrismaInboxRepository.listConversations` (prisma-inbox.repository.ts:44)
    - chamado por: `InboxController.conversations` (inbox.controller.ts:107)
  - `InboxRepository.listFeed(opts)` · L59
    - implementado por: `PrismaInboxRepository.listFeed` (prisma-inbox.repository.ts:125)
    - chamado por: `InboxController.messages` (inbox.controller.ts:144)
  - `InboxRepository.findLastInbound(sessionId, chatJid)` · L65
    - implementado por: `PrismaInboxRepository.findLastInbound` (prisma-inbox.repository.ts:158)
    - chamado por: `InboxController.triage` (inbox.controller.ts:158)
  - `InboxRepository.markIgnored(input)` · L70
    - implementado por: `PrismaInboxRepository.markIgnored` (prisma-inbox.repository.ts:171)
    - chamado por: `InboxController.triage` (inbox.controller.ts:158)
  - `InboxRepository.clearTriage(sessionId, chatJid)` · L77
    - implementado por: `PrismaInboxRepository.clearTriage` (prisma-inbox.repository.ts:198)
    - chamado por: `InboxController.triage` (inbox.controller.ts:158)

## `modules/messaging/domain/message.repository.ts`

112 linhas · caminho: `apps/gateway/src/modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**Funções e constantes de topo**
- `MESSAGE_REPOSITORY` = `Symbol('MESSAGE_REPOSITORY')` · L111

**Tipos**
- interface `SaveMessageInput` L1 · 17 propriedade(s)
- interface `StoredMessage` L24 · 17 propriedade(s)
- interface `ConversationSummary` L49 · 7 propriedade(s)
- interface `IdempotentHit` L60 · 2 propriedade(s)
- interface `MessageRepository` L65
  - `MessageRepository.save(input)` · L66
    - implementado por: `PrismaMessageRepository.save` (prisma-message.repository.ts:16)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.saveHistorical(inputs)` · L70
    - implementado por: `PrismaMessageRepository.saveHistorical` (prisma-message.repository.ts:56)
    - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
  - `MessageRepository.findByIdempotencyKey(sessionId, idempotencyKey)` · L72
    - implementado por: `PrismaMessageRepository.findByIdempotencyKey` (prisma-message.repository.ts:100)
    - chamado por: `MessagesController.deduped` (messages.controller.ts:432)
  - `MessageRepository.updateStatusByKey(sessionId, keyId, status)` · L77
    - implementado por: `PrismaMessageRepository.updateStatusByKey` (prisma-message.repository.ts:131)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.findByKeyId(sessionId, keyId)` · L83
    - implementado por: `PrismaMessageRepository.findByKeyId` (prisma-message.repository.ts:111)
    - chamado por: `MessagesController.markRead` (messages.controller.ts:389), `MessagesController.reaction` (messages.controller.ts:401)
  - `MessageRepository.listByChat(sessionId, chatJids, limit)` · L87
    - implementado por: `PrismaMessageRepository.listByChat` (prisma-message.repository.ts:200)
    - chamado por: `MessagesController.list` (messages.controller.ts:225)
  - `MessageRepository.findByRef(sessionId, ref)` · L94
    - implementado por: `PrismaMessageRepository.findByRef` (prisma-message.repository.ts:236)
    - chamado por: `MessagesController.downloadMedia` (messages.controller.ts:351)
  - `MessageRepository.listConversations(sessionId, limit)` · L96
    - implementado por: `PrismaMessageRepository.listConversations` (prisma-message.repository.ts:250)
    - chamado por: `MessagesController.conversations` (messages.controller.ts:215)
  - `MessageRepository.searchMessages(sessionId, query, chatJids, limit)` · L103
    - implementado por: `PrismaMessageRepository.searchMessages` (prisma-message.repository.ts:213)
    - chamado por: `MessagesController.search` (messages.controller.ts:254)

## `modules/messaging/infrastructure/prisma-inbox.repository.ts`

204 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-inbox.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaInboxRepository`** L15 · @Injectable · `implements InboxRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L17
- `chatFilter()` · L20 · private · getter
- `sessionFilter(sessionRefs)` · L31 · private
  - chamado por: `listConversations` L44, `listFeed` L125
- `listConversations(opts)` · L44 · async
  - implementa: `InboxRepository.listConversations` (inbox.repository.ts:54)
  - chama: `sessionFilter` L31
- `listFeed(opts)` · L125 · async
  - implementa: `InboxRepository.listFeed` (inbox.repository.ts:59)
  - chama: `sessionFilter` L31
- `findLastInbound(sessionId, chatJid)` · L158 · async
  - implementa: `InboxRepository.findLastInbound` (inbox.repository.ts:65)
  - banco: `waMessage.findFirst`
- `markIgnored(input)` · L171 · async
  - implementa: `InboxRepository.markIgnored` (inbox.repository.ts:70)
  - chama: `newId` (ulid.ts:4)
  - banco: `conversationTriage.upsert`
- `clearTriage(sessionId, chatJid)` · L198 · async
  - implementa: `InboxRepository.clearTriage` (inbox.repository.ts:77)
  - banco: `conversationTriage.deleteMany`

## `modules/messaging/infrastructure/prisma-message.repository.ts`

283 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-message.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaMessageRepository`** L12 · @Injectable · `implements MessageRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L14
- `save(input)` · L16 · async
  - implementa: `MessageRepository.save` (message.repository.ts:66)
  - chama: `newId` (ulid.ts:4)
  - banco: `waMessage.create`
- `saveHistorical(inputs)` · L56 · async
  - implementa: `MessageRepository.saveHistorical` (message.repository.ts:70)
  - chama: `newId` (ulid.ts:4)
  - banco: `waMessage.createMany`, `waMessage.findMany`
- `findByIdempotencyKey(sessionId, idempotencyKey)` · L100 · async
  - implementa: `MessageRepository.findByIdempotencyKey` (message.repository.ts:72)
  - banco: `waMessage.findUnique`
- `findByKeyId(sessionId, keyId)` · L111 · async
  - implementa: `MessageRepository.findByKeyId` (message.repository.ts:83)
  - banco: `waMessage.findFirst`
- `ACK_RANK` · L125 · private · static · campo
- `updateStatusByKey(sessionId, keyId, status)` · L131 · async
  - implementa: `MessageRepository.updateStatusByKey` (message.repository.ts:77)
- `toStored(r)` · L160 · private
  - chamado por: `findByRef` L236, `listByChat` L200, `searchMessages` L213
- `listByChat(sessionId, chatJids, limit)` · L200 · async
  - implementa: `MessageRepository.listByChat` (message.repository.ts:87)
  - chama: `toStored` L160
  - banco: `waMessage.findMany`
- `searchMessages(sessionId, query, chatJids, limit)` · L213 · async
  - implementa: `MessageRepository.searchMessages` (message.repository.ts:103)
  - chama: `toStored` L160
  - banco: `waMessage.findMany`
- `findByRef(sessionId, ref)` · L236 · async
  - implementa: `MessageRepository.findByRef` (message.repository.ts:94)
  - chama: `toStored` L160
  - banco: `waMessage.findFirst`
- `listConversations(sessionId, limit)` · L250 · async
  - implementa: `MessageRepository.listConversations` (message.repository.ts:96)

## `modules/messaging/interface/inbox.controller.ts`

199 linhas · caminho: `apps/gateway/src/modules/messaging/interface/inbox.controller.ts`
- importa (interno): `shared-kernel/query-int.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/messaging/application/triage-status.ts`, `modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `InboxController`** L98 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('inbox')
- injeta (construtor): `repo: @Inject(INBOX_REPOSITORY) InboxRepository`
- `constructor(repo)` · L101
- `conversations(limit, sessions, status)` · L107 · async · @Get('conversations')
  - chama: `deriveTriageStatus` (triage-status.ts:22), `InboxRepository.listConversations` (inbox.repository.ts:54), `parseSessionFilter` L42, `toConversationDto` L56, `clampInt` (query-int.ts:4)
- `messages(limit, sessions)` · L144 · async · @Get('messages')
  - chama: `InboxRepository.listFeed` (inbox.repository.ts:59), `parseSessionFilter` L42, `clampInt` (query-int.ts:4)
- `triage(sessionId, body)` · L158 · async · @Post('sessions/:id/triage')
  - chama: `InboxRepository.clearTriage` (inbox.repository.ts:77), `InboxRepository.findLastInbound` (inbox.repository.ts:65), `InboxRepository.markIgnored` (inbox.repository.ts:70), `isExcludedChat` L52

**Funções e constantes de topo**
- `triageSchema` = `z.object({ chatJid: z.string().min(5).max(80), state: z.enum(['ignore…` · L31
- `parseSessionFilter(raw)` · L42
  - chamado por: `conversations` L107, `messages` L144
- `isExcludedChat(chatJid)` · L52
  - chamado por: `triage` L158
- `toConversationDto(row, status)` · L56
  - chamado por: `conversations` L107
- `toFeedDto(row)` · L79

## `modules/messaging/interface/messages.controller.ts`

720 linhas · caminho: `apps/gateway/src/modules/messaging/interface/messages.controller.ts`
- importa (interno): `bootstrap/config.ts`, `infra/storage/media-storage.service.ts`, `shared-kernel/query-int.ts`, `shared-kernel/safe-fetch.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/send-intent.decision.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `MessagesController`** L187 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/messages')
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `manager: SessionManager` · `mediaStorage: MediaStorage` · `guardrail: GuardrailService` · `inboxSync: InboxSyncService` · `intents: SendIntentService` · `config: ConfigService<Env, true>`
- `logger` · L190 · private · campo
- `constructor(repo, manager, mediaStorage, guardrail, inboxSync, intents,…)` · L192
- `assertColdAllowed(id, cold)` · L206 · private · async
  - chama: `GuardrailService.canSendCold` (guardrail.service.ts:406), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6)
  - chamado por: `sendWithIntent` L447
- `conversations(id, limit)` · L215 · async · @Get('conversations')
  - chama: `MessageRepository.listConversations` (message.repository.ts:96), `clampInt` (query-int.ts:4)
- `list(id, chatId, limit)` · L225 · async · @Get
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `MessageRepository.listByChat` (message.repository.ts:87), `candidateJids` L130, `toDto` L163, `clampInt` (query-int.ts:4)
- `search(id, q, chatId, limit)` · L254 · async · @Get('search')
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `MessageRepository.searchMessages` (message.repository.ts:103), `candidateJids` L130, `toDto` L163, `clampInt` (query-int.ts:4)
- `sync(id, body)` · L290 · async · @Post('sync')
  - chama: `InboxSyncService.syncAll` (inbox-sync.service.ts:44), `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `chatFlag(id, chatId, body)` · L319 · async · @Post(':chatId/flag')
  - chama: `SessionManager.setChatFlag` (session-manager.service.ts:541)
- `downloadMedia(id, msgId)` · L351 · async · @Get(':msgId/media')
  - chama: `MediaStorage.getObject` (media-storage.service.ts:118), `MessageRepository.findByRef` (message.repository.ts:94)
- `markRead(id, msgId)` · L389 · async · @Post(':msgId/read')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:83), `SessionManager.markRead` (session-manager.service.ts:526)
- `reaction(id, msgId, body)` · L401 · async · @Post(':msgId/reaction')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:83), `SessionManager.sendReaction` (session-manager.service.ts:550)
- `deduped(id, idempotencyKey)` · L432 · private · async
  - chama: `MessageRepository.findByIdempotencyKey` (message.repository.ts:72)
  - chamado por: `sendWithIntent` L447
- `sendWithIntent(id, input, send)` · L447 · private · async
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `SendIntentService.complete` (send-intent.service.ts:88), `SendIntentService.fail` (send-intent.service.ts:105), `SendIntentService.reserve` (send-intent.service.ts:26), `assertColdAllowed` L206, `deduped` L432
  - chamado por: `sendLocation` L645, `sendMedia` L509, `sendMediaUrl` L573, `sendPoll` L684, `sendText` L483
- `sendText(id, body)` · L483 · async · @Post('text')
  - chama: `sendWithIntent` L447, `SessionManager.sendText` (session-manager.service.ts:466)
- `sendMedia(id, req)` · L509 · async · @Post('media')
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `inferType` L119, `sendWithIntent` L447, `SessionManager.sendMedia` (session-manager.service.ts:480)
- `sendMediaUrl(id, body)` · L573 · async · @Post('media-url')
  - chama: `inferType` L119, `sendWithIntent` L447, `SessionManager.sendMedia` (session-manager.service.ts:480), `egressPolicyFromEnv` (safe-fetch.ts:23), `safeFetch` (safe-fetch.ts:186)
- `sendLocation(id, body)` · L645 · async · @Post('location')
  - chama: `sendWithIntent` L447, `SessionManager.sendLocation` (session-manager.service.ts:488)
- `sendPoll(id, body)` · L684 · async · @Post('poll')
  - chama: `sendWithIntent` L447, `SessionManager.sendPoll` (session-manager.service.ts:496)

**Funções e constantes de topo**
- `coldField` = `z.boolean().optional()` · L53
- `idempotencyKeyField` = `z.string().min(1).max(200).optional()` · L54
- `mentionsField` = `z.array(z.string().min(5).max(40)).max(50).optional()` · L57
- `inboxSyncSchema` = `z.object({ chatId: z.string().min(3).max(40).optional(), limit: z.num…` · L60
- `chatFlagSchema` = `z.object({ flag: z.enum(['archive', 'pin', 'mute', 'unread']), enable…` · L67
- `sendTextSchema` = `z.object({ to: z.string().min(5).max(40), text: z.string().min(1).max…` · L72
- `sendMediaUrlSchema` = `z.object({ to: z.string().min(5).max(40), url: z.string().url(), type…` · L82
- `reactionSchema` = `z.object({ emoji: z.string().max(20) })` · L95
- `sendLocationSchema` = `z.object({ to: z.string().min(5).max(40), latitude: z.number().min(-9…` · L98
- `sendPollSchema` = `z.object({ to: z.string().min(5).max(40), name: z.string().min(1).max…` · L109
- `inferType(mimetype)` · L119
  - chamado por: `sendMedia` L509, `sendMediaUrl` L573
- `candidateJids(chatId)` · L130
  - chamado por: `list` L225, `search` L254
- `toConversationDto(c)` · L151
- `toDto(m, mediaUrl)` · L163
  - chamado por: `list` L225, `search` L254

## `modules/messaging/messaging.module.ts`

28 linhas · caminho: `apps/gateway/src/modules/messaging/messaging.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/inbox.repository.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`
- importado por: `app.module.ts`

**@Module `MessagingModule`** L15
- imports: `[IamModule, SessionsModule, GuardrailModule]`
- controllers: `[MessagesController, InboxController]`
- providers: `[ MessagePersister, InboxSyncService, SendIntentService, { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository }, // Caixa única de triagem (página Atendimento): leitura agregada de todas as sessões. { provide: INBOX_REPOSITORY, useClass: PrismaInboxRepository }, ]`

**class `MessagingModule`** L15 · @Module({ imports: [IamModule, SessionsModule, GuardrailModule], co…)
