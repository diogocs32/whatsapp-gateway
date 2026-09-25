> ⚠️ **SUPERSEDED (2026-07-21, D-010):** as regras de execução canônicas agora vivem em
> **`BASE_CONEXOZENVO.md` (raiz)** — base universal **v3.2** (R0–R18). Este arquivo
> permanece como histórico da adaptação v2.1 e como fonte das seções ainda referenciadas:
> § FEATURE DIRECIONADA (ENGINE META CLOUD) e § PARTE 5 (árvore de referência do módulo
> `proxies` + esboço do dependency-cruiser). Não atualizar regras aqui.

# 📘 DOCUMENTO DE PROJETO — CONEXOZENVO — v1.1

### NestJS 11 · Node 22+ · TypeScript · Prisma 7 · BullMQ 5 · Baileys 7 · React 19 · PostgreSQL · Redis · Dokploy

**Adaptado do DOCUMENTO_UNIVERSAL v2.1 (Laravel) para o ConexoZenvo — projeto Node/TS já em produção**
**v1.1: feature direcionada ENGINE META CLOUD (API oficial do WhatsApp)**

> Diferença fundamental para o documento universal: aquele inicializa um projeto
> do zero (fases F0–F8). Este opera um produto **vivo e em produção**
> (conexozenvo.com + api.conexozenvo.com), com API consumida por node n8n
> **publicado no npm**. Então as fases viram **ondas de melhoria (M0–M6)**, e a
> regra número 1 passa a ser: **não quebrar produção nem o contrato da API**.

---

## PARTE 1 — O PROMPT (copie e cole na conversa principal)

