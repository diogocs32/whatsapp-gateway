---
tipo: análise (diagnóstico somente leitura — nada implementado)
dono: Diogo Santos
criado_em: 2026-09-25
origem: pedido do dono no chat da E3 — "as conversas não exibem emojis, aparece '...', alguns até aparece. não consigo ouvir áudio nem ver imagem … redondo e completo em todos os chats e nas 2 engines" + "deixe também opção de encaminhar conteúdos pelo chat … fiel ao WhatsApp Web"
pendências: P-066 · P-067 · P-068 · P-069 (Onda 8 do roteiro)
---

# Conversas fiéis ao WhatsApp Web — diagnóstico (25/09/2026)

Diagnóstico **somente leitura** (sem produção): código do repositório e libs instaladas (Baileys
7.0.0-rc14, whatsapp-web.js 1.34.7 pin `1780711`, Tailwind 4.3.3, helmet 8.3.0, AWS SDK presigner
3.1128.0). Baseline `npm run test:unit` 137/137. Caminhos relativos à raiz do repositório.

## 1. Resumo

1. **"…" no lugar do emoji = reação (causa provada, Baileys).** A lib entrega toda reação também em
   `messages.upsert`; o gateway grava `type:'other', text:null` e o painel cai no `'…'`. Emoji dentro
   de texto sai certo — por isso "alguns aparecem". Localização, contato, enquete, vídeo redondo e
   figurinha animada também viram "…".
2. **Imagem/áudio no Atendimento nunca foram desenhados (provado).** A caixa única só mostra texto ou
   o rótulo ("📷 Imagem"); não há `<img>`/`<audio>`.
3. **Áudio no Inbox: o link muda a cada 2,5 s (provado no código).** O Inbox relê a conversa a cada
   2,5 s e o gateway gera URL pré-assinada nova a cada leitura → `<audio>` recarrega e corta o play.
4. **Hipóteses abertas:** download de mídia falhando (P-050) e Safari sem Ogg/Opus — checagens na §3.
5. **Encaminhar não existe.** As duas engines oferecem; no Baileys o caminho fiel precisa da
   mensagem original completa, que o gateway não guarda para as recebidas.

## 2. Sintoma × causa × evidência × engine

Telas: `apps/dashboard/src/routes/Atendimento.tsx` (caixa única) e `apps/dashboard/src/routes/Inbox.tsx`
(por sessão). O Monitor não desenha mensagens.

### S1 — emoji aparece como "…" (causa provada no Baileys)

- A lib manda toda mensagem, reação inclusive, para `messages.upsert`
  (`node_modules/@whiskeysockets/baileys/lib/Socket/chats.js:917-918`) e emite de novo como
  `messages.reaction` (`Utils/process-message.js:411-422`).
- O gateway só lê `conversation` e `extendedTextMessage.text`; o resto vira `type:'other', text:null`
  (`baileys.engine.ts:857-870`). A reação também sai como `message.reaction`, que não é gravada
  (`:639-641`, `:653-661`). Edição (`protocolMessage`) é descartada (`:846-855`).
- Teste offline com a lib instalada: `reactionMessage` → tipo `reactionMessage`, texto null; `'😀🎉'`
  e `ephemeral` com `'oi 👋'` extraem certo; viram "outro"/null: `ptvMessage`,
  `lottieStickerMessage`, `albumMessage`, `locationMessage`, `contactMessage`,
  `pollCreationMessageV3`, `pollUpdateMessage`, `encReactionMessage`, `eventMessage`,
  `keepInChatMessage`, `pinInChatMessage`.
- Painel: Atendimento `mediaLabel('other')` vazio → `'…'` na lista (`Atendimento.tsx:76`), ao vivo
  (`:586`) e no balão (`:613`); Inbox `'…'` na lista (`Inbox.tsx:427`) e `[other]` no balão (`:328`).
- Não há regex/corte/fonte sem emoji: Tailwind 4.3.3 inclui fontes de emoji
  (`node_modules/tailwindcss/theme.css:2-4`); o banco grava UTF-8 sem sanitizar.
