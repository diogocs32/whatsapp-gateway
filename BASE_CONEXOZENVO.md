# BASE DO PROJETO — CONEXOZENVO

> Base universal: **v4.3** · aplicada em 2026-08-12 · modo: **upgrade** (da v3.2
> aplicada em 2026-07-21 — D-010; este upgrade é a decisão D-011)
> Arquivo canônico: `BASE_CONEXOZENVO.md` na RAIZ — nome fixo, um por repo (R18).
> Fonte da base genérica: `docs/DOCUMENTO_UNIVERSAL.md` (v4.3, escrita para Laravel;
> este arquivo é a TRADUÇÃO dela para a stack real do ConexoZenvo).

## PROTOCOLO DE ENTRADA (a IA executa antes de qualquer trabalho)

Detecte o cenário e execute o modo correspondente do R18:

- `BASE_CONEXOZENVO.md` nesta versão → sessão normal: abrir conforme R9
  (1º `docs/ESTADO.md` → 2º `docs/SESSOES.md` COMPLETO: ativas + 📢 Avisos +
  5 últimas do histórico → 3º `docs/PENDENCIAS.md` → 4º arquivo da sessão,
  com ECO DE LEITURA)
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

Execute UMA onda por vez. Ao final: checkpoint padronizado (template no fim —
inclui os campos BLOQUEADO EM VOCÊ e DOCS TOCADAS, v4.3), atualizar
ESTADO.md/CHANGELOG.md/arquivo da sessão (R9), AGUARDAR OK.
Nunca pule ondas. Nunca execute comandos destrutivos sem confirmação — e,
quando a projeção `.claude/` existir (R19), comando destrutivo também é
BLOQUEADO por hook: a regra vale em duas camadas, instrução E enforcement.

### R2 — ONDAS DE MELHORIA (equivalem às fases F0–F8 do universal)

M0 · Doc viva ✅ · M1 · Destravar produção ✅ · M2 · Guard-rail ativo (em curso)
M3 · Qualidade e fronteiras: unit de domínio, coverage acordada, boundaries no CI
M4 · Segurança e resiliência: backup + restore TESTADO, rotação de secrets, audit no CI
M5 · Observabilidade com alertas: canal único, uptime externo
M6 · Roadmaps estratégicos (cada um sessão R9 própria): META CLOUD →
multi-tenant RLS → multi-engine → `/api/v1`
**Adoção da base** (v3.2 → A1–A7 · v4.3 → A8–A11): ondas próprias em
`docs/ADOCAO.md` (correm em paralelo às ondas M, priorizadas por risco — ver
R18). Status vivo em `docs/ESTADO.md`.

### R3 — DOCUMENTAÇÃO VIVA (engenharia de documentação — v4.2/v4.3)

Documentação não é apoio — é multiplicador (evidência DORA): o mesmo
investimento técnico rende ordens de grandeza a mais com doc que se
ENCONTRA em segundos, em que se CONFIA sem verificar e que se USA sem
tradução.

PRINCÍPIOS (as leis — tudo abaixo é consequência delas):
1. Docs-as-code: a doc vive NO repo, muda no MESMO commit do comportamento
   que descreve. Doc que chega depois já nasce errada
2. Um documento, um propósito — precisou de "e também", são dois documentos
3. Minimalismo: o MÍNIMO que faz o leitor agir; suporte ao erro (o momento
   em que o leitor erra é quando ele mais lê)
4. Documente o PORQUÊ; o código já diz o quê. Só a doc registra alternativas
   descartadas, restrição externa, armadilha que custou caro (jobId `:`, TS 6)
5. Afirmação de estado carrega DATA + COMANDO que verifica (classe runbook) —
   e comando citado TEM que existir
6. Todo doc de conteúdo tem UM dono nomeado — sem dono, apodrece em silêncio
7. Uma fonte canônica por assunto; o resto APONTA com link, nunca copia
   (é a regra viva do projeto desde D-004)
8. Estrutura organizada pela PERGUNTA do leitor, nunca pelo organograma

FIDEDIGNIDADE — A DEFINITION OF DONE DOCUMENTAL (v4.3):
- Uma mudança está COMPLETA quando NENHUMA frase da doc ficou FALSA por
  causa dela. A pergunta de fechamento não é "atualizei a doc?" — é
  **"O QUE ESTE DIFF TORNOU FALSO?"** (verificável, mecânica)
- MAPA DE GATILHOS (mudança no diff → doc obrigatória no MESMO commit/PR;
  o gate docs-drift do R6 fiscaliza quando instalado — A9):

  | Se o diff contém...                                   | Então toca junto                                             |
  | ----------------------------------------------------- | ------------------------------------------------------------ |
  | migration que cria/renomeia/move tabela               | `ARQUITETURA.md` § tabelas donas (R10)                       |
  | provider público de módulo ou evento novo/mudado      | `ARQUITETURA.md` § expõe/consome + 📢 aviso em SESSOES (R9)  |
  | rota/payload de `/api` novo ou mudado                 | `packages/contracts` NO MESMO commit (R4) + `INTEGRACAO.md`  |
  | env nova ou renomeada                                 | `env.example` do app (R11)                                   |
  | script/comando novo em package.json                   | `CLAUDE.md` § comandos (+ README quando houver seção)        |
  | procedimento de operação mudado                       | how-to/runbook correspondente + `revisado_em`                |
  | decisão cara de reverter                              | `DECISOES.md` (+ ADR em `docs/decisions/` pelo gatilho abaixo) |
  | onda concluída / rumo mudou                           | `ESTADO.md` (no encerramento — R9)                           |
  | incidente de produção                                 | postmortem + runbook (R15)                                   |
  | regra da base mudada (R18)                            | BASE + `CLAUDE.md` (projeção) no MESMO commit (R6)           |

- EXCEÇÃO DECLARADA, NUNCA SILENCIOSA: gatilho disparado sem a doc só passa
  com trailer `Docs-n/a: <motivo>` no commit; o encerramento (R9) lista os
  n/a da sessão; n/a recorrente no mesmo gatilho = mapa errado, ajustar o mapa
- O outro lado da regra: só se mantém fidedigno o que MERECE existir —
  número volátil fica no DONE da sessão (a doc guarda a POLÍTICA); lista
  gerável não se escreve à mão; APAGAR também é manutenção
- Enforcement em três camadas: o checkpoint DECLARA (DOCS TOCADAS — R1) ·
  o hook Stop PERGUNTA (R19, quando existir) · o gate docs-drift DECIDE (R6/A9)

