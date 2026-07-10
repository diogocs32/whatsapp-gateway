# 🛡️ Janela de observação do guard-rail (M2) — como conduzir e quando ligar o enforce

> Onda M2. Estado hoje: guard-rail G1–G8 EM PRODUÇÃO em modo observação (`GUARDRAIL_ENFORCE=false`) —
> a avaliação calcula e registra o que FARIA (`targetState`), mas não muda estado nem bloqueia;
> só override manual (G7) bloqueia. Fonte: `guardrail.service.ts` (`evaluate`, `canSendCold`).

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

## Coleta (1×/dia, ~7 dias)

```bash
# no WSL, na raiz do repo (terminal do usuário já tem Node 26):
GATEWAY_API_KEY=<chave X-Api-Key> node scripts/guardrail-observe.mjs
```

- Acumula em `docs/observacao/guardrail-m2.jsonl` (1 linha de config + 1 por sessão, por coleta)
  e imprime uma tabela-resumo com a coluna **divergente** (estado atual ≠ o que o enforce faria).
- Alternativa: agendar no n8n (Schedule Trigger diário → HTTP Request nos mesmos endpoints).

## Critérios de aceite para ligar `GUARDRAIL_ENFORCE=true` (todos obrigatórios)

1. **≥ 7 dias** de janela com **≥ 5 coletas**.
2. **Zero falso-positivo**: nenhuma sessão saudável/em uso normal com `targetState`
   `quarentena` — toda divergência explicada pelo `reason` e condizente com a realidade.
3. **Amostra consciente**: sessões de envio com `sample ≥ Nmin` (`reliable: true`); sessões que
   ficarão em `aquecimento` (trickle do G8) identificadas e aceitas.
4. **Teste do 423 no n8n EXECUTADO** (antes do enforce — usa o fato de override manual bloquear
   mesmo em observação): aplicar quarentena manual numa sessão de teste (G7), disparar um envio
   cold pelo fluxo n8n, confirmar que o node ramifica no `423 SESSION_QUARANTINED` e re-enfileira
   (N7), e desfazer o override (voltar `ativa`).
5. **Rollback conhecido**: **REMOVER a variável `GUARDRAIL_ENFORCE`** no Dokploy + Redeploy
   (reversível em minutos). ⚠️ NUNCA usar `=false`: o código atual converte com `Boolean(texto)`
   e qualquer valor não-vazio — inclusive `"false"` — LIGA o enforce.

## Ligar o enforce (ação operacional — usuário, R0)

1. Dokploy → aplicação do gateway → Environment → adicionar a linha `GUARDRAIL_ENFORCE=true` →
   Save → **Redeploy** (para desligar depois: REMOVER a linha, não trocar para false)
2. Validar: `GET /api/guardrail/config` → `"enforce": true`
3. Monitorar por 48–72h: coletas diárias continuam; atenção a `applied: true`, sessões entrando em
   `quarentena`/`throttled`, HTTP 423 nos fluxos n8n e eventos G6 (`session.quarantined` etc.)

## Referências

- Contrato do 423: `{ code: "SESSION_QUARANTINED", state, message }` (o node n8n ramifica — N7)
- Decisões: D-005 (janela/critérios) e D-006 (dependência node n8n) em [../DECISOES.md](../DECISOES.md)
- Ordem de serviço G1–G8/N1–N8: doc 22 da campanha (repo `campanha-whatsapp-merabe`)
