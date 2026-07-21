# BASE DO PROJETO — CONEXOZENVO

> Base universal: **v3.2** · aplicada em 2026-07-21 · modo: **upgrade** (da adaptação v2.1
> em `DOCUMENTO_CONEXOZENVO_NESTJS.md`, que permanece como histórico — decisão D-010)
> Arquivo canônico: `BASE_CONEXOZENVO.md` na RAIZ — nome fixo, um por repo (R18).
> Fonte da base genérica: `docs/DOCUMENTO_UNIVERSAL.md` (v3.2, escrita para Laravel;
> este arquivo é a TRADUÇÃO dela para a stack real do ConexoZenvo).

## PROTOCOLO DE ENTRADA (a IA executa antes de qualquer trabalho)

Detecte o cenário e execute o modo correspondente do R18:

- `BASE_CONEXOZENVO.md` nesta versão → sessão normal: abrir conforme R9
  (1º `docs/ESTADO.md` → 2º `docs/SESSOES.md` → 3º arquivo da sessão)
- Base universal mais nova que a deste arquivo → MODO UPGRADE (R18)
- Na dúvida entre cenários: PERGUNTAR antes de agir.

## CONTEXTO

- O que faz: plataforma self-hosted multi-sessão de WhatsApp (envio/recepção,
  webhooks HMAC, guard-rail anti-ban, extração de leads) — Modular Monolith + DDD
- Usuários: B2B — integradores via API REST (`X-Api-Key`) e via community node
  n8n `n8n-nodes-conexozenvo-gateway` (PUBLICADO no npm — a API é contrato público)
- Fase: **PRODUÇÃO** no Dokploy (conexozenvo.com + api.conexozenvo.com)
- Dados sensíveis (LGPD art. 5º, II): **não** — trata dados pessoais COMUNS
  (mensagens, contatos, telefones) em volume; o conteúdo das mensagens é do
  cliente. Consequência prática: R5 nível 2 não é obrigatório, mas credenciais
  de engine/tokens são SEMPRE cifrados e a retenção (RetentionService) é regra
- Referência de negócio: `docs/PROJETO.md` · `docs/INTEGRACAO.md` · `docs/agent-whatzapp_api.md`

## STACK REAL — NÃO SUGERIR ALTERNATIVAS

- Monorepo npm workspaces: `apps/gateway` · `apps/dashboard` · `packages/contracts`
- Backend: NestJS 11 + Fastify 5 · Node >=22 (dev em Node 26/WSL) · TypeScript
  com OVERRIDE fixo **5.9.3** (TS 6 transitivo QUEBRA o `nest build` — não subir)
- ORM: Prisma 7 (`@prisma/adapter-pg`, client em `src/generated`) · PostgreSQL 18
- Filas/eventos: BullMQ 5 + Redis (ioredis) · EventBus próprio no shared-kernel
  · fan-out multi-réplica via canal Redis `wa:events`
  · GOTCHA: jobId do BullMQ NÃO aceita `:` — usar `-` (24h de webhooks mudos)
- Engines WhatsApp: Baileys 7.0.0-rc13 (principal) · whatsapp-web.js 1.34.7
  (Store/leads) · futura META_CLOUD (API oficial — ver FEATURE DIRECIONADA)
- Dashboard: React 19 + React Router 7 + Vite + Tailwind 4
- Observabilidade: nestjs-pino (JSON em prod) · prom-client `/metrics`
  (METRICS_TOKEN) · `/health`
- Storage: S3 (MinIO/Cloudflare R2) · Validação: zod nas bordas
- Qualidade: ESLint 10 + typescript-eslint · Prettier 3 · Vitest 4 (e2e)
- Deploy: Dokploy (Docker Swarm) · imagem não-root (gosu) · hoje: auto-deploy
  via webhook Git na main com build no servidor (alvo do R15: build-once/promote)

## MÓDULOS EXISTENTES (`apps/gateway/src/modules/` — bounded contexts, R10)

