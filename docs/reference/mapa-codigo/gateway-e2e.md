<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — testes e2e (apps/gateway/test)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `gateway/test/audit.e2e-spec.ts` | 98 |
| `gateway/test/auth.e2e-spec.ts` | 335 |
| `gateway/test/baileys-reaction.e2e-spec.ts` | 59 |
| `gateway/test/browser-fingerprint.e2e-spec.ts` | 41 |
| `gateway/test/config.e2e-spec.ts` | 61 |
| `gateway/test/conversas-encaminhar.e2e-spec.ts` | 1537 |
| `gateway/test/conversas-grupo.e2e-spec.ts` | 214 |
| `gateway/test/conversas-reacoes.e2e-spec.ts` | 544 |
| `gateway/test/f5.e2e-spec.ts` | 253 |
| `gateway/test/f6.e2e-spec.ts` | 99 |
| `gateway/test/g4.e2e-spec.ts` | 107 |
| `gateway/test/g5.e2e-spec.ts` | 82 |
| `gateway/test/g6.e2e-spec.ts` | 95 |
| `gateway/test/g7.e2e-spec.ts` | 114 |
| `gateway/test/g8.e2e-spec.ts` | 151 |
| `gateway/test/health.e2e-spec.ts` | 24 |
| `gateway/test/inbox-triage.e2e-spec.ts` | 375 |
| `gateway/test/media.e2e-spec.ts` | 484 |
| `gateway/test/messaging.e2e-spec.ts` | 361 |
| `gateway/test/proxies.e2e-spec.ts` | 118 |
| `gateway/test/proxy-create-session.e2e-spec.ts` | 154 |
| `gateway/test/session-status-dedup.e2e-spec.ts` | 130 |
| `gateway/test/sessions.e2e-spec.ts` | 111 |
| `gateway/test/setup-app.ts` | 179 |
| `gateway/test/webhooks.e2e-spec.ts` | 170 |
| `gateway/test/wwebjs-engine.e2e-spec.ts` | 1014 |

## `gateway/test/audit.e2e-spec.ts`

98 linhas · caminho: `apps/gateway/test/audit.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `gateway/test/setup-app.ts`

- describe “auditoria pela rota resolvida (e2e)” · L16
  - it “POST em /%61pi/webhooks grava linha de auditoria com o alvo cru; envio de mensagem não” · L38

## `gateway/test/auth.e2e-spec.ts`

335 linhas · caminho: `apps/gateway/test/auth.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Auth (e2e)” · L27
  - it “login com credenciais erradas → 401” · L41
  - it “login correto → token; /me retorna o usuário” · L51
  - it “/me sem token → 401” · L64
  - it “login seta 2 cookies: token (Path=/) e refresh_token (Path=/api/auth), ambos HttpOnly” · L69
  - it “refresh rotaciona: novo refresh != antigo e o antigo deixa de valer” · L91
  - it “reuso de refresh revoga a família inteira (o token de boa-fé também cai)” · L108
  - it “access expirado + refresh válido → refresh renova e /me volta 200” · L124
  - it “logout revoga o refresh: usar o token pós-logout falha” · L155
  - describe “CSRF em autenticação por cookie” · L172
    - it “POST com cookie + Origin fora da allowlist → 403 (guard) e no logout” · L173
    - it “POST com cookie + Sec-Fetch-Site cross-site (sem Origin) → 403” · L204
    - it “POST com cookie + Origin da allowlist passa pelo guard (cai na validação: 400)” · L220
    - it “Bearer com Origin estranha NÃO é bloqueado (não há CSRF sem cookie)” · L239
    - it “GET com cookie e Origin estranha continua permitido (método seguro)” · L254
  - describe “revogação de sessão” · L267
    - it “reset de senha pelo OWNER invalida o refresh do usuário” · L268
    - it “senha nova curta (<8) é rejeitada com 400” · L315

## `gateway/test/baileys-reaction.e2e-spec.ts`