- **Efeitos colaterais (lidos no código, não verificados em produção):** reação do contato conta
  como mensagem recebida — joga a conversa para 🔴 e conta no reply-rate
  (`reply-rate.service.ts:115-122`); reação do dono pelo celular sai no webhook como `message` com
  `source:'phone'` → handoff G2 pausa a IA.
- **wwebjs:** reação chega só por `message_reaction` (`node_modules/whatsapp-web.js/src/Client.js:974`),
  sem duplicata; mas todo tipo sem mídia sai `type:'text'` com `text: msg.body || null`
  (`wwebjs.engine.ts:1636-1639`) — com `body` vazio (`Message.js:56-58`), notificações de sistema e
  ligações também mostram "…".
- O passado não se recupera (reações antigas gravadas como "outro" sem original).

### S2 — imagem/áudio não aparecem no Atendimento (provado, 2 engines)

`Atendimento.tsx:613` só desenha texto ou rótulo, embora `GET /messages` já traga `mediaUrl`
(`messages.controller.ts:233-246`). Só `Inbox.tsx:460-502` desenha mídia.

### S3 — áudio corta/imagem recarrega no Inbox (provado no código; corte do play = regra HTML a validar no navegador)

Conversa relida a cada 2500 ms (`Inbox.tsx:100-123`); URL pré-assinada nova a cada chamada
(`media-storage.service.ts:144-150`; dois links gerados com 1,1 s de diferença já diferem) → `src`
novo recarrega `<audio>`/`<video>` e baixa a imagem de novo.

### S4 — mídia sem arquivo (hipóteses, por probabilidade)

(a) Baileys: download sem timeout nem proxy (P-050, `baileys.engine.ts:917-925`) — travou = a
mensagem não aparece; falhou = só rótulo, sem `mediaKey` (`:944-965`). (b) Storage fora — `/health`
`checks.storage`. (c) wwebjs: > 24 MB ou mídia expirada (`wwebjs.engine.ts:89-94`, `:1662-1733`).
(d) Histórico do backfill nunca tem arquivo (INTEGRACAO.md). Mensagens ENVIADAS guardam a mídia nas
duas engines (`baileys.engine.ts:1017-1033`, `wwebjs.engine.ts:1435-1441`).

### S5 — áudio no Safari (hipótese)

Áudio do WhatsApp = `audio/ogg; codecs=opus`, extensão `ogg` (`baileys.engine.ts:259-270`).

### Armadilhas para qualquer correção (provadas no código)

- `helmet` 8.3.0 põe `Cross-Origin-Resource-Policy: same-origin` (`node_modules/helmet/index.cjs:191`,
  `:377-380`); `main.ts:63` só desliga a CSP → `<img src="https://api…/media">` a partir do domínio do
  painel seria bloqueado.
- `/media` não atende Range/206 (`@nestjs/platform-fastify/adapters/fastify-adapter.js:236-250`).
- `fetch` com cookie funciona: `SameSite=Lax` (`auth.controller.ts:125-139`), GET passa no CSRF,
  CORS com `credentials:true` (`main.ts:83-91`).

## 3. Checagens que o dono pode fazer (confirmam S1/S4/S5)

- SQL só leitura (terminal do Postgres no Dokploy):

  ```sql
  SELECT type, count(*) total,
         count(*) FILTER (WHERE text IS NULL) sem_texto,
         count(*) FILTER (WHERE "mediaType" IS NOT NULL AND "mediaKey" IS NULL) midia_sem_arquivo
  FROM wa_messages
  WHERE "createdAt" > now() - interval '7 days'
  GROUP BY 1 ORDER BY 2 DESC;
  ```

- Logs: `falha ao baixar/armazenar mídia`, `S3 write-probe FALHOU`, `presign falhou`,
  `mediaUrl indisponível`; `/health` → `checks.storage`.
- Navegador: `new Audio().canPlayType('audio/ogg; codecs=opus')` no console (vazio = não toca); aba
  Network do Inbox com um áudio aberto (o `.ogg` é pedido de novo a cada ~2,5 s?); qual navegador
  (Safari × Chrome).

## 4. Encaminhar mensagem

