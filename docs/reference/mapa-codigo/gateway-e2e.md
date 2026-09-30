<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — testes e2e (apps/gateway/test)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `gateway/test/audit.e2e-spec.ts` | 98 |
| `gateway/test/auth.e2e-spec.ts` | 335 |
| `gateway/test/baileys-disconnect.e2e-spec.ts` | 166 |
| `gateway/test/baileys-offline.e2e-spec.ts` | 250 |
| `gateway/test/baileys-reaction.e2e-spec.ts` | 59 |
| `gateway/test/baileys-restriction.e2e-spec.ts` | 296 |
| `gateway/test/browser-fingerprint.e2e-spec.ts` | 41 |
| `gateway/test/bullmq-redis-compat.e2e-spec.ts` | 261 |
| `gateway/test/bullmq-shutdown-pending.e2e-spec.ts` | 401 |
| `gateway/test/campaign-bullmq6.e2e-spec.ts` | 454 |
| `gateway/test/campaign-recovery.e2e-spec.ts` | 480 |
| `gateway/test/config.e2e-spec.ts` | 93 |
| `gateway/test/connect-links.e2e-spec.ts` | 1301 |
| `gateway/test/contacts-quota.e2e-spec.ts` | 255 |
| `gateway/test/conversas-encaminhar.e2e-spec.ts` | 1540 |
| `gateway/test/conversas-grupo.e2e-spec.ts` | 214 |
| `gateway/test/conversas-reacoes.e2e-spec.ts` | 544 |
| `gateway/test/f5.e2e-spec.ts` | 253 |
| `gateway/test/f6.e2e-spec.ts` | 99 |
| `gateway/test/g4.e2e-spec.ts` | 107 |
| `gateway/test/g5.e2e-spec.ts` | 82 |
| `gateway/test/g6.e2e-spec.ts` | 98 |
| `gateway/test/g7.e2e-spec.ts` | 114 |
| `gateway/test/g8.e2e-spec.ts` | 151 |
| `gateway/test/groups-leads-fixtures.e2e-spec.ts` | 212 |
| `gateway/test/health.e2e-spec.ts` | 24 |
| `gateway/test/inbox-triage.e2e-spec.ts` | 375 |
| `gateway/test/media.e2e-spec.ts` | 554 |
| `gateway/test/messaging.e2e-spec.ts` | 361 |
| `gateway/test/nest12-contract.e2e-spec.ts` | 687 |
| `gateway/test/nest12-shutdown.e2e-spec.ts` | 481 |
| `gateway/test/new-recipients.e2e-spec.ts` | 528 |
| `gateway/test/proxies.e2e-spec.ts` | 118 |
| `gateway/test/proxy-affinity.e2e-spec.ts` | 451 |
| `gateway/test/proxy-create-session.e2e-spec.ts` | 154 |
| `gateway/test/proxy-suggestion.e2e-spec.ts` | 618 |
| `gateway/test/reply-rate-identity.e2e-spec.ts` | 560 |
| `gateway/test/session-account-inventory.e2e-spec.ts` | 213 |
| `gateway/test/session-lease.e2e-spec.ts` | 486 |
| `gateway/test/session-status-dedup.e2e-spec.ts` | 149 |
| `gateway/test/sessions.e2e-spec.ts` | 179 |
| `gateway/test/setup-app.ts` | 197 |
| `gateway/test/undelivered-observer.e2e-spec.ts` | 95 |
| `gateway/test/webhook-bullmq6.e2e-spec.ts` | 526 |
| `gateway/test/webhooks.e2e-spec.ts` | 170 |
| `gateway/test/wwebjs-engine.e2e-spec.ts` | 1044 |

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

## `gateway/test/baileys-disconnect.e2e-spec.ts`

166 linhas · caminho: `apps/gateway/test/baileys-disconnect.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/observability/metrics.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “E9 — 405 persiste diagnóstico, alerta integrador e conta métrica” · L21
  - it “GET sessão mantém lastError string e acrescenta lastErrorDetails; webhook e métrica recebem 405” · L58

## `gateway/test/baileys-offline.e2e-spec.ts`

250 linhas · caminho: `apps/gateway/test/baileys-offline.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “E7 — fila offline Baileys atravessa banco, webhook, Inbox e reply-rate” · L11
  - it “lote misto e replay após restart geram uma resposta persistida e um webhook” · L108

## `gateway/test/baileys-reaction.e2e-spec.ts`

59 linhas · caminho: `apps/gateway/test/baileys-reaction.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “mapBaileysReaction (W6)” · L6
  - it “contato reage a uma mensagem nossa → fromMe=false, sender=chat” · L11
  - it “nós reagimos (reaction.key.fromMe) → fromMe=true, sender=ourJid” · L27
  - it “emoji vazio = reação removida” · L37
  - it “status@broadcast e key sem id → null (ignorado)” · L46

## `gateway/test/baileys-restriction.e2e-spec.ts`

296 linhas · caminho: `apps/gateway/test/baileys-restriction.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “E8 — restrição Baileys pausa, alerta e retoma sem envio real” · L23
  - it “463 sai da engine, persiste prazo, enfileira alerta e devolve 423 até expirar” · L140

## `gateway/test/browser-fingerprint.e2e-spec.ts`

41 linhas · caminho: `apps/gateway/test/browser-fingerprint.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`

- describe “browserFingerprint” · L6
  - it “é determinístico por sessão (estável entre reconexões)” · L7
  - it “nunca contém o rótulo antigo "WhatsApp Gateway"” · L13
  - it “devolve [plataforma, navegador, versão] plausível” · L26
  - it “distribui entre sessões diferentes (não é tudo o mesmo valor)” · L33