59 linhas · caminho: `apps/gateway/test/baileys-reaction.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “mapBaileysReaction (W6)” · L6
  - it “contato reage a uma mensagem nossa → fromMe=false, sender=chat” · L11
  - it “nós reagimos (reaction.key.fromMe) → fromMe=true, sender=ourJid” · L27
  - it “emoji vazio = reação removida” · L37
  - it “status@broadcast e key sem id → null (ignorado)” · L46

## `gateway/test/browser-fingerprint.e2e-spec.ts`

41 linhas · caminho: `apps/gateway/test/browser-fingerprint.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`

- describe “browserFingerprint” · L6
  - it “é determinístico por sessão (estável entre reconexões)” · L7
  - it “nunca contém o rótulo antigo "WhatsApp Gateway"” · L13
  - it “devolve [plataforma, navegador, versão] plausível” · L26
  - it “distribui entre sessões diferentes (não é tudo o mesmo valor)” · L33

## `gateway/test/config.e2e-spec.ts`

61 linhas · caminho: `apps/gateway/test/config.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`

- describe “validateEnv — booleans de env (D-007)” · L18
  - it “ausentes usam o default: enforce=false, ssl=false, pathStyle=true” · L19
  - it “"false" e "0" DESLIGAM (antes viravam true — a pegadinha)” · L26
  - it “"true"/"1"/"on" LIGAM, aceitando maiúsculas e espaços” · L38
  - it “string vazia cai no default (equivale a não definir)” · L50
  - it “valor não reconhecido derruba o boot citando a variável (fail-fast)” · L55

## `gateway/test/conversas-encaminhar.e2e-spec.ts`

1537 linhas · caminho: `apps/gateway/test/conversas-encaminhar.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/forward.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `gateway/test/setup-app.ts`