```markdown
# MELHORIAS DIRECIONADAS — CONEXOZENVO

## CONTEXTO

- O que faz: plataforma self-hosted multi-sessão de WhatsApp (envio/recepção,
  webhooks, guard-rail anti-ban, extração de leads) — Modular Monolith + DDD
- Usuários: B2B — integradores via API REST (X-Api-Key) e via community node
  n8n `n8n-nodes-conexozenvo-gateway` (PUBLICADO no npm — API é contrato público)
- Fase: PRODUÇÃO no Dokploy (conexozenvo.com + api.conexozenvo.com)
- Referência de negócio: docs/agent-whatzapp_api.md · docs/INTEGRACAO.md
- Backlog fonte: docs/auditoria-2026-07.md (P0/P1/P2 concluídos; restam O1–O4)

## STACK REAL — NÃO SUGERIR ALTERNATIVAS

- Monorepo npm workspaces: apps/gateway · apps/dashboard · packages/contracts
- Backend: NestJS 11 + Fastify 5 · Node >=22 (dev em Node 26/WSL) · TypeScript
  com OVERRIDE fixo 5.9.3 (TS 6 transitivo QUEBRA o nest build — não subir)
- ORM: Prisma 7 (@prisma/adapter-pg) · migrations forward-only
- Filas/eventos: BullMQ 5 + Redis (ioredis) · EventBus próprio no shared-kernel
  · fan-out multi-réplica via canal Redis `wa:events`
  · GOTCHA CRÍTICO: jobId do BullMQ NÃO aceita `:` — usar `-` (já nos causou
  24h de webhooks mudos; ver auditoria item 25)
- Engines WhatsApp: Baileys 7.0.0-rc13 (principal) · whatsapp-web.js 1.34.7
  (Store oficial — extração de leads em massa com número)
- Dashboard: React 19 + React Router 7 + Vite + Tailwind 4
- Logs/observabilidade: nestjs-pino (JSON em prod) · prom-client em /metrics
  (protegido por METRICS_TOKEN) · /health
- Storage: S3 (MinIO/Cloudflare R2) para mídia
- Validação: zod nas entradas
- Qualidade: ESLint 10 + typescript-eslint · Prettier 3 · Vitest 4
  (suíte e2e: 69 testes — verde é pré-condição de QUALQUER merge)
- CI: .github/workflows/ci.yml (npm ci → lint → typecheck → infra docker →
  migrations → e2e → builds)
- Deploy: Dokploy (Docker Swarm) · imagem não-root (gosu) · build no servidor
- IA: Claude Code · documentation-first (citar doc oficial antes de implementar)

## MÓDULOS EXISTENTES (apps/gateway/src/modules/ — bounded contexts, R10)

1. sessions — ciclo de vida das sessões (start/stop/restart, QR/pairing,
   autostart escalonado no boot, teto de 15s no start)
2. channels — abstração de engine (Baileys/wwebjs), conexão, proxy na
   engine — casa da futura engine META_CLOUD (ver FEATURE DIRECIONADA)
3. messaging — envio/recepção, ack, ritmo humano, mídia (upload/download S3)
4. webhooks — dispatcher, fila BullMQ, HMAC, dedup por jobId, dead-letter
5. events — timeline, SSE, ponte EventBus → consumidores
6. guardrail — G1–G8: quarentena, HTTP 423, SessionMetric, reply-rate
7. contacts — contatos, merge LID→telefone, save/block
8. groups — grupos e extração de leads
9. campaigns — campanhas
10. proxies — pool Webshare, health-tester (só 2xx = ALIVE), re-teste periódico
11. iam — F9: API keys, RBAC, usuários/seats, licença Ed25519, audit log
12. health — /health
13. observability — /metrics, contadores (cache Redis TTL 10s)

- shared-kernel/ (event-bus, result, ulid, clock, crypto)
- infra/ (prisma, redis, storage, directory)
- packages/contracts — tipos compartilhados gateway ↔ dashboard ↔ integrações
  REGRA: melhorias novas nascem DENTRO do módulo dono. Módulo novo só com os
  3 sins do R10 (linguagem própria + ciclo de vida próprio + candidato a serviço).

## FEATURE DIRECIONADA — ENGINE "META CLOUD" (API oficial do WhatsApp)

Além das engines não-oficiais (Baileys, wwebjs), o ConexoZenvo passará a
oferecer a API OFICIAL da Meta (WhatsApp Business Platform / Cloud API) como
terceiro tipo de engine — atrás do MESMO contrato de sessão/envio/webhooks.
O plano detalhado nasce como SESSÃO R9 própria dentro da M6; o escopo
diretor é este:

1. Nova engine META_CLOUD no módulo channels, atrás da abstração de engine
   existente — o cliente usa as MESMAS rotas /api de sempre; muda só o tipo
   de engine na criação da sessão (mudança ADITIVA — R0)
2. "Sessão" Meta = credenciais, não socket: WABA id + phone_number_id +
   token de system user (criptografado no banco, NUNCA logado). Sem
   QR/pairing — status da sessão = token válido + webhook subscrito
3. Recepção: endpoint de webhook do gateway PARA a Meta (GET de verificação
   com verify token + POST validado por X-Hub-Signature-256) → normalizar
   para o MESMO wa.event interno (EventBus) → timeline, SSE e webhooks de
   cliente funcionam sem nenhuma mudança
4. Envio: POST /{phone_number_id}/messages na Graph API (versão FIXADA em
   env) — respeitar a janela de atendimento de 24h (fora dela, só template
   aprovado); erros da Meta mapeados para os mesmos status/acks/exceções
   que o gateway já emite
5. Templates: mínimo viável = listar templates aprovados da WABA e enviar
   template com variáveis; CRUD completo fica para iteração seguinte
6. Guard-rail: NÃO se aplica à engine oficial (a Meta tem rate limit,
   quality rating e messaging limits próprios) — registrar a exceção por
   tipo de engine em DECISOES.md e no módulo guardrail
7. Proxies: N/A para META_CLOUD (HTTPS direto à Graph API)
8. LID: N/A — a API oficial entrega wa_id; o merge LID→telefone continua
   sendo assunto só das engines não-oficiais
   **[Corrigido 25/09/2026 (P-063): desde abr/2026 os webhooks da Cloud API
   trazem o BSUID (`user_id`) e omitem o telefone de quem ativou username,
   salvo interação anterior — a META_CLOUD também precisa mapear
   identificador↔contato. Fonte oficial e detalhe em
   docs/motores-whatsapp.md §2.9.]**
9. n8n: o node n8n-nodes-conexozenvo-gateway ganha o tipo de engine novo na
   criação de sessão (repo separado — registrar dependência em DECISOES.md)

REGRAS ESPECÍFICAS DESTA FEATURE:

- documentation-first REDOBRADO: toda chamada citada da doc oficial
  (developers.facebook.com/docs/whatsapp/cloud-api) com a versão da Graph
  API fixada — a Meta versiona e deprecia a API; nunca implementar
  "de cabeça"
- e2e com a Meta MOCKADA (fake server no teste) — a suíte do CI não pode
  depender de conta/WABA real; teste manual contra o número de teste da
  Meta documentado em docs/how-to/
- billing: conversa na Cloud API é PAGA por janela — comparativo e
  trade-offs ficam em docs/motores-whatsapp.md (documento já existente)
  **[Corrigido 25/09/2026 (P-063): a cobrança por conversa foi
  descontinuada — desde 01/07/2025 a Meta cobra por MENSAGEM de template
  entregue (developers.facebook.com/docs/whatsapp/pricing). A API oficial
  também pode ter envio limitado ou acesso removido pela Business Messaging
  Policy — não é "sem ban". Detalhe em docs/motores-whatsapp.md §2.9.]**

---

## REGRAS DE EXECUÇÃO (NÃO ALTERAR ESTA SEÇÃO)

### R0 — PRODUÇÃO PRIMEIRO (regra que não existia no universal)

- Este sistema está EM PRODUÇÃO com clientes reais e um node n8n publicado.
- NUNCA: `prisma migrate reset`, `db push` destrutivo, editar migration
  aplicada, breaking change em rota/payload de /api sem plano de versão.
- Breaking change na API = criar /api/v1 novo e manter o contrato atual
  funcionando até o node n8n (repo separado) ser atualizado e publicado.
- Toda mudança lista seu "efeito de deploy" no checkpoint (ex.: "usuários do
  painel precisarão logar de novo").
- Mudança de infra/env no Dokploy é AÇÃO OPERACIONAL: descrever passo a passo
  para o usuário executar — não simular que foi feita.

### R1 — ROADMAP E CHECKPOINTS

Ao iniciar, exiba o roadmap completo (ondas M0–M6 abaixo).
Execute UMA onda por vez. Ao final de cada onda:

1. Emita o CHECKPOINT padronizado (template no fim)
2. Atualize ESTADO.md, CHANGELOG.md e o arquivo da SESSÃO atual (R9)
3. AGUARDE meu OK antes de prosseguir
   Nunca pule ondas. Nunca execute comandos destrutivos sem confirmação.

### R2 — ONDAS DE MELHORIA (substituem as fases F0–F8 do universal)

M0 · Doc viva: criar docs/ESTADO.md, SESSOES.md, DECISOES.md, ARQUITETURA.md
APROVEITANDO o que já existe (auditoria-2026-07.md vira o backlog
inicial; INTEGRACAO.md, deploy-dokploy.md e agent-whatzapp_api.md são
referenciados, não reescritos) + CLAUDE.md na raiz com ordem de leitura
M1 · Destravar produção: itens O1–O4 da auditoria (re-sync Webshare, Memory
Limit no Dokploy, Validate DNS, S3 em prod) + confirmar que TODO commit
pendente foi pushado e deployado (fix ciclo de vida de sessão, guard-rail
G1–G8, tuning wwebjs) — produção rodando o código mais recente
M2 · Guard-rail ativo: janela de observação G1–G8 com métricas → ligar
GUARDRAIL_ENFORCE → monitorar 423/quarentena; registrar dependência do
node n8n N1–N8 (repo separado) em DECISOES.md
M3 · Qualidade e fronteiras: testes UNITÁRIOS de domínio (hoje a suíte é
~100% e2e), coverage mínima acordada, e enforcement de fronteira de
módulo no CI (dependency-cruiser ou eslint-plugin-boundaries — o
equivalente Node do Pest arch): módulo não importa internals de outro,
domínio não importa Nest/Fastify/Prisma direto onde a camada proíbe
M4 · Segurança e resiliência: backup automatizado (Postgres do Dokploy → S3
off-site) com TESTE DE RESTAURAÇÃO documentado, rotação de secrets
(API keys, JWT, licença Ed25519) com runbook, npm audit como gate do CI
M5 · Observabilidade com alertas: escolher 1 canal (Telegram | e-mail |
Slack) e alertar: erro crítico, fila parada, sessão FAILED em massa,
falha de backup, falha de deploy; uptime externo no /health; avaliar
Sentry (registrar decisão)
M6 · Roadmaps estratégicos — cada um vira SESSÃO R9 própria com plano
aprovado antes: 1º ENGINE META CLOUD (API oficial — escopo diretor na
seção FEATURE DIRECIONADA acima) · multi-tenant + RLS Postgres ·
multi-engine não-oficial (WAHA, Evolution) · versionamento /api/v1

### R3 — DOCUMENTAÇÃO VIVA (obrigatória, sempre atualizada)

Estrutura em docs/ (criada na M0, mantida para sempre):

- PROJETO.md — visão, escopo, regras de negócio (aproveitar
  agent-whatzapp_api.md e PROMPT-MESTRE-WHATSAPP-GATEWAY.md como fonte)
- ESTADO.md — estado GLOBAL consolidado: onda atual, feito, próximos passos,
  divergência dev × produção (o que está commitado mas não deployado)
- DECISOES.md — log append-only: data, decisão, motivo, alternativas
- ARQUITETURA.md — mapa dos 13 módulos, tabelas donas, dependências
  permitidas, glossário (LID, PN, guard-rail, quarentena, engine, fan-out...)
- SESSOES.md — painel de conversas paralelas (R9)
- sessions/ — um arquivo por sessão de trabalho (R9)
- CLAUDE.md (raiz) — stack, convenções, comandos, o que NUNCA fazer, e a
  ordem de leitura: 1º ESTADO.md → 2º SESSOES.md → 3º arquivo da sessão
- CHANGELOG.md — Keep a Changelog, SemVer
  Docs existentes (INTEGRACAO.md, auditoria-2026-07.md, deploy-dokploy.md,
  motores-whatsapp.md) permanecem como estão e são LINKADOS, não duplicados.
  REGRA: código sem documentação atualizada = onda incompleta.

### R4 — VERSIONAMENTO (código + banco + API)

Código:

- SemVer + tags git a cada release · Conventional Commits em pt-BR
  (feat:, fix:, docs:, refactor:, test:, chore:, perf:)
- main protegida; TODO trabalho em branches feature/\* (base do R9)
  Banco (Prisma):
- NUNCA editar migration aplicada · forward-only: correção = nova migration
- Em prod SEMPRE `prisma migrate deploy` (nunca `migrate dev`/`reset`)
- Toda migration nova roda nos e2e do CI contra banco descartável
- Seeds idempotentes para dados de referência
  API:
- Hoje: prefixo /api sem versão + node n8n publicado consumindo → o contrato
  atual É a v1 de fato. Aditivo (campo/rota nova) ok; breaking = R0.
- packages/contracts é a fonte dos tipos compartilhados — mudou payload,
  mudou contracts no MESMO commit.

### R5 — SEGURANÇA (defesa em camadas — estado real + pendências)

Já em produção (não recriar — manter e testar):

- IAM F9: X-Api-Key por integração, RBAC, seats, licença Ed25519, audit log
- JWT do painel em cookie httpOnly/Secure/SameSite=Lax (zero localStorage)
- helmet + headers no nginx · rate limit global por IP (login 10/min)
- /metrics fechado por METRICS_TOKEN · logs com Authorization/X-Api-Key
  redigidos · retenção de dados (RetentionService: raw 7d, mensagens 90d,
  eventos 30d, audit 180d)
  Pendências (entram nas ondas M4/M5):
- Backup automatizado + restauração TESTADA e documentada (runbook)
- Rotação de secrets com runbook em docs/how-to/rotacao-de-chaves.md
  (API keys, JWT secret, chave da licença em ~/.conexo-license)
- npm audit como gate no CI · revisão periódica de permissões/seats

### R6 — QUALIDADE (gates que quebram o CI)

- `npm run lint` limpo · `npm run format:check` limpo · typecheck limpo
- `npm run test` (Vitest e2e — 69 testes) 100% verde, SEM flake tolerado
  (flake = bug: ver auditoria item 22, o unhandled do ioredis era real)
- Builds de gateway e dashboard passando
- A partir da M3: teste unitário para toda regra de domínio nova, coverage
  mínima acordada, e boundaries check (fronteiras R10) verde
- Regra de ouro (aprendida no item 25): efeito colateral crítico (webhook,
  evento, job) exige teste e2e DE EFEITO — não confiar em fire-and-forget
  com catch silencioso

### R7 — MONITORAMENTO COM NOTIFICAÇÕES

- Já existe: pino JSON, prom-client /metrics, /health, contadores Redis
- M5 adiciona: canal de alerta único (Telegram | e-mail | Slack — escolher 1),
  uptime externo, alertas de erro crítico / fila parada / backup / deploy
- Painel de filas BullMQ: avaliar bull-board ou métricas Prometheus da fila
  (registrar decisão em DECISOES.md)

### R8 — COMPORTAMENTO DO CLAUDE

- Arquiteto sênior e mentor: explique decisões e trade-offs, registre em
  DECISOES.md
- DOCUMENTATION-FIRST: antes de usar API de lib (Baileys, BullMQ, Prisma,
  NestJS...), consultar a doc oficial/fonte da versão INSTALADA e citar.
  Nunca adivinhar assinatura — os dois piores bugs do projeto (jobId `:`,
  TS 6 transitivo) vieram de suposição
- Código production-ready: zod na borda, guards, DTOs, eventos, jobs
- Em dúvida entre simples e complexo: simples, e registre o porquê
- Sempre responder em pt-BR

### R9 — PROTOCOLO DE SESSÕES PARALELAS (múltiplas conversas)

Permite várias conversas simultâneas no mesmo projeto sem conflito.

ABERTURA (obrigatório em TODA conversa, antes de qualquer trabalho):

1. Ler docs/ESTADO.md (estado global)
2. Ler docs/SESSOES.md (o que as outras conversas estão fazendo AGORA)
3. Criar docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md com:
   objetivo, escopo de arquivos/pastas, fora-do-escopo, branch, status 🟢
4. Adicionar linha na tabela "Sessões ativas" de SESSOES.md
5. Criar branch própria: feature/[slug]

ISOLAMENTO:

- Cada sessão trabalha SÓ na sua branch — nunca na main
- Escopos de sessões ativas devem ser DISJUNTOS — de preferência
  1 sessão = 1 módulo de apps/gateway/src/modules/ (sinergia com R10)
- CUIDADO com os pontos de contato globais do monorepo: schema.prisma,
  packages/contracts, app.module.ts, docker-compose.yml e ci.yml são
  compartilhados — se a sessão precisa tocá-los, declarar no escopo e
  verificar que nenhuma outra sessão ativa também declara
- Se um arquivo necessário está no escopo de outra sessão ativa:
  PARAR, avisar o usuário e propor alternativa
- ESTADO.md global NÃO é editado no meio da sessão — só no encerramento

DURANTE:

- A cada checkpoint, atualizar o arquivo da sessão:
  progresso datado, arquivos alterados, próximo passo

ENCERRAMENTO:

1. Preencher bloco "Encerramento": entregue, commits, pendências · status ✅
2. Renomear ATIVA-... → DONE-...
3. Mover a linha em SESSOES.md de "Ativas" para "Histórico"
4. Merge da branch (ou PR) e SÓ ENTÃO atualizar ESTADO.md global
5. Emitir checkpoint final com a frase de retomada

SESSÃO INTERROMPIDA (conversa fechada sem concluir):

- O registro permanece 🟢 em SESSOES.md
- Retomar: "Leia docs/sessions/ATIVA-[id].md e continue essa sessão"
- Descartar: marcar ⚠️ ABANDONADA com motivo e liberar o escopo

### R10 — ARQUITETURA: MONOLITO MODULAR + DDD (mapeado no que JÁ existe)

O ConexoZenvo já nasceu Modular Monolith + DDD. A regra aqui é PRESERVAR e
ENDURECER as fronteiras, não redesenhar.

ESTRUTURA REAL (não mover sem decisão registrada):

- apps/gateway/src/modules/<modulo>/ → bounded context NestJS
  (layout de referência = módulo proxies: domain/ application/
  infrastructure/ interface/; módulos flat migram quando forem tocados)
- apps/gateway/src/shared-kernel/ → kernel mínimo: event-bus, domain-event,
  result, ulid, clock, crypto — cresce por último, nunca vira depósito
- apps/gateway/src/infra/ → prisma, redis, storage (S3), directory —
  adapters de mundo externo, nenhum conhecimento de negócio
- packages/contracts/ → contratos compartilhados entre apps e integrações

FRONTEIRAS:

- Cada tabela do schema.prisma tem UM módulo dono: só ele escreve nela
  (mapear dono por tabela em ARQUITETURA.md na M0)
- Módulo A NUNCA importa internals de B; comunicação:
  1. provider público exportado pelo .module.ts do dono (síncrono)
  2. evento de domínio via EventBus + listener/consumer (assíncrono)
- JOIN de leitura em query dedicada: permitido · escrita em tabela de outro
  módulo: PROIBIDA
- Efeito assíncrono entre módulos passa por BullMQ/EventBus — e todo consumo
  crítico tem teste de efeito (R6)
- Transação que cruza módulos = sinal de fronteira errada → DECISOES.md

ENFORCEMENT (fronteira sem verificação é fronteira imaginária):

- M3 instala dependency-cruiser (ou eslint-plugin-boundaries) com regras:
  · modules/A não importa modules/B/** (exceto o público do .module.ts)
  · shared-kernel não importa modules/**
  · infra não importa modules/\*\*
- Gate no CI junto com lint/typecheck (R6)
- Criar módulo novo exige: linguagem própria + ciclo de vida próprio +
  candidato plausível a serviço → decisão em DECISOES.md

### TEMPLATE DE CHECKPOINT (emitir ao fim de cada onda)

✅ CHECKPOINT — ONDA [Mx] · SESSÃO [id]
O QUE FOI FEITO: [lista objetiva]
ARQUIVOS CRIADOS/ALTERADOS: [caminhos]
PACOTES ADICIONADOS: [nome + versão + motivo]
DECISÕES REGISTRADAS: [refs no DECISOES.md]
EFEITO DE DEPLOY: [nenhum | descrever — ex.: exige env nova, relogin, etc.]
AÇÕES OPERACIONAIS PARA O USUÁRIO: [passos no Dokploy/DNS/etc., se houver]
COMANDOS PARA VALIDAR: npm run lint · npm run format:check · npm run test ·
npm run gateway:build · npm run dashboard:build
SESSÃO ATUALIZADA: sim · ESTADO.md: [sim, se encerramento]
PARA CONTINUAR EM NOVA CONVERSA:
"Leia docs/ESTADO.md e docs/SESSOES.md e continue da onda [Mx+1]"
```

