# Integração — como consumir o WhatsApp Gateway

> Para quem **integra** o gateway (n8n / campanha / qualquer cliente HTTP). Foca na camada
> **guard-rail / reply-rate (G1–G8)**. A forma mais fácil de consumir no n8n é o community node
> **`n8n-nodes-conexozenvo-gateway`** (que espelha tudo isto). Base: `https://api.conexozenvo.com`.

## 1. Autenticação

Toda rota `/api/*` exige o header **`X-Api-Key: <sua-chave>`** (papel ADMIN; gere no painel).
Sessões são referenciadas por **nome** (`campanha1`) ou ID — ambos funcionam na URL.

> **Exceções (sem `X-Api-Key`):** `GET /api/branding` (público — a tela de login precisa dele) e
> as rotas **`/api/public/connect*`** do link de conexão (E27, §11), cuja credencial é o token do
> link em `Authorization: Bearer <token>` e que só dão acesso ao QR daquela sessão. As rotas que
> **criam/consultam/revogam** o link (`/api/sessions/{id}/connect-link`) aceitam **só o login do
> painel** nesta versão — `X-Api-Key` recebe 401 (P-093).

> **Cookie do painel × integrações (09/2026, ABE-12):** requisições com efeito (POST/PUT/PATCH/
> DELETE) autenticadas pelo **cookie** do painel passam por verificação CSRF — o `Origin` precisa
> estar em `CORS_ORIGIN` (ou `Sec-Fetch-Site: same-origin`); caso contrário **403**. Integrações
> usam `X-Api-Key`/`Bearer` e **não** são afetadas. `GET /sessions/{id}/qr` passou a devolver
> também `pairingCode` (aditivo) enquanto a sessão está em `PAIRING_CODE` — o código renovado não
> vai mais para o log.

> **Código de pareamento (E12, após o deploy B):** `POST /api/sessions/{id}/pairing-code`
> continua a devolver `{code}` quando a sessão ainda não está pareada. Se ela estiver `WORKING`
> ou já tiver credenciais de pareamento/QR (`creds.me`), devolve **409** antes de pedir código ao
> Baileys. Uma sessão recém-iniciada espera até 10 s pelo primeiro `connecting` ou QR; se não
> ficar pronta, também devolve 409 com o motivo. O formato da resposta de sucesso não mudou.
> **E27:** o pedido tem teto de 45 s — se o código não chegar, **409** (antes, no wwebjs com a página
> travada, a rota podia ficar pendurada até 240 s). Operações da mesma sessão (start/stop/restart/
> logout/new-qr/pairing/remover) passam a rodar uma de cada vez; a seguinte espera a anterior.

> **Limite de requisições (desde 07/2026; regra do login revista em 25/09/2026 — P-053, D-025):**
> **600/min por IP** em `/api/*` (`RATE_LIMIT_MAX` no gateway; `/health` fica de fora) e **10/min
> por IP no `POST /api/auth/login`**, num contador **próprio** (o tráfego da API não consome o do
> login, e vice-versa). Acima do teto: **429** `{"statusCode":429,"message":"Rate limit exceeded,
retry in …"}` (janela fixa de 1 min contada do 1º request) com os headers `x-ratelimit-limit`,
> `x-ratelimit-remaining`, `x-ratelimit-reset` (segundos) e `retry-after`. O teto vale para qualquer grafia do caminho (forma absoluta,
> `%xx`) — é decidido pela rota. Integrações via `X-Api-Key` não chamam o login.
> **E27:** as rotas públicas do link de conexão têm balde próprio por IP — `GET /api/public/connect`
> **120/min** e `POST /api/public/connect/new-qr` **10/min**. Esse 429 do plugin vem **sem** `code`;
> o 429 de negócio do "gerar QR" (`CONNECT_LINK_NEW_QR_COOLDOWN`, §11) traz `code` e
> `retryAfterSeconds` no corpo. O CORS do gateway passou a responder `Access-Control-Max-Age: 600`
> (o navegador guarda o preflight por 10 min).

## 2. Enviar mensagem (G1 — cold + idempotência)

```
POST /api/sessions/{sessao}/messages/text
{ "to": "5511999999999", "text": "olá", "cold": true, "idempotencyKey": "lead-42-msg-1" }
```

- **`cold: true`** = 1º contato permissionado (a IA, ao responder, deve mandar `cold: false`).
- **`idempotencyKey`** = dedup forte: **reenviar com a mesma key NÃO duplica** — devolve o resultado anterior (`{ deduped: true }`). Use sempre em retry para não mandar 2×.
  - **Desde 09/2026 (ABE-03, aditivo):** a intenção é RESERVADA antes do envio, então a garantia vale também sob concorrência (20 chamadas simultâneas com a mesma key = 1 envio). Dois casos novos respondem **HTTP 409**: (a) a mesma key chegou com **outro destinatário/conteúdo** → use uma key nova; (b) um envio com essa key **ainda está em andamento** → aguarde a resposta anterior ou retente em instantes (o n8n deve tratar 409 como "não reenviar agora"). Falha de transporte (400) libera a key para retry com o mesmo payload. Keys ficam válidas por `RETENTION_INTENTS_DAYS` (90 d).