TRÊS CICLOS DE VIDA (pastas diferentes para ciclos diferentes):
- PERENE (reescrito no lugar): how-to, runbooks, ARQUITETURA, INTEGRACAO
- APPEND-ONLY (só acrescenta — é história): DECISOES/ADRs, postmortems, CHANGELOG
- EFÊMERO (status no nome + arquivamento): ESTADO, SESSOES, sessions/,
  PENDENCIAS, briefings/, ADOCAO

ESTRUTURA em `docs/` (estado real + alvo v4.3):
- Âncoras: PROJETO.md · ESTADO.md · **MAPA.md** (índice canônico: siglas +
  "Quero → abro") · ARQUITETURA.md · AUDITORIAS.md (R17) · SESSOES.md +
  sessions/ (R9) · **PENDENCIAS.md** (quadro central P-xxx/B-xxx — v4.3) ·
  ADOCAO.md (temporário — R18) · DECISOES.md (índice append-only)
- Conteúdo por tipo (Diátaxis, nasce SOB DEMANDA pelo gatilho de escrita):
  `how-to/` (tarefa sem pressão — JÁ existe) · `runbooks/` (procedimento SOB
  PRESSÃO: deploy, rollback, restore, rotação de chaves — todo passo com
  comando copiável e saída esperada; 1 runbook por trimestre é EXECUTADO de
  verdade, sorteado — R17) · `decisions/` (ADR Nygard para decisão cara de
  reverter; D-xxx = índice, ADR = detalhe; aceito NUNCA é editado — novo ADR
  substitui) · `postmortems/` (um por incidente, BLAMELESS, ações com dono e
  prazo — R15) · `briefings/` (R20) · `reference/` (consulta pura, quando o
  canônico atual não couber mais)
- Docs existentes (INTEGRACAO.md, auditoria-2026-07.md, deploy-dokploy.md,
  motores-whatsapp.md, agent-whatzapp_api.md) são LINKADOS, não duplicados
- Raiz: BASE_CONEXOZENVO.md · CHANGELOG.md (Keep a Changelog, para HUMANOS) ·
  CLAUDE.md (ENXUTO < 200 linhas — acima disso o agente segue menos; só o
  não-inferível do código + ponteiros; a regra completa vive AQUI) · README.md
  (roteador em camadas, não manual — seções ≤10 linhas terminando em link)

FRONTMATTER (em how-to/runbooks/reference quando forem tocados):
`tipo · dono · revisado_em · validade` — revisado_em = data da última
CONFERÊNCIA, não do último commit. Validade: runbook 30–90d · how-to
90–180d · reference a cada release. Frescor vencido = doc NÃO verificada
(fila mensal — R17). DEPRECIAR EM VEZ DE APAGAR: banner "⚠️ DEPRECIADO em
<data>, substituído por <link>" e some após 2 releases.

GATILHO DE ESCRITA (documenta-se no momento da dor): decisão cara → ADR ·
incidente → postmortem + runbook · mesma pergunta 2× → how-to · >30 min para
entender o próprio sistema → explanation · armadilha descoberta → seção de
armadilhas (o agent-whatzapp_api.md §6 é o exemplo vivo).

PROJEÇÃO OPERACIONAL (`.claude/` — derivada da BASE, versionada · alvo A8):
A BASE é o CONTRATO e não encolhe; contexto enxuto é papel da projeção.
Hoje a projeção do projeto é só o `CLAUDE.md` (válido); o alvo v4.0+ é
`.claude/rules/*.md` (regras fatiadas por `paths:` — ex.: r13-tempo →
`prisma/migrations/**` · r10-fronteiras → `apps/gateway/src/modules/**` ·
r11-env → `env*.example`) + `.claude/skills/` (/abrir-sessao,
/encerrar-sessao, /checkpoint, /varredura, /briefing) + `.claude/hooks/` +
`settings.json` (R19). REGRA DE CONSISTÊNCIA: projeção é DERIVADA — delta de
versão da base atualiza BASE e projeção NO MESMO commit; gate no CI confere
versão do CLAUDE.md == versão do topo desta BASE (R6/A9).

CLASSE RUNBOOK (todo doc que afirme estado de algo externo e mutável —
proxy ALIVE, webhook do Dokploy funcionando, sessão conectada): vale pelo
dia em que foi verificado — "✔ conferido em AAAA-MM-DD via <comando>";
"está ativo ✅" sozinho NÃO vale. Verificação vencida = reconferir antes
de confiar (cadência no R17).

MÁQUINA NOVA (`docs/how-to/maquina-nova.md` — criar quando doer): três
colunas — (a) vem do git · (b) por máquina/usuário (WSL, .env local, OAuth
de MCP, auto memory) · (c) NÃO faça (ex.: `nest build` com watch rodando —
corrompe dist/; reiniciar gateway em rajada com sessão real conectada).

REGRA: código sem documentação atualizada = onda incompleta.

### R4 — VERSIONAMENTO (código + banco + API)

Código:
- SemVer + tags git a cada release · Conventional Commits em pt-BR
- main protegida; TODO trabalho em branches `feature/*` no checkout principal
  e, em sessões paralelas simultâneas, a branch do worktree (base do R9)
Banco (Prisma — forward-only):
- NUNCA editar migration aplicada (quando houver hooks R19, também BLOQUEADO
  por hook) · correção = migration nova · em prod SEMPRE
  `prisma migrate deploy` · toda migration roda nos e2e do CI · seeds idempotentes
- **Compatibilidade N-1** (habilita o rollback do R15): toda migration compatível
  com a versão ANTERIOR do código rodando — expand → migrate → contract em
  releases separados; NUNCA dropar/renomear coluna no mesmo release que para de
  usá-la; NUNCA operação que trave tabela grande. Sem isso, "rollback = trocar
  a tag" é mentira
- **Índice em tabela JÁ populada em produção**: criar SEM lock de escrita
  (`CREATE INDEX CONCURRENTLY` — não roda dentro de transação; validar o
  mecanismo do Prisma da versão instalada ANTES de usar, documentation-first R8)
API:
- O `/api` atual É a v1 de fato (node n8n publicado consome). Aditivo ok;
  breaking = `/api/v1` novo mantendo o atual (R0).
- `packages/contracts` é a fonte dos tipos — mudou payload, mudou contracts
  no MESMO commit (é gatilho do mapa do R3).

### R5 — SEGURANÇA (defesa em camadas)

Já em produção (manter e testar, não recriar):
- IAM: X-Api-Key por integração, RBAC, seats, licença Ed25519, audit log
- JWT do painel: access 15min + refresh rotation 30d (D-009), cookies
  httpOnly/Secure/SameSite=Lax (zero localStorage)
