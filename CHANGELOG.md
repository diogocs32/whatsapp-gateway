# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

### Adicionado (15/09 — sessão `caixa-unica-triagem` — **EM PRODUÇÃO 15/09 ~14:07 UTC**, PR #4, CI verde com o e2e novo na 1ª execução real, merge ff `768fb26`; validado por fora: rotas `/api/inbox/*` 404→401, migration aplicada no boot, bundle do dashboard com a rota — ver `docs/sessions/DONE-2026-09-15-1019-caixa-unica-triagem.md`)

Pedido do dono: uma tela para monitorar o que chega de TODOS os aparelhos sem escolher sessão, com semáforo por conversa (respostas 100% humanas, no aparelho).

- **Caixa única de triagem (painel `Atendimento`, rota `/atendimento`):** todas as conversas de todas as sessões numa lista só, ao vivo pelo SSE já existente, com bolinha por conversa — 🔴 `pending` (última mensagem é do contato), 🟢 `answered` (última mensagem é minha, **inclusive respondida no celular**, `source='phone'`), 🟡 `ignored` (marcado à mão "não preciso responder"). **Regra de ouro:** entrada NOVA devolve a conversa para 🔴, estivesse 🟡 ou 🟢. Contadores por cor, filtro por cor e por aparelho, fluxo cronológico de todas as mensagens ("Fluxo ao vivo") e caixa de resposta OPCIONAL (reusa `POST /messages/text` com idempotencyKey — nada automático). A `Inbox` antiga (por sessão) segue como era.
- **API aditiva (R0 — nada existente muda):** `GET /api/inbox/conversations` (`?sessions=`, `?status=`, `?limit=`; responde `{counts, conversations}` com `counts` do conjunto inteiro), `GET /api/inbox/messages` (fluxo cronológico) e `POST /api/inbox/sessions/{sessao}/triage` (`{chatJid, state: ignored|pending, keyId?}`). Grupo (`@g.us`), transmissão (`@broadcast`) e canal (`@newsletter`) **nunca** entram. Documentado em [INTEGRACAO §13](docs/INTEGRACAO.md).
- **Schema:** tabela nova `wa_conversation_triage` (migration aditiva `20260915140000_conversation_triage`) — guarda SÓ o amarelo, ancorado no `keyId` da entrada que estava na tela; 🔴/🟢 são derivados de `wa_messages` (sem flag de "lido", sem job de limpeza: entrada nova invalida a âncora sozinha). Dona: módulo `messaging` (ARQUITETURA atualizada).
- **Anti-atropelo:** o painel manda o `keyId` da entrada que exibiu; se chegou mensagem nova antes do clique, o gateway **não grava** a marca e devolve `status: "pending"` (o amarelo nunca engole mensagem não lida).
- **Contracts:** `InboxConversationDto`/`InboxCounts`/`InboxConversationsResponse`/`InboxFeedItemDto`/`InboxTriageRequest`/`InboxTriageResponse`/`InboxTriageStatus`; `MessageDto` passa a declarar `keyId`, `source` e `isCold` — campos que o `GET /messages` já devolvia e o DTO omitia (drift corrigido, aditivo).
- **Infra CI/dev (fix de carona no mesmo deploy):** MinIO do `docker-compose.yml` e do passo de bucket do CI agora vêm do **quay.io com tag pinada** (`quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` · `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z`) — o Docker Hub passou a negar o pull de `minio/minio` e derrubou o CI em 15/09. MinIO de produção não é afetado (serviço próprio no Dokploy).
- **Testes:** 8 unitários da derivação do semáforo (`triage-status.spec.ts`) + e2e `inbox-triage.e2e-spec.ts` (16 casos: lista cruzando 2 aparelhos, verde por resposta no celular, grupo ausente, amarelo, regra de ouro nos dois sentidos, anti-atropelo, filtros — inclusive por NOME com sessão id≠name —, 400/404/401). SQL agregado validado contra um PostgreSQL 18 real nesta máquina (cluster temporário) porque o e2e só roda no CI.

### Corrigido (09/09 — sessão `baileys-shutdown` — **EM PRODUÇÃO 09/09 ~18:15 UTC**, merge ff `301d42d`, validado — ver `docs/sessions/DONE-2026-09-09-1745-baileys-shutdown.md`)

- **Baileys reidrata no deploy (P-043):** `BaileysEngine.shutdown()` passa a fechar o socket SEM persistir status, espelhando o wwebjs. Antes, o `onModuleDestroy` do container que morre no deploy stop-first caía no `stop()` (o Baileys não tinha `shutdown()`) e gravava `STOPPED`; como os dois containers coexistem por ~15 s, esse `STOPPED` sobrescrevia o `WORKING` do container novo (visto em prod: Diogo enviando com status STOPPED) — e, no pior caso, impediria a reidratação (o `findAutostart` ignora STOPPED). Comentário da porta `IEngine.shutdown` corrigido (o motivo é NÃO persistir status, não "risco de perfil sujo"). 3 testes unitários novos.

### Corrigido / Adicionado (09/09 — sessão `logs-sem-erro-batido` — **EM PRODUÇÃO 09/09 ~17:27 UTC**, merge ff `4af6f9b`, validado em produção — ver `docs/sessions/DONE-2026-09-09-1400-logs-sem-erro-batido.md`)

Pedido do dono: "melhore os logs para não passar nenhum erro batido". Sem mudança de contrato, schema, env ou dependências (checkpoint em `docs/sessions/ATIVA-2026-09-09-1400-logs-sem-erro-batido.md`).