1. sessions — ciclo de vida (start/stop/restart, QR/pairing, autostart escalonado)
2. channels — abstração de engine (Baileys/wwebjs; casa da futura META_CLOUD)
3. messaging — envio/recepção, ack, ritmo humano, mídia S3
4. webhooks — dispatcher BullMQ, HMAC, dedup por jobId, dead-letter
5. events — timeline, SSE, ponte EventBus → consumidores
6. guardrail — G1–G8: quarentena, HTTP 423, SessionMetric, reply-rate
7. contacts — contatos, merge LID→telefone, save/block
8. groups — grupos e extração de leads
9. campaigns — campanhas
10. proxies — pool Webshare, health-tester (só 2xx = ALIVE)
11. iam — API keys, RBAC, seats, licença Ed25519, audit log
12. health — `/health` · 13. observability — `/metrics`

- `shared-kernel/` (event-bus, result, ulid, clock, crypto) · `infra/` (prisma,
  redis, storage, directory) · `packages/contracts` (tipos compartilhados)
- REGRA: melhoria nasce DENTRO do módulo dono; módulo novo só com os 3 sins do R10.

## FEATURE DIRECIONADA — ENGINE "META CLOUD"

Escopo diretor preservado em `DOCUMENTO_CONEXOZENVO_NESTJS.md` § FEATURE
DIRECIONADA (não duplicado aqui — R3). Nasce como sessão R9 própria dentro da M6.

---

## REGRAS DE EXECUÇÃO (NÃO ALTERAR ESTA SEÇÃO)

### R0 — PRODUÇÃO PRIMEIRO (regra do projeto; não existe no universal)

- Sistema EM PRODUÇÃO com clientes reais e node n8n publicado no npm.
- NUNCA: `prisma migrate reset`, `db push` destrutivo, editar migration aplicada,
  breaking change em rota/payload de `/api` sem plano `/api/v1`.
- Toda mudança lista seu "efeito de deploy" no checkpoint.
- Mudança de infra/env no Dokploy é AÇÃO OPERACIONAL: descrever passo a passo
  para o usuário executar — não simular que foi feita.

### R1 — ROADMAP E CHECKPOINTS

Execute UMA onda por vez. Ao final: checkpoint padronizado (template no fim),
atualizar ESTADO.md/CHANGELOG.md/arquivo da sessão (R9), AGUARDAR OK.
Nunca pule ondas. Nunca execute comandos destrutivos sem confirmação.

### R2 — ONDAS DE MELHORIA (equivalem às fases F0–F8 do universal)

M0 · Doc viva ✅ · M1 · Destravar produção ✅ · M2 · Guard-rail ativo (em curso)
M3 · Qualidade e fronteiras: unit de domínio, coverage acordada, boundaries no CI
M4 · Segurança e resiliência: backup + restore TESTADO, rotação de secrets, audit no CI
M5 · Observabilidade com alertas: canal único, uptime externo
M6 · Roadmaps estratégicos (cada um sessão R9 própria): META CLOUD →
multi-tenant RLS → multi-engine → `/api/v1`
**Adoção da base v3.2**: ondas próprias em `docs/ADOCAO.md` (correm em paralelo
às ondas M, priorizadas por risco — ver R18). Status vivo em `docs/ESTADO.md`.

### R3 — DOCUMENTAÇÃO VIVA (obrigatória, sempre atualizada)

Estrutura em `docs/`: PROJETO.md · ESTADO.md · **MAPA.md** (navegação de siglas)
· DECISOES.md (append-only) · ARQUITETURA.md (módulos, tabelas donas, glossário)
· **AUDITORIAS.md** (agenda viva — R17) · SESSOES.md + sessions/ (R9) ·
**ADOCAO.md** (temporário — R18) · how-to/ (runbooks) · CHANGELOG.md (raiz) ·
`BASE_CONEXOZENVO.md` (raiz) · `CLAUDE.md` (raiz — aponta esta base).
Docs existentes (INTEGRACAO.md, auditoria-2026-07.md, deploy-dokploy.md,
motores-whatsapp.md, agent-whatzapp_api.md) são LINKADOS, não duplicados.
REGRA: código sem documentação atualizada = onda incompleta.