- helmet + rate limit (login 10/min) · `/metrics` por token · logs com
  credenciais redigidas · retenção (raw 7d, msgs 90d, eventos 30d, audit 180d)
Criptografia e rotação (adaptação do "2 níveis" do universal):
- Nível 1 (obrigatório): TODO segredo persistido (tokens de engine, credenciais
  META_CLOUD futuras, senhas de proxy) cifrado via `shared-kernel/crypto`, chave
  em env dedicada; rotação SEM perda: aceitar chave anterior
  (`*_PREVIOUS_KEYS`-equivalente) + comando de recriptografia; runbook em
  `docs/runbooks/rotacao-de-chaves.md` (M4)
- Nível 2 (CipherSweet/blind-index): ➖ não se aplica enquanto
  "Dados sensíveis: não" — reavaliar se o produto passar a tratar saúde/biometria
Modo teste → go-live (casa com o que o projeto JÁ faz):
- Gates de segurança/proteção só relaxam via env com default SEGURO; relaxamento
  explícito, registrado em DECISOES.md e reversível por env
  (exemplo vivo: `GUARDRAIL_ENFORCE=false` em observação — D-005/D-007)
- Checklist de virada (quando nascer fluxo novo de go-live) inclui os B-xxx
  abertos que impedem o go-live (R9/v3.8) e o relógio/NTP do servidor (R13)
Backup (M4/A1): Postgres → S3 off-site cifrado, agendado, com NOTIFICAÇÃO de
sucesso/falha e TESTE DE RESTAURAÇÃO documentado antes de considerar entregue.
O SCRIPT de backup é automação que implementa regra: tem teste de
comportamento (gera E restaura), não só de sintaxe (R6/v3.7).
CSP (adaptado): dashboard estático atrás de proxy — política CSP definida
nos headers do proxy/nginx; se apertar, validar que Vite/React não dependem de
inline não-nonce (CSP declarado que quebra o app acaba desligado).

### R6 — QUALIDADE (gates que quebram o CI)

Hoje (manter verdes): `npm run lint` · `npm run format:check` · typecheck ·
`npm run test` (Vitest e2e — SEM flake tolerado; flake = bug) · builds de
gateway e dashboard.
Regra de ouro (item 25): efeito crítico (webhook/evento/job) exige teste e2e
DE EFEITO — nunca fire-and-forget com catch silencioso.
Deltas a instalar (plano em `docs/ADOCAO.md` — A2 herdada da v3.2, A9–A10 da v4.3):
- **Secret scanning** (gitleaks) no pre-commit e CI — determinístico
  (`--no-git`, allowlist versionada); gate vermelho por segredo, nunca por ruído
- **Gate de drift env ↔ env.example** no pre-commit (toda env ativa documentada
  no example) — o boot com zod fail-fast (D-007) valida o contrato no CI
- **Pre-commit** (husky/lint-staged): lint + typecheck rápido + gitleaks + drift
- **npm audit** como gate (M4) · **coverage mínima** acordada + unit de domínio (M3)
- **Boundaries** (dependency-cruiser) no CI (M3) — fronteira executável do R10
- **Bateria única**: um comando agregado (`npm run check`) que roda TUDO —
  sem ele, "rodei tudo" é inverificável (nasce na A10; a lista viva de gates
  é o próprio script, o documento aponta)
- **Baseline de análise nunca cresce**: gate = "zero erros NOVOS vs. main";
  meta de redução trimestral registrada (R17)
- **Suíte 100% executável no ambiente canônico (CI)**; falha local conhecida
  (ex.: Chromium do wwebjs em ARM) documentada ≠ ignorável no CI
Gates de DOCUMENTAÇÃO (v4.2/v4.3 — entram na A9, caminho do gitleaks:
avisam primeiro, calibram, só então bloqueiam):
- **Integridade da doc viva**: links quebrados em docs/ = gate vermelho ·
  todo arquivo de docs/ presente no MAPA (e vice-versa) · frontmatter válido
  e frescor vencido avisa
- **docs-drift** (generalização do gate de env-drift — o único pedaço de doc
  que nunca desatualiza é o que tem gate): push que toca caminho-gatilho
  (`prisma/migrations/**`, `packages/contracts/**`, rotas/controllers,
  scripts de package.json...) SEM tocar a doc mapeada E sem trailer
  `Docs-n/a:` → vermelho dizendo QUAL doc falta; o mapeamento paths→doc vive
  no script do gate, com o MAPA DE GATILHOS do R3 como fonte; falha vazia = falha
- **Correspondência estrutural**: módulo em `apps/gateway/src/modules/` sem
  linha na tabela da ARQUITETURA.md (e vice-versa) → vermelho — o gate de
  fidedignidade mais barato contra a mentira mais cara
- **Consistência BASE ↔ projeção**: versão declarada no CLAUDE.md == versão
  no topo deste arquivo
- **Integridade do painel de sessões** (R9): todo `docs/sessions/ATIVA-*.md`
  tem linha em SESSOES.md, toda linha tem arquivo, eco de leitura preenchido
- **Catracas da varredura** (R21): duplicação não CRESCE vs baseline (jscpd),
  cobertura não CAI entre varreduras, complexidade nova dentro do teto
  (lizard ou ESLint complexity), morto não VOLTA (knip no CI)
**AUTOMAÇÃO QUE IMPLEMENTA REGRA TAMBÉM É GATEADA** (v3.7 — guard-rail sem
teste é comentário que roda): script/job que SUSTENTA regra (backup A1,
hook de agente R19, retenção, rotação de chave, smoke do artefato, coletor
guardrail-observe) recebe:
- PISO custo zero: `bash -n` em todo .sh versionado no pre-commit/CI;
  shellcheck como camada do CI (avisa local, exige no CI)
- FRACASSO SILENCIOSO exige teste de COMPORTAMENTO: backup prova que gerou
  E restaurou; guard de agente prova a RECUSA (e o caminho positivo)
- VALIDAR POR MUTAÇÃO, nunca por inspeção: quebrar de propósito e exigir
  vermelho (cuidado com mutação que PARECE inválida e não é)
- FALHA VAZIA = FALHA: gate que inspecionou ZERO alvos falha, nunca passa;
  a lista de alvos une rastreados + não rastreados
- Cada gate NOMEIA no título a regra que implementa ("Gate timestamptz (R13)")
  — é o que torna auditável a matriz regra × gate (R17)
