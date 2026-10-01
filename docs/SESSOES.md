# 🔀 SESSÕES DE TRABALHO — ConexoZenvo

> Painel de conversas paralelas (protocolo R9). Toda sessão se registra aqui ao abrir,
> cria seu arquivo em `sessions/` e trabalha na própria branch `feature/*`.
> Escopos de sessões ativas devem ser DISJUNTOS (ideal: 1 sessão = 1 módulo).
> Pontos de contato globais (declarar no escopo se for tocar): `schema.prisma`,
> `packages/contracts`, `app.module.ts`, `docker-compose.yml`, `ci.yml`.

## 🟢 Sessões ativas

| ID               | Início      | Objetivo                                                                                                      | Escopo                                           | Branch               |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------- |
| lid-envio-wwebjs | 31/08 19:30 | Consertar "No LID for user" no envio da engine WWEBJS (PN→LID local, sem rede; campanha congelada aguardando) | `modules/sessions/infrastructure/wwebjs/` + docs | fix/lid-envio-wwebjs |

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

> Decisão/mudança que afeta outras sessões entra AQUI na hora: data, sessão, o quê,
> quem precisa saber. A sessão que absorveu o aviso o remove no próprio encerramento.

- **30/09 · e21-refresh-purge (D-050; em código, sem deploy):** purge IAM em lotes preserva
  ancestrais expirados de família protegida (terminal não revogado expiresAt>=cutoff).
  Advisory xact userId em todos escritores, try-lock/DELETE fresh READ COMMITTED explícito;
  primeira troca/rollback stop-first, pois N-1 ignora protocolo. Margem7dias/0desliga,
  até20lotes500/6h; TTL/HTTP intactos. [Política/provas/limites](how-to/auth-sessao-refresh-rotation.md#retenção-segura-p-005e21--d-050).
  Gates D-047/D-048/D-049 e C/D/E/F/B-004/B-005/B-007 manuais mantidos.

- **30/09 · e21-contratos-w5 (P-013; PR #30, sem deploy):** contracts ganha mentions
  opcional no texto e SendReactionRequest com emoji string/vazio para remoção.
  Schemas/rotas/envio e consumidores painel/n8n0.4.1 intactos; node consome HTTP, sem
  dependência do pacote privado. Demais contratos incompletos seguem P-040. D-049/D-047/
  D-048 e gates anteriores preservados, publicação/canários manuais.

- **30/09 · e21-ack-duravel (D-049; em código, sem deploy):** migration aditiva
  `20260930163000_pending_message_acks`, tabela messaging `wa_pending_message_acks`.
  ACK/save/histórico usam advisory xact lock por sessão/key e consumo transacional,
  preservam ranking/inbound/latest timestamp. Pending-only; consumido não reaplica em
  INSERT futuro. Retenção lastSeenAt pela env mensagens/default90; histórico por chunk50.
  N-1 ignora protocolo, primeira publicação stop-first; rollout/canário manuais.
  [Política/limites](how-to/ack-persistencia-e21.md), P-100/P-101/P-102 abertas/P-099 sem drenar.

- **30/09 · e21-qr-esgotado (D-048; em código, sem deploy):** Baileys408 com motivo
  exato QR refs attempts ended e auth inicial (`registered=false`, sem account/me/user,
  não WORKING) para em STOPPED, preserva creds/chaves/epoch/autostart e sai do boot.
  Qualquer sinal de pairing/ausência de auth mantém política anterior. Link invalida
  token imediatamente, engine só para ao esgotar ciclo; STOPPED natural não revoga link.
  Legado pode abrir um ciclo antes de parar. [Política/aceite](how-to/qr-esgotado-e21.md).
  P-100/P-101/P-102 abertas, P-099 sem drenar; publicação/canários manuais e E21snapshots24h.

- **30/09 · e21-reply-rate (D-047; em código, sem deploy):** G4 retorna
  `ambiguousMature`; reação de alvo inconclusivo não conta resposta nem ausência.
  Snapshot unreliable sai da mediana; G5 mantém estado após manual/sticky/cooldown/Nmin.
  Antes do enforce/canário manual, recalcular reply-rate7d da frota ou aguardar24h
  dos snapshots antigos. [Política](how-to/reply-rate-identidade-e21.md).
  Triagem registrada; demais itens seguem abertos. P-100 aberta, P-099 sem drenar.

- **29/09 · e20-metricas-produto (em código, sem deploy):** rotas aditivas de métrica
  30d (`/observability/new-recipients/:sessionId`), cota (`/sessions/:id/contacts/check-quota`)
  e inventário (`/sessions/account-inventory/snapshot`); contracts e envs da cota no mesmo PR.
  `CONTACT_CHECK_MAX_PER_WINDOW=0` default desliga; positivo só observa, sem bloquear
  consultas/envios nem novo status. Nova métrica é independente de G4/G5. Inventário
  reconhece marcadores oficiais, UNKNOWN sem evidência; pasta WWEBJS/ATIVA alheia intactos.
  P-100 aberta e P-099 sem drenar; gates E16–E19 e deploys/canários manuais preservados.

- **29/09 · e19-vitest5 (D-045; sem deploy):** Vitest/coverage5.0.2 e config gateway .mts;
  SWC/decorators/herança/mocks/e2e serial preservados. TS5.9.3/CLI11 mantidos;
  node20/node16 emite CommonJS e lê exports (sem shims proxies). Imports dinâmicos
  precisam de extensão .js, como a única mudança no teste lifecycle WWEBJS. Esse
  contato com a área lid-envio-wwebjs não altera engine/LID; ATIVA alheio preservado.
  Buildinfo deve permanecer em dist para a CLI11 apagar cache e JS juntos. Prisma
  gerado preserva import() nativo, SQL/smoke final aprovado. P-100 aberta, sem force-close
  ou retries reduzidos; P-099 sem drenar. Gates E16–E19 e deploys/canários manuais mantidos.
  PR24/E18 confirmado mergeado em 91d21f7 com ci/imagens/advisories verdes.

- **29/09 · e18-nest12 (P-062 parte 3, D-044; PR #24, sem deploy):** Nest 12.1.1 runtime,
  Config 12.0.1/JWT 12.0.2/pino 5.2.1 com peers compatíveis e Fastify 5.12.5;
  CLI/schematics 11 e TS 5.9.3 preservados. Aplicação CommonJS via require(esm),
  common/core únicos no DI; guarda da imagem final exige a linha 12.1.x/piso 12.0.4.
  `/api` do n8n/auth/rate-limit/auditoria/shutdown provados com fakes. Preservar
  BullMQ 6.3.10/ioredis 5.11.1/ULID 3.0.2, getBackend().client, alias v5 só dev,
  épocas/reidratação/PAUSED, limiter/slot 8 s, lease/CAS/backoff e gates E16/E17.
  E17/PR #23 mergeada em `4de87fe`, checks verdes conferidos na abertura.
  P-100 continua aberta: v5/v6 reproduzem EVAL principal pendente e disconnect
  bloqueante esperando end; restaurar Redis não resolve o segundo caso na janela
  observada. SIGTERM do subprocesso é cleanup da falha, nunca shutdown aprovado.
  [Deploy F/rollback](how-to/deploy-f-nest12.md) manual após C/D/E, Redis saudável,
  B-004/B-005/B-007 e P-099 sem drenar filas. E19 mantém todos esses gates.

- **29/09 · e15-proxy (E15/P-058, D-041; PR #21, sem deploy):** o proxy salvo elegível é mantido
  em RANGE/GLOBAL; SINGLE inválido/pool vazio falham sem saída direta. Só NONE/sem atribuição
  permite direto, ainda sujeito a WA_REQUIRE_PROXY. DEAD exige ID capturado na conexão e
  assinatura auth/túnel; `reportFailure` usa a mesma transação da lease E13, nunca Prisma
  externo dentro do fence. PUT SINGLE valida/serializa por proxy; GET/PUT resolve nome vivo
  e conserva o 200 de desconhecidos/órfãos (P-097). PUT vale para resoluções iniciadas depois
  de gravado. Preservar E14/D-040: épocas, PAUSED sem requeue, limiter/slot 8 s e backoff sem
  FAILED transitório. E14/PR #20 mergeada em `b56ff27`. Deploy C manual no
  [runbook](how-to/deploy-c-onda3.md), com B-004 stop-first/B-005/B-007, P-099 e B-001 depois.

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

| ID                                   | Período | Entregue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Branch/PR                                                                                                                                                |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-30-2130-e21-refresh-purge    | 30/09   | **E21/P-005/D-050, sem deploy:** purge IAM preserva ancestral expirado/reuso, locks userId/recheck READ COMMITTED, lotes/timers/shutdown;20e2e+21unit/quatro mutações,1639gateway+292painel/revisão verdes. Primeira troca/rollback stop-first manual; próximo P-022.                                                                                                                                                                                                                                                                      | feature/onda21-refresh-purge (PR canônico/CI/merge após publicação)                                                                                      |
| 2026-09-30-1955-e21-contratos-w5     | 30/09   | **E21/P-013 W5, sem deploy:** mentions opcional e SendReactionRequest aditivos; schemas/envio/consumidores intactos.2 fixtures de tipos/20 HTTP,4 mutações recusadas,1598gateway+292painel e revisão verdes. P-040 residual; P-100/P-101/P-102 abertas/P-099 sem drenar.                                                                                                                                                                                                                                                                   | feature/onda21-contratos-w5 ([PR #30](https://github.com/diogocs32/whatsapp-gateway/pull/30); CI/merge canônicos; próximo P-005)                         |
| 2026-09-30-1327-e21-ack-duravel      | 30/09   | **E21/P-078 (D-049), sem deploy:** ACK durável pending-only, lock por sessão/key, consumo no INSERT/histórico e retenção90d.28 testes de efeito,4 mutações recusadas,1576gateway+292painel/coverage/revisão verdes. P-100/P-101/P-102 abertas/P-099 sem drenar.                                                                                                                                                                                                                                                                            | feature/onda21-ack-duravel ([PR #29](https://github.com/diogocs32/whatsapp-gateway/pull/29); CI/merge canônicos; publicação/migration stop-first manual) |
| 2026-09-30-0853-e21-qr-esgotado      | 30/09   | **E21/P-018/P-091 no recorte QR inicial (D-048), sem deploy:** esgotamento explícito → STOPPED sem retry/boot; auth/epoch/autostart intactos, pairing inconclusivo preservado.19unit+3efeito novos,2mutações recusadas,1548gateway+292painel/revisão verdes.                                                                                                                                                                                                                                                                               | feature/onda21-qr-esgotado ([PR #28](https://github.com/diogocs32/whatsapp-gateway/pull/28); CI/merge como gates canônicos; publicação manual)           |
| 2026-09-30-0011-e21-reply-rate       | 30/09   | **E21/P-103 e triagem (D-047), sem deploy:** identidade segura, diagnóstico aditivo/mediana sem ambíguos, G5 mantém estado;37 testes de efeito,4 mutações recusadas,1526gateway+292painel/revisões verdes. Demais itens/P-100 abertos; publicação manual.                                                                                                                                                                                                                                                                                  | feature/onda21-reply-rate ([PR #27](https://github.com/diogocs32/whatsapp-gateway/pull/27); CI/merge canônicos; sem operação produtiva)                  |
| 2026-09-29-1945-e20-metricas-produto | 29/09   | **E20/P-064 código +P-061 fixtures (D-046), sem deploy:** métrica30d/retained-history, quotaobserve0, inventário seguro/UNKNOWN, dedupcheck; revisão cruzada,1489gateway+292painel/imagens/smokes. P-101/P-102/P-103 abertas, P-100 preservada.                                                                                                                                                                                                                                                                                            | feature/onda7-metricas-produto ([PR #26](https://github.com/diogocs32/whatsapp-gateway/pull/26); CI/merge finais no PR; deploys/canários manuais)        |
| 2026-09-29-1908-e19-vitest5          | 29/09   | **E19/P-062 parte 4 (D-045), sem deploy:** Vitest/coverage5.0.2, SWC/e2e serial; TS5.9.3/CLI11, node20/node16 CommonJS e tipos reais. Cache em dist corrigido, 1425 gateway+292 painel, imagens/smokes; P-100 aberta.                                                                                                                                                                                                                                                                                                                      | feature/onda5d-vitest5 (PR #25; CI/merge como gates; deploys/canários pendentes)                                                                         |
| 2026-09-29-1501-e18-nest12           | 29/09   | **E18/P-062 parte 3 (D-044), sem deploy:** Nest 12.1.1 runtime, CLI 11/TS 5.9.3 preservados, peers/DI/CJS/Fastify corrigido; 18 novos e2e, 1.425 gateway + 292 painel, imagens/smokes verdes. P-100 diferenciada v5/v6, ainda aberta; checklist F e mensagem E19 preparados.                                                                                                                                                                                                                                                               | feature/onda5c-nest12 (PR #24; CI/merge como gates; deploy F pendente)                                                                                   |
| 2026-09-29-1424-e17-bullmq6          | 29/09   | **E17/P-062 parte 2 (D-043), sem deploy:** BullMQ 6.3.10/ioredis 5.11.1/ULID 3.0.2; slot adaptado, 13 novos e2e N-1/dois workers/HTTP/retry/DLQ/reconexão, CommonJS na imagem final e mutação recusada. P-100 delimita shutdown pendente; checklist E manual.                                                                                                                                                                                                                                                                              | feature/onda5b-bullmq6 (PR #23 mergeado 4de87fe; CI verde; deploy E pendente)                                                                            |
| 2026-09-29-1340-e16-manutencao       | 29/09   | **E16/P-062 parte 1 (D-042), sem deploy:** imagens por digest, Actions node24/Ubuntu 24.04, npm ci estrito, manutenção React/tooling e remoção de ts-node sem uso. 1.394 gateway + 292 painel, ambos Dockerfiles, smoke HTTP + 12 cenários Chrome e auth/rate-limit na imagem local; mutações recusadas. Deploy D manual com pré-requisitos C preservados.                                                                                                                                                                                 | feature/onda5a-manutencao (PR #22; CI/merge como gates; deploy D pendente)                                                                               |
| 2026-09-29-1305-e15-proxy            | 29/09   | **E15/P-058 (D-041), sem deploy:** afinidade RANGE/GLOBAL; falha explícita nas engines; DEAD por auth/túnel na transação da lease; PUT validado e nome vivo compatível (P-097). 1.394 gateway + 292 painel locais; 15 e2e E15 com Postgres/Redis e engines falsas. Runbook deploy C inclui B-004/B-005/B-007, P-099 e B-001 depois.                                                                                                                                                                                                        | feature/onda3-e15-proxy (PR #21; deploy C pendente)                                                                                                      |
| 2026-09-29-0508-e14-campanhas        | 29/09   | **E14/P-057 (D-040) no PR #20, sem deploy:** época por retomada, PAUSED sem requeue, Worker após reidratação, limite global no início e no envio efetivo; reserva liberada com backoff em sessão sem WORKING/lease/shutdown. 1.313 gateway + 292 painel locais; sete e2e no Redis/Postgres com envio falso. P-099 registra backlog legado; deploy C após E15 e B-004 stop-first.                                                                                                                                                           | feature/onda3-e14-campanhas (PR #20; deploy C pendente)                                                                                                  |
| 2026-09-27-1236-e13-exclusividade    | 27/09   | **E13/P-056 (Onda 3, D-039) no PR #19, sem deploy:** lease PostgreSQL por sessão antes de start/boot, auth/status cercados em transação, perfil WWEBJS separado sob lock, draining e campanha sem FAILED transitório. E2E com dois managers no Postgres/Redis; 1304 gateway + 292 painel locais, builds/CI verdes. Primeiro deploy e WWEBJS exigem stop-first; P-098 para resíduos descartados.                                                                                                                                            | feature/onda3-e13-exclusividade (PR #19 mergeado; deploy C pendente)                                                                                     |
| 2026-09-27-0937-e26-proxy-sugestao   | 27/09   | **E26/P-084 (Onda 9, D-038) em código, sem deploy:** apagar sessão com proxy fixo guarda o nome na atribuição órfã (depois do delete); o painel sugere/pré-seleciona esse proxy ao recriar com o mesmo nome (sem diferenciar caixa; aviso quando em uso/fora do ar/desabilitado/excluído; Enter espera a sugestão). Rota `GET /api/proxies/suggestion`, migration aditiva. 3 revisões multiagente + harness do painel; 911 unit gateway, 292 painel, 378/379 e2e (falha ambiental). P-097 nova.                                            | feature/onda9-proxy-sugestao (PR da Onda 9; deploy manual pendente)                                                                                      |
| 2026-09-27-0020-e27-link-conexao-qr  | 27/09   | **E27/P-086 + P-089 (Onda 9, D-037) em código, sem deploy:** link público temporário para conectar sessão Baileys por QR em outra tela (página `/conectar`, token no `#`/Bearer, só login do painel, nunca apaga login salvo, número esperado com desfazimento, `CONNECTED` 15 min), lock de ciclo de vida no `SessionManager`, `lastMeJid`, filtro de Sessões por nome/status/número. 3 revisões multiagente; 866 unit gateway, 255 painel, 348/349 e2e (falha ambiental do banco de dev). Deploy dos 2 apps e aceite com chip pendentes. | feature/onda9-link-conexao-qr (PR da Onda 9; deploy manual pendente)                                                                                     |

> Histórico limitado às 15 sessões mais recentes; anteriores em [SESSOES_ARQUIVO.md](SESSOES_ARQUIVO.md) (R9).
