<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `messaging`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/messaging/application/inbox-sync.service.ts` | 90 |
| `modules/messaging/application/message-persister.service.ts` | 71 |
| `modules/messaging/application/reaction-key.spec.ts` | 115 |
| `modules/messaging/application/reaction-key.ts` | 47 |
| `modules/messaging/application/reaction-persister.service.ts` | 46 |
| `modules/messaging/application/send-intent.decision.spec.ts` | 71 |
| `modules/messaging/application/send-intent.decision.ts` | 57 |
| `modules/messaging/application/send-intent.service.ts` | 121 |
| `modules/messaging/application/triage-status.spec.ts` | 107 |
| `modules/messaging/application/triage-status.ts` | 41 |
| `modules/messaging/domain/inbox.repository.ts` | 86 |
| `modules/messaging/domain/message.repository.ts` | 117 |
| `modules/messaging/domain/reaction.repository.ts` | 35 |
| `modules/messaging/infrastructure/prisma-inbox.repository.ts` | 207 |
| `modules/messaging/infrastructure/prisma-message.repository.ts` | 291 |
| `modules/messaging/infrastructure/prisma-reaction.repository.ts` | 64 |
| `modules/messaging/interface/inbox.controller.ts` | 203 |
| `modules/messaging/interface/messages.controller.ts` | 755 |
| `modules/messaging/messaging.module.ts` | 34 |

## `modules/messaging/application/inbox-sync.service.ts`

90 linhas · caminho: `apps/gateway/src/modules/messaging/application/inbox-sync.service.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**class `InboxSyncService`** L15 · @Injectable
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `manager: SessionManager`
- `logger` · L17 · private · campo
- `constructor(repo, manager)` · L19
- `syncChat(sessionId, chatJid, limit)` · L25 · async
  - chama: `toInput` L65, `MessageRepository.saveHistorical` (message.repository.ts:75), `SessionManager.fetchChatHistory` (session-manager.service.ts:534)
  - chamado por: `syncAll` L44, `MessagesController.sync` (messages.controller.ts:316)
- `syncAll(sessionId, opts)` · L44 · async
  - chama: `syncChat` L25, `SessionManager.listChats` (session-manager.service.ts:531)
  - chamado por: `MessagesController.sync` (messages.controller.ts:316)
- `toInput(sessionId, h)` · L65 · private
  - chamado por: `syncChat` L25

## `modules/messaging/application/message-persister.service.ts`