**Higiene de custo do CI** (repo privado = minutos cotados): `paths-ignore`
poupa os jobs caros (build, e2e) em mudança só de docs — o gate de docs
continua rodando nelas; `concurrency` com cancel-in-progress por ref; job
novo no workflow = custo novo, declarar o porquê.
**Revisão adversarial** (OPCIONAL — custa tokens/minutos): REVIEW.md com o
recorte de maior risco (R4 N-1, R5 segredos, R10 fronteiras, R13 timestamptz,
contrato do node n8n) + review de PR por segundo agente; entra NÃO-bloqueante.

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
- Investigação pesada (ler um módulo inteiro, diagnóstico, caça a referência)
  roda em SUBAGENTE (Explore/general-purpose) — o resultado volta resumido e o
  contexto da sessão não incha (empurrar a conversa à compactação é perder o
  combinado — R9)
- Mudança visível no painel/API: validar com o app RODANDO (dev no WSL ou
  e2e de efeito), não só build verde — teste verde não prova tela
- O que precisa valer SEMPRE não vai em instrução: vai em hook ou permissão
  (R19, quando a projeção existir). Instrução é pedido; hook é garantia
- Toda sigla citada (M2, R5, D-010, G1–G8, P-xxx, B-xxx...) resolve em
  `docs/MAPA.md`; criou tipo novo de referência = registrar no MAPA na hora
- Sempre responder em pt-BR

### R9 — PROTOCOLO DE SESSÕES PARALELAS

Comunicação sem confirmação de leitura é esperança: toda sessão ECOA o que
leu ao abrir e escreve para quem NÃO participou ao fechar. Isolamento em
duas camadas: ARQUIVO (branch/worktree) e INTENÇÃO (escopo, avisos, pendências).

WORKTREE (v4.0 — adaptação ao projeto): sessão ÚNICA trabalha no checkout
principal em `feature/[slug]` (fluxo atual). Com DUAS+ sessões simultâneas
mexendo em CÓDIGO, usar `claude --worktree [slug]` (checkout isolado em
`.claude/worktrees/`, gitignorado; `.worktreeinclude` versionado leva .env
e afins — nasce na A8). Atenção ao custo real: worktree é checkout novo
(`npm install` + `prisma generate`) e o dev server/watch de cada worktree
precisa de portas próprias (R11).

ABERTURA (obrigatório em TODA conversa, antes de qualquer trabalho):
1. Ler `docs/ESTADO.md` (estado global)
2. Ler `docs/SESSOES.md` COMPLETO: ativas + seção 📢 Avisos + as últimas 5
   linhas do Histórico — o que acabou de concluir é onde nasce o desencontro
3. Ler `docs/PENDENCIAS.md` (quadro central P-xxx/B-xxx)
4. Criar `docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md` com: objetivo,
   escopo, fora-do-escopo, branch, status 🟢 — e o bloco **ECO DE LEITURA**
   (sessões ativas vistas, conclusões absorvidas, avisos lidos, P-xxx que
   assume). Eco vazio ou genérico = abertura INVÁLIDA
5. Adicionar linha na tabela "Sessões ativas" de SESSOES.md
ISOLAMENTO: só na própria branch, nunca na main · escopos DISJUNTOS (ideal:
1 sessão = 1 módulo) · pontos de contato globais (schema.prisma,
packages/contracts, app.module.ts, docker-compose.yml, ci.yml, CLAUDE.md)
declarados no escopo · arquivo no escopo de outra sessão ativa = PARAR e
avisar · ESTADO.md global só no encerramento.
DURANTE:
- Progresso datado no arquivo da sessão a cada checkpoint (objetivo/escopo
  vivem no ARQUIVO, nunca só na conversa — conversa longa é COMPACTADA e o
  combinado do início some do contexto; reler o ATIVA- após compactação)
- Decisão/mudança que AFETA outras sessões (provider de módulo, migration,
  env nova, rota/contrato) → registrar NA HORA na seção 📢 Avisos de SESSOES.md
- Pendência descoberta FORA do escopo → P-xxx em PENDENCIAS.md NA HORA e
  seguir no escopo; não segurar até o fim
ENCERRAMENTO:
1. Bloco Encerramento no arquivo da sessão: commits, status ✅ e RESULTADO
   escrito para quem NÃO participou (outra conversa entende sem perguntar?)
2. **RECONCILIAÇÃO DOCUMENTAL** (v4.3): rodar
   `git diff --name-only <ponto-de-partida>..HEAD` contra o MAPA DE GATILHOS
   do R3 — gatilho disparado sem doc: atualizar AGORA ou `Docs-n/a: <motivo>`;
   os n/a entram no RESULTADO. Encerrar com frase falsa na doc = sessão incompleta
3. TODA pendência do encerramento vira P-xxx em PENDENCIAS.md — pendência
   que fica só no DONE- é pendência enterrada
4. Renomear ATIVA→DONE → mover linha para Histórico (Resultado 1 linha +
   Pendências P-xxx ou —) → **Histórico acima de 15 linhas: mover as mais
   antigas para `docs/SESSOES_ARQUIVO.md`**
5. Limpar da seção 📢 os avisos desta sessão já absorvidos por todas
6. Merge/PR e SÓ ENTÃO atualizar ESTADO.md → checkpoint final com frase de
   retomada (lembrete R0: push na main dispara deploy no Dokploy — nunca em
   rajada com sessão WhatsApp real conectada)
BLOQUEIO EXTERNO (B-xxx — v3.8): ato que exige o dono/terceiro (gerar
credencial em painel, comprar proxy, aprovar mudança de DNS, publicar o node
n8n no npm — repo separado) NÃO é pendência técnica: é BLOQUEIO, vive no
TOPO do PENDENCIAS.md com: AÇÃO no imperativo · QUEM · O QUE BLOQUEIA ·
o que JÁ ESTÁ PRONTO esperando · O QUE DEVOLVER e ONDE no formato exato ·
CONTORNO em vigor + o P-xxx que o REMOVE · datas. Sessão não inicia trabalho
que dependa de B-xxx aberto; TODO checkpoint repete os B-xxx abertos.
SESSÃO INTERROMPIDA: permanece 🟢; retomar via arquivo ATIVA (e
`claude --resume` quando disponível); descartar = ⚠️ ABANDONADA com motivo +
pendências do arquivo viram P-xxx.

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
- **Identidade ≠ domínio**: usuários/auth vivem no `iam` e não acumulam
  lógica de outros módulos; agregados de domínio ligam-se por id — nunca o contrário
