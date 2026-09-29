# 📜 DECISÕES — ConexoZenvo

> Log **append-only** (R3): data, decisão, motivo, alternativas consideradas.
> Nunca apagar — decisão revertida ganha entrada NOVA apontando para a antiga.
> Decisões históricas (pré-M0) estão em [agent-whatzapp_api.md §7](agent-whatzapp_api.md) e na [auditoria-2026-07.md](auditoria-2026-07.md) — não duplicadas aqui.

---

## D-001 — 2026-07-10 — Adotar processo de ondas M0–M6 com doc viva

- **Decisão:** o projeto passa a operar pelo `DOCUMENTO_CONEXOZENVO_NESTJS.md` (raiz): ondas M0–M6, regras R0–R10, sessões paralelas com branch própria e checkpoint por onda.
- **Motivo:** produto vivo em produção com contrato de API público (node n8n no npm) — precisa de processo que proteja produção (R0) e de memória externa consistente entre conversas (R3/R9).
- **Alternativas:** seguir ad-hoc por memória do Claude (rejeitado: já causou retrabalho e estado divergente entre conversas).

## D-002 — 2026-07-10 — Tabelas donas validadas contra o schema.prisma (divergências do esboço)

- **Decisão:** o mapa de donos por tabela em [ARQUITETURA.md](ARQUITETURA.md) segue o CÓDIGO real (quem escreve), não o esboço do documento mestre. Divergências encontradas na validação da M0:
  1. `wa_session_events` — dono real é **observability** (`session-event.logger.ts` cria; `retention.service.ts` purga). O esboço atribuía a sessions.
  2. `session_metrics` — dono real é **observability** (`reply-rate.service.ts` faz o upsert dos snapshots G4); o guardrail apenas LÊ para o veredito. O esboço atribuía a guardrail.
  3. `wa_contacts` — quem escreve é `infra/directory/contact-directory.service.ts` (upsert); o módulo contacts só lê/expõe. Exceção consciente à regra "infra não conhece negócio" — herdada do blueprint F5; revisitar quando o módulo contacts for tocado.
  4. Não existem tabelas `groups_*` nem `leads` — extração de leads opera sobre dados das engines e do diretório de contatos, sem persistência própria.
- **Motivo:** fronteira documentada errada é pior que fronteira ausente; o enforcement da M3 (dependency-cruiser) precisa partir do mapa VERDADEIRO.
- **Alternativas:** mover a escrita para os módulos "ideais" já na M0 (rejeitado: M0 é onda de documentação — refactor sem teste unitário de domínio, que só chega na M3, viola R0).

## D-003 — 2026-07-10 — Módulo `channels` ≠ abstração de engine; engines vivem em `sessions/infrastructure/`

- **Decisão:** registrar que o módulo `channels` expõe **Canais/newsletter do WhatsApp** (REST `sessions/:id/channels`, beta). A abstração de engine (interface IEngine, `EngineFactory`, `baileys/`, `wwebjs/`) vive em `modules/sessions/infrastructure/`. O documento mestre descrevia `channels` como "casa da engine" — está corrigido na ARQUITETURA.md.
- **Impacto futuro (M6):** a engine META_CLOUD nasce em `modules/sessions/infrastructure/meta-cloud/` atrás da MESMA IEngine (ou, se a sessão R9 da M6 decidir extrair a camada de engines para módulo próprio, isso será uma decisão nova aqui).
- **Motivo:** implementar a M6 no lugar errado quebraria a fronteira R10 logo na feature mais estratégica.

## D-004 — 2026-07-10 — Docs existentes permanecem como fonte, linkados (não duplicados)

- **Decisão:** [INTEGRACAO.md](INTEGRACAO.md) (contrato da API), [auditoria-2026-07.md](auditoria-2026-07.md) (backlog/histórico), [deploy-dokploy.md](deploy-dokploy.md) (deploy), [agent-whatzapp_api.md](agent-whatzapp_api.md) (gargalos/operação) e [motores-whatsapp.md](motores-whatsapp.md) (comparativo de engines) permanecem como estão; os arquivos novos da M0 os REFERENCIAM.
- **Motivo:** duplicação = duas fontes que divergem; a auditoria já provou ser um bom documento de acompanhamento.
- **Alternativas:** consolidar tudo em ARQUITETURA/PROJETO (rejeitado: perderia histórico e quebraria links externos já usados).

## D-005 — 2026-07-10 — Janela de observação do guard-rail antes de ligar o enforce (M2)

- **Decisão:** observar o guard-rail por **≥ 7 dias** (coleta 1×/dia via `scripts/guardrail-observe.mjs`,
  acumulando `targetState` vs estado real por sessão em `docs/observacao/guardrail-m2.jsonl`) e SÓ
  ligar `GUARDRAIL_ENFORCE=true` quando os 5 critérios de aceite do
  [how-to/observacao-guardrail-m2.md](how-to/observacao-guardrail-m2.md) forem cumpridos — incluindo
  o teste prévio do HTTP 423 nos fluxos n8n via override manual (que bloqueia mesmo em observação).
- **Motivo:** o hard-gate 423 afeta consumidores externos (contrato público, R0); 7 dias cobrem 2+
  ciclos de maturação do reply-rate (cold-sends só contam no denominador após 72h — C2) e a janela
  operacional de 7d do G4. Falso-positivo de quarentena bloquearia envio legítimo de cliente.
- **Alternativas:** ligar direto (rejeitado: sem evidência de que os limiares não geram falso-positivo
  com a frota real); observação sem prazo (rejeitado: vira nunca — critérios objetivos + data).

## D-006 — 2026-07-10 — Dependência do node n8n (N1–N8) para o enforce do guard-rail

- **Decisão:** registrar que o community node `n8n-nodes-conexozenvo-gateway` (repo separado,
  publicado no npm — v0.2.0 introduziu N1–N8, atual 0.4.1) é o principal consumidor do contrato do
  guard-rail: HTTP **423** com payload `{ code: "SESSION_QUARANTINED", state, message }` (N7
  ramifica e re-enfileira o lead). Qualquer mudança nesse shape é BREAKING (R0) e exige plano de
  versão. Integradores em HTTP puro ou node < 0.2.0 precisam tratar 423 antes do enforce.
- **Motivo:** M2 liga o comportamento que esse contrato promete; a dependência cruza repositórios e
  precisa estar visível para quem mexer no guard-rail ou no node.
- **Alternativas:** — (registro de dependência, exigido pela definição da onda M2).

## D-007 — 2026-07-10 — Booleans de env com parser explícito (fim da pegadinha do coerce.boolean)

- **Decisão:** `DB_SSL`, `GUARDRAIL_ENFORCE` e `S3_FORCE_PATH_STYLE` deixam de usar
  `z.coerce.boolean()` e passam a usar o helper `envBool` (`config.ts`): `true/1/yes/on` liga ·
  `false/0/no/off` desliga · ausente/vazio = default · **valor não reconhecido derruba o boot**
  citando a variável (fail-fast). Regressão travada por `test/config.e2e-spec.ts` (5 testes).