### R4 — VERSIONAMENTO (código + banco + API)

Código:
- SemVer + tags git a cada release · Conventional Commits em pt-BR
- main protegida; TODO trabalho em branches `feature/*` (base do R9)
Banco (Prisma — forward-only):
- NUNCA editar migration aplicada · correção = migration nova · em prod SEMPRE
  `prisma migrate deploy` · toda migration roda nos e2e do CI · seeds idempotentes
- **Compatibilidade N-1** (habilita o rollback do R15): toda migration compatível
  com a versão ANTERIOR do código rodando — expand → migrate → contract em
  releases separados; NUNCA dropar/renomear coluna no mesmo release que para de
  usá-la; NUNCA operação que trave tabela grande
- **Índice em tabela JÁ populada em produção**: criar SEM lock de escrita
  (`CREATE INDEX CONCURRENTLY` — não roda dentro de transação; validar o
  mecanismo do Prisma da versão instalada ANTES de usar, documentation-first R8)
API:
- O `/api` atual É a v1 de fato (node n8n publicado consome). Aditivo ok;
  breaking = `/api/v1` novo mantendo o atual (R0).
- `packages/contracts` é a fonte dos tipos — mudou payload, mudou contracts
  no MESMO commit.

### R5 — SEGURANÇA (defesa em camadas)

Já em produção (manter e testar, não recriar):
- IAM: X-Api-Key por integração, RBAC, seats, licença Ed25519, audit log
- JWT do painel em cookie httpOnly/Secure/SameSite=Lax (zero localStorage)
- helmet + rate limit (login 10/min) · `/metrics` por token · logs com
  credenciais redigidas · retenção (raw 7d, msgs 90d, eventos 30d, audit 180d)
Criptografia e rotação (adaptação do "2 níveis" do universal):
- Nível 1 (obrigatório): TODO segredo persistido (tokens de engine, credenciais
  META_CLOUD futuras, senhas de proxy) cifrado via `shared-kernel/crypto`, chave
  em env dedicada; rotação SEM perda: aceitar chave anterior
  (`*_PREVIOUS_KEYS`-equivalente) + comando de recriptografia; runbook em
  `docs/how-to/rotacao-de-chaves.md` (M4)
- Nível 2 (CipherSweet/blind-index): ➖ não se aplica enquanto
  "Dados sensíveis: não" — reavaliar se o produto passar a tratar saúde/biometria
Modo teste → go-live (v2.5 — casa com o que o projeto JÁ faz):
- Gates de segurança/proteção só relaxam via env com default SEGURO; relaxamento
  explícito, registrado em DECISOES.md e reversível por env
  (exemplo vivo: `GUARDRAIL_ENFORCE=false` em observação — D-005/D-007)
Backup (M4): Postgres → S3 off-site cifrado, agendado, com NOTIFICAÇÃO de
sucesso/falha e TESTE DE RESTAURAÇÃO documentado antes de considerar entregue.
CSP (v3.2, adaptado): dashboard estático atrás de proxy — política CSP definida
nos headers do proxy/nginx; se apertar, validar que Vite/React não dependem de
inline não-nonce (CSP declarado que quebra o app acaba desligado).

### R6 — QUALIDADE (gates que quebram o CI)

Hoje (manter verdes): `npm run lint` · `npm run format:check` · typecheck ·
`npm run test` (Vitest e2e — SEM flake tolerado; flake = bug) · builds de
gateway e dashboard.
Regra de ouro (item 25): efeito crítico (webhook/evento/job) exige teste e2e
DE EFEITO — nunca fire-and-forget com catch silencioso.
Deltas v2.5→v3.2 a instalar (plano em `docs/ADOCAO.md`):
- **Secret scanning** (gitleaks) no pre-commit e CI — determinístico
  (`--no-git`, allowlist versionada); gate vermelho por segredo, nunca por ruído
- **Gate de drift env ↔ env.example** no pre-commit (toda env ativa documentada
  no example) — o boot com zod fail-fast (D-007) valida o contrato no CI