---

## PARTE 2 — FRASES PRONTAS PARA MÚLTIPLAS CONVERSAS

**Conversa 1 (principal):** cole o prompt completo da PARTE 1.

**Abrir conversa paralela (2ª, 3ª...):**

> "Leia docs/ESTADO.md e docs/SESSOES.md. Inicie uma SESSÃO PARALELA
> conforme R9 com escopo: [ex.: módulo guardrail — ligar enforce].
> Não toque em arquivos de sessões ativas."

**Retomar sessão interrompida:**

> "Leia docs/sessions/ATIVA-[id].md e continue exatamente de onde parou."

**Encerrar a sessão atual:**

> "Encerre esta sessão conforme R9 e emita o checkpoint final."

**Ver o panorama geral (em qualquer conversa):**

> "Leia docs/SESSOES.md e me diga o que cada sessão está fazendo agora."

---

## PARTE 3 — TEMPLATES DOS ARQUIVOS

### `docs/SESSOES.md`

```markdown
# 🔀 SESSÕES DE TRABALHO — ConexoZenvo

> Painel de conversas paralelas. Toda sessão se registra aqui ao abrir.

## 🟢 Sessões ativas

| ID                                | Início      | Objetivo                | Escopo             | Branch                    |
| --------------------------------- | ----------- | ----------------------- | ------------------ | ------------------------- |
| 2026-07-10-1500-guardrail-enforce | 10/07 15:00 | Ligar GUARDRAIL_ENFORCE | modules/guardrail/ | feature/guardrail-enforce |

## ✅ Histórico (mais recente primeiro)

| ID  | Período | Entregue | Branch/PR |
| --- | ------- | -------- | --------- |
```

