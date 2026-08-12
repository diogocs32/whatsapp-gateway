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
- **Menções (W5, aditivo):** `text` e `media-url` aceitam `mentions: ["5511888888888", ...]` (números ou JIDs a marcar com @; até 50). Funciona nas duas engines (resolvidas ao formato de cada uma). Ex.: `{ "to": "...", "text": "olá @fulano", "mentions": ["5511888888888"] }`.
- **Reação (W5, aditivo):** `POST /api/sessions/{sessao}/messages/{msgId}/reaction` com `{ "emoji": "👍" }` — `emoji` vazio (`""`) REMOVE a reação. `msgId` = keyId do WhatsApp (o mesmo que `read` e o download de mídia aceitam). 404 se a mensagem não for conhecida. Funciona nas duas engines.
- **Localização (W5, aditivo):** `POST /api/sessions/{sessao}/messages/location` com `{ "to": "...", "latitude": -23.55, "longitude": -46.63, "name": "Escritório", "address": "Av. ..." }` (`name`/`address` opcionais; mesmos `cold`/`idempotencyKey`). Funciona nas duas engines.
- **Enquete/poll (W5, aditivo):** `POST /api/sessions/{sessao}/messages/poll` com `{ "to": "...", "name": "Qual horário?", "options": ["Manhã","Tarde"], "multi": false }` (2..12 opções; `multi` = múltipla escolha; mesmos `cold`/`idempotencyKey`). Funciona nas duas engines. **Nota:** a CAPTURA de votos via webhook (`vote_update`) ainda não está exposta — os votos aparecem no app; captura automática = incremento futuro.

## 3. Webhooks — receber eventos (G2/G3/G6)

Registre um webhook (ou use o Trigger do node):

```
POST /api/webhooks
{ "url": "https://seu-n8n/webhook/...", "events": ["*"], "secret": "opcional-hmac" }
```

Cada entrega é `{ id, timestamp, event, sessionId, session, payload, engine }`, assinada com
**HMAC-SHA512** no header `x-webhook-signature` (se houver `secret`). Catálogo:

| Evento                                                       | Quando                   | Payload-chave                                                          |
| ------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------- |
| `message`                                                    | inbound/eco              | **`source` (api\|phone)**, **`isCold`** — base do handoff IA×celular   |
| `message.ack`                                                | entrega/leitura          | `{ msg_id, status: sent\|delivered\|read }`                            |
| `message.reaction` (W6, aditivo)                             | o contato/você reagiu    | `{ keyId (msg-alvo), chatJid, senderJid, emoji ('' = removida), fromMe, timestamp }` — 2 engines |
| `session.throttled\|quarantined\|warming\|recovered\|banned` | transição guard-rail     | quarantined: `{ reply_rate, amostra, motivo, cooldown_ate, cap_novo }` |
| `signal.463` / `signal.restriction`                          | sinal duro               | `{ signal }`                                                           |
| `send.blocked`                                               | hard-gate barrou um cold | `{ state, motivo }`                                                    |

> **Handoff (G2):** `source: "phone"` num `fromMe` = o humano respondeu pelo celular → pause a IA.
> **C4:** o webhook OUT tem retry + **dead-letter** — se o n8n cair, o evento não some (ver §6).
> **C5:** NÃO existe evento de "bloqueado/denunciou" (impossível detectar no WhatsApp).

### 3.1 Mídia recebida — obter os BYTES (voz/imagem/PDF) — contrato CP-149 (GAP 2)

Mensagens de mídia chegam no webhook com `mediaType/mimetype/fileSize` e, quando o binário foi
armazenado, também `mediaKey` + `mediaUrl` (URL S3 pré-assinada, TTL `MEDIA_URL_TTL`). Para o
consumo robusto (n8n externo), use o **download pelo próprio gateway** — não depende de o S3 ser
público nem do TTL, e permite re-obter a mídia depois:

```
GET /api/sessions/{sessao}/messages/{msgId}/media
Header: X-Api-Key: <chave>          (ou Bearer do painel)
→ 200  Content-Type = mimetype original; body = bytes da mídia
→ 404  motivo claro (mensagem sem mídia / binário não armazenado / expirado)
```

- `{msgId}` aceita **os dois** identificadores: o **`keyId` do WhatsApp** (o mesmo que vem no
  `payload` do webhook — ex.: `3AD5B95A7C36FE832C31`) **ou** o **`id` interno (ULID)** do
  `GET /messages`. O `GET /messages` agora também expõe `keyId` em cada item.
- Fluxo n8n típico: webhook `message` com `mediaType=audio` → HTTP Request
  `GET .../messages/{{$json.payload.keyId}}/media` (responseFormat: file) → Whisper/gpt-4o.
