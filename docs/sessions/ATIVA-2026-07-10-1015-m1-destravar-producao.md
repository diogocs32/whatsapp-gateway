# Sessão: m1-destravar-producao

- **Status:** 🟢 ATIVA
- **Início:** 10/07/2026 10:15
- **Objetivo:** Onda M1 — destravar produção: O1 (re-sync Webshare), O2 (Memory Limit no Dokploy), O3 (Validate DNS) + push da main pendente e confirmação de que produção roda o código mais recente (O4 já resolvido em 04/07). Ações no Dokploy/painel são OPERACIONAIS: executadas pelo usuário com runbook desta sessão (R0).
- **Escopo (pode tocar):** `docs/` (ESTADO.md no encerramento, SESSOES.md, este arquivo, linhas O1–O3 da auditoria-2026-07.md), push da main (com autorização explícita do usuário)
- **Fora do escopo (não tocar):** `apps/**`, `packages/**`, `schema.prisma`, migrations, `ci.yml` — nenhuma linha de código nesta onda
- **Branch:** feature/m1-destravar-producao

## Estado de produção no início da sessão (10/07 ~13:14 UTC)

- `/health`: status ok · uptime 528219s (~6,1 dias, boot 04/07 ~10:39 UTC) · database/redis/storage: true · rss ~380 MB
- Prod roda `40f6132` = HEAD do origin/main (código mais recente já deployado; pendentes só os 2 commits de DOCS da M0, não pushados)
- conexozenvo.com responde 200 com TLS válido

## Plano (ordem otimizada — 1 único redeploy aplica tudo)

1. **O2 (config)**: usuário define Memory Limit no Dokploy SEM clicar Redeploy
2. **Push da main** (2 commits docs da M0) → dispara o deploy via webhook, que já sobe com o Memory Limit; observar o webhook (histórico intermitente — se não disparar em ~5 min, ver GitHub → Settings → Webhooks → Recent Deliveries e usar Deploy manual)
3. **Verificação pós-deploy**: `/health` com uptime zerado e checks true (Claude verifica via curl)
4. **O1**: usuário clica "Sync Webshare" e depois "Test All" na página Proxies do painel; restart de sessão que use proxy; critério: nenhum proxy 407 marcado ALIVE (fix do item 3 da auditoria: 407 = DEAD/PROXY_AUTH)
5. **O3**: usuário tenta "Validate DNS" no Dokploy; se persistir amarelo com site 200 + TLS ok, investigar proxy do provedor DNS e registrar desfecho
6. Atualizar auditoria (O1–O3), encerrar sessão, merge

## Progresso

- [10/07 10:15] Sessão aberta; branch criada; estado de produção coletado (health ok, ~6 dias de uptime).

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** —
- **Pendências para próxima sessão:** —