### `docs/sessions/ATIVA-[id].md`

```markdown
# Sessão: [slug]

- **Status:** 🟢 ATIVA
- **Início:** [data hora]
- **Objetivo:** [o que ESTA conversa vai entregar]
- **Escopo (pode tocar):** [módulo(s) + arquivos globais declarados
  (schema.prisma? contracts? ci.yml?)]
- **Fora do escopo (não tocar):** [pastas/arquivos]
- **Branch:** feature/[slug]

## Progresso

- [10/07 15:20] ...

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** —
- **Pendências para próxima sessão:** —
```

### `docs/ARQUITETURA.md` (semente — completar tabelas donas na M0)

```markdown
# 🧱 ARQUITETURA — ConexoZenvo

> Monolito modular + DDD pragmático (R10). Documento vivo.

## Mapa de módulos (apps/gateway/src/modules/)

| Módulo        | Responsabilidade                                 | Tabelas donas                  | Expõe               | Consome             |
| ------------- | ------------------------------------------------ | ------------------------------ | ------------------- | ------------------- |
| sessions      | ciclo de vida das sessões, QR/pairing, autostart | wa_sessions, wa_session_events | SessionManager      | eventos das engines |
| channels      | engines Baileys/wwebjs, conexão, proxy           | —                              | interface de engine | proxies             |
| messaging     | envio/recepção, ack, ritmo, mídia S3             | wa_messages                    | API de envio        | sessions, guardrail |
| webhooks      | dispatcher BullMQ, HMAC, dedup, dead-letter      | webhooks\_\*                   | —                   | EventBus (wa.event) |
| events        | timeline, SSE, fan-out                           | —                              | stream de eventos   | EventBus, Redis     |
| guardrail     | G1–G8, quarentena, 423, SessionMetric            | session*metrics*\*             | veredito de envio   | messaging           |
| contacts      | contatos, merge LID→telefone, block              | contacts\_\*                   | —                   | eventos de mensagem |
| groups        | grupos, extração de leads                        | groups\_\*, leads              | —                   | engines             |
| campaigns     | campanhas                                        | campaigns\_\*                  | —                   | messaging           |
| proxies       | pool Webshare, health-test, re-teste             | proxies\_\*                    | ProxyResolver       | —                   |
| iam           | API keys, RBAC, seats, licença, audit            | users, api_keys, audit_logs    | guards              | —                   |
| health        | /health                                          | —                              | —                   | —                   |
| observability | /metrics, contadores                             | —                              | —                   | Redis               |

(⚠️ tabelas donas acima são um esboço — validar contra schema.prisma na M0)

## Regras de dependência

- Permitido: módulo → shared-kernel · módulo → infra · qualquer → contracts
- Proibido: módulo → internals de outro módulo · shared-kernel → módulo ·
  infra → módulo

## Linguagem ubíqua (glossário)

| Termo      | Significado no domínio                                             |
| ---------- | ------------------------------------------------------------------ |
| LID        | id anônimo da Meta (rollout de privacidade) que esconde o telefone |
| PN         | phone number — jid tradicional com número                          |
| engine     | motor de conexão WhatsApp (Baileys ou whatsapp-web.js)             |
| guard-rail | G1–G8: regras anti-ban (ritmo, quarentena, 423)                    |
| fan-out    | replicação de wa.event entre réplicas via Redis                    |
| seat       | assento de usuário dentro da licença (IAM F9)                      |

## Decisões de fronteira

- [D-xxx] [resumo — detalhes no DECISOES.md]
```