71 linhas · caminho: `apps/gateway/src/modules/messaging/application/message-persister.service.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `MessagePersister`** L15 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `eventBus: EventBus`
- `logger` · L17 · private · campo
- `constructor(repo, eventBus)` · L19
- `onModuleInit()` · L24
  - chama: `MessageRepository.save` (message.repository.ts:71), `MessageRepository.updateStatusByKey` (message.repository.ts:82), `EventBus.subscribe` (event-bus.ts:26)
  - assina evento: `'wa.event'`

## `modules/messaging/application/reaction-key.spec.ts`

115 linhas · caminho: `apps/gateway/src/modules/messaging/application/reaction-key.spec.ts`
- importa (interno): `modules/messaging/application/reaction-key.ts`

- describe “reactionSenderKey” · L9
  - it “nossa reação é sempre "me" (API ou celular, com ou sem aparelho)” · L10
  - it “contato em 1:1 é "peer" — o mesmo como @lid ou como telefone” · L19
  - it “grupo: o participante, sem o sufixo de aparelho; sem remetente → "unknown"” · L42
- describe “stripDevice” · L60
- describe “toReactionInput” · L68
  - it “converte segundos → Date e mantém emoji vazio (remoção)” · L69
  - it “reação nossa → senderKey me e fromMe true” · L90
  - it “sem mensagem-alvo ou sem chat → null” · L102

## `modules/messaging/application/reaction-key.ts`

47 linhas · caminho: `apps/gateway/src/modules/messaging/application/reaction-key.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/messaging/domain/reaction.repository.ts`
- importado por: `modules/messaging/application/reaction-key.spec.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/sessions/infrastructure/baileys/baileys.inbound.spec.ts`

**Funções e constantes de topo**
- `reactionSenderKey(p)` · L12
  - chama: `stripDevice` L23
  - chamado por: `toReactionInput` L28
- `stripDevice(jid)` · L23
  - chamado por: `reactionSenderKey` L12
- `toReactionInput(sessionId, p)` · L28
  - chama: `reactionSenderKey` L12
  - chamado por: `ReactionPersister.onModuleInit` (reaction-persister.service.ts:27)

## `modules/messaging/application/reaction-persister.service.ts`

46 linhas · caminho: `apps/gateway/src/modules/messaging/application/reaction-persister.service.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `modules/messaging/domain/reaction.repository.ts`, `modules/messaging/application/reaction-key.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `ReactionPersister`** L18 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `repo: @Inject(REACTION_REPOSITORY) ReactionRepository` · `eventBus: EventBus`
- `logger` · L20 · private · campo
- `constructor(repo, eventBus)` · L22
- `onModuleInit()` · L27
  - chama: `toReactionInput` (reaction-key.ts:28), `ReactionRepository.upsert` (reaction.repository.ts:25), `EventBus.subscribe` (event-bus.ts:26)
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
  - chamado por: `MessagesController.sendMedia` (messages.controller.ts:538), `MessagesController.sendWithIntent` (messages.controller.ts:473)

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
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:473)
  - banco: `sendIntent.create`, `sendIntent.findUnique`, `sendIntent.updateMany`
- `complete(intentId, keyId, chatJid)` · L88 · async
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:473)
  - banco: `sendIntent.update`
- `fail(intentId, error)` · L105 · async
  - chamado por: `MessagesController.sendWithIntent` (messages.controller.ts:473)
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
  - chamado por: `InboxController.conversations` (inbox.controller.ts:111)
- `isTriageAnchorCurrent(input)` · L31
  - chamado por: `deriveTriageStatus` L22

**Tipos**
- interface `TriageInput` L4 · 5 propriedade(s)

## `modules/messaging/domain/inbox.repository.ts`

86 linhas · caminho: `apps/gateway/src/modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/application/triage-status.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/messaging.module.ts`

**Funções e constantes de topo**
- `INBOX_REPOSITORY` = `Symbol('INBOX_REPOSITORY')` · L85

**Tipos**
- type `TriageStatus` L12
- interface `InboxConversationRow` L16 · 17 propriedade(s)
- interface `InboxFeedRow` L38 · 14 propriedade(s)
- interface `InboxRepository` L57
  - `InboxRepository.listConversations(opts)` · L59
    - implementado por: `PrismaInboxRepository.listConversations` (prisma-inbox.repository.ts:44)
    - chamado por: `InboxController.conversations` (inbox.controller.ts:111)
  - `InboxRepository.listFeed(opts)` · L64
    - implementado por: `PrismaInboxRepository.listFeed` (prisma-inbox.repository.ts:125)
    - chamado por: `InboxController.messages` (inbox.controller.ts:148)
  - `InboxRepository.findLastInbound(sessionId, chatJid)` · L70
    - implementado por: `PrismaInboxRepository.findLastInbound` (prisma-inbox.repository.ts:161)
    - chamado por: `InboxController.triage` (inbox.controller.ts:162)
  - `InboxRepository.markIgnored(input)` · L75
    - implementado por: `PrismaInboxRepository.markIgnored` (prisma-inbox.repository.ts:174)
    - chamado por: `InboxController.triage` (inbox.controller.ts:162)
  - `InboxRepository.clearTriage(sessionId, chatJid)` · L82
    - implementado por: `PrismaInboxRepository.clearTriage` (prisma-inbox.repository.ts:201)
    - chamado por: `InboxController.triage` (inbox.controller.ts:162)

## `modules/messaging/domain/message.repository.ts`

117 linhas · caminho: `apps/gateway/src/modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**Funções e constantes de topo**
- `MESSAGE_REPOSITORY` = `Symbol('MESSAGE_REPOSITORY')` · L116

