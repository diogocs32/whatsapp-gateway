# Sessão: wwebjs-qualidade-max

- **Status:** 🟢 ATIVA
- **Início:** 12/08 23:43 UTC (20:43 local)
- **Objetivo:** análise fresca do motor wwebjs pós-ondas W1–W8 + elevar qualidade,
  desempenho e funcionalidade ao máximo viável AGORA. Bloco A = polimentos de
  qualidade/desempenho no motor (destaque: extração de leads em LOTE — fim dos N
  round-trips CDP por participante; presença global real; anti-flag UA por sessão =
  parte da P-012). Bloco B = W8 final (P-011 grupos avançados): membership requests,
  admin-only toggles e foto de grupo nas DUAS engines (aditivo, R0).
- **Escopo (pode tocar):** `apps/gateway/src/modules/sessions/**` (engine.port,
  wwebjs.engine, baileys.engine, session-manager) · `apps/gateway/src/modules/groups/**`
  · `apps/gateway/src/bootstrap/config.ts` (WWEBJS_* no zod) · `apps/gateway/test/**`
  · `env*.example` · docs (INTEGRACAO, PENDENCIAS, analise-wwebjs, CHANGELOG).
- **Fora do escopo:** `packages/contracts` e `schema.prisma` (sessão auth-refresh é dona
  — formalização fica na P-013) · dashboard · módulo iam · W6 restante/W7 (deferidos por
  assimetria) · recordHardSignal (exige decisão de produto — fiar a sinal real × remover
  do catálogo público com plano de versão).
- **Branch:** feature/wwebjs-qualidade-max

## Eco de leitura (abertura — R9)

- **Sessões ativas vistas:** M2 (docs/scripts) · auth-refresh (iam + contracts + prisma)
  — sem interseção com o escopo acima; contracts explicitamente evitado (P-013).
- **Avisos absorvidos:** base v4.3 (PENDENCIAS.md na abertura, eco de leitura,
  reconciliação no encerramento, checkpoint com BLOQUEADO EM VOCÊ + DOCS TOCADAS).
- **Últimas conclusões absorvidas:** as 8 sessões wwebjs de 12/08 (W1–W8b + p012):
  motor está com paridade IEngine completa, mídia S3, reconexão, purga LocalAuth,
  501 p/ não suportado, announce/restrict reais. W1–W6 pushados (origin 20a7314);
  W8/W8b/p012 mergeados SEM push.
- **Pendências assumidas:** P-011 (parte grupos avançados) · P-012 (parte anti-flag UA)
  · P2 da análise (presença degradada, groupInfo sequencial, envs fora do zod).
- **Bloqueios relevantes (não meus):** B-001 (proxy residencial) e B-002 (webVersion
  expira ~fim ago) — ações operacionais do dono, fora do código.

## Progresso

- [12/08 23:43] Abertura R9 após releitura integral do motor (1483 linhas), contrato,
  SessionManager, guardrail, config e testes. APIs confirmadas no código INSTALADO:
  wwebjs 1.34.7 (`getContactLidAndPhone:3307`, `sendPresenceAvailable:1984`,
  `approveGroupMembershipRequests:3007`, `setMessagesAdminsOnly/setInfoAdminsOnly`,
  `GroupChat.setPicture:561`) × Baileys rc13 (`groupRequestParticipantsList/Update`,
  `groupSettingUpdate`, `updateProfilePicture` — groups.d.ts).
