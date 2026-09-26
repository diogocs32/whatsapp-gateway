<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `messaging`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/messaging/application/chat-jids.ts` | 26 |
| `modules/messaging/application/forward.decision.spec.ts` | 458 |
| `modules/messaging/application/forward.decision.ts` | 188 |
| `modules/messaging/application/forward.service.ts` | 521 |
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
| `modules/messaging/domain/message.repository.ts` | 126 |
| `modules/messaging/domain/reaction.repository.ts` | 35 |
| `modules/messaging/infrastructure/prisma-inbox.repository.ts` | 207 |
| `modules/messaging/infrastructure/prisma-message.repository.ts` | 342 |
| `modules/messaging/infrastructure/prisma-reaction.repository.ts` | 64 |
| `modules/messaging/interface/content-disposition.spec.ts` | 187 |
| `modules/messaging/interface/content-disposition.ts` | 60 |
| `modules/messaging/interface/inbox.controller.ts` | 203 |
| `modules/messaging/interface/messages.controller.ts` | 842 |
| `modules/messaging/messaging.module.ts` | 37 |

## `modules/messaging/application/chat-jids.ts`

26 linhas · caminho: `apps/gateway/src/modules/messaging/application/chat-jids.ts`
- importado por: `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.decision.ts`, `modules/messaging/interface/messages.controller.ts`

**Funções e constantes de topo**
- `candidateJids(chatId)` · L6
  - chamado por: `phone` (forward.decision.ts:102), `MessagesController.list` (messages.controller.ts:275), `MessagesController.search` (messages.controller.ts:358)

## `modules/messaging/application/forward.decision.spec.ts`

458 linhas · caminho: `apps/gateway/src/modules/messaging/application/forward.decision.spec.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/messaging/application/chat-jids.ts`, `modules/messaging/application/forward.decision.ts`

- describe “canonicalDestination” · L43
  - it “número formatado (+, espaços, parênteses, hífen) vira só dígitos — key e transport iguais” · L44
  - it “o mesmo número como jid (@s.whatsapp.net, @c.us, com aparelho, servidor em maiúsculas) → mesma key” · L52
  - it “bordas do número: 10 e 15 dígitos passam” · L72
  - it “grupo (novo e antigo criador-timestamp) → key = transport = jid @g.us, servidor normalizado” · L78
  - it “@lid → key = transport = jid; o aparelho não muda o destino” · L97
  - it “número com 9 ou 16 dígitos, ou com letras → erro (400 antes de qualquer envio)” · L108
  - it “grupo/@lid malformados → erro” · L119
  - it “canal, lista/status, bot e conta hospedada → erro (outro caminho de envio no WhatsApp)” · L126
  - it “input guarda o destino exatamente como veio em to[i] (a key é que é canônica)” · L146
- describe “findDuplicate” · L154
  - it “mesma key em grafias diferentes → devolve o par como veio, na ordem de to[]” · L155
  - it “o mesmo celular com e sem o 9º dígito → duplicata (a 2ª cópia sumiria no unique do eco)” · L161
  - it “grupo repetido (inclusive servidor em maiúsculas) → duplicata” · L169
  - it “acha o par mesmo fora de posições vizinhas (1º × 3º)” · L176
  - it “destinos distintos → null (lid com os mesmos dígitos do número NÃO é o mesmo destino)” · L182
- describe “exact (onde se procura a conversa — só o número EXATO)” · L197
  - it “telefone: os dois sufixos do número exato, sem a variante do 9º dígito” · L200
  - it “grupo e @lid: só o próprio jid; o transporte é o jid (telefone vai em dígitos)” · L208
- describe “exceedsFrequentLimit” · L216
  - it “limites do dono: até 5 destinos; "encaminhada com frequência" a partir de score 5” · L217
  - it “só bloqueia score ≥ 5 com MAIS de 1 destino” · L222
  - it “sem score (original nunca encaminhada / coluna vazia) → nunca bloqueia” · L231
- describe “derivedKey” · L239
  - it “chave por destino = `<chave do cliente>:<destino canônico>`” · L240
  - it “grafias diferentes do mesmo número → mesma chave (retry com outra grafia faz replay)” · L246
- describe “batchFingerprint” · L253
  - it “é sha256 hex e não depende da ordem dos destinos” · L258
  - it “outra original (keyId) → outro hash (mesma chave com outra mensagem = 409)” · L265
  - it “outro CONJUNTO de destinos → outro hash ([A,B] e depois [A,C] com a mesma chave = 409)” · L271
  - it “grafias diferentes do mesmo número → mesmo hash (retry do lote não vira 409)” · L278
- describe “destinationFingerprint” · L285
  - it “mesmo destino em outra grafia → mesmo hash; outro destino ou outra original → outro” · L286
- describe “batchStatus” · L295
  - it “algum destino ok (enviado ou replay) → 201, mesmo com erros no resto” · L296
  - it “nenhum ok → o status comum dos itens” · L307
  - it “nenhum ok com status misturados ou ausentes → 400” · L323
  - it “lote vazio → 400, nunca 201 (inalcançável: o zod exige 1 destino, mas nada saiu)” · L340
- describe “forwardGapMs” · L345
  - it “intervalo anti-ban fica em [1000, 3000] ms inteiros” · L350
  - it “sem argumento usa o Math.random” · L364
- describe “FORWARDABLE_TYPES / unsupportedTypeLabel” · L370
  - it “encaminháveis: texto, mídias, localização e contato” · L388
  - it “todo tipo do contrato fora da lista tem rótulo próprio no 400 (não o genérico)” · L403
  - it “tipo desconhecido → rótulo genérico com o nome do tipo” · L415
- describe “candidateJids (movida do controller na E24 — mesmo comportamento)” · L420
  - it “com @ devolve o jid como veio, sem normalizar (GET /messages e /search)” · L421
  - it “celular BR com o 9 → as 2 formas × os 2 sufixos” · L429
  - it “celular BR sem o 9 (8 dígitos no número) → acrescenta a forma com o 9” · L438
  - it “formatação é ignorada (só dígitos contam)” · L447
  - it “sem variação de 9º dígito → só os 2 sufixos” · L451

## `modules/messaging/application/forward.decision.ts`

188 linhas · caminho: `apps/gateway/src/modules/messaging/application/forward.decision.ts`
- importa (interno): `modules/messaging/application/chat-jids.ts`, `modules/messaging/application/send-intent.decision.ts`
- importado por: `modules/messaging/application/forward.decision.spec.ts`, `modules/messaging/application/forward.service.ts`

**Funções e constantes de topo**
- `FORWARDABLE_TYPES` = `new Set([ 'text', 'image', 'video', 'audio', 'document', 'sticker', '…` · L12
- `TYPE_LABEL` = `{ poll: 'enquete', event: 'evento', group_invite: 'convite de grupo',…` · L23
- `unsupportedTypeLabel(type)` · L31
  - chamado por: `ForwardService.forward` (forward.service.ts:101)
- `canonicalDestination(raw)` · L54
  - chama: `phone` L102
  - chamado por: `ForwardService.forward` (forward.service.ts:101)
- `phone(input, digits)` · L102
  - chama: `candidateJids` (chat-jids.ts:6)
  - chamado por: `canonicalDestination` L54
- `findDuplicate(dests)` · L116
  - chamado por: `ForwardService.forward` (forward.service.ts:101)
- `exceedsFrequentLimit(score, targets, frequentMin)` · L135
  - chamado por: `ForwardService.forward` (forward.service.ts:101), `ForwardService.runReserved` (forward.service.ts:169)
- `derivedKey(base, dest)` · L146
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `batchFingerprint(keyId, dests)` · L153
  - chama: `sendFingerprint` (send-intent.decision.ts:53)
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `destinationFingerprint(keyId, dest)` · L167
  - chama: `sendFingerprint` (send-intent.decision.ts:53)
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `batchStatus(items)` · L176
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
- `forwardGapMs(random)` · L185
  - chamado por: `ForwardService.gapMs` (forward.service.ts:406)

**Tipos**
- interface `ForwardDestination` L43 · 6 propriedade(s)

## `modules/messaging/application/forward.service.ts`

521 linhas · caminho: `apps/gateway/src/modules/messaging/application/forward.service.ts`
- importa (interno): `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/application/forward.decision.ts`, `modules/messaging/application/send-intent.service.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`

**class `ForwardService`** L86 · @Injectable
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `intents: SendIntentService` · `guardrail: GuardrailService` · `manager: SessionManager`
- `logger` · L88 · private · campo
- `locks` · L91 · private · campo
- `lastSentAt` · L92 · private · campo
- `constructor(repo, intents, guardrail, manager)` · L94
- `forward(sessionId, ref, input)` · L101 · async
  - chama: `canonicalDestination` (forward.decision.ts:54), `exceedsFrequentLimit` (forward.decision.ts:135), `findDuplicate` (forward.decision.ts:116), `unsupportedTypeLabel` (forward.decision.ts:31), `limitError` L474, `run` L147, `unsupported` L465, `withSessionLock` L448, `MessageRepository.findByRef` (message.repository.ts:108)
  - chamado por: `MessagesController.forward` (messages.controller.ts:527)
- `run(sessionId, orig, dests, input)` · L147 · private · async
  - chama: `runReserved` L169, `SendIntentService.fail` (send-intent.service.ts:105)
  - chamado por: `forward` L101
- `runReserved(sessionId, orig, dests, input, reserved)` · L169 · private · async
  - chama: `GuardrailService.canSendCold` (guardrail.service.ts:406), `batchFingerprint` (forward.decision.ts:153), `batchStatus` (forward.decision.ts:176), `derivedKey` (forward.decision.ts:146), `destinationFingerprint` (forward.decision.ts:167), `exceedsFrequentLimit` (forward.decision.ts:135), `failAll` L414, `finishBatch` L433, `limitError` L474, `sendOne` L357, `toSource` L484, `SendIntentService.reserve` (send-intent.service.ts:26), `MessageRepository.findByIdempotencyKey` (message.repository.ts:80), `MessageRepository.findInboundChat` (message.repository.ts:92), `SessionManager.prepareForward` (session-manager.service.ts:572)
  - chamado por: `run` L147
- `sendOne(sessionId, prepared, p, results)` · L357 · private · async
  - chama: `pace` L399, `withTimeout` L501, `SendIntentService.complete` (send-intent.service.ts:88), `SendIntentService.fail` (send-intent.service.ts:105), `PreparedForward.send` (engine.port.ts:268)
  - chamado por: `runReserved` L169
- `pace(sessionId)` · L399 · protected · async
  - chama: `gapMs` L406, `sleep` L410
  - chamado por: `sendOne` L357
- `gapMs()` · L406 · protected
  - chama: `forwardGapMs` (forward.decision.ts:185)
  - chamado por: `pace` L399
- `sleep(ms)` · L410 · protected
  - chamado por: `pace` L399
- `failAll(pending, results, error, status, code)` · L414 · private · async
  - chama: `SendIntentService.fail` (send-intent.service.ts:105)
  - chamado por: `runReserved` L169
- `finishBatch(batchId, results)` · L433 · private · async
  - chama: `SendIntentService.complete` (send-intent.service.ts:88), `SendIntentService.fail` (send-intent.service.ts:105)
  - chamado por: `runReserved` L169
- `withSessionLock(sessionId, fn)` · L448 · private
  - chamado por: `forward` L101
- `unsupported(reason)` · L465 · private
  - chamado por: `forward` L101
- `limitError()` · L474 · private
  - chamado por: `forward` L101, `runReserved` L169

**Funções e constantes de topo**
- `toSource(m)` · L484
  - chamado por: `runReserved` L169
- `withTimeout(op, ms, message)` · L501 · async
  - chamado por: `sendOne` L357

**Tipos**
- interface `ForwardInput` L40 · 3 propriedade(s)
- interface `ForwardResult` L47 · 13 propriedade(s)
- interface `Pending` L64 · 6 propriedade(s)

## `modules/messaging/application/inbox-sync.service.ts`

90 linhas · caminho: `apps/gateway/src/modules/messaging/application/inbox-sync.service.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**class `InboxSyncService`** L15 · @Injectable
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `manager: SessionManager`
- `logger` · L17 · private · campo
- `constructor(repo, manager)` · L19
- `syncChat(sessionId, chatJid, limit)` · L25 · async
  - chama: `toInput` L65, `MessageRepository.saveHistorical` (message.repository.ts:78), `SessionManager.fetchChatHistory` (session-manager.service.ts:543)
  - chamado por: `syncAll` L44, `MessagesController.sync` (messages.controller.ts:380)
- `syncAll(sessionId, opts)` · L44 · async
  - chama: `syncChat` L25, `SessionManager.listChats` (session-manager.service.ts:540)
  - chamado por: `MessagesController.sync` (messages.controller.ts:380)
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
  - chama: `MessageRepository.save` (message.repository.ts:74), `MessageRepository.updateStatusByKey` (message.repository.ts:85), `EventBus.subscribe` (event-bus.ts:26)
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
- importado por: `modules/messaging/application/forward.decision.ts`, `modules/messaging/application/send-intent.decision.spec.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/interface/messages.controller.ts`

**Funções e constantes de topo**
- `PENDING_INTENT_TTL_MS` = `2 * 60_000` · L27
- `decideOnExistingIntent(row, fingerprint, now, pendingTtlMs)` · L29
  - chamado por: `SendIntentService.reserve` (send-intent.service.ts:26)
- `sendFingerprint(parts)` · L53
  - chamado por: `batchFingerprint` (forward.decision.ts:153), `destinationFingerprint` (forward.decision.ts:167), `MessagesController.sendMedia` (messages.controller.ts:625), `MessagesController.sendWithIntent` (messages.controller.ts:560)

**Tipos**
- interface `ExistingIntent` L11 · 5 propriedade(s)
- type `IntentDecision` L19

## `modules/messaging/application/send-intent.service.ts`

121 linhas · caminho: `apps/gateway/src/modules/messaging/application/send-intent.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/application/send-intent.decision.ts`
- importado por: `modules/messaging/application/forward.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**class `SendIntentService`** L20 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `logger` · L22 · private · campo
- `constructor(prisma)` · L24
- `reserve(sessionId, idempotencyKey, fingerprint)` · L26 · async
  - chama: `decideOnExistingIntent` (send-intent.decision.ts:29), `newId` (ulid.ts:4)
  - chamado por: `ForwardService.runReserved` (forward.service.ts:169), `MessagesController.sendWithIntent` (messages.controller.ts:560)
  - banco: `sendIntent.create`, `sendIntent.findUnique`, `sendIntent.updateMany`
- `complete(intentId, keyId, chatJid)` · L88 · async
  - chamado por: `ForwardService.finishBatch` (forward.service.ts:433), `ForwardService.sendOne` (forward.service.ts:357), `MessagesController.sendWithIntent` (messages.controller.ts:560)
  - banco: `sendIntent.update`
- `fail(intentId, error)` · L105 · async
  - chamado por: `ForwardService.failAll` (forward.service.ts:414), `ForwardService.finishBatch` (forward.service.ts:433), `ForwardService.run` (forward.service.ts:147), `ForwardService.sendOne` (forward.service.ts:357), `MessagesController.sendWithIntent` (messages.controller.ts:560)
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

126 linhas · caminho: `apps/gateway/src/modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/messaging/messaging.module.ts`

**Funções e constantes de topo**
- `MESSAGE_REPOSITORY` = `Symbol('MESSAGE_REPOSITORY')` · L125

**Tipos**
- interface `SaveMessageInput` L1 · 19 propriedade(s)
- interface `StoredMessage` L27 · 21 propriedade(s)
- interface `ConversationSummary` L57 · 7 propriedade(s)
- interface `IdempotentHit` L68 · 2 propriedade(s)
- interface `MessageRepository` L73
  - `MessageRepository.save(input)` · L74
    - implementado por: `PrismaMessageRepository.save` (prisma-message.repository.ts:42)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.saveHistorical(inputs)` · L78
    - implementado por: `PrismaMessageRepository.saveHistorical` (prisma-message.repository.ts:84)
    - chamado por: `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
  - `MessageRepository.findByIdempotencyKey(sessionId, idempotencyKey)` · L80
    - implementado por: `PrismaMessageRepository.findByIdempotencyKey` (prisma-message.repository.ts:130)
    - chamado por: `ForwardService.runReserved` (forward.service.ts:169), `MessagesController.deduped` (messages.controller.ts:545)
  - `MessageRepository.updateStatusByKey(sessionId, keyId, status)` · L85
    - implementado por: `PrismaMessageRepository.updateStatusByKey` (prisma-message.repository.ts:177)
    - chamado por: `MessagePersister.onModuleInit` (message-persister.service.ts:24)
  - `MessageRepository.findInboundChat(sessionId, chatJids)` · L92
    - implementado por: `PrismaMessageRepository.findInboundChat` (prisma-message.repository.ts:144)
    - chamado por: `ForwardService.runReserved` (forward.service.ts:169)
  - `MessageRepository.findByKeyId(sessionId, keyId)` · L97
    - implementado por: `PrismaMessageRepository.findByKeyId` (prisma-message.repository.ts:157)
    - chamado por: `MessagesController.markRead` (messages.controller.ts:483), `MessagesController.reaction` (messages.controller.ts:495)
  - `MessageRepository.listByChat(sessionId, chatJids, limit)` · L101
    - implementado por: `PrismaMessageRepository.listByChat` (prisma-message.repository.ts:254)
    - chamado por: `MessagesController.list` (messages.controller.ts:275)
  - `MessageRepository.findByRef(sessionId, ref)` · L108
    - implementado por: `PrismaMessageRepository.findByRef` (prisma-message.repository.ts:294)
    - chamado por: `ForwardService.forward` (forward.service.ts:101), `MessagesController.downloadMedia` (messages.controller.ts:441)
  - `MessageRepository.listConversations(sessionId, limit)` · L110
    - implementado por: `PrismaMessageRepository.listConversations` (prisma-message.repository.ts:309)
    - chamado por: `MessagesController.conversations` (messages.controller.ts:265)
  - `MessageRepository.searchMessages(sessionId, query, chatJids, limit)` · L117
    - implementado por: `PrismaMessageRepository.searchMessages` (prisma-message.repository.ts:270)
    - chamado por: `MessagesController.search` (messages.controller.ts:358)

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
    - chamado por: `MessagesController.toDtos` (messages.controller.ts:290)

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

342 linhas · caminho: `apps/gateway/src/modules/messaging/infrastructure/prisma-message.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/messaging/domain/message.repository.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `PrismaMessageRepository`** L38 · @Injectable · `implements MessageRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L40
- `save(input)` · L42 · async
  - implementa: `MessageRepository.save` (message.repository.ts:74)
  - chama: `noNul` L20, `noNulDeep` L25, `newId` (ulid.ts:4)
  - banco: `waMessage.create`
- `saveHistorical(inputs)` · L84 · async
  - implementa: `MessageRepository.saveHistorical` (message.repository.ts:78)
  - chama: `noNul` L20, `newId` (ulid.ts:4)
  - banco: `waMessage.createMany`, `waMessage.findMany`
- `findByIdempotencyKey(sessionId, idempotencyKey)` · L130 · async
  - implementa: `MessageRepository.findByIdempotencyKey` (message.repository.ts:80)
  - banco: `waMessage.findUnique`
- `findInboundChat(sessionId, chatJids)` · L144 · async
  - implementa: `MessageRepository.findInboundChat` (message.repository.ts:92)
  - banco: `waMessage.findFirst`
- `findByKeyId(sessionId, keyId)` · L157 · async
  - implementa: `MessageRepository.findByKeyId` (message.repository.ts:97)
  - banco: `waMessage.findFirst`
- `ACK_RANK` · L171 · private · static · campo
- `updateStatusByKey(sessionId, keyId, status)` · L177 · async
  - implementa: `MessageRepository.updateStatusByKey` (message.repository.ts:85)
- `toStored(r)` · L206 · private
  - chamado por: `findByRef` L294, `listByChat` L254, `searchMessages` L270
- `listByChat(sessionId, chatJids, limit)` · L254 · async
  - implementa: `MessageRepository.listByChat` (message.repository.ts:101)
  - chama: `toStored` L206
  - banco: `waMessage.findMany`
- `searchMessages(sessionId, query, chatJids, limit)` · L270 · async
  - implementa: `MessageRepository.searchMessages` (message.repository.ts:117)
  - chama: `toStored` L206
  - banco: `waMessage.findMany`
- `findByRef(sessionId, ref)` · L294 · async
  - implementa: `MessageRepository.findByRef` (message.repository.ts:108)
  - chama: `toStored` L206
  - banco: `waMessage.findFirst`
- `listConversations(sessionId, limit)` · L309 · async
  - implementa: `MessageRepository.listConversations` (message.repository.ts:110)

**Funções e constantes de topo**
- `noNul(v)` · L20
  - chamado por: `noNulDeep` L25, `save` L42, `saveHistorical` L84
- `noNulDeep(v)` · L25
  - chama: `noNul` L20
  - chamado por: `save` L42

**Tipos**
- type `WellFormed` L19

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

## `modules/messaging/interface/content-disposition.spec.ts`

187 linhas · caminho: `apps/gateway/src/modules/messaging/interface/content-disposition.spec.ts`
- importa (interno): `modules/messaging/interface/content-disposition.ts`

- describe “inlineDisposition” · L8
  - it “sem nome (ou só aspas/quebras) → sem header, como antes” · L9
  - it “ASCII e Latin-1 → header idêntico ao de antes (aspas/CR/LF removidos)” · L16
  - it “travessão → fallback ASCII com _ + filename* UTF-8 percent-encoded” · L26
  - it “emoji (par substituto) vira UM _ no fallback e 4 bytes no filename*” · L32
  - it “filename* escapa o que o encodeURIComponent deixa passar e o RFC 5987 não aceita: ' ( ) *” · L38
  - it “fallback sem % nem \ (evita escape ambíguo no quoted-string/navegador)” · L44
  - it “substituto solitário (nome malformado) não lança URIError” · L50
  - it “Latin-1 com % \ ; = → fallback (esses caracteres viram _) + filename*” · L59
  - it “Latin-1 sem esses caracteres segue idêntico (apóstrofo incluso)” · L77
  - it “n8n (parser real, transcrito) recebe o nome exato — e sem filename* o fallback não quebra” · L83
  - it “toda saída passa na validação de header do Node (http.validateHeaderValue)” · L107
- describe “safeContentType” · L150
  - it “tipos legítimos passam (com parâmetros, aspas e espaços nas pontas)” · L151
  - it “inválido → null (CR/LF, não-ASCII, composto, aspas quebradas, vazio, enorme)” · L164
  - it “toda saída não nula passa na validação de header do Node” · L179

## `modules/messaging/interface/content-disposition.ts`

60 linhas · caminho: `apps/gateway/src/modules/messaging/interface/content-disposition.ts`
- importado por: `modules/messaging/interface/content-disposition.spec.ts`, `modules/messaging/interface/messages.controller.ts`

**Funções e constantes de topo**
- `inlineDisposition(fileName)` · L17
  - chama: `rfc5987` L36
  - chamado por: `MessagesController.downloadMedia` (messages.controller.ts:441)
- `LONE_SURROGATE` = `/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFF…` · L33
- `rfc5987(value)` · L36
  - chamado por: `inlineDisposition` L17
- `MIME_RE` = `new RegExp( String.raw`^${TOKEN}/${TOKEN}(?:\s*;\s*${TOKEN}=(?:${TOKE…` · L49
- `safeContentType(mimetype)` · L54
  - chamado por: `MessagesController.downloadMedia` (messages.controller.ts:441)

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

842 linhas · caminho: `apps/gateway/src/modules/messaging/interface/messages.controller.ts`
- importa (interno): `bootstrap/config.ts`, `infra/directory/contact-directory.service.ts`, `infra/storage/media-storage.service.ts`, `shared-kernel/query-int.ts`, `shared-kernel/safe-fetch.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `modules/messaging/application/chat-jids.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/send-intent.decision.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/domain/reaction.repository.ts`, `modules/messaging/interface/content-disposition.ts`
- importado por: `modules/messaging/messaging.module.ts`

**class `MessagesController`** L233 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/messages')
- injeta (construtor): `repo: @Inject(MESSAGE_REPOSITORY) MessageRepository` · `reactions: @Inject(REACTION_REPOSITORY) ReactionRepository` · `manager: SessionManager` · `mediaStorage: MediaStorage` · `guardrail: GuardrailService` · `inboxSync: InboxSyncService` · `intents: SendIntentService` · `config: ConfigService<Env, true>` · `directory: ContactDirectory` · `forwarder: ForwardService`
- `logger` · L236 · private · campo
- `constructor(repo, reactions, manager, mediaStorage, guardrail, inboxSyn…)` · L238
- `assertColdAllowed(id, cold)` · L256 · private · async
  - chama: `GuardrailService.canSendCold` (guardrail.service.ts:406), `SessionQuarantinedException.constructor` (session-quarantined.exception.ts:6)
  - chamado por: `sendWithIntent` L560
- `conversations(id, limit)` · L265 · async · @Get('conversations')
  - chama: `MessageRepository.listConversations` (message.repository.ts:110), `clampInt` (query-int.ts:4)
- `list(id, chatId, limit)` · L275 · async · @Get
  - chama: `candidateJids` (chat-jids.ts:6), `MessageRepository.listByChat` (message.repository.ts:101), `toDtos` L290, `clampInt` (query-int.ts:4)
- `toDtos(sessionId, msgs)` · L290 · private · async
  - chama: `MediaStorage.presignedGetUrl` (media-storage.service.ts:144), `ReactionRepository.listForMessages` (reaction.repository.ts:28), `groupSenderOf` L180, `groupSenderNames` L325, `toDto` L198
  - chamado por: `list` L275, `search` L358
- `groupSenderNames(sessionId, msgs)` · L325 · private · async
  - chama: `ContactDirectory.namesFor` (contact-directory.service.ts:150), `senderKeys` L192
  - chamado por: `toDtos` L290
- `search(id, q, chatId, limit)` · L358 · async · @Get('search')
  - chama: `candidateJids` (chat-jids.ts:6), `MessageRepository.searchMessages` (message.repository.ts:117), `toDtos` L290, `clampInt` (query-int.ts:4)
- `sync(id, body)` · L380 · async · @Post('sync')
  - chama: `InboxSyncService.syncAll` (inbox-sync.service.ts:44), `InboxSyncService.syncChat` (inbox-sync.service.ts:25)
- `chatFlag(id, chatId, body)` · L409 · async · @Post(':chatId/flag')
  - chama: `SessionManager.setChatFlag` (session-manager.service.ts:550)
- `downloadMedia(id, msgId)` · L441 · async · @Get(':msgId/media')
  - chama: `MediaStorage.getObject` (media-storage.service.ts:118), `MessageRepository.findByRef` (message.repository.ts:108), `inlineDisposition` (content-disposition.ts:17), `safeContentType` (content-disposition.ts:54)
- `markRead(id, msgId)` · L483 · async · @Post(':msgId/read')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:97), `SessionManager.markRead` (session-manager.service.ts:535)
- `reaction(id, msgId, body)` · L495 · async · @Post(':msgId/reaction')
  - chama: `MessageRepository.findByKeyId` (message.repository.ts:97), `SessionManager.sendReaction` (session-manager.service.ts:559)
- `forward(id, msgId, body)` · L527 · async · @Post(':msgId/forward')
  - chama: `ForwardService.forward` (forward.service.ts:101)
- `deduped(id, idempotencyKey)` · L545 · private · async
  - chama: `MessageRepository.findByIdempotencyKey` (message.repository.ts:80)
  - chamado por: `sendWithIntent` L560
- `sendWithIntent(id, input, send)` · L560 · private · async
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `SendIntentService.complete` (send-intent.service.ts:88), `SendIntentService.fail` (send-intent.service.ts:105), `SendIntentService.reserve` (send-intent.service.ts:26), `assertColdAllowed` L256, `deduped` L545
  - chamado por: `sendLocation` L767, `sendMedia` L625, `sendMediaUrl` L695, `sendPoll` L806, `sendText` L596
- `sendText(id, body)` · L596 · async · @Post('text')
  - chama: `sendWithIntent` L560, `SessionManager.sendText` (session-manager.service.ts:475)
- `sendMedia(id, req)` · L625 · async · @Post('media')
  - chama: `sendFingerprint` (send-intent.decision.ts:53), `inferType` L148, `sendWithIntent` L560, `SessionManager.sendMedia` (session-manager.service.ts:489)
- `sendMediaUrl(id, body)` · L695 · async · @Post('media-url')
  - chama: `inferType` L148, `sendWithIntent` L560, `SessionManager.sendMedia` (session-manager.service.ts:489), `egressPolicyFromEnv` (safe-fetch.ts:23), `safeFetch` (safe-fetch.ts:235)
- `sendLocation(id, body)` · L767 · async · @Post('location')
  - chama: `sendWithIntent` L560, `SessionManager.sendLocation` (session-manager.service.ts:497)
- `sendPoll(id, body)` · L806 · async · @Post('poll')
  - chama: `sendWithIntent` L560, `SessionManager.sendPoll` (session-manager.service.ts:505)

**Funções e constantes de topo**
- `coldField` = `z.boolean().optional()` · L65
- `idempotencyKeyField` = `z.string().min(1).max(200).optional()` · L66
- `mentionsField` = `z.array(z.string().min(5).max(40)).max(50).optional()` · L69
- `inboxSyncSchema` = `z.object({ chatId: z.string().min(3).max(40).optional(), limit: z.num…` · L72
- `chatFlagSchema` = `z.object({ flag: z.enum(['archive', 'pin', 'mute', 'unread']), enable…` · L79
- `sendTextSchema` = `z.object({ to: z.string().min(5).max(40), text: z.string().min(1).max…` · L84
- `sendMediaUrlSchema` = `z.object({ to: z.string().min(5).max(40), url: z.string().url(), type…` · L94
- `reactionSchema` = `z.object({ emoji: z.string().max(20) })` · L107
- `forwardSchema` = `z.object({ to: z .array(z.string().min(5).max(80), { invalid_type_err…` · L111
- `sendLocationSchema` = `z.object({ to: z.string().min(5).max(40), latitude: z.number().min(-9…` · L127
- `sendPollSchema` = `z.object({ to: z.string().min(5).max(40), name: z.string().min(1).max…` · L138
- `inferType(mimetype)` · L148
  - chamado por: `sendMedia` L625, `sendMediaUrl` L695
- `toConversationDto(c)` · L155
- `toReactionDto(r)` · L169
- `groupSenderOf(m)` · L180
  - chamado por: `toDtos` L290
- `senderKeys(jid)` · L192
  - chamado por: `groupSenderNames` L325
- `toDto(m, mediaUrl, reactions, senderName)` · L198
  - chamado por: `toDtos` L290

## `modules/messaging/messaging.module.ts`

37 linhas · caminho: `apps/gateway/src/modules/messaging/messaging.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/application/inbox-sync.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/domain/inbox.repository.ts`, `modules/messaging/domain/message.repository.ts`, `modules/messaging/domain/reaction.repository.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/infrastructure/prisma-reaction.repository.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`
- importado por: `app.module.ts`

**@Module `MessagingModule`** L19
- imports: `[IamModule, SessionsModule, GuardrailModule]`
- controllers: `[MessagesController, InboxController]`
- providers: `[ MessagePersister, // P-066 (E22): reações em tabela própria (wa_message_reactions), fora de wa_messages. ReactionPersister, InboxSyncService, SendIntentService, // P-068 (E24): encaminhar — laço por destino com intenção, gate cold e intervalo. ForwardService, { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository }, { provide: REACTION_REPOSITORY, useClass: PrismaReactionRepository },…`

**class `MessagingModule`** L19 · @Module({ imports: [IamModule, SessionsModule, GuardrailModule], co…)
