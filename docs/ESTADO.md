# 📊 ESTADO GLOBAL — ConexoZenvo

> Fonte única de verdade do projeto. Atualizado SOMENTE no encerramento de sessão (R9).
> Ordem de leitura de toda conversa: 1º este arquivo → 2º [SESSOES.md](SESSOES.md) → 3º o arquivo da sessão ativa em [sessions/](sessions/).

- **Processo:** ondas M0–M6 definidas em [`DOCUMENTO_CONEXOZENVO_NESTJS.md`](../DOCUMENTO_CONEXOZENVO_NESTJS.md) (raiz)
- **Onda atual:** M0 · Doc viva — **CONCLUÍDA e mergeada na main em 10/07/2026** (sessão `2026-07-10-1000-m0-doc-viva`) — **push pendente**
- **Próxima onda:** M1 · Destravar produção (itens operacionais O1–O3 da [auditoria](auditoria-2026-07.md))

## Roadmap (R2)

| Onda | Objetivo                                                                             | Status        |
| ---- | ------------------------------------------------------------------------------------ | ------------- |
| M0   | Doc viva (ESTADO, SESSOES, DECISOES, ARQUITETURA, PROJETO, CHANGELOG, CLAUDE.md)     | ✅ 10/07/2026 |
| M1   | Destravar produção: O1–O3 operacionais + confirmar prod = código mais recente        | ⬜            |
| M2   | Guard-rail ativo: observação G1–G8 → ligar `GUARDRAIL_ENFORCE`                       | ⬜            |
| M3   | Qualidade: testes unitários de domínio + coverage + boundaries no CI                 | ⬜            |
| M4   | Segurança: backup testado, rotação de secrets, npm audit no CI                       | ⬜            |
| M5   | Observabilidade com alertas (canal único + uptime externo)                           | ⬜            |
| M6   | Roadmaps estratégicos: ENGINE META CLOUD → multi-tenant RLS → multi-engine → /api/v1 | ⬜            |

## Estado de produção

- **Em produção:** conexozenvo.com (painel) + api.conexozenvo.com (API) no Dokploy (Docker Swarm)
- **Último deploy confirmado:** 04/07/2026 (~10:31 UTC) — commit `40f6132` (HEAD da main), `storage: true` no `/health`
- **Auditoria 07/2026:** backlog de CÓDIGO 100% concluído (itens 3–26); detalhes em [auditoria-2026-07.md](auditoria-2026-07.md)
- **O4 (S3 em prod):** ✅ resolvido 04/07 — Cloudflare R2, bucket `conexozenvo-wa-media`
- **Guard-rail G1–G8:** implementado e em produção em modo OBSERVAÇÃO (`GUARDRAIL_ENFORCE=false`) — ligar é a M2
- **Node n8n** `n8n-nodes-conexozenvo-gateway`: publicado no npm (v0.4.1) — repo separado; o contrato `/api` atual é a v1 de fato (R0/R4)

## Divergência dev × produção

| Onde               | O quê                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| main local         | À FRENTE de origin/main: commits da M0 (só docs) mergeados e **não pushados** — o push dispara redeploy no Dokploy |
| origin/main = prod | `40f6132` pushado e deployado (04/07, storage ok)                                                                  |

## Pendências operacionais (M1 — fazer no Dokploy/dashboard de prod)

1. **O1** — Re-sync Webshare + restart de sessão (credencial de proxy divergente no banco)
2. **O2** — Memory Limit ~1.5–2 GB no gateway (Dokploy → Advanced → Resources) + Redeploy
3. **O3** — Resolver "Validate DNS" amarelo do domínio no Dokploy
4. Investigar webhook de deploy intermitente do Dokploy (2 ocorrências de push sem disparo — GitHub → Webhooks → Recent Deliveries)

## Próximos passos

1. Push da main quando o usuário decidir (efeito: redeploy automático via webhook do Dokploy — sessões reconectam)
2. Abrir sessão da M1 (operacional, guiada — ações no Dokploy são do usuário, R0)
