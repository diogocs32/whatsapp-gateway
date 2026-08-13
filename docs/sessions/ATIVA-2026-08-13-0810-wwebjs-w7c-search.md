# Sessão: wwebjs-w7c-search

- **Status:** 🟢 ATIVA
- **Início:** 13/08 11:10 UTC (08:10 local)
- **Objetivo:** W7 (P-011) — **`searchMessages`**, ÚLTIMO item do W7. Busca por termo no
  texto das mensagens. Servida do **banco** (`wa_messages.text`, ILIKE) → **agnóstica de
  engine** (funciona em Baileys também, sem 501) e casa com o backfill (busca acha o que foi
  importado). Sem tocar nas engines: só repositório + rota.
- **Escopo (pode tocar):** `messaging/domain/message.repository` (método) ·
  `messaging/infrastructure/prisma-message.repository` (impl) · `messaging/interface/
  messages.controller` (rota GET /search) · test · docs (INTEGRACAO, CHANGELOG, PENDENCIAS,
  ESTADO, analise).
- **Fora do escopo:** engines (busca é DB, não store) · `packages/contracts` (P-013) ·
  `schema.prisma` (sem migration; usa `text` existente). Índice trigram/FTS = melhoria futura
  (o `contains` insensitive faz ILIKE, sem índice — ok p/ volume atual).
- **Branch:** feature/wwebjs-w7c-search

## Eco de leitura (abertura — R9)

- **Sessões ativas vistas:** M2 · auth-refresh — sem interseção; contracts evitado (P-013).
- **Pendências assumidas:** P-011 (último item do W7: searchMessages).
- **Estado:** W7 backfill + gestão de chat mergeados (não pushados); esta empilha → deploy junto,
  fechando o W7 inteiro.
- **Decisão de arquitetura:** busca no banco (não engine `searchMessages`) — agnóstica + reusa
  `toStored`/`toDto` da inbox de leitura + funciona pós-backfill. Escopo = o que está persistido.

## Progresso

- [13/08 11:10] Abertura R9.