- **Baileys rc14:** `sendMessage(jid, {forward: WAMessage, force?})` (`Types/Message.d.ts:208-211`) →
  `generateForwardMessageContent` (`Utils/messages.js:334-335` → `:238-262`): copia o conteúdo, soma 1
  ao contador (0 se a mensagem é própria e sem `force`), grava `contextInfo {isForwarded,
forwardingScore}` e reaproveita a mídia (mesmo url/directPath/chave). Testado offline. **Pré-requisito:**
  a original completa — o gateway só guarda a das enviadas pela API (`engine.port.ts:36-39`), e a
  retenção apaga em 7 dias (`retention.service.ts:58-59`). Alternativa: remontar do banco (texto) ou
  do S3 (`mediaKey`) com o `contextInfo` (aplicado a qualquer tipo em runtime,
  `Utils/messages.js:524-532`; nos tipos TS só texto/imagem/vídeo/documento — áudio e figurinha
  precisam de cast).
- **wwebjs 1.34.7:** `Message.forward(chat)` (`Message.js:493-509`) → `WWebJS.forwardMessage`
  (`src/util/Injected/Utils.js:113-129`), a função nativa do WhatsApp Web. Limites: mensagem
  carregada no navegador (`client.getMessageById`, `Client.js:1811`); destino precisa ser chat já
  existente (`Message.js:494`); não devolve o id novo (`index.d.ts:1342`) — o eco chegaria como
  mensagem do celular (`wwebjs.engine.ts:1604-1612`) e dispararia handoff G2 à toa → correlacionar.
  `sendMessage(…, {extra:{isForwarded}})` existe (`Client.js:1531`) — não verificado.
- **Selo "Encaminhada" nas recebidas (ignorado hoje):** Baileys
  `content[ctype].contextInfo.isForwarded/forwardingScore` (`WAProto/index.d.ts:3129-3139`); wwebjs
  `msg.isForwarded/forwardingScore` (`Message.js:117`, `:125`). "Encaminhada com frequência" vem de
  config do servidor (`frequently_forwarded_max`, valor não verificado) — proposta ≥ 5, configurável.
- **Hoje:** nada (a busca só acha o forwarder de proxy). Mais parecido: `POST /:msgId/reaction` e
  `sendWithIntent`.
- **API aditiva proposta:** `POST /api/sessions/:s/messages/:msgId/forward`
  `{to: string[] (1-5, únicos), cold?, idempotencyKey?}`; um destino por vez com intervalo 1-3 s, cada um
  pelo `sendWithIntent` (chave `${idempotencyKey}:${to}`, fingerprint `{kind:'forward', msgId, to}`);
  anti-ban: máx. 5 destinos (1 se a cópia ficar com contador ≥ 5), destino sem conversa = cold com
  trava 423, só a mesma sessão; resposta `{results:[…]}`; `IEngine.forwardMessage`; webhook aditivo
  `isForwarded`/`forwardingScore` (contracts + INTEGRACAO no mesmo commit).
- **UI fiel:** menu ⌄ no balão → Encaminhar → modo seleção → "Encaminhar mensagem para" (busca,
  conversas da mesma sessão, até 5) → ➤ com progresso/erro por destino; atalho ↪ nas mídias; selos
  "↪ Encaminhada" / "↪↪ Encaminhada com frequência".

## 5. Plano (Onda 8 do roteiro — 1 etapa = 1 chat; 17-24 h no total)

- **C1 / P-066 — gateway: conteúdo, reações e selo (5-7 h).** `baileys-content.ts` puro
  (`describeBaileysMessage`): ignorar reação/álbum-mãe/voto/fixar/keepInChat/reação criptografada;
  vídeo redondo = vídeo; figurinha animada com rótulo; texto para localização/contato/enquete/evento/
  respostas de botão e lista; selo de encaminhada. `describeWwebjsMessage` equivalente (ignora sistema
  e ligação). Migration só para frente: `wa_messages.isForwarded`/`forwardingScore` + tabela
  `wa_message_reactions` (única por sessão+alvo+remetente); `ReactionPersister` (grava/apaga);
  `GET /messages` aditivo com `reactions[]`, `isForwarded`, `forwardingScore`; **reply-rate conta as
  reações da tabela nova no mesmo deploy** (senão quarentena falsa com `GUARDRAIL_ENFORCE=true`);
  retenção das reações.