## `gateway/test/bullmq-redis-compat.e2e-spec.ts`

261 linhas · caminho: `apps/gateway/test/bullmq-redis-compat.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis-connection.ts`, `gateway/test/setup-app.ts`

- describe “E17 — compatibilidade Redis N-1 e recuperação BullMQ 6” · L29
  - it “v6 retoma fila pausada pela v5 e rollback v5 consome job atrasado pela v6” · L77
  - it “worker volta a consumir após perda das duas conexões, sem perder ou duplicar jobs” · L179
  - it “shutdown encerra o worker ocioso mesmo com Redis indisponível” · L231

## `gateway/test/bullmq-shutdown-pending.e2e-spec.ts`

401 linhas · caminho: `apps/gateway/test/bullmq-shutdown-pending.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis-connection.ts`, `gateway/test/setup-app.ts`

- describe “E18/P-100 — shutdown diferencial BullMQ 5/6 com ioredis 5” · L35
  - it “close aguarda a Promise EVAL de moveToActive em voo até Redis voltar” · L227
  - it “close ocioso encerra offline quando a conexão principal não tem comandos” · L302
  - it “perda das duas conexões em reconnecting deixa disconnectBlocking pendente após a rede voltar” · L321

## `gateway/test/campaign-bullmq6.e2e-spec.ts`

454 linhas · caminho: `apps/gateway/test/campaign-bullmq6.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/session-manager.service.ts`, `gateway/test/setup-app.ts`

- describe “E17/P-062 — campanhas BullMQ 6 e dados N-1” · L46
  - it “dois workers aceitam wait/delayed da v5 na época zero e preservam reidratação e 8 s” · L209
  - it “legado PAUSED termina sem requeue e resume invalida época zero sem duplicar” · L298
  - it “shutdown espera o job ativo, libera reserva cercada e deixa o segundo worker retomar” · L341
  - it “worker v5 consome job delayed produzido pela v6 e conclui o efeito no Postgres” · L411

## `gateway/test/campaign-recovery.e2e-spec.ts`

480 linhas · caminho: `apps/gateway/test/campaign-recovery.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `gateway/test/setup-app.ts`

- describe “E14/P-057 — recuperação de campanhas no Postgres e Redis” · L37
  - it “PAUSED não cria laço; resume invalida jobs antigos e envia com intervalo global” · L149
  - it “não consome antes da reidratação; sessão ainda fora de WORKING não vira FAILED” · L192
  - it “réplica sem lease libera reserva; após takeover, o mesmo destinatário é enviado uma vez” · L238
  - it “reserva ainda em voo permanece pendente até expirar e não perde o job da retomada” · L282
  - it “falha parcial no enfileiramento pausa e permite reagendar todos os pendentes” · L328
  - it “pausa durante download de mídia não envia nem falha o destinatário” · L364
  - it “downloads concorrentes de mídia ainda espaçam os envios efetivos” · L424

## `gateway/test/config.e2e-spec.ts`

93 linhas · caminho: `apps/gateway/test/config.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`

- describe “validateEnv — cota informativa de contacts/check (E20)” · L18
  - it “permanece desligada por padrão e valida opt-in numérico” · L19
- describe “validateEnv — booleans de env (D-007)” · L50
  - it “ausentes usam o default: enforce=false, ssl=false, pathStyle=true” · L51
  - it “"false" e "0" DESLIGAM (antes viravam true — a pegadinha)” · L58
  - it “"true"/"1"/"on" LIGAM, aceitando maiúsculas e espaços” · L70
  - it “string vazia cai no default (equivale a não definir)” · L82
  - it “valor não reconhecido derruba o boot citando a variável (fail-fast)” · L87

## `gateway/test/connect-links.e2e-spec.ts`

1301 linhas · caminho: `apps/gateway/test/connect-links.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `gateway/test/setup-app.ts`