- **Corrigido (P-041):** `request completed` voltou a trazer `res.statusCode` e `res.headers` — o serializer de redação reaplicava o serializer padrão no objeto que o pino-http já tinha serializado (`statusCode: null` em 100% das linhas desde `2836c65`). Teste com o pino-http REAL (`log-redaction.pino-http.spec.ts`) garante status + redação de cookie/authorization/x-api-key/set-cookie/`?token=`.
- **Corrigido (P-042):** erros logados como `{ e }` (18 sites nas engines) saem com mensagem e stack — `{ err: e }` na origem + aliases `e`/`error`/`cause`/`exception` no serializer; `falha ao inicializar` (wwebjs) loga o `Error` inteiro.
- **Adicionado:** `LoggingExceptionFilter` global (estende `BaseExceptionFilter`; resposta idêntica — R0): uma linha por exceção com `reqId`, método, URL mascarada, status, `code`, sessão (`params.id`), usuário/api key (nome), IP — 4xx em `warn`, 5xx em `error` com stack. Instalado também nos e2e.
- **Adicionado:** `console-bridge` — `console.*` das libs (libsignal despeja o registro da sessão Signal; BullMQ usa `console.error` sem listener de `'error'`) vira UMA linha JSON (`log/info` → debug, `warn`/`error` → mesmo nível, teto de 4000 chars).
- **Adicionado:** `worker.on('error')`/`queue.on('error')` nas filas de webhooks e campanhas; `failed` com `job.id`, tentativa e evento; fechamento das filas e DLQ (desfazer reentrega) com aviso.
- **Corrigido:** catches mudos com registro — diretório de contatos, persistência de FAILED, `lastUsedAt` da api key, re-hash de senha, presigned URL de mídia (`mediaUrl indisponível`), locks/marcadores do perfil do Chromium, forwarder do proxy, destroy do client antigo, `resolveNames`; presence de campanha em debug.
- **Corrigido (painel):** sessão parada/deslogada pelo usuário deixa de exibir o `lastError` da execução anterior ("desconectado (LOGOUT) — reconectando (tentativa 1/5)" em sessão STOPPED) — `STOPPED` com `error: null` nas duas engines.

### Segurança / Corrigido / Adicionado (09/09 — sessão `aplicacao-auditoria` — **EM PRODUÇÃO 09/09 ~16:41 UTC**, PR #1 merge ff `2836c65`, validado em produção — ver `docs/sessions/DONE-2026-09-09-1050-aplicacao-auditoria.md`)

Aplicação das recomendações da [auditoria 09/2026](docs/auditoria-melhorias-2026-09.md) em ondas (checkpoint em `docs/sessions/ATIVA-2026-09-09-1050-aplicacao-auditoria.md`, seção ⚠️ com as mudanças de comportamento):

- **Segurança (onda A — P-032/P-033/P-035/P-037):** cookie, `set-cookie`, `?token=` e `Authorization`/`X-Api-Key` redigidos no log HTTP; verificação CSRF para requisições com efeito autenticadas por cookie (`Origin` na allowlist `CORS_ORIGIN`); reset de senha/rebaixamento revogam as famílias de refresh; senha nova 8..128 com scrypt versionado (`PASSWORD_SCRYPT_LOG2N`, re-hash no login) e tempo constante para usuário inexistente; `rediss://`/`REDIS_TLS` e `DB_SSL_CA`; `/health` com prazo por probe; `GET /media` responde 503 (não 404) com storage indisponível; limits de query clampados; headers reservados do webhook protegidos, redirect não seguido, reentrega da DLQ reservada; `gateway_process_errors_total{kind}` em `/metrics`.
- **Ciclo de vida das engines (onda B — P-025/P-026a/WA-09/11/12/15/18):** `initialize()` do wwebjs com teto (`WWEBJS_INIT_TIMEOUT_MS`, 4 min) e 1 retentativa → FAILED com motivo; watchdog de QR/pairing parado (recupera até 3×); callbacks de client antigo ignorados; estado UNPAIRED/CONFLICT vira DEGRADED; pairing code sai em `GET /sessions/:id/qr` (`pairingCode`) e não no log; WARN de idade da build fixa; Baileys com timer de reconexão único por geração e `cachedGroupMetadata`.
- **Garantias de envio (onda C — P-028/P-029, ABE-02..05):** tabela `wa_send_intents` (migration `20260909150000`): com `idempotencyKey` a intenção é reservada ANTES do transporte — replay, **409** para key em voo ou reutilizada com payload diferente, retry após falha; campanhas com `firstContact` (default true, aditivo em contracts/painel) passam pelo gate cold, enviam com `cold: true` e idempotencyKey determinística; start atômico, reserva atômica de destinatário, `dailyCap` por dia local, pausa revalidada antes do efeito, `/resume` reagenda pendentes.
- **Egress/SSRF (onda D — P-031):** `shared-kernel/safe-fetch` — só http/https público, sem credenciais, redirects revalidados, corpo em fluxo com teto `MEDIA_MAX_BYTES`; aplicado a webhook (cadastro 400 / entrega → dead-letter), mediaUrl de campanha e `/messages/media-url`; `EGRESS_ALLOW_HOSTS` para destino interno legítimo.
- **Guard-rail (onda E — P-030):** cooldown respeitado, quarentena manual só sai por override, mediana zero/velha não vira baseline, Nmin único (reply-rate usa o mesmo), transição por compare-and-swap, falha de evento vira log+métrica, `401` deixa de ser "ban".
- **Painel + CI (onda F — P-038/P-039):** Inbox com envio idempotente e trava de duplo clique, respostas obsoletas descartadas na troca de sessão/chat, "Gerar novo QR" sem rajadas, modal acessível (dialog/Escape/foco), ErrorBoundary + `vite:preloadError`; CI com `permissions: contents: read`, actions por SHA, typecheck do dashboard e dos contracts, `npm audit` informativo.
- **Dependências (onda G — P-038, sem majors):** sharp 0.35.4 · fast-uri 3.1.7/4.1.4 · js-yaml 4.3.2 · vitest 4.1.11 · Nest 11.2.3 · Prisma 7.10.0 · BullMQ 5.81.4 · AWS SDK 3.1128.0 · @fastify/helmet 13.1.1 · Vite 8.2.2 · react-router 7.18.3 · eslint 10.10.0 / typescript-eslint 8.70.0 · @swc/core 1.16.2. TypeScript segue 5.9.3; Fastify segue 5.11.3 (pin do Nest 11); wwebjs/Baileys intocados. `npm audit`: 17 → 11 pacotes (2 moderate, 9 high — restam fastify 5.11.3 pinado pelo Nest 11, mysql2/deepmerge-ts via Prisma, extract-zip via puppeteer/wwebjs; alcance documentado no relatório §7.5).
- **Docs:** INTEGRACAO (409, egress, CSRF, campanhas, cooldown), `env.example`, PENDENCIAS (P-025..P-040), ESTADO (produção = `740b911`), SESSOES.