- **C2 / P-067 — painel: balões e mídia (4-6 h).** `components/chat/MessageBubble.tsx` e
  `MediaView.tsx` compartilhados por Inbox e Atendimento + `lib/message-format.ts` (rótulos e prévia
  sem "…"; fallback "Mensagem não suportada — veja no celular"); mídia baixada pelo gateway como
  **blob** (`fetchBlob` com refresh de login → object URL em cache por mensagem, liberado ao
  desmontar; imagem ao aparecer na tela, áudio/vídeo no clique) — resolve helmet, Range, expiração e o
  link que muda; selos de reação e encaminhada; "Baixar" se o navegador não toca o áudio.
- **C3 / P-068 — encaminhar: API e engines (5-7 h).** Guardar a original também das recebidas no
  Baileys (webhook e SSE já removem o campo: `webhook-dispatcher.service.ts:12-15`,
  `events.controller.ts:23-31`); `IEngine.forwardMessage`, `SessionManager.forwardMessage`, rota nova.
- **C4 / P-068 — encaminhar: interface (3-4 h).**
- **C5 / P-069 — opcional (1-2 chats):** editadas/apagadas (`process-message.js:298-307`, `:364-380`),
  citação de resposta, ✓✓, separador de data, paginação `before` (hoje 50, máx. 200), áudio no Safari.
- **Opção C0 (só painel, 1-2 h):** Atendimento desenha a mídia com o link assinado e sem trocar o link a
  cada leitura — alivia S2/S3, não S1.
- **Pré-requisitos para "completo em todos os chats":** E7 (P-047 — recebidas durante queda/deploy
  descartadas) e E10 (P-050 — download travado). O Baileys não traz histórico anterior ao pareamento
  (`syncFullHistory:false`).

## 6. Testes propostos

- Unit: `baileys-content.spec.ts` (fixtures `proto.Message.fromObject` dos 20 tipos),
  `describeWwebjsMessage` com objetos falsos, `buildForwardContent` com/sem original, engine com
  `downloadMediaMessage` falso.
- E2E: `message.reaction` grava/apaga; `GET /messages` com `reactions`; reply-rate com reação;
  `forward` (>5 → 400, cold em quarentena → 423, desconhecida → 404, repetição dedupada); `/media`
  com content-type correto.
- Painel: `vitest` em ambiente node para `lib/*`. Manual: seed de mensagens + objetos no MinIO local;
  Chrome e Safari.

## 7. Riscos e decisões do dono

- **Contrato do webhook:** tirar a reação do evento `message` muda o que o n8n recebe (deixa de chegar
  "outro"). **Decisão (antes da C1):** reação só como `message.reaction` + contando no reply-rate.
- **Guard-rail/triagem/handoff:** reação deixa de pôr a conversa em 🔴 e de pausar a IA.
- **Mídia no painel pelo gateway (blob)**, mantendo a URL pré-assinada para a API — decisão na C2.
- **Limites de encaminhar** (5 destinos, 1 se "com frequência", só a mesma sessão, cold com 423) —
  decisão na C3.
- Banco: original das recebidas por 7 dias ocupa espaço; migrations só para frente. Encaminhar: risco
  de ban, eco do wwebjs atribuído ao celular, mídia antiga expirada no WhatsApp. Painel: memória de
  vídeos grandes; 600 req/min por IP. Dados antigos não se recuperam.

## 8. Não verificado

Quanto do "outro" em produção é reação (SQL da §3); `s3.conexozenvo.cloud` http × https no navegador
do dono; Safari × Ogg/Opus; falhas de download em produção; limites reais de encaminhamento do
WhatsApp; tempo de vida da mídia no servidor do WhatsApp; nomes `ptv`/`location` e notificações de
sistema na build atual do wwebjs; `extra.isForwarded` do wwebjs; mídia de visualização única em
aparelho conectado; bloqueio do helmet só para `<img>` (não para `fetch` com CORS) e corte do
`<audio>` ao trocar o `src` (regras de navegador, validar local); se algum fluxo n8n depende do tipo
"outro".