- describe “link de conexão por QR (e2e)” · L18
  - describe “autenticação e papéis” · L208
    - it “POST/GET/DELETE sem login → 401” · L209
    - it “X-Api-Key válida NÃO cria link (401), embora abra as rotas de API” · L224
    - it “VIEWER consulta (200) mas não cria nem revoga (403)” · L244
  - describe “criar link (POST /api/sessions/:id/connect-link)” · L263
    - it “Baileys STOPPED sem creds → 201 {link ACTIVE, token de 43, path /conectar#token}, TTL padrão 24 h” · L264
    - it “normaliza expectedPhone para dígitos e respeita ttlMinutes” · L295
    - it “expectedPhone não vazio sem dígitos → 400 (não vira "qualquer número")” · L336
    - it “sessão WWEBJS → 409 CONNECT_LINK_ENGINE_UNSUPPORTED” · L342
    - it “sessão WORKING no banco → 409 CONNECT_LINK_SESSION_WORKING” · L349
    - it “engine viva WORKING com banco STOPPED → 409 CONNECT_LINK_SESSION_WORKING” · L356
    - it “login salvo (creds.account) → 409 CONNECT_LINK_SESSION_PAIRED” · L370
    - it “creds só com `me` → 201” · L383
    - it “sessão fica WORKING entre a checagem e o insert → link nasce CONNECTED” · L392
    - it “sessão inexistente → 404” · L408
    - it “GET devolve o último link sem token; segundo create revoga o primeiro (REPLACED → 410)” · L413
    - it “dois creates simultâneos deixam UM link ativo” · L451
    - it “create apaga inativos da sessão com mais de 30 dias e preserva os recentes e os de outra sessão” · L476
    - it “DELETE revoga o link ativo (MANUAL) e o token passa a dar 410; sem link ativo revoga 0” · L519
  - describe “rota pública — credencial do link” · L553
    - it “sem header / Bearer lixo / esquema errado / JWT do painel → 404 CONNECT_LINK_NOT_FOUND” · L554
    - it “corpo de erro nunca ecoa o token (404 desconhecido e 410 revogado)” · L574
    - it “token do link não abre rota autenticada (401)” · L596
    - it “link expirado → 410 CONNECT_LINK_EXPIRED” · L607
  - describe “rota pública — fase ACTIVE” · L626
    - it “QR vivo → phase QR com o data URL; resposta sem nome/número/status da sessão; no-store” · L627
    - it “sem engine e banco STOPPED → phase IDLE, qr null, newQr.available; grava lastSeenAt” · L658
  - describe “rota pública — gerar QR (POST /api/public/connect/new-qr)” · L743
    - it “IDLE → 200, chama newQrForConnectLink e grava a cota; GET vira PREPARING; 2º pedido imediato → 429 COOLDOWN” · L744
    - it “dois pedidos simultâneos → um 200 e um 429, cota gasta uma vez” · L782
    - it “cota esgotada → GET sem botão e POST 409 CONNECT_LINK_NEW_QR_LIMIT” · L790
    - it “login salvo depois de criar o link → GET UNAVAILABLE e POST 409 NEW_QR_UNAVAILABLE sem gastar cota” · L811
    - it “QR vivo na tela → POST 409 NEW_QR_UNAVAILABLE sem gastar cota” · L840
    - it “sessão ocupada (SessionBusyError) → 409 CONNECT_LINK_BUSY sem gastar cota” · L856
    - it “falha ao gerar o QR → 503 CONNECT_LINK_NEW_QR_FAILED com mensagem fixa (sem o erro interno)” · L872
  - describe “consumo pela conexão (evento WORKING no EventBus)” · L892
    - it “número esperado conecta → link consumido; GET 200 CONNECTED sem qr; depois da graça de 15 min → 410 USED” · L893
    - it “tolera o 9º dígito BR (conta antiga conecta sem o 9)” · L933
    - it “sem número esperado → qualquer número consome” · L941
    - it “número errado → revoga WRONG_NUMBER e GET 410; engine fora deste processo (hasEngine=false) não chama rejectC…” · L949
    - it “número errado com a engine neste processo → rejectConnectedAccount(id, motivo, esperado@s.whatsapp.net)” · L977
    - it “meJid @lid com número esperado → WRONG_NUMBER” · L1004
    - it “`wa.event.remote` WORKING é ignorado pelo link” · L1013
    - it “leitura pública com banco WORKING (sem evento) aplica a regra de número” · L1047
    - it “fallback pela timeline: WORKING depois do link consome; WORKING anterior ao link não” · L1104
  - describe “ciclo de vida da sessão” · L1132
    - it “stop depois de consumido não mexe no link conectado” · L1153
    - it “remover a sessão apaga os links em cascata (token vira 404)” · L1167
  - describe “auditoria e lastMeJid” · L1180
    - it “POST create auditado com o usuário; new-qr público auditado com ator link: e path sem token” · L1181
    - it “ator login: só em /api/auth/login; username no corpo de outra rota anônima não forja o ator” · L1235
    - it “GET /api/sessions expõe lastMeJid (aditivo); updateStatus grava e mantém depois do meJid null” · L1272

## `gateway/test/contacts-quota.e2e-spec.ts`

255 linhas · caminho: `apps/gateway/test/contacts-quota.e2e-spec.ts`
- importa (interno): `infra/redis/redis.service.ts`, `gateway/test/setup-app.ts`

- describe “E20 contacts/check — cota observada multi-réplica (e2e)” · L24
  - it “GET aditivo requer auth e lê sem abrir janela” · L113
  - it “default desligado preserva 201 e não cria contador Redis” · L131
  - it “lote original/ordem/duplicados preservados; custo só normalizados distintos” · L154
  - it “duas réplicas contam atomicamente e excesso mantém 201 sem restringir” · L166
  - it “cota é por id de sessão, sem contaminar outra sessão” · L185
  - it “requests sem auth/inválidos/sessão inexistente não contam” · L192
  - it “snapshot/novos lotes não renovam TTL; expiração permite nova janela” · L207
  - it “cota acima do limite não entra no envio explícito de mensagem” · L223
  - it “falha do Redis publica indisponível e mantém consulta com engine falsa” · L237

## `gateway/test/conversas-encaminhar.e2e-spec.ts`

1540 linhas · caminho: `apps/gateway/test/conversas-encaminhar.e2e-spec.ts`
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
    - it “recebida pelo engine grava o raw; a rota encaminha e o eco é gravado (source api, selo 1, cold, chave derivad…” · L1187
    - it “grupo: SKDM, citação e menções da original NÃO vão para o destino; o selo cai no nó do texto” · L1248
    - it “mídia: a mesma do WhatsApp (sem upload), o mediaKey S3 da original no eco e o enum do proto preservado” · L1288
    - it “original NOSSA sai sem selo (isForwarded false), como no app” · L1334
    - it “score vivo no raw (coluna null) ≥ 5 com 2 destinos → 400 FORWARD_LIMIT sem tocar o socket; com 1 → sai com sc…” · L1352
    - it “sem raw: texto remonta fiel; mídia → 400 FORWARD_SOURCE_UNAVAILABLE” · L1372
    - it “raw ilegível (não é um proto.Message) → 400 FORWARD_SOURCE_UNAVAILABLE, nada sai” · L1400
    - it “visualização única (gravada como image) → 400 FORWARD_UNSUPPORTED pela engine” · L1410
    - it “apagada/editada no WhatsApp (messages.update) marca SÓ esta sessão e o encaminhar recusa” · L1435
    - it “P-077: eco de localização e enquete enviadas pela API grava o texto no formato da recebida” · L1489
    - it “recebida com UTF-8 malformado (a lib decodifica em surrogate solto) continua sendo gravada com o raw da E24” · L1512

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

98 linhas · caminho: `apps/gateway/test/g6.e2e-spec.ts`
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

## `gateway/test/groups-leads-fixtures.e2e-spec.ts`

212 linhas · caminho: `apps/gateway/test/groups-leads-fixtures.e2e-spec.ts`
- importa (interno): `modules/groups/interface/groups.controller.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

- describe “P-061/E20 — A/B de leads exclusivamente com fixtures” · L149
  - it “all=true/1 conserva LID sem telefone e nunca inventa seu número” · L179
  - it “mostra diferença de cobertura quando só o Store fixture conhece um par LID” · L200

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

554 linhas · caminho: `apps/gateway/test/media.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/storage/media-storage.service.ts`, `modules/sessions/application/engine.port.ts`, `gateway/test/setup-app.ts`

- describe “Mídia (e2e)” · L18
  - it “POST media sem auth → 401” · L34
  - it “upload multipart → 201 (SessionManager mockado)” · L42
  - it “envio WWEBJS sem confirmação mantém intenção pendente até resultado tardio, sem duplicar” · L70
  - it “upload multipart sem o campo "to" → 400” · L139
  - it “upload multipart com 2 arquivos → 413 e nada é enviado (limits.files=1)” · L166
  - it “upload multipart com "to" DEPOIS do arquivo, em pedaço atrasado → 201 (corpo lido até o fim)” · L215
  - it “upload multipart com campo de nome reservado → 400 e nada é enviado” · L258
  - it “media-url sem url → 400” · L295
  - describe “GET /messages/:msgId/media (GAP 2)” · L306
    - it “baixa os bytes pelo keyId do WhatsApp (o mesmo do webhook)” · L341
    - it “baixa os bytes pelo ULID interno (id do GET /messages)” · L356
    - it “mensagem sem mídia → 404 com motivo claro” · L366
    - describe “Content-Disposition com nome não-Latin-1 (E23)” · L393
      - it “nome com travessão → 200 + filename* UTF-8 (antes: 500 ERR_INVALID_CHAR)” · L437
      - it “nome com emoji → 200 + filename*” · L450
      - it “nome Latin-1 e ASCII → header idêntico ao de antes (sem filename*)” · L462
      - it “Latin-1 com % ; = \ → 200 + fallback com _ e filename* (antes: header cru)” · L482
    - describe “Content-Type com mimetype inválido (E23)” · L504
      - it “mimetype com CR/LF ou não-Latin-1 → 200 com o tipo do S3 (antes: 500), sem header injetado” · L538

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

## `gateway/test/nest12-contract.e2e-spec.ts`

687 linhas · caminho: `apps/gateway/test/nest12-contract.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/crypto.ts`, `shared-kernel/ulid.ts`, `gateway/test/setup-app.ts`

- describe “E18 — contrato /api consumido pelo n8n no runtime Nest 12” · L27
  - it “teste da credential lista sessões; ID e nome devolvem o mesmo DTO sem auth/lease internos” · L143
  - it “texto por nome e replay por ID preservam 201, id/to/deduped e UMA intenção durável” · L192
  - it “parser, schema, auth e resolução recusam 400/401/404 antes do transporte ou da reserva” · L257
  - it “pausa mantém 423 do n8n e libera a intenção para retry; cold=false continua 201” · L310
  - it “POST sem corpo JSON do node mantém 201 e resolve nome antes de start” · L401
  - it “histórico preserva keyId, datas ISO, query e read receipt com chave do WhatsApp” · L412
  - it “cookie continua sujeito a CSRF; X-Api-Key e Bearer conservam acesso de integração” · L472
  - it “papéis e rotas exclusivas do painel continuam fechados antes de qualquer efeito” · L503
  - it “PATCH do node gera efeito e auditoria por API key em sucesso/400 na rota codificada” · L541
  - it “revogar pelo painel invalida imediatamente a credential n8n no banco e no guard” · L588
  - it “baldes de API/login são independentes, 429 mantém headers/corpo e não executa start” · L626

## `gateway/test/nest12-shutdown.e2e-spec.ts`

481 linhas · caminho: `apps/gateway/test/nest12-shutdown.e2e-spec.ts`
- importa (interno): `app.module.ts`, `bootstrap/config.ts`, `bootstrap/fastify-adapter.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/event-fanout.ts`, `infra/redis/redis-connection.ts`, `infra/redis/redis.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/engine.factory.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`

- describe “E18 — Nest 12 encerra o AppModule na ordem das dependências” · L49
  - it “aguarda reidratação, drena efeitos e escritas cercadas, solta lease e só então fecha infra/HTTP uma vez” · L297

## `gateway/test/new-recipients.e2e-spec.ts`

528 linhas · caminho: `apps/gateway/test/new-recipients.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/observability/new-recipients.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `gateway/test/setup-app.ts`

- describe “E20 — novos destinatários sem resposta em 30 dias (e2e)” · L14
  - it “conta destinatários únicos de qualquer origem/isCold, sem duplicar follow-up/eco” · L114
  - it “usa primeiro outbound do histórico retido e exclui relação inbound anterior” · L137
  - it “janela [computedAt−30d, computedAt] inclui limites e exclui passado/futuro” · L149
  - it “resposta depois de 72h conta; entrada futura não conta; G4 continua em 72h” · L160
  - it “exclui grupos, status, broadcasts, newsletters e JIDs inválidos” · L190
  - it “exclui self-chat de meJid/lastMeJid, inclusive device e vínculo LID local” · L204
  - it “une @c.us, PN/device e LID só com vínculo local unívoco” · L220
  - it “LID antigo mapeado impede recontar PN recente como novo” · L232
  - it “LID desconhecido/conflitante fica separado e não infere 9º dígito BR” · L239
  - it “não cruza mensagens nem mapeamentos de outra sessão” · L253
  - it “conta reação/lápide do contato ao outbound ou follow-up, mesmo com LID não resolvido” · L274
  - it “reação no mesmo chat sem alvo retido é resposta; reação anterior exclui nova relação” · L290
  - it “reação LID sem vínculo não atribui alvo com keyId colidido entre dois destinatários” · L298
  - it “keyId duplicado no mesmo destinatário continua unívoco para reação LID” · L313
  - it “keyId colidido ainda permite resposta com PN do chat conhecido” · L328
  - it “colisão do keyId com inbound de outro destinatário impede atribuir reação LID” · L343
  - it “colisão do keyId com self-chat também impede atribuir reação LID” · L358
  - it “inbound em segundo anterior continua excluindo relação prévia mesmo com ingestão posterior” · L395
  - it “reação nossa, de outro PN ou inteiramente futura não é resposta” · L415
  - it “endpoint autenticado aceita nome/id, não expõe contatos e não grava estado/snapshot” · L429
  - it “EventBus → MessagePersister preserva resposta recebida no mesmo segundo do envio” · L454
  - it “EventBus → MessagePersister/ReactionPersister muda a métrica sem criar mensagem de reação” · L489

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

## `gateway/test/proxy-affinity.e2e-spec.ts`

451 linhas · caminho: `apps/gateway/test/proxy-affinity.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/application/proxy-unavailable.error.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `gateway/test/setup-app.ts`

- describe “E15/P-058 — afinidade de proxy no Postgres e Redis” · L29
  - it “RANGE troca o proxy DEAD uma vez e persiste a nova afinidade no Redis/Postgres” · L210
  - it “marcação DEAD participa do rollback da lease e callback antigo não marca após takeover” · L246
  - it “RANGE sem candidato falha e NONE permite transporte direto” · L323
  - it “GET/PUT pelo nome usa a sessão viva sem criar atribuição com o nome” · L372
  - it “dois PUT SINGLE concorrentes não atribuem o mesmo proxy a duas sessões vivas” · L396
  - it “PUT SINGLE permite manter o próprio proxy e recusa proxy de outra sessão sem mutar” · L409

## `gateway/test/proxy-create-session.e2e-spec.ts`

154 linhas · caminho: `apps/gateway/test/proxy-create-session.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Proxy na criação de sessão (e2e, D-008)” · L11
  - it “GET /api/proxies/available lista o livre e esconde o desabilitado” · L63
  - it “cria sessão COM proxyId → nasce com atribuição SINGLE/STICKY e o proxy sai dos livres” · L75
  - it “2ª sessão com o MESMO proxy → 400 "em uso" e a sessão NÃO fica criada” · L106
  - it “proxyId inexistente → 400 sem criar sessão” · L122
  - it “sessão SEM proxyId continua nascendo sem atribuição (comportamento antigo intacto)” · L136

## `gateway/test/proxy-suggestion.e2e-spec.ts`

618 linhas · caminho: `apps/gateway/test/proxy-suggestion.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/sessions/domain/session.repository.ts`, `gateway/test/setup-app.ts`

- describe “Sugestão de proxy ao recriar sessão com o mesmo nome (e2e, E26)” · L20
  - describe “carimbo no DELETE /api/sessions/:id” · L215
    - it “sessão SINGLE apagada → carimba releasedSessionName (nome exato) e releasedAt, preservando o proxy” · L216
    - it “sessão SEM proxy apagada → não há atribuição nem carimbo” · L239
    - it “sessão com mode NONE apagada → órfã sem carimbo e sem sugestão” · L253
    - it “sessão RANGE apagada (mesmo com currentProxyId herdado) → órfã sem carimbo e sem sugestão” · L268
    - it “exclusão que FALHA (manager.remove lança) → sessão segue viva e nada é carimbado” · L292
    - it “falha no carimbo (repo.markReleased rejeita) NÃO bloqueia o DELETE → 200 e sessão apagada” · L316
  - describe “GET /api/proxies/suggestion” · L338
    - it “devolve o proxy da sessão apagada com esse nome, disponível” · L339
    - it “caixa diferente (pedido em MAIÚSCULAS) → mesma sugestão, fromSession com o nome original” · L364
    - it “entre nomes que só diferem na caixa, prefere a caixa idêntica; sem idêntica, a mais recente” · L381
    - it “sem curinga: apagar "…-a-1" e pedir "…-a_1" → {suggestion: null}” · L403
    - it “duas exclusões seguidas do mesmo nome com proxies diferentes → a mais recente” · L414
    - it “IN_USE: outra sessão viva criada com o proxy sugerido → available:false e inUseBySession” · L430
    - it “DEAD: proxy sugerido marcado DEAD → available:false, reason DEAD” · L448
    - it “DISABLED: proxy sugerido desabilitado → available:false, reason DISABLED” · L465
    - it “REMOVED: proxy sugerido excluído do pool → proxy null, reason REMOVED” · L484
    - it “PUT /api/sessions/<ULID apagado>/proxy numa órfã carimbada → 200, carimbo zerado e a sugestão some” · L505
    - it “carimbo numa sessão AINDA viva é ignorado (só sessões que não existem mais)” · L523
    - it “nome sem histórico → {suggestion: null}” · L535
    - it “recriar com o proxy sugerido → 201; a linha antiga segue carimbada e a sugestão vira IN_USE pela própria sess…” · L541
  - describe “validação e acesso” · L575
    - it “sem sessionName → 400” · L576
    - it “sessionName repetido na query (array) → 400” · L598
    - it “sem login → 401” · L607
    - it “OPERATOR → 403 (rota é ADMIN)” · L612

## `gateway/test/reply-rate-identity.e2e-spec.ts`

560 linhas · caminho: `apps/gateway/test/reply-rate-identity.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/observability/reply-rate.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/event-bus/event-bus.ts`, `gateway/test/setup-app.ts`

- describe “E21/P-103 — identidade da reação e evidência ambígua no G4/G5” · L21
  - it “duplicatas do mesmo alvo/chat normalizado não criam colisão” · L246
  - it “alias LID unívoco normaliza device/@c.us e ignora duplicatas do mesmo PN” · L269
  - it “aliases conflitantes não autorizam inferência nem uma resposta artificial” · L276
  - it “alias PN inequívoco divergente não é ignorado por keyId único” · L283
  - it “PN explícito divergente não muda de conversa pelo alvo” · L291
  - it “chaves e aliases de outra sessão não contaminam a inferência local” · L312
  - it “reação no chat explícito após cold conta mesmo sem mensagem-alvo retida” · L321
  - it “alvo inbound não pode virar follow-up nosso pela chave” · L347
  - it “reação ao cold único tolera relógio do contato anterior ao envio” · L356
  - it “remoção tardia preserva interação original; reação antiga alterada tarde não conta” · L362
  - it “inbound confirmado resolve somente os colds que realmente responderam” · L374
  - it “snapshots ambíguos persistidos não entram na mediana da frota” · L418
  - it “amostra abaixo do Nmin mantém a decisão existente de aquecimento” · L481
  - it “coorte madura sem resposta e sem ambiguidade continua gerando quarentena/evento” · L505
  - it “sinal duro e override manual continuam efetivos; cold=false segue permitido em quarentena” · L527

## `gateway/test/session-account-inventory.e2e-spec.ts`

213 linhas · caminho: `apps/gateway/test/session-account-inventory.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `gateway/test/setup-app.ts`

- describe “E20 — inventário seguro de contas por HTTP/Postgres” · L11
  - it “exige autenticação e respeita VIEWER sem iniciar ou consultar engine” · L112
  - it “resolve a rota estática sem perder GET /sessions/:id existente” · L130
  - it “classifica marcadores de pareamento pessoal/Business sem supor ios ou WWEBJS” · L153
  - it “projeta somente escalar seguro e nunca devolve o JSON das credenciais” · L186

## `gateway/test/session-lease.e2e-spec.ts`

486 linhas · caminho: `apps/gateway/test/session-lease.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/setup-app.ts`

- describe “E13/P-056 — posse e fencing entre processos” · L24
  - it “só um manager inicia; após soltar, o outro assume e auth/status do epoch velho não escrevem” · L151
  - it “dois starts simultâneos elegem um único dono e uma única engine” · L261
  - it “standby assume no boot após shutdown do dono e ignora uma sessão que virou STOPPED” · L284
  - it “réplica sem lease não consome a reserva de QR do link” · L342
  - it “logout wwebjs permite que LocalAuth use seu próprio fence sem deadlock” · L354
  - it “restart após crash assume sessão FAILED sem engine; concorrente recebe 409” · L369
  - it “stop após crash assume sessão WORKING sem engine e grava STOPPED” · L385
  - it “réplica antiga não emite RPC após o epoch mudar no banco” · L400
  - it “LocalAuth atrasado não apaga o perfil do novo dono; limpeza tardia só atinge o descartado” · L417
  - it “renovação impede outro dono; expiração incrementa epoch e release velho não apaga a nova posse” · L470

## `gateway/test/session-status-dedup.e2e-spec.ts`

149 linhas · caminho: `apps/gateway/test/session-status-dedup.e2e-spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`

- describe “SessionManager — dedup de session.status (alertas zap/telegram)” · L95
  - it “não republica WORKING repetido (reconexão transitória que não muda nada)” · L96
  - it “republica em transição real e volta a deduplicar no novo patamar” · L107
  - it “mesmo status com erro diferente é informação nova — republica” · L116
  - it “dedup é isolado por sessão — uma não silencia a outra” · L124
  - it “não deduplica eventos que não são session.status (message.ack sempre passa)” · L133

## `gateway/test/sessions.e2e-spec.ts`

179 linhas · caminho: `apps/gateway/test/sessions.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`, `gateway/test/setup-app.ts`

- describe “Sessions (e2e)” · L7
  - it “GET /api/sessions sem auth → 401” · L26
  - it “POST /start com body vazio + content-type json NÃO retorna 400” · L33
  - it “cria sessão (201) e ela aparece na listagem” · L43
  - it “POST /new-qr sem auth → 401” · L67
  - it “POST /new-qr de sessão inexistente → 404” · L75
  - it “POST /new-qr de sessão existente → 200 {ok:true}” · L84
  - it “POST /pairing-code de sessão WORKING → 409 sem código (socket sintético)” · L102
  - it “conta pre-keys só da sessão escolhida, sem incluir outros tipos ou sessões” · L135
  - it “nome inválido → 400 (validação zod)” · L169

## `gateway/test/setup-app.ts`

197 linhas · caminho: `apps/gateway/test/setup-app.ts`
- importa (interno): `app.module.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `bootstrap/rate-limit.ts`, `infra/prisma/prisma.service.ts`, `modules/sessions/application/session-manager.service.ts`
- importado por: `gateway/test/audit.e2e-spec.ts`, `gateway/test/auth.e2e-spec.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/bullmq-redis-compat.e2e-spec.ts`, `gateway/test/bullmq-shutdown-pending.e2e-spec.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/contacts-quota.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/f5.e2e-spec.ts`, `gateway/test/f6.e2e-spec.ts`, `gateway/test/g4.e2e-spec.ts`, `gateway/test/g5.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/g7.e2e-spec.ts`, `gateway/test/g8.e2e-spec.ts`, `gateway/test/health.e2e-spec.ts`, `gateway/test/inbox-triage.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/messaging.e2e-spec.ts`, `gateway/test/nest12-contract.e2e-spec.ts`, `gateway/test/new-recipients.e2e-spec.ts`, `gateway/test/proxies.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/proxy-create-session.e2e-spec.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`, `gateway/test/reply-rate-identity.e2e-spec.ts`, `gateway/test/session-account-inventory.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/sessions.e2e-spec.ts`, `gateway/test/undelivered-observer.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**Funções e constantes de topo**
- `fakeSessionManager` = `{ start: async () => undefined, stop: async () => undefined, restart:…` · L13
- `createTestApp(managerOverride, options)` · L103 · async
  - chama: `buildFastifyAdapter` (fastify-adapter.ts:11), `new LoggingExceptionFilter` (logging-exception.filter.ts), `registerRateLimit` (rate-limit.ts:36)
- `inject(app, opts)` · L144
  - chamado por: `login` L168
- `readSetCookie(res, name)` · L156
- `login(app)` · L168 · async
  - chama: `inject` L144
- `seedSession(app, name)` · L181 · async
  - banco: `waSession.create`, `waSession.deleteMany`
- `removeSession(app, name)` · L190 · async
  - banco: `waSession.deleteMany`

**Tipos**
- interface `InjectOpts` L130 · 4 propriedade(s)
- interface `InjectResponse` L137 · 4 propriedade(s)

## `gateway/test/undelivered-observer.e2e-spec.ts`

95 linhas · caminho: `apps/gateway/test/undelivered-observer.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/guardrail/undelivered-detector.service.ts`, `gateway/test/setup-app.ts`

- describe “observador de não-entrega (SQL real, sem sinal)” · L9
  - it “só observa WWEBJS com 5 mensagens em 3 chats e nunca marca banida” · L79

## `gateway/test/webhook-bullmq6.e2e-spec.ts`

526 linhas · caminho: `apps/gateway/test/webhook-bullmq6.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/domain/webhook.entity.ts`, `modules/webhooks/domain/webhook.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `shared-kernel/event-bus/event-bus.ts`

- describe “E17 — Worker real de webhooks com BullMQ 6” · L55
  - it “duas réplicas + eventos local/remoto entregam uma vez, com HMAC e headers protegidos” · L263
  - it “HTTP 500 usa o backoff de produção e a segunda tentativa conclui sem DLQ” · L331
  - it “HTTP 400 esgota tentativas em DLQ; reentrega concorrente usa a config atual uma vez” · L349
  - it “egress bloqueado é irrecuperável: uma tentativa, nenhuma conexão HTTP e DLQ” · L421
  - it “consome jobs waiting/delayed serializados pelo BullMQ 5.81.5 sem drenar a fila” · L435
  - it “shutdown drena os dois slots ocupados e conserva o próximo job para outro worker” · L472

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

1044 linhas · caminho: `apps/gateway/test/wwebjs-engine.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “WWebJSEngine — guard WA_REQUIRE_PROXY (P0-2)” · L59
  - it “recusa conectar sem proxy quando requireProxy=true (não vaza IP, não sobe Chromium)” · L60
- describe “WWebJSEngine — rótulo da engine (P1-1)” · L79
  - it “expõe engineName "wwebjs" (fonte do rótulo do envelope de webhook)” · L80
- describe “groupFlags — announce/restrict reais do grupo (P-012)” · L86
  - it “lê os valores reais de groupMetadata” · L90
  - it “metadata ausente → false (fallback sem regressão)” · L101
- describe “mapInboundMediaType — tipo de mídia recebida (P0-3)” · L109
  - it “mapeia os tipos do wwebjs para o mediaType público” · L110
  - it “mídia desconhecida cai em document (recuperável no GET /media)” · L119
- describe “WWebJSEngine.detachAuthDir — limpeza do LocalAuth em disco (E13/P-056)” · L125
  - it “separa o perfil ativo e remove só o caminho descartado” · L126
  - it “é no-op (não lança) para sessão sem perfil em disco” · L139
- describe “WWebJSEngine — grupos/contatos/canais implementados (W4/P-010)” · L148
  - it “createGroup vai à lib (sem client → "Sessão não conectada", não mais "não suportado")” · L153
  - it “checkNumbers e setBlock idem (implementados, não mais nope)” · L161
  - it “followChannel idem (canais beta implementados)” · L172
- describe “WWebJSEngine — mensagens ricas (W5): reações e menções” · L181
  - it “sendReaction vai à lib (sem client → "Sessão não conectada")” · L182
  - it “sendText com menções não quebra o caminho (sem client → "Sessão não conectada")” · L190
  - it “sendLocation vai à lib (sem client → "Sessão não conectada")” · L200
  - it “sendPoll vai à lib (sem client → "Sessão não conectada")” · L212
  - it “setProfileStatus/setProfileName vão à lib (sem client → "Sessão não conectada")” · L223
- describe “WWebJSEngine — W8 grupos avançados (membership/settings/foto)” · L238
  - it “groupMembershipRequests/Action e setGroupSetting/Photo vão à lib (sem client)” · L239
- describe “WWebJSEngine — W7 inbox/histórico (listChats/fetchChatHistory)” · L257
  - it “vão à lib (sem client → "Sessão não conectada", não são no-op)” · L258
- describe “WWebJSEngine — W7 gestão de chat (setChatFlag)” · L268
  - it “todos os flags vão à lib (sem client → "Sessão não conectada")” · L269
- describe “buildAuthProxyUrl — upstream do forwarder local (proxy autenticado)” · L280
  - it “injeta as credenciais na URL do proxy” · L281
  - it “percent-encoda credenciais com caracteres especiais (@ : /) sem quebrar a URL” · L291
- describe “proxy-chain — forwarder local p/ proxy autenticado (ERR_TUNNEL_CONNECTION_FAILED)” · L299
  - it “anonymizeProxy devolve URL local sem credencial e closeAnonymizedProxy libera a porta” · L304
- describe “userAgentFor — UA anti-flag estável por sessão (P-012)” · L315
  - it “é DETERMINÍSTICO por sessão (mesmo id → mesmo UA entre reconexões)” · L327
  - it “é um UA de Chrome/Linux plausível e recente (não o Chrome/101 default do wwebjs)” · L333
  - it “varia entre sessões diferentes (frota não usa UA idêntico)” · L343
  - it “WWEBJS_USER_AGENT força um override global explícito” · L352
- describe “raceStoreOp + withStoreReady com teto (P-014 — página do Store travada)” · L365
  - it “raceStoreOp: operação rápida passa; pendurada estoura com mensagem acionável + teto” · L381
  - it “raceStoreOp: rejeição TARDIA da promise órfã é engolida (sem unhandled rejection)” · L388
  - it “probe detecta página que não responde ANTES da operação pesada (fn nem é chamado)” · L397
  - it “operação pendurada estoura o teto próprio (não os 240s do CDP) SEM retry” · L419
  - it “retry do Store-ainda-injetando continua funcionando (regressão do fluxo original)” · L439
  - it “mensagem de erro inclui o percent do loading_screen quando houve progresso (diagnóstico)” · L462
  - it “sem client: comportamento antigo preservado (probe não roda, erro "Sessão não conectada")” · L472
- describe “resolveParticipantsBatch SEM getContacts + auto-heal (P-014, 14/08)” · L479
  - it “participantes resolvem phone/nome SEM chamar getContacts (getContacts ausente no client não explode)” · L503
  - it “probe de página morta dispara o auto-heal (pupPage.reload) com cooldown single-flight” · L532
- describe “WWebJSEngine — shutdown limpo do processo (P-015)” · L565
  - it “shutdown() fecha o Chromium POR FORA do mutex (fila de ciclo de vida presa não impede o destroy)” · L601
  - it “shutdown() com destroy pendurado estoura o teto e rejeita para não liberar o lease” · L617
  - it “destroy limpo grava o marcador no perfil; o start seguinte o consome SEM warn de sujo” · L628
  - it “shutdown() sem client aberto NÃO grava o marcador (não mascara um fechamento sujo anterior)” · L659
  - it “logout remoto pendente segura o fechamento até a promise terminar” · L675
- describe “patch `$1` do WhatsApp Web aplicado na lib (B-002)” · L706
  - it “Utils.js instalado contém o helper getMsgKeyId e Puppeteer.js o guard de exposeFunction” · L711
- describe “P-016/P-017 — probe no envio, teto de mídia e heal em crash (14/08)” · L731
  - it “sendText numa página travada falha em segundos com erro acionável e dispara o heal (P-016)” · L757
  - it “mídia acima do teto NÃO baixa: emite metadados com fileSize e não toca downloadMedia (P-017)” · L787
  - it “mídia dentro do teto segue o fluxo normal de download (regressão)” · L816
  - it “crash do renderer no download dispara o heal imediato (P-017b)” · L847
- describe “P-017c — página CRASHADA (rejeita rápido) também dispara o heal” · L877
  - it “isPageCrashError reconhece as assinaturas de crash e ignora o resto” · L890
  - it “probe: getState rejeitando com Target crashed → erro + heal (antes o catch mascarava)” · L903
  - it “operação que morre com Target crashed dispara o heal (probe passou antes do crash)” · L937
- describe “P-019 — watchdog de sync: fim do WORKING falso” · L967
  - it “3 falhas seguidas do probe rebaixam WORKING → DEGRADED com instrução de re-scan + heal” · L980
  - it “página volta a responder → status retorna a WORKING sozinho” · L1012
  - it “watchdog liga no WORKING e desliga no STOPPED (ciclo pelo setStatus)” · L1035
