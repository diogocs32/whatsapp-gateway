# Sessão: estabilidade-sessoes

- **Status:** ✅ CONCLUÍDA
- **Início:** 21/07 17:30 UTC
- **Objetivo:** P0 de estabilidade do ciclo de vida de sessão WhatsApp:
  (1) mutex/serialização no start/stop/restart da engine Baileys (hoje 2 starts
  concorrentes criam 2 sockets → conflito 440); (2) `loggedOut` limpa
  credenciais e vai a STOPPED com lastError claro (hoje fica FAILED com creds
  mortas); (3) fluxo "Novo QR" real — endpoint de reset de credencial + start
  (hoje o botão do painel faz restart com creds mortas); (4) interceptor de 401
  no dashboard (signOut + redirect — hoje painel quebra em silêncio após 12h)
- **Contexto/diagnóstico:** relatório consolidado em 21/07 (conversa desta
  sessão): sem mutex no Baileys (`session-manager.service.ts:226-232` vs
  `serialize` da wwebjs) · loggedOut sem limpeza (`baileys.engine.ts:549-554`) ·
  "Gerar novo QR" = restart (`Sessions.tsx:80-91`) · sem interceptor
  (`api.ts:71-79`) · backlog P1/P2 registrado abaixo
- **Escopo (pode tocar):** apps/gateway/src/modules/sessions/** ·
  apps/dashboard/src/lib/{api.ts,auth.tsx} · apps/dashboard/src/routes/Sessions.tsx
  · apps/gateway/test/sessions*.e2e-spec.ts · packages/contracts (se rota/payload
  novo — declarado: PONTO DE CONTATO GLOBAL)
- **Fora do escopo (não tocar):** modules/guardrail (sessão M2) · docs/observacao ·
  mudanças não commitadas pré-existentes (env.example, docker-compose.yml) ·
  qualquer redeploy/restart do gateway em produção (R0 — só descrever)
- **Branch:** feature/estabilidade-sessoes (a partir da main pós-merge v3.2)

## Backlog P1/P2 (não desta sessão — futuras)

- P1: discriminar DisconnectReason (515 sem consumir tentativa; 403/badSession
  sem retry; 440 não briga) · watchdog liveness (zumbi WORKING) · auto-heal de
  DEGRADED · reconexão automática wwebjs · reidratar FAILED no boot (decisão)
- P2: pairing sem sleep(1500) fixo · timeout visível no modal de QR · limpar
  LocalAuth wwebjs no logout remoto

## Progresso

- [21/07 17:30] Sessão aberta; leitura do código-alvo
- [21/07 18:00] P0 implementado: (1) mutex `serialize` na BaileysEngine
  (start/stop/logout/reconexão serializados; reconexão re-checa `stopped` dentro
  da fila); (2) `loggedOut` → limpa creds (`clearCredentials()` extraído do
  logout) + STOPPED com lastError claro; (3) `POST /:id/new-qr` (controller +
  `SessionManager.newQr` — stop determinístico + limpeza + start, SEM
  sock.logout p/ não abrir corrida) + botão do painel usa a rota nova;
  (4) interceptor 401 (`UNAUTHORIZED_EVENT` em api.ts → AuthProvider desloga →
  RequireAuth redireciona)
- [21/07 18:05] Validação: typecheck ok · lint ok · prettier ok nos arquivos
  tocados · e2e 82/82 (3 novos p/ /new-qr) · builds gateway+dashboard ok

## Encerramento

- **Fim:** 21/07 18:15 UTC · **Entregue:** P0 completo (mutex Baileys · creds
  limpas no loggedOut · POST /:id/new-qr + botão do painel · interceptor 401)
  — e2e 82/82, builds ok · **Commits:** cfc2c60
- **Efeito de deploy:** restart único do gateway (sessões Baileys reconectam
  com creds persistidas); painel: JWT vencido passa a redirecionar ao /login
- **Pendências para próxima sessão:** P1 (DisconnectReason discriminado ·
  watchdog liveness · auto-heal DEGRADED · reconexão wwebjs · reidratar FAILED)
  e P2 (pairing sem sleep fixo · timeout no modal QR · LocalAuth no logout
  remoto) — lista completa na seção Backlog acima; unit do mutex entra na M3
