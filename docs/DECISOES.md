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
  + RFC 9700 §4.14. Parâmetros aprovados pelo usuário: access 15min, refresh 30d.
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
