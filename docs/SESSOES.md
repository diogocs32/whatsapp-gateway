# 🔀 SESSÕES DE TRABALHO — ConexoZenvo

> Painel de conversas paralelas (protocolo R9). Toda sessão se registra aqui ao abrir,
> cria seu arquivo em `sessions/` e trabalha na própria branch `feature/*`.
> Escopos de sessões ativas devem ser DISJUNTOS (ideal: 1 sessão = 1 módulo).
> Pontos de contato globais (declarar no escopo se for tocar): `schema.prisma`,
> `packages/contracts`, `app.module.ts`, `docker-compose.yml`, `ci.yml`.

## 🟢 Sessões ativas

| ID                    | Início      | Objetivo                                                                                                      | Escopo                                                                     | Branch                |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------- |
| lid-envio-wwebjs      | 31/08 19:30 | Consertar "No LID for user" no envio da engine WWEBJS (PN→LID local, sem rede; campanha congelada aguardando) | `modules/sessions/infrastructure/wwebjs/` + docs                           | fix/lid-envio-wwebjs  |
| e9-baileys-desconexao | 26/09 14:48 | E9/P-049: matriz de desconexão Baileys, versão, diagnóstico e métrica; PR #11 sem merge/deploy                | `sessions/infrastructure/baileys/` + config/métricas/contratos/testes/docs | feature/onda2-baileys |

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

> Decisão/mudança que afeta outras sessões entra AQUI na hora: data, sessão, o quê,
> quem precisa saber. A sessão que absorveu o aviso o remove no próprio encerramento.

