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
| main local (à frente do origin) | Upgrade base v4.3 (D-011, 12/08 — só docs/processo) mergeado e AGUARDANDO push (push dispara redeploy no Dokploy; sem efeito de runtime, mas evitar rajada com sessão real conectada) |
| feature/m2-guardrail-ativo | Sessão M2 ativa (coletas da janela de observação) — merge no fechamento da onda              |
| feature/auth-refresh-rotation | Sessão auth-refresh ativa (D-009) — merge no fechamento                                   |

## Pendências operacionais

Nenhuma — O1–O4 concluídos. Observação contínua: intermitência do webhook de deploy do Dokploy (se um push não deployar em ~5 min: GitHub → Settings → Webhooks → Recent Deliveries + Deploy manual).

## Backlog de produto (fora das ondas — vira sessão R9 própria quando priorizado)

- ✅ **ENTREGUE 11/07/2026 — Escolha de proxy livre na criação de sessão** (D-008, sessão
  `2026-07-11-1753-proxy-na-criacao`): `GET /api/proxies/available` + `proxyId` opcional no
  `POST /sessions` (SINGLE/STICKY exclusivo, 1 proxy = 1 sessão) + dropdown no painel. Pendência
  residual (repo do node n8n): parâmetro `proxyId` opcional na operação de criar sessão.

## Processo (atualizado em 12/08 — D-011)

Base universal **v4.3** adotada (upgrade da v3.2 — D-010/D-011): regras canônicas em
`BASE_CONEXOZENVO.md` (raiz, R0–R21). Novidades v4.3 EM VIGOR: abertura de sessão lê
também [PENDENCIAS.md](PENDENCIAS.md) (quadro P-xxx/B-xxx) e preenche ECO DE LEITURA;
SESSOES.md tem seção 📢 Avisos; encerramento faz reconciliação documental (mapa de
gatilhos do R3); checkpoint ganhou BLOQUEADO EM VOCÊ + DOCS TOCADAS. Navegação em
[MAPA.md](MAPA.md); auditorias em [AUDITORIAS.md](AUDITORIAS.md); ondas de adoção
**A1–A7** (v3.2) + **A8–A11** (v4.3: projeção `.claude/`, gates de docs, bateria
única + varredura, reorganização docs/) em [ADOCAO.md](ADOCAO.md) — A1 backup segue
sendo a mais urgente: produção SEM backup do banco.

## Próximos passos

