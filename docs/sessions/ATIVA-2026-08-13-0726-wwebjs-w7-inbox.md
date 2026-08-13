# Sessão: wwebjs-w7-inbox

- **Status:** 🟢 ATIVA
- **Início:** 13/08 10:26 UTC (07:26 local)
- **Objetivo:** W7 (recurso NOVO, P-011) — **inbox + histórico**. 1º incremento:
  **backfill** do histórico da engine para o banco (`wa_messages`), para fechar o gap
  "a inbox só tem o que chega ao vivo". A LEITURA já existe e é agnóstica de engine
  (`GET /messages/conversations` + `GET /messages`, servidas de `wa_messages`); o que
  falta é POPULAR o banco com o histórico anterior à conexão. wwebjs faz via
  `getChats`/`Chat.fetchMessages` (forte); Baileys não tem `getChats` limpo → 501
  (assimetria explícita — a inbox ao vivo do Baileys segue funcionando).
- **Escopo (pode tocar):** `sessions/application/engine.port` (2 métodos novos +
  tipos) · `sessions/infrastructure/wwebjs/wwebjs.engine` (impl real) ·
  `sessions/infrastructure/baileys/baileys.engine` (501) · `sessions/application/
  session-manager` (delegators) · `messaging/**` (serviço de backfill + repo +
  rota) · `test/**` · docs (INTEGRACAO, CHANGELOG, PENDENCIAS, analise-wwebjs).
- **Fora do escopo:** `packages/contracts` (P-013, sessão auth-refresh é dona) ·
  `schema.prisma` (o backfill usa colunas existentes; sem migration) · gestão de chat
  (archive/pin/mute/markUnread) e `searchMessages` → **próximos incrementos do W7** ·
  download de mídia histórica para o S3 (histórico grava tipo/texto/timestamp, sem
  binário — pesado demais; documentar).
- **Branch:** feature/wwebjs-w7-inbox

## Eco de leitura (abertura — R9)

- **Sessões ativas vistas:** M2 (docs/scripts) · auth-refresh (iam + contracts + prisma)
  — sem interseção; `packages/contracts` evitado de propósito (P-013).
- **Avisos absorvidos:** base v4.3 (PENDENCIAS na abertura, eco de leitura, reconciliação
  + checkpoint no fim).
- **Pendências assumidas:** P-011 (parte W7 inbox/histórico).
- **Estado de produção:** deploy 13/08 confirmado (`/health` ok). Watch Paths ativo nos
  2 apps do Dokploy (docs não redeployam). O push desta onda dispara deploy — R0.
- **Descoberta que redefiniu o escopo:** a inbox de LEITURA já existe (banco), então o W7
  vira backfill, não uma inbox nova.

## Progresso

- [13/08 10:26] Abertura R9. Mapeado: `MessagePersister` (assina EventBus → `repo.save`),
  `MessageRepository` (save/listConversations/listByChat/findByKeyId…), schema `WaMessage`
  (índices `[sessionId,chatJid,timestamp]` e `[sessionId,keyId]`; unique só em
  `[sessionId,idempotencyKey]`). Backfill vai gravar DIRETO no repo (dedup por keyId em
  app, sem unique novo), sem passar pelo EventBus (não dispara webhook/reply-rate).
