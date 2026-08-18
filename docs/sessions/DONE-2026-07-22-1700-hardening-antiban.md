# Sessão: hardening-antiban

- **Status:** ✅ CONCLUÍDA
- **Início:** 22/07 17:00 UTC · **Fim:** 22/07 17:25 UTC
- **Objetivo:** hardening de código contra flag de automação do WhatsApp (após
  diagnóstico: 2 sessões flagadas na conexão). 3 pontos: (1) fingerprint de
  browser realista e estável por sessão; (2) log de conexão SEM proxy (ponto
  cego); (3) guard opcional que recusa conectar sem proxy vivo.
- **Contexto/diagnóstico (conversa 22/07):** proxy ESTAVA atribuído (SINGLE,
  Webshare) — meu 1º diagnóstico "sem proxy" foi erro de consulta (rota de proxy
  indexa por ULID, consultei por nome → default NONE). Causas reais do flag:
  (a) Webshare = DATACENTER (`mode=direct`, webshare.client.ts:42) — só o usuário
  resolve migrando p/ residencial/4G; (b) fingerprint estático "WhatsApp Gateway";
  (c) churn de re-vínculo (Diogo meJid :19; DIOGO_OWER recriada várias vezes + o
  loop 440 já corrigido ontem). Esta sessão ataca (b) e o ponto cego; o guard
  ajuda a evitar o vazamento silencioso pelo IP do servidor.
- **Escopo (tocado):** modules/sessions/infrastructure/baileys/ (novo
  browser-fingerprint.ts + baileys.engine.ts) · sessions/application/
  session-manager.service.ts · modules/proxies/application/proxy-resolver.service.ts
  · bootstrap/config.ts · env.example + env.production.example · test/
  browser-fingerprint.e2e-spec.ts
- **Fora do escopo:** troca de provedor de proxy (operacional — usuário) ·
  módulo guardrail · painel · contracts (nada mudou no contrato /api)
- **Branch:** feature/hardening-antiban (a partir da main pós-refresh+P0)

## Progresso

- [22/07 17:20] Implementado: (1) browser-fingerprint.ts — pick determinístico
  (FNV-1a por sessionId) de 6 fingerprints desktop reais; baileys.engine usa
  `browserFingerprint(sessionId)` no lugar de ['WhatsApp Gateway',...]; (2)
  proxy-resolver.resolveAgent loga WARN quando conecta sem proxy, distinguindo
  NONE intencional × SINGLE-sem-vivo × candidatos DEAD; (3) `WA_REQUIRE_PROXY`
  (envBool default false) → deps.requireProxy → baileys recusa conectar (FAILED
  - stopped) se sem agent; documentado nos 2 env.example.
- [22/07 17:25] Validação: typecheck ok · lint ok · prettier ok · e2e 91/91
  (4 novos do fingerprint) · builds gateway+dashboard ok.

## Encerramento

- **Entregue:** fingerprint realista por sessão + fim do ponto cego (log de
  conexão sem proxy) + guard opcional WA_REQUIRE_PROXY · **Commits:** (a preencher)
- **Efeito de deploy:** fingerprint novo só aparece em Aparelhos Conectados
  após RE-VÍNCULO (sessão já linkada mantém o antigo até re-escanear QR).
  `WA_REQUIRE_PROXY` default false → sem efeito até ligar no Dokploy.
- **Pendências:** OPERACIONAL — migrar Webshare (datacenter) → residencial/4G
  BR (causa nº 1 do flag; só o usuário faz). Depois: atribuir proxy a todas as
  sessões e ligar WA_REQUIRE_PROXY=true. Backlog: health-tester testar contra
  destino do WhatsApp (hoje só ipify — não prova reputação); inconsistência
  rótulo×id na atribuição da DIOGO_OWER (re-salvar).