1. **M2 em curso**: coletas diárias da janela de observação até ~17/07 (sessão `2026-07-10-1040-m2-guardrail-ativo`, branch própria) → ligar `GUARDRAIL_ENFORCE` → monitorar → fechar a onda
1b. **Estabilidade de sessão — P0 ENTREGUE 21/07** (sessão `DONE-2026-07-21-1730-estabilidade-sessoes`): mutex Baileys · creds limpas no loggedOut · `POST /:id/new-qr` + botão do painel · 401 → /login. Restam P1/P2 (watchdog, auto-heal DEGRADED, DisconnectReason, reconexão wwebjs — backlog no arquivo DONE da sessão; vira sessão nova quando priorizado)
1c. **Anti-flag de sessão — CÓDIGO ENTREGUE 22/07** (sessão `DONE-2026-07-22-1700-hardening-antiban`): fingerprint realista por sessão · log de conexão sem proxy · `WA_REQUIRE_PROXY` (default false). Diagnóstico: proxies eram Webshare DATACENTER (`mode=direct`) — flag na conexão. **AÇÃO OPERACIONAL do usuário (em curso):** migrar p/ proxy RESIDENCIAL BR (adquirido — Webshare static residential, 20 IPs SP), importar em massa (`user:pass@ip:porta`, source MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no Dokploy, re-vincular. Backlog: health-tester só testa ipify (não prova reputação WhatsApp).
1d. **Adoção A1 (backup)** → A2 (gates) → A3 (fuso) · da v4.3: A8 (`.claude/`) →
   A9 (gates de docs) → A10 (bateria única + varredura) — ver [ADOCAO.md](ADOCAO.md);
   pendências e bloqueios agora centralizados em [PENDENCIAS.md](PENDENCIAS.md)
   (B-001 = migração proxy residencial, em curso com o usuário)
1e. **Motor wwebjs — ANÁLISE ENTREGUE 12/08** (`analise-wwebjs-2026-08.md`): 3 defeitos P0, 12/28 métodos `nope()`, zero e2e, webVersion a semanas de expirar. Plano em ondas (P-007 W1 → P-008 W2 mídia → P-009 W3 ciclo de vida → P-010 W4 superfície → P-011 W5–W8 recursos novos).
1o. **wwebjs P-012 (correção) — announce/restrict reais 12/08** (sessão `DONE-…-1959-wwebjs-p012-announce-restrict`): grupos do wwebjs devolvem `announce`/`restrict` REAIS (era `false` fixo). Item "dashboard por engine" da P-012 virou obsoleto (W4). Restam da P-012: `recordHardSignal` morto e anti-flag do wwebjs. **NÃO pushado.**
1n. **wwebjs W8 (recurso NOVO) — ENTREGUE 12/08** (sessões `DONE-…-1941-wwebjs-w8-perfil-conta` e `DONE-…-1947-wwebjs-w8b-foto-perfil`): **perfil da conta completo** — `POST /profile/status`, `/profile/name` e `/profile/photo` nas 2 engines, aditivo. **NÃO pushado ainda** (posterior ao push das W1–W6). Restam de recurso novo: membership requests, admin-only toggles, W7 inbox (assimétrico).
1m. **PUSH das W1–W6 FEITO 12/08** (origin/main = 20a7314); a W8 acima ainda precisa de push próprio. — 7 ondas de código mergeadas na main local, sem deploy. **Checklist de validação em produção pronto:** [how-to/smoke-test-wwebjs-w1-w6.md](how-to/smoke-test-wwebjs-w1-w6.md) (pré-push R0, prova de deploy, smoke por onda, rollback, B-001/B-002). Fazer o push numa janela sem sessão wwebjs real conectada.
1l. **wwebjs W6 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1921-wwebjs-w6-webhook-reacoes`): webhook mais rico — evento **`message.reaction`** (reações recebidas) nas 2 engines, aditivo. Mergeado, **aguardando push**. Restam do W6: edição, revogação, votos (`vote_update`), `change_state`, `group_*` (deferidos — Baileys exige protocolMessage/decifrar).
1k. **wwebjs W5b (recurso NOVO) — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1902-wwebjs-w5b-location-poll`): **enviar localização** (`POST /messages/location`) e **enviar enquete** (`POST /messages/poll`) nas 2 engines, aditivo. Mergeado, **aguardando push**. Deferidos com motivo: reply/quote (Baileys sem `raw` inbound), captura de votos, vCard.
1j. **wwebjs W5 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1746-wwebjs-w5-mensagens-ricas`): **reações** (`POST /messages/:msgId/reaction`) e **menções** (`mentions[]` em text/media-url) nas DUAS engines, aditivo (R0). Mergeado, **aguardando push**. Restam do W5: reply/quote, poll+vote_update, localização, vCard (P-011); formalizar contracts = P-013 (bloqueado por R9 na sessão auth-refresh).
1i. **wwebjs W4 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1736-wwebjs-w4-superficie`, P-010 ✅): os 14 métodos antes "não suportados" (grupos completos, checkNumbers, profilePicture, setBlock, canais beta) IMPLEMENTADOS — **paridade IEngine wwebjs × Baileys**. Mergeado, **aguardando push**. Do plano wwebjs resta só recurso NOVO (P-011 W5–W8) + polimentos (P-012).
1h. **wwebjs W3 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1723-wwebjs-w3-ciclo-vida`, P-009 ✅): fim do vazamento de perfil Chromium no DELETE + `new-qr` recupera sessão wwebjs (limpa LocalAuth em disco) + `destroy` com teto + `qrBase64`/cache com teto + `nope()`→HTTP 501. Mergeado, **aguardando push**. Próximo: W4 (implementar os 12 `nope()` — API existe na lib; P-010).
1g. **wwebjs W2 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1715-wwebjs-w2-midia`, P-008 ✅): mídia no S3 nas duas direções (fim do 404 em `GET /media` para wwebjs) + envelope de webhook com a engine REAL (`engine:"wwebjs"`, antes tudo saía `baileys`) + `sendMediaAsDocument`/`Sticker` + guard de `sent` null. Mergeado, **aguardando push** (deploy). Próximo: W3 (ciclo de vida — limpar LocalAuth no logout/new-qr/remove; P-009).
1f. **wwebjs W1 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1702-wwebjs-w1-estabilidade`): reconexão automática + fim do `start` no-op + guard `WA_REQUIRE_PROXY` no wwebjs (fecha o vazamento de IP) + 1º teste da engine real (mergeado, **aguardando push** = deploy). **Restam ações operacionais do dono:** B-002 (revalidar `WWEBJS_WEB_VERSION` no Dokploy antes de expirar ~fim ago) e B-001 (proxy residencial por sessão — agora o `WA_REQUIRE_PROXY=true` protege o wwebjs de verdade). **Deploy R0:** o push reinicia o gateway — não fazer em rajada com sessão wwebjs real conectada.
2. M3 · Qualidade: testes unitários de domínio, coverage, dependency-cruiser no CI + fix do lint local (`apps/gateway/auth/` nos ignores), normalizar prettier e adicionar `format:check` ao CI
3. Node n8n (repo separado): parâmetro `proxyId` na criação de sessão (D-008)
