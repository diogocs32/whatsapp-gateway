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
4. ✅ Teste 423 no n8n executado e aprovado em 10/07 (ver progresso — achado: `continueOnQuarantine`)
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
- [10/07 15:48–15:54 UTC] **TESTE DO 423 NO N8N (critério 4) — APROVADO, com achado importante**:
  1. Override manual `POST /sessions/Diogo/quarantine` aplicado pelo usuário → estado `quarentena` (bloqueia mesmo em observação, como documentado).
  2. Execução 124909 do workflow "Campanha v2 - Envio (Conexozenvo cold)" (via MCP): gateway respondeu **423 SESSION_QUARANTINED** ANTES da engine (nenhuma mensagem saiu) — **MAS o node lançou NodeApiError porque `continueOnQuarantine: false`** → "Registrar Resultado" não rodou → lead fila_id=5 ficou `enviado` SEM envio real (lead seria perdido). **O tratamento N7 do node é OPT-IN por instância do node.**
  3. Fix: usuário ligou `continueOnQuarantine` no node "Enviar (cold)" + SQL de resgate do lead 5.
  4. Execução 124922 (re-teste): **verde ponta a ponta** — "Enviar (cold)" success com `{blocked:true, code:SESSION_QUARANTINED}`, "Registrar Resultado" devolveu o lead 7 a `pendente` +30min. N7 completo provado.
  5. Pendências do episódio: usuário rodar `POST /sessions/Diogo/activate` (destravar) e conferir lead 5 re-pendente; backlog do repo do node n8n: avaliar `continueOnQuarantine` default true (ou destacar na doc do node) — anotado no how-to.
  6. [16:05 UTC] Override desfeito pelo usuário: `{"state":"ativa","reason":"override manual: activate"}` — sessão destravada. Pendência residual: conferir lead 5 (`SELECT ... WHERE id IN (5,7)`).
- [10/07 16:00–16:20 UTC] **ANOMALIA INVESTIGADA E RESOLVIDA**: usuário reportou lead 7 `enviado` após o re-teste 124922 (requeue deveria tê-lo devolvido a `pendente`). Causa provável: SQLs manuais de resgate rodados fora de ordem durante o teste contaminaram a leitura (o próprio usuário confirmou ter rodado o UPDATE para os 2 ids). Prova definitiva via re-teste controlado:
  1. Hardening aplicado pelo usuário: `RETURNING id` na query do "Registrar Resultado" (0-linhas deixa de passar em silêncio — melhoria PERMANENTE do fluxo).
  2. Quarentena manual → execução 124966 (verde): picker pegou lead 5 → `blocked:true SESSION_QUARANTINED` → "Registrar Resultado" devolveu **`{id:"5"}`** = UPDATE comprovadamente tocou a linha (pendente +30min). **Requeue N7 provado com evidência dentro da execução.**
  3. Override desfeito (`state: ativa`). **CRITÉRIO 4 FECHADO EM DEFINITIVO.** Lição de processo: durante teste com fila, ZERO SQL manual — evidência primeiro, resgate depois.

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** —
- **Pendências para próxima sessão:** —
