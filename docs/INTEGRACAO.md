# Integração — como consumir o WhatsApp Gateway

> Para quem **integra** o gateway (n8n / campanha / qualquer cliente HTTP). Foca na camada
> **guard-rail / reply-rate (G1–G8)**. A forma mais fácil de consumir no n8n é o community node
> **`n8n-nodes-conexozenvo-gateway`** (que espelha tudo isto). Base: `https://api.conexozenvo.com`.

## 1. Autenticação
Toda rota `/api/*` exige o header **`X-Api-Key: <sua-chave>`** (papel ADMIN; gere no painel).
Sessões são referenciadas por **nome** (`campanha1`) ou ID — ambos funcionam na URL.

## 2. Enviar mensagem (G1 — cold + idempotência)
```
POST /api/sessions/{sessao}/messages/text
{ "to": "5511999999999", "text": "olá", "cold": true, "idempotencyKey": "lead-42-msg-1" }
```
- **`cold: true`** = 1º contato permissionado (a IA, ao responder, deve mandar `cold: false`).
- **`idempotencyKey`** = dedup forte: **reenviar com a mesma key NÃO duplica** — devolve o resultado anterior (`{ deduped: true }`). Use sempre em retry para não mandar 2×.
- Mídia: `POST …/messages/media-url` (mesmos `cold`/`idempotencyKey`).

## 3. Webhooks — receber eventos (G2/G3/G6)
Registre um webhook (ou use o Trigger do node):
```
POST /api/webhooks
{ "url": "https://seu-n8n/webhook/...", "events": ["*"], "secret": "opcional-hmac" }
```
Cada entrega é `{ id, timestamp, event, sessionId, session, payload, engine }`, assinada com
**HMAC-SHA512** no header `x-webhook-signature` (se houver `secret`). Catálogo:

| Evento | Quando | Payload-chave |
|---|---|---|
| `message` | inbound/eco | **`source` (api\|phone)**, **`isCold`** — base do handoff IA×celular |
| `message.ack` | entrega/leitura | `{ msg_id, status: sent\|delivered\|read }` |
| `session.throttled\|quarantined\|warming\|recovered\|banned` | transição guard-rail | quarantined: `{ reply_rate, amostra, motivo, cooldown_ate, cap_novo }` |
| `signal.463` / `signal.restriction` | sinal duro | `{ signal }` |
| `send.blocked` | hard-gate barrou um cold | `{ state, motivo }` |

> **Handoff (G2):** `source: "phone"` num `fromMe` = o humano respondeu pelo celular → pause a IA.
> **C4:** o webhook OUT tem retry + **dead-letter** — se o n8n cair, o evento não some (ver §6).
> **C5:** NÃO existe evento de "bloqueado/denunciou" (impossível detectar no WhatsApp).

## 4. Saúde e reply-rate (G4/G7)
```
GET /api/sessions/{sessao}/health
→ { state, reply_rate, amostra, score, cap_base, cap_atual, cooldown_ate, ultimos_sinais, enforce }
GET /api/observability/reply-rate/{sessao}?window=7   # ou 30; sem window = ambas
GET /api/sessions?state=ativa,aquecimento             # filtra a listagem por estado guard-rail
```
`reply_rate` exclui cold-sends com menos de **72h** (imaturos) e só dá veredito com **amostra ≥ 20**.

## 5. Guard-rail: estados, hard-gate e tuning (G5/G7)
Estados: `ativa | throttled | quarentena | aquecimento | banida | pausa_manual`.

- **Hard-gate:** um envio `cold: true` numa sessão bloqueada responde **HTTP 423 `SESSION_QUARANTINED`**.
  Envio `cold: false` (chat aberto) sempre passa. → trate o 423 ramificando e re-enfileirando o lead.
- **MODO OBSERVAÇÃO (padrão):** `GUARDRAIL_ENFORCE=false` → o gateway **mede e registra mas NÃO bloqueia**
  nem quarentena automaticamente. **Ligue (`true`) só depois de ter a mediana real da frota.**
- **Override manual:** `POST /api/sessions/{sessao}/quarantine|warmup|activate|pause`.
- **Tunar limiares sem redeploy:** `GET`/`PATCH /api/guardrail/config`
  (`{ nmin, throttleMult, quarantineMult, targetReplyRate, cooldownHours }`).

## 6. Dead-letter (C4 — reconciliação)
```
GET  /api/webhooks/dead-letters              # eventos que esgotaram os retries (n8n estava fora)
POST /api/webhooks/dead-letters/redeliver    # reentrega com a config atual do webhook
```

## 7. Config por sessão + presença/leitura (G8)
```
GET/PATCH /api/sessions/{sessao}/config      # capBase, warmupCurve, regiaoDdd, modo, janela, timezone
POST /api/sessions/{sessao}/presence         # { to, type: composing|paused|available|unavailable }
POST /api/sessions/{sessao}/messages/{msgId}/read   # read receipt
```
`cap_atual` é derivado do estado: quarentena/banida/pausa=0; throttled≈50% do base; aquecimento=curva[0]; ativa=capBase.

## 8. Fluxo recomendado de adoção
1. Integrar envio (`cold`/`idempotencyKey`) + webhooks (`source`/`isCold`/`message.ack`).
2. **Rodar em OBSERVAÇÃO** (`GUARDRAIL_ENFORCE=false`) medindo `reply-rate`/`/health` por dias.
3. Quando a mediana da frota estabilizar, **ligar o enforce** (e tunar via `PATCH /guardrail/config`).
4. No n8n: tratar `423` (re-enfileirar) e os eventos `session.*`/`send.blocked` (notificar/realocar).