---

## PARTE 4 — MAPA DE ADAPTAÇÃO (o que mudou vs. DOCUMENTO_UNIVERSAL v2.1)

| Universal (Laravel, greenfield)       | ConexoZenvo (Node/TS, produção)                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fases F0–F8 (kickoff → release 1.0)   | Ondas M0–M6 (doc viva → destravar prod → guard-rail → qualidade → segurança → alertas → roadmaps)                                                          |
| — (não existia)                       | **R0 Produção Primeiro**: contrato da API é público (node n8n no npm), efeito de deploy declarado, ações operacionais no Dokploy descritas e não simuladas |
| Laravel 13 + PHP 8.5                  | NestJS 11 + Fastify 5 + TS (override 5.9.3 obrigatório)                                                                                                    |
| Eloquent + migrations artisan         | Prisma 7 + `migrate deploy` (forward-only igual)                                                                                                           |
| Pest 4 + Larastan 9 + Pint + Rector   | Vitest 4 + typescript-eslint + Prettier (+ coverage na M3)                                                                                                 |
| Pest arch() como fronteira executável | dependency-cruiser / eslint-plugin-boundaries no CI (M3)                                                                                                   |
| Sanctum + /api/v1 desde o dia 1       | X-Api-Key (IAM F9 já em prod); /api atual = v1 de fato; breaking → /api/v1                                                                                 |
| MFA Filament + WebAuthn               | JWT httpOnly no painel + RBAC/seats; MFA do painel = candidato a DECISOES.md                                                                               |
| Pulse + Sentry + /up                  | pino JSON + prom-client /metrics + /health (alertas entram na M5)                                                                                          |
| spatie/laravel-backup                 | backup Postgres do Dokploy → S3 off-site + restauração testada (M4)                                                                                        |
| app/Modules/<Modulo>/ a criar         | apps/gateway/src/modules/ JÁ existe com 13 módulos — preservar e endurecer                                                                                 |
| R9 sessões paralelas                  | Mantido integral + aviso dos pontos de contato do monorepo (schema.prisma, contracts, ci.yml)                                                              |