### Documentação (09/09 — sessão `auditoria-melhorias`, sem alteração de código)

- [Auditoria de melhorias e atualizações](docs/auditoria-melhorias-2026-09.md): riscos de contas WhatsApp, engines/guardrail, backend, segurança, continuidade, contratos e dashboard; evidência local, documentação oficial e relatos upstream, com prioridades e critérios de aceite.
- Inventário de 69 pacotes e snapshot do `npm audit`: 17 pacotes sinalizados (12 high, 5 moderate), associados a 14 GHSAs únicos; recomendações de atualização compatível e triagem de alcance, sem instalar ou corrigir dependências.
- Registrados P-027..P-040; atualizados mapa, agenda e encerramento R9. Nenhuma alteração de runtime, banco, configuração ou produção; nenhuma garantia de não banimento.

### Corrigido (31/08 — sessão `envio-sem-onwhatsapp` — **EM PRODUÇÃO ~20:45 UTC**, merge ff `66b7076`, validado com envio real entregue)

- **Envio Baileys sem consulta de existência**: `resolveJid` não chama mais `sock.onWhatsApp`
  a cada envio. Em produção (31/08), pós-reconexão a consulta voltava vazia/`exists:false`
  para números válidos e TODO envio morria com 400 ("O número X não está no WhatsApp");
  além do risco de ban do padrão contact-check. Agora o JID é resolvido localmente
  (`toJid`) e destino inexistente simplesmente não entrega (ACK não evolui — o ledger
  conta a história). Aberta P-023 (9º dígito determinístico) como follow-up.

### Adicionado (18/08 — sessão `m3-qualidade` — **EM PRODUÇÃO ~11:50 UTC**, merge ff `4ea1c75`, CI novo verde)

- **Fronteiras de módulo viram código no CI** (`.dependency-cruiser.cjs`, D-018): as regras de
  ARQUITETURA.md §"Regras de dependência" (internals de módulo alheio, shared-kernel→módulo,
  infra→módulo, src→test, ciclos) agora quebram o build se violadas — todas como `error`
  (levantamento provou zero violação/ciclo em 176 módulos).
- **Testes unitários de domínio** (projeto vitest `unit`, roda SEM infra): máquina de decisão G5
  do guardrail (tabela completa + C10 + hard-gate + mediana da frota + observação×enforce) e
  crypto do shared-kernel (scrypt + vetores FIXOS de HMAC-SHA512/SHA-512 — contrato com os
  integradores de webhook). 28 testes novos; suíte total 198.
- **Cobertura v8 no CI** (`test:cov`, baseline 42% linhas, sem threshold — D-018) e passos novos
  de `format:check` + `depcruise` no workflow.
- **`tsconfig.build.json`**: `nest build` deixa de compilar `**/*spec.ts` para o `dist/`
  (provado com require do grafo completo — lição D-016). Prettier normalizado no repo inteiro +
  ignores de runtime (P-004 ✅). Carona: `@types/pg` 8.23.1.

### Corrigido (16/08 — hotfix pós-deploy da sessão `otimizacao-deps-hotpaths`)

- **Imagem do gateway sem deps ANINHADAS do workspace → boot morria com `Cannot find module
'zod'`** (deploy de 22:11 UTC: build Done, migration aplicada, mas o container novo saía com
  Exited(1) e o Swarm segurava o antigo — produção nunca ficou fora). Causa: o `npm update`
  levou o `eslint-plugin-react-hooks` (devDep da RAIZ) a exigir **zod@4**, que tomou o slot da
  raiz; o **zod@3 do gateway** foi aninhado em `apps/gateway/node_modules` — que o Dockerfile
  NÃO copiava (só `/app/node_modules`), e o `npm prune --omit=dev` ainda removia o zod@4 da raiz
  por ser dev. Fix: o estágio runtime agora copia TAMBÉM `apps/gateway/node_modules` (cobre
  qualquer dep nessa situação; `mkdir -p` no build garante a pasta mesmo com hoisting total).
  Validado com **build local da imagem real** + smoke de require do grafo completo do dist.