- **Pre-commit** (husky/lint-staged): lint + typecheck rápido + gitleaks + drift
- **npm audit** como gate (M4) · **coverage mínima** acordada + unit de domínio (M3)
- **Boundaries** (dependency-cruiser) no CI (M3) — fronteira executável do R10
- **Baseline de análise nunca cresce**: gate = "zero erros NOVOS vs. main";
  meta de redução trimestral registrada (R17)
- **Suíte 100% executável no ambiente canônico (CI)**; falha local conhecida
  (ex.: Chromium do wwebjs em ARM) documentada ≠ ignorável no CI
- **Integridade da doc viva**: links quebrados em docs/ = gate vermelho

### R7 — MONITORAMENTO COM NOTIFICAÇÕES

- Já existe: pino JSON, prom-client `/metrics`, `/health`, contadores Redis,
  notificador de guard-rail via n8n (workflow "Campanha v2 - Notificador")
- M5 adiciona: canal de alerta ÚNICO (Telegram | e-mail | Slack — escolher 1),
  uptime externo no `/health`, alertas de: erro crítico, fila parada, sessão
  FAILED em massa, falha de backup, falha de deploy, falha do smoke pós-deploy (R15)
- Painel de filas BullMQ: decisão registrada em DECISOES.md quando priorizado

### R8 — COMPORTAMENTO DO CLAUDE

- Arquiteto sênior e mentor: trade-offs explicados, decisões em DECISOES.md
- DOCUMENTATION-FIRST: consultar doc oficial da versão INSTALADA antes de usar
  API de lib (os piores bugs — jobId `:`, TS 6 — vieram de suposição)
- Código production-ready: zod na borda, guards, DTOs, eventos, jobs
- Em dúvida entre simples e complexo: simples, e registre o porquê
- Toda sigla citada (M2, R5, D-010, G1–G8, O1–O4...) resolve em `docs/MAPA.md`;
  criou tipo novo de referência = registrar no MAPA na hora
- Sempre responder em pt-BR

### R9 — PROTOCOLO DE SESSÕES PARALELAS

ABERTURA (obrigatório em TODA conversa): 1º ler `docs/ESTADO.md` → 2º ler
`docs/SESSOES.md` → 3º criar `docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md`
(objetivo, escopo, fora-do-escopo, branch, status 🟢) → registrar linha em
SESSOES.md → branch própria `feature/[slug]`.
ISOLAMENTO: só na própria branch, nunca na main · escopos DISJUNTOS (ideal:
1 sessão = 1 módulo) · pontos de contato globais (schema.prisma,
packages/contracts, app.module.ts, docker-compose.yml, ci.yml) declarados no
escopo · arquivo no escopo de outra sessão ativa = PARAR e avisar ·
ESTADO.md global só no encerramento.
DURANTE: progresso datado no arquivo da sessão a cada checkpoint.
ENCERRAMENTO: bloco Encerramento preenchido → renomear ATIVA→DONE → mover linha
para Histórico → **Histórico acima de 15 linhas: mover as mais antigas para
`docs/SESSOES_ARQUIVO.md`** (v3.2 — higiene de contexto) → merge/PR e SÓ ENTÃO
atualizar ESTADO.md → checkpoint final com frase de retomada.
SESSÃO INTERROMPIDA: permanece 🟢; retomar via arquivo ATIVA; descartar =
⚠️ ABANDONADA com motivo.

### R10 — ARQUITETURA: MONOLITO MODULAR + DDD (preservar e endurecer)

- ESTRUTURA REAL: `modules/<modulo>/` (referência = `proxies`: domain/
  application/ infrastructure/ interface/; módulos flat migram QUANDO tocados,
  nunca big-bang) · `shared-kernel/` mínimo · `infra/` sem conhecimento de
  negócio · `packages/contracts` compartilhado
