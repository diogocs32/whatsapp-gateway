# Sessão: e24-encaminhar-api

- **Status:** ✅ DONE — P-068 parte API/engines + P-077 entregues na branch `feature/onda8-conversas`
  (PR #7 da Onda 8 — sem merge; o deploy G sai no fim da onda, E25). D-030. P-080..P-083 abertas.
- **Início:** 26/09/2026 01:52 BRT (04:52 UTC) — macOS, Node 26.0.0 / npm 11.12.1
- **Objetivo:** Etapa **E24** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) (Onda 8 — conversas fiéis ao
  WhatsApp Web): **P-068 parte API/engines** — encaminhar mensagem fiel ao WhatsApp Web (Baileys
  `forward` com a original guardada; wwebjs `Message.forward` com o eco correlacionado), rota aditiva
  `POST /api/sessions/:s/messages/:msgId/forward`. Decidir a **P-077** (ecos de localização/enquete
  sem o conteúdo completo — mesmo `emitOutbound`).
- **Escopo previsto:** `modules/sessions/` (`engine.port.ts` `IEngine.forwardMessage`,
  `session-manager.service.ts`, `infrastructure/{baileys,wwebjs}/*`), `modules/messaging/`
  (`messages.controller.ts` — rota nova pelo `sendWithIntent`; persistência da original das
  recebidas se for o caminho), `packages/contracts`, `docs/INTEGRACAO.md`, `apps/gateway/prisma/`
  (só se a original precisar de coluna/tabela — migration aditiva), e2e novo em
  `apps/gateway/test/`. Pontos de contato globais declarados: `packages/contracts`,
  `schema.prisma` (condicional).
- **Fora do escopo:** interface do encaminhar (E25), editadas/apagadas/citação (P-069), `append`
  (E7/P-047), download de mídia do Baileys (E10/P-050/P-075), produção/Dokploy (R0) — nenhum envio
  real; o teste com chip é do dono.