**Por que a adaptação preserva o espírito do original:** as duas camadas de
isolamento (branch git + arquivo de sessão) e a fonte única de verdade
(ESTADO.md atualizado só no merge) independem de stack. O que muda é o chão de
fábrica: as ferramentas de gate, o ORM, o mecanismo de fronteira executável e —
principalmente — o fato de que aqui já existe produção, clientes e um contrato
público de API, o que inverte a prioridade: primeiro estabilizar e destravar o
que está pendente (M1), depois endurecer (M3–M5), e só então expandir (M6).

---

## PARTE 5 — ARQUITETURA DE REFERÊNCIA (equivalentes NestJS do original)

### A árvore anotada de um módulo (real — `proxies` é o layout de referência)

```
apps/gateway/src/modules/proxies/
├── domain/
│   ├── proxy.entity.ts                  # entidade + invariantes
│   ├── proxy-types.ts                   # tipos/enums do domínio
│   └── proxy.repository.ts              # PORTA (interface) — só existe porque
│                                        #   há implementação real para trocar
├── application/
│   ├── proxy.service.ts                 # casos de uso (orquestra o domínio)
│   └── proxy-resolver.service.ts        # serviço PÚBLICO consumido por outros
│                                        #   módulos (channels) — a "Contracts/"
├── infrastructure/
│   ├── prisma-proxy.repository.ts       # adapter Prisma da porta do domínio
│   ├── proxy-agent.factory.ts           # https/socks agent
│   ├── proxy-health-tester.ts           # só 2xx = ALIVE (auditoria item 3)
│   └── webshare.client.ts               # mundo externo isolado aqui
├── interface/
│   ├── proxies.controller.ts            # REST /api/proxies
│   └── dto.ts                           # zod DTOs
└── proxies.module.ts                    # exporta SÓ o que é público
```