- **Motivo (EP+DO):** no zod 3 (`zod@^3.23.8`), `z.coerce.boolean()` faz `Boolean(input)` —
  QUALQUER string não-vazia vira `true`, inclusive `"false"` e `"0"` (doc oficial:
  https://zod.dev/?id=coercion-for-primitives). Descoberto na M2 ao documentar o
  `env.production.example`: escrever `GUARDRAIL_ENFORCE=false` no Dokploy LIGARIA o enforce, e o
  rollback "=false" não funcionaria; o exemplo antigo `DB_SSL=false` era a mesma armadilha; e era
  impossível desligar `S3_FORCE_PATH_STYLE` por env (AWS S3 inviável).
- **Alternativas:** documentar a pegadinha sem mudar código (rejeitado: rollback contra-intuitivo
  em incidente é risco real); aceitar qualquer valor desconhecido como false (rejeitado: erro de
  digitação silencioso em produção é pior que boot falhando com mensagem clara).

## D-008 — 2026-07-11 — Escolha de proxy livre na criação de sessão (SEM migration)

- **Decisão:** a criação de sessão ganha `proxyId` OPCIONAL (aditivo — R0/R4) e o endpoint
  `GET /api/proxies/available` lista os proxies LIVRES (enabled, não-DEAD e que não são o
  `currentProxyId` de nenhuma sessão existente). Com `proxyId`, a sessão nasce com atribuição
  `SINGLE`/`STICKY` — reusando `session_proxy_assignments`, **sem migration**. Fronteira R10
  preservada: `ProxyService` (exportado pelo ProxiesModule) faz a validação/atribuição; o create
  de sessions valida ANTES de criar e desfaz a sessão se a atribuição falhar (corrida de dois
  creates pelo mesmo proxy → 400, sem sessão órfã nem proxy duplicado).
- **Limitações conscientes:** (1) exclusividade vale para o fluxo SINGLE — RANGE/GLOBAL_ROUND_ROBIN
  podem usar qualquer proxy em runtime; (2) a checagem de "livre" é em nível de aplicação (sem
  constraint no banco — `currentProxyId` único quebraria os modos de pool); (3) assignments órfãos
  (a tabela não tem FK p/ wa_sessions) NÃO seguram proxy — `usedProxyIds()` cruza com sessões vivas.
- **Dependência node n8n** (repo separado): a operação de criar sessão do
  `n8n-nodes-conexozenvo-gateway` pode ganhar o parâmetro opcional `proxyId` + um picker de
  `/proxies/available` (aditivo; publicar versão minor). Registrado como backlog do node.
- **Alternativas:** atribuição automática de proxy livre (1ª versão do pedido — o usuário refinou
  para ESCOLHA explícita em 10/07); modo novo `AUTO_EXCLUSIVE` no enum (rejeitado: migration +
  complexidade sem necessidade — SINGLE já expressa o resultado).

## D-009 — 2026-07-19 — Sessão do painel: refresh-token rotation (fim do 401 de 12h)

- **Decisão:** trocar o JWT único de 12h (cookie httpOnly `token`) por **access curto (JWT, 15min,
  mesmo secret/guard) + refresh opaco longo (30d) rotacionado a cada uso com detecção de reuso**
  (revoga a família = `sessionId`), + **silent refresh** no dashboard (interceptor de 401 anti-corrida
  que renova e refaz o request; falha → redirect limpo pro login). Nova tabela `refresh_tokens`
  (guarda só `sha512`), endpoint `POST /api/auth/refresh`. Baseado em OWASP Session/JWT Cheat Sheets
  - RFC 9700 §4.14. Parâmetros aprovados pelo usuário: access 15min, refresh 30d.
- **Motivo:** o 401 em `/api/auth/me` derrubava o usuário no meio do trabalho a cada 12h (sem refresh,
  sem tratamento gracioso). Ganho de segurança de brinde: janela de token vazado cai de 12h → 15min +
  revogação real de sessão (que não existia com JWT stateless).
- **Compat/R0:** cookie de access MANTÉM o nome `token` (SSE/JwtAuthGuard dependem); `X-Api-Key` e
  `Authorization: Bearer` intocados; `LoginResponse { token, user }` mantém o shape (`token` = access);
  migration forward-only aditiva; `JWT_EXPIRES_IN` vira DEPRECATED (ignorado). Suíte e2e 84/84
  (5 casos novos: 2 cookies, rotação, reuso→revoga família, access-expirado+refresh, logout).
- **Refresh opaco vs JWT:** escolhido OPACO (casa com WaApiKey; a força é o hash no banco, não a
  assinatura; dispensa 2º secret). **Path do refresh = `/api/auth`** (não `/api/auth/refresh`) para o
  logout também receber o cookie e revogar a família.
- **Alternativas:** sliding session (reemitir o cookie de 12h — rejeitado: não dá revogação nem
  detecção de roubo, é paliativo); refresh JWT com 2º secret (rejeitado: secret extra sem ganho real).
- **Backlog:** job de purge de `refresh_tokens` expirados (índice em `expiresAt` já criado); revisar
  se o node n8n precisa de algo (não — usa X-Api-Key). Detalhes: [how-to](how-to/auth-sessao-refresh-rotation.md).

## D-010 — 2026-07-21 — Upgrade da base de processo: universal v2.1 → v3.2 (R18)

- **Decisão:** o projeto adota a base universal **v3.2** (`docs/DOCUMENTO_UNIVERSAL.md`,
  trazida pelo usuário) via MODO UPGRADE do R18. Novo arquivo canônico de regras:
  **`BASE_CONEXOZENVO.md` na raiz** (v3.2 traduzida para NestJS/Prisma/Vitest/Dokploy,
  preservando R0, ondas M0–M6, módulos e a feature META CLOUD). `DOCUMENTO_CONEXOZENVO_NESTJS.md`
  (adaptação da v2.1) vira histórico com banner de superseded — mantém as seções ainda
  referenciadas (FEATURE DIRECIONADA e PARTE 5).
- **Deltas aplicados (v2.2→v3.2):** MAPA.md (navegação de siglas) · AUDITORIAS.md (agenda
  viva — R17) · regras novas R11 (.env como contrato) · R12 (acessibilidade — recomendado,
  painel interno) · R13 (tempo/fuso — `@db.Timestamptz`, TZ, ISO-8601 com offset) · R14
  (assets) · R15 (deploy de excelência — build-once/promote, smoke do artefato, graceful
  shutdown; estado atual "auto-deploy + build no servidor" registrado como divergência) ·
  R16 (hardening da imagem) · R17 (cadência de auditorias) · R18 (ciclo de vida da base) ·
  reforços em R4 (N-1/expand-contract, índice CONCURRENTLY), R5 (2 níveis de criptografia
  adaptados, teste→go-live), R6 (gitleaks, drift de env, baseline não cresce), R9
  (SESSOES_ARQUIVO.md >15 linhas), R10 (identidade ≠ domínio).
- **Numeração:** R1–R10 do projeto já coincidiam 1:1 com o universal → upgrade ADITIVO,
  nenhuma referência antiga (R0–R10 em docs/sessões) quebra.
- **Plano:** deltas que exigem código/infra viram ondas em `docs/ADOCAO.md` (cada uma
  sessão R9 própria, priorizadas por risco — produção não para, nada de big-bang).
- **Alternativas:** reescrever DOCUMENTO_CONEXOZENVO_NESTJS.md no lugar (rejeitado: R18
  pede BASE_<NOME>.md canônico na raiz e o histórico da v2.1 tem valor de contexto);
  renumerar regras para "limpar" o R0 (rejeitado: quebraria toda referência existente).

## D-011 — 2026-08-12 — Upgrade da base de processo: universal v3.2 → v4.3 (R18)

- **Decisão:** o projeto adota a base universal **v4.3** (trazida pelo usuário) via MODO
  UPGRADE do R18. `BASE_CONEXOZENVO.md` reescrito preservando o preenchimento do projeto
  (CONTEXTO, STACK, MÓDULOS, R0, ondas M, mapa de adaptação). `docs/DOCUMENTO_UNIVERSAL.md`
  passa a ser a v4.3 (a v3.2 fica no histórico do git — lei 7 do R3: um canônico).
- **Deltas aplicados (v3.3→v4.3, pelo changelog do cabeçalho — que É o diff):**
  v3.3 retenção no registry + higiene de custo de CI (R15/R6) · v3.4 comunicação entre
  sessões — `PENDENCIAS.md` (criado, semeado com B-001 e P-001–P-006), seção 📢 Avisos
  em SESSOES.md e ECO DE LEITURA na abertura (R9) · v3.5 **R19** ferramental de IA
  (allowlist/hooks/memória) + **R20** briefing (loop de volta à base) + classe runbook
  (R3) · v3.6 continuidade do briefing (rev/zonas/recibo) · v3.7 automação que implementa
  regra também é gateada (R6) · v3.8 bloqueio externo **B-xxx** (R9/checkpoint) ·
  v3.9+v4.1 **R21** varredura V0–V9 (com adaptações: entry points NestJS/BullMQ/EventBus,
  "não é morto" = superfície `/api` do node n8n + jobs serializados na fila) · v4.0
  projeção `.claude/` + worktrees (adaptado: worktree quando 2+ sessões tocarem código) ·
  v4.2 R3 reescrito como engenharia de documentação (Diátaxis, ADR, postmortems,
  frontmatter/frescor, depreciar>apagar) · v4.3 FIDEDIGNIDADE como DoD documental
  (mapa de gatilhos, trailer `Docs-n/a`, reconciliação documental no encerramento,
  campos BLOQUEADO EM VOCÊ + DOCS TOCADAS no checkpoint).
- **Numeração:** upgrade ADITIVO (R0–R18 intactos, R19–R21 novos) — nenhuma referência
  antiga quebra.
- **Plano:** deltas que exigem código/infra viram ondas **A8–A11** em `ADOCAO.md`
  (A8 projeção `.claude/` · A9 gates de docs · A10 bateria única + catracas/varredura ·
  A11 reorganização docs/). Protocolo R9 novo (PENDENCIAS/eco/avisos/reconciliação)
  vale JÁ — é doc, não código.
- **Alternativas:** manter os dois universais lado a lado (rejeitado: duas fontes
  divergem — lei 7); aplicar só as regras "baratas" e adiar R19–R21 (rejeitado: a BASE
  é o contrato completo; o que custa código vira onda, não omissão).

## D-012 — 2026-08-14 — Foco exclusivo na engine wwebjs; dep pinada em commit da main (fix pós-QR fora do npm)

- **Decisão (dono, 14/08):** o trabalho de engine foca SOMENTE no wwebjs (Baileys rc14 e
  migração wa-js ficam FORA do escopo atual — registrados como opções em
  `docs/pesquisa-wwebjs-2026-08.md`). A dependência `whatsapp-web.js` sai do npm
  (`^1.34.7`, release 24/04/2026) e passa a ser **tarball do commit
  `1780711a1c86dfeca7c5ba6a66f950eac93dde28`** da main do repo `wwebjs/whatsapp-web.js`
  (`https://github.com/wwebjs/whatsapp-web.js/archive/<sha>.tar.gz`).
- **Por quê:** o commit contém o **PR #201653** ("fix: prevent duplicate ready events on
  SPA re-injection", mergeado 25/06/2026, AUSENTE de qualquer release do npm) — corrige a
  injeção concorrente do Store após ciclos de QR/destroy/re-init (3-4 sets de listeners
  Backbone por scan), a causa com melhor evidência para o P-014 (Store travado pós-QR).
  Evidência completa com URLs em `docs/pesquisa-wwebjs-2026-08.md` §1.
- **Forma tarball (não git URL):** o stage de build do Docker não tem `git`, e dep git
  rodaria o `prepare` (`is-ci || husky`) da lib. Tarball de commit não roda scripts e o
  lockfile grava URL + integrity sha512. Risco aceito: regeneração de archive pelo GitHub
  poderia quebrar a integridade no `npm ci` (incidente de 2023, revertido) — remediação:
  rodar `npm install` de novo e commitar o lock.
- **Verificação:** commit confere na API do GitHub (só `src/Client.js`, +347/−288);
  código instalado contém o filtro de main-frame (`frame.parentFrame() !== null`),
  `_framenavigatedRegistered` e `_wwjsListeners`; versão declarada segue `1.34.7`;
  deps idênticas (puppeteer 24.38.0). 34/34 testes do engine · tsc · eslint OK.
- **Alternativas:** esperar release oficial (rejeitado: 3,5 meses sem release e issues
  `issued high` sem resposta); pinar HEAD da main (rejeitado: o `1780711` exato tem
  precedente de produção por terceiro — menos variáveis); bisect de build "estável" do
  wa-version (rejeitado: premissa furada — não há curadoria de estabilidade, ver pesquisa §0.4).
- **Nota 25/09/2026:** foco de engine substituído pela D-021 (Baileys = frota atual; wwebjs mantido e pronto para uso sob demanda); o pin do tarball `1780711` segue válido enquanto não houver pin melhor (P-059).

## D-013 — 2026-08-14 — Patch `$1` via patch-package + política de build do WA Web pinada

- **Decisão:** o repo passa a carregar `patches/whatsapp-web.js+1.34.7.patch` (aplicado por
  `patch-package` no `postinstall` da raiz; `COPY patches` antes do `npm ci` nos 2 Dockerfiles;
  teste e2e acusa patch ausente). O patch tolera o rename `_serialized`→`$1` das builds
  ≥2.3000.104x do WA Web (receita comunitária validada em produção — issue #201852 do repo da lib,
  sem fix mergeado upstream). Build pinada: **`2.3000.1045101284-alpha`** (env + default do código),
  validada 14/08 em produção (grupos, envio, leads 99/99 com phone). Expira **13/10/2026** —
  revalidar ~início de outubro (procedimento no B-002/PENDENCIAS).
- **Motivo:** a `1042271047` expirava 28/08 e o perfil "catracado" pelas builds novas nem a reabria;
  sem o patch, QUALQUER build recente quebra sendMessage/getChats/downloadMedia (Modo B da
  pesquisa). Patch + build nova é o único caminho com evidência enquanto a lib não mergear fix.
- **Alternativas:** bisect de build "estável" (rejeitado — wa-version não tem curadoria);
  migração wa-js/wppconnect (fora de escopo por D-012; segue como opção futura).

## D-014 — 2026-08-14 — Operação wwebjs: volume + stop-first + 4GB + regra "deploy pode custar re-scan"

- **Decisão:** (a) app gateway no Dokploy com **Volume Mount `gateway-wwebjs` → `/data/wwebjs`**
  (perfil persiste entre containers — raiz da P-015) e **Update Config SEM start-first** (default
  stop-first; start-first com volume compartilhado = 2 Chromium no mesmo perfil); (b) **Memory
  Limit 4GB** (2GB estourava com Chromium + mídia de grupos pesados — OOM matou o container em
  14/08); (c) regra operacional: **todo deploy/troca de container do gateway pode exigir re-scan
  do QR da sessão wwebjs** — a RE-sincronização de reconexão (caminho incremental) empaca em 99%
  nas builds atuais (bootstrap pós-scan completa sempre; incremental falhou ~10× em 3 builds em
  14/08). Deploys entram em LOTE, em janela com re-scan aceitável.
- **Motivo:** evidência de produção de 14/08 (mapa completo no DONE da sessão
  `wwebjs-p015-shutdown-limpo`); o "zero-downtime" nunca valeu para a sessão WhatsApp.
- **Alternativas:** start-first (rejeitado — corrompe perfil compartilhado); reduzir grupos da
  sessão (paliativo fraco — refutado pela contra-evidência do dono: pós-scan a mesma conta roda leve).
- **Nota 25/09/2026:** premissa do stop-first corrigida pela D-020 (Update Config vazio no Dokploy = `start-first`; stop-first só com configuração explícita — B-004).

## D-015 — 2026-08-16 — Dedup de `session.status` idêntico consecutivo na fonte (fim do spam de alerta)

- **Decisão:** o gateway só publica um evento `session.status` (webhook + timeline + SSE) quando o
  par **(status, error) MUDA**. Um status idêntico ao último publicado da sessão é descartado no
  `SessionManager.handleEngineEvent` (chave `status|error` por sessão, limpa em todo `engines.delete`).
  `persistStatus` continua rodando SEMPRE, antes do gate — o `wa_sessions.status` e a detecção de
  engine órfã (`discardOrphan`) não dependem do dedup.
- **Motivo (EP):** as duas engines RE-emitem `session.status` sem mudança real — o Baileys dispara
  `WORKING` em **todo** `connection 'open'` (`baileys.engine.ts:628`), então cada reconexão
  transitória de rede/proxy reemitia `WORKING` já sendo `WORKING`; o wwebjs reemite `WORKING` a cada
  heal (`ready` re-dispara). Sem dedup, cada uma virava webhook → o workflow n8n do dono repassava
  como alerta no zap/telegram dizendo "está WORKING" de novo. Sintoma relatado pelo dono (16/08):
  "muitos alertas, mas quando vejo não mudou nada". A M5 (canal de alertas) segue AUSENTE — este é o
  critério de ruído na FONTE, aproveitado pelo notificador n8n que já existe.
- **Contrato (R0):** NÃO é breaking — um status idêntico não é uma transição; consumidor nenhum
  precisa da duplicata. Documentado em `INTEGRACAO.md §3` (nota C6). O `session.status` continua com
  o mesmo shape e semântica "avisa em mudança de estado".
- **Alternativas:** histerese/debounce no gateway (rejeitado por ora — atrasa DEGRADED para TODOS os
  consumidores, muda o timing do contrato; fica como opção futura junto do P-001); filtrar só no n8n
  (rejeitado como solução única — não corrige a fonte, e o timeline em `wa_session_events` seguiria
  acumulando linhas repetidas). O dedup na fonte beneficia todos os consumidores de uma vez.
- **Rollback:** reverter o commit e redeployar (sem flag — a mudança é comprovadamente segura e a
  troca de env no Dokploy também exige restart, então um flag não daria rollback mais rápido).

## D-016 — 2026-08-16 — Política de atualização de dependências (sessão otimizacao-deps-hotpaths)

- **Decisão:** manter as deps **o mais atualizadas possível dentro da compatibilidade**: (a) tudo
  que é minor/patch dentro do range sobe junto (`npm update` + bump dos ranges declarados);
  (b) o **fastify segue SEMPRE o exato que o `@nestjs/platform-fastify` instalado declara**
  (regra do pin de ca0629d — hoje 5.11.3; nunca "latest do fastify"); (c) **majors só entram com
  evidência de compatibilidade** na cadeia inteira de dependentes — os bloqueados viraram P-021.
- **Aplicado nesta sessão:** NestJS 11.2.1 · Prisma 7.9.1 (fix de connection leak no adapter pg) ·
  fastify 5.11.3 · **Baileys rc13→rc14** (8 commits de bugfix — Long import, view-once Android,
  token de foto de perfil, bump WA Web; sem breaking; validar reconexão da frota no 1º deploy) ·
  BullMQ 5.81.3 (dedupa ioredis 5.11.1) · **pino 9→10** (breaking = só drop de Node 18; unifica
  as 2 cópias que existiam — pino-http@11 exige ^10; fastify 5.11.3 aceita ^9.14||^10.1;
  nestjs-pino aceita ^10 nos peers) · pg/aws-sdk/@fastify/vite/react/etc minors.
- **Majors deferidos (motivo técnico, não preguiça):** zod 4 (migração das bordas inteiras),
  bullmq 6 (major recém-saído), ioredis 6 (bullmq 5 pina ^5 → criaria cópia dupla de novo),
  @hapi/boom 10 (**Baileys pina ^9.1.3** — subir des-dedupa e quebra instanceof nos erros do
  socket), proxy-chain 3 (usado no wwebjs.engine — arquivo de sessão ativa), ulid 3 (ESM-only,
  zero ganho funcional), dotenv 17 (sem ganho; usado pelo prisma.config no entrypoint).
- **Rollback:** reverter o commit de deps (lockfile junto) e redeployar.
- **Nota 25/09/2026 (P-063):** motivos corrigidos, texto acima mantido como histórico — (i) `@hapi/boom`: não há `instanceof Boom` em `apps/`/`packages/` (grep = 0; `baileys.engine.ts:19` importa `Boom` e `:690` só o usa como tipo), o motivo real é "sem ganho + Baileys declara `^9.1.3`" (`node_modules/@whiskeysockets/baileys/package.json:45`); (ii) `ulid 3` não é ESM-only — `npm view ulid@3 exports` traz `require: ./dist/node/index.cjs` (3.0.0–3.0.2); (iii) BullMQ 6 é testado upstream com **ioredis 5.11.1** (`npm view bullmq@6.3.8`: devDependency `ioredis 5.11.1`, peer `ioredis >=5.0.0` opcional) e o ioredis 6.0.0 usa RESP3 por padrão (README do pacote, seção "RESP3 Protocol") → BullMQ 6 entra com ioredis 5 (P-062).

## D-017 — 2026-08-18 — M2 encerrada por reconciliação: `GUARDRAIL_ENFORCE` ativo é o estado oficial

- **Decisão:** a onda **M2 (guard-rail ativo) está CONCLUÍDA** e `GUARDRAIL_ENFORCE=true` em
  produção passa a ser o estado documentado/oficial (era divergência: docs diziam "modo
  observação"). Fechamento por reconciliação: o dono ligou o enforce na env do Dokploy em data
  ≤13/08 (a leitura da env em 13/08, sessão `wwebjs-store-travado`, o constatou na linha 63) e a
  operação real por >1 mês sem falso-positivo vale como validação superior ao restante da janela
  formal de observação.
- **Evidência disponível no fechamento de 18/08 (complementada pelo adendo abaixo):** 6 coletas (10–14/07, `docs/observacao/guardrail-m2.jsonl`) com **zero
  falso-positivo** · teste do 423 no n8n aprovado ponta a ponta com requeue N7 provado
  (`RETURNING id` — critério 4 fechado em definitivo em 10/07) · nenhum incidente de guard-rail
  registrado em PENDENCIAS/avisos/alertas entre 13/08 e 18/08. O critério 1 da janela (≥7 dias)
  ficou parcial (coletas pararam em 14/07) — suprido pelo mês de enforcement real.
- **Rollback:** `GUARDRAIL_ENFORCE=false` no Dokploy + redeploy — **FUNCIONA desde o D-007**
  (`envBool` fail-fast; a pegadinha antiga do `coerce.boolean` não existe mais). Alternativa:
  remover a env (default `false`).
- **Consequências:** ESTADO.md roadmap M2 ✅ · próxima onda = M3 (qualidade) · histerese
  DEGRADED↔WORKING e curadoria de quais status alertam seguem como backlog (P-001 + n8n).
- **Adendo 26/09/2026 (evidência histórica recuperada, sem consulta à produção):** o ramo antigo
  `feature/m2-guardrail-ativo` continha outras 6 coletas. O JSONL canônico reúne agora 12 coletas
  entre 10 e 19/07: 8 anteriores ao flip (a 8ª em 17/07 completa 7 dias) e 4 posteriores; a 9ª,
  de 18/07 02:11 UTC, já mostra `enforce:true`. Assim, a premissa acima de que as coletas pararam
  em 14/07 e o critério temporal era parcial refletia somente o material disponível em 18/08.
  A decisão de encerramento permanece; o adendo corrige sua base de evidência.

## D-018 — 2026-08-18 — Política de qualidade M3: fronteiras no CI, projetos de teste e cobertura sem piso inicial

- **Decisão:** (a) as regras de fronteira de ARQUITETURA.md §"Regras de dependência" viram
  **código** (`.dependency-cruiser.cjs`, 5 regras `error`) e rodam no CI — violação de fronteira
  nova quebra o build; (b) testes ganham DOIS projetos vitest — `unit` (`src/**/*.spec.ts`, roda
  **sem infra**, co-locado com o código) e `e2e` (inalterado, exige docker); (c) cobertura v8
  agregada no CI **sem threshold** por enquanto — primeiro consolidar a baseline (42% linhas em
  18/08), depois decidir piso (nunca quebrar CI com número arbitrário); (d) `nest build` passa a
  usar `tsconfig.build.json` (exclui `**/*spec.ts`) — spec NUNCA vai para `dist/`/imagem.
- **Evidência (EP):** levantamento 18/08 no repo — zero violação de fronteira em 176 módulos/606
  dependências (inclusive zero ciclo) ⇒ as regras entram como `error` sem legado; sem o
  `tsconfig.build.json`, o `nest build` compilava os specs novos para `dist/` (provado no build
  local; correção validada com require do grafo completo — lição D-016).
- **Evidência (DO):** dependency-cruiser `rules-reference.md` (group matching `$1`) e
  `options-reference.md` (`doNotFollow`); vitest `guide/projects.md` (**`extends: true` explícito
  no Vitest 4** — herdar a raiz só vira default no 5, guia de migração) e `guide/coverage.md`
  (`@vitest/coverage-v8` alinhado à versão do vitest).
- **Rollback:** remover os passos novos do `ci.yml` (format/depcruise/cov) — os scripts npm
  continuam disponíveis localmente; reverter `tsConfigPath` volta specs ao dist (não fazer).

## D-019 — 2026-09-15 — Caixa única de triagem: o semáforo é DERIVADO das mensagens; só o amarelo é persistido

- **Decisão:** a tela de triagem (`/atendimento`, API `/api/inbox/*`) **não guarda estado de
  conversa**. 🔴 `pending` e 🟢 `answered` são calculados na leitura a partir de `wa_messages` (a
  última mensagem da conversa decide: do contato → vermelho; minha → verde, inclusive quando a
  resposta saiu do CELULAR, `source='phone'`). Persistimos APENAS a marca manual 🟡, numa tabela
  nova (`wa_conversation_triage`, uma linha por sessão+chat), **ancorada no `keyId` da mensagem de
  entrada** que estava por último quando o dono clicou. Consequência desejada: mensagem nova de
  entrada devolve a conversa para 🔴 sozinha (a âncora deixa de casar), sem job de limpeza, sem
  migração de estado e sem risco de "lido fantasma". A alternativa — uma coluna `status` mantida por
  gravação a cada evento — foi recusada: exigiria escrever em hot path de recepção, criaria
  divergência quando um evento falha e ressuscitaria o problema clássico do contador de não-lidas.
- **Evidência (EP):** `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts:836`
  (e `wwebjs.engine.ts:1623`) já persistem o `fromMe` do celular com `source='phone'` — o verde
  automático existe sem tocar nas engines. Validado em PostgreSQL 18.6 real (cluster temporário,
  15/09): A=`pending`/B=`answered` com grupo ausente, amarelo → `ignored`, entrada nova → `pending`
  com `pendingInbound: 2`. 8 testes unitários (`triage-status.spec.ts`) + 16 casos e2e
  (`inbox-triage.e2e-spec.ts`).
- **Evidência (DO):** PostgreSQL 18 — `DISTINCT ON` (SELECT, cláusula DISTINCT) para a última
  mensagem por conversa e `LEFT JOIN LATERAL … LIMIT 1` (queries, subconsultas laterais) para última
  entrada/saída, contagem de pendentes e contato sem multiplicar linhas; Prisma 7 `$queryRaw` com
  `Prisma.sql`/`Prisma.join` (parametrização — nada de concatenar string).
- **Escopo fechado com o dono (15/09):** grupo/transmissão/canal fora; histórico só do zero para
  frente; a cor muda **apenas** ao responder ou ao clicar (ler no celular não muda — o WhatsApp não
  entrega leitura de mensagem alheia, `message.ack` só cobre o que NÓS enviamos); resposta pelo
  painel existe mas é opcional; o amarelo não registra autor.
- **Rollback:** remover o `InboxController` + o provider `INBOX_REPOSITORY` e a rota do painel — a
  tabela pode ficar (é aditiva e inerte; forward-only, correção = migration nova). Nada em
  `/api/sessions/:id/messages/*` foi tocado (R0).

## D-020 — 2026-09-25 — Deploy do gateway — premissa da D-014 corrigida: Update Config vazio aplica start-first; stop-first exige configuração explícita (B-004)

- **Decisão:** a premissa da D-014 (a) — "Update Config SEM start-first (default stop-first)" —
  está errada para o Dokploy: deixar o campo vazio **não** dá stop-first. O estado-alvo do gateway
  passa a ser **Update Config e Rollback Config preenchidos explicitamente com
  `"Order": "stop-first"`** (JSON no B-004 e em `deploy-dokploy.md` §2), conferidos com
  `docker service inspect`. Até o dono executar o B-004, vale como fato: **todo deploy do gateway
  sobe o container novo com o antigo vivo** (as mesmas contas conectadas duas vezes por alguns
  segundos). O resto da D-014 (volume, Memory Limit 4GB) não muda; a regra (c) de re-scan é
  tratada na D-021.
- **Evidência (código do Dokploy, fonte primária):** tag `v0.30.2` (commit `8c2d4d5`),
  `packages/server/src/utils/docker/utils.ts:678-685` — sem `rollbackConfigSwarm`, o serviço recebe
  `RollbackConfig {Parallelism:1, Order:"start-first"}`; `:687-696` — sem `updateConfigSwarm`,
  recebe `UpdateConfig {Parallelism:1, Order:"start-first", FailureAction:"rollback"}`. Schema
  aceito: `packages/server/src/db/schema/shared.ts:142-151` (`UpdateConfigSwarmSchema`, `.strict()`,
  `Parallelism` e `Order` obrigatórios). Conferido em 25/09/2026 (achado da análise de 23/09,
  `analise-atualizacoes-2026-09.md` §3).
- **Evidência (produção):** sobreposição de ~15 s entre container antigo e novo registrada no P-043
  (09/09), compatível com start-first. Dokploy registrado como v0.30.2 em 25/08
  (`analise-atualizacoes-2026-09.md` §6). Se o Update Config de produção segue vazio depois da
  migração de 31/08: **não verificado** (pergunta aberta no §14 da análise; a resposta vem com o
  B-004).
- **Custo aceito:** o stop-first perde a rede do start-first (16/08: o container antigo segurou a
  API quando o novo caiu com `Cannot find module 'zod'` — `ESTADO.md`, cadeia do dia 16/08). Por
  isso as guardas de build da P-055 vêm antes ou junto do B-004.
- **Alternativas:** manter start-first (rejeitado — duas conexões Baileys com as mesmas credenciais:
  disputa 440 e dois escritores do auth store; com wwebjs, dois Chromium no mesmo perfil — B-004);
  reescrever a D-014 (rejeitado — log append-only; a D-014 ganha só uma nota apontando para cá).
- **Rollback:** esvaziar Update/Rollback Config no Dokploy e fazer Deploy volta ao `start-first`
  injetado pelo código acima.
- **Consequências:** `deploy-dokploy.md` §2, `agent-whatzapp_api.md` §6B.11 e a nota da P-015
  corrigidos em 25/09 (P-063). O B-004 fecha quando o inspect mostrar `stop-first` nos dois configs
  e o 1º deploy seguinte não registrar 440/"replaced".

## D-021 — 2026-09-25 — Duas engines vivas: Baileys é a frota atual, wwebjs fica pronto para uso sob demanda (substitui a D-012 quanto ao foco)

- **Fato (dono, 23/09/2026):** a frota de produção roda **100% Baileys**; o wwebjs saiu da operação
  por consumo de memória e CPU (fala registrada em `analise-atualizacoes-2026-09.md:14`: _"hoje está
  tudo Baileys, pois o wwebjs consome muita memória e processamento"_). **Data da migração:
  desconhecida** — o último registro de composição é de 31/08 (18 sessões WWEBJS,
  `sessions/ATIVA-2026-08-31-1930-lid-envio-wwebjs.md:9`) e o ESTADO de 23/09 a situa depois de
  15/09; a composição real por `GET /api/sessions` ainda não foi conferida (B-007).
- **Decisão (dono, 25/09/2026, na abertura da sessão `onda0b-mapa-roteiro`):** _"quero as 2 engines
  atualizadas com o melhor funcionamento possível, pois usarei as 2 quando necessário"_. Logo:
  (a) as **duas engines continuam suportadas** e recebem manutenção — o Baileys pelas Ondas 2–3
  (P-047..P-052, P-056..P-058) e o wwebjs pela **Onda 6 (P-059 + P-060), que passa a ser
  obrigatória** e tem prazo: a build fixa `2.3000.1045101284-alpha` sai do catálogo em
  **13/10/2026 07:01 UTC** e as builds de ~17/09 em diante quebram o envio de mídia na 1.34.7 (nota
  de 25/09 no B-002); (b) o foco de estabilidade da frota ATUAL é o Baileys (substitui a D-012 quanto
  ao foco); (c) a parte da D-012 sobre a dependência pinada no tarball `1780711` e a D-013 (patch
  `$1`) seguem válidas até a P-059 definir pin/patch melhores; (d) **remover o wwebjs ou o Chromium
  da imagem está fora de cogitação** enquanto esta decisão valer (a P-061 fica restrita ao A/B de
  leads como informação, sem remoção).
- **Consequências:** o roteiro (`ROTEIRO-ONDAS-2026-09.md`) põe a Onda 6 logo depois da Onda 1 (as
  guardas de build da P-055 protegem o patch do wwebjs e o stop-first do B-004 evita dois Chromium no
  mesmo perfil). A regra (c) da D-014 ("deploy pode custar re-scan do wwebjs") volta a valer para
  qualquer sessão wwebjs que for ligada — deploy com sessão wwebjs real conectada só em janela calma.
- **Alternativas:** Baileys-only com remoção do wwebjs (rejeitado pelo dono em 25/09); manter o foco
  da D-012 no wwebjs (rejeitado — a frota atual e o risco das contas estão no Baileys, §5.1 da análise).

## D-022 — 2026-09-25 — Sinal duro de restrição do WhatsApp: pausar a sessão até o fim informado e alertar (P-048)

- **Decisão (dono, 25/09/2026):** quando o WhatsApp sinalizar restrição real numa sessão — ack de
  erro `463`, `connection.update.reachoutTimeLock` ativo ou `message-capping.update` (rc14) — o
  gateway **suspende os envios de 1º contato da sessão até o horário informado pelo próprio WhatsApp
  (`timeEnforcementEnds`)**, grava o sinal (`recordHardSignal`), emite evento aditivo e alerta; ao
  vencer o prazo, **volta sozinho**. A sessão **não** é travada como `banida` (que exige liberação
  manual) nem fica só em observação.
- **Motivo:** o sinal é a informação mais direta que o WhatsApp dá sobre restrição; ignorá-lo (hoje
  o `recordHardSignal` não tem chamador — P-012) mantém a sessão enviando durante a punição, e travar
  como banida gera trabalho manual para um bloqueio que tem prazo conhecido.
- **Como aplicar:** implementação na etapa E8 do roteiro (P-048), com contrato aditivo
  (`packages/contracts` + `INTEGRACAO.md` no mesmo commit) e sem novos códigos HTTP de erro para o node
  n8n 0.4.1 (que só trata 423): a pausa usa o mecanismo de quarentena/423 já existente do guard-rail
  ou fila interna — a E8 escolhe com base no código e documenta.
- **Registro da E8 (26/09/2026, sem deploy):** a trava temporária foi colocada no
  `SessionManager` para cobrir também mensagens em chat aberto, mídia, reação e encaminhamento;
  campanhas re-agendam sem exigir `/resume`. O estado G5 não vira `banida` e o 423 preserva o
  contrato. A notificação `connection.update.reachoutTimeLock` da rc14 pode fabricar um `Date`
  de agora + 60 s quando o servidor omite o prazo e não revela essa origem. Por isso, mesmo um
  `Date` válido da notificação é pausa provisória (`source: temporary`), preservada inclusive se
  superar 60 s; só a resposta direta de `fetchAccountReachoutTimelock()` confirma
  `timeEnforcementEnds`. Sem qualquer prazo válido, o fallback é 60 s. O RPC tem intervalo mínimo
  de 30 s; seu teto de 3 s limita a espera, não cancela a chamada. Resposta tardia confirma o prazo
  se socket e consulta ainda forem atuais. Um `cycle_end_timestamp` de capping mais curto não
  reduz a pausa provisória persistida. Pode haver alerta provisório seguido de atualização
  confirmada, inclusive com um alerta provisório extra pelo `connection.update` do próprio RPC.
- **Alternativas:** marcar como `banida` (rejeitado pelo dono); só registrar e alertar (rejeitado
  pelo dono).

## D-023 — 2026-09-25 — Advisories de repositório: checagem diária com aceite datado; patch transitivo de segurança entra na onda (P-054)

- **Decisão (etapa E3, dentro do pedido do dono de "checagem periódica de advisories de
  repositório"):** um workflow diário (`.github/workflows/advisories.yml`, `scripts/checar-advisories.mjs`)
  lista os advisories publicados nos repositórios das dependências (o `npm audit` só vê o banco global
  do GitHub) e **falha** quando há advisory que afeta — ou pode afetar — uma versão do lockfile sem
  **aceite** em `scripts/checar-advisories.config.json` (GHSA + pacote + motivo técnico + `revisarAte`).
  Aceite vencido volta a falhar. O undici embutido no Node (usado pelo `fetch`/safe-fetch, fora do
  lockfile) é avaliado na versão do Node **fixado** no `FROM` do Dockerfile do gateway — por isso o
  Dockerfile passa a fixar a versão exata (`node:26.10.0-bookworm-slim`). Troca assumida: com o pin o Node
  de produção não sobe mais sozinho com o cache do build — a checagem também lê as releases da linha
  em `nodejs.org/dist/index.json` e trata release de segurança (`security: true`) mais nova que a
  fixada como pendência (sem aceite: a correção é subir o `FROM`); estágio final sem versão exata =
  exit 2. Infra com versão de produção desconhecida (Traefik, Dokploy, Redis,
  MinIO) fica **reconhecida no instante da leitura** (`reconhecidoEm` 25/09 16:21Z — B-006/B-007) e
  só advisory high/critical publicado ou atualizado depois falha; quando a B-007 trouxer as versões, preencher `producao` e avaliar pelas faixas. Em
  `pull_request` o job é informativo (só erro de consulta quebra).
- **Patches transitivos:** advisory de repositório com correção dentro da faixa já declarada (sem
  major) entra na mesma onda, com o diff do lockfile conferido pacote a pacote — na E3: proxy-addr
  5.1.1, busboy 3.2.2 e fast-uri 4.2.1 (minor; só ajv/fast-json-stringify o usam, sem schema de rota no
  gateway) / 3.1.8.
- **Motivo:** GHSA-9c5c (Nest, high) ficou 8 dias invisível; em 25/09 eram 12 advisories de
  repositório no lockfile, 10 invisíveis ao `npm audit`, um deles critical (proxy-addr).
- **Quem decide aceite:** o dono. Os 7 aceites iniciais (fastify 5.11.3, preso pelo Nest 11 — P-062/E18)
  foram propostos na E3 com a avaliação de exposição de cada um e vencem em 30/11/2026.
- **Alternativas:** só `npm audit` (cego ao caso real de 15/09); checagem semanal (atrasa até 7 dias
  um critical; o custo diário é ~1 min de Actions); falhar em PR (bloquearia trabalho por advisory
  alheio à mudança).

## D-024 — 2026-09-25 — Upload multipart: corpo lido até o fim antes do envio; 2+ arquivos = 413 (P-054)

- **Decisão (etapa E3, critério do dono "upload com 2 arquivos → 4xx"):** `POST …/messages/media`
  consome o multipart inteiro (um único iterador `req.files()`) antes de chamar a engine. 2+ arquivos
  → 413 `{"statusCode":413,"message":"reach files limit"}` e nada é enviado; campos de texto valem em
  qualquer ordem; campo com nome de `Object.prototype` → 400.
- **Motivo:** com `req.file()` a `@fastify/multipart` 10.1.2 responde 201 enviando o 1º arquivo e
  descartando o 2º em silêncio (a 10.1.1 em produção dava 500 e travava a conexão keep-alive seguinte).
  Enviar metade do que o cliente mandou sem avisar é pior que recusar.
- **Contrato:** sai de 500 (produção hoje) para 413 — não quebra cliente que manda 1 arquivo com
  campos de texto simples (parte declarada `application/json` com JSON inválido passa a dar 406 e
  nome reservado 400, antes ignorados); o node
  n8n 0.4.1 usa `media-url`, não esta rota; o dashboard manda 1 arquivo com os campos antes.
  Documentado na `INTEGRACAO.md`.
- **Alternativa:** só o bump (201 com descarte calado) — rejeitada: não atende o critério e esconde
  erro do integrador.

## D-025 — 2026-09-25 — Borda HTTP decide pela rota resolvida; teto do login em contador próprio (P-053)

- **Decisão (etapa E4):** rate-limit, request-log e auditoria deixam de decidir por `req.url` cru
  e passam a usar a **rota resolvida pelo router** (`request.routeOptions.url`, fastify 5.11.3):
  - **login:** `@RouteConfig({ rateLimit: { max: 10, timeWindow: '1 minute' } })` no
    `AuthController.signIn` — o `@fastify/rate-limit` 11.2.0 prende o limitador à rota e usa um
    **store filho próprio** (`index.js:173-179`, `LocalStore.js:79-81`). O login **não divide mais o
    contador com o resto do tráfego do IP**: o polling do painel não bloqueia o login e as
    tentativas de login não gastam os 600/min da API. Força bruta segue limitada a 10/min por IP.
  - **global:** 600/min por IP (`RATE_LIMIT_MAX`), `/health` isento pela rota
    (`allowList: req.routeOptions.url === '/health'`); registro único em `bootstrap/rate-limit.ts`,
    sempre antes das rotas (registrado depois não dá erro e não limita nada — provado).
  - **request-log:** rota carimbada no request cru por um hook `onRequest` no `buildFastifyAdapter`
    (antes do middleware do pino-http); `/health` e `/metrics` silenciosos exceto 5xx/erro (o 503
    do `/health` segue visível). O `autoLogging.ignore` antigo era código morto (o middleware vê
    `req.url` `'/'`).
  - **auditoria:** QUEM é auditado decide pela rota (`startsWith('/api/')` e sem `/messages`); a
    coluna `path` continua o alvo **cru** (sem query, teto de 512) — a tentativa de evasão fica
    visível no painel e as linhas normais não mudam.
- **Motivo:** forma absoluta (`POST http://host/api/auth/login`) e %-encoding (`/api/auth/%6Cogin`,
  `/%61pi/…`) casam a MESMA rota no router e escapavam das decisões por string — 10 de 13 variantes
  medidas furavam o teto do login (caíam nos 600/min) e mutações em `/%61pi/…` saíam da trilha. Com
  a rota resolvida nenhuma variante fura (PoC com socket cru; specs `rate-limit.spec.ts`,
  `audit.interceptor.spec.ts`, `http-logger.spec.ts`, `test/audit.e2e-spec.ts`; smoke do CI contra a
  imagem).
- **Complemento (revisão adversarial, P-071):** alvo em forma absoluta com `?` ou `#` antes do
  caminho (`POST http://h?x=/api/...`) passa a receber **400 na borda** (`rejectAmbiguousAbsoluteForm`,
  antes de qualquer rota): o router do fastify casava a rota da query enquanto o middie/Nest
  resolviam `/` — a mutação rodava sem linha de log e a auditoria gravava só o host. Nenhum
  cliente legítimo manda isso a um servidor de origem.
- **Efeitos colaterais aceitos:** sessão cujo **nome** começa com `messages` passa a ter as
  mutações auditadas (antes escapava por bug); `/health?x`, `HEAD /health` e a forma absoluta do
  `/health` também ficam fora do rate-limit.
- **Contrato:** nenhum campo muda; o 429 já existia (corpo `{statusCode, message}` igual). O node
  n8n 0.4.1 usa `X-Api-Key` e não chama o login.
- **Alternativa:** manter o contador compartilhado e só trocar a string (`max: req =>
req.routeOptions.url === '/api/auth/login' ? 10 : 600`) — rejeitada: carrega o prefixo `/api` fixo
  e mantém o login bloqueável pelo próprio tráfego do IP (20 GETs → login 429, medido).
- **Fora do escopo (registrado):** `trustProxy: true` aceita o `X-Forwarded-For` do cliente se o
  Traefik não o limpar — conferir no B-007; 404 não passa pelo rate-limit (pré-existente; limitar
  exigiria reabrir o aceite do GHSA-p68q, D-023).

## D-026 — 2026-09-25 — Egress: `net.BlockList` com as faixas especiais da IANA e IPv6 só no unicast global (P-065, P-070)

- **Decisão (etapa E4):** `isPrivateAddress` passa a usar `net.BlockList` (Node 26): faixas IPv4
  "não globalmente alcançáveis" do registro da IANA (acrescenta TEST-NET-1/2/3 e `192.88.99.0/24`)
  e, no IPv6, **tudo fora de `2000::/3`** + `2001::/23`, `2001:db8::/32`, `2002::/16` (6to4) e
  `3fff::/20`; `::/8` sem `::ffff:0:0/96` (cobre `::`, `::1`, IPv4-compatível, IPv4-traduzido e
  NAT64). O IPv4-mapeado em qualquer grafia segue as regras IPv4 (doc do Node 26, `net.md`
  "blockList.check": "IPv6 notation for IPv4 addresses works"). As duas rotas de foto por URL
  (grupo e perfil) passam a usar o `safeFetch` (P-070).
- **Motivo:** o URL do WHATWG normaliza `http://[::ffff:127.0.0.1]/` para o host `::ffff:7f00:1`,
  que a regex antiga tratava como público — reproduzido no macOS e no Linux do Docker (o servidor
  local recebia a requisição). As rotas de foto usavam `fetch` cru, sem política nenhuma.
- **Armadilha (não repetir):** regra IPv6 que contenha `::ffff:0:0/96` (ex.: `::/8`, `::/80`) faz a
  BlockList bloquear **todo** IPv4 — o egress inteiro pararia (webhook vai direto para a
  dead-letter). O texto original da P-065 sugeria essa faixa; corrigido. O spec tem guarda.
- **Risco aceito:** um host com AAAA em `2002::/16` (6to4 unicast, raríssimo) ou DNS64 no
  resolvedor do container passa a ser recusado por inteiro (a entrega recusa se QUALQUER endereço
  resolvido for privado). `64:ff9b::/96` já era bloqueado antes. Host interno legítimo →
  `EGRESS_ALLOW_HOSTS`.
- **Limite que continua:** rebinding de DNS entre a validação e a conexão (documentado no
  `safe-fetch.ts`).

## D-027 — 2026-09-25 — Deploy manual no Dokploy (auto-deploy desligado nos dois apps, "por enquanto")

- **Decisão (do dono, informada no chat da E4 em 25/09, antes do merge da Onda 1):** primeiro o
  toggle **Auto Deploy do app `gateway`** foi desligado; em seguida o dono informou "desativei tudo
  que era automático por enquanto" — o **dashboard** também. Merge/push na `main` **não publica
  nada**; cada app entra em produção quando o dono clica **Deploy** no Dokploy. Os workflows do
  GitHub (CI e `advisories.yml`) seguem ativos (`gh workflow list`, 25/09). Os Watch Paths ficam
  sem efeito enquanto o auto-deploy estiver desligado.
- **Efeito prático:** o dono escolhe a janela de cada deploy (o do gateway pesa mais) (sem campanha rodando,
  ninguém pareando) — importante enquanto o start-first abre as contas duas vezes (D-020, até o
  B-004). Merge de código sem o Deploy deixa a `main` à frente da produção: registrar no
  ESTADO ("Divergência dev × produção") até o Deploy; o `/health` com uptime antigo denuncia.
- **Ajustados:** `CLAUDE.md` (stack/deploy), roteiro (decisão 1), `how-to/deploy-a-onda1.md` (passo
  0 = Deploy manual), `how-to/rollback-gateway.md` (opção B), `how-to/dokploy-watch-paths.md`.
- **Não verificado pelo chat:** o estado do toggle no painel (ação e leitura do dono — R0).

## D-028 — 2026-09-25 — Reação não é mensagem: sai do evento `message`, mora em `wa_message_reactions` e conta no reply-rate no mesmo deploy (P-066)

- **Decisão (do dono — recomendação do roteiro aceita na mensagem da E22):** a reação deixa de ser
  gravada/emitida como mensagem (`message` tipo `other`, texto null) e passa a existir **só** como o
  evento `message.reaction` (que já existia desde a W6), gravada numa tabela própria
  `wa_message_reactions` (uma linha por sessão + mensagem-alvo + quem reagiu; trocar o emoji
  substitui; remover vira **lápide** `emoji = ''`, que guarda o horário para uma reação antiga
  reprocessada fora de ordem não ressuscitar). O reply-rate (G4) conta a reação do contato como
  resposta **no mesmo deploy** — com `GUARDRAIL_ENFORCE=true` em produção, tirar a reação das
  mensagens sem isso derrubaria o reply-rate e poderia pôr sessão em quarentena falsa (antes ela
  contava justamente por ser gravada como `other`).
- **Reply-rate (casamentos, sempre em até 72 h do cold):** (a) reação ao PRÓPRIO cold, pelo keyId
  (imune a `@lid` × telefone e ao relógio de quem reagiu); (b) reação no mesmo chat depois do cold;
  (c) reação a outra mensagem daquele chat enviada depois do cold (pega o `@lid` não resolvido).
  Teto: se a linha nasceu depois do cold, `LEAST(timestamp, createdAt)` (reação feita nas 72 h e
  removida depois continua contando); se nasceu antes (reação a mensagem antiga, ramo b), o horário
  da última mudança (mexer numa reação velha semanas depois não conta). Resíduo aceito: reação
  antiga trocada dentro das 72 h e de novo fora delas não conta (a linha guarda só criação e última
  mudança).
  Lápide conta (o contato viu e interagiu — era assim com `other`). PoC com Postgres 18 local:
  todos os ramos usam índice (sem índice novo).
- **Escolhas técnicas da etapa (sem pergunta ao dono, registradas aqui):**
  - **Tipos novos no lugar de `other`** (as duas engines, mesmo texto): `location` (nome — endereço
    - link do mapa com as coordenadas), `contact` (nome — telefones do vCard), `poll` (pergunta +
      "• opção"), `event` (nome + descrição), `group_invite` (grupo + legenda). Produto, pedido,
      pagamento, chamada agendada e convite de canal seguem `other`, agora com um resumo legível em
      `text` quando houver. Respostas de botão/lista/fluxo viram `text` (o que o contato tocou). Vídeo
      redondo = `video`; figurinha animada (lottie) = `sticker`. `other` com texto null fica só para
      tipo visível ainda desconhecido.
  - **Ignorados (não são mensagem no chat do WhatsApp Web):** reação (inclusive cifrada), resposta a
    evento, fixar/manter, álbum-mãe (cada foto chega como mensagem própria), protocolo/chaves,
    menções de status, editadas/apagadas (continuam fora — P-069); no wwebjs também notificações de
    sistema, ligação (`call_log`) e apagada (`revoked`).
  - **Voto em enquete (Baileys):** o do CONTATO continua sendo mensagem, com tipo próprio
    `poll_vote` (texto null — o voto é cifrado e a rc14 não decifra), para seguir contando no
    reply-rate como hoje (ignorá-lo derrubaria o reply-rate de campanha com enquete); o NOSSO voto
    pelo celular é ignorado (não é handoff). No wwebjs o voto nunca foi mensagem (`vote_update`).
    Alternativa descartada por ora: ignorar o voto e contá-lo por outra via (exige guardar o voto).
  - **Selo "Encaminhada":** `wa_messages.isForwarded` + `forwardingScore` (Baileys:
    `<tipo>.contextInfo`; wwebjs: `msg.isForwarded/forwardingScore`), limitado ao `integer`.
    "Encaminhada com frequência" = `forwardingScore ≥ 5` — **inferência**: a FAQ oficial
    (faq.whatsapp.com/1053543185312573) diz "forwarded through a chain of five or more chats" e que
    há um contador; não nomeia o campo.
  - **Remetente da reação em grupo (Baileys) corrigido:** vinha do autor da mensagem-ALVO
    (`key.participant`); agora é quem reagiu (`reaction.key.participant`, com o telefone do
    `participantAlt` quando vier). Em 1:1 saía `""`. `chatJid` da reação passa pela mesma
    normalização `@lid` → telefone das mensagens, e o merge LID→telefone também reescreve as reações.
- **Deixam de contar como resposta** (antes eram gravados como `other`; raros, achado da revisão
  adversarial): fixar/manter, resposta a evento, pedido de telefone, placeholder (Baileys) e ligação
  `call_log` (wwebjs). Menção em status e notificações de sistema do wwebjs, que contavam por
  engano, também saem. Não há queda brusca no deploy: as linhas `other` antigas seguem na janela de
  7 dias. **Rollback do deploy G** com enforce: as reações da janela deixam de contar na imagem
  antiga — cuidados em `how-to/rollback-gateway.md` §2.
- **Remetente da reação (Baileys) — `*Alt` nos dois sentidos:** o `participantAlt`/`remoteJidAlt` é
  o mesmo endereço no OUTRO formato (telefone quando a mensagem veio por LID; `@lid` quando veio por
  telefone — `Utils/decode-wa-message.js:73-92`); vence o lado que for telefone, e o par vindo numa
  reação alheia é aprendido (a mesma pessoa não vira duas linhas em grupo). Resíduo: grupo endereçado
  por LID sem telefone no stanza e par ainda desconhecido → o `senderKey` pode trocar de `@lid` para
  telefone depois (a mesma pessoa vira 2 linhas até a retenção).
- **Efeitos para o integrador (n8n) — ver INTEGRACAO §3:** quem assina só `message` deixa de
  receber reação (assinar `message.reaction` ou `*`; o painel agora oferece os dois); reação do dono
  pelo celular **não pausa mais a IA** (não sai como `message` `source=phone`); reação não devolve a
  conversa para 🔴 na caixa única; fluxos que filtram `type === 'other'` ou `text == null` param de
  ver reação/localização/contato/enquete como "outro"; a IA passa a receber texto em
  localização/contato/enquete.
- **Não verificado:** quanto do `other` em produção é reação (SQL do diagnóstico §3); se o wwebjs
  emite `message_reaction` com emoji vazio na remoção; formato real da chave-alvo da reação no
  wwebjs na build de produção (o mapeamento novo aceita `_serialized`, `$1` e `remote` como Wid).

## D-029 — 2026-09-25 — Painel fiel ao WhatsApp Web: mídia só pelo gateway como blob, tiques só exibição, e `senderJid` de grupo = participante (P-067, P-072, P-074)

- **Decisão do dono (abertura da E23):** a P-074 entra na etapa — em mensagem RECEBIDA em grupo,
  `senderJid` passa a ser o participante (nas 2 engines). Muda o VALOR de um campo existente do
  webhook `message` sem `/api/v1`: o valor antigo era o jid do grupo, idêntico ao `chatJid` (sem
  informação); 1:1, `fromMe` e linhas já gravadas não mudam. Risco documentado na INTEGRACAO §3.2
  item 9 (fluxo que respondia para `senderJid` em grupo passaria a mandar no privado) — a skill do
  nó n8n responde para `chatJid`.
- **Escolhas técnicas da etapa (sem pergunta ao dono, registradas aqui):**
  - **P-074 no Baileys:** lado telefone primeiro (`phoneFirst(participant, participantAlt)`), como
    a reação da E22 — a fórmula escrita na pendência (`participantAlt ?? participant`) devolve o
    `@lid` no modo PN do rc14 (`Utils/decode-wa-message.js`). Par LID↔telefone novo (ou pushName
    novo) vai para o diretório de contatos. **No wwebjs:** `@lid` do autor → telefone SÓ pelo cache
    em memória; resolver na hora = `page.evaluate` + consulta de existência na rede por autor
    desconhecido (padrão contact-check, proibido).
  - **`senderName` aditivo** no `GET /messages`/`/search` (agenda > pushName, uma consulta ao
    diretório por página; falha = sem nome). Não vai no webhook (o n8n não precisa e o payload fica
    igual).
  - **Mídia no painel só pelo `GET /:msgId/media`, como blob** (cookie + silent refresh), em cache
    por mensagem — nunca pela `mediaUrl` pré-assinada (muda a cada leitura e o `<img>` de outra
    origem é barrado pelo CORP `same-origin` do helmet, que fica como está). A `mediaUrl` segue no
    contrato para a API/n8n. O blob mora na origem do painel: documento, SVG e mimetype composto ou
    malformado viram `application/octet-stream` (só baixam, nunca executam), e o painel nunca abre um
    `blob:` em aba.
  - **Tiques:** só em `fromMe`; nenhum em grupo/transmissão/canal nas duas engines (o Baileys nunca
    grava ACK de grupo e o "lida" de grupo do WhatsApp é "todos leram" — o wwebjs grava algo com
    semântica não verificada); status null ou desconhecido = sem tique e sem relógio. O painel nunca
    manda recibo de leitura.
  - **Tempo real no Atendimento:** casar ACK/reação por `(sessionId, keyId)`; memória de ACK e de
    reação reaplicada sobre cada recarga (o GET que saiu antes do evento não o desfaz; o replay de
    reação só vale para GET que saiu até 2 s depois do evento, para não ressuscitar reação removida
    enquanto o SSE esteve fora); SSE recriado depois de fechar de vez, com `GET /api/auth/me` antes
    (o EventSource não passa pelo silent refresh).
  - **`Content-Disposition` do `/media`:** nome que o Node aceita e sem `%` `\` `;` `=` → header
    idêntico ao de antes (zero mudança para o n8n); o resto → `filename` ASCII + `filename*` UTF-8
    (RFC 5987). Antes, nome fora do Latin-1 dava 500 (P-076). O `Content-Type` usa o mimetype só se
    ele cabe num header (vem do remetente); senão, o tipo do objeto no S3 ou `application/octet-stream`.
  - **Balão de saída `emerald-800`** (o verde-escuro do WhatsApp Web; texto 7,6:1): o `emerald-600`
    anterior reprovava o WCAG (3,67:1 no texto, 1,68:1 no tique azul). Consequência: o balão deixa
    de seguir a cor de marca do cliente (o branding sobrescreve só `emerald-400..700`).
  - **Testes no painel:** vitest 4.1.11 (já instalado — devDependency declarada, lockfile +1 linha)
    em ambiente node só para `src/lib/*`; os specs importam o `message-content.ts` e o
    `reaction-key.ts` REAIS do gateway por import dinâmico (contrato ida e volta sem pôr arquivos do
    gateway no `tsc` do painel); passo próprio no CI.
- **Deploy:** tudo sobe no deploy G (fim da Onda 8). O painel tem defaults para campos que um
  gateway antigo não manda (deploy manual dos dois apps — D-027).

## D-030 — 2026-09-26 — Encaminhar fiel ao WhatsApp Web: limites do dono, lote idempotente, cold derivado do servidor e a original das recebidas guardada (P-068 parte API, P-077)

- **Decisão do dono (abertura da E24):** limites confirmados como no roteiro — até **5 destinos**
  por pedido; **só 1** quando a original já é "encaminhada com frequência" (`forwardingScore ≥ 5`,
  lido da ORIGINAL — a análise §4 dizia "se a cópia ficar ≥ 5", o que numa recebida é original ≥ 4;
  vale a regra do dono); **só a MESMA sessão**; **destino sem conversa = cold com a trava 423**;
  `idempotencyKey` por destino. **P-077 entra na E24** (ecos de localização/enquete da API com o
  texto completo — muda o `text` do webhook desses ecos).
- **Escolhas técnicas da etapa (sem pergunta ao dono, registradas aqui):**
  - **Rota aditiva** `POST /api/sessions/:s/messages/:msgId/forward` `{to[], cold?, idempotencyKey?}`
    → 201 `{results[]}` (uma posição por destino). O laço mora em `messaging/application/
forward.service.ts` (o `sendWithIntent` é do controller e `sessions` não pode importar
    `messaging/domain`); o `SessionManager` só transporta: `prepareForward(sessionId, src)` →
    `IEngine.prepareForward` carrega/confere a original UMA vez e devolve `send(to, opts)` por
    destino (o "SessionManager.forwardMessage pelo sendWithIntent" do roteiro virou esse par — a
    semântica do sendWithIntent é reproduzida por destino: dedup legado → reserva → gate → envio →
    complete/fail).
  - **Ordem — tudo o que recusa vem antes de enviar:** destino canônico/repetido (inclusive o 9º
    dígito)/proibido (`@newsletter`, `@broadcast`, bots) → 400; original da sessão → 404;
    apagada/editada/tipo não encaminhável → 400 `FORWARD_UNSUPPORTED` (antes do gate: nunca 423 por
    um tipo proibido); limite → 400 `FORWARD_LIMIT`; reserva do LOTE e de cada destino; a engine
    confere o tipo vivo/visualização única/disponibilidade → 400 `FORWARD_UNSUPPORTED`/
    `FORWARD_SOURCE_UNAVAILABLE`; **gate cold UMA vez** (1 `send.blocked`) → **423 no lote inteiro,
    nada sai** (mandar parte e responder 423 faria o n8n re-enfileirar e duplicar os já enviados
    quando não há chave). Status: algum ok → 201; nenhum → o status comum dos itens (409/400) ou 400
    `FORWARD_FAILED`, sempre com `results[]`. 400 com `code` (não 422 — o gateway nunca usou 422 e o
    node 0.4.1 trata 400 genérico).
  - **Idempotência do lote:** a `idempotencyKey` reserva o PEDIDO (fingerprint plano = keyId da
    original + destinos canônicos ordenados): a mesma chave com outra original ou outro conjunto →
    409 (sem isso, `[A,B]` e depois `[A,C]` com a mesma chave mandava C — quebrava o 409 do
    contrato). Cada destino usa `<chave>:<destino canônico>` (vai no eco/webhook e em
    `results[].idempotencyKey`); o `:` é seguro (chave de intenção nunca vira jobId de BullMQ).
    Replay antes do gate (retry de lote já enviado em quarentena = 201 `deduped`, como no `/text`).
  - **Cold derivado do servidor (só no encaminhar):** "tem conversa" = existe mensagem RECEBIDA
    (`fromMe=false`) daquele chat na sessão, **no número EXATO** (os dois sufixos
    `@s.whatsapp.net`/`@c.us`); o cliente só SOBE o cold (`cold:false` não rebaixa). "Qualquer linha"
    deixaria um envio anterior sem `cold` escapar da trava para sempre. **Sem o 9º dígito** (achado da
    revisão): o "gêmeo" (celular 11 9 4123-4567 × fixo 11 4123-4567) pode ser OUTRA pessoa — casar
    com a conversa dele trataria o destino como quente (sem a trava) e mandaria para o número errado.
    O transporte é SEMPRE o número pedido (o resíduo do 9º dígito fica igual ao do `/text`, P-023).
    Conservador: conversa gravada só como `@lid` sem par conhecido, só na variante do 9º dígito, ou
    mais velha que a retenção (90 d), conta como cold. O `/text` NÃO muda (R0). Apagada/editada é
    recusada DEPOIS do replay (a repetição de um lote já entregue segue 201 `deduped`). Erro
    inesperado depois de reservar (banco, guard-rail) → as intenções viram `failed` (sem 409 falso
    de 2 min no retry).
  - **Um destino por vez, 1–3 s** entre envios EFETIVOS (também entre pedidos da mesma sessão —
    mutex por sessão no processo); sem "digitando" (o encaminhar do WhatsApp Web não mostra).
  - **Baileys — a original completa passa a ser guardada também nas RECEBIDAS** (`wa_messages.raw`,
    mesma retenção `RETENTION_MESSAGE_RAW_DAYS` = 7 d, sem env nova; webhook, SSE e agora o fan-out do
    Redis a removem). Encaminha só o **nó de conteúdo** (`{[ctype]: nó}`): o
    `generateForwardMessageContent` da rc14 escolhe o nó por `Object.keys(content)[0]`
    (`Utils/messages.js:246`) e, com `messageContextInfo`/SKDM de grupo na frente, perdia o selo e
    VAZAVA a citação/menções da original (provado offline). Visualização única só se prova pelo
    invólucro do `raw` → recusada (o `forward` a mandaria como mídia permanente). Sem `raw`: texto
    remonta fiel (só a prévia de link se perde — o gateway nunca gerou prévia); mídia, localização e
    contato antigos → `FORWARD_SOURCE_UNAVAILABLE` (encaminhar mídia antiga pelo S3 = P-080). O eco
    descreve o que saiu (`describeBaileysMessage(sent.message)`) e reaproveita o objeto S3 da
    original. `decodeProto` passa pelo `proto.Message.fromObject` (sem ele, enum ≠ 0 virava 0 — vale
    também para o retry de descriptografia).
  - **Apagada/editada:** o Baileys marca `wa_messages.revokedAt`/`editedAt` (migration aditiva
    `20260926052719_encaminhar_marcas_apagada_editada`) a partir do `messages.update` (REVOKE/EDIT),
    só do MESMO lado (`fromMe` da chave — a lib não confere o autor) e sem engolir um ACK fundido no
    mesmo update pelo event-buffer; o wwebjs confere na Message viva. As duas são recusadas — **editada também**, até a P-069: o
    painel ainda mostra a versão velha e, no Baileys, a original guardada é a velha. Resíduo: marca
    que chega antes do INSERT (mídia recebida há segundos) se perde; apagada/editada antes do deploy
    não tem marca — e sem a original (antes do deploy ou passados os 7 dias), um TEXTO apagado/editado
    antes do deploy, uma resposta de botão/lista ou uma mensagem de empresa (gravadas como `text`)
    ainda sai pelo fallback de texto (documentado na INTEGRACAO §2; marca própria na linha = P-082). Mensagem
    temporária já vencida (`contextInfo.expiration`) também é recusada (a cópia chegaria
    permanente); mensagem de empresa com botões/modelo é recusada antes do `extractMessageContent`
    (que a transformaria em texto comum).
  - **wwebjs — caminho nativo** (`Message.forward` → `WAWebChatForwardMessage.forwardMessages`):
    selo/contador calculados pela Meta. A lib devolve `Promise<void>` → o eco é **correlacionado**
    (destino + tipo, registrado ANTES do forward, casado no `message_create` antes da janela de 3 s)
    e sai `source:'api'` com o cold/chave do destino (antes viraria `phone` = handoff falso e sumiria
    do reply-rate); não exige `isForwarded` (a própria mensagem encaminhada sai sem selo). Casa
    também pelo `@lid` que o cache LOCAL liga ao destino (o `getChat` pode cair no chat @lid) e, quando
    a original tem texto/legenda, só com o MESMO texto (senão o eco de um `/text` no mesmo chat, ainda
    sem id, era tomado como o do encaminhar — achado do teste). Mídia da cópia: o objeto S3 da
    original; sem binário na original, baixa o da cópia pelo caminho normal. O op do
    `withLidFallback` devolve o destino (o `undefined` do forward fazia o fallback reenviar pelo PN —
    encaminhar 2×). Sem eco em 10 s → `ok` com `id: null`/`confirmed:false` (intenção `sent` — um
    retry não pode reencaminhar), sem inventar selo, e a expectativa vive só mais 20 s (até 60 s
    só no teto do forward, quando ele ainda pode sair). Teto de 30 s no forward (sem ele, 240 s
    do protocolTimeout). A análise §4 dizia "destino precisa ser chat existente" — o `getChat` da lib
    CRIA o chat (`Utils.js:878-887`); corrigido lá.
  - **`\u0000` e surrogate solto:** texto, nome de arquivo, mimetype e o `raw` perdem o NUL e têm o
    surrogate UTF-16 solto trocado por U+FFFD (`toWellFormed`) na gravação (PG18: `text` e `jsonb`
    recusam NUL; o `jsonb` recusa o surrogate solto — texto com UTF-8 malformado, ex. emoji cortado
    por bot, derrubava o INSERT com o `raw` das recebidas; o NUL no `text` era pré-existente). As
    listagens (`GET /messages`, `/search`, `findByRef`) deixam o `raw` de fora (`omit`).
- **Não verificado (teste com chip do dono — `how-to/teste-chip-encaminhar.md`):** selo
  "Encaminhada"/"com frequência" no aparelho do destinatário nas duas engines; se o
  `forwardMessages` do WhatsApp Web aceita destino SEM conversa (a JSDoc da lib diz que falha; o
  código cria o chat); se o `forwardMessages` do WhatsApp Web gera `message_create` e com
  que `to`/tipo; mídia com mais de ~30 dias no CDN; `rawData.isViewOnce`/`isLive` no wwebjs; limite
  real de destinos do servidor; timeout do Traefik/n8n para um pedido de ~10–20 s.

## D-031 — 2026-09-26 — Encaminhar no painel fiel ao WhatsApp Web: 1 mensagem por vez, contatos e grupos, e nenhum caminho que reenvie para quem já recebeu (P-068 parte interface)

- **Decisões do dono (abertura da E25):** o modo seleção marca **só 1 mensagem** por encaminhamento
  (clicar noutra troca a marcada; o WhatsApp Web deixa várias — diferença consciente: 1 pedido = no
  máximo 5 envios, o mesmo risco anti-ban da D-030); destinos = **contatos e grupos** da mesma
  sessão (o diálogo lê `GET …/messages/conversations` da sessão — a caixa única do Atendimento não
  lista grupos).
- **Fidelidade (textos e regras lidos na FAQ oficial e no código do web.whatsapp.com em 26/09):**
  menu ⌄ → "Encaminhar" → modo seleção ("Cancelar encaminhamento", "1 selecionada") → "Encaminhar
  mensagem para", "Pesquisar nome ou número", "Conversas recentes", ➤ "Enviar", atalho "Encaminhar
  mídia" (foto, vídeo, documento, localização e contato — **não** em áudio, porque o banco não
  distingue nota de voz, nem em figurinha nem em "com frequência"), limites com os textos do
  WhatsApp ("Você só pode compartilhar com até 5 conversas.", "As mensagens encaminhadas com
  frequência podem ser compartilhadas com apenas 1 conversa por vez."), aviso "Esta mensagem será
  marcada como encaminhada com frequência." (terceiro com contador 4) e sucesso "Você encaminhou 1
  item" (+ os destinos). **O painel aplica a regra oficial "mensagem já encaminhada → só 1 grupo"**
  (FAQ 887468535575482), que a API da E24 não tem — mais restritivo só na interface; levar para a API
  é decisão do dono (P-085).
- **Idempotência por clique (`lib/forward.ts` `planAttempt`):** a chave (`painel-fwd-<uuid>`) nasce no
  clique do ➤; repetir o MESMO conjunto reaproveita a chave (o gateway faz replay do que saiu);
  conjunto diferente → chave nova. Regras que fecham os caminhos de duplicação (achados da revisão
  adversarial): (1) destino que saiu, saiu sem confirmação (`confirmed:false`) ou **pode ter saído**
  (tempo esgotado — "confira no celular", ou destino "em andamento" dentro de `results[]`) fica
  **travado** e nunca entra noutro pedido — nem repetindo a mesma chave (o gateway retomaria a
  intenção `failed` de quem estourou o tempo); (2) desfecho **incerto sem `results[]`** (sem resposta,
  5xx, 409 "em andamento" do pedido) **congela** o pedido — o único próximo passo é repeti-lo igual, e
  ele só descongela com uma resposta que traga `results[]` (429/401/403 não dizem nada do pedido
  anterior; se o gateway passar a recusar a mensagem ou limitar a 1, vira recusa e o operador confere
  no celular); (3) fechar e reabrir o diálogo da mesma mensagem **retoma** o estado — memória **por
  aba** (`lib/forward-memory.ts`, `sessionStorage`, 24 h, 50 mensagens): sobrevive a troca de
  conversa/tela, recarga e login expirado; o pedido é gravado como congelado ANTES da resposta e o
  desfecho é gravado mesmo com a tela já fechada (sucesso não visto fica guardado — o próximo
  diálogo mostra quem recebeu, travado); (4) um encaminhamento por vez por conversa (↪ com um em
  voo avisa em vez de ignorar); (5) o 409 de **conflito** de chave pede chave nova no próximo clique.
- **404 de rota ausente** (painel novo antes do gateway novo, ou rollback só do gateway): texto
  "Este servidor ainda não tem o encaminhar…", sem travar nem gravar recusa — depois do deploy do
  gateway o mesmo pedido funciona.
- **Recusas:** da MENSAGEM (apagada, tipo, original indisponível, 404 "Mensagem não encontrada") → o
  ➤ trava e o texto manda encaminhar pelo celular; `FORWARD_LIMIT` pelo contador vivo → o diálogo
  passa a 1 conversa; 423 → "Nada foi enviado", com o estado do guard-rail do corpo e quantos
  destinos são 1º contato (tirá-los libera o resto); aparelho desconectado → ➤ travado com o motivo.
  O painel nunca manda `cold` (o gateway deriva).
- **`<dialog>` modal nativo:** Esc e clique fora fecham (o `closedby` não existe no Safari estável —
  clique fora é nosso); com o pedido em voo o Esc é barrado, mas o Chrome fecha à força num Esc
  repetido — o pedido continua e, no fim, o diálogo reabre com o resultado se algo falhou (tudo
  certo → só o aviso na conversa). Foco: busca ao abrir, ↪ da barra ao entrar na seleção, caixa de
  resposta ao sair; regiões `role=status` sempre montadas.
- **`ApiError` ganha `code` e `body`** (aditivo — quem só lia `status`/`message` segue igual): o painel
  passa a ler o `code` e o `results[]` dos corpos de erro.
- **Não verificado (chip do dono — `how-to/teste-chip-encaminhar.md` §4):** comportamento no Safari;
  selo "com frequência" no aparelho quando a cópia sai com contador 5 pelo Baileys (soma sem teto —
  P-085); o eco do WWEBJS no painel.

## D-032 — 2026-09-26 — wwebjs: build candidata isolável por sessão e estados terminais sem reconexão automática (P-059)

- **Contexto:** a build global antes validada, `2.3000.1045101284-alpha`, sai do catálogo em 13/10; a candidata `2.3000.1046934385-alpha` consta até 07/11, mas não foi testada com chip. A versão npm 1.34.7 continua a última; o PR upstream [#201923](https://github.com/wwebjs/whatsapp-web.js/pull/201923) corrige a colisão de `__x_id` ao enviar mídia, ainda sem release. O PR [#201930](https://github.com/wwebjs/whatsapp-web.js/pull/201930) documenta traversal no cache local.
- **Decisão:** manter o default validado `2.3000.1045101284-alpha` até o canário real; a candidata é configurável em `session_config.wwebjsWebVersion` (PATCH/GET `/api/sessions/:id/config`) só na sessão, no próximo start. `WWEBJS_WEB_VERSION` continua prevalecendo globalmente quando não há override. O campo nullable permite canário e retorno ao modo global sem reiniciar outra conta. Logs após `ready` registram versão pedida e efetiva e versão/caminho do Chromium; divergência é WARN. Promover a candidata exige decisão após o teste com chip, antes da expiração estimada de 13/10.
- **Falha terminal:** LOGOUT, UNPAIRED, UNPAIRED_IDLE e CONFLICT param em STOPPED; TOS_BLOCK e SMB_TOS_BLOCK param em FAILED, sempre com código bruto. A reconexão automática só vale para quedas transitórias. Código de pareamento e heal têm teto; start manual zera contadores. Isso evita QR/reload em loop numa conta que exige intervenção.
- **Patch:** manter tarball pinado `1780711` e estender o patch versionado com `__x_id`, WID `$1`, fallback de MsgKey e validação do cache. `patch-package --error-on-fail` e o guard do Docker/CI exigem o patch no build.
- **Efeito de deploy:** uma migration aditiva cria a coluna nullable; gateway muda no deploy W (junto da E6), que o dono fará em janela própria. O pedido do dono nesta sessão é **não fazer deploy agora**, pois isso derruba contas conectadas. Canário, promoção da env e B-001 ficam para a operação posterior do dono, descrita em `how-to/canario-wwebjs-onda6.md`.

## D-033 — 2026-09-26 — wwebjs: mídia de grupo por opt-in e limite de 24 MB no envio (P-060)

- **Motivo:** a análise local de 23/09 mediu picos de ~200 MB no renderer ao baixar 24 MB pela API base64 e crash ao enviar 64 MB. O pin instalado `whatsapp-web.js@1.34.7` (tarball `1780711`) já contém `Message.downloadMediaStream({chunkSize})`; a [fonte oficial](https://github.com/wwebjs/whatsapp-web.js/blob/main/src/structures/Message.js) documenta o retorno `stream` e metadados.
- **Decisão:** mídia recebida 1:1 usa stream em blocos de 2 MB; grupo só baixa se `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA=true` (default `false`). O webhook de grupo continua com a mensagem e metadados, sem `mediaKey`; `GET /media` retorna 404. O envio WWEBJS recusa acima de 24 MB com 400, antes do CDP. Fila de mídia é por sessão; download recebido que expirou na espera não começa depois e, se o CDP concluir tardiamente, não inicia gravação no S3. Se 120 s de espera pelo envio expiram, a intenção com chave fica pendente até a operação real concluir ou falhar, para a repetição não enviar duas vezes.
- **Perfil:** JSHeap pela API `Page.metrics`, IndexedDB por [`Storage.getUsageAndQuota`](https://chromedevtools.github.io/devtools-protocol/tot/Storage/) e PSS da árvore Chromium via `/proc/*/smaps_rollup` são logados por sessão após ready e a cada 5 min. Sem `/proc`, PSS aparece `null`. PID só é usado para encerrar a árvore pertencente àquele Client se `destroy()` falha ou expira. Flags novas tiram `--max-semi-space-size=64`, desabilitam `SpareRendererForSitePerProcess` e retiram `--disable-software-rasterizer` (vídeo exige canário).
- **Limite da prova:** medição em `about:blank` no macOS, sem conta: somatório de RSS da árvore 739.622.912 → 651.640.832 bytes; JSHeap 1.073.432 bytes nos dois; IndexedDB zero; PSS indisponível. Soma de RSS conta páginas compartilhadas mais de uma vez e a página sem login não representa WA conectado. O runbook pede comparação real no único chip de teste após deploy W.

## D-034 — 2026-09-26 — Download Baileys usa dispatcher privado por mídia e não acessa CDN diretamente com SOCKS (P-050/P-075)

- **Contexto:** na rc14 instalada, `downloadMediaMessage` chega ao `fetch` com `options.dispatcher`; `fetchAgent` só atende ao upload. A CDN devolve `Boom.output.statusCode` em 404/410, enquanto o reupload automático verifica `.status`. A [fonte oficial da rc14](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages-media.ts) e a [documentação do Undici 8.10.2](https://github.com/nodejs/undici/blob/v8.10.2/docs/docs/api/ProxyAgent.md) foram conferidas antes do código. O Node 26.10.0 do Dockerfile incorpora Undici 8.10.2, mas não expõe `ProxyAgent` como módulo importável sem dependência direta.
- **Decisão:** selecionar o proxy uma vez por conexão; usar o Agent Node para WebSocket/upload e criar um Dispatcher Undici 8.10.2 por mídia para o fetch da CDN em HTTP/HTTPS. Destruir esse dispatcher ao concluir ou expirar para interromper o stream sem afetar outro download da sessão. A espera total é 90 s, com até 20 s para reupload dentro dela. Se o proxy escolhido for SOCKS4/5, publicar só metadados, sem fetch direto pelo IP do servidor, até comprovar o caminho completo no canário. O payload público e a opcionalidade de `mediaKey` permanecem.
- **Alternativas:** reaproveitar o `http.Agent` como `dispatcher` (interfaces incompatíveis); chamar o resolver de novo por mídia (muda o proxy em ROUND_ROBIN/RANDOM); deixar o fetch direto sob SOCKS (exporia o IP do servidor); confiar apenas no `Promise.race` sem destruir o dispatcher (o stream continuaria ativo). Todas rejeitadas.
- **Limite:** o `Promise.race` do reupload devolve metadados no prazo, mas não cancela o listener interno de `sock.updateMediaMessage` da rc14, que pode persistir até resposta/fechamento do socket (P-087). Testes locais com socket/fetch falsos e proxy HTTP local provam a passagem do dispatcher; IP de saída por proxy e comportamento com chip exigem canário posterior do dono, após E12/merge/deploy B.

## D-035 — 2026-09-26 — ACK de não-entrega não é sinal duro: observador WWEBJS opt-in (P-012/P-088)

- **Contexto:** o commit local `19058c0` adicionava varredura de 5 em 5 minutos por padrão e chamava `recordHardSignal(sessionId, 'restriction')` após 5 cold-sends sem entrega em 3 chats. Na `main` atual, esse sinal aplica `banida` sticky com `GUARDRAIL_ENFORCE=true`; a branch lia também Baileys e repetiria o sinal enquanto os mesmos ACKs estivessem nas 24 h. A D-022 e a E8 reservam a ação de restrição ao sinal nativo com prazo.
- **Decisão:** integrar a consulta só como observador WWEBJS desligado por padrão (`UNDELIVERED_SWEEP_MIN=0`). Mesmo se habilitada explicitamente, ela registra WARN e não chama `recordHardSignal`, não emite webhook nem bloqueia. A varredura não se sobrepõe e o timer é limpo no shutdown. Nenhum payload/contrato `/api` muda.
- **Prova e limite:** a [documentação oficial do Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries) confirma `$queryRaw` com template parametrizado; a [documentação do PostgreSQL 18](https://www.postgresql.org/docs/18/datatype-enum.html) descreve comparações de enum. Testes com Postgres local/CI e dados sintéticos conferem o filtro e ausência de mudança de estado. ACK sem entrega continua indício inconclusivo; ativação operacional e eventual alerta requerem P-088.

## D-036 — 2026-09-26 — Patch local mínimo da rc14 usa a correção de stream do #2716 (P-051)

- **Contexto:** `npm ls` confirmou `@whiskeysockets/baileys@7.0.0-rc14`. Antes do patch, a biblioteca real aceitou uma assinatura de 64 bytes adulterada e endereçou como hosted o device comum que veio após um hosted. O JS instalado tem `fetched.pipe(output)` sem propagação do erro da fonte. O PR oficial [#2751](https://github.com/WhiskeySockets/Baileys/pull/2751) corrigiu assinatura e domínio em `develop`; o [#2815](https://github.com/WhiskeySockets/Baileys/pull/2815) foi fechado em 26/09 como duplicado do [#2716](https://github.com/WhiskeySockets/Baileys/pull/2716), ainda aberto.
- **Decisão:** portar somente três correções para o JS compilado via patch-package: retorno de `curve.verifySignature`, domínio derivado por device e `pipeline(fetched, output)` para o corpo da mídia. O `pipeline` cobre o defeito do #2815 e encerra a fonte quando o consumidor cancela. Guardar os três marcadores no build, inclusive na imagem final; `postinstall --error-on-fail` torna incompatibilidade futura fatal. O Dockerfile do painel segue sem patches porque não instala as engines.
- **Prova e limite:** `baileys.patch.spec.ts` usa a rc14 real para assinaturas, devices mistos, decriptação sintética, erro do stream depois dos headers e cancelamento. Nenhum fluxo com conta, QR, mídia ou mensagem real foi executado. O `pipeline` não cancela `waitForMsgMediaUpdate` do reupload (P-087); esse listener depende de patch próprio e teste de fechamento. #2789, #2765 e #2781 continuam condicionados à reprodução com chip/log, após E12 e janela do dono.

## D-037 — 2026-09-27 — Link público de conexão por QR: só Baileys, sessão sem login salvo, número esperado e token no fragmento (P-086)

- **Contexto:** o dono pediu (26/09 e 27/09) um link para enviar a uma pessoa que conecta a sessão de outro lugar — quando a sessão cai ou quando é criada. É exceção deliberada à WA-18 da auditoria 09/2026 (QR entregue só a usuário autenticado). A revisão adversarial do desenho (4 lentes + verificação) confirmou riscos: o "gerar novo QR" apaga credenciais sem guarda (`SessionManager.newQr`), o QR do Baileys fica em memória depois de expirar e depois de lido (backoff/515 só locais), qualquer WhatsApp que ler o QR vira a conta da sessão, o evento WORKING consome o link antes do próximo poll, e o link aberto no mesmo celular não pode ser lido.
- **Decisão:** (1) só sessões **BAILEYS** na v1 (409 `CONNECT_LINK_ENGINE_UNSUPPORTED`; P-092 — contraria a letra da D-021 e fica para o dono validar). (2) criar/revogar só com **login do painel** (OPERATOR+, mesmo papel do new-qr); API key fica para P-093; validade 10 min–72 h, padrão 24 h; um link ativo por sessão (criar outro revoga — `SELECT … FOR UPDATE` em `wa_sessions`). (3) o link **nunca** recupera nem apaga login salvo: criar em sessão com `creds.account` → 409 `CONNECT_LINK_SESSION_PAIRED`; a página só pede QR na fase `IDLE` (Baileys parada e sem `creds.account`), 5 por link com 30 s entre pedidos (CAS no banco); `creds.me` sozinho (pairing pedido e não concluído) não conta como pareada. (4) **número esperado** opcional, com DDI (número BR sem o 55 → 400, porque nunca casaria), pré-preenchido com `lastMeJid` (coluna aditiva — o `meJid` zera no 401): WORKING com outro número revoga o link (`WRONG_NUMBER`) e desfaz a conexão na réplica dona (logout + `STOPPED` com `lastError` + webhook); janela residual: o `session.status WORKING` do número errado e 1–2 s de ingestão. (5) fase pública calculada no servidor pelo estado **vivo** da engine (`liveView`), nunca pelo status do banco; `CONNECTED` por 15 min após o consumo, depois 410 `CONNECT_LINK_USED`; consumo por evento, pela leitura e, como reserva, pela timeline `wa_session_events`. (6) token de 32 bytes, só sha512 no banco, no **fragmento** da URL do painel e em `Authorization: Bearer` no gateway (fora de log, auditoria e `Referer`); sem `wa.me` (o token iria em query a terceiros). (7) lock de ciclo de vida por sessão no `SessionManager` (start/stop/restart/logout/newQr/remove/pairing/rejeição) — o caminho público não espera na fila (409 `CONNECT_LINK_BUSY`); toda operação dentro do lock tem teto (o pedido de código de pareamento ganhou 45 s → 409); stop/logout pelo operador revogam o link antes de parar. A leitura pública numa réplica sem a engine não decide número errado (a réplica dona trata o evento); a reserva pela timeline confere o número pelo `lastMeJid`. (8) CORS `maxAge: 600`; `AuditInterceptor` usa `req.auditActor` (ator `link:<id> (de <quem criou>)`) e só grava `login:` na rota de login. (9) R13: datas da tabela nova em `timestamptz`. (10) R12 (fluxo público): a página cumpre WCAG 2.2 AA no que toca; axe no CI é exceção declarada → P-095.
- **Prova e limite:** versões instaladas conferidas (Nest 11.2.6/`@RouteConfig`, `@fastify/rate-limit` 11.2.0 com store por rota, `@fastify/cors` 11.3.0 `maxAge`, Prisma 7.10.0 `updateMany` condicional/`@db.Timestamptz`, react-router 7.18.3 `useSearchParams`); lib rc14 lida para `creds.account` (`Utils/validate-connection.js`) e o ciclo de QR (`Socket/socket.js`). Não verificado: o fragmento `#` sobreviver ao toque no link dentro do WhatsApp (Android/iOS) e a leitura real do QR — ficam como critério de aceite do dono no canário, com chip; o lock é por processo (a sobreposição start-first é o B-004). Link expirado não para a sessão (P-091, ligada à P-018).

## D-038 — 2026-09-27 — Memória do proxy da sessão apagada: carimbo na atribuição órfã, sugestão sem bloquear (P-084)

- **Contexto:** pedido do dono (26/09): ao apagar uma sessão que usava proxy e recriar com o mesmo nome, sugerir aquele proxy — sem bloquear a escolha de outro. A exclusão apaga a sessão de vez; a linha de `session_proxy_assignments` (sem FK) já ficava órfã, mas sem o nome, e a sessão recriada ganha ULID novo.
- **Decisão:** (1) abordagem A da P-084 — colunas aditivas `releasedSessionName`/`releasedAt` (timestamptz) na própria atribuição; nada de tabela de histórico. (2) Carimbo **depois** de `SessionManager.remove`, no `SessionsController.remove`, com o nome devolvido pelo `ensure`, só para `SINGLE` com `currentProxyId`; `ProxyService.markReleased` nunca lança (a exclusão não depende disso; se falhar, perde-se só a sugestão). Carimbar antes deixaria sessão viva carimbada quando a exclusão falha. (3) As órfãs carimbadas são **registro intencional**: nenhuma retenção/limpeza pode apagá-las (hoje nada apaga a tabela). (4) Busca por igualdade **em minúsculas** via `$queryRaw` (`lower(col) = lower($1)`), só `SINGLE` com proxy e sessões que não existem mais, `LIMIT 20` — o `mode: 'insensitive'` do Prisma 7.10 vira `ILIKE` sem escape e o `_` permitido no nome casaria qualquer caractere (sondado no Postgres local); `pickReleased` em TS é a segunda barreira. Prefere a mesma caixa, depois a exclusão mais recente. O índice simples `(releasedSessionName)` não atende essa busca (seq scan numa tabela de uma linha por sessão que já teve proxy) — fica inócuo; criado sem `CONCURRENTLY` por ser tabela pequena. (5) `PUT /sessions/:id/proxy` numa órfã apaga o carimbo (a memória deixa de ser confiável). (6) Disponibilidade pela mesma régua do `/proxies/available` (D-008) e `inUseBySession` para o aviso. (7) Rota `GET /api/proxies/suggestion` com ADMIN (como criar/apagar sessão); `POST /sessions` não muda (R0). (8) Painel deriva a escolha na renderização (o que se vê é o que se envia), pré-seleciona só sem escolha do dono e segura o Enter até a sugestão responder (teto 1,5 s).
- **Prova e limite:** Prisma 7.10.0 instalado (`$queryRaw` parametrizado; ILIKE do `mode: 'insensitive'` capturado em sonda só-leitura), PostgreSQL 18 (`_` curinga em LIKE/ILIKE). Limites: exclusões anteriores à E26 ou atendidas pelo container antigo no start-first (B-004) não têm nome; trocar para `NONE` antes de apagar perde a memória daquela geração (um carimbo mais antigo do mesmo nome volta a valer, com a data antiga); proxy recriado pelo sync da Webshare ganha id novo e aparece como `REMOVED`.

## D-039 — 2026-09-27 — Lease e fencing de sessão no PostgreSQL (P-056/E13)

- **Decisão:** `wa_sessions` recebe `leaseOwner`, `leaseUntil` e `authEpoch` por migration aditiva. Cada `SessionManager` tem um UUID próprio; `UPDATE … WHERE leaseUntil <= clock_timestamp()` adquire a linha e incrementa o epoch, com TTL de 30 s e renovação a cada 8 s. Reidratação, start e operações de ciclo de vida só abrem engine depois da aquisição. A réplica sem posse espera 5 s para a reidratação; erro transitório de banco espera 30 s. O retry relê `autostart` e o status sob a lease, para não religar `STOPPED`/`FAILED`. Perda de posse descarta a engine e aguarda shutdown confirmado antes de permitir nova posse local.
- **Fencing:** toda leitura/escrita do auth store Baileys e toda escrita de status/diagnóstico bloqueiam a linha com `SELECT … FOR UPDATE`, validam dono, epoch e prazo pelo relógio do banco e só então operam na mesma transação. `keys.set` grava todas as Signal keys de uma chamada num commit; `saveCreds` captura o snapshot no evento e encadeia as gravações. Limpar auth gira o epoch; callbacks antigos são recusados. Envios de mensagem conferem a posse no banco após o gate de guardrail; os demais RPCs também conferem posse antes da chamada. O `FencedLocalAuth` troca o nome do perfil sob lock e remove depois apenas o caminho descartado, inclusive no callback interno `framenavigated`; fechamento inconclusivo do Chromium não libera a lease. Campanha que perde lease libera a reserva para retry, sem marcar o destinatário FAILED.
- **Escolha do árbitro:** o Redis `SET NX PX` coordena posse, mas sozinho não impede um escritor antigo de concluir uma transação SQL depois de perder a chave. A linha e o epoch no PostgreSQL permitem conferir posse e escrever no mesmo lock. Fonte oficial: [PostgreSQL 18, locks de linha](https://www.postgresql.org/docs/18/explicit-locking.html) e [relógio de transação versus relógio real](https://www.postgresql.org/docs/18/functions-datetime.html); [Prisma, transações interativas](https://www.prisma.io/docs/orm/prisma-client/queries/transactions). Código instalado: Baileys 7.0.0-rc14 (`Socket/socket.js`, `Utils/auth-utils.js`), Prisma 7.10.0; `npm view … dist-tags` em 27/09: Baileys rc14 e wwebjs 1.34.7 como latest.
- **Limites operacionais:** o primeiro deploy desta migration/código **ainda exige B-004 `stop-first`**: o container N-1 não conhece a lease e ignora o fencing. Confirmar `UpdateConfig` e `RollbackConfig` por `docker service inspect` antes da implantação; não confiar no merge ou no CI como prova de deploy. **Para WWEBJS, manter stop-first também depois da E13**: o Chromium pode começar a abrir o mesmo perfil após o check de lease se um processo suspenso retomar, e o Postgres não cerca efeitos externos já iniciados. A lease protege escritas no banco e o início normal de engines novas; não cancela RPC/envio ao WhatsApp já iniciado. O `rename` do perfil ocorre sob transação curta; o `rm` do caminho descartado tem teto fora da transação e pode deixar resíduo no volume se falhar (P-098). Sem chip/QR real, a prova desta etapa é de duas instâncias com engine falsa sobre o mesmo Postgres/Redis.

## D-040 — 2026-09-29 — Campanhas: época de agendamento e espaçamento global do efeito (P-057/E14)

- **Decisão:** `campaigns.scheduleEpoch` começa em zero para aceitar jobs existentes e incrementa em cada start/resume. Cada novo job carrega a época e tem ID `campaign-<id>-e<época>-<destinatário>`; jobs de épocas antigas ou de campanha PAUSED terminam sem reenfileirar. O agendamento é acumulado por destinatário; se falhar parcialmente, a campanha volta a PAUSED por CAS e o próximo `/resume` agenda todos os PENDING. A reserva e a liberação comparam `reservedAt`, para um worker antigo não soltar a reserva nova.
- **Boot e transientes:** Worker BullMQ 5.81.5 usa `autorun:false` e só chama `run()` depois da primeira passada da reidratação de sessões. Usa limiter global de um início a cada 8 s, entre réplicas. Sessão temporariamente fora de WORKING, restrição nativa, réplica sem lease, shutdown ou falha do slot Redis liberam a reserva e atrasam o mesmo job com backoff, sem FAILED. Uma reserva que ocupa o teto diário provisoriamente atrasa o próximo job; só teto atingido por enviados pausa a campanha. Teto diário efetivo e guardrail manual continuam com retomada manual via `/resume`.
- **Envio efetivo:** o limiter do BullMQ age no início do job, então downloads simultâneos de mídia ainda poderiam enviar em rajada. Antes de cada `sendText`/`sendMedia`, um script atômico reserva no Redis o próximo slot global de 8 s; depois da espera, o worker relê status e época. Fonte: [BullMQ, rate limiting](https://docs.bullmq.io/guide/rate-limiting), [workers](https://docs.bullmq.io/guide/workers), [delayed steps](https://docs.bullmq.io/patterns/process-step-jobs); [Redis EVAL](https://redis.io/docs/latest/commands/eval/) e [SET PX](https://redis.io/docs/latest/commands/set/). O script usa `TIME` do Redis lido antes do EVAL e uma única chave em `KEYS`, sem depender dos relógios das réplicas.
- **Prova e limite:** e2e usa a mesma instância local de Postgres/Redis com sessões e envios falsos: pausa/retomada, reidratação, lease, reserva, falha parcial de enqueue e mídia concorrente; sem conta, QR ou envio real. Não há contrato `/api` novo. Jobs antigos da versão anterior que já estejam em espera podem consumir slots do limiter antes de serem descartados; monitorar no primeiro deploy C (P-099).

## D-041 — 2026-09-29 — Afinidade de proxy e recusa de saída direta implícita (P-058/E15)

- **Decisão:** `currentProxyId` é a afinidade persistida da conta. RANGE/GLOBAL reutilizam o pin quando habilitado, não-DEAD e no conjunto de candidatos, em todas as estratégias. Só a primeira escolha ou perda de elegibilidade roda a estratégia/INCR; CAS impede uma seleção nova de sobrescrever atribuição concorrente. SINGLE nunca troca sozinho: ausente/removido/desabilitado/DEAD gera `ProxyUnavailableError` e FAILED antes do socket/Chromium. RANGE inválido ou vazio também falha. ALIVE/UNTESTED permanecem elegíveis.
- **Compatibilidade:** NONE e ausência de atribuição são o mesmo default público existente, único caso que admite direto se `WA_REQUIRE_PROXY=false`; true bloqueia também esses casos. Payloads/rotas não mudam. PUT SINGLE inválido retorna 400 claro sem gravar; ID ou nome de sessão viva é resolvido, mas desconhecidos/órfãos continuam aceitos (P-097 sem introduzir 404). PUT não cancela conexão/resolução já em andamento; vale para resoluções iniciadas após a gravação. Não corrige automaticamente atribuições históricas cujo sessionId foi gravado como nome.
- **Concorrência:** modo e pin são gravados no mesmo upsert. A validação SINGLE é repetida em transação com `SELECT … FOR UPDATE` no proxy, impedindo dois PUT/POST SINGLE concorrentes de reclamar o mesmo proxy livre para sessões vivas. RANGE/GLOBAL continuam compartilhando o pool (D-008); não é reserva global de saída física.
- **Falha em uso:** remover regex genérica `proxy`, DNS, ECONNREFUSED/ETIMEDOUT/EHOSTUNREACH. Só assinaturas próprias de auth/túnel marcam DEAD; não há contador de falhas ambíguas (repetição não prova culpa do proxy). Engine captura ID do transporte; callback que pertence a outro pin é ignorado, e leitura/escrita ocorrem na mesma transação da lease E13. Retry quieto 440 conserva DEGRADED local sem publicar FAILED; erros de infra/lease continuam propagando.
- **Fontes conferidas:** Prisma/client instalado 7.10.0 e [CRUD v7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/crud), [transações](https://www.prisma.io/docs/orm/prisma-client/queries/transactions); [PostgreSQL 18 row locks](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS); ioredis 5.11.1 e [Redis INCR](https://redis.io/docs/latest/commands/incr/). Baileys rc14 e WWEBJS 1.34.7 confirmados instalados e latest via npm dist-tags; Context7 e fontes oficiais de transporte, APIs preservadas. BullMQ 5.81.5/E14 sem mudança.
- **Aceite:** unit das engines/resolver/classificador e e2e Postgres/Redis com engines falsas (afinidade/restart/takeover, PUT, rollback de DEAD e callback obsoleto); sem conta/QR/envio real. Sem migration E15; primeiro deploy C exige B-004 stop-first, backup/restore B-005 e diagnóstico/canário B-007; observar P-099 e só depois concluir B-001. [Runbook manual](how-to/deploy-c-onda3.md).

## D-042 — 2026-09-29 — Manutenção por pins e scripts de instalação revisados (P-062 parte 1/E16)

- **Decisão:** fixar Node 26.10.0-bookworm-slim nos três estágios Node por digest do índice OCI multiarch; nginx do painel em 1.30.5-alpine também por digest. Actions checkout 5.1.0/setup-node 5.0.0 por SHA (`runs.using=node24`), runners Ubuntu 24.04 e Node 26.10.0. Os pins canônicos vivem nos Dockerfiles/workflows; atualizar exige PR com builds e smoke. `apt`/Chromium e conteúdo do runner continuam variáveis: não é reprodução integral da imagem.
- **Dependências:** React/React DOM e tipos em 19.3.0, Router 7.18.4, Vite 8.3.1, dependency-cruiser 18.4.0, ESLint 10.11.0, typescript-eslint 8.71.0 e Prettier 3.9.9. Sem major de runtime, alteração das engines, Nest, Prisma, BullMQ/ioredis, Vitest ou TS 5.9.3. ts-node removido: `npm explain` só mostrou a dependência direta; scripts, configs e código rastreados não o usam (Nest compila, Vitest usa SWC).
- **Instalação:** manter os seis scripts já aprovados por versão, aprovar fsevents 2.3.3 (macOS) e negar puppeteer 24.38.0. WWEBJS usa Chromium externo por `WWEBJS_CHROME_PATH`; manter `PUPPETEER_SKIP_DOWNLOAD=true` no CI/imagens. O helper de memória local também deve receber Chrome explícito. npm 11.19.1 dos runtimes pinados suporta `npm ci --strict-allow-scripts`: dependência sem decisão falha; negação `false` é decisão válida. O npm local antigo 11.12.1 não comprova essa política.
- **Gates:** postinstall e guardas de patches/dist/deps/Prisma preservados; `smoke-dashboard.mjs` prova HTTP/SPA/assets/cache/gzip/headers/404 da imagem, e o CI também exige 401 de POST protegido com API key falsa, login sintético 201 com cookie e rate-limit 10×401/11ª429. Login conserva o 201 existente (R0), apesar do 200 genérico da R15. Mutação em cópia descartável retira aprovação SWC e recebe ESTRICTALLOWSCRIPTS; mutações nginx sem gzip/header/fallback SPA/404 são recusadas. Sem contrato/env/migration nova; deploy D manual pelo [runbook](how-to/deploy-d-manutencao.md), herdando os pré-requisitos do C se ainda pendentes.
- **Fontes verificadas em 29/09:** Docker `imagetools inspect` confirmou índices amd64/arm64; [pins Docker](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions), [checkout](https://github.com/actions/checkout/releases/tag/v5.1.0), [setup-node](https://github.com/actions/setup-node/releases/tag/v5.0.0), [npm 11.19.1](https://github.com/npm/cli/blob/v11.19.1/lib/utils/strict-allow-scripts-preflight.js), Context7 `/npm/cli`, [React 19.3](https://github.com/react/react/releases/tag/v19.3.0), [Router](https://github.com/remix-run/react-router/releases/tag/react-router%407.18.4), [Vite](https://github.com/vitejs/vite/releases/tag/v8.3.1) e releases oficiais de cada ferramenta (lista/evidência no DONE E16).

## D-043 — 2026-09-29 — BullMQ 6 no Redis com ioredis 5 e ULID 3 (P-062 parte 2/E17)

- **Decisão:** BullMQ 6.3.10 e ULID 3.0.2 exatos; ioredis permanece 5.11.1 (range ^5.11.1). Nenhuma outra major, backend, env, migration ou payload muda. O alias de desenvolvimento `bullmq-v5` fixa 5.81.5 para provas cruzadas e sai da imagem no prune. TS 5.9.3, bases/Actions, instalação estrita, patches e gates D-042 preservados.
- **Adaptação:** v6 remove `Queue.client`; o slot global de campanha acessa `queue.getBackend().client`. O backend padrão continua Redis e seu adapter encaminha TIME/EVAL para ioredis; cast restrito a esses dois métodos, sem abrir outra conexão. Épocas, PAUSED no banco sem requeue, reidratação, limiter/slot de 8 s, moveToDelayed/DelayedError, reserva por CAS, lease e backoff E13/E14/E15 não mudam.
- **Provas:** testes de efeito com BullMQ v5/v6, Postgres/Redis e engines falsas, dois workers, jobs sem época, pausa/retomada, atraso/rollback, reconexão TCP isolada, shutdown, webhook HTTP/retry/DLQ/redelivery concorrente. A guarda de runtime executa `newId()` CommonJS compilado, valida 128 ULIDs únicos e seus timestamps na imagem após prune. Mutação com ID constante é recusada.
- **Compatibilidade operacional:** não usamos repeat/debounce/flows/pausa global, APIs removidas ou alteradas pela v6. Conferir dados Redis antes do deploy e rollback: repeat vazio, flag meta.paused ausente e lista :paused vazia nas duas filas. A v5 faz RENAME de :paused sobre :wait; a v6 mantém espera em :wait e combina listas legadas, portanto não se deve misturar versões com pausa global. A pausa de campanha no PostgreSQL é independente. A prova N-1 limita-se aos jobs comuns do produto, sem promessa geral de downgrade. Não drenar filas; observar P-099.
- **Fontes:** [package/peers v6.3.10](https://github.com/taskforcesh/bullmq/blob/v6.3.10/package.json), [guia v5→v6](https://github.com/taskforcesh/bullmq/blob/v6.3.10/docs/gitbook/guide/migrations/migrate-from-v5-to-v6.md), [backend](https://github.com/taskforcesh/bullmq/blob/v6.3.10/src/classes/queue-base.ts), [adapter ioredis](https://github.com/taskforcesh/bullmq/blob/v6.3.10/src/classes/ioredis-client.ts), [release shutdown 6.3.10](https://github.com/taskforcesh/bullmq/releases/tag/v6.3.10), [ULID 3.0.2 exports](https://github.com/ulid/javascript/blob/v3.0.2/package.json); registry, tags e Context7 conferidos em 29/09.
- **Operação:** [deploy E manual](how-to/deploy-e-bullmq6.md), depois dos aceites C/D, mantendo B-004/B-005/B-007 e canários do dono. Nenhuma conta, QR, mensagem real ou operação no Dokploy nesta etapa. CI/merge não comprovam implantação.

## D-044 — 2026-09-29 — Nest 12 no runtime com toolchain 11 e contrato preservado (P-062 parte 3/E18)

- **Decisão:** common/core/platform-fastify/testing 12.1.1 exatos, acima do piso 12.0.4;
  CLI 11.0.24, schematics 11.1.0 e TS 5.9.3 preservados. Config 12.0.1, JWT 12.0.2
  e nestjs-pino 5.2.1 são companions necessários: as versões anteriores não aceitam
  Nest 12 nos peers. Fastify 5.12.5 e find-my-way 9.9.0 ficam alinhados ao adapter.
  Não usar `nest upgrade`: ele também atualiza CLI/TS. Prisma, Vitest, engines,
  BullMQ 6.3.10/ioredis 5.11.1/ULID 3.0.2 e gates E16/E17 permanecem.
- **Interop:** aplicação continua CommonJS; Node 26.10.0 carrega Nest ESM por
  require(esm), sem mudar tsconfig. Instalação npm pode satisfazer peers amplos com
  Nest 11 na raiz e Nest 12 no workspace; a guarda da imagem final agora exige
  identidade única de common/core entre gateway, adapter, Config, JWT e logger.
  Fastify precisa resolver também a partir dos plugins hoisted para suas extensões
  de tipos. Lockfile não inclui atualizações alheias à migração.
- **HTTP:** contrato `/api` do node n8n 0.4.1, auth/CSRF/RBAC, idempotência,
  status/respostas, rate-limit e auditoria provados com AppModule/DB reais e
  transporte falso. Não foi criada rota `/api/n8n`. O filtro global existente
  preserva Error+statusCode dos plugins; harness de rate-limit passa a usá-lo como
  main.ts. Com find-my-way 9.9, `HTTP://` também resolve a rota, com auth e mesmo
  contador; URLs ambíguas continuam recusadas. Não introduz novo código de erro.
- **Shutdown:** prova com AppModule, dois workers, engine falsa e escritas cercadas de status/diagnóstico
  em voo: campanhas/webhooks antes de sessões, engine/diagnóstico antes da liberação
  de lease, fan-out antes de Redis, infraestrutura antes de HTTP. Fechamento duplo
  é deduplicado pelo Nest 12. HTTP permanece aberto até dispose como no Nest 11;
  não se afirma bloqueio universal de entrada durante toda a drenagem. P-100 tem
  prova diferencial própria; não se força close nem muda retries como contorno.
- **Gate E17:** leitura Redis já admitida pode reservar um job durante a drenagem;
  não prometer preservação de todo waiting. O teste de webhook agora ocupa os dois
  slots com HTTPs controlados antes de closing; comprova que close espera ambos,
  não inicia novo fetch e deixa o terceiro job para outro worker. Corrige uma corrida
  do harness revelada por cobertura, sem mudar runtime ou reduzir concorrência.
- **P-100 aberta:** seis casos em BullMQ 5.81.5/6.3.10 com ioredis 5.11.1 distinguem
  EVAL de moveToActive pendente (resolve após restaurar a principal) de
  RedisConnection.disconnect(true) esperando end da bloqueante já em reconnecting
  (close continua pendente após a principal se recuperar, na janela observada).
  Ociosidade só aprovou close imediato após o corte. SIGTERM do subprocesso é limpeza
  posterior à prova da falha, nunca sucesso de shutdown. Não há regressão v5→v6
  demonstrada, correção runtime nem ocorrência de produção verificada. Mecanismo,
  fontes e limites no [DONE E18](sessions/DONE-2026-09-29-1501-e18-nest12.md).
- **Segurança/operação:** removidos os sete aceites temporários de Fastify após
  conferir as versões corrigidas nos advisories oficiais (todos cobertos por 5.12.5).
  Sem migration/env/payload novo. [Deploy F e rollback](how-to/deploy-f-nest12.md)
  manuais após C/D/E, com B-004/B-005/B-007/P-099 e canários preservados; rollback
  alvo E17 conserva BullMQ 6. CI/merge não demonstram produção.
- **Fontes verificadas em 29/09:** registry e tarballs instalados; Context7
  `/nestjs/docs.nestjs.com`; [migração 11→12](https://docs.nestjs.com/migration-guide),
  [Nest 12.1.1](https://github.com/nestjs/nest/releases/tag/v12.1.1),
  [piso 12.0.4](https://github.com/nestjs/nest/releases/tag/v12.0.4),
  [Config](https://github.com/nestjs/config/releases/tag/12.0.0),
  [JWT](https://github.com/nestjs/jwt/releases/tag/12.0.0),
  [pino v5](https://github.com/iamolegga/nestjs-pino/tree/5.2.1#migration),
  [hooks](https://github.com/nestjs/nest/blob/v12.1.1/packages/core/hooks/on-module-destroy.hook.ts)
  e [advisories Fastify](https://github.com/fastify/fastify/security/advisories).

## D-045 — 2026-09-29 — Vitest 5 e preparação TS 6 mantendo TS 5.9.3/CLI 11 (P-062 parte 4/E19)

- **Decisão:** Vitest 5.0.2 exato nos dois workspaces e coverage-v8 5.0.2 na raiz.
  O runner hoisted importa o provider a partir de si; provider apenas no gateway
  reproduziu ERR_MODULE_NOT_FOUND. Dependência direta na raiz resolve a instalação
  limpa sem links manuais. Node 26.10.0/Vite 8.3.1 atendem aos peers. SWC 1.16.2 e
  unplugin-swc 1.6.0 mantidos; oxc:false, extends:true, clearMocks:false explícitos
  preservam decorators/metadata, herança e semântica de mocks. E2E continua serial;
  globs de coverage mantidos e conferidos. Config do gateway usa .mts, aceito pelo
  Vitest, para ESM do tooling sem mudar package/application CommonJS. .vitest ignorada.
- **TypeScript:** compilador único **5.9.3** e CLI/schematics **11** preservados.
  Gateway usa module:node20/moduleResolution:node16, suportados no TS 5.9, com emissão
  CommonJS por não declarar type:module. Tipos reais de exports substituem os shims
  de proxy; o import dinâmico de teste WWEBJS ganha .js. baseUrl removido; types,
  rootDir, noUncheckedSideEffectImports e libReplacement explicitados sem suprimir
  depreciações. Build mantém dist/main.js; painel permite fontes de contracts na raiz
  do monorepo. TS 6 não foi instalado nem há claim de execução com TS 6.
- **Cache/build:** rootDir explícito deslocava o buildinfo implícito para fora de
  dist; CLI 11 apaga dist e conserva esse cache. Segundo build reproduziu saída zero
  sem main.js (guarda recusou). tsBuildInfoFile explícito em dist resolve a invalidade;
  .dockerignore exclui caches locais. Dois builds consecutivos são o gate desta correção.
- **Efeito de emissão:** comparação com a imagem E18 encontrou 211 arquivos JS em
  cada build, diferença apenas em generated/prisma/internal/class.js: três import()
  antes convertidos em require passam a nativos (node:buffer e dois arquivos do
  query compiler). Subpaths Prisma 7.10.0 usam export wildcard igual em import/require;
  carregamento/SQL precisa passar na imagem final após prune. Código autoral emitido
  permanece idêntico, descontados comentários de sourceMappingURL.
- **Fontes:** [guia oficial Vitest 5.0.2](https://github.com/vitest-dev/vitest/blob/v5.0.2/docs/guide/migration/index.md),
  [config Vite 8.3.1](https://github.com/vitejs/vite/blob/v8.3.1/docs/config/index.md),
  [TS 5.9/node20](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html),
  [mudanças TS 6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
  Registry/peers/fontes instaladas conferidos em 29/09; Context7 consultado, mas seu
  trecho antigo de extends foi confrontado com o guia versionado.
- **Limites:** sem outra major de runtime/engine/Prisma, schema/env/payload novo,
  conta/QR/envio real ou Dokploy. Gates E16/E17/E18, contrato n8n, afinidade,
  épocas/lease/CAS/8 s e shutdown mantidos. P-100 aberta; SIGTERM de harness apenas
  limpa a falha já reproduzida. Deploys C/D/E/F e canários continuam manuais.

## D-046 — 2026-09-29 — Métricas de produto sem mudança do gate de envio (E20/P-064 + P-061)

- **Decisão:** medir novas relações por primeiro outbound observado nos últimos30d, sem inbound anterior e sem `isCold`; destinos individuais únicos, resposta por mensagem/reação até o cálculo, fora da semântica 72h do G4. Endpoint aditivo sob demanda; não grava snapshot G4, não avalia G5 nem muda envios. Histórico retido e LIDs sem vínculo são limites explícitos. Pergunta opcional ao dono não recebeu resposta durante a implementação: adotado o default recomendado de primeiro outbound observado.
- **Empates e correlação:** inbound estritamente anterior ao primeiro outbound exclui a relação; timestamp igual conta interação/resposta nesta observação. A precisão em segundos não prova ordem causal; `createdAt` de persistência assíncrona/backfill não é desempate causal. Reação LID sem alias só herda alvo outbound se a chave é unívoca entre mensagens recebidas/enviadas, inclusive self-chat. Fixtures reproduzem ambos os achados da revisão do PR.
- **Cota:** `CONTACT_CHECK_MAX_PER_WINDOW=0` desliga por padrão; positivo mede tentativas de números distintos por lote por sessão, com janela Redis atômica/TTL desde primeiro lote. Excesso/falha de Redis não altera o POST nem cria status/restrição novos; GET aditivo fornece saldo/disponibilidade. Pergunta opcional ao dono não recebeu resposta: adotada observação compatível. Enforcement fica para decisão explícita; cota não entra no envio.
- **Inventário:** projeção segura de `creds.platform` do pareamento Baileys. `smba`/`smbi` Business pelo helper oficial; `android`/`iphone` pessoal por inferência dos pares ANDROID/SMBA e IPHONE/SMBI no protobuf. Ausência/outros/WWEBJS UNKNOWN. Não se lê JSON de chaves inteiro nem se faz consulta Business de rede. P-101 conserva a cobertura faltante. Fonte de platform é `pair-success`, não fingerprint/OS do browser.
- **Compatibilidade:** contratos novos apenas em rotas aditivas com auth existente; n8n0.4.1 e `/contacts/check`/envios intactos. Sem migration/dependência nova; TS5.9.3/CLI11/Vitest5/SWC/CJS/buildinfo e gates E16–E19 preservados. A/B `/leads` só com engines reais e transporte falso, grupo LID não-admin e cobertura incompleta; não prova grupo real nem muda D-021. Batching Baileys sem correlação oficial de canônico fica P-102.
- **Fontes:** Baileys rc14 `Utils/generics`, `Utils/validate-connection`, `WAProto.proto`, `Socket/socket` e parser USync; WWEBJS1.34.7/pin1780711 e ClientInfo; Redis EVAL/INCRBY/PEXPIRE, Prisma7.10 queries parametrizadas/Postgres18 snapshots. URLs/limites em [Métricas E20](how-to/metricas-produto-e20.md#fontes-conferidas); Context7/source oficial e versões instaladas conferidos nesta etapa.
- **Operação:** P-064 continua parcial (canal oficial/políticas/grupo real/piloto do dono), P-100 aberta sem force-close/retries reduzidos e P-099 sem drenar. Deploys C/D/E/F/canários manuais, B-004/B-005/B-007 mantidos. CI/revisão/merge são a evidência de código; sem publicação/conta/QR/check/envio real.