- FRONTEIRAS: cada tabela do schema.prisma tem UM módulo dono (mapa em
  ARQUITETURA.md); comunicação entre módulos SÓ por (1) provider público do
  `.module.ts` ou (2) evento via EventBus/BullMQ (com teste de efeito — R6);
  JOIN de leitura ok; escrita em tabela alheia PROIBIDA; transação cruzando
  módulos = fronteira errada → DECISOES.md
- **Identidade ≠ domínio** (v3.2): usuários/auth vivem no `iam` e não acumulam
  lógica de outros módulos; agregados de domínio ligam-se por id — nunca o contrário
- ENFORCEMENT: dependency-cruiser no CI (M3) — módulo não importa internals de
  outro; shared-kernel e infra não importam modules/**; esboço de config em
  `DOCUMENTO_CONEXOZENVO_NESTJS.md` § PARTE 5
- Módulo novo exige 3 sins: linguagem própria + ciclo de vida próprio +
  candidato plausível a serviço → DECISOES.md

### R11 — VARIÁVEIS DE AMBIENTE (.env) — NOVO na v3.2

Contrato e organização:
- `.env` NUNCA commitado; **`env.example` de cada app é o CONTRATO versionado**
  (`apps/gateway/env.example` + `env.production.example`); env nova entra no
  example NO MESMO commit — gate de drift no pre-commit verifica (R6)
- Seções nomeadas e comentadas (o example do gateway já segue: runtime, banco,
  Redis, JWT/painel, storage, engines, guard-rail, proxies, métricas...)
- Booleans com a semântica D-007: `true/1/yes/on` liga · `false/0/no/off`
  desliga · inválido DERRUBA O BOOT com o nome da variável (fail-fast)
Uso no código:
- env lida SÓ na camada de config (zod schema no boot); o app consome o config
  tipado — obrigatória ausente quebra o BOOT, não runtime de madrugada
- Knob de negócio ajustável sem redeploy (ex.: tuning do guard-rail por sessão)
  vive no BANCO/config de sessão, não em env; env é para infraestrutura e defaults
Segredos:
- No example: valor VAZIO ou placeholder + comentário de onde obter; jamais real
- Produção: env do Dokploy (secrets), nunca arquivo no repo
- Prefixo `VITE_` vai para o BROWSER: nunca segredo com esse prefixo
Multi-projeto na mesma máquina (regra viva — portas ÚNICAS por projeto):
- ConexoZenvo local: Postgres **5436** · Redis **6382** · dashboard **5174** ·
  gateway **3000** — overrides locais fora do versionamento

### R12 — ACESSIBILIDADE E INCLUSÃO — NOVO na v3.2 (condicional)

O dashboard é painel interno B2B → nível RECOMENDADO (não bloqueante):
- Semântica antes de estilo (labels, foco visível, headings) ao TOCAR telas
- `eslint-plugin-jsx-a11y` quando entrar, entra como warning → error por área
- Estado nunca SÓ por cor (ex.: status de sessão = cor + texto/ícone — já é o padrão)
- Vira obrigatório (WCAG 2.2 AA + axe no CI) SE nascer fluxo público de usuário final

### R13 — TEMPO, FUSO E RELÓGIO — NOVO na v3.2

- Colunas de data-hora de DOMÍNIO no Prisma: `@db.Timestamptz` SEMPRE (instante
  absoluto; conversão na leitura). Colunas naive existentes: migração
  forward-only `ALTER COLUMN ... TYPE timestamptz USING ... AT TIME ZONE`
  planejada — NUNCA editar migration antiga (R4)
- Data pura (sem hora): `DATE` sem conversão de fuso
- Containers (app, workers, banco): `TZ` explícito — logs e cron alinhados
- Scheduler/BullMQ repeatable e janelas de envio: timezone EXPLÍCITO por
  configuração (o guard-rail já tem timezone por sessão — manter o padrão)
- Fronteira JS/API: API devolve ISO-8601 COM offset; dashboard NUNCA parseia
  string sem offset nem faz aritmética manual com `Date` entre fusos
- Relógio do servidor: NTP ativo — drift quebra TOTP/assinaturas com timestamp
- Multi-região um dia? O dado já é absoluto (timestamptz); conversão vai à borda

### R14 — ASSETS ESTÁTICOS E MÍDIA — NOVO na v3.2

- `apps/dashboard` (Vite): assets da UI importados pelo build — hash no nome =
  cache imutável + cache-busting automático; nada de `?v=` manual
- `public/` do dashboard: SÓ o que exige URL fixa (favicon, robots.txt, og-image)
- S3 (MinIO/R2): SÓ mídia de usuário/sessão (já é o padrão do messaging) —
  nunca asset de marca do produto
- Referência de logo/marca centralizada em 1 componente React — trocar a marca
  = 1 arquivo

### R15 — DEPLOY DE EXCELÊNCIA — NOVO na v3.2 (prioridade máxima)

Estado ATUAL (registrado, não escondido): auto-deploy via webhook Git na main +
build NO SERVIDOR (Dokploy) — viola "build once, promote" e "produção gated".
Migração é onda própria do ADOCAO.md (produção não para; nada de big-bang).
ALVO (princípios do universal, traduzidos):
1. Paridade: o que se testa é a IMAGEM (Dockerfile, entrypoint) — não só o código
2. Build once, promote: imagem buildada 1× no CI, tag = SHA, registry (GHCR);
   rebuild em servidor PROIBIDO quando o fluxo migrar
3. **Smoke test do artefato no CI**: subir a imagem buildada (Postgres/Redis de
   serviço) e validar por HTTP: `/health` 200 · login do painel 200 · assets do
   dashboard 200 · `POST /api/...` com X-Api-Key inválida → 401 correto.
   Dependência nova que serve rota entra na lista NO MESMO PR. Mudança em
   Dockerfile/proxy OBRIGA o smoke
4. Promoção gated para produção (manual/approval) quando houver registry;
   staging com dados SINTÉTICOS quando viável
5. Sequência de produção: backup (pg_dump) ANTES de migrations → `migrate
   deploy` → rolling update com health-gate
6. **Graceful shutdown** (v3.2, crítico AQUI): SIGTERM → parar de aceitar
   envios → fechar workers BullMQ (`worker.close()` espera o job atual) →
   desconectar sessões Baileys/wwebjs LIMPO (sem logout!) → sair. Stop timeout
   do Swarm MAIOR que o job mais longo — senão é SIGKILL no meio de envio.
   Lembrete operacional: NUNCA reiniciar o gateway em rajada com sessão real
   conectada (o WhatsApp derruba a sessão)
7. Rollback: hoje = redeploy de commit anterior (lento — build no servidor);
   alvo = trocar tag da imagem (<5 min), ensaiado 1×/trimestre (R17)
PÓS-INCIDENTE (já é a regra de ouro do R6, agora com nome): bug de produção só
fecha com (1) teste que o reproduz, (2) entrada no smoke se for infra/rota,
(3) runbook: sintoma → causa → detecção → reversão.

### R16 — HARDENING DA IMAGEM DE PRODUÇÃO — NOVO na v3.2

- Boot valida envs obrigatórias e falha ALTO com o nome da variável (D-007 já
  cobre; manter para TODA env nova) — 502 silencioso é inaceitável
- Conexão ao banco/Redis no boot com retry/backoff — infra pode subir depois
- Imagem não-root (gosu — já é) · permissões de volumes corrigidas no entrypoint
- Atrás do Traefik: `trustProxy` do Fastify configurado — IP real no rate
  limit/audit; scheme https correto
- Binários/deps nativas requeridos VERIFICADOS no build (ex.: Chromium do
  wwebjs, `prisma generate` antes do build) — erro de build, não de runtime
- `.dockerignore` cobre .env, node_modules, docs pesadas

### R17 — CADÊNCIA DE AUDITORIAS — NOVO na v3.2

Auditoria sem agenda = auditoria morta (a auditoria-2026-07 foi 1× — virou foto).
Agenda viva em `docs/AUDITORIAS.md`: cada linha com dono, última execução e
próxima. Cadências: CONTÍNUO (CI: npm audit, gitleaks, integridade de docs) ·
MENSAL (npm outdated) · TRIMESTRAL (índices/queries lentas · redução da
baseline · TESTE DE RESTORE do backup · ENSAIO de rollback) · A CADA UPGRADE
major/rc de framework ou engine (compliance de versão — inclui bump do Baileys) ·
SEMESTRAL só se "Dados sensíveis" virar "sim".

### R18 — CICLO DE VIDA DA BASE — NOVO na v3.2

- Arquivo canônico: `BASE_CONEXOZENVO.md` na RAIZ — porta de entrada de
  qualquer IA/humano; ao entrar no repo, procurar `BASE_*.md` ANTES de supor
- Este arquivo nasceu em MODO UPGRADE (v2.1 adaptada → v3.2) em 2026-07-21 —
  decisão D-010; diagnóstico e plano de ondas em `docs/ADOCAO.md`
- Deltas de base futuros: listar changelog entre versões → aplicar SEM
  reescrever o preenchimento do projeto → delta que exige código/infra vira
  sessão R9 própria → bump da versão no topo + D-xxx
- ADOCAO.md arquiva quando o diagnóstico estiver 100% ✅/➖

### TEMPLATE DE CHECKPOINT (emitir ao fim de cada onda)

✅ CHECKPOINT — ONDA [Mx | ADOCAO-x] · SESSÃO [id]
O QUE FOI FEITO: [lista objetiva]
ARQUIVOS CRIADOS/ALTERADOS: [caminhos]
PACOTES ADICIONADOS: [nome + versão + motivo]
DECISÕES REGISTRADAS: [refs no DECISOES.md]
EFEITO DE DEPLOY: [nenhum | descrever — env nova, relogin, migration...]
AÇÕES OPERACIONAIS PARA O USUÁRIO: [passos no Dokploy/DNS/etc., se houver]
CLASSE DE ERRO INTRODUZÍVEL E GATE QUE A CAPTURA: [obrigatório — se nenhum gate
existente captura, criar o gate ANTES de prosseguir] (v3.2)
COMANDOS PARA VALIDAR: npm run lint · npm run format:check · npm run test ·
npm run gateway:build · npm run dashboard:build
SESSÃO ATUALIZADA: sim · ESTADO.md: [sim, se encerramento]
PARA CONTINUAR EM NOVA CONVERSA:
"Leia docs/ESTADO.md e docs/SESSOES.md e continue da onda [seguinte]"

---

## MAPA DE ADAPTAÇÃO (universal v3.2 → ConexoZenvo)

| Universal (Laravel, greenfield)      | ConexoZenvo (Node/TS, produção)                                  |
| ------------------------------------ | ----------------------------------------------------------------- |
| Fases F0–F8                          | Ondas M0–M6 + ondas de adoção (ADOCAO.md)                        |
| — (não existia)                      | **R0 Produção Primeiro** (contrato público do node n8n)          |
| Pest 4 + Larastan + Pint + Rector    | Vitest 4 + typescript-eslint + Prettier (Rector ➖ sem equivalente adotado) |
| Pest arch()                          | dependency-cruiser no CI (M3)                                     |
| encrypted casts + CipherSweet        | shared-kernel/crypto p/ segredos persistidos; nível 2 ➖          |
| MFA Filament + WebAuthn              | JWT httpOnly + RBAC/seats; MFA do painel = candidato a D-xxx     |
| Pulse + Sentry + /up                 | pino + prom-client + /health; alertas M5; Sentry = decisão M5    |
| spatie/laravel-backup                | pg_dump → S3 off-site + restore testado (M4)                     |
| timestampTz() migrations             | Prisma `@db.Timestamptz` + migração forward-only das naive       |
| Vite::asset() Blade                  | import de asset no Vite/React (hash automático)                  |
| config:cache + Env::getOrFail        | zod fail-fast no boot (D-007)                                     |
| horizon:terminate                    | BullMQ `worker.close()` + desconexão limpa das engines           |
| Feature flag = Pennant               | config por sessão no banco (tuning sem redeploy)                 |