Nota: módulos mais antigos (ex.: `guardrail`) ainda são flat
(controller + service + module). Padronização é INCREMENTAL: migra para o
layout acima quando o módulo for tocado — nunca em big-bang.

### Comunicação entre módulos — os dois únicos caminhos

```typescript
// 1) SÍNCRONO — quando o chamador precisa da resposta agora.
//    channels depende do provider PÚBLICO exportado pelo ProxiesModule,
//    nunca de infrastructure/ dele:
constructor(private readonly proxyResolver: ProxyResolverService) {}
const proxy = await this.proxyResolver.resolve(sessionId);

// 2) ASSÍNCRONO — quando é reação a um fato do negócio.
//    O módulo dono publica no EventBus (shared-kernel); o consumidor assina:
this.eventBus.publish(mensagemEntregue);            // messaging publica o fato
this.eventBus.subscribe('message.ack', (e) => ...); // guardrail reage (métrica)
// Efeito crítico (webhook, job)? Vai para a fila BullMQ — com jobId SEM ':'
// e com teste e2e de efeito (R6).
```

### Fronteira executável (dependency-cruiser — vai no CI na M3, gate do R6)

```javascript
// .dependency-cruiser.cjs — equivalente Node do Pest arch() (esboço; afinar na M3)
module.exports = {
  forbidden: [
    {
      name: 'modulo-nao-importa-internals-de-outro',
      severity: 'error',
      from: { path: '^apps/gateway/src/modules/([^/]+)/' },
      // $1 = o próprio módulo; qualquer OUTRO módulo só via .module.ts (público)
      to: {
        path: '^apps/gateway/src/modules/(?!$1)[^/]+/(domain|application|infrastructure|interface)/',
      },
    },
    {
      name: 'shared-kernel-nao-conhece-modulos',
      severity: 'error',
      from: { path: '^apps/gateway/src/shared-kernel/' },
      to: { path: '^apps/gateway/src/modules/' },
    },
    {
      name: 'infra-nao-conhece-modulos',
      severity: 'error',
      from: { path: '^apps/gateway/src/infra/' },
      to: { path: '^apps/gateway/src/modules/' },
    },
  ],
};
```

