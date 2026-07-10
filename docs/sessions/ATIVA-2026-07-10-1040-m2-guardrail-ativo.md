# Sessão: m2-guardrail-ativo

- **Status:** 🟢 ATIVA
- **Início:** 10/07/2026 10:40
- **Objetivo:** Onda M2 — guard-rail ativo: (1) instrumentar e conduzir a janela de observação G1–G8 (≥7 dias, coleta diária de targetState vs estado real), (2) testar o 423 nos fluxos n8n via override manual, (3) ligar `GUARDRAIL_ENFORCE=true` no Dokploy (ação do usuário, R0) e monitorar 48–72h. Dependência do node n8n N1–N8 registrada (D-006).
- **Escopo (pode tocar):** `docs/**` (how-to, DECISOES, observacao/, este arquivo, SESSOES, ESTADO no encerramento), `scripts/guardrail-observe.mjs` (novo, read-only sobre a API), `apps/gateway/env.production.example` e — **ampliação autorizada pelo usuário em 10/07 (fix D-007)** — `apps/gateway/src/bootstrap/config.ts` + `apps/gateway/test/config.e2e-spec.ts`
- **Fora do escopo (não tocar):** resto de `apps/**`, `packages/**`, `schema.prisma`, migrations, `ci.yml`
- **Branch:** feature/m2-guardrail-ativo

## Critérios de aceite (espelho do how-to)

1. ≥ 7 dias de janela com ≥ 5 coletas
2. Zero falso-positivo de quarentena em sessão saudável
3. Amostras conscientes (reliable ou aquecimento aceito)
4. Teste 423 no n8n executado e aprovado (override manual → envio cold → 423 → N7 re-enfileira → desfazer)
5. Rollback conhecido (REMOVER a env `GUARDRAIL_ENFORCE` + redeploy — nunca `=false`, ver pegadinha do coerce.boolean)

## Progresso

- [10/07 10:40] Sessão aberta; branch criada. Leitura do guardrail real: `evaluate()` devolve `currentState`/`targetState`/`applied`/`replyRate`/`sample`/`reliable`/`fleetMedian`/`baseline`/`reason`; em observação nada é aplicado (só override manual bloqueia); limiares tunáveis em runtime via `PATCH /guardrail/config` (enforce é ENV, exige redeploy).
- [10/07 10:50] Criados: `scripts/guardrail-observe.mjs` (coletor JSONL + tabela resumo), `docs/how-to/observacao-guardrail-m2.md` (procedimento + critérios + flip + rollback), D-005 e D-006 no DECISOES.md.
- [10/07 10:50] **Aguardando**: 1ª coleta pelo usuário (precisa de API key ADMIN/OPERATOR: `GATEWAY_API_KEY=... node scripts/guardrail-observe.mjs`). Janela alvo: 10/07 → 17/07/2026.
- [10/07 11:05] **BUG LATENTE ENCONTRADO** (a pedido do usuário, documentando envs no env.production.example): `GUARDRAIL_ENFORCE`, `DB_SSL` e `S3_FORCE_PATH_STYLE` usam `z.coerce.boolean()` (`config.ts:22,44,62`) = `Boolean(texto)` → **"false"/"0" viram TRUE**. Consequências: (a) `GUARDRAIL_ENFORCE=false` no Dokploy LIGARIA o enforce; (b) o rollback documentado como "=false" NÃO funcionaria (corrigido no how-to: REMOVER a env); (c) o exemplo antigo `DB_SSL=false` era armadilha; (d) impossível desligar `S3_FORCE_PATH_STYLE` por env (AWS S3 inviável). env.production.example e how-to corrigidos (docs). **Fix de código proposto** (parser de boolean de env: true/1/yes/on): fora do escopo declarado desta sessão — aguardando decisão do usuário (recomendado ANTES do flip da M2).
- [10/07 11:10] **FIX D-007 APLICADO** (autorizado pelo usuário): helper `envBool` no `config.ts` (true/1/yes/on · false/0/no/off · inválido = boot falha) nas 3 envs; teste de regressão `test/config.e2e-spec.ts` (5 casos). Validação: tsc ok, spec 5/5, **suíte completa 74/74** (infra docker local). env.production.example e how-to atualizados para a semântica nova.
- [10/07 11:20] Merge intermediário AUTORIZADO pelo usuário: branch mergeada na main e pushada (fix D-007 + coletor + docs vão para produção antes do fechamento da onda — a sessão CONTINUA na branch para a janela de observação). Deploy monitorado via /health.
- [10/07 14:18 UTC] Deploy do fix D-007 confirmado em prod (`80b1670`): boot limpo com o parser fail-fast, checks verdes, memoryUsedPct 0.26.
- [10/07 14:22 UTC] **COLETA 1/≥5** (commit `6f81f61`): config efetiva ok (enforce=false, defaults). Sessão "Diogo" (Baileys, WORKING): reply 68,4%, amostra 19/20 → aquecimento (a 1 cold maduro do veredito; com 68% ≥ baseline 35%, alvo virará ativa). Sessão "DIOGO" (wwebjs): SCAN_QR_CODE, amostra 0 → aquecimento correto. fleetMedian null → baseline fallback 35%. **Zero falso-positivo.** Pendente na janela: coletas diárias até ~17/07 + teste do 423 no n8n (critério 4).

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** —
- **Pendências para próxima sessão:** —