- **26/09 · e9-baileys-desconexao (E9/P-049, PR #11 — sem deploy):** `wa_sessions` ganhou
  `lastErrorDetails` JSONB pela migration `20260926175800_baileys_disconnect_details`;
  `SessionDto` expõe `{code,reason}` de forma aditiva e mantém `lastError` textual. O Baileys
  publica `session.client_too_old` para 405 e `/metrics` soma
  `wa_disconnects_total{engine,code}` por processo; a versão do protocolo é registrada por
  conexão e um par de envs limita override à sessão canário. Para E10, preserve os guards
  `stopped`/`connectGeneration`, a política de desconexão (especialmente 440 quieto) e a
  pausa E8: `connection.update` é provisório, só o retorno direto do RPC confirma o prazo.
  Migration aplicada apenas no Postgres local; merge/deploy/canário seguem pendentes.

- **26/09 · e8-baileys-restricao (E8/P-048, PR #11 — sem deploy):** `SessionManager` consulta a
  pausa temporária de `session_guardrail` antes de cada envio de mensagem; texto, mídia,
  localização, enquete, reação e cada destino do encaminhar recebem 423 até o prazo. Campanhas
  re-agendam sem `PAUSED`. Baileys rc14 liga ERROR 463, `reachoutTimeLock` e capping CAPPED,
  emite `session.restricted` (contrato aditivo) e grava ACK ERROR como `error`; 479 só é contado.
  A revisão de 26/09 confirmou que a notificação rc14 pode fabricar `Date` como agora + 60 s:
  `connection.update` entra como `source=temporary`, e só a resposta direta do RPC confirma
  `timeEnforcementEnds`. A E9 deve preservar esse callback e essa distinção ao mudar
  `onConnectionUpdate`. Migration
  `20260926164000_restricao_temporaria` aplicada só no banco local; merge/deploy/canário após E12.

- **26/09 · e7-baileys-offline (E7/P-047, PR #11 — sem deploy):** `onMessagesUpsert` do Baileys agora
  é async e consulta `wa_messages` por `(sessionId,keyId)` antes do `onEvent`; qualquer teste privado
  que o chama precisa `await`. `append` de terceiro até 48 h passa, `append` fromMe/status/newsletter
  não. Preservados `describeBaileysMessage`, `message.reaction`, participante de grupo e `raw` inbound.
  Nenhum campo público ou migration; E8 continua na mesma branch/PR. Limites P-056/B-004 e P-034.

- **26/09 · e6-wwebjs-leve (E6/P-060, branch da Onda 6 — sem deploy):** mídia recebida em grupo na engine WWEBJS passa a sair sem `mediaKey` por padrão; `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA=true` liga o download automático. Mídia 1:1 baixa por stream; envio WWEBJS acima de 24 MB retorna 400. Envio sem confirmação após 120 s conserva a intenção pendente até o resultado tardio, com 409 para retry da mesma chave enquanto isso. `ready` evita repetir syncAddressBook/merge após heal. Quem tocar fluxo de mídia ou enviar na E7+ deve preservar essas regras; INTEGRACAO §2/§3.1 e D-033 as descrevem. Canário com chip e deploy W permanecem para o dono.

- **26/09 · e5-wwebjs-pronto (PR #8 mergeado na `main`, Onda 6 ainda sem deploy):** a E5
  preserva o default validado `2.3000.1045101284-alpha` e permite canário da candidata
  `2.3000.1046934385-alpha` por `session_config.wwebjsWebVersion` (migration aditiva; PATCH não
  reinicia). A E6 continua pendente; pode seguir em `feature/onda6-wwebjs` a partir do merge atual. Não promover a candidata antes do teste com chip.
  `LOGOUT`/`UNPAIRED`/`CONFLICT` agora param sem QR automático; pairing e heal têm teto. P-086
  guarda o pedido de link público temporário para pareamento por QR como etapa futura.

- **26/09 · e25-encaminhar-painel (branch `feature/onda8-conversas`, PR #7 mergeado em 26/09; deploy G manual pendente):** (1) o painel encaminha pelo `lib/forward.ts` — regras ESPELHO do gateway,
  conferidas no `forward.spec.ts` contra o `forward.decision.ts`/`engine.port.ts` reais: mudou
  limite/tipo encaminhável/destino canônico no gateway → atualize o painel no mesmo PR; (2) `ApiError`
  tem `code` e `body` (aditivo); (3) `ChatThread` ganhou `forward`/`footer` (o rodapé é a caixa de
  resposta; no modo seleção vira a barra) — tela nova com conversa passa por ele; (4) `<dialog>`: o
  Chrome fecha à força num Esc repetido e o `close` atrasa em aba oculta — nunca contar com o diálogo
  aberto; (5) Tailwind 4: toque = `not-pointer-fine:`, foco de teclado no grupo =
  `group-has-[:focus-visible]`; (6) P-084 (sugerir proxy da sessão apagada → E26) e P-085 (regra de 1
  grupo na API) novas; (7) runbook do deploy G: `how-to/deploy-g-onda8.md`.

- **26/09 · e24-encaminhar-api (branch `feature/onda8-conversas`, PR #7 mergeado em 26/09; sem deploy G):**
  (1) rota nova `POST …/messages/:msgId/forward` — laço em `messaging/application/forward.service.ts`
  (regras puras em `forward.decision.ts`), engine por `IEngine.prepareForward` → `send`; quem mexer
  no `sendWithIntent`/intenções confira que o encaminhar reproduz a mesma ordem (dedup legado →
  reserva → gate → envio); (2) **o Baileys grava `raw` também nas RECEBIDAS** (a original do
  encaminhar; 7 d de retenção) — webhook, SSE e fan-out a removem; listagens usam `omit: { raw:
true }`; quem criar leitura nova de `wa_messages` não traga o `raw` à toa; (3) `decodeProto` agora
  passa por `proto.Message.fromObject` (enum preservado) — vale para o retry; (4) `onMessagesUpdate`
  marca `revokedAt`/`editedAt` (migration `20260926052719`) e segue para o ACK (o event-buffer funde
  updates — nunca `continue` antes do ACK); (5) wwebjs: `onMessageCreate` casa o eco do encaminhar
  ANTES da janela de 3 s (`ForwardEchoRegistry`) — quem mexer no ramo `fromMe` mantenha isso; op do
  `withLidFallback` nunca devolve `undefined` quando algo foi enviado; (6) `PrismaMessageRepository`
  tira `\u0000` e surrogate solto de `text`/`fileName`/`mimetype`/`raw`; (7) `candidateJids` mudou de
  lugar (`messaging/application/chat-jids.ts`); (8) P-080..P-083 novas.

- **25/09 · e23-conversas-painel (branch `feature/onda8-conversas`, PR #7 mergeado em 26/09; sem deploy G):**
  (1) **`senderJid` de mensagem recebida em GRUPO = o participante** nas 2 engines (D-029; Baileys
  `groupSenderOf` com `phoneFirst` — nunca `participantAlt ?? participant`; wwebjs só pelo cache, sem
  consulta de rede) e `senderName` no `GET /messages` — quem mexer no `onMessagesUpsert`/
  `onMessageCreate` (E7) mantém isso; (2) o painel desenha por `lib/message-format.ts` e o spec do
  painel confere ida e volta com o `message-content.ts` do gateway — mudou formato lá, atualize os
  parsers do painel; (3) mídia no painel SÓ pelo `GET …/media` como blob (`lib/media-cache.ts`) —
  nunca `mediaUrl` como `src`; o blob mora na origem do painel (documento/SVG = octet-stream); (4)
  tempo real: casar por (sessionId, keyId), memórias fora do updater (StrictMode); (5) vitest no
  painel: `npm run test -w apps/dashboard` (os scripts raiz `test`/`test:unit` rodam os dois —
  filtro por arquivo só por workspace); (6) `/media`: `content-disposition.ts` (`filename*`,
  `safeContentType`); (7) P-077..P-079 novas.

- **25/09 · e22-conversas-gateway (branch `feature/onda8-conversas`, PR #7 mergeado em 26/09; sem deploy G):**
  (1) o que é mensagem e com que `type`/`text` decide `describeBaileysMessage`/`describeWwebjsMessage`
  (funções puras em `sessions/infrastructure/{baileys/baileys-content,wwebjs/wwebjs-content,message-content}.ts`)
  — quem mexer no `onMessagesUpsert`/`onMessageCreate` (inclusive a E7/P-047 ao aceitar `append`)
  passa por elas; (2) **reação não é mensagem** (D-028): mora em `wa_message_reactions` (lápide
  `emoji=''`), casar por `keyId` + sessão, nunca por chatJid; o reply-rate tem 3 ramos de reação —
  não remover; (3) `baileys.shutdown.spec.ts` mocka a lib com `proto: {}` → módulo carregado pela
  engine não acessa `proto.*` no topo; (4) achados de ACK para a E23 na P-072 (grupo sem ACK no
  Baileys; `read` em mensagem recebida = lida no celular); (5) migration nova
  `20260925203458_reacoes_encaminhada` — o próximo `npm run infra:up`/`prisma migrate dev` a aplica.

- **25/09 · e4-rotas-egress (branch `feature/onda1-guardas-seguranca`, PR #6 mergeado; deploy A manual pendente):** (1) decisão de borda HTTP é pela **rota resolvida** — `request.routeOptions.url` no
  FastifyRequest ou `routeUrlOf(req)` no IncomingMessage (carimbo do `buildFastifyAdapter`); nunca
  `req.url` (D-025); (2) teto por rota = `@RouteConfig({ rateLimit })` e plugin de rota só vale se
  registrado ANTES do init — `bootstrap/rate-limit.ts`; (3) URL vinda do cliente só via `safeFetch`/
  `fetchImageByUrl` — **nunca** regra IPv6 com `::ffff:0:0/96` na BlockList (bloqueia todo IPv4, D-026);
  (4) opções do request-log em `bootstrap/http-logger.ts`; (5) forma absoluta com `?`/`#` antes do
  caminho → 400 na borda (P-071); (6) runbook do deploy A + B-004: `how-to/deploy-a-onda1.md`; (7) **todo auto-deploy do
  Dokploy está desligado (D-027)** — merge na main não publica nada; gateway e dashboard sobem no
  Deploy manual do dono (ao validar produção, conferir o uptime do `/health` antes de concluir que deployou).

- **25/09 · e3-patches-seguranca (branch `feature/onda1-guardas-seguranca`, PR #6 mergeado; sem deploy A):** (1) Nest
  11.2.6 usa o `@fastify/middie` oficial (o clone `fastify-middie.js` sumiu); (2) `POST /messages/media`
  lê o corpo todo — 2+ arquivos = 413 (D-024); 4xx estilo http-errors não gera mais `ERROR
[ExceptionsHandler]`; (3) o Dockerfile do gateway fixa `node:26.10.0-bookworm-slim` — ao subir o
  Node, trocar os DOIS `FROM`; (4) workflow `advisories.yml` + `scripts/checar-advisories.*`:
  dependência de runtime nova → repo no config; aceite é do dono (D-023); (5) `allowScripts` é ativo
  no npm ≥ 11.16 do CI/Docker — manter e atualizar (não remover na E16); (6) pedido novo do dono →
  **Onda 8** (E22–E25, P-066..P-069: emoji "…", mídia no painel, encaminhar) com diagnóstico em
  `analise-conversas-whatsapp-web-2026-09.md` — quem mexer em `baileys.engine.ts`/`wwebjs.engine.ts`
  (onMessagesUpsert, extração de conteúdo) ou em Inbox/Atendimento leia antes.

- **25/09 · e2-guardas-build (branch `feature/onda1-guardas-seguranca`, PR #6 mergeado; sem deploy A):** (1) o postinstall
  agora é `patch-package --error-on-fail` — `npm install`/`npm ci` local **falha** se o patch do wwebjs
  não aplicar (antes passava calado); (2) o Dockerfile do dashboard **não** copia mais `patches/` — não
  reintroduzir; (3) o CI ganhou o job `imagens` (build dos 2 Dockerfiles + boot do gateway); (4) ao
  mudar o patch do wwebjs (E5), manter um marcador por arquivo em `scripts/guardas-build.sh`.

- **25/09 · onda0b-mapa-roteiro (doc-only, branch `feature/onda0b-mapa-roteiro`) — absorve e
  substitui o aviso de 23/09:** (1) **o trabalho segue o [ROTEIRO-ONDAS-2026-09.md](ROTEIRO-ONDAS-2026-09.md)**
  — 1 etapa = 1 chat, "Regras de toda etapa", PR por onda, **merge é do dono**; (2) **mapa do código:**
  [MAPA-CODIGO.md](MAPA-CODIGO.md) (fluxos, áreas, "onde mexer" por pendência) + inventário gerado em
  `docs/reference/mapa-codigo/` — **quem mudar código roda `node scripts/mapa-codigo.mjs` e commita**
  (`--check` acusa mapa velho); (3) **Dokploy com Update Config vazio = `start-first`** (D-020): até o
  B-004, todo deploy abre as mesmas contas duas vezes; (4) **as duas engines seguem vivas** (D-021):
  Baileys = frota atual, wwebjs pronto sob demanda — Onda 6 obrigatória antes de 13/10; (5) sinal duro
  de restrição → pausar até o fim + alertar (D-022); (6) `.cloud` é a produção (sem homologação;
  canário = sessão/chip de teste); (7) `npm audit` não vê advisories de repositório (P-054); (8) P-065
  nova (egress IPv6 v4-mapeado); (9) **CI/dev: MinIO agora é `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` e o
  cliente `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`** — o quay.io passou a responder 401 e quebrou o CI
  em 25/09; o próximo `npm run infra:up` puxa a imagem nova (mesmo volume, mesmas envs). Relatórios de 23/09 seguem válidos:
  [analise-atualizacoes-2026-09.md](analise-atualizacoes-2026-09.md) e
  [analise-wwebjs-memoria-2026-09.md](analise-wwebjs-memoria-2026-09.md).

- **15/09 · caixa-unica-triagem (EM PRODUÇÃO 15/09 ~14:07 UTC — deploy `768fb26`):** migration
  aditiva `20260915140000_conversation_triage` APLICADA em prod (tabela `wa_conversation_triage`,
  dona = `messaging`); rotas novas `/api/inbox/*` no ar; `packages/contracts` ganhou DTOs `Inbox*`
  e `MessageDto` agora declara `keyId`/`source`/`isCold` (aditivo). **CI/dev:** MinIO agora vem de
  `quay.io` com tag pinada (`docker-compose.yml` + `ci.yml`) — o Docker Hub negou o pull de
  `minio/minio` em 15/09; no dev local o próximo `infra:up` puxa a imagem nova. Detalhe:
  `sessions/DONE-2026-09-15-1019-caixa-unica-triagem.md`.
- **18/08 · m3-qualidade (EM PRODUÇÃO ~11:50 UTC — CI novo já vale na main):** o CI agora
  exige **format:check** (prettier), **depcruise** (fronteiras da ARQUITETURA como `error` —
  import de internals de módulo alheio QUEBRA o build) e roda a suíte com **cobertura**.
  Para TODA sessão futura: teste unitário é `src/**/*.spec.ts` (projeto vitest `unit`, roda
  SEM infra: `npm run test:unit`); spec NÃO vai para o dist (`tsconfig.build.json`);
  `apps/gateway/auth/` e `coverage/` ignorados no lint/prettier/git. Detalhes na D-018.
  Quem abrir sessão nova pode absorver este aviso após ler a D-018.

## ✅ Histórico (mais recente primeiro — as 5 do topo são leitura obrigatória na abertura)

| ID                                     | Período     | Entregue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Branch/PR                                                                   |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 2026-09-26-1421-e8-baileys-fonte-prazo | 26/09       | **Revisão E8/P-048:** notificação de timelock da rc14 fica provisória até resposta direta do RPC; prazo válido preservado, capping menor não encurta a pausa e RPC tardio ainda confirma. Retomada provada pelo relógio com prazo persistido intacto. 507 unit gateway, 791 gateway no total, 180 painel; CI `ci`/`imagens` verde no commit `8b513c5`. Sem conta, envio real, merge/deploy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda2-baileys (PR #11 aberto, depende do #10)                       |
| 2026-09-26-1336-e8-baileys-restricao   | 26/09       | **E8/P-048 em código:** 463/timelock/capping → prazo persistido, alerta `session.restricted`, 423 em todos os envios de mensagem e re-agendamento da campanha sem PAUSED; liberação por relógio, sem `banida`. ACK ERROR `error`, 479 contado; migration aditiva só local; unit/e2e com socket falso, sem conta/envio real. P-034/P-056/B-004 e canário após E12 pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda2-baileys (PR #11 aberto; depende do #10, sem merge/deploy)     |
| 2026-09-26-1151-e7-baileys-offline     | 26/09       | **E7/P-047 — abre a Onda 2 em código:** `append` inbound de até 48 h recuperado com filtro por mensagem e dedupe cache+banco antes do EventBus; preservados conteúdo, reação, grupo e raw. E2E banco/webhook/Inbox/reply-rate; 493 unit gateway, 776 testes gateway e 180 painel locais. Sem migration/campo público, conta, envio ou deploy. P-034/P-056/B-004 e canário após E12 pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | feature/onda2-baileys (PR #11 aberto; depende do #10, sem merge/deploy)     |
| 2026-09-26-1113-e6-wwebjs-leve         | 26/09       | **Etapa E6/P-060 — fecha a Onda 6 em código:** stream 2 MB, fila por sessão com cancelamento do download expirado, mídia de grupo sem auto-download por padrão, teto de envio 24 MB e idempotência do resultado tardio; patch single-flight, sync da agenda uma vez por instância, perfil JSHeap/PSS/IndexedDB, flags revistas e kill de Chromium órfão por PID. D-033, runbook do canário e mensagem E7. 489 unit gateway + 282 e2e local + 180 painel; CI verde. Sem deploy, QR ou envio real; merge/deploy W e canário do dono pendentes.                                                                                                                                                                                                                                                                                                                                                 | feature/onda6-wwebjs (PR #10 aberto, sem merge/deploy)                      |
| 2026-09-26-0912-e5-wwebjs-pronto       | 26/09       | **Etapa E5 (P-059/P-073):** patch wwebjs para mídia `__x_id`, WID/MsgKey, cache seguro, override de versão por sessão e logs da build efetiva/Chromium; estados terminais sem QR automático, tetos de pairing/heal, teste sem Chromium. Default validado preservado até canário com chip. Migration aditiva local; D-032. P-086 registrada para etapa futura. 483 unit gateway + 281 e2e local + 180 painel; build/tsc/fronteiras OK. PR #8 mergeado após o encerramento da E5; sem deploy.                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda6-wwebjs (PR #8 mergeado na main)                               |
| 2026-09-26-0553-e25-encaminhar-painel  | 26/09       | **Etapa E25 (P-068 parte interface) — fecha a Onda 8**: menu ⌄ → Encaminhar → modo seleção (1 mensagem, decisão do dono) → "Encaminhar mensagem para" (busca, contatos e grupos da sessão, até 5; 1 com "com frequência"; só 1 grupo se já encaminhada) → ➤ com resultado por destino; atalho ↪ "Encaminhar mídia"; textos e regras do WhatsApp Web; `idempotencyKey` por clique com travas (saiu/sem confirmação/pode ter saído), pedido congelado no desfecho incerto e memória ao fechar/reabrir; `ApiError` com `code`/`body`; INTEGRACAO §2 corrigida; runbook do deploy G. D-031. Mapeamento (5 agentes) + 2 revisões adversariais (1ª: 21 achados confirmados; 2ª, só sobre as correções: 15 — todos tratados) + validação no Chrome (erro real + 14 cenários). Painel 180 testes. P-084 (pedido do dono: proxy da sessão apagada → E26), P-085                                       | feature/onda8-conversas (PR #7 — merge do dono = deploy G)                  |
| 2026-09-26-0152-e24-encaminhar-api     | 26/09       | **Etapa E24 (P-068 parte API/engines + P-077)**: rota aditiva `POST …/messages/:msgId/forward` → `{results[]}` com os limites do dono (5; 1 se score ≥ 5; mesma sessão; destino sem conversa no número exato = cold à força → 423 no pedido inteiro; `idempotencyKey` do pedido + `<chave>:<destino>`); Baileys `forward` só com o nó de conteúdo (selo certo, sem vazar citação/SKDM), `raw` das recebidas (7 d), `decodeProto` com `fromObject`, marcas `revokedAt`/`editedAt` (migration aditiva); wwebjs `Message.forward` nativo com eco correlacionado (sem handoff falso, sem envio 2× no fallback de LID); P-077 (ecos com texto completo); NUL/surrogate limpos na gravação; `raw` fora das listagens. D-030. Mapeamento (19 agentes), 4 escritores de teste (7 bugs achados), revisão adversarial (62 agentes, 20 achados tratados). 471 unit + 281 e2e + 122 painel. P-080..P-083 | feature/onda8-conversas (PR #7, sem merge)                                  |
| 2026-09-25-2120-e23-conversas-painel   | 25/09→26/09 | **Etapa E23 (P-067 + P-072 painel + P-074)**: balões compartilhados no Inbox e no Atendimento (cartões por tipo, prévias sem "…", selo Encaminhada, pílula de reações, tique só em fromMe e sem grupo), mídia só pelo gateway como blob com cache por mensagem (ref-count, liberação adiada, LRU, fila, 404/429), lightbox em `<dialog>`, SSE recriado + tiques/reações ao vivo por (sessionId, keyId), rolagem só perto do fim; `senderJid` de grupo = participante nas 2 engines + `senderName` (D-029); `/media` sem 500 por nome/mimetype (P-076). vitest no painel (118) + gateway 530/530. Mapeamento (8 agentes) + 2 revisões adversariais (16 agentes: 23 achados tratados) + validação no Chrome com seed local. P-077..P-079                                                                                                                                                       | feature/onda8-conversas (PR #7, sem merge)                                  |
| 2026-09-25-1727-e22-conversas-gateway  | 25/09       | **Etapa E22 (P-066 + P-072 gateway) — abre a Onda 8**: conteúdo fiel nas 2 engines (`describeBaileysMessage`/`describeWwebjsMessage` puros — tipos `location`/`contact`/`poll`/`event`/`group_invite`/`poll_vote`, fim do "…"), reação fora do `message` em `wa_message_reactions` (lápide, guarda de horário) e contando no reply-rate no mesmo deploy (D-028, 3 ramos), selo "Encaminhada", `GET /messages` com `reactions[]`, `status` no feed, remetente de reação em grupo e `@lid` corrigidos, `WEBHOOK_EVENTS` com ack/reação. Mapeamento (7 agentes) + revisão adversarial (37 agentes, 15 achados tratados). 477/477. P-073..P-075                                                                                                                                                                                                                                                  | feature/onda8-conversas (PR #7 mergeado em 26/09; sem deploy G)             |
| 2026-09-25-1443-e4-rotas-egress        | 25/09       | **Etapa E4 (P-053, P-065 + P-070, P-071) — fecha a Onda 1**: rate-limit/request-log/auditoria pela rota resolvida (`routeOptions.url`) — teto do login em contador próprio via `@RouteConfig` (D-025), `/health`/`/metrics` silenciosos pela rota, auditoria de grafias alternativas; egress com `net.BlockList` (IPv6 v4-mapeado, NAT64/6to4/Teredo, TEST-NETs — D-026); fotos por URL pelo `safeFetch` (P-070); alvo ambíguo → 400 (P-071); smoke do login no CI; runbook do deploy A + B-004. 360/360; investigação (6 agentes) + revisão adversarial (15 agentes, 7 achados menores corrigidos)                                                                                                                                                                                                                                                                                          | feature/onda1-guardas-seguranca (PR #6, sem merge — deploy A)               |
| 2026-09-25-1053-e3-patches-seguranca   | 25/09       | **Etapa E3 (P-054) — patches de segurança sem major**: Nest 11.2.6 (GHSA-9c5c), multipart 10.1.2 + upload com 2+ arquivos = 413 (D-024), bullmq 5.81.5, protobufjs 7.6.6, proxy-addr 5.1.1 (critical), busboy 3.2.2, fast-uri; Node do gateway fixado em 26.10.0; checagem diária de advisories de repositório (script + workflow + how-to, D-023); 4xx sem ERROR falso no log. 338/338 testes; 2 rodadas de revisão adversarial (26+2 achados tratados)                                                                                                                                                                                                                                                                                                                                                                                                                                     | feature/onda1-guardas-seguranca (PR #6, sem merge)                          |
| 2026-09-25-0915-e2-guardas-build       | 25/09       | **Etapa E2 (P-055) — guardas de build**: `patch-package --error-on-fail`; `scripts/guardas-build.sh` (patches/dist/deps/prisma) + `scripts/verificar-deps-runtime.cjs` no Dockerfile do gateway e no CI; job `imagens` (build dos 2 apps + smoke `/health` com `jq`); dashboard sem `patches/`; runbook `how-to/rollback-gateway.md`. Revisão adversarial (3 céticos) achou 1 bloqueante (build do dashboard) — corrigido e provado                                                                                                                                                                                                                                                                                                                                                                                                                                                          | feature/onda1-guardas-seguranca (PR da Onda 1 — merge do dono no fim da E4) |
| 2026-09-25-0700-onda0b-mapa-roteiro    | 25/09       | **Etapa E1 do roteiro (doc-only)**: mapa do código gerado pelo type-checker (`scripts/mapa-codigo.mjs` → `docs/reference/mapa-codigo/`) + mapa de relações verificado (`MAPA-CODIGO.md`: 8 fluxos, 5 áreas, onde mexer P-001..P-065, 1.049 afirmações conferidas) · `ROTEIRO-ONDAS-2026-09.md` (E1–E21, 1 etapa = 1 chat) · reconciliação P-063 · D-020 (start-first), D-021 (duas engines vivas), D-022 (sinal duro → pausa) · P-065 (egress IPv6)                                                                                                                                                                                                                                                                                                                                                                                                                                          | feature/onda0b-mapa-roteiro (PR — merge do dono)                            |
| 2026-09-23-1750-analise-atualizacoes   | 23/09→24/09 | **Análise de atualizações + estabilidade das contas (doc-only)**: workflow de 17 agentes (8 frentes + verificação adversarial + crítico) e 2ª rodada de 8 sobre memória/CPU do wwebjs. Achados-chave: Dokploy aplica start-first com Update Config vazio (runbook/D-014 errados), produção sem backup, MinIO community com CVE-2026-41145, Nest GHSA-9c5c (high) invisível ao npm audit, nenhuma versão nova de engine, lacunas do Baileys (append descartado, sinais de restrição ignorados, mídia sem proxy), wwebjs sem "modo leve" (maior alavanca = mídia) e provavelmente dispensável. B-004..B-007, P-047..P-064                                                                                                                                                                                                                                                                      | feature/analise-atualizacoes-20260923 (commit local, sem push)              |
| 2026-09-15-1019-caixa-unica-triagem    | 15/09       | **Caixa única de triagem EM PRODUÇÃO 15/09 ~14:07 UTC** (PR #4, CI verde com e2e novo 16/16, merge ff `768fb26`): página `/atendimento` — conversas de TODOS os aparelhos sem escolher sessão, semáforo 🔴/🟢/🟡 derivado de `wa_messages` (verde inclusive respondendo pelo celular, `source=phone`; entrada nova SEMPRE volta a 🔴 — D-019), tabela nova `wa_conversation_triage` (só o amarelo), rotas aditivas `/api/inbox/*` com anti-atropelo por keyId, fluxo ao vivo via SSE. Validado em prod: rotas 404→401, bundle novo com a rota, health ok. Fix de carona: MinIO do CI/dev → quay.io pinado (Docker Hub negou pull). P-044..P-046                                                                                                                                                                                                                                              | feature/caixa-unica-triagem (PR #4, mergeada)                               |
| 2026-09-09-1745-baileys-shutdown       | 09/09       | **`BaileysEngine.shutdown()` (P-043) EM PRODUÇÃO 09/09 18:15 UTC** (CI verde, merge ff `301d42d`, container `047606fd42a3`): Baileys deixa de gravar STOPPED no `onModuleDestroy` (caía no `stop()`; agora fecha o socket sem `setStatus`, como o wwebjs). Causa cravada com o log do container antigo (`Shutdown: todas as engines fecharam` = carimbo do STOPPED do Diogo, que seguia enviando). Diogo ficou WORKING limpo. 3 testes novos. Ressalva: prova cabal no próximo deploy (container que sai já com a correção)                                                                                                                                                                                                                                                                                                                                                                  | feature/baileys-shutdown-sem-persistir-status (PR #3, mergeada)             |
| 2026-09-09-1400-logs-sem-erro-batido   | 09/09       | **Logs sem erro batido EM PRODUÇÃO 09/09 17:27 UTC** (CI verde, merge ff `4af6f9b`, container `a226fb2dffdf`): P-041 (statusCode de volta — 28/28 request-log, era 100% null) + P-042 (erros com stack em vez de `e={}`, `LoggingExceptionFilter` loga 4xx com motivo/sessão/code, console das libs em JSON, `on('error')` nas filas, catches com log, `STOPPED` com erro limpo). Reidratou as 6 WORKING; contato2 → QR (creds mortas, pré-existente), Diogo enviando com status persistido STOPPED (sync a investigar)                                                                                                                                                                                                                                                                                                                                                                      | feature/logs-sem-erro-batido (PR #2, mergeada)                              |

> Sessões mais antigas (≤21/07) movidas para [SESSOES_ARQUIVO.md](SESSOES_ARQUIVO.md) — higiene de contexto (R9 v3.2).