- **Pré-requisito de infra:** o gateway só armazena o binário se o S3 estiver configurado
  (`S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY` — MinIO no Dokploy ou Cloudflare R2).
  Sem S3, a mensagem chega só com metadados e o download responde 404 explicando.

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
POST /api/sessions/{sessao}/profile/status   # W8 { status } — recado/"about" da conta (≤139)
POST /api/sessions/{sessao}/profile/name     # W8 { name } — nome de exibição da conta (≤25)
```

`cap_atual` é derivado do estado: quarentena/banida/pausa=0; throttled≈50% do base; aquecimento=curva[0]; ativa=capBase.

## 8. Fluxo recomendado de adoção

1. Integrar envio (`cold`/`idempotencyKey`) + webhooks (`source`/`isCold`/`message.ack`).
2. **Rodar em OBSERVAÇÃO** (`GUARDRAIL_ENFORCE=false`) medindo `reply-rate`/`/health` por dias.
3. Quando a mediana da frota estabilizar, **ligar o enforce** (e tunar via `PATCH /guardrail/config`).
4. No n8n: tratar `423` (re-enfileirar) e os eventos `session.*`/`send.blocked` (notificar/realocar).

## 9. Grupos — extração de leads (nome + número)

Lê os membros de um grupo como leads, para alimentar CRM/banco. No node: resource **Group**.

```
GET /api/sessions/{sessao}/groups                       # lista os grupos (id, subject, size)
GET /api/sessions/{sessao}/groups/{groupId}             # grupo + participantes (phone, name, role)
GET /api/sessions/{sessao}/groups/{groupId}/leads       # só leads: { phone, name, role }
GET …/groups/{groupId}/leads?all=true                   # inclui membros sem número (LID anônimo)
```

- **`/leads`** devolve `{ groupId, subject, total, withNumber, withoutNumber, leads: [{ phone, name, role }] }`.
  Por padrão lista só quem **tem número** (lead utilizável); `?all=true` inclui os anônimos.
- **Nome:** o número sempre vem; o **nome** = salvo na agenda → senão pushname → senão `null`.
- **Engine:** resolução de nome/número mais completa em sessões **WWEBJS** (whatsapp-web.js — catálogo
  oficial do WhatsApp Web). No **Baileys**, os nomes vêm do cruzamento com o diretório
  (`GET /api/sessions/{sessao}/contacts/directory`) — quanto mais a sessão sincroniza, mais resolve.
- **Custo:** resolver os membros consulta o WhatsApp por participante (sequencial) — grupo grande leva
  alguns segundos. É extração pontual, não hot path. Os leads resolvidos ficam no diretório de contatos.

## 10. Contatos — agenda da conta (salvar / remover / bloquear)

Salva, edita, remove ou bloqueia um contato na **agenda da conta** do WhatsApp. As duas engines
suportam: Baileys via `addOrEditContact` (app-state sync) e whatsapp-web.js via
`saveOrEditAddressbookContact`. Requer a sessão **conectada** (`WORKING`). No node: resource **Contact**.

```
POST /api/sessions/{sessao}/contacts/save     { "number": "5511999999999", "firstName": "João",
                                                "lastName": "Silva", "syncToPhone": true }
POST /api/sessions/{sessao}/contacts/remove   { "number": "5511999999999" }
POST /api/sessions/{sessao}/contacts/block     { "jid": "5511999999999", "action": "block" }   # ou "unblock"
```

- **`number`** — dígitos com país + DDD (ex.: `5511999999999`); `save`/`remove` também aceitam `jid` canônico.
- **`firstName`** obrigatório no `save`; **`lastName`** opcional.
- **`syncToPhone`** (default `false`): se `true`, propaga o contato também para a **agenda do aparelho**
  (`saveOnPrimaryAddressbook` no Baileys / `syncToAddressbook` no wwebjs). Sem ele, fica só na conta WhatsApp.
- Resposta: `{ "ok": true }`.
- **Não confundir** com o diretório (`GET …/contacts/directory`), que é o índice interno acumulado pelo
  gateway. Salvar contato escreve na **agenda real** da conta (recurso de contatos-na-conta do WhatsApp).

## 11. Sessões — criar já com proxy livre (opcional, D-008)

```
GET  /api/proxies/available     # proxies LIVRES: enabled, não-DEAD e sem sessão usando
POST /api/sessions              # { "name": "vendas-02", "engine": "BAILEYS", "proxyId": "<id de um livre>" }
```

- **`proxyId` é OPCIONAL e aditivo** — sem ele, o comportamento é o de sempre (sessão sem proxy).
- Com `proxyId`, a sessão **nasce** com atribuição `SINGLE`/`STICKY` àquele proxy (1 proxy = 1 sessão);
  o proxy some imediatamente de `/proxies/available`.
- Erros (HTTP 400, mensagem clara): proxy inexistente, desabilitado, `DEAD` ou **já em uso** — nesse
  caso a sessão NÃO é criada (sem sessão órfã).
- A exclusividade vale para o fluxo `SINGLE`; os modos `RANGE`/`GLOBAL_ROUND_ROBIN` (configurados via
  `PUT /api/sessions/{sessao}/proxy`) seguem podendo usar qualquer proxy do pool em runtime.
