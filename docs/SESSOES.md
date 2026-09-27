# 🔀 SESSÕES DE TRABALHO — ConexoZenvo

> Painel de conversas paralelas (protocolo R9). Toda sessão se registra aqui ao abrir,
> cria seu arquivo em `sessions/` e trabalha na própria branch `feature/*`.
> Escopos de sessões ativas devem ser DISJUNTOS (ideal: 1 sessão = 1 módulo).
> Pontos de contato globais (declarar no escopo se for tocar): `schema.prisma`,
> `packages/contracts`, `app.module.ts`, `docker-compose.yml`, `ci.yml`.

## 🟢 Sessões ativas

| ID                | Início      | Objetivo                                                                                                      | Escopo                                                | Branch                          |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| lid-envio-wwebjs  | 31/08 19:30 | Consertar "No LID for user" no envio da engine WWEBJS (PN→LID local, sem rede; campanha congelada aguardando) | `modules/sessions/infrastructure/wwebjs/` + docs      | fix/lid-envio-wwebjs            |
| e13-exclusividade | 27/09 12:36 | P-056: lease/epoch entre processos e auth transacional; sem deploy                                            | `modules/sessions/`, `schema.prisma`, migration, docs | feature/onda3-e13-exclusividade |

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

> Decisão/mudança que afeta outras sessões entra AQUI na hora: data, sessão, o quê,
> quem precisa saber. A sessão que absorveu o aviso o remove no próprio encerramento.

- **27/09 · e26-proxy-sugestao (E26/P-084, D-038; sem deploy):** (1) migration aditiva
  `20260927100000_proxy_sugestao` — `session_proxy_assignments.releasedSessionName`/`releasedAt`
  (+ índice); (2) `SessionsController.remove` chama `ProxyService.markReleased` DEPOIS do
  `manager.remove` (só SINGLE com proxy; nunca lança); (3) **as linhas órfãs carimbadas são registro
  intencional — nenhuma retenção/limpeza pode apagá-las** (D-038); `setAssignment` (PUT) zera o
  carimbo; (4) rota `GET /api/proxies/suggestion?sessionName=` (ADMIN, `{suggestion|null}`); (5) no
  painel, o formulário "Nova sessão" deriva a escolha do proxy (`lib/proxy-suggestion.ts`) e segura o
  Enter até a sugestão responder — quem mexer no formulário preserve "o que se vê é o que se envia".

- **27/09 · e27-link-conexao-qr (E27/P-086/P-089, D-037; sem deploy):** (1) migration aditiva
  `20260927013000_link_conexao_qr` — tabela `wa_connect_links` (dona: sessions, FK cascade em
  `wa_sessions`) e coluna `wa_sessions.lastMeJid` (gravada no `updateStatus` sempre que `meJid` não é
  nulo; `SessionDto.lastMeJid` aditivo); (2) **`SessionManager` agora tem lock de ciclo de vida por
  sessão** (`runExclusive`): start/stop/restart/logout/newQr/remove/requestPairingCode esperam a
  operação anterior da mesma sessão — de dentro de uma operação use as versões `*Unlocked` (chamar
  a pública de dentro trava); fakes de e2e precisam dos métodos novos `liveView`/`isBusy`/
  `isRehydrated`/`hasEngine`/`newQrForConnectLink`/`rejectConnectedAccount` (já em
  `test/setup-app.ts`); (3) rotas novas `/api/sessions/:id/connect-link` (só JWT do painel) e
  `/api/public/connect*` (token do link em Bearer); stop/logout revogam o link ativo; (4)
  `AuditInterceptor` usa `req.auditActor` e só grava `login:` na rota de login; (5) CORS `maxAge` 600;
  (5b) `POST /pairing-code` ganhou teto de 45 s dentro do lock (estourou → 409);
  (6) armadilha documentada: o QR do Baileys fica em memória depois de expirar/ser lido — decidir pelo
  estado vivo (`liveView`), não pelo banco (agent-whatzapp_api §6.14, P-094).

- **26/09 · e12-baileys-pairing-lid (E12/P-052 em código; sem deploy):**
  `POST /pairing-code` passa a 409 para WORKING ou credenciais `me` existentes e espera
  `connecting`/primeiro QR por até 10 s em sessão nova; o payload de sucesso não muda.
  Roster Baileys lê `phoneNumber` e só usa `lidMapping` local quando falta PN. Caches de retry e
  devices são medidos por socket (log agregado a cada 15 min) junto com pre-keys por sessão;
  nenhuma externalização foi feita. `countryCode: BR` é só coerência. Quem mexer em pairing,
  grupo ou observabilidade deve preservar essas regras. P-087 permanece independente.