- Mídia: `POST …/messages/media-url` (mesmos `cold`/`idempotencyKey`). **Política de egress (09/2026):** a `url` precisa ser http/https pública, sem credenciais embutidas; destino que resolve para rede privada/loopback/metadata é recusado (400 `URL de mídia recusada`); redirects são revalidados; o corpo é lido em fluxo com teto `MEDIA_MAX_BYTES` (64 MB default). Host interno legítimo entra em `EGRESS_ALLOW_HOSTS` no gateway. **Desde 25/09/2026 (P-065):** também são recusados o IPv6 que embute um IPv4 privado (ex.: `http://[::ffff:127.0.0.1]/`, NAT64, 6to4, Teredo), as faixas de documentação (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`) e todo IPv6 fora do unicast global `2000::/3`. Vale para webhook, campanha, `media-url` e fotos por URL.
- Mídia por upload: `POST …/messages/media` em `multipart/form-data` — **1 arquivo** no campo `file` + campos de texto `to` (obrigatório), `type`, `caption`, `fileName`, `ptt`, `cold` e `idempotencyKey` (strings; `"true"` liga `cold`/`ptt`). Teto de 100 MB por arquivo. **Desde 25/09/2026 (P-054):** o gateway lê o corpo inteiro antes de enviar, então os campos valem em qualquer ordem (antes ou depois do arquivo); **2+ arquivos → 413** `{"statusCode":413,"message":"reach files limit"}` e nada é enviado (antes: 500); arquivo acima do teto → 413; campo com nome reservado (ex.: `toString`, `__proto__`) → 400; parte de texto declarada `application/json` com JSON inválido → 406; mais de 1000 partes → 413; sem arquivo ou sem `to` → 400. O node n8n usa `media-url`, não esta rota.
- **Limite específico do WWEBJS (E6):** o arquivo já obtido pelo gateway pode ter até 24 MB para envio pela engine WWEBJS; acima disso a rota retorna 400 sem chamar o WhatsApp Web (o teto global de upload/URL continua igual para as demais engines). O envio WWEBJS tem limite de espera de 120 s. Se responder 400 com "sem confirmação", o envio ainda pode terminar: **não reenvie às cegas**. Com `idempotencyKey`, a reserva permanece pendente até o resultado real; confira a conversa antes de qualquer nova tentativa.
- **Menções (W5, aditivo):** `text` e `media-url` aceitam `mentions: ["5511888888888", ...]` (números ou JIDs a marcar com @; até 50). Funciona nas duas engines (resolvidas ao formato de cada uma). Ex.: `{ "to": "...", "text": "olá @fulano", "mentions": ["5511888888888"] }`.
- **Reação (W5, aditivo):** `POST /api/sessions/{sessao}/messages/{msgId}/reaction` com `{ "emoji": "👍" }` — `emoji` vazio (`""`) REMOVE a reação. `msgId` = keyId do WhatsApp (o mesmo que `read` e o download de mídia aceitam). 404 se a mensagem não for conhecida. Funciona nas duas engines.
- **Encaminhar (E24 · P-068, aditivo — sobe no deploy da Onda 8):** `POST /api/sessions/{sessao}/messages/{msgId}/forward` com `{ "to": ["5511999999999", "5511888888888"], "cold"?: false, "idempotencyKey"?: "fwd-lead-42" }` — encaminha como o WhatsApp Web: a cópia chega com o selo **"Encaminhada"** (a mídia é a mesma da original, sem novo upload) e **sem** a citação/menções da original. `msgId` = id interno (`GET /messages`) ou keyId (webhook) de uma mensagem **desta sessão** (de outra sessão → 404). Funciona nas duas engines.
  - **Limites (anti-ban, decisão do dono):** 1 a **5** destinos por pedido, sem repetir (o mesmo número com e sem o 9º dígito conta como repetido → 400); se a original já é **"encaminhada com frequência"** (`forwardingScore ≥ 5`), **só 1 destino** (400 `FORWARD_LIMIT`). Um destino por vez, com **1 a 3 s** entre os envios (a resposta leva alguns segundos). Destinos aceitos: número, jid de contato (`@s.whatsapp.net`/`@c.us`), grupo (`@g.us`) e `@lid` — canal (`@newsletter`) e lista/status (`@broadcast`) → 400.
  - **Cold:** destino **sem conversa** na sessão (nenhuma mensagem RECEBIDA desse contato/grupo, **no número exato** — a variante com/sem o 9º dígito NÃO conta: pode ser outra pessoa, ex. celular 11 9 4123-4567 × fixo 11 4123-4567) vira **cold à força** — passa pela trava do guard-rail e conta como 1º contato no reply-rate. A cópia vai sempre para o número que você mandou. `cold: true` marca todos como cold; `cold: false` **não** tira o cold de quem não tem conversa (diferente do `/text`, onde o cold é só o que o cliente diz). Sessão bloqueada (quarentena/banida/pausa) com **algum** destino cold → **HTTP 423 `SESSION_QUARANTINED` no pedido inteiro, nada é enviado** (nem para quem tem conversa — separe os destinos se quiser mandar só para esses); vale também na repetição de um pedido que já saiu em parte (o 423 traz `results`; os já enviados aparecem `ok: true, deduped: true` e a nova repetição com a mesma chave não os reenvia).
  - **Resposta 201:** `{ "results": [ { "target", "to", "ok", "id", "deduped", "cold", "idempotencyKey", "isForwarded"?, "forwardingScore"?, "confirmed"?, "status"?, "code"?, "error"? } ] }` — uma posição por destino, na ordem de `to` (`target` = o destino exatamente como veio). `id` = keyId da cópia; `to` = jid usado. Selo que saiu: original de terceiro → `isForwarded: true`, `forwardingScore` da original + 1; original **nossa** → sem selo (`isForwarded: false`) se ela nunca foi encaminhada, ou o MESMO contador se já era encaminhada (o WhatsApp não soma ao encaminhar a própria mensagem). `isForwarded`/`forwardingScore` **não vêm** em item `deduped` (repetição) nem quando `confirmed: false`. WWEBJS: `confirmed: false` + `id: null` = o WhatsApp Web encaminhou, mas o id da cópia não chegou a tempo (ela ainda entra no webhook/`GET /messages` se o eco chegar em seguida) — **não reenvie**. Algum destino ok → 201 (os que falharam trazem `ok: false`, `status`, `error`); nenhum ok → o status comum (409, 400) ou 400 `FORWARD_FAILED`, com `results` no corpo. **Sem `results`:** as recusas que acontecem antes de olhar os destinos — 400 de validação/destino, 400 `FORWARD_UNSUPPORTED` pelo tipo **gravado** e `FORWARD_LIMIT` pelo contador **gravado**, 404 e o 409 da chave do pedido. **Com `results`** (cada item com `status`/`code`/`error`): as recusas descobertas depois de reservar — apagada/editada, tipo vivo/visualização única (`FORWARD_UNSUPPORTED`), original indisponível (`FORWARD_SOURCE_UNAVAILABLE`), contador **vivo** ≥ 5 (`FORWARD_LIMIT`), sessão não conectada (`FORWARD_FAILED`) — e o 423, que traz também `state` (`quarentena` \| `banida` \| `pausa_manual`) e **não** traz `statusCode` (📎 26/09, E25 — conferido no `forward.service.ts`).
  - **Idempotência:** a `idempotencyKey` vale para o **pedido**: repetir o mesmo pedido (mesma mensagem e mesmos destinos, em qualquer ordem) devolve `deduped: true` sem reenviar e retoma só os destinos que falharam; a mesma chave com **outra** mensagem ou **outro** conjunto de destinos → **409** (nada é enviado). Cada destino usa a chave `<idempotencyKey>:<destino>` (ex.: `fwd-lead-42:5511999999999`) — é ela que vem em `results[i].idempotencyKey` e no `idempotencyKey` do webhook `message` da cópia. Não reutilize essa chave derivada em outra rota (passa de 200 caracteres → 400).
  - **Recusas antes de enviar (400):** `FORWARD_UNSUPPORTED` — apagada, editada (até a P-069), visualização única, mensagem temporária já expirada, enquete, evento, convite de grupo, localização em tempo real, respostas de botão/lista e mensagens de empresa, voto, `other` e, **no Baileys**, figurinha animada (lottie — no WWEBJS ela passa); `FORWARD_SOURCE_UNAVAILABLE` — a original não está mais disponível: no **Baileys**, o gateway guarda a original completa por `RETENTION_MESSAGE_RAW_DAYS` (7 dias) a partir desta versão — sem ela, **só texto** é encaminhado (mídia, localização e contato antigos, não); no **WWEBJS**, a mensagem precisa estar no WhatsApp Web da sessão. Nesses casos, encaminhe pelo celular. A repetição de um pedido que já saiu segue `deduped` mesmo que a original seja apagada/editada depois. ⚠️ **Sem a original** (recebida antes desta versão, ou há mais de 7 dias no Baileys), o gateway só conhece o `type`/`text` da linha: uma resposta de botão/lista ou mensagem de empresa (gravadas como `text`) sai como texto simples, com o selo e sem os botões; e um TEXTO que o contato apagou/editou **antes desta versão** (sem a marca) também sai.
  - **Webhook da cópia:** evento `message` com `fromMe: true`, `source: "api"` (não pausa a IA — não é handoff), `isForwarded`/`forwardingScore` da cópia, `isCold` efetivo e a chave derivada. O chat de destino vai para 🟢 na caixa única (§13), como qualquer envio.
- **Localização (W5, aditivo):** `POST /api/sessions/{sessao}/messages/location` com `{ "to": "...", "latitude": -23.55, "longitude": -46.63, "name": "Escritório", "address": "Av. ..." }` (`name`/`address` opcionais; mesmos `cold`/`idempotencyKey`). Funciona nas duas engines.
- **Enquete/poll (W5, aditivo):** `POST /api/sessions/{sessao}/messages/poll` com `{ "to": "...", "name": "Qual horário?", "options": ["Manhã","Tarde"], "multi": false }` (2..12 opções; `multi` = múltipla escolha; mesmos `cold`/`idempotencyKey`). Funciona nas duas engines. **Nota:** a CAPTURA de votos via webhook (`vote_update`) ainda não está exposta — os votos aparecem no app; captura automática = incremento futuro.

## 3. Webhooks — receber eventos (G2/G3/G6)

Registre um webhook (ou use o Trigger do node):

```
POST /api/webhooks
{ "url": "https://seu-n8n/webhook/...", "events": ["*"], "secret": "opcional-hmac" }
```

Cada entrega é `{ id, timestamp, event, sessionId, session, payload, engine }`, assinada com
**HMAC-SHA512** no header `x-webhook-signature` (se houver `secret`).

> **Egress (09/2026, ABE-06):** a `url` do webhook segue a mesma política de saída — http/https,
> sem credenciais na URL, destino público (rede privada/loopback/metadata é recusada no cadastro
> com 400 e, se o DNS mudar depois, na entrega — o evento vai direto para a dead-letter com o
> motivo). n8n na mesma rede Docker? Libere o host em `EGRESS_ALLOW_HOSTS`. Redirect do destino
> **não é seguido** (a assinatura não pode vazar para outro host). Os `headers` customizados do
> webhook não sobrescrevem `Content-Type` nem `x-webhook-signature`.

Catálogo:

| Evento                                                       | Quando                 | Payload-chave                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message`                                                    | inbound/eco            | **`source` (api\|phone)**, **`isCold`**, `type`/`text` (ver §3.2), `isForwarded`/`forwardingScore` (E22), `senderJid` (em grupo = o participante — E23) — base do handoff IA×celular                          |
| `message.ack`                                                | entrega/leitura/erro   | `{ keyId, chatJid, fromMe, status: sent\|delivered\|read\|error, timestamp }` (casar por `sessionId` + `keyId`; `error` não mostra tique)                                                                     |
| `message.reaction` (W6, aditivo)                             | o contato/você reagiu  | `{ keyId (msg-alvo), chatJid, senderJid (quem reagiu), emoji ('' = removida), fromMe, timestamp }` — 2 engines; **desde a E22 é o ÚNICO canal da reação**                                                     |
| `session.throttled\|quarantined\|warming\|recovered\|banned` | transição guard-rail   | quarantined: `{ reply_rate, amostra, motivo, cooldown_ate, cap_novo }`                                                                                                                                        |
| `signal.463` / `signal.restriction`                          | sinal duro             | `{ signal }`                                                                                                                                                                                                  |
| `session.restricted` (E8, aditivo)                           | pausa nativa Baileys   | `{ signal: "463"\|"reachoutTimeLock"\|"message-capping", pausedUntil, timeEnforcementEnds, source, enforcementType }` — datas ISO UTC; `timeEnforcementEnds` só quando confirmado pela resposta direta do RPC |
| `session.client_too_old` (E9, aditivo)                       | protocolo recusado 405 | `{ code: 405, reason }` — alerta de versão; a sessão fica `FAILED` sem tentar conectar cinco vezes                                                                                                            |
| `session.status`                                             | estado da sessão       | `{ status, error?, lastErrorDetails? }` — `error` continua texto; em desconexão terminal do Baileys, `lastErrorDetails: { code, reason }` traz o código e motivo brutos                                       |
| `send.blocked`                                               | hard-gate barrou envio | `{ state, motivo, restriction_until? }` (`restriction_until` só na pausa nativa)                                                                                                                              |

> **Origem do prazo (E8):** `source: "temporary"` indica pausa provisória. A notificação
> `reachoutTimeLock` da Baileys rc14 chega por `connection.update` com um `Date` que pode ter vindo
> do servidor **ou ter sido criado pela própria biblioteca como agora + 60 s**; o evento não informa
> qual dos dois ocorreu. O gateway preserva um prazo válido dessa notificação, inclusive se passar
> de 60 s, mas publica `timeEnforcementEnds: null` até receber a **resposta direta** de
> `fetchAccountReachoutTimelock()`. Só essa resposta usa `source: "timeEnforcementEnds"`.
> O limite de 3 s encerra a espera, sem cancelar o RPC: uma resposta tardia ainda pode confirmar
> o prazo se a consulta e o socket continuarem atuais. `source: "cycle_end_timestamp"` identifica
> o prazo do capping, não o timelock confirmado; um ciclo mais curto não encurta uma pausa
> `temporary` já persistida.
>
> Uma sessão pode gerar primeiro um `session.restricted` provisório e depois outro com prazo
> confirmado. O `connection.update` emitido pela própria consulta também pode produzir um alerta
> provisório adicional. Trate mudança de `source` ou `pausedUntil` como atualização da mesma
> restrição e agrupe reentregas por `sessionId`, `source` e `pausedUntil`.

> **Handoff (G2):** `source: "phone"` num `fromMe` = o humano respondeu pelo celular → pause a IA.
> **Reação não é handoff (E22, D-028):** reagir pelo celular não gera mais `message` `source=phone`
> (no Baileys gerava) — a IA não pausa por causa de um 👍 do dono. `message.reaction` não tem
> `source`: reação pela API e pelo celular chegam iguais (`fromMe: true`).
> **C4:** o webhook OUT tem retry + **dead-letter** — se o n8n cair, o evento não some (ver §6).
> **C5:** NÃO existe evento de "bloqueado/denunciou" (impossível detectar no WhatsApp).
> **C6 (dedup de status — D-015):** `session.status` só é entregue quando o estado MUDA de fato —
> um status idêntico consecutivo (mesmo `status` + mesmo `error`) NÃO é reenviado. Uma reconexão
> transitória que volta a `WORKING` não gera novo evento. **Trate a transição, não a repetição** —
> não conte "quantos WORKING chegaram" para inferir reconexões (use `message.ack`/timeline p/ isso).
> O motivo bruto em `lastErrorDetails` pode ser atualizado no cadastro da sessão sem novo
> `session.status`; ele não entra na chave de deduplicação do evento.

### 3.1 Mídia recebida — obter os BYTES (voz/imagem/PDF) — contrato CP-149 (GAP 2)

Mensagens de mídia chegam no webhook com `mediaType/mimetype/fileSize` e, quando o binário foi
armazenado, também `mediaKey` + `mediaUrl` (URL S3 pré-assinada, TTL `MEDIA_URL_TTL`). Para o
consumo robusto (n8n externo), use o **download pelo próprio gateway** — não depende de o S3 ser
público nem do TTL, e permite re-obter a mídia depois:

**WWEBJS a partir da E6:** mídia recebida em grupo sai por padrão só com metadados, sem
`mediaKey`/`mediaUrl`; `GET .../media` responde 404 nesse caso. Para baixar automaticamente mídia
de grupos, o operador define `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA=true` no gateway e aplica na janela
de deploy. Mídia 1:1 continua baixando, agora em blocos de 2 MB com teto de 24 MB e fila por sessão.
O campo `mediaKey` já era opcional; consumidores devem testar sua presença antes de baixar.

**Baileys após o deploy B da Onda 2 (E10):** a mídia recebida tem até 90 s para baixar, incluindo
uma tentativa de reupload de até 20 s quando a CDN responde 404/410. Foto, áudio, documento,
vídeo e vídeo redondo (`ptvMessage`) seguem o mesmo contrato. O download usa o proxy HTTP/HTTPS
escolhido para a conexão daquela sessão; se a sessão usa SOCKS, o download automático ainda não
foi validado e a mensagem sai somente com metadados, sem `mediaKey`/`mediaUrl`. O mesmo fallback
vale se o download, reupload ou armazenamento falhar. Nesses casos, `GET .../media` responde 404.
O limite de 90 s cobre o download e o reupload, não a gravação no S3. Não há campo, rota ou evento
novo; o reupload depende de outro aparelho ainda ter a mídia. Esta mudança está apenas no PR da
Onda 2 até merge e deploy manuais.

```
GET /api/sessions/{sessao}/messages/{msgId}/media
Header: X-Api-Key: <chave>          (ou Bearer do painel)
→ 200  Content-Type = mimetype original; body = bytes da mídia
→ 404  motivo claro (mensagem sem mídia / binário não armazenado / expirado)
→ 503  "Armazenamento de mídia indisponível no momento" (S3/MinIO fora — tente de novo)
```

- **Nome do arquivo e tipo (E23):** `Content-Disposition: inline; filename="<nome>"` quando o
  `fileName` cabe no Latin-1 e não tem `%`, `\`, `;` nem `=` (igual a antes). Nome com travessão,
  aspas curvas, reticências ou emoji — que até a E23 derrubava a rota com **500** — ou com um desses
  quatro caracteres (que o parser do n8n lia errado: `%` solto lançava "URI malformed", `%41` virava
  `A`, `a;b` virava `"a`) sai com o par `filename="<nome ASCII: o resto vira _>";
filename*=UTF-8''<nome percent-encoded>` (RFC 5987; quem entende `filename*` usa ele — MDN; o n8n
  1.x e 2.x leem). Limitação do n8n (não contornável daqui): nome fora do Latin-1 **com apóstrofo**
  chega cortado no apóstrofo — o nome exato, em UTF-8, está sempre no `fileName` do `GET /messages`.
  O `Content-Type` é o `mimetype` da mensagem; se ele não cabe num header (vem do remetente —
  CR/LF, não-ASCII, tipo composto), vale o tipo do objeto no S3 ou `application/octet-stream`
  (antes: 500).

- `{msgId}` aceita **os dois** identificadores: o **`keyId` do WhatsApp** (o mesmo que vem no
  `payload` do webhook — ex.: `3AD5B95A7C36FE832C31`) **ou** o **`id` interno (ULID)** do
  `GET /messages`. O `GET /messages` agora também expõe `keyId` em cada item.
- Fluxo n8n típico: webhook `message` com `mediaType=audio` → HTTP Request
  `GET .../messages/{{$json.payload.keyId}}/media` (responseFormat: file) → Whisper/gpt-4o.
- **Pré-requisito de infra:** o gateway só armazena o binário se o S3 estiver configurado
  (`S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY` — MinIO no Dokploy ou Cloudflare R2).
  Sem S3, a mensagem chega só com metadados e o download responde 404 explicando.

### 3.2 Conteúdo das mensagens — `type`, `text` e reação (E22 · P-066 · D-028)

**Fila offline Baileys (E7 · P-047, após o deploy B):** mensagens de terceiros recebidas durante
queda/reconexão/deploy, emitidas pela rc14 como `messages.upsert` `append`, passam pelo mesmo evento
`message` das recebidas ao vivo. O `payload.timestamp` conserva o horário original do WhatsApp;
o `timestamp` do envelope é o horário de publicação pelo gateway. Só entram mensagens com até 48 h
(tolerância de 5 min para relógio adiantado), uma vez por `sessionId` + `keyId`. Eco dos envios da
API/celular no `append`, status e newsletter não viram `message`. O formato público é o mesmo, sem
campo novo; um fluxo que não queira responder a uma entrada antiga pode comparar os dois horários.
Reações continuam exclusivamente em `message.reaction`.

Desde a etapa E22 (25/09/2026, sobe no deploy da Onda 8) o evento `message` e o `GET /messages`
trazem o conteúdo como o WhatsApp Web mostra — nas **duas engines**, com o mesmo texto:

| `type`                                       | Quando                                                                        | `text`                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `text`                                       | texto, resposta de botão/lista/fluxo, mensagem de empresa (menu/lista/modelo) | o texto (inclusive emojis)                                                                      |
| `image` `video` `audio` `document` `sticker` | mídia (vídeo redondo = `video`; figurinha animada = `sticker`)                | a legenda (ou null) — bytes via §3.1 (sem `mediaKey` quando o arquivo não veio: `/media` → 404) |
| `location`                                   | localização (fixa ou em tempo real)                                           | `Nome — Endereço` + linha com `https://maps.google.com/?q=lat,lng`                              |
| `contact`                                    | cartão de contato (um ou vários)                                              | `Nome — telefone(s)`, um contato por linha                                                      |
| `poll`                                       | enquete                                                                       | a pergunta + uma opção por linha (`• opção`)                                                    |
| `event`                                      | evento                                                                        | nome + descrição                                                                                |
| `group_invite`                               | convite de grupo                                                              | nome do grupo + legenda                                                                         |
| `poll_vote`                                  | o contato votou numa enquete (Baileys)                                        | null (o voto é cifrado) — continua contando no reply-rate                                       |
| `other`                                      | tipo sem cartão próprio (produto, pedido, pagamento…) ou ainda desconhecido   | resumo legível quando houver, senão null                                                        |

- **Reação NÃO é mais `message`.** Antes (Baileys) toda reação saía TAMBÉM como `message` `type:
"other"`, `text: null` (o "…" do painel). Agora ela sai só como **`message.reaction`**, é gravada
  e aparece em `reactions[]` da mensagem-alvo no `GET /messages` (§12). Webhook que assina só
  `["message"]` **deixa de receber reação** — veja o item 1 da lista abaixo (não crie um 2º
  webhook para a mesma URL).
- **Não viram `message`** (não são mensagem no chat): reação (inclusive cifrada), voto NOSSO,
  resposta a evento, fixar/manter, pedido de telefone, menção em status, álbum-mãe (cada foto do
  álbum chega como mensagem própria), editada/apagada (P-069), notificações de sistema e ligação
  (`call_log`, wwebjs).
- **Selo "Encaminhada":** `isForwarded` (boolean) e `forwardingScore` (quantas vezes já foi
  encaminhada; null quando não é). Nos ecos de envio pela API (`source: "api"`) os dois campos NÃO
  vêm — ausente = não encaminhada —, **exceto no eco do encaminhar** (`/forward`, E24), que traz o selo da cópia: original de terceiro → `forwardingScore` da original + 1; original nossa → sem selo, ou o mesmo contador se ela já era encaminhada. "Encaminhada com frequência" no WhatsApp = cadeia de 5 ou mais
  conversas (FAQ oficial) → use `forwardingScore >= 5`.
- **Ecos de localização e enquete enviadas pela API (E24 · P-077 — muda o `text` do webhook):**
  o evento `message` do eco de `POST …/messages/location` e `POST …/messages/poll` passa a trazer
  o MESMO texto da recebida (tabela acima): localização = `Nome — Endereço` (o que houver) + linha
  com o link do mapa — sem nome nem endereço, só o link; enquete = pergunta + `• opção` por linha.
  Até a E24 vinha só o nome do local (ou o endereço; null sem os dois) e só a pergunta. Fluxo que
  comparava esse `text` com o que enviou: na enquete, compare a 1ª linha com a pergunta; na
  localização, use as coordenadas do link (a 1ª linha junta nome e endereço).
- **`message.reaction.senderJid`** é quem reagiu (em grupo, o participante). Até a E22 o Baileys
  mandava `""` em conversa 1:1 e, em grupo, o autor da mensagem-alvo. O `chatJid` da reação agora
  vem no mesmo formato do `chatJid` das mensagens (telefone quando o `@lid` é conhecido).
- Mensagens antigas (antes do deploy) continuam como estavam: reações antigas seguem gravadas como
  `other` (não se recuperam) e não aparecem em `reactions[]`.
- **`senderJid` em GRUPO (E23 · P-074):** numa mensagem RECEBIDA em grupo (`chatJid` termina em
  `@g.us`), `senderJid` passa a ser o **participante que escreveu** — telefone quando conhecido
  (`@s.whatsapp.net` no Baileys, `@c.us` no WWEBJS), `@lid` quando o WhatsApp não revela o número.
  Até a E23 vinha o jid do próprio grupo (= `chatJid`, sem utilidade). Não mudam: conversa 1:1,
  mensagens nossas (`fromMe`), grupo sem participante na chave e as linhas já gravadas no banco
  (as de grupo gravadas ao vivo seguem com o jid do grupo; as importadas pelo `/sync` do WWEBJS já
  traziam o autor cru, às vezes `@lid` — a mesma pessoa pode aparecer com `@lid` nas antigas e com
  telefone nas novas). No
  WWEBJS o `@lid` só vira telefone pelo cache da sessão — nenhuma consulta ao WhatsApp é feita para
  descobrir o número.

**O que conferir nos seus fluxos n8n (mudança de comportamento — tipo `other`):**

1. Fluxo que tratava reação como "lead respondeu" (CRM, cancelar follow-up) **para de disparar com
   reação** se o webhook assina só `["message"]`. Como voltar a receber:
   - **Trigger do node 0.4.1:** troque o **Events** do nó para **All Events (`*`)** e salve (o nó
     recria o webhook dele com `*`); logo depois do Trigger, um **Switch por `{{$json.event}}`**:
     `message` → a lógica atual; `message.reaction` → ramo próprio; o resto (`message.ack`,
     `session.*`, `webhook.test`) descartado. Sem o Switch, um `message.ack` de mensagem recebida
     (`fromMe: false`) chegaria na IA.
   - **Webhook próprio:** só com um nó **Webhook do n8n separado** (URL própria), cadastrado via
     `POST /api/webhooks` com `["message.reaction"]`.
   - ⚠️ **Nunca** cadastre webhook (API ou painel) na URL de um Trigger (`…/webhook/<id>/webhook`): o
     nó "adota" o webhook pela URL e, no próximo salvar, apaga o original — o fluxo para de receber
     `message` sem aviso. O painel não edita eventos: para mudar, remova e recrie; **não** crie um 2º
     webhook com `message` para a mesma URL (cada mensagem chegaria em dobro e a IA responderia 2×).
2. IF/Switch que descartam `type === "other"` ou `text == null`: viram inofensivos (reação não chega
   mais por ali). Remova quando quiser.
3. IA de atendimento: reação **não aciona** mais a IA; localização, contato, enquete, evento e
   convite passam a chegar **com texto** — a IA vai responder a eles. No Baileys, menus, listas e
   modelos de robôs de empresa e respostas de botão/lista (antes `other`, texto null) passam a chegar
   como `text` — filtre por remetente ou `type` se não quiser a IA conversando com robôs.
4. Handoff: reação, voto e fixar/manter feitos pelo dono no celular **não pausam mais** a IA (só
   texto/mídia com `source: "phone"`).
5. Quem lia `message.reaction.senderJid` recebia `""` em 1:1 e o autor do alvo em grupo — agora é
   quem reagiu.
6. Sessões WWEBJS: filtros `type === "text"` param de pegar enquete/evento/localização/contato
   (antes tudo saía `text`); mídia sem arquivo no servidor chega como `image`/`video`… com
   `mediaType` e sem `mediaKey` (antes vinha `text` com o base64 da miniatura).
7. Fluxos com `["*"]` deixam de receber a reação em dobro (`message` + `message.reaction`) — remova
   qualquer dedup feito para isso.
8. Números de saúde: reação do contato conta como resposta no reply-rate (§4).
9. **Grupos (E23 · P-074):** para responder num grupo, mande SEMPRE para `payload.chatJid` (o
   grupo). Um fluxo que usava `senderJid` como destino (`to`) numa mensagem de grupo passaria a
   mandar **no privado do participante** — contato frio, fora do contexto e com risco para a
   conta. Detecte grupo por `chatJid.endsWith('@g.us')`, nunca por `senderJid`.

## 4. Saúde e reply-rate (G4/G7)

```
GET /api/sessions/{sessao}/health
→ { state, reply_rate, amostra, score, cap_base, cap_atual, cooldown_ate, restriction_until, ultimos_sinais, enforce }
GET /api/observability/reply-rate/{sessao}?window=7   # ou 30; sem window = ambas
GET /api/sessions?state=ativa,aquecimento             # filtra a listagem por estado guard-rail
```

`GET /metrics` (fora de `/api`, com `Authorization: Bearer <METRICS_TOKEN>`) expõe
`wa_disconnects_total{engine,code}`. É o total de eventos `connection.update` com `close` desde o
boot deste processo, incluindo o 515 de reinício do pareamento; o rótulo `code` cobre
401/403/405/408/411/428/440/500/503/515 e usa `other` para código ausente ou desconhecido.
O valor zera quando o processo reinicia; para alertas de frequência, use `rate()` no Prometheus.
O endpoint responde 401 se `METRICS_TOKEN` estiver ausente ou incorreto.

`reply_rate` exclui cold-sends com menos de **72h** (imaturos) e só dá veredito com **amostra ≥ 20**.
Resposta = **mensagem OU reação do contato** em até 72h do cold (E22, D-028 — antes a reação contava
por ser gravada como mensagem `other`; o voto em enquete continua contando como mensagem `poll_vote`).
Deixam de contar como resposta desde a E22 (antes eram gravados como `other`): fixar/manter, resposta
a evento, pedido de telefone (Baileys) e ligação (`call_log`, wwebjs) — raros; menção em status e
notificações de sistema do wwebjs, que contavam por engano, também saem.

## 5. Guard-rail: estados, hard-gate e tuning (G5/G7)

Estados: `ativa | throttled | quarentena | aquecimento | banida | pausa_manual`.

- **Hard-gate G5:** um envio `cold: true` numa sessão em quarentena/banida/pausa manual responde
  **HTTP 423 `SESSION_QUARANTINED`**. Sem restrição nativa, `cold: false` (chat aberto) passa por
  esses estados. Trate o 423 ramificando e re-enfileirando o lead.
- **Restrição nativa Baileys (E8/P-048):** `463`, `reachoutTimeLock` ativo ou
  `message-capping.update` com `capping_status=CAPPED` pausam **todos os envios de mensagem da
  sessão** (inclusive `cold: false`, mídia, localização, enquete, reação, encaminhamento e campanha)
  com o mesmo **423 `SESSION_QUARANTINED`** e `state: "quarentena"` no erro. O `state` persistido de
  G5 não vira `banida` nem quarentena de 48 h por `463`. O prazo efetivo é
  o campo `restriction_until` de `GET /sessions/:id/health`; ao vencer, o próximo envio passa automaticamente,
  sem `/activate`, restart ou `/resume` da campanha. O `timeEnforcementEnds` confirmado na resposta
  direta de `fetchAccountReachoutTimelock()` prevalece sobre o `cycle_end_timestamp` do capping.
  A espera da consulta tem teto de 3 s e intervalo mínimo de 30 s; o teto não cancela o RPC, cuja
  resposta tardia ainda pode confirmar o prazo se o socket e a consulta continuarem atuais.
  Enquanto ela falhar ou não responder, o prazo válido da notificação `reachoutTimeLock` continua
  provisório (`source: "temporary"`), mesmo acima de 60 s. Um `cycle_end_timestamp` mais curto não
  reduz esse prazo; sem qualquer prazo válido, o fallback é de 60 s. O alerta provisório traz
  `timeEnforcementEnds: null`, e seu vencimento local não confirma o fim remoto da restrição.
  O node n8n 0.4.1 já trata 423; inscreva o webhook em `session.restricted` ou `*` para receber o
  alerta.
- **Campanhas (09/2026, ABE-02):** `POST /api/campaigns` aceita `firstContact` (default `true`).
  Campanha de 1º contato passa pelo MESMO hard-gate (sessão em quarentena/pausa manual → a
  campanha é **pausada**, não falha por destinatário), envia com `cold: true` (conta no reply-rate)
  e usa `idempotencyKey` determinística por destinatário (retry/stall da fila não duplica).
  `firstContact: false` = campanha para contatos que já conversam com a sessão (sem gate G5).
  Sob restrição nativa, as duas modalidades re-agendam o job sem mudar a campanha para `PAUSED`;
  a fila retoma após o prazo. Se o sinal chegar depois da reserva, o destinatário é liberado e
  re-agendado.
  O `dailyCap` agora conta o **dia local** (fuso da `SessionConfig`), não o total acumulado.
- **Quarentena/cooldown (09/2026, P-030):** uma sessão em quarentena só volta a `ativa` depois
  do `cooldown_ate` (mesmo que a taxa melhore antes) e uma quarentena aplicada por override
  manual só sai por outro override (`activate`/`warmup`). `401`/loggedOut da engine NÃO vira
  `banida` (é credencial perdida); só `ban`/`restriction` sem prazo viram `banida`. `463` usa a
  pausa temporária acima, independente de `GUARDRAIL_ENFORCE`.
- **MODO OBSERVAÇÃO (padrão em instalação nova):** `GUARDRAIL_ENFORCE=false` → a avaliação
  automática mede, mas não aplica quarentena. Override manual ainda pode bloquear. **Ligue
  (`true`) só depois de ter a mediana real da frota.**
- **Override manual:** `POST /api/sessions/{sessao}/quarantine|warmup|activate|pause`.
- **Tunar limiares sem redeploy:** `GET`/`PATCH /api/guardrail/config`
  (`{ nmin, throttleMult, quarantineMult, targetReplyRate, cooldownHours }`).
- **Observador de não-entrega WWEBJS (opt-in no gateway):**
  `UNDELIVERED_SWEEP_MIN=0` por padrão. Quando habilitado pelo operador, apenas registra no log
  cold-sends sem confirmação em ≥3 chats (limiares ajustáveis por env). ACK atrasado é indício
  inconclusivo: o observador não muda `session_guardrail`, não emite `signal.restriction` nem
  `session.banned` e não altera respostas da API. Nenhuma configuração é exigida do integrador.

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
POST /api/sessions/{sessao}/profile/photo    # W8b { url } — foto de perfil (o gateway baixa a imagem; ≤10 MB)
```

`cap_atual` é derivado do estado: quarentena/banida/pausa=0; throttled≈50% do base; aquecimento=curva[0]; ativa=capBase.

**Canário WWEBJS (E5, após o deploy da Onda 6):** `PATCH /api/sessions/{sessao}/config`
aceita `{"wwebjsWebVersion":"2.3000.1046934385-alpha"}`. `GET .../config` devolve o valor
persistido; `null` remove o override e volta à `WWEBJS_WEB_VERSION` global. Também aceita `auto`
(build mais nova do catálogo) e `live` (sem pin). Só a próxima inicialização da sessão usa a
mudança: não reinicie uma conta conectada para testar a configuração. A versão efetiva e a versão
do Chromium aparecem no log do gateway após `ready`; a candidata ainda exige teste com chip
(pareamento, sincronização, leads com telefone e envio). O contrato das demais rotas não muda.

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
- **Custo:** na engine WWEBJS a resolução é em **lote** (uma leitura da agenda + LID→telefone em
  blocos de 50), então até grupos grandes voltam em poucos segundos; no Baileys os metadados já vêm
  prontos. É extração pontual, não hot path. Os leads resolvidos ficam no diretório de contatos.

### 9.1 Administração de grupo (criar / participantes / convite / info)

Operações de escrita em grupos que a sessão **admin** pode executar. No node: resource **Group**.

```
POST /api/sessions/{sessao}/groups                              { "subject": "Time", "participants": ["5511..."] }
POST …/groups/{groupId}/participants   { "action": "add|remove|promote|demote", "participants": ["5511..."] }
POST …/groups/{groupId}/leave                                   # sair do grupo
POST …/groups/{groupId}/subject                                 { "subject": "Novo nome" }
POST …/groups/{groupId}/description                             { "description": "..." }
GET  …/groups/{groupId}/invite                                  # { code, url }
POST …/groups/{groupId}/invite/revoke                           # revoga e devolve o novo { code, url }
```

### 9.2 Moderação e configuração de grupo (W8 — fila de entrada / travas / foto)

```
GET  …/groups/{groupId}/membership-requests                     # fila de entrada pendente
POST …/groups/{groupId}/membership-requests   { "action": "approve|reject", "participants"?: ["5511..."] }
POST …/groups/{groupId}/settings              { "announce"?: true, "restrict"?: false }
POST …/groups/{groupId}/photo                 { "url": "https://.../foto.jpg" }
```

- **`GET membership-requests`** → `[{ id, phone, requestedAt }]` (fila de quem pediu para entrar).
- **`POST membership-requests`** aprova/rejeita. Sem `participants`, age sobre **toda** a fila; a engine
  aplica **anti-flood** entre um pedido e o outro (pausa de 250–500 ms) — moderar em massa é seguro.
- **`settings`** → `announce: true` = **só admins enviam** mensagem; `restrict: true` = **só admins
  editam** os dados do grupo. Informe um dos dois ou ambos.
- **`photo`** — o gateway **baixa a imagem da URL** (≤10 MB) e a define como foto do grupo (mesmo
  padrão de `POST …/profile/photo`). **Desde 25/09/2026 (P-070):** a URL das duas rotas de foto
  segue a política de egress do `media-url` (§2): só `http`/`https` (`data:` e outros esquemas → 400);
  destino em rede privada/loopback/metadata → 400
  `URL da imagem recusada: …`; até 3 redirects, cada um revalidado; o download é cortado ao passar
  de 10 MB (400 `imagem acima de 10 MB`). Host interno legítimo → `EGRESS_ALLOW_HOSTS`.
- **Engine:** todas essas rotas funcionam nas **duas** engines (Baileys e whatsapp-web.js) — paridade.
- Resposta das rotas de ação: `{ "ok": true }`.

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
  `PUT /api/sessions/{id}/proxy`) seguem podendo usar qualquer proxy do pool em runtime. Nessa rota
  use o **`id` (ULID) da sessão** — o nome NÃO é resolvido ali: um PUT pelo nome responde 200 mas
  grava uma atribuição que nenhuma sessão lê (P-097).

### Sugerir o proxy da sessão apagada ao recriar com o mesmo nome (E26 · P-084 · D-038)

```
GET /api/proxies/suggestion?sessionName=vendas-02   # ADMIN — { "suggestion": ProxySuggestionDto | null }
```

- Ao **apagar** uma sessão (`DELETE /api/sessions/{sessao}`) que tinha proxy **fixo** (modo `SINGLE`),
  o gateway guarda na atribuição órfã o nome da sessão e a data — a resposta do DELETE não muda.
  Modos `NONE`, `RANGE` e `GLOBAL_ROUND_ROBIN` não guardam nada. Exclusões feitas antes do deploy da
  E26 (ou atendidas pelo container antigo durante a sobreposição start-first, B-004) não geram
  sugestão.
- A rota devolve o proxy que a sessão apagada **com esse nome** usava — nome igual **sem diferenciar
  maiúsculas/minúsculas** (prefere a mesma caixa; entre iguais, a exclusão mais recente). Sem memória:
  `{ "suggestion": null }`.
- **`ProxySuggestionDto`**: `proxy` (`ProxyDto`, ou `null` só quando o proxy foi excluído do pool),
  `fromSession` (nome como foi apagada), `releasedAt`, `available` (mesma régua do
  `/proxies/available`: existe, habilitado, não-DEAD e sem outra sessão viva usando) e `reason`
  (`IN_USE` · `DEAD` · `DISABLED` · `REMOVED` quando indisponível — `IN_USE` tem prioridade: um proxy
  preso a outra sessão viva sai como `IN_USE` mesmo se estiver DEAD ou desabilitado),
  `inUseBySession` (só com `IN_USE`: a sessão que está com o proxy).
- A rota responde sobre a **última sessão apagada** com esse nome — não confere se já existe uma
  sessão viva com o mesmo nome (nesse caso o proxy dela aparece como `IN_USE` pela própria sessão).
- É só uma sugestão: o `POST /api/sessions` **não muda** — quem cria escolhe (ou não) o `proxyId`, e
  a exclusividade continua validada na criação (D-008).
- Um `PUT /api/sessions/{id}/proxy` sobre a atribuição de uma sessão já apagada apaga essa memória.
- Erros: 400 (`sessionName` ausente ou fora de `[a-zA-Z0-9_-]{1,64}`); 401/403 (só ADMIN).

### Diagnóstico de desconexão Baileys (E9)

`GET /api/sessions` e `GET /api/sessions/{sessao}` preservam `lastError` como texto ou `null` e
acrescentam `lastErrorDetails: { code: number | null, reason: string | null } | null`. `code` é o
`output.statusCode` do erro Baileys; `reason` conserva `data.reason` ou `message` (até 500
caracteres). O detalhe pode mudar após um `close` sem alterar o estado ou publicar outro
`session.status`. Quando a sessão volta a `WORKING`, ambos os campos voltam a `null`.

401 indica logout: o gateway limpa as credenciais e fica `STOPPED`, exigindo novo QR. 403
(`forbidden`) e 411 (`multideviceMismatch`) ficam `FAILED` e exigem diagnóstico/intervenção; 405
fora da tentativa quieta do 440 também fica `FAILED`, emite `session.client_too_old` e pede o procedimento
[405 no Baileys](how-to/canario-baileys-onda2.md#resposta-ao-405-protocolo-recusado).
440 (`connectionReplaced`) aguarda 60 s e tenta uma única reconexão; se essa tentativa falhar
com qualquer código, o processo antigo encerra as tentativas localmente, sem persistir estado
terminal, limpar credenciais ou alertar pelo erro da tentativa, até existir exclusividade de
sessão (P-056). Um segundo `close` antes dos 60 s não adia nem duplica o timer. Nesse intervalo,
a engine local deixa de aceitar envio pelo socket fechado; o retry do 440 não publica QR nem
grava `STARTING` por cima do estado de outra réplica. 515
(`restartRequired`, inclusive após pareamento) reconecta após 1 s sem consumir o orçamento de
falhas; mais de três 515 seguidos sem `open` deixam a sessão `DEGRADED` para evitar um loop.
408/428/500/503 usam backoff limitado a cinco tentativas; 500 conserva o
motivo bruto em `lastErrorDetails.reason`. Um `WORKING` novo limpa o erro. Estes estados são do
transporte; a pausa temporária de envio da E8 continua independente deles (§5).

**Versão do protocolo:** cada tentativa de conexão Baileys registra no log do gateway
`Baileys protocolo <sessionId>: versão <versão> (<fonte>)`, visível no nível padrão da aplicação.
A fonte é `latest`, `cache`, `stale-cache`, `bundled` ou `canary-override`. A consulta
`fetchLatestBaileysVersion()` espera no máximo 3 s, com intervalo mínimo de 30 s; só
`isLatest:true` renova o cache de 12 h. Se a consulta falhar ou devolver `isLatest:false`, usa a
última versão confirmada ou a embutida da biblioteca, sem tratar o fallback como versão fresca.
Para testar uma candidata em **uma** sessão de teste, defina juntas as envs
`BAILEYS_PROTOCOL_VERSION=<major.minor.patch>` e
`BAILEYS_PROTOCOL_CANARY_SESSION_ID=<ID da sessão>`; uma env isolada impede o boot. O override não
altera as outras sessões. Aplicar/remover env no Dokploy exige Deploy manual em janela controlada,
conforme o runbook; não muda a versão em conexões já abertas.

### Último número conectado (E27, aditivo)

`GET /api/sessions` e `GET /api/sessions/{sessao}` ganharam **`lastMeJid`** (`string | null`): o
último `meJid` que esteve conectado. O `meJid` volta a `null` quando o celular desconecta (401);
`lastMeJid` fica — serve para achar a sessão caída pelo número e pré-preencher o link de conexão.
Nenhum campo existente mudou.

### Link público de conexão por QR (E27 · P-086 · D-037)

O operador gera um link temporário para **outra pessoa** conectar a sessão lendo o QR **em outra
tela** (computador ou outro celular) — ex.: a sessão caiu ou foi criada e o celular está com a
pessoa em outro lugar. Só sessões **BAILEYS** nesta versão (P-092). Criar/consultar/revogar exige
o **login do painel** (API key não — P-093).

```
POST   /api/sessions/{sessao}/connect-link   # { "ttlMinutes": 1440, "expectedPhone": "5511988887777" } — OPERATOR+
GET    /api/sessions/{sessao}/connect-link   # o link mais recente da sessão (ativo ou não), sem token — VIEWER+
DELETE /api/sessions/{sessao}/connect-link   # revoga o link ativo → { "ok": true, "revoked": 1 } — OPERATOR+
GET    /api/public/connect                   # Authorization: Bearer <token> — estado da página pública
POST   /api/public/connect/new-qr            # Authorization: Bearer <token> — pedir QR (sem corpo)
```

- **`ttlMinutes`** opcional, 10..4320 (72 h); padrão 1440 (24 h). **`expectedPhone`** opcional: o
  número que deve conectar (DDI + DDD + número, 10 a 15 dígitos; máscara é ignorada). Número
  brasileiro **sem o 55** (ex.: `11988887777`) recebe **400** "expectedPhone sem DDI" — ele nunca
  casaria com o número conectado. Com ele, se o
  QR for lido por **outro** WhatsApp, o gateway **desfaz a conexão** (desvincula o aparelho, limpa as
  credenciais, sessão `STOPPED` com `lastError` "Conectado com número diferente do esperado…",
  webhook `session.status`) e revoga o link. O 9º dígito brasileiro é tolerado. Sem `expectedPhone`,
  qualquer WhatsApp que ler o QR é aceito. Janela residual: o `session.status WORKING` do número
  errado e 1–2 s de mensagens dele podem chegar antes do desfazimento.
- **Resposta do POST (201):** `{ link: ConnectLinkDto, token, path }` — o `token` (43 caracteres)
  aparece **só aqui** (o banco guarda o hash); `path` = `/conectar#<token>` — prefixe com a origem do
  painel. O token vai no **fragmento** (`#`): não chega a log de servidor nem a `Referer`.
- **Um link ativo por sessão:** criar outro revoga o anterior (`revokedReason: "REPLACED"`). `POST
/api/sessions/{sessao}/stop` e `/logout` também revogam o link ativo (`SESSION_STOPPED`); remover
  a sessão apaga os links.
- **Erros do POST:** 400 (`ttlMinutes`/`expectedPhone` inválidos); 409 com `code`
  `CONNECT_LINK_ENGINE_UNSUPPORTED` (WWEBJS), `CONNECT_LINK_SESSION_WORKING` (já conectada) ou
  `CONNECT_LINK_SESSION_PAIRED` (tem login salvo — caiu por instabilidade: use Reiniciar; para
  conectar do zero, gere um novo QR antes). O link **nunca** apaga um login salvo nem derruba uma
  conta conectada.
- **`ConnectLinkDto`:** `id, sessionId, state` (`ACTIVE` · `CONNECTED` — conectou há até 15 min ·
  `USED` · `REVOKED` · `EXPIRED`), `createdAt, expiresAt, createdBy, expectedPhone, lastSeenAt`
  (última abertura da página, gravada no máx. 1×/min), `newQrCount, newQrMax, consumedAt, revokedAt,
revokedReason` (`MANUAL` · `REPLACED` · `SESSION_STOPPED` · `WRONG_NUMBER`).

**Rotas públicas** (a página `/conectar` do painel; `Cache-Control: no-store`; tetos por IP no §1):

| Resposta de `GET /api/public/connect`                                  | Quando                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200 `{state:"ACTIVE", phase, qr, expiresAt, expectedPhoneHint, newQr}` | link válido. `phase`: `QR` (QR válido agora — `qr` é data URL PNG), `PREPARING` (gerando/renovando ou finalizando uma leitura), `IDLE` (sem QR — pode pedir um), `PAIRING` (código de pareamento em andamento), `UNAVAILABLE` (precisa do operador: falha, login salvo) |
| 200 `{state:"CONNECTED", connectedAt}`                                 | conectou pelo link há até 15 min                                                                                                                                                                                                                                        |
| 404 `CONNECT_LINK_NOT_FOUND`                                           | token ausente, malformado ou desconhecido                                                                                                                                                                                                                               |
| 410 `CONNECT_LINK_USED` / `_REVOKED` / `_EXPIRED` / `_WRONG_NUMBER`    | usado há mais de 15 min · revogado/substituído · vencido · lido por outro número (conexão desfeita)                                                                                                                                                                     |

- `newQr = {available, remaining, max, retryAfterSeconds}`: `available` só na fase `IDLE` e com
  cota. `expectedPhoneHint` = 2 últimos dígitos do número esperado (ou `null`). A fase é calculada
  pelo estado **vivo** da engine (o QR em memória do Baileys continua o mesmo por segundos depois de
  expirar, entre um ciclo e outro, e depois de lido) — o `GET /sessions/{id}/qr` autenticado segue
  como antes (P-094).
- `POST /api/public/connect/new-qr` → 200 `{ ok: true, newQr }`: gera um QR novo (mesmo efeito do
  "Gerar novo QR" do painel) **só** na fase `IDLE` — sessão Baileys parada e **sem login salvo**. 5
  por link, com 30 s entre pedidos (regra no banco, vale entre processos). Erros: 409
  `CONNECT_LINK_NEW_QR_UNAVAILABLE` (fase não permite; não gasta cota), `CONNECT_LINK_NEW_QR_LIMIT`
  (tentativas acabaram), `CONNECT_LINK_BUSY` (outra operação na sessão em andamento); 429
  `CONNECT_LINK_NEW_QR_COOLDOWN` com `retryAfterSeconds`; 503 `CONNECT_LINK_NEW_QR_FAILED`; 404/410
  como no GET. Com o link já usado (inclusive nos 15 min em que o GET ainda responde `CONNECTED`),
  o POST responde 410 `CONNECT_LINK_USED`. O 503 e a recusa por mudança de estado no último
  instante (409 `CONNECT_LINK_BUSY` depois da reserva) gastam 1 das 5 tentativas.
- Corpo de erro: `{ statusCode, error, code, message }` com mensagem fixa (nunca ecoa o token).
  Auditoria: o POST público entra em `wa_audit_logs` com ator `link:<id> (de <quem criou>)`.

## 12. Inbox — conversas, mensagens e backfill de histórico (W7)

A inbox é servida do **banco do gateway** (o que já chegou ao vivo), independente da engine:

```
GET  /api/sessions/{sessao}/messages/conversations   # lista de conversas (última msg, nome, foto)
GET  /api/sessions/{sessao}/messages?chatId=5511...   # mensagens de uma conversa (traz keyId)
GET  /api/sessions/{sessao}/messages/search?q=termo   # busca por termo (opcional: &chatId=5511...&limit=50)
```

- **Busca (`/search`):** procura o termo `q` no texto das mensagens da sessão (case-insensitive),
  ordenado da mais recente. `chatId` opcional restringe a uma conversa; `limit` default 50 (máx 200).
  Mesmo formato do `GET /messages` (traz `keyId` + `mediaUrl`). Funciona nas 2 engines e alcança o
  histórico já importado pelo backfill (busca o que está **persistido** — rode o `/sync` antes para
  incluir conversas anteriores à conexão).
- **Reações e selo "Encaminhada" (E22, aditivo):** cada item do `GET /messages` e do `/search` traz
  `reactions: [{ emoji, senderJid, fromMe, timestamp }]` (reações vivas da mensagem, uma por pessoa,
  em ordem de horário; `[]` quando não há), `isForwarded` e `forwardingScore`. O `type`/`text` segue
  a tabela da §3.2.
- **Remetente em grupo (E23, aditivo):** `senderName` — o nome de quem mandou uma mensagem
  RECEBIDA em grupo: o da agenda, senão o pushName (nome que a pessoa pôs no WhatsApp), procurado no
  diretório de contatos da sessão pelo `senderJid` (e, quando é telefone, também pelos dígitos).
  `null` fora de grupo, em mensagem nossa, em linha antiga (gravada com o jid do grupo) ou quando o
  remetente não é conhecido. Uma consulta por página; se o diretório falhar, a lista vem sem nomes
  (não cai). Só no `GET /messages` e no `/search` — **não** vai no webhook.

**Backfill (W7 — só engine WWEBJS):** ao conectar uma sessão, a inbox só tem o que chegou DEPOIS.
Para trazer o histórico anterior, dispare o sync — ele puxa do WhatsApp Web e grava no banco, e aí os
dois GETs acima já mostram:

```
POST /api/sessions/{sessao}/messages/sync            # { "chatId"?: "5511...", "limit"?: 50, "maxChats"?: 50 }
```

- **Sem `chatId`:** backfill dos `maxChats` chats mais recentes (default 50), `limit` mensagens cada
  (default 50). **Com `chatId`:** só aquela conversa. Resposta: `{ chats, fetched, imported }`
  (`imported` = quantas eram novas; reexecutar é seguro — deduplica por mensagem).
- **Engine:** só **WWEBJS**. Numa sessão **Baileys** responde **HTTP 501** (não tem store de histórico
  — a inbox ao vivo dele já funciona via `/conversations`).
- **Custo:** cada chat é um round-trip no Chromium (sequencial) — backfill de muitos chats leva alguns
  segundos. É pontual, não hot path. **Requer a sessão conectada** (`WORKING`).
- **Mídia histórica:** o backfill grava tipo/texto/timestamp mas **não baixa o binário** (só a mídia que
  chega ao vivo vai ao S3) — `GET …/messages/{msgId}/media` responde 404 para mídia histórica.

**Gestão de chat (W7 — só engine WWEBJS):** arquivar / fixar / silenciar / marcar não-lido.

```
POST /api/sessions/{sessao}/messages/{chatId}/flag   # { "flag": "archive|pin|mute|unread", "enabled": true }
```

- **`flag`**: `archive` (arquivar), `pin` (fixar), `mute` (silenciar), `unread` (marcar não-lido).
  **`enabled`**: `true` liga, `false` desliga. Em `unread`, `enabled:false` marca a conversa como
  **lida** (read receipt). Resposta: `{ "ok": true }`. Idempotente.
- **Engine:** só **WWEBJS**. Numa **Baileys** responde **HTTP 501** (arquivar/marcar-lido exigem
  sincronização de app-state com o histórico — fora do escopo por ora). Requer a sessão **WORKING**.

## 13. Caixa única de triagem — todas as sessões juntas (painel "Atendimento")

Visão **agregada**: tudo que chega de TODOS os aparelhos numa lista só, com o semáforo por conversa
para triagem HUMANA (ninguém responde automático). Servida do banco — agnóstica de engine.

```
GET  /api/inbox/conversations                     # conversas de todas as sessões + contadores
GET  /api/inbox/conversations?sessions=a,b&status=pending&limit=200
GET  /api/inbox/messages?limit=100&sessions=a,b   # fluxo cronológico (todas as sessões)
POST /api/inbox/sessions/{sessao}/triage          # { "chatJid": "...@s.whatsapp.net", "state": "ignored|pending", "keyId"?: "..." }
```

**Semáforo (`status` de cada conversa) — derivado das mensagens, não é flag de "lido":**

| status     | Cor | Quando                                                                           |
| ---------- | --- | -------------------------------------------------------------------------------- |
| `pending`  | 🔴  | a última mensagem é do contato → precisa de resposta                             |
| `answered` | 🟢  | a última mensagem é minha — inclusive respondida no CELULAR (`lastSource=phone`) |
| `ignored`  | 🟡  | marcado à mão como "não preciso responder" (`POST …/triage`)                     |

- **Regra de ouro:** mensagem NOVA de entrada devolve a conversa para `pending`, estivesse 🟡 ou 🟢.
  O amarelo é ancorado na mensagem de entrada que estava por último — entrada nova invalida a marca
  (nada precisa ser limpo).
- **`GET /conversations`** responde `{ counts: { pending, answered, ignored, total }, conversations: [...] }`.
  `counts` é do conjunto retornado ANTES do filtro de status (não muda com `?status=`; com mais
  conversas do que `limit`, conta as `limit` mais recentes). `?sessions=` aceita **nome OU id**
  de sessão (máx. 50, separados por vírgula). Cada conversa traz `sessionId`,
  `sessionName` (o aparelho), `engine`, `chatJid`, `name`/`phone`/`imgUrl`, prévia da última mensagem,
  `lastSource`, `lastInboundKeyId` (a âncora) e `pendingInbound` (entradas ainda não respondidas).
  `limit` default 200 (máx 500).
- **`POST …/triage`** com `keyId` = a entrada que o operador viu. Se chegou mensagem mais nova nesse
  meio-tempo, **nada é gravado** e a resposta volta `status: "pending"` (o amarelo nunca engole
  mensagem não lida). `state: "pending"` desmarca. `{sessao}` aceita nome OU id.
- **Fora da caixa única:** grupo (`@g.us`), lista de transmissão/status (`@broadcast`) e canal
  (`@newsletter`) — nunca aparecem em nenhuma das rotas acima.
- **Histórico:** só o que passou pelo gateway (do zero para frente). Para trazer conversa anterior à
  conexão, rode antes o backfill da seção 12 (`POST …/messages/sync`, só WWEBJS).
- **Tempo real:** não há long-poll aqui — use o SSE `GET /api/events/stream` (evento `message`,
  todas as sessões) e recarregue a lista; é o que o painel faz. Tiques ao vivo = evento
  `message.ack`; reação ao vivo = `message.reaction` — casar pelo `sessionId` do envelope + `keyId`
  (nunca pelo `chatJid`, que pode trocar de @lid para telefone; e nunca só pelo `keyId`: no Baileys
  duas sessões do gateway conversando entre si veem o mesmo id).
- **`GET /api/inbox/messages` (E22, aditivo):** cada item traz também `status` — o ACK da mensagem
  ENVIADA (`sent` | `delivered` | `read`; null enquanto não chega recibo). ⚠️ Aqui `status` é o ACK;
  no `GET /conversations` o `status` é a triagem (🔴🟢🟡). Mostre tique só em `fromMe: true` (numa
  entrada, `read` significa "lida no celular do operador"). Em **grupo** o Baileys não grava ACK
  (fica null). Também `isForwarded`/`forwardingScore`.
- **Encaminhar (E24):** a cópia encaminhada é um envio nosso (`fromMe`, `source: "api"`) — o chat
  de DESTINO vai para 🟢 como em qualquer resposta; o chat de origem não muda.
- **Reação não mexe no semáforo (E22):** reagir não devolve a conversa para 🔴 nem a põe em 🟢 (antes,
  no Baileys, a reação contava como a última mensagem).
- **Responder:** continua no endpoint por sessão (`POST /api/sessions/{sessao}/messages/text`) —
  esta seção só LÊ e marca a triagem.
