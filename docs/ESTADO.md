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

| Onde               | O quê                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| main local         | À FRENTE de origin/main: commits DOCS da M1 (abertura, backlog, O1–O3, encerramento) — push pendente |
| origin/main = prod | `808c175` pushado e deployado (10/07 13:28 UTC, Memory Limit ativo)                                  |

## Pendências operacionais

Nenhuma — O1–O4 concluídos. Observação contínua: intermitência do webhook de deploy do Dokploy (se um push não deployar em ~5 min: GitHub → Settings → Webhooks → Recent Deliveries + Deploy manual).

## Backlog de produto (fora das ondas — vira sessão R9 própria quando priorizado)

- **Escolha de proxy livre na criação de sessão** (pedido do usuário, 10/07/2026):
  no formulário/API de criação de sessão, oferecer a opção de conectar com proxy: exibir a LISTA
  dos proxies que NÃO estão em uso por nenhuma sessão (livres — de preferência ALIVE) para escolher
  UM, ou optar por **sem proxy**. A sessão já NASCE com o proxy atribuído (ou sem), sem passo manual
  posterior. Implementação ADITIVA (R0): listagem de proxies livres (filtro de não-atribuídos sobre
  o GET /proxies existente), campo OPCIONAL novo no POST /sessions (ex.: `proxyId`), dropdown no
  painel; exclusividade na listagem (1 proxy = 1 sessão). Módulos: proxies (dono da
  listagem/atribuição) + sessions (aceita a escolha no create). Node n8n: parâmetro novo opcional
  (aditivo) — registrar a dependência em DECISOES.md na implementação.

## Próximos passos

1. Push da main com os commits de docs da M1 (dispara redeploy — docs-only, sessões reconectam)
2. Abrir sessão da M2: definir a janela de observação do guard-rail (métricas G4/G5 por alguns dias), critérios de aceite para ligar `GUARDRAIL_ENFORCE=true`, e registrar a dependência do node n8n N1–N8 em DECISOES.md
3. Aproveitar a M3 para: fix do lint local (`apps/gateway/auth/` nos ignores do eslint), normalizar 25 arquivos no prettier e adicionar `format:check` ao CI