### Alterado (16/08 — sessão `otimizacao-deps-hotpaths`)

- **Dependências atualizadas dentro da compatibilidade (D-016)**: NestJS 11.1.27→11.2.1 (fixes de
  SSE: teardown no disconnect e abort — o gateway TEM endpoint SSE), Prisma 7.8→7.9.1 (fix oficial
  de **connection leak em transações interativas no adapter Postgres**), fastify 5.8.5→**5.11.3**
  (o exato que o `@nestjs/platform-fastify@11.2.1` declara — mesma regra do pin de ca0629d; traz
  "reduced per-request overhead" do 5.10 e cache de content-type na serialização do 5.11),
  Baileys rc13→**rc14** (8 commits de bugfix, sem breaking; validar reconexão da frota no deploy),
  BullMQ 5.79→5.81.3 (**dedupa o ioredis** — antes havia 5.10.1 aninhada + 5.11.1 raiz),
  pino 9→**10.3.1** (único breaking = drop de Node 18; **unifica as cópias** — o pino-http@11 exige
  pino 10 e mantinha uma segunda cópia aninhada), pg 8.23, @fastify/* minors, aws-sdk 3.1111,
  vitest 4.1.10, react 19.2.8, react-router 7.18.2, vite 8.2.1, tailwind 4.3.3. Majors deferidos
  com motivo documentado → P-021.
- **Pool do Postgres com tuning explícito**: o driver adapter do Prisma 7 herda os defaults do
  node-postgres — connect timeout **0** (espera infinita na aquisição com o pool saturado; o
  Prisma 6 usava 5s). Novos envs `DB_POOL_MAX` (default 10), `DB_POOL_CONNECT_TIMEOUT_MS` (5000)
  e `DB_POOL_IDLE_TIMEOUT_MS` (300000) — defaults = paridade Prisma 6 conforme a doc oficial.
- **`recordMany` (diretório de contatos) em LOTE**: sync de agenda/leads fazia 1 upsert POR
  contato em série; agora `INSERT ... ON CONFLICT (sessionId, waId) DO UPDATE SET col =
COALESCE(EXCLUDED.col, atual)` em chunks de 200 (round-trips O(N)→O(N/200)), mesma semântica
  de merge (nunca sobrescreve dado conhecido com null); fallback por registro se um chunk falhar.
- **ACK de mensagem atômico**: `updateStatusByKey` (hot path — todo delivered/read) era
  findFirst+update (2 round-trips + corrida read-modify-write entre ACKs concorrentes); virou UM
  UPDATE com a guarda de ranking no SQL (um `delivered` atrasado não sobrescreve mais um `read`).
- **Worker de webhooks com concorrência** (`WEBHOOK_CONCURRENCY`, default 8): o default 1 do
  BullMQ fazia um endpoint lento (teto 10s) segurar TODAS as entregas (head-of-line blocking).
- **Teto de mídia nas campanhas**: `fetchMedia` do worker baixava a URL sem limite de tamanho;
  agora aplica `MEDIA_MAX_BYTES` (content-length antes + tamanho real depois).
- **Índice `wa_contacts (sessionId, phone)`** (migration `indice_wa_contacts_phone`, aditiva):
  `namesFor` (hot path de leads/grupos) busca por OR em waId/lid/jid/**phone** — phone era a única
  chave sem índice; a busca de contatos por telefone no painel também usa.
- **Dashboard com code-splitting por rota** (`React.lazy` + `Suspense`): as 16 telas viram chunks
  próprios do Vite (Login 1,9 kB; vendor 241 kB) em vez de um bundle único; `gzip_vary on` no
  nginx (`Vary: Accept-Encoding` com Traefik/CDN na frente).

### Alterado (16/08 — sessão `dedup-status-alertas`)

- **Dedup de `session.status` na fonte (P-020, D-015)**: o gateway só publica um evento
  `session.status` (webhook + SSE + timeline) quando o par `(status, error)` MUDA. As engines
  reemitiam `WORKING` sem mudança real (Baileys em todo `connection 'open'` → cada reconexão
  transitória; wwebjs no `ready` a cada heal), e o notificador n8n repassava cada uma como alerta
  no zap/telegram — o "muitos alertas, mas nada mudou". `persistStatus` (status atual + detecção de
  engine órfã) segue rodando sempre, antes do gate. Contrato preservado (nota C6 em `INTEGRACAO.md`):
  um status idêntico não é uma transição. `wa_session_events` também para de acumular linhas
  repetidas. 5/5 testes novos (`session-status-dedup.e2e-spec.ts`).

### Adicionado (14/08 — sessão `wwebjs-p015-shutdown-limpo`)

- **Patch `$1` do WA Web** (`patches/whatsapp-web.js+1.34.7.patch`, patch-package no postinstall +
  Dockerfiles + teste que acusa ausência): builds ≥2.3000.104x deixam de quebrar
  sendMessage/getChats/downloadMedia. Build pinada `2.3000.1045101284-alpha` validada em produção
  (leads 99/99 com phone); default do código atualizado. Expira 13/10 (D-013).
- **Shutdown limpo do processo (P-015)**: `shutdown()` na engine wwebjs fecha o Chromium POR FORA
  do mutex de ciclo de vida (teto 7s < grace de 10s do Docker), teto de 8s no `logout()`,
  `stopped` síncrono, marcador `.gateway-clean-shutdown` no perfil (diagnóstico de encerramento
  sujo no boot) e log de duração/estouro no `onModuleDestroy`.
- **Blindagem contra mídia pesada (P-017)**: teto de 24MB para baixar mídia recebida
  (`WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`; acima segue só metadados) + heal imediato quando o renderer
  crasha (`Target crashed`) em QUALQUER caminho (probe, operações, mídia) + retry da build pinada
  antes do fallback live no init.
- **Probe no caminho de envio (P-016)**: sendText/sendMedia/sendLocation/sendPoll falham em ~10s
  com erro acionável (e disparam o heal) quando a página está travada — fim do envio que "não faz
  nada" no painel.
- **Watchdog de sync (P-019 — na main, AGUARDA DEPLOY)**: sonda a página a cada 60s; 3 falhas →
  status DEGRADED com "re-escaneie o QR" (fim do WORKING falso); recupera WORKING sozinho.

### Corrigido / Operação (14/08)

- **P-015 (QR a cada deploy) — causa raiz**: o app no Dokploy estava SEM volume; criado
  `gateway-wwebjs` → `/data/wwebjs` (perfil persiste; validado: 2 trocas de container sem QR).
  Runbook `deploy-dokploy.md` revisado: mount = passo crítico; Update Config **stop-first**
  (start-first com volume compartilhado corrompe o perfil). Memory Limit 2GB → **4GB** (D-014).
- **Regra operacional registrada**: re-sincronização de RECONEXÃO empaca em 99% nas builds atuais
  (bootstrap pós-QR completa sempre) ⇒ deploys do gateway em lote, janela com re-scan aceitável.

### Desempenho

- **wwebjs — extração de leads em LOTE** (sessão `2026-08-12-2043-wwebjs-qualidade-max`): `GET
/groups/{id}` (e `/leads`) resolvia número+nome com **1 round-trip CDP por participante** +
  1 `evaluate` por `@lid` — grupo de 500 levava minutos. Agora usa **1 `getContacts()`** (mapa
  id→contato) + **`getContactLidAndPhone` em blocos de 50** (via oficial da lib para o par
  LID↔telefone). Round-trips O(N) → O(N/50); nomes, telefones e o registro no diretório saem
  idênticos. Fallback um-a-um preservado quando o lote falha.

### Corrigido

- **wwebjs — presença global `available`/`unavailable` real** (sessão `…-2043-wwebjs-qualidade-max`):
  esses dois estados degradavam para `clearState` do chat (respondiam `ok` sem alterar a presença
  online/offline da conta). Agora usam `sendPresenceAvailable`/`sendPresenceUnavailable` (paridade
  com o Baileys). `composing`/`recording`/`paused` inalterados.
- **wwebjs — `PAIRING_CODE` + diagnóstico de queda** (sessão `…-2043-wwebjs-qualidade-max`):
  `requestPairingCode` agora seta o status `PAIRING_CODE` (paridade com o Baileys — o painel/n8n
  distingue "esperando código" de "esperando QR"); listeners `code` (renovação do pairing a cada
  ~3 min) e `change_state` (CONFLICT/UNPAIRED/TIMEOUT **antes** do disconnect) logam o porquê da
  queda. Guard de Chromium ausente (`WWEBJS_CHROME_PATH` errado) falha com erro acionável em vez
  de ENOENT críptico. Higiene: `clearTimeout` no `destroy`, dedup do eco sem `sleep` de 3 s à toa.

- **wwebjs — `announce`/`restrict` reais nos grupos** (sessão `2026-08-12-1959-wwebjs-p012-announce-restrict`,
  P-012): `GET /groups` e `GET /groups/{id}` da engine wwebjs devolviam sempre
  `announce:false`/`restrict:false` (valores fixos — a API mentia). Agora leem os flags reais do
  `groupMetadata` (announce = só admin envia · restrict = só admin edita info). Fallback `false`
  quando a metadata não está carregada (sem regressão). O Baileys já devolvia os valores reais.

### Adicionado

- **W7 — inbox: busca de mensagens** (sessão `2026-08-13-0810-wwebjs-w7c-search`, P-011): recurso
  NOVO aditivo. `GET /api/sessions/{s}/messages/search?q=termo` (opcional `&chatId=&limit=`) busca o
  termo no texto das mensagens (case-insensitive, mais recente primeiro), mesmo formato do
  `GET /messages`. Servida do **banco** → funciona nas **2 engines** e alcança o histórico importado
  pelo backfill. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em P-013.
  **Fecha o W7** (backfill + gestão de chat + busca — todos os itens entregues).
- **W7 — inbox: gestão de chat** (sessão `2026-08-13-0744-wwebjs-w7b-chat-mgmt`, P-011): recurso
  NOVO aditivo. `POST /api/sessions/{s}/messages/{chatId}/flag` (`{flag, enabled}`) arquiva/fixa/
  silencia/marca-não-lido uma conversa (`flag` ∈ archive|pin|mute|unread; `unread` com
  `enabled:false` marca como lido). Só **WWEBJS**; numa **Baileys** responde **501** (archive/
  markRead exigem app-state sync com o histórico — fora do escopo, e falha silenciosa é vetada pelo
  R6). Idempotente. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em
  P-013. Fecha o W7 exceto `searchMessages`.
- **W7 — inbox: backfill de histórico** (sessão `2026-08-13-0726-wwebjs-w7-inbox`, P-011):
  recurso NOVO aditivo. `POST /api/sessions/{s}/messages/sync` (`{chatId?, limit?, maxChats?}`)
  puxa o histórico da engine e grava no banco, populando a inbox de leitura que já existia
  (`GET /messages/conversations` + `GET /messages`) com conversas **anteriores à conexão**.
  Só **WWEBJS** (via `getChats`/`Chat.fetchMessages`); numa sessão **Baileys** responde **501**
  (sem store de histórico — a inbox ao vivo dele segue funcionando). O backfill grava DIRETO no
  banco (dedup por mensagem), **não** dispara webhook nem conta no reply-rate. Mídia histórica sem
  binário (`mediaKey` null → `GET /media` 404). Sem migration/env/breaking. Documentado em
  `INTEGRACAO.md` §12; contracts em P-013. Gestão de chat (archive/pin/mute) e `searchMessages` =
  próximos incrementos do W7.
- **W8 — grupos avançados: fila de entrada, travas admin-only e foto** (sessão
  `2026-08-12-2043-wwebjs-qualidade-max`, P-011): recurso NOVO aditivo nas DUAS engines.
  `GET /api/sessions/{s}/groups/{g}/membership-requests` (fila de entrada pendente),
  `POST …/membership-requests` (`{action: approve|reject, participants?}` — sem `participants`
  age sobre toda a fila, com **anti-flood** de 250–500 ms entre pedidos),
  `POST …/settings` (`{announce?, restrict?}` — travar envio/edição para admins) e
  `POST …/photo` (`{url}` — foto do grupo, o gateway baixa a imagem ≤10 MB). wwebjs via
  `getGroupMembershipRequests`/`approve`/`reject` + `setMessagesAdminsOnly`/`setInfoAdminsOnly`
  - `setPicture`; Baileys via `groupRequestParticipantsList`/`Update` + `groupSettingUpdate`
  - `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §9.2;
    contracts em P-013.
- **Anti-flag wwebjs — User-Agent realista e estável por sessão** (sessão
  `…-2043-wwebjs-qualidade-max`, P-012): o UA do Chromium passa a variar por sessão de forma
  **determinística** (paridade com o `browser-fingerprint` do Baileys) — estável entre reconexões,
  distinto entre sessões (frota inteira com UA idêntico denuncia automação). `WWEBJS_USER_AGENT`
  segue como override global. Variáveis `WWEBJS_*` agora validadas no zod do boot (vazio = ausente).

- **W8 — perfil da conta: status, nome e foto** (sessões `…-1941-wwebjs-w8-perfil-conta`
  e `…-1947-wwebjs-w8b-foto-perfil`, P-011): recurso NOVO aditivo nas DUAS engines.
  `POST /api/sessions/{s}/profile/status` (`{status}` — recado/"about", ≤139),
  `POST …/profile/name` (`{name}` — nome de exibição, ≤25) e `POST …/profile/photo`
  (`{url}` — o gateway baixa a imagem, ≤10 MB). wwebjs via `setStatus`/`setDisplayName`/
  `setProfilePicture`, Baileys via `updateProfileStatus`/`updateProfileName`/
  `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md`;
  contracts em P-013.
- **W6 — webhook mais rico: reações recebidas** (sessão `2026-08-12-1921-wwebjs-w6-webhook-reacoes`,
  P-011): novo evento **`message.reaction`** no webhook — quando o contato (ou você, em outro device)
  reage a uma mensagem. Payload `{ keyId (msg-alvo), chatJid, senderJid, emoji ('' = reação removida),
fromMe, timestamp }`. Capturado nas DUAS engines (wwebjs `message_reaction`, Baileys
  `messages.reaction`) e roteado ao webhook pelo fluxo existente (dedup por id de envelope, filtro por
  nome de evento — assine `*` ou `message.reaction`). Completa o round-trip de reações da W5. Sem
  migration/env/breaking. Documentado em `INTEGRACAO.md`; contracts em P-013. Edição/revogação/votos
  (vote_update) recebidos = incrementos futuros (Baileys exige inspeção de protocolMessage/decifrar).
- **W5b — mensagens ricas: localização e enquete** (sessão `2026-08-12-1902-wwebjs-w5b-location-poll`,
  P-011): recurso NOVO aditivo nas DUAS engines. **Localização**: `POST /api/sessions/{s}/messages/location`
  (`{to, latitude, longitude, name?, address?}`). **Enquete/poll**: `POST /api/sessions/{s}/messages/poll`
  (`{to, name, options[2..12], multi?}`). Ambos com `cold`/`idempotencyKey` e o mesmo hard-gate do
  guard-rail. Sem migration/env/breaking (rotas novas). Documentado em `INTEGRACAO.md`; contracts em
  P-013. **Reply/quote deferido** (o Baileys só persiste `raw` de mensagens enviadas, não das recebidas);
  captura de votos (`vote_update`) e vCard = incrementos futuros.
- **W5 — mensagens ricas: reações e menções** (sessão `2026-08-12-1746-wwebjs-w5-mensagens-ricas`,
  P-011 1º incremento): recurso NOVO **aditivo** nas DUAS engines (Baileys + wwebjs). **Reações**:
  `POST /api/sessions/{s}/messages/{msgId}/reaction` com `{ emoji }` (emoji vazio remove a reação).
  **Menções**: `text` e `media-url` aceitam `mentions: [números/JIDs]` (marca @, até 50). Sem
  migration, sem env, sem breaking (campos opcionais; rota nova). Contrato documentado em
  `INTEGRACAO.md`; formalização em `packages/contracts` adiada (P-013 — o arquivo está no escopo
  da sessão ativa `auth-refresh`, R9). location/poll/reply/vCard ficam para o próximo incremento.

- **wwebjs W4 — paridade funcional do motor** (sessão `2026-08-12-1736-wwebjs-w4-superficie`,
  P-010): os 14 métodos que a engine whatsapp-web.js respondia como "não suportado" (HTTP 501)
  passam a **funcionar de verdade** — a API já existia na lib 1.34.7. Grupos: `createGroup`,
  `updateParticipants` (add/remove/promover/rebaixar), `leaveGroup`, `setGroupSubject`,
  `setGroupDescription`, `groupInviteCode`, `groupRevokeInvite`. Contatos: `checkNumbers`
  (checa se o número tem WhatsApp + JID canônico), `profilePicture`, `setBlock`
  (bloquear/desbloquear). Canais/newsletter (beta): `createChannel`, `channelInfo`,
  `followChannel`, `unfollowChannel`. O motor wwebjs passa a ter **paridade com o Baileys** no
  contrato IEngine. Sem mudança de contrato (as rotas já existiam; deixaram de responder 501). O
  mecanismo `UnsupportedEngineOperationError`→501 permanece como contrato de capacidade de engine
  (dormante — sem operações não suportadas hoje; previsto para a futura engine META_CLOUD).

### Corrigido

- **wwebjs W3 — ciclo de vida e recuperação** (sessão `2026-08-12-1723-wwebjs-w3-ciclo-vida`,
  P-009): as credenciais do wwebjs vivem em disco (LocalAuth em `{WWEBJS_DATA_PATH}/session-<id>`),
  não no Postgres — agora `logout`/`new-qr`/`DELETE` **limpam o perfil do Chromium do disco**
  (`WWebJSEngine.purgeAuthDir`). Fim de dois defeitos: (a) `DELETE /api/sessions/:id` deixava o
  perfil (dezenas–centenas de MB) órfão no volume para sempre a cada sessão WWEBJS removida;
  (b) `POST /api/sessions/:id/new-qr` era no-op para wwebjs (limpava só o Postgres → o LocalAuth
  restaurava o mesmo perfil e a sessão voltava sem QR novo) — agora recupera de verdade. Robustez:
  `destroy()` do Chromium com **teto de 12s** (um Chromium travado não pendura mais o mutex de ciclo
  de vida da sessão), `qrBase64` zerado no `stop` (não serve QR morto) e teto FIFO no cache
  LID→telefone. Operações não suportadas pelo wwebjs (grupos de escrita, canais, checkNumbers,
  profilePicture, setBlock) passam a responder **HTTP 501** (Not Implemented) em vez de 400, via
  `UnsupportedEngineOperationError` — o integrador distingue "engine não faz isso" de "payload
  inválido". Sem migration/env/contrato.
- **wwebjs W2 — mídia no S3 + rótulo de engine no webhook** (sessão
  `2026-08-12-1715-wwebjs-w2-midia`, P-008): a engine whatsapp-web.js passa a **baixar a
  mídia recebida** (`msg.downloadMedia`) e persisti-la no S3 — antes toda mídia inbound
  virava `type:'other'` sem download e o `GET /api/sessions/:id/messages/:msgId/media`
  respondia 404 para 100% das mídias WWEBJS. A **mídia enviada** também sobe ao S3
  (`mediaKey` no evento → o webhook recebe a `mediaUrl` e o Inbox mostra o binário).
  Envio ganhou fidelidade de tipo (`sendMediaAsDocument`/`sendMediaAsSticker` — antes um
  sticker ia como imagem) e guard contra retorno null do `sendMessage`. O **envelope de
  eventos (webhook OUT) passa a rotular a engine REAL da sessão**: uma sessão WWEBJS
  reporta `engine:"wwebjs"` (antes TODO evento saía como `baileys`, inclusive de sessões
  WWEBJS — o node n8n recebia o campo errado); implementado via `engineName` na interface
  `IEngine`, derivado no `SessionManager`. Sem mudança de contrato (o campo `engine` já
  existia no envelope). Falha de download/upload emite os metadados sem binário (a
  conversa não some), como no Baileys.
- **wwebjs W1 — estabilidade e segurança do motor** (sessão `2026-08-12-1702-wwebjs-w1-estabilidade`,
  P-007): (P0-1) **reconexão automática** da engine whatsapp-web.js com backoff exponencial + jitter
  (espelha o Baileys, teto `MAX_RECONNECT=5` → `DEGRADED`), e **fim do `start` no-op**: o handler
  `disconnected` agora zera `this.client` — antes a lib destruía o Chromium mas mantinha a instância,
  e `doStart` (`if (this.client) return`) fazia todo `POST /start`/`/restart` responder 200 sem
  reconectar (sessão caía no meio de campanha e não voltava). (P0-2) o guard **`WA_REQUIRE_PROXY`
  agora vale no wwebjs**: sem proxy vivo e com o guard ligado, a engine RECUSA conectar em vez de
  vazar o IP do datacenter (o `1525e4e` injetava `requireProxy` mas o motor browser nunca o lia) +
  log WARN ao conectar sem proxy (paridade com o Baileys). Primeiro teste que instancia a engine
  wwebjs real (`test/wwebjs-engine.e2e-spec.ts`, prova por mutação do guard) — antes a cobertura do
  caminho wwebjs era zero. Sem mudança de contrato. **Ação operacional pendente do dono (P0-4):**
  revalidar/pinar `WWEBJS_WEB_VERSION` no Dokploy antes de a atual expirar (~fim de agosto/2026).

### Adicionado

- **Hardening anti-flag do WhatsApp** (sessão `2026-07-22-1700-hardening-antiban`): fingerprint
  de browser realista e ESTÁVEL por sessão no Baileys (`browser-fingerprint.ts` — pick
  determinístico por sessionId entre 6 fingerprints desktop reais), substituindo o antigo
  `['WhatsApp Gateway','Chrome','1.0.0']` que aparecia como "WhatsApp Gateway" em Aparelhos
  Conectados e denunciava automação. Log WARN quando uma sessão conecta SEM proxy (fim do ponto
  cego — antes a conexão direta pelo IP do servidor era silenciosa). Nova env `WA_REQUIRE_PROXY`
  (default false): quando ligada, a engine recusa conectar sessão sem proxy vivo em vez de vazar
  o IP do servidor/datacenter. Efeito de fingerprint só aparece após RE-VÍNCULO da sessão.
- **P0 estabilidade de sessão** (sessão `2026-07-21-1730-estabilidade-sessoes`): rota
  `POST /api/sessions/:id/new-qr` — limpa as credenciais persistidas e reinicia o socket
  (recuperação de sessão desconectada pelo celular; aditiva — R0/R4, sem tipo novo no contracts).
  O botão "Gerar novo QR" do painel passa a usá-la (antes fazia restart com credenciais mortas
  e a sessão voltava a FAILED sem nunca gerar QR).
- Base universal **v3.2** adotada (D-010): `BASE_CONEXOZENVO.md` (raiz, R0–R18), `docs/MAPA.md`,
  `docs/AUDITORIAS.md`, `docs/ADOCAO.md` (diagnóstico com evidências + ondas A1–A7).

- **M0 · Doc viva**: `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/DECISOES.md`, `docs/ARQUITETURA.md`
  (tabelas donas validadas contra o schema.prisma — divergências em D-002/D-003), `docs/PROJETO.md`,
  `docs/sessions/`, `CLAUDE.md` (raiz) e este `CHANGELOG.md`.
- `DOCUMENTO_CONEXOZENVO_NESTJS.md` (processo de ondas M0–M6) adicionado ao versionamento.
- **Proxy livre na criação de sessão (D-008)**: `GET /api/proxies/available` (proxies enabled,
  não-DEAD e sem sessão usando) e campo OPCIONAL `proxyId` no `POST /api/sessions` — a sessão
  nasce com atribuição `SINGLE`/`STICKY` exclusiva (1 proxy = 1 sessão), ou sem proxy se omitido.
  Dropdown "Proxy (só os livres aparecem)" no formulário de nova sessão do painel; contrato em
  `packages/contracts` (`CreateSessionRequest.proxyId?`) e docs/INTEGRACAO.md §11. Sem migration.

### Alterado

- `docs/auditoria-2026-07.md`: item O4 (S3 em prod) marcado ✅ — resolvido em 04/07/2026
  (Cloudflare R2, bucket `conexozenvo-wa-media`, `storage: true` confirmado no `/health`).
- **M1 · Destravar produção (10/07/2026)**: O1 (re-sync Webshare — todos os proxies ALIVE,
  sessões WORKING), O2 (Memory Limit no Dokploy — `memoryUsedPct` 0→0.27 no `/health`) e
  O3 (Validate DNS verde) concluídos → **auditoria 07/2026 100% encerrada (código + operacional)**.
  Sem mudança de código — onda operacional; produção roda `808c175` desde 13:28 UTC.

### Corrigido

- **Engine Baileys sem mutex de ciclo de vida**: dois `start()` próximos (duplo clique,
  restart sobre start, create + autostart) criavam DOIS sockets — o primeiro ficava órfão e os
  dois brigavam pela sessão (conflito 440 em loop até esgotar as reconexões, QR nunca
  estabilizava). start/stop/logout/reconexão agora serializados por sessão (espelha o mutex que
  a engine wwebjs já tinha).
- **`loggedOut` (desconectado pelo celular) deixava credenciais mortas**: agora limpa
  `wa_auth_keys` + `creds` e para em STOPPED com `lastError` claro — o próximo start gera QR
  novo direto (antes ficava FAILED e todo restart reconectava com as creds inválidas).
- **Painel "logado" após o JWT de 12h expirar**: qualquer 401 de `/api/*` agora desloga e
  redireciona ao `/login` (antes o polling repetia 401 no console indefinidamente com a UI
  aparentando sessão ativa).

- **Booleans de env** (`DB_SSL`, `GUARDRAIL_ENFORCE`, `S3_FORCE_PATH_STYLE`): trocado o
  `z.coerce.boolean()` (que fazia `Boolean(texto)` — `"false"`/`"0"` viravam TRUE) por parser
  explícito `envBool`: `true/1/yes/on` liga · `false/0/no/off` desliga · valor inválido derruba
  o boot com o nome da variável (D-007). Regressão coberta por `test/config.e2e-spec.ts` (suíte 74).