**Tipos**
- interface `SaveMessageInput` L1 · 19 propriedade(s)
- interface `StoredMessage` L27 · 19 propriedade(s)
- interface `ConversationSummary` L54 · 7 propriedade(s)
- interface `IdempotentHit` L65 · 2 propriedade(s)
- interface `MessageRepository` L70
  - `MessageRepository.save(input)` · L71
    - implementado por: `PrismaMessageRepository.save` (prisma-message.repository.ts:16)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.saveHistorical(inputs)` · L75
    - implementado por: `PrismaMessageRepository.saveHistorical` (prisma-message.repository.ts:58)
    - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
  - `MessageRepository.findByIdempotencyKey(sessionId, idempotencyKey)` · L77
    - implementado por: `PrismaMessageRepository.findByIdempotencyKey` (prisma-message.repository.ts:104)
    - chamado por: `MessagesController.deduped` (messages.controller.ts:458)
  - `MessageRepository.updateStatusByKey(sessionId, keyId, status)` · L82
    - implementado por: `PrismaMessageRepository.updateStatusByKey` (prisma-message.repository.ts:135)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.findByKeyId(sessionId, keyId)` · L88
    - implementado por: `PrismaMessageRepository.findByKeyId` (prisma-message.repository.ts:115)
    - chamado por: `MessagesController.markRead` (messages.controller.ts:415), `MessagesController.reaction` (messages.controller.ts:427)
  - `MessageRepository.listByChat(sessionId, chatJids, limit)` · L92
    - implementado por: `PrismaMessageRepository.listByChat` (prisma-message.repository.ts:208)
    - chamado por: `MessagesController.list` (messages.controller.ts:251)
  - `MessageRepository.findByRef(sessionId, ref)` · L99
    - implementado por: `PrismaMessageRepository.findByRef` (prisma-message.repository.ts:244)
    - chamado por: `MessagesController.downloadMedia` (messages.controller.ts:377)
  - `MessageRepository.listConversations(sessionId, limit)` · L101
    - implementado por: `PrismaMessageRepository.listConversations` (prisma-message.repository.ts:258)
    - chamado por: `MessagesController.conversations` (messages.controller.ts:241)
  - `MessageRepository.searchMessages(sessionId, query, chatJids, limit)` · L108
    - implementado por: `PrismaMessageRepository.searchMessages` (prisma-message.repository.ts:221)
    - chamado por: `MessagesController.search` (messages.controller.ts:294)

## `modules/messaging/domain/reaction.repository.ts`

35 linhas · caminho: `apps/gateway/src/modules/messaging/domain/reaction.repository.ts`
- importado por: `modules/messaging/application/reaction-key.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/infrastructure/prisma-reaction.repository.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`

**Funções e constantes de topo**
- `REACTION_REPOSITORY` = `Symbol('REACTION_REPOSITORY')` · L34

**Tipos**
- interface `SaveReactionInput` L3 · 8 propriedade(s)
- interface `StoredReaction` L14 · 5 propriedade(s)
- interface `ReactionRepository` L22
  - `ReactionRepository.upsert(input)` · L25
    - implementado por: `PrismaReactionRepository.upsert` (prisma-reaction.repository.ts:19)
    - chamado por: `ReactionPersister.onModuleInit` (reaction-persister.service.ts:27)
  - `ReactionRepository.listForMessages(sessionId, targetKeyIds)` · L28
    - implementado por: `PrismaReactionRepository.listForMessages` (prisma-reaction.repository.ts:42)
    - chamado por: `MessagesController.toDtos` (messages.controller.ts:265)

## `modules/messaging/infrastructure/prisma-inbox.repository.ts`

207 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-inbox.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaInboxRepository`** L15 · @Injectable · `implements InboxRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L17
- `chatFilter()` · L20 · private · getter
- `sessionFilter(sessionRefs)` · L31 · private
  - chamado por: `listConversations` L44, `listFeed` L125
- `listConversations(opts)` · L44 · async
  - implementa: `InboxRepository.listConversations` (inbox.repository.ts:59)
  - chama: `sessionFilter` L31
