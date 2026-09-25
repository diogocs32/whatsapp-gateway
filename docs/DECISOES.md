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
- **Evidência:** 6 coletas (10–14/07, `docs/observacao/guardrail-m2.jsonl`) com **zero
  falso-positivo** · teste do 423 no n8n aprovado ponta a ponta com requeue N7 provado
  (`RETURNING id` — critério 4 fechado em definitivo em 10/07) · nenhum incidente de guard-rail
  registrado em PENDENCIAS/avisos/alertas entre 13/08 e 18/08. O critério 1 da janela (≥7 dias)
  ficou parcial (coletas pararam em 14/07) — suprido pelo mês de enforcement real.
- **Rollback:** `GUARDRAIL_ENFORCE=false` no Dokploy + redeploy — **FUNCIONA desde o D-007**
  (`envBool` fail-fast; a pegadinha antiga do `coerce.boolean` não existe mais). Alternativa:
  remover a env (default `false`).
- **Consequências:** ESTADO.md roadmap M2 ✅ · próxima onda = M3 (qualidade) · histerese
  DEGRADED↔WORKING e curadoria de quais status alertam seguem como backlog (P-001 + n8n).

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

## D-027 — 2026-09-25 — Deploy do gateway passa a ser manual (auto-deploy desligado no Dokploy)

- **Decisão (do dono, informada no chat da E4 em 25/09, antes do merge da Onda 1):** o toggle
  **Auto Deploy do app `gateway`** no Dokploy foi desligado. Merge/push na `main` **não publica mais
  o gateway**; ele entra em produção quando o dono clica **Deploy** no Dokploy. O **dashboard** segue
  com auto-deploy + Watch Paths.
- **Efeito prático:** o dono escolhe a janela de cada deploy do gateway (sem campanha rodando,
  ninguém pareando) — importante enquanto o start-first abre as contas duas vezes (D-020, até o
  B-004). Merge de código do gateway sem o Deploy deixa a `main` à frente da produção: registrar no
  ESTADO ("Divergência dev × produção") até o Deploy; o `/health` com uptime antigo denuncia.
- **Ajustados:** `CLAUDE.md` (stack/deploy), roteiro (decisão 1), `how-to/deploy-a-onda1.md` (passo
  0 = Deploy manual), `how-to/rollback-gateway.md` (opção B), `how-to/dokploy-watch-paths.md`.
- **Não verificado pelo chat:** o estado do toggle no painel (ação e leitura do dono — R0).
