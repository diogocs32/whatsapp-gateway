---
revisado_em: 2026-09-26
---

# 🛡️ Janela de observação do guard-rail (M2) — histórico e procedimento

> **Revisado em 26/09/2026.** A M2 foi encerrada em 18/08 (D-017); o histórico recuperado registra
> 12 coletas entre 10 e 19/07, com 8 anteriores ao flip e 4 posteriores. A env
> `GUARDRAIL_ENFORCE=true` foi constatada em produção em 13/08; o estado atual do Dokploy não foi
> verificado nesta reconciliação. Em modo observação (`false`), a avaliação calcula o que faria
> (`targetState`), sem aplicar a transição; override manual (G7) ainda bloqueia. Fonte:
> `guardrail.service.ts` (`evaluate`, `canSendCold`) e `docs/observacao/guardrail-m2.jsonl`.

## Como o veredito funciona (limiares efetivos: `GET /api/guardrail/config`)

Com `replyRate` da janela 7d (cold-sends maduros >72h — C2) e `baseline` = mediana da frota
(ou `targetReplyRate` se < 2 sessões confiáveis):

| Condição                          | targetState                  |
| --------------------------------- | ---------------------------- |
| amostra < Nmin (default 20)       | `aquecimento` (sem veredito) |
| reply < baseline × quarantineMult | `quarentena`                 |
| reply < baseline × throttleMult   | `throttled`                  |
| reply ≥ baseline                  | `ativa`                      |
| entre throttle e baseline         | mantém atual (histerese)     |

Estados manuais (`pausa_manual`, `banida` e override) são sticky — a avaliação não sobrescreve.

## Coleta (procedimento reutilizável; a janela M2 está arquivada)

```bash
# no WSL, na raiz do repo (substitua CHAVE_X_API_KEY):
GATEWAY_API_KEY=CHAVE_X_API_KEY node scripts/guardrail-observe.mjs docs/observacao/guardrail-AAAA-MM-DD.jsonl
```

- Acumula no arquivo novo informado (1 linha de config + 1 por sessão, por coleta)
  e imprime uma tabela-resumo com a coluna **divergente** (estado atual ≠ o que o enforce faria).
- **Efeito operacional:** `GET /api/guardrail/:id` chama `evaluate`. Com
  `GUARDRAIL_ENFORCE=true`, a coleta pode aplicar transição de estado e emitir evento, inclusive
  quarentena com bloqueio cold. Planeje a janela e acompanhe os resultados; não trate o coletor
  como consulta somente leitura.
- `scripts/coleta.sh <arquivo-novo.jsonl>` faz o mesmo usando
  `scripts/coleta.secret.local` (gitignored) para a chave. Não acrescentar coletas atuais ao
  `guardrail-m2.jsonl`, que é histórico de julho.
- Agendamento no n8n desses endpoints tem o mesmo efeito operacional e exige a mesma decisão
  antes de ativar o workflow.

## Critérios usados para ligar `GUARDRAIL_ENFORCE=true`

1. **≥ 7 dias** de janela com **≥ 5 coletas**.
2. **Zero falso-positivo**: nenhuma sessão saudável/em uso normal com `targetState`
   `quarentena` — toda divergência explicada pelo `reason` e condizente com a realidade.
3. **Amostra consciente**: sessões de envio com `sample ≥ Nmin` (`reliable: true`); sessões que
   ficarão em `aquecimento` (trickle do G8) identificadas e aceitas.
4. **Teste do 423 no n8n EXECUTADO** (antes do enforce — usa o fato de override manual bloquear
   mesmo em observação): aplicar quarentena manual numa sessão de teste (G7), disparar um envio
   cold pelo fluxo n8n, confirmar que o node ramifica no `423 SESSION_QUARANTINED` e re-enfileira
   (N7), e desfazer o override (voltar `ativa`).
   ⚠️ **Achado do teste de 10/07/2026**: o tratamento N7 do node é **opt-in por node** — a opção
   **`continueOnQuarantine` precisa estar LIGADA em TODO node de envio cold**; desligada, o node
   lança erro no 423, o requeue não roda e o lead fica marcado como enviado SEM envio (lead
   perdido). Conferir o toggle em todos os fluxos antes de ligar o enforce.
   Override por API: `POST /api/sessions/:id/quarantine` · desfazer: `POST /api/sessions/:id/activate`.
   💡 **Hardening recomendado (aplicado em 10/07)**: a query de requeue do fluxo deve terminar com
   `RETURNING id` — UPDATE de 0 linhas passa como `success: true` no node Postgres e esconderia
   lead perdido; com RETURNING, a linha tocada aparece no output da execução.
5. **Rollback conhecido**: `GUARDRAIL_ENFORCE=false` (ou remover a variável) + Redeploy —
   reversível em minutos. Semântica dos booleans corrigida no D-007: `true/1/yes/on` liga ·
   `false/0/no/off` desliga · valor inválido derruba o boot com erro claro.

## Procedimento de ligar o enforce (ação operacional — usuário, R0)

1. Dokploy → aplicação do gateway → Environment → adicionar a linha `GUARDRAIL_ENFORCE=true` →
   Save → **Redeploy**
2. Validar: `GET /api/guardrail/config` → `"enforce": true`
3. Monitorar por 48–72h: coletas diárias continuam; atenção a `applied: true`, sessões entrando em
   `quarentena`/`throttled`, HTTP 423 nos fluxos n8n e eventos G6 (`session.quarantined` etc.)

## Referências

- Contrato do 423: `{ code: "SESSION_QUARANTINED", state, message }` (o node n8n ramifica — N7)
- Decisões: D-005 (janela/critérios) e D-006 (dependência node n8n) em [../DECISOES.md](../DECISOES.md)
- Ordem de serviço G1–G8/N1–N8: doc 22 da campanha (repo `campanha-whatsapp-merabe`)