- `listFeed(opts)` · L125 · async
  - implementa: `InboxRepository.listFeed` (inbox.repository.ts:64)
  - chama: `sessionFilter` L31
- `findLastInbound(sessionId, chatJid)` · L161 · async
  - implementa: `InboxRepository.findLastInbound` (inbox.repository.ts:70)
  - banco: `waMessage.findFirst`
- `markIgnored(input)` · L174 · async
  - implementa: `InboxRepository.markIgnored` (inbox.repository.ts:75)
  - chama: `newId` (ulid.ts:4)
  - banco: `conversationTriage.upsert`
- `clearTriage(sessionId, chatJid)` · L201 · async
  - implementa: `InboxRepository.clearTriage` (inbox.repository.ts:82)
  - banco: `conversationTriage.deleteMany`

## `modules/messaging/infrastructure/prisma-message.repository.ts`

291 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-message.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaMessageRepository`** L12 · @Injectable · `implements MessageRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L14
- `save(input)` · L16 · async
  - implementa: `MessageRepository.save` (message.repository.ts:71)
  - chama: `newId` (ulid.ts:4)
  - banco: `waMessage.create`
- `saveHistorical(inputs)` · L58 · async
  - implementa: `MessageRepository.saveHistorical` (message.repository.ts:75)
  - chama: `newId` (ulid.ts:4)
  - banco: `waMessage.createMany`, `waMessage.findMany`
- `findByIdempotencyKey(sessionId, idempotencyKey)` · L104 · async
  - implementa: `MessageRepository.findByIdempotencyKey` (message.repository.ts:77)
  - banco: `waMessage.findUnique`
- `findByKeyId(sessionId, keyId)` · L115 · async
  - implementa: `MessageRepository.findByKeyId` (message.repository.ts:88)
  - banco: `waMessage.findFirst`
- `ACK_RANK` · L129 · private · static · campo
- `updateStatusByKey(sessionId, keyId, status)` · L135 · async
  - implementa: `MessageRepository.updateStatusByKey` (message.repository.ts:82)
- `toStored(r)` · L164 · private
  - chamado por: `findByRef` L244, `listByChat` L208, `searchMessages` L221
- `listByChat(sessionId, chatJids, limit)` · L208 · async
  - implementa: `MessageRepository.listByChat` (message.repository.ts:92)
  - chama: `toStored` L164
  - banco: `waMessage.findMany`
- `searchMessages(sessionId, query, chatJids, limit)` · L221 · async
  - implementa: `MessageRepository.searchMessages` (message.repository.ts:108)
  - chama: `toStored` L164
  - banco: `waMessage.findMany`
- `findByRef(sessionId, ref)` · L244 · async
  - implementa: `MessageRepository.findByRef` (message.repository.ts:99)
  - chama: `toStored` L164
  - banco: `waMessage.findFirst`
- `listConversations(sessionId, limit)` · L258 · async
  - implementa: `MessageRepository.listConversations` (message.repository.ts:101)

## `modules/messaging/infrastructure/prisma-reaction.repository.ts`

64 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-reaction.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/reaction.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaReactionRepository`** L10 · @Injectable · `implements ReactionRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L12
- `upsert(input)` · L19 · async
  - implementa: `ReactionRepository.upsert` (reaction.repository.ts:25)
  - chama: `newId` (ulid.ts:4)
- `listForMessages(sessionId, targetKeyIds)` · L42 · async
  - implementa: `ReactionRepository.listForMessages` (reaction.repository.ts:28)
  - banco: `messageReaction.findMany`

## `modules/messaging/interface/inbox.controller.ts`