- **26/09 · e11-baileys-patch (E11/P-051, PR #15 integrado à `main`; sem deploy):**
  a rc14 agora recebe patch-package para `Curve.verify`, domínio hosted por device e stream HTTP
  cifrado com `pipeline` (#2751/#2716; #2815 foi fechado como duplicado). Quem fizer E12 deve
  manter o patch e `guardas-build.sh patches`; o Dockerfile do painel exclui patches porque não
  instala as engines. Não confundir o cancelamento do stream com o listener interno do reupload,
  ainda P-087. P-052 está no PR #16 (`feature/onda2-baileys-e12`, base `119635c`);
  canário com chip e deploy B manual continuam para a janela seguinte, após o merge da E12.

- **26/09 · integracao-branches (D-035/P-088, PR #13 mergeado em `2f02f02`; sem deploy):** a branch local antiga do
  detector foi adaptada para observação WWEBJS opt-in (`UNDELIVERED_SWEEP_MIN=0` por padrão). Se
  habilitado, registra WARN; ACK atrasado não chama `recordHardSignal`, não gera evento, não muda
  `session_guardrail` nem bloqueia. Quem trabalhar em guardrail/ACK preserva essa separação da
  pausa nativa E8. As coletas M2 de julho foram reconciliadas em 12 coletas históricas; nenhuma
  coleta atual nem operação no Dokploy foi feita.

- **26/09 · reconciliação dos merges #10/#11 (sem Deploy):** `origin/main` contém E6/P-060
  pelo merge `d577b05` do PR #10 e E7–E10 pelo merge `8291c17` do PR #11. E11/P-051 e
  E12/P-052 ficaram pendentes naquele merge; o aviso E11 acima traz o estado atual. Os avisos anteriores
  descrevem regras de código já mergeadas; nenhum canário ou Deploy W/B foi executado por esses
  merges. Produção segue no último SHA **documentado** `768fb26`, sem verificação ao vivo.

- **26/09 · e10-baileys-midia (E10/P-050/P-075, PR #11 mergeado — sem deploy):** o `ProxyResolver`
  passa a escolher uma vez o transporte Baileys (`resolveBaileysTransport`), entregando Agent
  Node para socket/upload e factory de Dispatcher undici para cada download HTTP/HTTPS da CDN.
  SOCKS segue para conexão, mas download recebido com esse proxy emite apenas metadados até prova
  de suporte pela CDN, sem fetch direto pelo IP do servidor. Não chamar `resolveAgent` de novo
  para obter o dispatcher em modos rotativos. Deploy/canário pendentes.

- **26/09 · e9-baileys-desconexao (E9/P-049, PR #11 mergeado — sem deploy):** `wa_sessions` ganhou
  `lastErrorDetails` JSONB pela migration `20260926175800_baileys_disconnect_details`;
  `SessionDto` expõe `{code,reason}` de forma aditiva e mantém `lastError` textual. O Baileys
  publica `session.client_too_old` para 405 e `/metrics` soma
  `wa_disconnects_total{engine,code}` por processo; a versão do protocolo é registrada por
  conexão e um par de envs limita override à sessão canário. Para E11+, preservar os guards
  `stopped`/`connectGeneration`, a política de desconexão (especialmente 440 quieto) e a
  pausa E8: `connection.update` é provisório, só o retorno direto do RPC confirma o prazo.
  Migration aplicada apenas no Postgres local; deploy/canário seguem pendentes.

- **26/09 · e8-baileys-restricao (E8/P-048, PR #11 mergeado — sem deploy):** `SessionManager` consulta a
  pausa temporária de `session_guardrail` antes de cada envio de mensagem; texto, mídia,
  localização, enquete, reação e cada destino do encaminhar recebem 423 até o prazo. Campanhas
  re-agendam sem `PAUSED`. Baileys rc14 liga ERROR 463, `reachoutTimeLock` e capping CAPPED,
  emite `session.restricted` (contrato aditivo) e grava ACK ERROR como `error`; 479 só é contado.
  A revisão de 26/09 confirmou que a notificação rc14 pode fabricar `Date` como agora + 60 s:
  `connection.update` entra como `source=temporary`, e só a resposta direta do RPC confirma
  `timeEnforcementEnds`. A E9 preservou esse callback e essa distinção ao mudar
  `onConnectionUpdate`; a E10 também os manteve. Migration
  `20260926164000_restricao_temporaria` aplicada só no banco local; deploy/canário após E12.

- **26/09 · e7-baileys-offline (E7/P-047, PR #11 mergeado — sem deploy):** `onMessagesUpsert` do Baileys agora
  é async e consulta `wa_messages` por `(sessionId,keyId)` antes do `onEvent`; qualquer teste privado
  que o chama precisa `await`. `append` de terceiro até 48 h passa, `append` fromMe/status/newsletter
  não. Preservados `describeBaileysMessage`, `message.reaction`, participante de grupo e `raw` inbound.
  Nenhum campo público ou migration na E7; E8–E10 foram mergeadas no PR #11 e preservam a dedupe.
  Limites P-056/B-004 e P-034.

- **26/09 · e6-wwebjs-leve (E6/P-060, PR #10 mergeado — sem deploy):** mídia recebida em grupo na engine WWEBJS passa a sair sem `mediaKey` por padrão; `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA=true` liga o download automático. Mídia 1:1 baixa por stream; envio WWEBJS acima de 24 MB retorna 400. Envio sem confirmação após 120 s conserva a intenção pendente até o resultado tardio, com 409 para retry da mesma chave enquanto isso. `ready` evita repetir syncAddressBook/merge após heal. Quem tocar fluxo de mídia ou enviar na E11+ deve preservar essas regras; INTEGRACAO §2/§3.1 e D-033 as descrevem. Canário com chip e deploy W permanecem para o dono.

- **26/09 · e5-wwebjs-pronto (PR #8 mergeado na `main`, Onda 6 ainda sem deploy):** a E5
  preserva o default validado `2.3000.1045101284-alpha` e permite canário da candidata
  `2.3000.1046934385-alpha` por `session_config.wwebjsWebVersion` (migration aditiva; PATCH não
  reinicia). A E6 foi mergeada pelo PR #10; deploy W e canário com chip seguem pendentes. Não
  promover a candidata antes do teste com chip.
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

> As descrições registram o estado no fechamento de cada chat. O aviso de reconciliação acima
> e os avisos E11/E12 acima indicam o estado atual dos merges e do PR #16.

| ID                                      | Período | Entregue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Branch/PR                                                              |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 2026-09-27-0937-e26-proxy-sugestao      | 27/09   | **E26/P-084 (Onda 9, D-038) em código, sem deploy:** apagar sessão com proxy fixo guarda o nome na atribuição órfã (depois do delete); o painel sugere/pré-seleciona esse proxy ao recriar com o mesmo nome (sem diferenciar caixa; aviso quando em uso/fora do ar/desabilitado/excluído; Enter espera a sugestão). Rota `GET /api/proxies/suggestion`, migration aditiva. 3 revisões multiagente + harness do painel; 911 unit gateway, 292 painel, 378/379 e2e (falha ambiental). P-097 nova.                                                                                                                                                                                                                                                                                                                                                                                              | feature/onda9-proxy-sugestao (PR da Onda 9; deploy manual pendente)    |
| 2026-09-27-0020-e27-link-conexao-qr     | 27/09   | **E27/P-086 + P-089 (Onda 9, D-037) em código, sem deploy:** link público temporário para conectar sessão Baileys por QR em outra tela (página `/conectar`, token no `#`/Bearer, só login do painel, nunca apaga login salvo, número esperado com desfazimento, `CONNECTED` 15 min), lock de ciclo de vida no `SessionManager`, `lastMeJid`, filtro de Sessões por nome/status/número. 3 revisões multiagente; 866 unit gateway, 255 painel, 348/349 e2e (falha ambiental do banco de dev). Deploy dos 2 apps e aceite com chip pendentes.                                                                                                                                                                                                                                                                                                                                                   | feature/onda9-link-conexao-qr (PR da Onda 9; deploy manual pendente)   |
| 2026-09-26-2231-e12-baileys-pairing-lid | 26/09   | **E12/P-052 em código no PR #16, sem deploy:** pairing 409/espera limitada, roster `phoneNumber`/`lidMapping` local, caches e pre-keys medidos por sessão; 868 gateway e 180 painel locais, postinstall/guardas/Dockerfiles verdes. CI e merge ao fim; P-087 separada; deploy B/canário do dono pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | feature/onda2-baileys-e12 (PR #16; deploy B pendente)                  |
| 2026-09-26-2051-merge-e11               | 26/09   | **E11/P-051 integrada à main pelo PR #15 após CI verde, sem deploy:** orientação do dono de fazer merge ao fim registrada; E12/P-052 segue em nova branch/PR da origin/main atualizada. P-087 separada; canário e deploy B manuais pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | feature/onda2-baileys-e11-e12 (PR #15 mergeado; deploy B pendente)     |
| 2026-09-26-2022-e11-baileys-patch       | 26/09   | **E11/P-051 no PR #15 draft, sem merge/deploy:** patch rc14 de assinatura, domínio hosted e stream cifrado; 5 testes reais/sintéticos novos, 567 unit gateway, 853 gateway total e 180 painel; postinstall, guardas e ambos os Dockerfiles verdes localmente. CI `ci`/`imagens` verde no run `36279808592`; E12/P-052 e canário com chip pendentes. P-087 separada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | feature/onda2-baileys-e11-e12 (PR #15 draft; deploy B pendente)        |
| 2026-09-26-1945-integracao-branches     | 26/09   | **Integração das branches restantes, PR #13 mergeado em `2f02f02`:** histórico M2/Mac reconciliado em 12 coletas antigas; detector WWEBJS D-035/P-088 como observador opt-in, apenas WARN. CI `ci`/`imagens` verde; nenhum Deploy, conta ou mensagem real. E11/E12 e canários seguem pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | feature/integracao-branches-20260926 (PR #13; fechamento R9 posterior) |
| 2026-09-26-1804-e10-baileys-midia       | 26/09   | **E10/P-050/P-075 em código, PR #11:** mídia recebida com teto total 90 s, reupload Boom 404/410 até 20 s e segunda tentativa; `ptvMessage` preserva o `raw`. Mesmo proxy HTTP/HTTPS para socket/upload e dispatcher Undici privado do fetch; SOCKS só metadados até prova. 558 unit gateway, 843 gateway no total e 180 painel; CI `ci`/`imagens` verde no `b489b21`. Sem payload novo, conta, mídia real, merge ou deploy. P-087 registra listener interno sem cancelamento; canário após E12.                                                                                                                                                                                                                                                                                                                                                                                             | feature/onda2-baileys (PR #11 mergeado 8291c17; deploy B pendente)     |
| 2026-09-26-1448-e9-baileys-desconexao   | 26/09   | **E9/P-049 em código, PR #11:** matriz 401/403/405/408/411/428/440/500/503/515, alerta 405, uma tentativa quieta 440, detalhe aditivo persistido, métrica por código e versão limitada com override canário. 546 unit gateway, 831 gateway no total e 180 painel; CI `ci`/`imagens` verde no `7c0441c`. Migration só local; sem conta, envio real, merge ou deploy. P-034/P-056/B-004/B-005/B-007 e canário após E12 pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | feature/onda2-baileys (PR #11 mergeado 8291c17; deploy B pendente)     |
| 2026-09-26-1421-e8-baileys-fonte-prazo  | 26/09   | **Revisão E8/P-048:** notificação de timelock da rc14 fica provisória até resposta direta do RPC; prazo válido preservado, capping menor não encurta a pausa e RPC tardio ainda confirma. Retomada provada pelo relógio com prazo persistido intacto. 507 unit gateway, 791 gateway no total, 180 painel; CI `ci`/`imagens` verde no commit `8b513c5`. Sem conta, envio real, merge/deploy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda2-baileys (PR #11 mergeado 8291c17; deploy B pendente)     |
| 2026-09-26-1336-e8-baileys-restricao    | 26/09   | **E8/P-048 em código:** 463/timelock/capping → prazo persistido, alerta `session.restricted`, 423 em todos os envios de mensagem e re-agendamento da campanha sem PAUSED; liberação por relógio, sem `banida`. ACK ERROR `error`, 479 contado; migration aditiva só local; unit/e2e com socket falso, sem conta/envio real. P-034/P-056/B-004 e canário após E12 pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda2-baileys (PR #11 mergeado 8291c17; deploy B pendente)     |
| 2026-09-26-1151-e7-baileys-offline      | 26/09   | **E7/P-047 — abre a Onda 2 em código:** `append` inbound de até 48 h recuperado com filtro por mensagem e dedupe cache+banco antes do EventBus; preservados conteúdo, reação, grupo e raw. E2E banco/webhook/Inbox/reply-rate; 493 unit gateway, 776 testes gateway e 180 painel locais. Sem migration/campo público, conta, envio ou deploy. P-034/P-056/B-004 e canário após E12 pendentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | feature/onda2-baileys (PR #11 mergeado 8291c17; deploy B pendente)     |
| 2026-09-26-1113-e6-wwebjs-leve          | 26/09   | **Etapa E6/P-060 — fecha a Onda 6 em código:** stream 2 MB, fila por sessão com cancelamento do download expirado, mídia de grupo sem auto-download por padrão, teto de envio 24 MB e idempotência do resultado tardio; patch single-flight, sync da agenda uma vez por instância, perfil JSHeap/PSS/IndexedDB, flags revistas e kill de Chromium órfão por PID. D-033, runbook do canário e mensagem E7. 489 unit gateway + 282 e2e local + 180 painel; CI verde. Sem deploy, QR ou envio real; merge/deploy W e canário do dono pendentes.                                                                                                                                                                                                                                                                                                                                                 | feature/onda6-wwebjs (PR #10 mergeado d577b05; deploy W pendente)      |
| 2026-09-26-0912-e5-wwebjs-pronto        | 26/09   | **Etapa E5 (P-059/P-073):** patch wwebjs para mídia `__x_id`, WID/MsgKey, cache seguro, override de versão por sessão e logs da build efetiva/Chromium; estados terminais sem QR automático, tetos de pairing/heal, teste sem Chromium. Default validado preservado até canário com chip. Migration aditiva local; D-032. P-086 registrada para etapa futura. 483 unit gateway + 281 e2e local + 180 painel; build/tsc/fronteiras OK. PR #8 mergeado após o encerramento da E5; sem deploy.                                                                                                                                                                                                                                                                                                                                                                                                  | feature/onda6-wwebjs (PR #8 mergeado na main)                          |
| 2026-09-26-0553-e25-encaminhar-painel   | 26/09   | **Etapa E25 (P-068 parte interface) — fecha a Onda 8**: menu ⌄ → Encaminhar → modo seleção (1 mensagem, decisão do dono) → "Encaminhar mensagem para" (busca, contatos e grupos da sessão, até 5; 1 com "com frequência"; só 1 grupo se já encaminhada) → ➤ com resultado por destino; atalho ↪ "Encaminhar mídia"; textos e regras do WhatsApp Web; `idempotencyKey` por clique com travas (saiu/sem confirmação/pode ter saído), pedido congelado no desfecho incerto e memória ao fechar/reabrir; `ApiError` com `code`/`body`; INTEGRACAO §2 corrigida; runbook do deploy G. D-031. Mapeamento (5 agentes) + 2 revisões adversariais (1ª: 21 achados confirmados; 2ª, só sobre as correções: 15 — todos tratados) + validação no Chrome (erro real + 14 cenários). Painel 180 testes. P-084 (pedido do dono: proxy da sessão apagada → E26), P-085                                       | feature/onda8-conversas (PR #7 — merge do dono = deploy G)             |
| 2026-09-26-0152-e24-encaminhar-api      | 26/09   | **Etapa E24 (P-068 parte API/engines + P-077)**: rota aditiva `POST …/messages/:msgId/forward` → `{results[]}` com os limites do dono (5; 1 se score ≥ 5; mesma sessão; destino sem conversa no número exato = cold à força → 423 no pedido inteiro; `idempotencyKey` do pedido + `<chave>:<destino>`); Baileys `forward` só com o nó de conteúdo (selo certo, sem vazar citação/SKDM), `raw` das recebidas (7 d), `decodeProto` com `fromObject`, marcas `revokedAt`/`editedAt` (migration aditiva); wwebjs `Message.forward` nativo com eco correlacionado (sem handoff falso, sem envio 2× no fallback de LID); P-077 (ecos com texto completo); NUL/surrogate limpos na gravação; `raw` fora das listagens. D-030. Mapeamento (19 agentes), 4 escritores de teste (7 bugs achados), revisão adversarial (62 agentes, 20 achados tratados). 471 unit + 281 e2e + 122 painel. P-080..P-083 | feature/onda8-conversas (PR #7, sem merge)                             |

> Histórico limitado às 15 sessões mais recentes; anteriores em [SESSOES_ARQUIVO.md](SESSOES_ARQUIVO.md) (R9).