- **Branch:** `feature/onda8-conversas` (continuação da E23 — PR #7 da Onda 8, sem merge).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** execução pelo roteiro; Onda 1 mergeada mas **deploy A não feito** — produção segue em
  `768fb26`; todo auto-deploy desligado (D-027). Onda 8 na branch `feature/onda8-conversas` (PR #7,
  sem merge): E22 (D-028) e E23 (D-029) ✅; próxima = E24. `.cloud` = produção, sem homologação.
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`,
  branch `fix/lid-envio-wwebjs`) — a E24 toca `wwebjs.engine.ts` para acrescentar o
  `forwardMessage` e a correlação do eco, sem mexer na resolução de LID de saída. Avisos lidos: E23
  (`senderJid` de grupo = participante — manter; painel desenha por `lib/message-format.ts` e o spec
  confere ida e volta com o `message-content.ts`; mídia só pelo `/media` como blob; casar por
  (sessionId, keyId); P-077..P-079), E22 (conteúdo por `describe*Message`; reação não é mensagem;
  `baileys.shutdown.spec.ts` mocka `proto: {}` → módulo da engine não acessa `proto.*` no topo),
  E4 (rota resolvida; URL do cliente só via `safeFetch`; deploy manual), E3, E2, onda0b (rodar
  `node scripts/mapa-codigo.mjs` e commitar), 15/09, 18/08.
- **PENDENCIAS:** P-068 (etapa — decisão do dono: limites), P-077 (decidir se entra — mesmo
  `emitOutbound`), P-069/P-073/P-075/P-078/P-079 fora. B-004..B-007 e o checklist do deploy A seguem
  com o dono.
- **Roteiro E24 + diagnóstico §4/§7:** Baileys rc14 `sendMessage(jid,{forward, force?})` →
  `generateForwardMessageContent` (copia o conteúdo, soma 1 ao contador — 0 se própria sem `force` —,
  `contextInfo {isForwarded, forwardingScore}`, reaproveita a mídia) — **pré-requisito: a original
  completa**; o gateway só guarda o `raw` das ENVIADAS (`engine.port.ts`), a retenção apaga em 7 dias;
  alternativa: remontar do banco/S3. wwebjs 1.34.7 `Message.forward(chat)` → `WWebJS.forwardMessage`
  (mensagem carregada via `getMessageById`, destino = chat já existente, sem id de retorno → o eco
  chega como mensagem do celular e dispara handoff G2 → correlacionar). API proposta: `{to[] (1-5,
únicos), cold?, idempotencyKey?}` → `{results[]}`, um destino por vez com intervalo 1–3 s, cada um
  pelo `sendWithIntent` (chave `${idempotencyKey}:${to}` — **atenção: `:` só é proibido em jobId de
  BullMQ, não em chave de intenção; conferir**), fingerprint `{kind:'forward', msgId, to}`.
- **INTEGRACAO §2/§3.2/§12:** cold + idempotência (409 em voo/fingerprint diferente; 423
  `SESSION_QUARANTINED`); selo `isForwarded`/`forwardingScore` (ausentes nos ecos `source: "api"`;
  ≥ 5 = "com frequência"); `senderJid` de grupo = participante (E23); `reactions[]`.
- **MAPA-CODIGO §3.1:** envio = guard → AuditInterceptor (ignora `/messages`) → SessionRefPipe → zod
  → `sendWithIntent` (dedup legado → reserva → gate cold → `SessionManager` → engine → `complete`);
  eco `message` com `source: 'api'` e `raw` só nas enviadas; `cacheSent`/`sentMessages` evita o eco
  duplicado no Baileys; `sentByPanel` no wwebjs.
- **D-028/D-029:** reação fora do `message`; `senderJid` de grupo = participante (o encaminhar deve
  manter o remetente original FORA do eco — Diário da E23 item 4).

## Passo 0 — upstream (26/09 04:55 UTC)

- `npm view @whiskeysockets/baileys dist-tags` → `{ latest: '7.0.0-rc14', legacy: '6.7.24' }`
  (modificado 29/07); master do GitHub: 1 commit depois da rc14 (`0af2386`, 04/08 — "advertise
  WIN_HYBRID instead of retired WIN32 web sub-platform", #2741 — relevante para E9/E12, não para o
  encaminhar).
- `npm view whatsapp-web.js dist-tags` → `{ next: '1.34.5-alpha.3', latest: '1.34.7' }`; main do
  GitHub 1 commit à frente do pin `1780711` (`942d236`, 27/07 — `addParticipants` inviteV4).
- Instalados: Baileys 7.0.0-rc14, wwebjs 1.34.7 (pin `1780711`). Nada novo desde a E23.

## Fontes (documentation-first)

- **Código instalado (lido e rodado offline no scratchpad — fonte primária da versão em uso):**
  Baileys 7.0.0-rc14 — `Utils/messages.js:238-262` (`generateForwardMessageContent`: `Object.keys
(content)[0]` em :246, contador em :247-248, contextInfo trocado em :255-259), `:334-335`,
  `:524-533`, `:543-548`, `:625-701` (getContentType/normalize/extract, buttons→conversation em
  :687-699); `Utils/process-message.js:298-307` (REVOKE), `:364-380` (EDIT); `Utils/event-buffer.js:
425-443` (fusão de updates); `Socket/messages-send.js:1068-1140` (retorno e eco `append`),
  `:1093`, `:1112-1126` (`<meta polltype|event_type>`); `Defaults/index.js:55`; `WAProto` (números de
  campo: messageContextInfo=35, SKDM=2, ptv=66, pollV3=64, event=75). whatsapp-web.js 1.34.7 (pin
  `1780711` + patch) — `src/structures/Message.js:117-125`, `:287-294`, `:493-509` (`forward` →
  `Promise<void>`), `src/util/Injected/Utils.js:113-129` (`forwardMessages({multicast, includeCaption})`),
  `:877-887` (`findOrCreateLatestChat` cria o chat), `src/Client.js:1811-1830` (`getMessageById`),
  `index.d.ts:1342`.
- **Doc oficial:** PostgreSQL 18 (espelho local `~/dioggo-agents/agentes/docs/postgresql/18/
postgresql-18-full.txt:13248-13249`, `:13288` — jsonb recusa `\u0000`; `:11539-11540` — text não
  guarda NUL); confirmado no PG local: `select '"a\ud800b"'::jsonb` → "Unicode low surrogate must
  follow a high surrogate". Prisma 7 `omit` por consulta (tipos gerados `WaMessageOmit`,
  `src/generated/prisma/models/WaMessage.ts:1659`). FAQ do WhatsApp "encaminhada com frequência"
  (faq.whatsapp.com/1053543185312573 — via D-028, sem nova consulta).
- **Não usado:** Context7 — o comportamento que importava (forward, eco, event-buffer) não está em doc
  pública; a prova foi o código instalado + testes com a lib real.

## Decisões do dono (abertura)

- **Limites do encaminhar (26/09 ~05:00 UTC): confirmados como no roteiro** — até 5 destinos por
  pedido; só 1 se a original já é "encaminhada com frequência" (`forwardingScore ≥ 5`); só a MESMA
  sessão; destino sem conversa no banco vira cold à força (trava 423); `idempotencyKey` por destino;
  um destino por vez com 1–3 s entre eles.
- **P-077: entra na E24** — o eco de localização/enquete da API usa os mesmos formatadores das
  recebidas (muda o `text` do webhook `message` desses ecos → INTEGRACAO §3.2).

## Mapeamento (workflow `e24-mapear-encaminhar`, 19 agentes, 26/09 ~05:00–05:30 UTC)

6 frentes (Baileys forward, wwebjs forward, envio/intenção, persistência/retenção,
guard-rail/handoff, testes) + crítico de completude (12 lacunas, 6 contradições resolvidas com
teste offline no scratchpad). Relatórios fora do repo (scratchpad `mapa/`). Achados que mudam o
desenho:

- **Baileys rc14 `generateForwardMessageContent`** (`Utils/messages.js:238-262`): escolhe o nó
  por `Object.keys(content)[0]` (`:246`) → com `messageContextInfo` (campo 35) o selo some em
  enquete/ptv/evento/lottie/respostas de botão; com `senderKeyDistributionMessage` (grupo) o selo
  some e a citação/menções da original VAZAM para o destino; visualização única sai como mídia
  comum (`normalizeMessageContent` tira o invólucro). Correção provada offline: passar à lib só
  `{[ctype]: nó}` (sem `messageContextInfo`/SKDM). Própria sem `force` = sem selo (fiel ao app).
- **`decodeProto` sem `proto.Message.fromObject`** perde enums (≠ 0) — afeta o encaminhar e o
  retry de descriptografia (`loadMessageForRetry`). O `raw` gravado de instância proto é base64/
  string-long/nome-de-enum (toJSON do protobufjs), não `{type:'Buffer'}`.
- **Recebidas não têm `raw`** (só envios da API, 7 dias); `jsonb`/`text` recusam `\u0000` (PG18
  doc `postgresql-18-full.txt:13248`, `:11540`) — um NUL derruba o INSERT e a mensagem some.
- **Apagada/editada:** o Baileys emite `messages.update` (REVOKE `message:null`; EDIT
  `editedMessage`) que o gateway ignora → com `raw` guardado encaminharia o apagado / a versão
  velha. wwebjs usa a Message viva (`type 'revoked'`).
- **wwebjs `Message.forward`** (`Message.js:498-508`): `Promise<void>`, sem id; `getChat` CRIA o
  chat (`Utils.js:878-887` — a análise §4 dizia "precisa ser chat existente": errado); retorno
  `undefined` quebra o `withLidFallback` (envio 2×, provado); eco só via `message_create`
  (NÃO VERIFICADO no aparelho) → correlacionar antes da espera de 3 s.
- **Idempotência do lote:** só a chave derivada por destino deixa `[A,B]` e depois `[A,C]` com a
  mesma chave enviar C (quebra o 409 do contrato) → reserva do LOTE com fingerprint.
  `sendFingerprint` apaga objeto aninhado (usar fingerprint plano). `:` na chave é seguro (não é
  jobId).
- **"Tem conversa"** não existe no gateway; o cold hoje é 100% do cliente.

## Desenho (decisões técnicas — viram D-030)

- **Laço** em `messaging/application/forward.service.ts` (o `sendWithIntent` é do controller e o
  `sessions` não pode importar `messaging/domain`); regras puras em `forward.decision.ts`.
  `SessionManager.prepareForward` → `IEngine.prepareForward(src)` carrega/valida a original UMA
  vez e devolve `send(to, opts)` por destino. Mutex por sessão + intervalo 1–3 s entre envios
  efetivos (também entre pedidos).
- **Ordem:** F0 sem efeito (zod 1–5, destino canônico/repetido/proibido → 400; 404; score ≥ 5 com
  mais de 1 destino → 400 `FORWARD_LIMIT`; tipo não encaminhável → 400 `FORWARD_UNSUPPORTED`) →
  reserva do lote (409) → reserva por destino (replay/409 por item) → apagada/editada (400, depois
  do replay) → prepare na engine (400 com code) → gate cold UMA vez (423 no lote inteiro, nada sai)
  → envio. HTTP: algum ok = 201; nenhum ok = o status comum (ou 400 `FORWARD_FAILED`), com
  `results[]` sempre que algum destino foi processado.
- **Destino sem conversa** = sem mensagem RECEBIDA dessa sessão no chat, no número EXATO (os dois
  sufixos; o 9º dígito NÃO conta — revisão) → cold à força (o cliente só sobe o cold); transporte =
  sempre o número pedido.
- **Baileys:** `raw` das recebidas (sem NUL); `decodeProto` com `fromObject`; encaminha
  `{[ctype]: nó}`; sem `raw` → texto tem fallback fiel, o resto `FORWARD_SOURCE_UNAVAILABLE`;
  eco pelo `describeBaileysMessage(sent.message)` + `mediaKey` S3 da original; marcas
  `revokedAt`/`editedAt` (migration aditiva) no `messages.update`.
- **wwebjs:** `getMessageById` + checagens vivas (apagada/editada/visualização única/tipo);
  expectativa por destino (chat + tipo) casada no `message_create` ANTES da espera de 3 s →
  eco `source:'api'` com `isCold`/chave derivada, `mediaKey` da original; op do LID devolve o
  destino (nunca `undefined`); sem eco em 10 s → `ok` sem id (`confirmed:false`), expectativa viva
  até 60 s.
- **P-077:** `formatLocation`/`formatPoll` nos ecos das duas engines.

## Log

- 04:52 UTC — abertura R9, leitura obrigatória, passo 0; decisões do dono (limites; P-077 entra).
- ~05:00–05:30 — workflow de mapeamento (6 frentes + crítico + 12 lacunas; 19 agentes).
- ~05:30–06:10 — implementação (migration, port, engines, serviço/rota, contratos, fan-out).
- ~06:10–06:40 — 4 escritores de teste em paralelo (7 bugs achados) ∥ revisão adversarial (6 lentes
  × 2 céticos; 62 agentes).
- ~06:40–07:30 — correções dos 7 bugs + 13 achados da revisão, testes novos, mutantes, docs, R9.

## Resultado

- **Código:** rota `POST …/messages/:msgId/forward`; `messaging/application/{forward.service,
forward.decision,chat-jids}.ts`; `engine.port.ts` (`ForwardSource`, `PreparedForward`,
  `SendResult`, `ForwardSourceError`, limites, `IEngine.prepareForward`); `SessionManager.
prepareForward`; Baileys (`prepareForward`/`forwardTo`, `raw` das recebidas serializado na hora de
  emitir, `decodeProto` com `fromObject`, `markMessage` do mesmo lado, P-077); `baileys-content.ts`
  (`unwrapBaileys` compartilhado, `forwardableContent`); wwebjs (`prepareForward`/`forwardTo`,
  `matchForwardEcho`/`emitForwardEcho`, P-077) + `wwebjs.forward-echo.ts` + `wwebjsForwardBlock`;
  repositório (`findInboundChat`, `omit: {raw:true}`, NUL/surrogate); fan-out sem `raw`; migration
  `20260926052719_encaminhar_marcas_apagada_editada`; contratos `ForwardMessageRequest`/
  `ForwardResultDto`/`ForwardMessageResponse`.
- **Bugs achados pelos testes (7, corrigidos):** `target` aparado; mensagem de empresa com botões
  virava texto antes da checagem (Baileys); ACK fundido com edição/apagamento perdido; eco com `to`
  @lid do cache não casava (wwebjs → handoff falso); eco de `/text` "roubado" por expectativa viva;
  surrogate solto derrubava o INSERT com o `raw` (regressão da própria E24); rótulo por chave herdada.
- **Revisão adversarial (15 confirmados + 5 divididos + 8 refutados — todos tratados):** destino
  "gêmeo" do 9º dígito (LGPD — conversa só no número exato, transporte = número pedido); intenções
  `pending` após erro inesperado (limpeza); retry de lote entregue virando 400 após apagar/editar
  (recusa depois do replay); `raw` lido nas listagens (`omit`); expectativa sem eco segurando o
  celular (grace 20 s + texto/legenda no critério); eco de mídia sem binário (baixa a da cópia);
  `isForwarded:false` enganoso sem eco; REVOKE/EDIT de outro autor (filtro `fromMe`); temporária
  vencida; `raw` pré-reupload (serializado depois do download); docs (P-077 1ª linha, selo da própria
  já encaminhada, `results` nem sempre presente, 423 com replays, lottie, resíduo do fallback de
  texto, "não verificado" do wwebjs sem conversa).
- **Validação local (26/09):** `npm run lint` (limpo fora do `seed-mock.js` solto, não versionado) ·
  `npm run format:check` (idem) · `npm run depcruise` (0 violações, 237 módulos) · `tsc --noEmit` ·
  unit gateway **471/471** · e2e gateway **281/281** (infra local) · painel **122/122** ·
  `dashboard:build` · `gateway:build` (`dist/main.js`) · `node scripts/mapa-codigo.mjs --check` em
  dia. Mutantes: nó único do Baileys (6 falhas) e casamento do eco antes da janela (4 falhas) mortos.
- **CI do PR #7 (commits `afecd47` + `b916031`, run 36223333958):** `ci` ✅ (3m20s — lint, format,
  depcruise, suíte com cobertura, painel), `imagens` ✅ (build dos 2 Dockerfiles + boot do gateway),
  `advisories` ✅.

### Reconciliação documental — R3/R9

- Contrato e comportamento mudaram → INTEGRACAO (§2 item "Encaminhar"; §3.2 selo do eco do
  encaminhar + P-077; §13 triagem), `packages/contracts` (DTOs do encaminhar), DECISOES (D-030),
  ARQUITETURA (messaging: engines leem `raw`/marcam; `ForwardService`), MAPA-CODIGO (§3.2 `raw` no
  inbound, §3.12 fluxo novo, §5 P-068/P-077), PENDENCIAS (P-068 ✅ API, P-077 ✅, P-069 nota,
  P-080..P-083 novas), análise §4 (2 correções), ROTEIRO (E24 ✅, diário, mensagem da E25, tarefas do
  dono), CHANGELOG, ESTADO, SESSOES (aviso + histórico), how-to novo `teste-chip-encaminhar.md`, mapa
  gerado.
- **Docs-n/a:** `env.example` (sem env nova — retenção do `raw` reaproveita
  `RETENTION_MESSAGE_RAW_DAYS`); `how-to/rollback-gateway.md` (rollback do deploy G: a migration nova é
  aditiva e a imagem antiga ignora as colunas; o `raw` das recebidas fica no banco até a retenção);
  README/CLAUDE.md (sem comando novo); skill local do nó n8n (fora do repo — o nó 0.4.1 não tem a rota;
  uso por HTTP Request).

### Checkpoint

- **O QUE FOI FEITO:** encaminhar pela API nas 2 engines com os limites do dono, idempotência do
  pedido, cold derivado do servidor e trava 423; original das recebidas guardada no Baileys; eco
  correlacionado no wwebjs; P-077; robustez da gravação (NUL/surrogate) e das listagens.
- **PACOTES:** nenhum novo. Baileys rc14 e wwebjs 1.34.7 seguem os mais novos (passo 0).
- **DECISÕES REGISTRADAS:** D-030 (limites do dono; ordem das recusas; idempotência do lote; cold
  derivado só no encaminhar, número exato; um destino por vez 1–3 s; `raw` das recebidas; nó único no
  Baileys; apagada/editada recusadas; wwebjs nativo com eco correlacionado; NUL/surrogate).
- **EFEITO DE DEPLOY (deploy G, fim da Onda 8):** migration aditiva `20260926052719` (2 colunas
  nulas — só metadado); o Baileys passa a gravar o `raw` das recebidas (mais disco por 7 dias; a
  retenção reescreve cada linha uma vez aos 7 d); webhook `message` dos ecos de localização/enquete
  muda o `text` (P-077); rota nova sem efeito em quem não a usa.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** encaminhar vazar citação/perder selo → specs com a lib real
  (`baileys.forward.spec.ts`) + mutante; handoff falso no wwebjs → `wwebjs.forward.spec.ts` + mutante;
  duplicidade/409 falso → e2e de idempotência (lote, destino, concorrência, takeover); destino errado
  → `forward.decision.spec.ts` (exact × candidates); mensagem sumindo no INSERT → e2e NUL/surrogate.

## BLOQUEADO EM VOCÊ

- **Deploy A (Onda 1) continua pendente** — [how-to/deploy-a-onda1.md](../how-to/deploy-a-onda1.md)
  §1–§2; depois o B-004 (§3).
- **Não mergear o PR #7 agora:** a E25 (interface) fecha a Onda 8; o merge = deploy G.
- **Teste com chip do encaminhar** (antes do deploy G — de preferência no gateway LOCAL, com um chip
  de teste): [how-to/teste-chip-encaminhar.md](../how-to/teste-chip-encaminhar.md); devolver o
  resultado no chat seguinte (fecha os "não verificado" da D-030 / P-083).
- **Decidir quando puder:** P-080 (encaminhar mídia antiga pelo S3 — exige marca de visualização
  única) e P-081 (cold derivado também no `/text` — muda o comportamento do n8n).
- **Seus fluxos n8n** que comparam o `text` do eco de localização/enquete enviadas pela API (P-077):
  revisar antes do deploy G (INTEGRACAO §3.2).
- **Seguem de antes:** conferir o painel da E23 no Safari; fluxos n8n com `senderJid` em grupo →
  `chatJid` (INTEGRACAO §3.2 item 9).

## DOCS TOCADAS

`CHANGELOG.md` · `docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/DECISOES.md` ·
`docs/INTEGRACAO.md` · `docs/MAPA-CODIGO.md` · `docs/ARQUITETURA.md` ·
`docs/ROTEIRO-ONDAS-2026-09.md` · `docs/analise-conversas-whatsapp-web-2026-09.md` ·
`docs/how-to/teste-chip-encaminhar.md` (novo) · `docs/reference/mapa-codigo/*` (gerado) ·
`packages/contracts/src/index.ts` · esta sessão.