203 linhas · caminho: `apps/gateway/src/modules/messaging/interface/inbox.controller.ts`
- importa (interno): `shared-kernel/query-int.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/messaging/application/triage-status.ts`, `modules/messaging/domain/inbox.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `InboxController`** L102 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('inbox')
- injeta (construtor): `repo: @Inject(INBOX_REPOSITORY) InboxRepository`
- `constructor(repo)` · L105
- `conversations(limit, sessions, status)` · L111 · async · @Get('conversations')
  - chama: `deriveTriageStatus` (triage-status.ts:22), `InboxRepository.listConversations` (inbox.repository.ts:59), `parseSessionFilter` L42, `toConversationDto` L56, `clampInt` (query-int.ts:4)
- `messages(limit, sessions)` · L148 · async · @Get('messages')
  - chama: `InboxRepository.listFeed` (inbox.repository.ts:64), `parseSessionFilter` L42, `clampInt` (query-int.ts:4)
- `triage(sessionId, body)` · L162 · async · @Post('sessions/:id/triage')
  - chama: `InboxRepository.clearTriage` (inbox.repository.ts:82), `InboxRepository.findLastInbound` (inbox.repository.ts:70), `InboxRepository.markIgnored` (inbox.repository.ts:75), `isExcludedChat` L52

**Funções e constantes de topo**
- `triageSchema` = `z.object({ chatJid: z.string().min(5).max(80), state: z.enum(['ignore…` · L31
- `parseSessionFilter(raw)` · L42
  - chamado por: `conversations` L111, `messages` L148
- `isExcludedChat(chatJid)` · L52
  - chamado por: `triage` L162
- `toConversationDto(row, status)` · L56
  - chamado por: `conversations` L111
- `toFeedDto(row)` · L79

## `modules/messaging/interface/messages.controller.ts`

755 linhas · caminho: `apps/gateway/src/modules/messaging/interface/messages.controller.ts`
- importa (interno): `bootstrap/config.ts`, `infra/storage/media-storage.service.ts`, `shared-kernel/query-int.ts`, `shared-kernel/safe-fetch.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/send-intent.decision.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/domain/reaction.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `MessagesController`** L211 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/messages')
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `reactions: @Inject(REACTION_REPOSITORY) ReactionRepository` · `manager: SessionManager` · `mediaStorage: MediaStorage` · `guardrail: GuardrailService` · `inboxSync: InboxSyncService` · `intents: SendIntentService` · `config: ConfigService<Env, true>`
- `logger` · L214 · private · campo
- `constructor(repo, reactions, manager, mediaStorage, guardrail, inboxSyn…)` · L216
- `assertColdAllowed(id, cold)` · L232 · private · async
  - chama: `GuardrailService.canSendCold` (guardrail.service.ts:406), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6)
  - chamado por: `sendWithIntent` L473
- `conversations(id, limit)` · L241 · async · @Get('conversations')
  - chama: `MessageRepository.listConversations` (message.repository.ts:101), `clampInt` (query-int.ts:4)
- `list(id, chatId, limit)` · L251 · async · @Get
  - chama: `MessageRepository.listByChat` (message.repository.ts:92), `candidateJids` L135, `toDtos` L265, `clampInt` (query-int.ts:4)
- `toDtos(sessionId, msgs)` · L265 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `ReactionRepository.listForMessages` (reaction.repository.ts:28), `toDto` L179
  - chamado por: `list` L251, `search` L294
- `search(id, q, chatId, limit)` · L294 · async · @Get('search')
  - chama: `MessageRepository.searchMessages` (message.repository.ts:108), `candidateJids` L135, `toDtos` L265, `clampInt` (query-int.ts:4)
- `sync(id, body)` · L316 · async · @Post('sync')
  - chama: `InboxSyncService.syncAll` (inbox-sync.service.ts:44), `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `chatFlag(id, chatId, body)` · L345 · async · @Post(':chatId/flag')
  - chama: `SessionManager.setChatFlag` (session-manager.service.ts:541)
- `downloadMedia(id, msgId)` · L377 · async · @Get(':msgId/media')
  - chama: `MediaStorage.getObject` (media-storage.service.ts:118), `MessageRepository.findByRef` (message.repository.ts:99)
- `markRead(id, msgId)` · L415 · async · @Post(':msgId/read')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:88), `SessionManager.markRead` (session-manager.service.ts:526)
- `reaction(id, msgId, body)` · L427 · async · @Post(':msgId/reaction')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:88), `SessionManager.sendReaction` (session-manager.service.ts:550)
- `deduped(id, idempotencyKey)` · L458 · private · async
  - chama: `MessageRepository.findByIdempotencyKey` (message.repository.ts:77)
  - chamado por: `sendWithIntent` L473
- `sendWithIntent(id, input, send)` · L473 · private · async
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `SendIntentService.complete` (send-intent.service.ts:88), `SendIntentService.fail` (send-intent.service.ts:105), `SendIntentService.reserve` (send-intent.service.ts:26), `assertColdAllowed` L232, `deduped` L458
  - chamado por: `sendLocation` L680, `sendMedia` L538, `sendMediaUrl` L608, `sendPoll` L719, `sendText` L509
- `sendText(id, body)` · L509 · async · @Post('text')
  - chama: `sendWithIntent` L473, `SessionManager.sendText` (session-manager.service.ts:466)
- `sendMedia(id, req)` · L538 · async · @Post('media')
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `inferType` L124, `sendWithIntent` L473, `SessionManager.sendMedia` (session-manager.service.ts:480)
- `sendMediaUrl(id, body)` · L608 · async · @Post('media-url')
  - chama: `inferType` L124, `sendWithIntent` L473, `SessionManager.sendMedia` (session-manager.service.ts:480), `egressPolicyFromEnv` (safe-fetch.ts:23), `safeFetch` (safe-fetch.ts:235)
- `sendLocation(id, body)` · L680 · async · @Post('location')
  - chama: `sendWithIntent` L473, `SessionManager.sendLocation` (session-manager.service.ts:488)
- `sendPoll(id, body)` · L719 · async · @Post('poll')
  - chama: `sendWithIntent` L473, `SessionManager.sendPoll` (session-manager.service.ts:496)

**Funções e constantes de topo**
- `coldField` = `z.boolean().optional()` · L58
- `idempotencyKeyField` = `z.string().min(1).max(200).optional()` · L59
- `mentionsField` = `z.array(z.string().min(5).max(40)).max(50).optional()` · L62
- `inboxSyncSchema` = `z.object({ chatId: z.string().min(3).max(40).optional(), limit: z.num…` · L65
- `chatFlagSchema` = `z.object({ flag: z.enum(['archive', 'pin', 'mute', 'unread']), enable…` · L72
- `sendTextSchema` = `z.object({ to: z.string().min(5).max(40), text: z.string().min(1).max…` · L77
- `sendMediaUrlSchema` = `z.object({ to: z.string().min(5).max(40), url: z.string().url(), type…` · L87
- `reactionSchema` = `z.object({ emoji: z.string().max(20) })` · L100
- `sendLocationSchema` = `z.object({ to: z.string().min(5).max(40), latitude: z.number().min(-9…` · L103
- `sendPollSchema` = `z.object({ to: z.string().min(5).max(40), name: z.string().min(1).max…` · L114
- `inferType(mimetype)` · L124
  - chamado por: `sendMedia` L538, `sendMediaUrl` L608
- `candidateJids(chatId)` · L135
  - chamado por: `list` L251, `search` L294
- `toConversationDto(c)` · L156
- `toReactionDto(r)` · L170
- `toDto(m, mediaUrl, reactions)` · L179
  - chamado por: `toDtos` L265

## `modules/messaging/messaging.module.ts`

34 linhas · caminho: `apps/gateway/src/modules/messaging/messaging.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/inbox.repository.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/domain/reaction.repository.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/infrastructure/prisma-reaction.repository.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`
- importado por: `app.module.ts`

**@Module `MessagingModule`** L18
- imports: `[IamModule, SessionsModule, GuardrailModule]`
- controllers: `[MessagesController, InboxController]`
- providers: `[ MessagePersister, // P-066 (E22): reações em tabela própria (wa_message_reactions), fora de wa_messages. ReactionPersister, InboxSyncService, SendIntentService, { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository }, { provide: REACTION_REPOSITORY, useClass: PrismaReactionRepository }, // Caixa única de triagem (página Atendimento): leitura agregada de todas as sessões. { provide: I…`

**class `MessagingModule`** L18 · @Module({ imports: [IamModule, SessionsModule, GuardrailModule], co…)
