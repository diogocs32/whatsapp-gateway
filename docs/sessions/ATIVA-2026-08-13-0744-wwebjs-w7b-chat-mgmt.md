# Sessão: wwebjs-w7b-chat-mgmt

- **Status:** 🟢 ATIVA
- **Início:** 13/08 10:44 UTC (07:44 local)
- **Objetivo:** W7 (P-011) — **gestão de chat** (arquivar/fixar/silenciar/marcar não-lido),
  fechando o W7 antes do deploy. Método único `setChatFlag(chatJid, flag, enabled)`.
  wwebjs completo (archiveChat/pinChat/muteChat/markChatUnread+sendSeen); **Baileys → 501**
  (chatModify de archive/markRead exige `lastMessages`/app-state sync — não verificável aqui,
  risco de falha silenciosa contra R6; mute do Baileys tem semântica ambígua). Regra do W7:
  gestão de chat é wwebjs-only por ora.
- **Escopo (pode tocar):** `sessions/application/engine.port` (tipo + método) ·
  `wwebjs.engine` (impl) · `baileys.engine` (501) · `session-manager` (delegator) ·
  `messaging` (rota + schema) · test · docs (INTEGRACAO, CHANGELOG, PENDENCIAS, ESTADO, analise).
- **Fora do escopo:** `packages/contracts` (P-013) · `schema.prisma` (sem migration) ·
  `searchMessages` (último item do W7 — próximo incremento) · gestão de chat no Baileys (futuro).
- **Branch:** feature/wwebjs-w7b-chat-mgmt

## Eco de leitura (abertura — R9)

- **Sessões ativas vistas:** M2 · auth-refresh — sem interseção; contracts evitado (P-013).
- **Pendências assumidas:** P-011 (parte gestão de chat do W7).
- **Estado:** W7 backfill mergeado (não pushado); esta sessão empilha em cima → deploy junto.
- **APIs confirmadas na lib instalada:** wwebjs 1.34.7 `archiveChat:2007`/`unarchiveChat:2021`/
  `pinChat:2035`/`unpinChat:2062`/`muteChat:2081`/`unmuteChat:2091`/`markChatUnread:2131`/
  `sendSeen:1339`. Baileys `chatModify` exige `lastMessages` p/ archive/markRead → 501.

## Progresso

- [13/08 10:44] Abertura R9. Decisão de escopo: wwebjs-only (Baileys 501) por segurança (R6).
