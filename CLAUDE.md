# CLAUDE.md — ConexoZenvo (WhatsApp Gateway)

Produto **EM PRODUÇÃO** (conexozenvo.com + api.conexozenvo.com, Dokploy) com contrato de API
público consumido pelo node n8n `n8n-nodes-conexozenvo-gateway` (npm). Regra nº 1: **não quebrar
produção nem o contrato da API** (R0).

## Ordem de leitura obrigatória (toda conversa, antes de qualquer trabalho — R9)

1. `docs/ESTADO.md` — estado global, onda atual, divergência dev × prod
2. `docs/SESSOES.md` COMPLETO — ativas + seção 📢 Avisos + 5 últimas do histórico
3. `docs/PENDENCIAS.md` — quadro central de pendências (P-xxx) e bloqueios (B-xxx)
4. O arquivo da sessão em `docs/sessions/ATIVA-*.md` (criar o seu se for sessão nova, com branch `feature/*` e bloco ECO DE LEITURA preenchido)

Processo completo (ondas M0–M6, regras R0–R21, template de checkpoint): `BASE_CONEXOZENVO.md` (raiz — base universal **v4.3** adaptada; R18 — a versão declarada aqui DEVE bater com o topo da BASE). Siglas e navegação: `docs/MAPA.md`. Histórico da adaptação v2.1: `DOCUMENTO_CONEXOZENVO_NESTJS.md`.

Encerramento de sessão (R9): reconciliação documental (diff × mapa de gatilhos do R3 — o que este diff tornou FALSO na doc?), pendências viram P-xxx, checkpoint com os campos BLOQUEADO EM VOCÊ e DOCS TOCADAS.

## Stack (não sugerir alternativas)

- Monorepo npm workspaces: `apps/gateway` (NestJS 11 + Fastify 5) · `apps/dashboard` (React 19 + RR7 + Vite + Tailwind 4) · `packages/contracts`
- Node >=22 (dev em Node 26/WSL) · TypeScript com **override fixo 5.9.3** (TS 6 transitivo QUEBRA o `nest build`)
- Prisma 7 (adapter pg, client gerado em `src/generated` — rodar `prisma generate` antes de buildar) · PostgreSQL 18 · BullMQ 5 + Redis (ioredis)
- Engines: Baileys 7.0.0-rc13 (principal) · whatsapp-web.js 1.34.7 (Store/leads) · zod nas bordas · Vitest 4 (e2e) · ESLint 10 + Prettier 3
- Deploy: Dokploy (Docker Swarm), imagem não-root, auto-deploy via webhook Git na main

## Comandos (executar no WSL: `wsl.exe -d Ubuntu -u diogocs32 -- bash -lc '...'`)

- `npm run dev` — gateway :3000 + dashboard :5173 (`nest start --watch` REINICIA a cada save de .ts)
- `npm run lint` · `npm run format:check` · `npm run test` (e2e, precisa da infra: `npm run infra:up`)
- `npm run gateway:build` · `npm run dashboard:build`
- Typecheck sem tocar dist: `npx tsc --noEmit -p apps/gateway/tsconfig.json` (NUNCA `nest build` com o watch rodando — corrompe `dist/`)
- Migration nova: `npm run prisma:migrate -w apps/gateway -- --name <slug>` · Em prod SEMPRE `migrate deploy`

## O que NUNCA fazer

- `prisma migrate reset` / `db push` destrutivo / editar migration já aplicada (forward-only: correção = migration nova)
- Breaking change em rota/payload de `/api` sem plano `/api/v1` (o node n8n publicado consome o contrato atual)
- jobId de BullMQ com `:` (é REJEITADO — usar `-`; já causou 24h de webhooks mudos)
- Subir a versão do TypeScript além do override 5.9.3
- Efeito crítico (webhook/evento/job) em fire-and-forget com catch silencioso SEM teste e2e de efeito (R6)
- Reiniciar o gateway em rajada com sessão WhatsApp REAL conectada (o WhatsApp derruba/loga a sessão)
- Simular ação operacional no Dokploy — descrever o passo a passo para o usuário executar (R0)
- Commitar `.env`, credenciais, ou mexer em `docs/sessions/ATIVA-*` de OUTRA sessão

## Convenções

- Conventional Commits em pt-BR (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`) · trabalho em branch `feature/*`, nunca direto na main
- Módulos = bounded contexts em `apps/gateway/src/modules/` — melhorias nascem DENTRO do módulo dono; fronteiras e tabelas donas em `docs/ARQUITETURA.md`
- Mudou payload → mudou `packages/contracts` no MESMO commit
- **Documentation-first**: consultar a doc oficial da versão INSTALADA antes de usar API de lib — os piores bugs do projeto (jobId `:`, TS 6) vieram de suposição
- Código sem documentação atualizada = onda incompleta (R3) · responder sempre em pt-BR

## Gargalos e operação

Mapa completo de armadilhas (WSL, watch, LID, deploy Dokploy, memória/Chromium): `docs/agent-whatzapp_api.md` §6/§6B.
Contrato para integradores: `docs/INTEGRACAO.md`. Backlog/auditoria: `docs/auditoria-2026-07.md`.