### Quando criar (ou dividir) um módulo

Três "sim" ao mesmo tempo: **linguagem própria** (o negócio usa termos que só
existem ali), **ciclo de vida próprio** (muda por motivos diferentes dos
vizinhos) e **candidato plausível a serviço** um dia. Um "sim" só não basta —
na dúvida, deixe dentro do módulo atual e anote a suspeita em DECISOES.md.
Dividir cedo demais custa mais caro que dividir tarde. (Os 13 módulos atuais
já passaram nesse teste — a régua vale para os PRÓXIMOS.)

### Por que este formato

O monolito modular entrega o que microserviço promete (fronteiras, trabalho
paralelo, extração futura) sem pagar o que microserviço cobra (rede, deploy
distribuído, consistência eventual obrigatória) — e no ConexoZenvo isso não é
teoria: o fan-out multi-réplica (auditoria item 20) e o sharding futuro de
sessões só são viáveis porque os módulos já se falam por eventos. O DDD entra
na dose pragmática: bounded contexts e invariantes fortes sim, cerimônia de
camada vazia não — a entidade convive com o Prisma, o banco é a primeira linha
dos invariantes (constraints), e a porta/repository só existe onde há duas
implementações reais (ex.: `proxy.repository.ts`). E o encaixe com o R9 é
direto: escopos disjuntos de sessões paralelas viram simplesmente "uma sessão
= um módulo" — a arquitetura e o protocolo de trabalho desenham a mesma
fronteira.