- ENFORCEMENT: dependency-cruiser no CI (M3) — módulo não importa internals de
  outro; shared-kernel e infra não importam modules/**; esboço de config em
  `DOCUMENTO_CONEXOZENVO_NESTJS.md` § PARTE 5. Módulo novo/renomeado sem linha
  na ARQUITETURA.md = vermelho no gate de correspondência estrutural (R6/A9)
- Módulo novo exige 3 sins: linguagem própria + ciclo de vida próprio +
  candidato plausível a serviço → DECISOES.md
- Sinergia com R9: escopo de sessão paralela = de preferência 1 módulo

### R11 — VARIÁVEIS DE AMBIENTE (.env)

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
- Edição do `.env` pelo AGENTE: mudança de env é ato do dono — quando a
  projeção `.claude/` existir (R19/A8), negada em permissão e bloqueada por hook
Multi-projeto na mesma máquina (regra viva — portas ÚNICAS por projeto):
- ConexoZenvo local: Postgres **5436** · Redis **6382** · dashboard **5174** ·
  gateway **3000** — overrides locais fora do versionamento
- Worktree é checkout novo (R9): `.env` e afins chegam via `.worktreeinclude`
  versionado (A8) — sem ele, toda sessão paralela em worktree começa quebrada

### R12 — ACESSIBILIDADE E INCLUSÃO (condicional)

O dashboard é painel interno B2B → nível RECOMENDADO (não bloqueante):
- Semântica antes de estilo (labels, foco visível, headings) ao TOCAR telas
- `eslint-plugin-jsx-a11y` quando entrar, entra como warning → error por área
- Estado nunca SÓ por cor (ex.: status de sessão = cor + texto/ícone — já é o padrão)
- Vira obrigatório (WCAG 2.2 AA + axe no CI) SE nascer fluxo público de usuário final

### R13 — TEMPO, FUSO E RELÓGIO

- Colunas de data-hora de DOMÍNIO no Prisma: `@db.Timestamptz` SEMPRE (instante
  absoluto; conversão na leitura). Colunas naive existentes: migração
  forward-only `ALTER COLUMN ... TYPE timestamptz USING ... AT TIME ZONE`
  planejada (A3) — NUNCA editar migration antiga (R4)
- Data pura (sem hora): `DATE` sem conversão de fuso
- Containers (app, workers, banco): `TZ` explícito — logs e cron alinhados
- Scheduler/BullMQ repeatable e janelas de envio: timezone EXPLÍCITO por
  configuração (o guard-rail já tem timezone por sessão — manter o padrão)
- Fronteira JS/API: API devolve ISO-8601 COM offset; dashboard NUNCA parseia
  string sem offset nem faz aritmética manual com `Date` entre fusos — para
  cálculo/formatação de data no browser, usar a API Temporal (ES2026, com
  polyfill enquanto o suporte não fechar) ou lib de data consolidada; validar
  suporte da versão instalada antes (documentation-first R8)
- Relógio do servidor: NTP ativo — drift quebra TOTP/assinaturas com timestamp
- Multi-região um dia? O dado já é absoluto (timestamptz); conversão vai à borda

### R14 — ASSETS ESTÁTICOS E MÍDIA

- `apps/dashboard` (Vite): assets da UI importados pelo build — hash no nome =
  cache imutável + cache-busting automático; nada de `?v=` manual
- `public/` do dashboard: SÓ o que exige URL fixa (favicon, robots.txt, og-image)
- S3 (MinIO/R2): SÓ mídia de usuário/sessão (já é o padrão do messaging) —
  nunca asset de marca do produto
- Referência de logo/marca centralizada em 1 componente React — trocar a marca
  = 1 arquivo

### R15 — DEPLOY DE EXCELÊNCIA (prioridade máxima)

Estado ATUAL (registrado, não escondido): auto-deploy via webhook Git na main +
build NO SERVIDOR (Dokploy) — viola "build once, promote" e "produção gated".
Migração é a onda A5 do ADOCAO.md (produção não para; nada de big-bang).
ALVO (princípios do universal, traduzidos):
1. Paridade: o que se testa é a IMAGEM (Dockerfile, entrypoint) — não só o código
2. Build once, promote: imagem buildada 1× no CI, tag = SHA, registry (GHCR);
   rebuild em servidor PROIBIDO quando o fluxo migrar. **Retenção no registry**
   (v3.3): job no próprio CI mantendo as últimas N versões, com N ≥ janela de
   rollback (ex.: 15) — estourar cota de Packages BLOQUEIA o push (deploy
   quebra por fatura); NUNCA apagar tag que ainda pode receber rollback
3. **Smoke test do artefato no CI**: subir a imagem buildada (Postgres/Redis de
   serviço) e validar por HTTP: `/health` 200 · login do painel 200 · assets do
   dashboard 200 · `POST /api/...` com X-Api-Key inválida → 401 correto.
   Dependência nova que serve rota entra na lista NO MESMO PR. Mudança em
   Dockerfile/proxy OBRIGA o smoke
4. Promoção gated para produção (manual/approval) quando houver registry;
   staging com dados SINTÉTICOS quando viável
5. Sequência de produção: backup (pg_dump) ANTES de migrations → `migrate
   deploy` → rolling update com health-gate
6. **Graceful shutdown** (crítico AQUI): SIGTERM → parar de aceitar
   envios → fechar workers BullMQ (`worker.close()` espera o job atual) →
   desconectar sessões Baileys/wwebjs LIMPO (sem logout!) → sair. Stop timeout
   do Swarm MAIOR que o job mais longo — senão é SIGKILL no meio de envio.
   Lembrete operacional: NUNCA reiniciar o gateway em rajada com sessão real
   conectada (o WhatsApp derruba a sessão)
7. Rollback: hoje = redeploy de commit anterior (lento — build no servidor);
   alvo = trocar tag da imagem (<5 min), ensaiado 1×/trimestre (R17)
8. **PROVA DE DEPLOY é o AMBIENTE mudado** (v4.1 — lição já vivida AQUI: o
   webhook do Dokploy já falhou mudo 2×): nunca o job/push verde — conferir
   commit/imagem novos no `/health` ou log do container recriado; push que não
   deployou em ~5 min = runbook do webhook (GitHub → Recent Deliveries +
   deploy manual)
PÓS-INCIDENTE (v4.2 — formaliza a regra de ouro do R6): todo incidente de
produção abre POSTMORTEM BLAMELESS em `docs/postmortems/AAAA-MM-DD-sintoma.md`
(resumo, linha do tempo, impacto, causa raiz de SISTEMA, ações com DONO e
PRAZO — ação sem dono e data é desejo). Bug de produção só fecha com:
(1) teste que o reproduz, (2) entrada no smoke se for infra/rota,
(3) parágrafo de runbook: sintoma → causa → detecção → reversão.

### R16 — HARDENING DA IMAGEM DE PRODUÇÃO

- Boot valida envs obrigatórias e falha ALTO com o nome da variável (D-007 já
  cobre; manter para TODA env nova) — 502 silencioso é inaceitável
- Conexão ao banco/Redis no boot com retry/backoff — infra pode subir depois
- Imagem não-root (gosu — já é) · permissões de volumes corrigidas no entrypoint
- Atrás do Traefik: `trustProxy` do Fastify configurado — IP real no rate
  limit/audit; scheme https correto
- Binários/deps nativas requeridos VERIFICADOS no build (ex.: Chromium do
  wwebjs, `prisma generate` antes do build) — erro de build, não de runtime
- `.dockerignore` cobre .env, node_modules, docs pesadas

### R17 — CADÊNCIA DE AUDITORIAS

Auditoria sem agenda = auditoria morta (a auditoria-2026-07 foi 1× — virou foto).
Agenda viva em `docs/AUDITORIAS.md`: cada linha com dono, última execução e
próxima. Cadências:
- CONTÍNUO (CI): npm audit · gitleaks · integridade de docs + docs-drift +
  consistência BASE↔CLAUDE.md (R6/A9) · catracas da varredura (R21) — conforme
  forem instalados
- MENSAL: triagem dos PRs automatizados de dependência (Dependabot/Renovate
  agrupados — o mensal é DECIDIR, não detectar; majors ficam para "a cada
  upgrade") · conferência de cota Actions/Packages (quando GHCR existir) ·
  auditoria da auto memory do agente (R19) · fila de FRESCOR de docs
  (revisado_em vencido → reconferir ou depreciar)
- RUNBOOK (classe runbook do R3): re-rodar os comandos de verificação na
  ABERTURA de sessão que dependa dele, ou MENSAL — o que vier antes
- TRIMESTRAL: índices/queries lentas · redução da baseline de análise ·
  TESTE DE RESTORE do backup · ENSAIO de rollback (R15) · **matriz regra ×
  gate**: regra que virou automação e ficou SEM gate (R6/v3.7), incluindo
  hooks/skills do agente (R19) · **VARREDURA COMPLETA (R21 · V0–V9)** ·
  **EXECUÇÃO REAL de 1 runbook sorteado** (runbook nunca executado é ficção)
- A CADA UPGRADE major/rc de framework ou engine (compliance de versão —
  inclui bump do Baileys) · SEMESTRAL só se "Dados sensíveis" virar "sim"

### R18 — CICLO DE VIDA DA BASE

- Arquivo canônico: `BASE_CONEXOZENVO.md` na RAIZ — porta de entrada de
  qualquer IA/humano; ao entrar no repo, procurar `BASE_*.md` ANTES de supor
- Histórico: nasceu em MODO UPGRADE (v2.1 adaptada → v3.2) em 2026-07-21
  (D-010, ondas A1–A7); atualizado v3.2 → v4.3 em 2026-08-12 (D-011, ondas
  A8–A11); diagnóstico e plano em `docs/ADOCAO.md`
- MODO UPGRADE (deltas de base futuros): o changelog do cabeçalho do
  DOCUMENTO_UNIVERSAL **É o diff** — listar os deltas entre as versões →
  aplicar SEM reescrever o preenchimento do projeto → delta que exige
  código/infra vira onda/sessão R9 própria → atualizar a projeção (CLAUDE.md
  e `.claude/` quando existir) NO MESMO commit do bump → bump da versão no
  topo + D-xxx
- ADOCAO.md arquiva quando o diagnóstico estiver 100% ✅/➖
- EVOLUÇÃO REGISTRADA (fase 2 do universal — não executar antes de a projeção
  `.claude/` estabilizar em 2+ projetos): distribuir a projeção como plugin
  do Claude Code em marketplace git privado; a BASE permanece (é contrato)

### R19 — FERRAMENTAL DE IA E AGENTES (MCP, permissões, hooks, skills, memória) — NOVO na v4.3

Ferramenta de agente NÃO passa por confirmação humana query a query: o que
ela alcança, ela alcança sozinha. R0/R1 confirmam comandos; esta regra
governa a CONFIG do agente.

CREDENCIAL E ALCANCE:
- Ferramenta de agente que fala com banco (ex.: MCP postgres): SÓ banco
  LOCAL (Postgres 5436 do dev), SÓ leitura — apontar agente para o banco de
  PRODUÇÃO do Dokploy é PROIBIDO (não há confirmação por query; viola R0)
- Wrapper/config que RECUSA host fora de localhost/127.0.0.1 e falha FECHADA
- NENHUM segredo em config versionada: config de agente aponta para wrapper
  que lê a URL do `.env` em runtime — config versionada com URL de banco é
  vazamento pior que o do .env
- Ferramenta que dispara deploy/build pago ou ação no Dokploy: NEGADA por
  padrão (Dokploy é ação operacional do dono — R0)

ALLOWLIST, NÃO HERANÇA (artefatos versionados por repo — nascem na A8):
- `.mcp.json` — o que EXISTE · `.claude/settings.json` — o que é PERMITIDO
  (permissions allow/deny/ask por ferramenta E argumento; deny de settings
  vence hook e modo de permissão) · `.claude/hooks/` — o que é FISCALIZADO
- MCP global de OUTRO projeto: deny explícito NESTE repo (não se remove a
  global; bloqueia-se aqui)
- Negados por padrão: Edit de `.env` e caminhos protegidos · migration
  aplicada · ferramenta que este projeto não declarou

ENFORCEMENT — REGRA QUE PRECISA VALER SEMPRE TEM HOOK (instrução é pedido;
hook é garantia). Catálogo mínimo do projeto (implementação na A8):
- Edit/Write → bloquear: `.env`, `prisma/migrations/*` já aplicadas (R4),
  arquivo fora do escopo da sessão (docs/ e .claude/ sempre permitidos — R9)
- Bash → bloquear: `prisma migrate reset` · `db push` destrutivo · `DROP` ·
  `rm -rf` fora de /tmp · host de banco ≠ localhost (defesa em profundidade)
- PostToolUse (*.ts) → prettier no arquivo editado
- SessionStart → injetar topo do ESTADO.md + P/B abertos (passos 1–3 do R9
  sem depender de disciplina); após compactação → reinjetar o arquivo ATIVA-
- Stop → conferir: arquivo da sessão atualizado? pendência nova virou P-xxx?
  gatilho de doc do diff atendido ou `Docs-n/a` declarado? (R3/v4.3)
- LIMITE HONESTO: o modelo pode escrever via Bash sem passar pelo hook de
  Edit → hook é a PRIMEIRA camada; pre-commit e CI continuam a camada
  inegociável ("avisa local, exige no CI")
- Hook é script e skill é automação: ambos entram no gate do v3.7 (R6) —
  bash -n/shellcheck/mutação que prova a recusa

AUTO MEMORY (memória automática do agente — LOCAL por máquina):
- A VERDADE é `docs/` versionado; auto memory é cache local — conflito →
  docs/ vence, SEMPRE. Decisão NUNCA vive só na memória do agente (é
  DECISOES.md); segredo jamais
- O projeto roda em MAIS de uma máquina (WSL + macOS): estado que só uma
  máquina enxerga é desencontro — manter na memória apenas fatos de
  AMBIENTE da máquina (portas locais, caminhos), nunca estado do projeto;
  auditoria mensal (R17)

POR MÁQUINA vs POR REPO: vem do git — `.claude/` (quando nascer), docs,
env.example; por máquina — .env local, WSL, OAuth de MCP (401 em máquina
nova é esperado), auto memory.

### R20 — BRIEFING: ACHADO QUE CRUZA FRONTEIRA (o loop de volta) — NOVO na v4.3

R18 leva a base ao projeto; o briefing traz o aprendizado do projeto de
volta à base universal (dono: Diogo). Sessão que descobre algo que não pode
corrigir sozinha — muda a BASE universal, outro repo (ex.: o node
`n8n-nodes-conexozenvo-gateway`), ou área fora do escopo — NÃO edita:
escreve o briefing e para. Escrever briefing é SEMPRE permitido, mesmo fora
do escopo; editar não é.

QUANDO (as três, juntas): 1. evidência reproduzível (arquivo/comando/log —
"seria bom se" não vale) · 2. corrigir exige sair do escopo declarado ·
3. nenhuma regra existente cobre (conferir antes).
ONDE: `docs/briefings/BRIEFING-<assunto>.md` (UM assunto por arquivo) +
linha P-xxx em PENDENCIAS.md apontando para ele.
ESTRUTURA (teto ~2 páginas): cabeçalho (para quem, sessão, data, "proposta,
não alteração") · por que existe · um bloco por achado (P1, P2...) na ordem
EVIDÊNCIA → POR QUE AS REGRAS ATUAIS NÃO PEGAM → PROPOSTA → implementação
de referência se já roda.
CONTINUIDADE (anti-retrabalho): IDs P1..Pn PERMANENTES (nunca renumerar) ·
carimbo de corte no cabeçalho ("rev N · analisado até rev N-1 · base vX.Y") ·
duas zonas: 🆕 NOVO DESDE A ÚLTIMA ANÁLISE (único trecho a analisar) e
📜 JÁ ANALISADO (1 linha por achado com veredito).
STATUS: 🆕 novo · ✅ aceito · 🔁 aceito com refinamento · ❌ recusado
(motivo + D-xxx) · 🔄 reaberto (EXIGE evidência nova).
RECEPÇÃO: cada achado vira ACEITO / REFINADO / RECUSADO com motivo em
DECISOES.md; alegação sobre ferramenta/versão é VERIFICADA na fonte antes de
virar regra. CANDIDATO DESCARTADO TAMBÉM SE REGISTRA (seção 🚫 — sem isso
ele volta na rev seguinte e consome análise de novo).

### R21 — VARREDURA E HIGIENE DE CÓDIGO (protocolo V0–V9) — NOVO na v4.3

Código morto não é neutro: é lido, mantido, copiado como exemplo e mente
sobre o que o sistema faz. Mas remover sem prova é pior que manter — o
protocolo existe para gerar a prova. Gatilho: o dono pedir ("varredura
completa", "roda tudo") — cadência mínima TRIMESTRAL (R17). Detalhe
completo por fase: `docs/DOCUMENTO_UNIVERSAL.md` § R21 e Parte 7 (não
duplicado aqui — lei 7 do R3); abaixo, o protocolo e as adaptações ao projeto.

PRINCÍPIOS: nunca achismo (todo veredito cita comando + output ou
arquivo:linha) · número volátil não se cristaliza (política na doc, número
do dia no DONE) · prova por mutação nos consertos · produção primeiro ·
todo achado termina em UM de 3 destinos (V8) · falha vazia = falha ·
entry points declarados ANTES de rodar detector · a varredura NÃO muda
comportamento (refactor funcional vira P-xxx) · auto-fix só DEPOIS do
diagnóstico revisado e OK, por tipo, em commits atômicos.

FASES:
- V0 abertura: R9 completo + branch própria; varredura conflita com toda
  sessão (escopo largo) → janela sem outras sessões ou por módulo (R10);
  definir DIFF-ALVO (desde a última varredura; 1ª vez = repo inteiro);
  diagnóstico de leitura em subagente Explore (R8)
- V1 produção primeiro: algo quebrando para usuário real AGORA? `/health`
  prod · logs do Dokploy · fila BullMQ parada · dead-letter de webhooks ·
  sessões FAILED em massa · proxies DEAD. Projeto ainda SEM rastreador de
  exceções/uptime externo (M5): a AUSÊNCIA é o primeiro achado
- V2 mecânica local: bateria única (`npm run check` — A10) EXIT=0 · e2e
  verdes com o NÚMERO do dia · catraca de cobertura (não cai entre
  varreduras) · FIDEDIGNIDADE DA DOC (v4.3): sortear 10 afirmações
  verificáveis da doc e conferir contra a realidade — afirmação falsa é
  DEFEITO (conserta na hora) e a causa (gatilho do R3 sem gate) vira P-xxx
- V3 saúde do app/imagem: versões declaradas × instaladas (Node, TS 5.9.3,
  Prisma, Baileys) · `docker build --check` sem warning · smoke do artefato
  quando existir (A5)
- V4 dependências: `npm ls` sem conflito · `npm audit` COMPLETO (sem filtro
  de severidade na varredura) · segunda opinião OSV-Scanner · overrides/pins
  (TS 5.9.3!) com comentário de motivo + data · vulnerabilidade sem fix
  upstream = P-xxx com data de reavaliação
- V5 código órfão e morto (o núcleo): declarar ENTRY POINTS antes de rodar
  qualquer detector — main.ts do gateway, módulos NestJS registrados,
  controllers/rotas, workers e processors BullMQ, listeners do EventBus,
  canal `wa:events`, jobs repeatable, seeds, scripts/, main.tsx do dashboard,
  rotas RR7, `packages/contracts` (consumido EXTERNAMENTE pelo node n8n).
  Ferramenta 🧰 do ecossistema: knip (+ busca textual negativa em strings,
  configs, YAML/CI). Classificar A (remoção segura provada) / B (suspeito —
  decisão do DONO) / C (falso positivo com ignore comentado) / D (desvio de
  padrão → P-xxx). **O QUE NÃO É MORTO neste projeto**: superfície pública
  de `/api` que o node n8n publicado ainda chama (R0/R4 — sai por
  depreciação com data, nunca por remoção) · classe de job cujo nome está
  em payload SERIALIZADO na fila Redis (apagar = falha após deploy) ·
  resolução dinâmica das engines (EngineFactory por tipo) e listeners por
  convenção · código de compat N-1 esperando a fase contract (R4) ·
  migrations aplicadas, seeds de referência, chaves de rotação (R5) ·
  assets de URL fixa do dashboard (R14). Suspeito B que a estática não
  decide → MÉTODO DO CARIMBO: log dedicado "MORTO? <id>", janela de
  observação de um ciclo COMPLETO de negócio, só então decidir
- V6 duplicação: detectar com jscpd (min-tokens calibrado; exclusões
  comentadas) — mas o JULGAMENTO é humano: mesmo CONHECIMENTO ou só mesmo
  texto? cruza fronteira de módulo (R10 — duplicação entre bounded contexts
  é frequentemente LEGÍTIMA; extrair para shared-kernel acopla) · regra dos
  três (extrai na 3ª ocorrência) · em teste, legibilidade vence DRY ·
  extração que muda comportamento = refactor → P-xxx. Clone aprovado:
  teste de caracterização → extrair → substituir UMA cópia por commit →
  prova por mutação → registrar removidos E mantidos com motivo
- V7 melhoria dirigida: HOTSPOTS = churn (git log 12 meses) × complexidade
  (ESLint complexity ou lizard) — os 5 piores viram alvos; melhoria fora de
  hotspot só com justificativa. Segurança sobre o diff-alvo:
  `/security-review` do Claude Code (1ª vez: repo inteiro) — zero
  HIGH/MEDIUM sem veredito. Simplificação em 4 dimensões (reuso ·
  simplificação · eficiência · altitude) — o que preserva comportamento
  entra na hora; o resto é recusado com motivo escrito
- V8 tratamento (a regra de ouro): TODO achado termina em 1 de 3 destinos —
  (1) DEFEITO → conserto NA HORA com teste por mutação · (2) ESTRUTURAL →
  P-xxx com evidência · (3) recusado → motivo escrito no DONE. Consertos +
  P-xxx + recusas = todos os achados, ou a varredura não terminou. Conserto
  que cria risco sem guarda → o gate nasce JUNTO (R6). Achado que pede
  mudança na BASE → briefing (R20), nunca edição direta
- V9 encerramento: re-rodar bateria + e2e após consertos · DEPLOY VIGIADO
  (sozinho, nunca junto de feature; prova de deploy = ambiente mudado — R15) ·
  DONE com números MEDIDOS comparados à varredura anterior · reduzir a
  baseline (R6) · encerramento R9 completo

### TEMPLATE DE CHECKPOINT (emitir ao fim de cada onda)

✅ CHECKPOINT — ONDA [Mx | Ax] · SESSÃO [id]
O QUE FOI FEITO: [lista objetiva]
ARQUIVOS CRIADOS/ALTERADOS: [caminhos]
PACOTES ADICIONADOS: [nome + versão + motivo]
DECISÕES REGISTRADAS: [refs no DECISOES.md]
EFEITO DE DEPLOY: [nenhum | descrever — env nova, relogin, migration...]
AÇÕES OPERACIONAIS PARA O USUÁRIO: [passos no Dokploy/DNS/etc., se houver]
CLASSE DE ERRO INTRODUZÍVEL E GATE QUE A CAPTURA: [obrigatório — se nenhum gate
existente captura, criar o gate ANTES de prosseguir]
BLOQUEADO EM VOCÊ: [B-xxx abertos que impedem de seguir, ou —] (v4.3)
DOCS TOCADAS PELO DIFF: [docs alteradas · ou "nenhuma — <motivo>"]
(obrigatório — conferir contra o MAPA DE GATILHOS do R3) (v4.3)
COMANDOS PARA VALIDAR: npm run lint · npm run format:check · npm run test ·
npm run gateway:build · npm run dashboard:build
SESSÃO ATUALIZADA: sim · ESTADO.md: [sim, se encerramento]
PARA CONTINUAR EM NOVA CONVERSA:
"Leia docs/ESTADO.md e docs/SESSOES.md e continue da onda [seguinte]"

---

## MAPA DE ADAPTAÇÃO (universal v4.3 → ConexoZenvo)

| Universal (Laravel, greenfield)      | ConexoZenvo (Node/TS, produção)                                  |
| ------------------------------------ | ----------------------------------------------------------------- |
| Fases F0–F8                          | Ondas M0–M6 + ondas de adoção (ADOCAO.md)                        |
| — (não existia)                      | **R0 Produção Primeiro** (contrato público do node n8n)          |
| Pest 4 + Larastan + Pint + Rector    | Vitest 4 + typescript-eslint + Prettier (Rector ➖ sem equivalente adotado) |
| Pest arch()                          | dependency-cruiser no CI (M3)                                     |
| composer check (bateria única)       | `npm run check` agregado (A10)                                    |
| encrypted casts + CipherSweet        | shared-kernel/crypto p/ segredos persistidos; nível 2 ➖          |
| MFA Filament + WebAuthn              | JWT httpOnly + refresh rotation (D-009) + RBAC/seats; MFA = candidato a D-xxx |
| Pulse + Sentry + /up                 | pino + prom-client + /health; alertas M5; Sentry = decisão M5    |
| spatie/laravel-backup                | pg_dump → S3 off-site + restore testado (M4/A1)                  |
| timestampTz() migrations             | Prisma `@db.Timestamptz` + migração forward-only das naive (A3)  |
| Vite::asset() Blade                  | import de asset no Vite/React (hash automático)                  |
| config:cache + Env::getOrFail        | zod fail-fast no boot (D-007)                                     |
| horizon:terminate                    | BullMQ `worker.close()` + desconexão limpa das engines           |
| Feature flag = Pennant               | config por sessão no banco (tuning sem redeploy)                 |
| php -l / view:cache no pre-commit    | typecheck rápido no pre-commit (A2)                               |
| knip/jscpd/lizard (varredura JS)     | os MESMOS — ecossistema é JS/TS nativo aqui (R21)                |
| /security-review · plugin security   | os MESMOS — Claude Code é a ferramenta do projeto (R21 V7)       |
| skills .claude/ (/abrir-sessao etc.) | alvo A8; até lá, o protocolo roda por instrução (R9 manual)      |
| worktree por sessão paralela         | worktree quando 2+ sessões tocam CÓDIGO; checkout principal na sessão única |
| GHCR + delete-package-versions       | GHCR na A5; retenção junto (R15 item 2)                          |
