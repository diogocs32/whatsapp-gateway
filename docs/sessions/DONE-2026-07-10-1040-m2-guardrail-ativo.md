# Sessão: m2-guardrail-ativo

- **Status:** ✅ ENCERRADA 18/08/2026 (onda M2 concluída por reconciliação — D-017)
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
- [10/07 16:19 UTC] **COLETA 2/≥5** (a que rodou durante o teste do 423): Diogo (Baileys) → `currentState=ativa`, `targetState=**ativa**`, reply **71,4%**, amostra **21**, `reliable=true`, "reply 71% >= mediana 35%" — 1ª vez com veredito confiável e alvo=ativa. wwebjs (SCAN_QR) amostra 0 → aquecimento. Zero divergência real.
- [11/07 20:41 UTC] **COLETA 3/≥5**: Diogo (Baileys, WORKING) → `ativa` / alvo `aquecimento`, reply **50%**, amostra **14** (< Nmin 20) → sem veredito. wwebjs (SCAN_QR) amostra 0 → aquecimento. Zero falso-positivo. **Observação:** amostra da Diogo CAIU de 21 → 14 (janela desliza; só conta cold-send maduro >72h dentro de 7d).
- [12/07 10:28 UTC] **COLETA 4/≥5** (usuário rodou o coletor — "coleta do dia"): Diogo (Baileys, WORKING) → `ativa` / alvo `aquecimento`, reply **50%**, amostra **14**, `reliable=false` → sem veredito (aquecimento por amostra < Nmin). wwebjs **reconectou**: agora `WORKING` com **id novo** `01KX9GZXGZVBZ5NY7JH3F7K1JX` (a antiga `01KWJXX4…` em SCAN_QR saiu da lista) · amostra 0 → aquecimento correto. Config estável (enforce=false, nmin=20, 0.75/0.6/0.35, cooldown 48h). **Zero falso-positivo.**
  - **Estado da janela:** 4 coletas / ≥5 · dia 3 de ≥7 (10/07 → ~17/07). Falta ≥1 coleta e chegar a 17/07.
  - **Risco para o flip:** amostra da Diogo oscila em torno do Nmin (19→21→14→14). Se ficar < 20 no dia do flip, a Diogo entra como `aquecimento` (sem veredito) e o enforce não protege de fato. **Ação recomendada ao usuário:** manter/retomar volume de cold-sends na Diogo durante a janela para consolidar amostra ≥ 20 `reliable`.

## Encerramento — 18/08/2026 (sessão `fechamento-sessoes` — reconciliação R9)

- **Fim:** 18/08/2026 · **Status final:** ✅ **ONDA M2 CONCLUÍDA** (fechada por reconciliação — D-017)
- **Entregue (evidência disponível no fechamento de 18/08):** coletor `scripts/guardrail-observe.mjs` + how-to · fix D-007 (`envBool` fail-fast,
  em prod desde 10/07 `80b1670`) · 6 coletas então disponíveis no ramo conciliado (10–14/07,
  jsonl em `docs/observacao/guardrail-m2.jsonl`): zero falso-positivo nas amostras · **teste do
  423 no n8n APROVADO em definitivo (critério 4)** — override → 423 SESSION_QUARANTINED antes da
  engine → requeue N7 provado com `RETURNING id` (+ achado `continueOnQuarantine` opt-in corrigido
  no fluxo de envio) · **`GUARDRAIL_ENFORCE=true` ATIVO em produção** (constatado na env 13/08;
  > 1 mês de enforcement sem NENHUM incidente/falso-positivo registrado).
- **Justificativa registrada em 18/08:** critérios 2–5 cumpridos com a evidência então disponível; critério 1 foi
  tratado como parcial (6 coletas, 5 dias) e suprido pelo período de enforcement real em
  produção sem incidente registrado. A reconciliação de 26/09 abaixo recuperou as coletas posteriores e corrigiu essa premissa. A divergência do
  aviso de 13/08 (docs diziam observação, prod tinha enforce ligado) reconciliada: o estado REAL
  (enforce ativo) vira o documentado (D-017).
- **Commits:** docs da janela mergeados na main em 18/08 (`71d839f`); fix D-007 + coletor na main
  desde 10/07.
- **Efeito de deploy:** nenhum (merge doc-only; o enforce já estava ligado em prod).
- **BLOQUEADO EM VOCÊ:** nada. Opcional (higiene): apagar as branches `feature/m2-guardrail-ativo`
  e `coleta-mac` (conteúdo integrado na main).
- **DOCS TOCADAS:** este arquivo (→DONE) · SESSOES.md · ESTADO.md (onda atual + roadmap M2 ✅ +
  divergência) · DECISOES.md (D-017) · docs/observacao/guardrail-m2.jsonl (mergeado).
- **Pendências para próxima sessão:** rollback do enforce hoje é trivial (`GUARDRAIL_ENFORCE=false`
  FUNCIONA pós-D-007, ou remover a env) · histerese DEGRADED↔WORKING segue no P-001 · backlog do
  node n8n (`continueOnQuarantine` default true) segue anotado no how-to.

## Adendo de reconciliação — 26/09/2026 (sem nova consulta à produção)

- As branches antigas `coleta-mac` (`ac6a340`) e `feature/m2-guardrail-ativo` (`f850cba`) guardavam o histórico que não entrou no merge documental de 18/08. O JSONL canônico agora contém **12 coletas de 10 a 19/07**, sendo 8 antes do flip e 4 depois; a janela de observação alcançou 7 dias em 17/07. As 3 linhas de `coleta-mac` já constavam na main e não foram duplicadas. Os dados são amostras históricas, não prova do estado atual de produção.
- A coleta de 14/07 registrou duas sessões com amostra abaixo de Nmin 20 e alvo `aquecimento`, sem quarentena. Na ocasião, a `X-Api-Key` válida era a chave `cz_…` do painel; a env `API_KEY` do Dokploy não servia para autenticar o coletor. A amostra baixa limitava o veredito sobre throttle/quarentena.
- A coleta 8 (17/07 23:38 UTC) fechou a janela formal (8 coletas em 7 dias). O flip do enforce foi confirmado pela coleta 9 (18/07 02:11 UTC, `enforce:true`, `applied:true` em `ativa→aquecimento`); coletas 10–12 seguiram até 19/07. O ramo registrou correção do alvo `DIOGO_OWEN` no Notificador n8n em 19/07, mas a revalidação sugerida depois da correção não está comprovada pelo JSONL; não inferir estado atual do workflow.
- A antiga sessão `ATIVA` continha um rascunho de encerramento para 20–21/07; o encerramento real ocorreu por reconciliação em 18/08. O texto operacional obsoleto permanece no histórico Git da branch integrada, sem reabrir a sessão.
