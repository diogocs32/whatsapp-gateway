# 📊 ESTADO GLOBAL — ConexoZenvo

> Fonte única de verdade do projeto. Atualizado SOMENTE no encerramento de sessão (R9).
> Ordem de leitura de toda conversa: 1º este arquivo → 2º [SESSOES.md](SESSOES.md) → 3º o arquivo da sessão ativa em [sessions/](sessions/).

- **Processo:** ondas M0–M6 definidas em [`DOCUMENTO_CONEXOZENVO_NESTJS.md`](../DOCUMENTO_CONEXOZENVO_NESTJS.md) (raiz)
- **Onda atual:** M1 · Destravar produção — **CONCLUÍDA em 10/07/2026** (sessão `2026-07-10-1015-m1-destravar-producao`) — auditoria O1–O4 100% ✅
- **Próxima onda:** M2 · Guard-rail ativo (janela de observação G1–G8 → ligar `GUARDRAIL_ENFORCE`)

## Roadmap (R2)

| Onda | Objetivo                                                                             | Status        |
| ---- | ------------------------------------------------------------------------------------ | ------------- |
| M0   | Doc viva (ESTADO, SESSOES, DECISOES, ARQUITETURA, PROJETO, CHANGELOG, CLAUDE.md)     | ✅ 10/07/2026 |
| M1   | Destravar produção: O1–O3 operacionais + confirmar prod = código mais recente        | ✅ 10/07/2026 |
| M2   | Guard-rail ativo: observação G1–G8 → ligar `GUARDRAIL_ENFORCE`                       | ⬜            |
| M3   | Qualidade: testes unitários de domínio + coverage + boundaries no CI                 | ⬜            |
| M4   | Segurança: backup testado, rotação de secrets, npm audit no CI                       | ⬜            |
| M5   | Observabilidade com alertas (canal único + uptime externo)                           | ⬜            |
| M6   | Roadmaps estratégicos: ENGINE META CLOUD → multi-tenant RLS → multi-engine → /api/v1 | ⬜            |

## Estado de produção

- **Em produção:** conexozenvo.com (painel) + api.conexozenvo.com (API) no Dokploy (Docker Swarm)
- **Último deploy confirmado:** 10/07/2026 13:28 UTC — imagem de `808c175`, restart com **Memory Limit ativo** (`memoryUsedPct: 0.27` no `/health`), checks database/redis/storage true
- **Auditoria 07/2026: 100% ENCERRADA** — código (itens 3–26) e operacionais (O1–O4) todos ✅; detalhes em [auditoria-2026-07.md](auditoria-2026-07.md)
- **Proxies:** pool Webshare re-sincronizado (10/07), todos ALIVE de verdade (health-tester só aceita 2xx), sessões WORKING
- **DNS:** validado verde no Dokploy (10/07)
- **Guard-rail G1–G8:** implementado e em produção em modo OBSERVAÇÃO (`GUARDRAIL_ENFORCE=false`) — ligar é a M2
- **Node n8n** `n8n-nodes-conexozenvo-gateway`: publicado no npm (v0.4.1) — repo separado; o contrato `/api` atual é a v1 de fato (R0/R4)
- **Webhook de deploy do Dokploy:** intermitente no histórico (2 falhas em 03/07), mas disparou normal nos 2 pushes de 10/07 (~4,5 min de ciclo) — seguir observando

## Divergência dev × produção

| Onde                       | O quê                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| main = origin/main         | Adoção base v3.2 (D-010) + P0 estabilidade de sessão pushados em 21/07 — deploy via webhook (confirmar ~5 min no /health) |
| feature/m2-guardrail-ativo | Sessão M2 ativa (coletas da janela de observação) — merge no fechamento da onda              |

## Pendências operacionais

Nenhuma — O1–O4 concluídos. Observação contínua: intermitência do webhook de deploy do Dokploy (se um push não deployar em ~5 min: GitHub → Settings → Webhooks → Recent Deliveries + Deploy manual).

## Backlog de produto (fora das ondas — vira sessão R9 própria quando priorizado)

- ✅ **ENTREGUE 11/07/2026 — Escolha de proxy livre na criação de sessão** (D-008, sessão
  `2026-07-11-1753-proxy-na-criacao`): `GET /api/proxies/available` + `proxyId` opcional no
  `POST /sessions` (SINGLE/STICKY exclusivo, 1 proxy = 1 sessão) + dropdown no painel. Pendência
  residual (repo do node n8n): parâmetro `proxyId` opcional na operação de criar sessão.

## Processo (novo em 21/07 — D-010)

Base universal **v3.2** adotada: regras canônicas em `BASE_CONEXOZENVO.md` (raiz, R0–R18);
navegação de siglas em [MAPA.md](MAPA.md); agenda de auditorias em [AUDITORIAS.md](AUDITORIAS.md);
diagnóstico + ondas de adoção **A1–A7** em [ADOCAO.md](ADOCAO.md) (A1 backup é a mais urgente:
produção SEM backup do banco).

## Próximos passos

1. **M2 em curso**: coletas diárias da janela de observação até ~17/07 (sessão `2026-07-10-1040-m2-guardrail-ativo`, branch própria) → ligar `GUARDRAIL_ENFORCE` → monitorar → fechar a onda
1b. **Estabilidade de sessão — P0 ENTREGUE 21/07** (sessão `DONE-2026-07-21-1730-estabilidade-sessoes`): mutex Baileys · creds limpas no loggedOut · `POST /:id/new-qr` + botão do painel · 401 → /login. Restam P1/P2 (watchdog, auto-heal DEGRADED, DisconnectReason, reconexão wwebjs — backlog no arquivo DONE da sessão; vira sessão nova quando priorizado)
1c. **Anti-flag de sessão — CÓDIGO ENTREGUE 22/07** (sessão `DONE-2026-07-22-1700-hardening-antiban`): fingerprint realista por sessão · log de conexão sem proxy · `WA_REQUIRE_PROXY` (default false). Diagnóstico: proxies eram Webshare DATACENTER (`mode=direct`) — flag na conexão. **AÇÃO OPERACIONAL do usuário (em curso):** migrar p/ proxy RESIDENCIAL BR (adquirido — Webshare static residential, 20 IPs SP), importar em massa (`user:pass@ip:porta`, source MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no Dokploy, re-vincular. Backlog: health-tester só testa ipify (não prova reputação WhatsApp).
1d. **Adoção A1 (backup)** → A2 (gates) → A3 (fuso) — ver [ADOCAO.md](ADOCAO.md)
2. M3 · Qualidade: testes unitários de domínio, coverage, dependency-cruiser no CI + fix do lint local (`apps/gateway/auth/` nos ignores), normalizar prettier e adicionar `format:check` ao CI
3. Node n8n (repo separado): parâmetro `proxyId` na criação de sessão (D-008)