- describe “Encaminhar mensagem — P-068 (e2e)” · L144
  - describe “recusas sem efeito (F0) — nada é reservado nem enviado” · L303
    - it “6 destinos → 400; nenhuma intenção, engine nem é chamada” · L304
    - it “5 destinos (o teto) passa → 201 com 5 envios” · L319
    - it “to vazio, ausente ou fora de lista → 400” · L327
    - it “destinos repetidos (formatação e 9º dígito) → 400 sem reservar” · L341
    - it “canal (@newsletter), status (@broadcast) e número inválido → 400” · L356
    - it “msgId desconhecido → 404” · L370
    - it “mensagem da OUTRA sessão → 404 (pelo keyId e pelo id interno)” · L376
    - it “aceita o id interno (ULID) e o keyId — a engine recebe a mesma original” · L384
    - it “"encaminhada com frequência" (score 5): 2 destinos → 400 FORWARD_LIMIT sem intenção; 1 destino → 201” · L395
    - it “score 4 (abaixo do limiar) com 2 destinos → 201” · L409
    - it “enquete → 400 FORWARD_UNSUPPORTED mesmo em quarentena com destino cold (não 423), sem intenção” · L416
    - it “apagada e editada → 400 FORWARD_UNSUPPORTED (a original guardada é a versão velha)” · L433
    - it “sem token → 401” · L445
  - describe “cold, transporte e chave por destino” · L456
    - it “[PEER, NEW] sem cold → cold só no destino sem conversa; sem chave → idempotencyKey null e nenhuma intenção” · L457
    - it “cold:false não tira o cold de quem não tem conversa; cold:true sobe o de quem tem” · L481
    - it “só mensagens NOSSAS no chat, ou conversa só em OUTRA sessão, não é conversa → cold à força” · L489
    - it “transporte = o número pedido; conversa só no número EXATO (@c.us e grupo quentes; 9º dígito = cold)” · L498
    - it “jid com aparelho vale como o número; @lid sem conversa vai como está e é cold” · L513
    - it “com idempotencyKey: cada envio leva `<chave>:<destino>`, results também; intenções sent” · L524
    - it “a engine recebe a original como gravada (tipo, mídia do S3, score)” · L544
  - describe “revisão da E24 — replay antes da recusa e limpeza em erro inesperado” · L569
    - it “repetir um lote já entregue depois que a original foi apagada → 201 deduped; pedido novo → 400” · L572
    - it “erro inesperado depois da reserva → 500 e intenções failed; o retry envia (sem 409 falso)” · L603
  - describe “idempotência do lote (reserva do lote + chave por destino)” · L628
    - it “repetir o mesmo pedido (outra ordem, outra formatação) → 201 tudo deduped, na ordem do novo `to`, sem reenviar” · L629
    - it “mesma chave com outro conjunto de destinos → 409 e nada sai” · L650
    - it “mesma chave com outra original → 409 e nada sai” · L665
    - it “replay DEPOIS de a sessão entrar em quarentena → 201 deduped (nada a enviar, não 423)” · L679
    - it “falha parcial → 201 misto; repetir com a mesma chave retoma SÓ o destino que falhou” · L699
    - it “dois pedidos simultâneos com a mesma chave → um envio por destino; o outro é replay” · L727
    - it “chave derivada já usada com outro conteúdo (ex.: /text com `<chave>:<destino>`) → 409 no item; nenhum ok → 40…” · L740
    - it “eco já gravado com a chave derivada (intenção expurgada) → deduped pelo wa_messages, sem reenviar” · L766
  - describe “engine recusa ou falha (F2/F3)” · L787
    - it “FORWARD_SOURCE_UNAVAILABLE → 400 com o code e intenções failed; depois a mesma chave envia (takeover)” · L788
    - it “sessão desconectada (erro comum da engine) → 400 com a mensagem; nada sai” · L832
    - it “todos os destinos falham no envio → 400 FORWARD_FAILED com results” · L841
    - it “score VIVO ≥ 5 da engine (coluna null) com 2 destinos → 400 FORWARD_LIMIT, 0 envios, intenções failed” · L855
  - describe “guard-rail: gate cold uma vez, 423 no lote inteiro” · L871
    - it “quarentena + [NEW] → 423 SESSION_QUARANTINED com results, 0 envios” · L875
    - it “quarentena + [PEER, NEW] → 423 no lote inteiro (nem quem tem conversa recebe)” · L894
    - it “quarentena + [PEER] (só conversa aberta) → 201” · L904
    - it “423 com chave não prende a chave: liberada a sessão, a mesma chave envia” · L910
  - describe “ritmo anti-ban: um destino por vez, 1–3 s entre envios efetivos” · L931
    - it “lote novo: pausa só ENTRE envios (to.length-1), com o intervalo sorteado de 1–3 s” · L936
    - it “o intervalo vale entre pedidos da mesma sessão (o 1º envio do novo pedido também espera)” · L960
    - it “envio que falhou não conta para o intervalo” · L966
    - it “dois pedidos simultâneos na MESMA sessão → nunca dois envios ao mesmo tempo, sem intercalar” · L977
  - describe “efeito pelo EventBus real (R6)” · L993
    - it “eco do encaminhar → linha com source api, selo, score, cold, chave derivada e raw” · L994
    - it “NUL (\u0000) no texto, nome/tipo do arquivo e dentro do raw → a linha é gravada sem o NUL” · L1038
    - it “controle: texto com surrogate solto e SEM raw é gravado (o driver troca por U+FFFD)” · L1082
  - describe “ponta a ponta com o BaileysEngine real (engine → EventBus → wa_messages)” · L1105
    - it “recebida pelo engine grava o raw; a rota encaminha e o eco é gravado (source api, selo 1, cold, chave derivad…” · L1184
    - it “grupo: SKDM, citação e menções da original NÃO vão para o destino; o selo cai no nó do texto” · L1245
    - it “mídia: a mesma do WhatsApp (sem upload), o mediaKey S3 da original no eco e o enum do proto preservado” · L1285
    - it “original NOSSA sai sem selo (isForwarded false), como no app” · L1331
    - it “score vivo no raw (coluna null) ≥ 5 com 2 destinos → 400 FORWARD_LIMIT sem tocar o socket; com 1 → sai com sc…” · L1349
    - it “sem raw: texto remonta fiel; mídia → 400 FORWARD_SOURCE_UNAVAILABLE” · L1369
    - it “raw ilegível (não é um proto.Message) → 400 FORWARD_SOURCE_UNAVAILABLE, nada sai” · L1397
    - it “visualização única (gravada como image) → 400 FORWARD_UNSUPPORTED pela engine” · L1407
    - it “apagada/editada no WhatsApp (messages.update) marca SÓ esta sessão e o encaminhar recusa” · L1432
    - it “P-077: eco de localização e enquete enviadas pela API grava o texto no formato da recebida” · L1486
    - it “recebida com UTF-8 malformado (a lib decodifica em surrogate solto) continua sendo gravada com o raw da E24” · L1509

## `gateway/test/conversas-grupo.e2e-spec.ts`

214 linhas · caminho: `apps/gateway/test/conversas-grupo.e2e-spec.ts`
- importa (interno): `infra/directory/contact-directory.service.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `gateway/test/setup-app.ts`

- describe “Conversas — remetente de grupo e senderName (e2e)” · L17
  - it “a mensagem de grupo é gravada com o senderJid do participante” · L166
  - it “GET /messages do grupo: senderName do diretório (agenda > pushName) por telefone, @lid e @c.us” · L173
  - it “1:1: senderName null mesmo com o contato conhecido (o nome da conversa já vem da lista)” · L186
  - it “/search traz o mesmo senderName” · L190
  - it “falha na consulta ao diretório → 200 sem nome (não derruba o GET)” · L200

## `gateway/test/conversas-reacoes.e2e-spec.ts`

544 linhas · caminho: `apps/gateway/test/conversas-reacoes.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/observability/retention.service.ts`, `modules/messaging/domain/reaction.repository.ts`, `modules/sessions/application/engine.port.ts`, `gateway/test/setup-app.ts`

- describe “Conversas fiéis — reações, encaminhada, reply-rate e feed (e2e)” · L22
  - describe “reação grava, troca e remove” · L123
    - it “reação do contato grava UMA linha e aparece no GET /messages da mensagem-alvo” · L124
    - it “trocar o emoji substitui (não duplica); a nossa reação convive com a do contato” · L150
    - it “emoji vazio REMOVE: some do GET /messages (lápide guarda o horário)” · L174
    - it “reação ANTIGA reprocessada fora de ordem não ressuscita a removida” · L186
    - it “mesmo contato como @lid e como telefone numa conversa 1:1 → uma linha só (senderKey peer)” · L199
    - it “telefone NÃO volta para @lid quando uma reação @lid mais nova chega depois do merge” · L224
    - it “grupo: cada participante tem a sua; aparelho (:NN) não duplica” · L251
    - it “evento sem mensagem-alvo não grava nada” · L289
  - it “selo "Encaminhada": o evento message grava isForwarded/forwardingScore e o GET /messages devolve” · L300
  - describe “reply-rate conta reação do contato (D-028)” · L328
    - it “responded = A + B + C + G + H + I (ao cold, no chat, lápide, @lid a follow-up, removida depois, via EventBus)” · L461
  - it “retenção: reação mais velha que RETENTION_MESSAGES_DAYS (90) é purgada; a recente fica” · L475
  - it “feed da caixa única traz o status (ACK) das enviadas — P-072” · L500

## `gateway/test/f5.e2e-spec.ts`

253 linhas · caminho: `apps/gateway/test/f5.e2e-spec.ts`
- importa (interno): `gateway/test/setup-app.ts`

- describe “F5 grupos/contatos/canais (e2e)” · L11
  - it “GET groups sem auth → 401” · L28
  - it “GET groups → 200 (lista, manager mockado)” · L36
  - it “criar grupo sem subject → 400” · L46
  - it “criar grupo válido → 201” · L56
  - it “participants com ação inválida → 400” · L67
  - it “invite link → 200 com code e url” · L77
  - it “contacts check vazio → 400” · L87
  - it “contacts check válido → 200 array” · L97
  - it “contacts save sem firstName → 400” · L108
  - it “contacts save sem jid nem number → 400” · L118
  - it “contacts save válido → 201” · L128
  - it “contacts remove válido → 201” · L143
  - it “criar canal válido → 201” · L154
  - it “GET membership-requests → 200 array” · L166
  - it “membership action inválida → 400” · L176
  - it “membership approve (fila toda) → 201 ok” · L186
  - it “settings sem announce nem restrict → 400” · L197
  - it “settings announce+restrict → 201 ok” · L207
  - it “group photo com url inválida → 400” · L218
  - it “foto de grupo/perfil com URL privada (inclusive IPv6 v4-mapeado) → 400 recusada” · L229

## `gateway/test/f6.e2e-spec.ts`

99 linhas · caminho: `apps/gateway/test/f6.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “F6 campanhas (e2e)” · L6
  - it “POST campaigns sem auth → 401” · L32
  - it “texto sem text → 400” · L37
  - it “maxDelay < minDelay → 400” · L47
  - it “cria campanha de texto (DRAFT) → 201 com total e dedup” · L64

## `gateway/test/g4.e2e-spec.ts`

107 linhas · caminho: `apps/gateway/test/g4.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G4 reply-rate (e2e)” · L9
  - it “reply-rate (7d) exclui cold <72h (C2) e calcula corretamente” · L66
  - it “snapshot (sem window) devolve 7d e 30d” · L82
  - it “persiste o snapshot em session_metrics” · L94

## `gateway/test/g5.e2e-spec.ts`

82 linhas · caminho: `apps/gateway/test/g5.e2e-spec.ts`
- importa (interno): `modules/guardrail/guardrail.service.ts`, `gateway/test/setup-app.ts`

- describe “G5 guard-rail (e2e)” · L16
  - it “observação: cold passa numa sessão nova (estado ativa) → 201” · L46
  - it “observação: evaluate calcula mas NÃO aplica (enforce=false, applied=false)” · L51
  - it “override manual quarentena bloqueia cold → 423 SESSION_QUARANTINED” · L57
  - it “cold=false (chat aberto) passa mesmo em quarentena → 201” · L64
  - it “apply é idempotente (C10): evento antigo não sobrescreve” · L69

## `gateway/test/g6.e2e-spec.ts`

95 linhas · caminho: `apps/gateway/test/g6.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “G6 eventos guard-rail + dead-letter (e2e)” · L12
  - it “transição p/ quarentena emite session.quarantined com payload” · L49
  - it “cold bloqueado emite send.blocked” · L61
  - it “dead-letter: reconciliação reentrega pendentes e marca redeliveredAt” · L69

## `gateway/test/g7.e2e-spec.ts`

114 linhas · caminho: `apps/gateway/test/g7.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G7 health / override / config (e2e)” · L13
  - it “GET /sessions/:id/health → objeto de saúde completo” · L37
  - it “POST /sessions/:id/quarantine força o estado; /health reflete” · L61
  - it “GET /sessions?state= filtra por estado guard-rail” · L78
  - it “PATCH /guardrail/config muda o limiar SEM redeploy” · L96

## `gateway/test/g8.e2e-spec.ts`

151 linhas · caminho: `apps/gateway/test/g8.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G8 config / presence / markRead (e2e)” · L13
  - it “GET /sessions/:id/config → defaults + cap derivado” · L37
  - it “override WWEBJS persiste por sessão e null devolve ao modo global” · L52
  - it “PATCH /sessions/:id/config muda o cap SEM redeploy” · L87
  - it “GET /sessions/:id/health agora traz cap_base/cap_atual” · L107
  - it “POST /sessions/:id/presence → 201 (manager mockado)” · L118
  - it “POST /sessions/:id/messages/:msgId/read → 201” · L129

## `gateway/test/health.e2e-spec.ts`

24 linhas · caminho: `apps/gateway/test/health.e2e-spec.ts`
- importa (interno): `gateway/test/setup-app.ts`

- describe “Health (e2e)” · L5
  - it “GET /health → 200 com status ok e checks verdes” · L15

## `gateway/test/inbox-triage.e2e-spec.ts`

375 linhas · caminho: `apps/gateway/test/inbox-triage.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Caixa única de triagem (e2e)” · L20
  - it “lista as conversas dos DOIS aparelhos numa tacada, sem escolher sessão” · L171
  - it “🔴 última mensagem do contato → pending, com a contagem de entradas esperando” · L178
  - it “🟢 respondido NO CELULAR (source=phone) → answered sem tocar no painel” · L185
  - it “grupo não aparece na caixa única (nem na lista, nem no fluxo)” · L193
  - it “🟡 marcação manual ancorada na entrada da tela → ignored” · L208
  - it “filtro por status devolve só as conversas daquela cor (contadores seguem inteiros)” · L219
  - it “REGRA DE OURO: entrada nova depois do amarelo → volta a pending (🔴)” · L227
  - it “anti-atropelo: marcar com keyId VELHO não grava nada — a conversa fica pending” · L240
  - it “marcar sem keyId ancora na entrada atual → ignored; desmarcar volta a pending” · L251
  - it “REGRA DE OURO: entrada nova depois de respondido (🟢) → pending” · L262
  - it “respondido vence a marca amarela: entrada nova + resposta → answered” · L272
  - it “filtro por aparelho devolve só as conversas daquele aparelho” · L285
  - it “filtro por NOME funciona com sessão cujo id ≠ name (cenário real de produção)” · L299
  - it “triagem de grupo → 400 · status inválido → 400 · sessão inexistente → 404” · L328
  - it “sem autenticação → 401 (tela de triagem não é pública)” · L352
  - it “fluxo cronológico traz as mensagens em sequência, da mais recente para a mais antiga” · L360

## `gateway/test/media.e2e-spec.ts`

484 linhas · caminho: `apps/gateway/test/media.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/storage/media-storage.service.ts`, `gateway/test/setup-app.ts`

- describe “Mídia (e2e)” · L17
  - it “POST media sem auth → 401” · L33
  - it “upload multipart → 201 (SessionManager mockado)” · L41
  - it “upload multipart sem o campo "to" → 400” · L69
  - it “upload multipart com 2 arquivos → 413 e nada é enviado (limits.files=1)” · L96
  - it “upload multipart com "to" DEPOIS do arquivo, em pedaço atrasado → 201 (corpo lido até o fim)” · L145
  - it “upload multipart com campo de nome reservado → 400 e nada é enviado” · L188
  - it “media-url sem url → 400” · L225
  - describe “GET /messages/:msgId/media (GAP 2)” · L236
    - it “baixa os bytes pelo keyId do WhatsApp (o mesmo do webhook)” · L271
    - it “baixa os bytes pelo ULID interno (id do GET /messages)” · L286
    - it “mensagem sem mídia → 404 com motivo claro” · L296
    - describe “Content-Disposition com nome não-Latin-1 (E23)” · L323
      - it “nome com travessão → 200 + filename* UTF-8 (antes: 500 ERR_INVALID_CHAR)” · L367
      - it “nome com emoji → 200 + filename*” · L380
      - it “nome Latin-1 e ASCII → header idêntico ao de antes (sem filename*)” · L392
      - it “Latin-1 com % ; = \ → 200 + fallback com _ e filename* (antes: header cru)” · L412
    - describe “Content-Type com mimetype inválido (E23)” · L434
      - it “mimetype com CR/LF ou não-Latin-1 → 200 com o tipo do S3 (antes: 500), sem header injetado” · L468

## `gateway/test/messaging.e2e-spec.ts`

361 linhas · caminho: `apps/gateway/test/messaging.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Messaging (e2e)” · L13
  - it “send-text sem texto → 400 (validação)” · L29
  - it “send-text válido → 201 com id e to (manager mockado)” · L39
  - it “list sem chatId → 400” · L50
  - it “list com chatId → 200 e array” · L59
  - it “send-text com cold e idempotencyKey → 201, deduped:false” · L71
  - it “send-text com idempotencyKey vazio → 400 (validação)” · L88
  - it “send-text sem auth → 401” · L98
  - it “sync (todos os chats) → 201 com {chats, fetched, imported}” · L109
  - it “sync de um chat específico → 201” · L120
  - it “sync com maxChats fora do range → 400” · L131
  - it “sync sem auth → 401” · L141
  - it “chat flag válido → 201 {ok:true}” · L152
  - it “chat flag inválido → 400” · L163
  - it “chat flag sem enabled → 400” · L173
  - it “chat flag sem auth → 401” · L183
  - it “search com q → 200 e array” · L194
  - it “search sem q → 400” · L204
  - it “search com q só espaços → 400” · L213
  - it “search sem auth → 401” · L222
  - describe “idempotencyKey — reserva durável (ABE-03)” · L234
    - it “mesma key + mesmo payload → 2ª chamada é replay (deduped:true, mesmo id) sem novo envio” · L249
    - it “mesma key com destinatário/conteúdo diferente → 409 e nenhum envio” · L277
    - it “20 requisições concorrentes com a mesma key → UM envio; as demais replay ou 409 "em voo"” · L302
    - it “falha no transporte marca a intenção failed e a MESMA key pode ser retentada” · L332

## `gateway/test/proxies.e2e-spec.ts`

118 linhas · caminho: `apps/gateway/test/proxies.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Proxies (e2e)” · L6
  - it “GET /api/proxies sem auth → 401” · L28
  - it “porta inválida → 400” · L33
  - it “cria proxy → 201, não vaza a senha, recebe posição e aparece na listagem” · L43
  - it “assignment RANGE sem rangeEnd → 400” · L71
  - it “assignment SINGLE sem proxyId → 400” · L81
  - it “define assignment RANGE válido e lê de volta” · L91

## `gateway/test/proxy-create-session.e2e-spec.ts`

154 linhas · caminho: `apps/gateway/test/proxy-create-session.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Proxy na criação de sessão (e2e, D-008)” · L11
  - it “GET /api/proxies/available lista o livre e esconde o desabilitado” · L63
  - it “cria sessão COM proxyId → nasce com atribuição SINGLE/STICKY e o proxy sai dos livres” · L75
  - it “2ª sessão com o MESMO proxy → 400 "em uso" e a sessão NÃO fica criada” · L106
  - it “proxyId inexistente → 400 sem criar sessão” · L122
  - it “sessão SEM proxyId continua nascendo sem atribuição (comportamento antigo intacto)” · L136

## `gateway/test/session-status-dedup.e2e-spec.ts`

130 linhas · caminho: `apps/gateway/test/session-status-dedup.e2e-spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`

- describe “SessionManager — dedup de session.status (alertas zap/telegram)” · L76
  - it “não republica WORKING repetido (reconexão transitória que não muda nada)” · L77
  - it “republica em transição real e volta a deduplicar no novo patamar” · L88
  - it “mesmo status com erro diferente é informação nova — republica” · L97
  - it “dedup é isolado por sessão — uma não silencia a outra” · L105
  - it “não deduplica eventos que não são session.status (message.ack sempre passa)” · L114

## `gateway/test/sessions.e2e-spec.ts`

111 linhas · caminho: `apps/gateway/test/sessions.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Sessions (e2e)” · L6
  - it “GET /api/sessions sem auth → 401” · L25
  - it “POST /start com body vazio + content-type json NÃO retorna 400” · L32
  - it “cria sessão (201) e ela aparece na listagem” · L42
  - it “POST /new-qr sem auth → 401” · L66
  - it “POST /new-qr de sessão inexistente → 404” · L74
  - it “POST /new-qr de sessão existente → 200 {ok:true}” · L83
  - it “nome inválido → 400 (validação zod)” · L101

## `gateway/test/setup-app.ts`

179 linhas · caminho: `apps/gateway/test/setup-app.ts`
- importa (interno): `app.module.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `infra/prisma/prisma.service.ts`, `modules/sessions/application/session-manager.service.ts`
- importado por: `gateway/test/audit.e2e-spec.ts`, `gateway/test/auth.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/f5.e2e-spec.ts`, `gateway/test/f6.e2e-spec.ts`, `gateway/test/g4.e2e-spec.ts`, `gateway/test/g5.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/g7.e2e-spec.ts`, `gateway/test/g8.e2e-spec.ts`, `gateway/test/health.e2e-spec.ts`, `gateway/test/inbox-triage.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/messaging.e2e-spec.ts`, `gateway/test/proxies.e2e-spec.ts`, `gateway/test/proxy-create-session.e2e-spec.ts`, `gateway/test/sessions.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**Funções e constantes de topo**
- `fakeSessionManager` = `{ start: async () => undefined, stop: async () => undefined, restart:…` · L12
- `createTestApp()` · L92 · async
  - chama: `buildFastifyAdapter` (fastify-adapter.ts:11), `new LoggingExceptionFilter` (logging-exception.filter.ts)
- `inject(app, opts)` · L126
  - chamado por: `login` L150
- `readSetCookie(res, name)` · L138
- `login(app)` · L150 · async
  - chama: `inject` L126
- `seedSession(app, name)` · L163 · async
  - banco: `waSession.create`, `waSession.deleteMany`
- `removeSession(app, name)` · L172 · async
  - banco: `waSession.deleteMany`

**Tipos**
- interface `InjectOpts` L112 · 4 propriedade(s)
- interface `InjectResponse` L119 · 4 propriedade(s)

## `gateway/test/webhooks.e2e-spec.ts`

170 linhas · caminho: `apps/gateway/test/webhooks.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “Webhooks (e2e)” · L9
  - it “GET /api/webhooks sem auth → 401” · L28
  - it “url inválida → 400” · L33
  - it “cria webhook → 201, não vaza o secret e aparece na listagem” · L43
  - it “evento no EventBus vira job na fila de webhooks (jobId de dedup válido)” · L77
  - it “POST /webhooks com URL privada/loopback/metadata → 400; host público sem DNS → 201” · L133

## `gateway/test/wwebjs-engine.e2e-spec.ts`

1014 linhas · caminho: `apps/gateway/test/wwebjs-engine.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “WWebJSEngine — guard WA_REQUIRE_PROXY (P0-2)” · L51
  - it “recusa conectar sem proxy quando requireProxy=true (não vaza IP, não sobe Chromium)” · L52
- describe “WWebJSEngine — rótulo da engine (P1-1)” · L71
  - it “expõe engineName "wwebjs" (fonte do rótulo do envelope de webhook)” · L72
- describe “groupFlags — announce/restrict reais do grupo (P-012)” · L78
  - it “lê os valores reais de groupMetadata” · L82
  - it “metadata ausente → false (fallback sem regressão)” · L93
- describe “mapInboundMediaType — tipo de mídia recebida (P0-3)” · L101
  - it “mapeia os tipos do wwebjs para o mediaType público” · L102
  - it “mídia desconhecida cai em document (recuperável no GET /media)” · L111
- describe “WWebJSEngine.purgeAuthDir — limpeza do LocalAuth em disco (P1-2/P1-3)” · L117
  - it “remove o perfil do Chromium da sessão do disco” · L118
  - it “é no-op (não lança) para sessão sem perfil em disco” · L129
- describe “WWebJSEngine — grupos/contatos/canais implementados (W4/P-010)” · L136
  - it “createGroup vai à lib (sem client → "Sessão não conectada", não mais "não suportado")” · L141
  - it “checkNumbers e setBlock idem (implementados, não mais nope)” · L149
  - it “followChannel idem (canais beta implementados)” · L160
- describe “WWebJSEngine — mensagens ricas (W5): reações e menções” · L169
  - it “sendReaction vai à lib (sem client → "Sessão não conectada")” · L170
  - it “sendText com menções não quebra o caminho (sem client → "Sessão não conectada")” · L178
  - it “sendLocation vai à lib (sem client → "Sessão não conectada")” · L188
  - it “sendPoll vai à lib (sem client → "Sessão não conectada")” · L200
  - it “setProfileStatus/setProfileName vão à lib (sem client → "Sessão não conectada")” · L211
- describe “WWebJSEngine — W8 grupos avançados (membership/settings/foto)” · L226
  - it “groupMembershipRequests/Action e setGroupSetting/Photo vão à lib (sem client)” · L227
- describe “WWebJSEngine — W7 inbox/histórico (listChats/fetchChatHistory)” · L245
  - it “vão à lib (sem client → "Sessão não conectada", não são no-op)” · L246
- describe “WWebJSEngine — W7 gestão de chat (setChatFlag)” · L256
  - it “todos os flags vão à lib (sem client → "Sessão não conectada")” · L257
- describe “buildAuthProxyUrl — upstream do forwarder local (proxy autenticado)” · L268
  - it “injeta as credenciais na URL do proxy” · L269
  - it “percent-encoda credenciais com caracteres especiais (@ : /) sem quebrar a URL” · L279
- describe “proxy-chain — forwarder local p/ proxy autenticado (ERR_TUNNEL_CONNECTION_FAILED)” · L287
  - it “anonymizeProxy devolve URL local sem credencial e closeAnonymizedProxy libera a porta” · L292
- describe “userAgentFor — UA anti-flag estável por sessão (P-012)” · L303
  - it “é DETERMINÍSTICO por sessão (mesmo id → mesmo UA entre reconexões)” · L315
  - it “é um UA de Chrome/Linux plausível e recente (não o Chrome/101 default do wwebjs)” · L321
  - it “varia entre sessões diferentes (frota não usa UA idêntico)” · L331
  - it “WWEBJS_USER_AGENT força um override global explícito” · L340
- describe “raceStoreOp + withStoreReady com teto (P-014 — página do Store travada)” · L353
  - it “raceStoreOp: operação rápida passa; pendurada estoura com mensagem acionável + teto” · L369
  - it “raceStoreOp: rejeição TARDIA da promise órfã é engolida (sem unhandled rejection)” · L376
  - it “probe detecta página que não responde ANTES da operação pesada (fn nem é chamado)” · L385
  - it “operação pendurada estoura o teto próprio (não os 240s do CDP) SEM retry” · L407
  - it “retry do Store-ainda-injetando continua funcionando (regressão do fluxo original)” · L427
  - it “mensagem de erro inclui o percent do loading_screen quando houve progresso (diagnóstico)” · L450
  - it “sem client: comportamento antigo preservado (probe não roda, erro "Sessão não conectada")” · L460
- describe “resolveParticipantsBatch SEM getContacts + auto-heal (P-014, 14/08)” · L467
  - it “participantes resolvem phone/nome SEM chamar getContacts (getContacts ausente no client não explode)” · L491
  - it “probe de página morta dispara o auto-heal (pupPage.reload) com cooldown single-flight” · L520
- describe “WWebJSEngine — shutdown limpo do processo (P-015)” · L553
  - it “shutdown() fecha o Chromium POR FORA do mutex (fila de ciclo de vida presa não impede o destroy)” · L589
  - it “shutdown() com destroy pendurado estoura o teto próprio e RESOLVE (não pendura o grace period)” · L605
  - it “destroy limpo grava o marcador no perfil; o start seguinte o consome SEM warn de sujo” · L616
  - it “shutdown() sem client aberto NÃO grava o marcador (não mascara um fechamento sujo anterior)” · L647
  - it “logout() numa página travada estoura o teto do client.logout() e segue para destroy+purga” · L663
- describe “patch `$1` do WhatsApp Web aplicado na lib (B-002)” · L682
  - it “Utils.js instalado contém o helper getMsgKeyId e Puppeteer.js o guard de exposeFunction” · L687
- describe “P-016/P-017 — probe no envio, teto de mídia e heal em crash (14/08)” · L707
  - it “sendText numa página travada falha em segundos com erro acionável e dispara o heal (P-016)” · L733
  - it “mídia acima do teto NÃO baixa: emite metadados com fileSize e não toca downloadMedia (P-017)” · L763
  - it “mídia dentro do teto segue o fluxo normal de download (regressão)” · L792
  - it “crash do renderer no download dispara o heal imediato (P-017b)” · L820
- describe “P-017c — página CRASHADA (rejeita rápido) também dispara o heal” · L847
  - it “isPageCrashError reconhece as assinaturas de crash e ignora o resto” · L860
  - it “probe: getState rejeitando com Target crashed → erro + heal (antes o catch mascarava)” · L873
  - it “operação que morre com Target crashed dispara o heal (probe passou antes do crash)” · L907
- describe “P-019 — watchdog de sync: fim do WORKING falso” · L937
  - it “3 falhas seguidas do probe rebaixam WORKING → DEGRADED com instrução de re-scan + heal” · L950
  - it “página volta a responder → status retorna a WORKING sozinho” · L982
  - it “watchdog liga no WORKING e desliga no STOPPED (ciclo pelo setStatus)” · L1005
