# Sessão: e23-conversas-painel

- **Status:** ✅ DONE — P-067 + P-072 (parte painel) + P-074 entregues na branch `feature/onda8-conversas`
  (PR #7 da Onda 8 — sem merge; o deploy G sai no fim da onda, E25). D-029. P-076 aberta e fechada na
  etapa; P-077..P-079 registradas.
- **Início:** 25/09/2026 21:20 BRT (00:20 UTC de 26/09) — macOS, Node 26.0.0 / npm 11.12.1
- **Objetivo:** Etapa **E23** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) (Onda 8 — conversas fiéis ao
  WhatsApp Web, parte painel): **P-067** (balões e mídia no Inbox e no Atendimento — componentes
  compartilhados, mídia por blob, selos de reação/encaminhada, "Mensagem não suportada") + **P-072
  parte painel** (tiques ✓/✓✓ só em `fromMe`, só exibição; Atendimento ouvindo `message.ack` e
  `message.reaction` no SSE, casando por `keyId`) + **P-074** (remetente de mensagem de GRUPO nas 2
  engines — decisão do dono na abertura: **entra nesta etapa**).
- **Escopo previsto:** `apps/dashboard/src/` (`components/chat/*` novos, `lib/message-format.ts` e
  `lib/media-blob.ts` novos, `lib/api.ts`, `routes/Inbox.tsx`, `routes/Atendimento.tsx`, vitest em
  ambiente node para `lib/*`); P-074: `modules/sessions/infrastructure/{baileys,wwebjs}/` (só o
  `senderJid` do inbound de grupo) + testes; `packages/contracts` e `docs/INTEGRACAO.md` (valor de
  `senderJid` em grupo). Pontos de contato globais declarados: `packages/contracts`.
  **Escopo real (ampliado durante a etapa, com motivo):** + `messaging/interface/messages.controller.ts`
  (`senderName` do P-074 e o 500 do `/media` — P-076), `messaging/interface/content-disposition.ts`
  (novo), `sessions/application/engine.port.ts` (comentário), `.github/workflows/ci.yml` (passo de
  testes do painel), `package.json` raiz + `apps/dashboard/package.json` + `package-lock.json` (+1
  linha: vitest declarado no painel), README/CLAUDE.md (comandos de teste). Ponto de contato global
  tocado: `packages/contracts` e `ci.yml`.
- **Fora do escopo:** encaminhar (E24/E25), recibo de leitura pelo painel (decisão do dono: só
  exibição), editadas/apagadas/citação/paginação (P-069), download de mídia do Baileys (E10/P-050,
  P-075), `append` (E7/P-047), produção/Dokploy (R0).
- **Branch:** `feature/onda8-conversas` (continuação da E22 — PR #7 da Onda 8, sem merge).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** execução pelo roteiro de 25/09; Onda 1 mergeada (PR #5/#6) mas **deploy A não feito** —
  produção segue em `768fb26`; todo auto-deploy desligado (D-027). E22 abriu a Onda 8 na branch
  `feature/onda8-conversas` (PR #7, sem merge; D-028). `.cloud` = produção, sem homologação.
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`,
  branch `fix/lid-envio-wwebjs`) — a P-074 toca `wwebjs.engine.ts` só no `senderJid` do
  `onMessageCreate` de grupo (inbound), sem mexer em envio/LID de saída. Avisos lidos: E22 (conteúdo
  por `describe*Message`; reação não é mensagem — `wa_message_reactions`, casar por `keyId` + sessão,
  nunca por chatJid; `baileys.shutdown.spec.ts` mocka `proto: {}`; ACK de grupo ausente no Baileys e
  `read` em recebida = lida no celular; migration `20260925203458` no próximo `infra:up`), E4 (rota
  resolvida, URL do cliente só via `safeFetch`; deploy manual), E3 (Onda 8 — ler o diagnóstico antes
  de mexer em Inbox/Atendimento), E2 (postinstall `--error-on-fail`), onda0b (mapa: rodar
  `node scripts/mapa-codigo.mjs` e commitar; MinIO `pgsty/*` no dev/CI), 15/09 (caixa única), 18/08
  (unit sem infra).
- **PENDENCIAS:** P-067 (etapa), P-072 (parte painel; a parte gateway ✅ E22), P-074 (entra), P-069
  (opcional, fora), P-073/P-075 (E5/E10, fora). B-004..B-007 e o checklist do deploy A seguem com o
  dono. **Divergência achada na abertura:** o commit `80bef35` diz "P-072 parte gateway ✅ com 7
  achados de ACK para a E23", mas a linha da P-072 em PENDENCIAS.md ficou igual à versão anterior (sem
  o ✅ nem os achados) — os achados estão na INTEGRACAO §13, no contracts (`InboxFeedItemDto.status`)
  e no Diário da E22; reconciliar no encerramento.
- **Roteiro E23 + diagnóstico** (`analise-conversas-whatsapp-web-2026-09.md` §2 S2–S5, §5 C2, §7):
  Atendimento nunca desenhou mídia (`Atendimento.tsx:613`); Inbox relê a conversa a cada 2,5 s e a
  URL pré-assinada muda a cada leitura → `<audio>` recarrega (S3); helmet CORP `same-origin`
  bloqueia `<img>` cross-origin do `/media`; `/media` sem Range; `fetch` com cookie funciona
  (SameSite=Lax, CORS credentials); áudio = `audio/ogg; codecs=opus` (Safari = hipótese S5).
- **INTEGRACAO §3.2/§12/§13:** tipos `location`/`contact`/`poll`/`event`/`group_invite`/`poll_vote`/
  `other` com resumo; `reactions[]`, `isForwarded`, `forwardingScore` (≥ 5 = "com frequência");
  `status` do feed = ACK (tique só em `fromMe`; grupo no Baileys = null); SSE: `message.ack` e
  `message.reaction` por `keyId`.
- **MAPA-CODIGO §4.5:** `lib/api.ts` (silent refresh single-flight, `coreFetch` com 1 retry); SSE do
  Atendimento aceita só `event==='message'` (`Atendimento.tsx:218`); código duplicado entre Inbox e
  Atendimento (`numberFromJid`/`sendTarget`/`mediaLabel`/`displayName`); dashboard com 0 testes; SSE
  não passa pelo silent refresh.
- **Decisões do dono (valem sem nova pergunta):** tiques só exibição; P-074 entra na E23 (resposta na
  abertura, 25/09 21:20).

## Passo 0 — upstream (26/09 00:25 UTC)

- `npm view @whiskeysockets/baileys dist-tags` → `{ latest: '7.0.0-rc14', legacy: '6.7.24' }`;
  `npm view whatsapp-web.js dist-tags` → `{ next: '1.34.5-alpha.3', latest: '1.34.7' }` — nada novo
  desde a E22. Instalados: Baileys 7.0.0-rc14, wwebjs 1.34.7 (pin `1780711`), React 19.2.8, Vite
  8.2.2, Tailwind 4.3.3, vitest 4.1.11 (hoisted na raiz), helmet 8.3.0.

## Fontes (documentation-first)

- **Código instalado (lido/rodado):** helmet 8.3.0 (`node_modules/helmet/index.cjs:190-201, :377-380` —
  CORP `same-origin` padrão) via @fastify/helmet 13.1.1; @fastify/cors 11.3.0 (`index.js:16,
:232-236, :279-287` — sem `exposedHeaders`); @fastify/rate-limit 11.2.0; @nestjs/platform-fastify
  (`adapters/fastify-adapter.js:236-258` — StreamableFile, sem Range); Baileys 7.0.0-rc14
  (`Utils/decode-wa-message.js:69-95, :140-145, :177-196`; `Utils/process-message.js:65-78`;
  `Socket/messages-recv.js:1186-1202` — recibo de grupo vai para `message-receipt.update`;
  `Socket/chats.js:917-924` — pushName do participante vira `contacts.update`); whatsapp-web.js
  1.34.7 (`src/structures/Message.js:94-100` — `author`; `src/util/Injected/Utils.js:1795-1823` —
  `enforceLidAndPnRetrieval` consulta a rede para LID desconhecido); React DOM 19.2.8
  (`react-dom-client.production.js:1410-1416` — só neutraliza `javascript:`); vitest 4.1.11
  (hoisted; `peerDependencies` vite ^6|^7|^8; defaults `environment: 'node'`).
- **Doc oficial:** Fetch Standard §3.7/§4.4 (CORP só em no-cors — `fetch` com CORS + credenciais
  passa) e §2.2.2 (headers legíveis cross-origin: só os safelisted — Content-Disposition não), §4.3
  (scheme fetch `blob` atende Range); File API (object URL: origem do criador, revogado = erro de
  rede); HTML (EventSource: resposta ≠ 200 → "fail the connection", sem reconexão; `play()` sem
  permissão → NotAllowedError; atributo `download`); WebKit blog 16574 (Safari 18.4 toca Ogg
  Opus/Vorbis); MDN (canPlayType, revokeObjectURL, IntersectionObserver, Content-Disposition
  `filename*`, rel=noopener, aria-label, white-space); react.dev (StrictMode setup→cleanup→setup e
  updater 2×; useState/Object.is); Context7 `/vitest-dev/vitest` (config, prioridade do
  vitest.config); Context7 `/whiskeysockets/baileys.wiki-site` (migration v7: `participantAlt` —
  "if a participant is a LID, the Alt will be a PN"); FAQ WhatsApp 665923838265756 (tiques; grupo:
  ✓✓ quando TODOS receberam/leram), 1053543185312573 (encaminhada com frequência = 5+ conversas),
  424198503229937 (reações abaixo da mensagem, uma por pessoa).
- **Mapeamento (8 agentes, 26/09 ~00:30–01:10 UTC):** resumos em
  `scratchpad/e23/summaries/*.md` (não versionados) — mídia no gateway (PoC com a mesma pilha do
  main.ts: 14/14), navegador/docs, ACK/SSE/reações (PoC + espelho de 48 casos do reaction-key),
  P-074 (PoC com `decodeMessageNode`/`cleanMessage` reais da rc14), catálogo de formatos (PoC
  78/78), infra/seed, UX (mock + contraste medido), crítico de completude.

## Diário

- 21:20 — abertura R9, leitura obrigatória feita, decisão P-074 = entra; sessão registrada.
- 21:30–22:10 — **workflow de mapeamento** (7 frentes + crítico). Achados que mudaram o plano:
  (1) a fórmula escrita na P-074 (`participantAlt ?? participant`) está ERRADA no modo PN do rc14
  (lá o `participantAlt` é o @lid) — usar `phoneFirst`, como a reação da E22; (2) no wwebjs,
  resolver o @lid do autor = `page.evaluate` + consulta de existência na rede por mensagem →
  só cache em memória; (3) **bug pré-existente:** `GET /media` de documento com nome fora do
  Latin-1 (–, aspas curvas, emoji) responde **500** (`ERR_INVALID_CHAR` no Content-Disposition) —
  quebraria o "Baixar" do painel e já afeta o n8n; (4) o SSE morre de vez depois de um 401/429/502
  (spec WHATWG) e a conversa aberta do Atendimento não tem polling → tiques congelariam; (5) a
  rolagem forçada a cada 2,5 s no Inbox; (6) o balão de saída `emerald-600` com texto branco tem
  contraste 3,67:1 e o tique azul 1,68:1 (reprova WCAG) → `emerald-800` (7,58:1, o verde-escuro do
  WhatsApp Web); (7) a linha da P-072 não tem os achados que o commit da E22 diz.
- **Incidente do mapeamento (transparência):** a frente de infra/seed disparou por engano
  `node seed.mjs up` no banco/MinIO de **DEV** (~00:38:50–00:40 UTC) e rodou `down` logo depois;
  conferido: 0 linhas `e23-seed-*`, `wa_sessions` = 0 como antes, objetos preexistentes intactos.
  Nada de produção.
- 22:10–23:20 — implementação do painel (eu) em paralelo com a do gateway (subagente, só
  `apps/gateway/**`): libs puras `jid`, `message-format`, `time-format`, `live-events`,
  `media-cache` (+ `media.ts`, `use-live-stream.ts`), componentes `components/chat/*`, Inbox e
  Atendimento refeitos sobre eles; vitest no painel (devDependency `^4.1.11`, lockfile +1 linha
  offline, sem download), passo no CI, scripts raiz. 107/107; 10 mutantes manuais mortos (espelho
  do senderKey, tique em grupo, ACK regredindo, replay ressuscitando reação, dedup só por keyId,
  link cru do mapa, documento executável, revoke sem carência, 404 re-tentando, LRU revogando em
  uso). Falha de desenho achada no PoC e corrigida: reaplicar a memória de reações podia
  ressuscitar uma reação removida enquanto o SSE esteve fora → replay só sobre GET que saiu antes
  do evento (margem de 2 s).
- 23:20–00:10 — **revisão adversarial** em 2 workflows (painel: 5 lentes + 5 céticos; gateway: 3
  lentes + 3 céticos, com PoCs em Chrome headless, engine real e parser do n8n). Painel: **19
  achados confirmados, todos tratados** — o Atendimento não rolava a conversa (abria na mais antiga
  e baixava todas as imagens: altura de janela), lightbox sem foco/inércia (`<dialog>` nativo),
  mimetype composto passava no `safeBlobType` (tipo estrito), debounce/GET do filtro antigo
  sobrescrevia lista e contadores (guarda do filtro), GET antigo do fluxo apagava o item do SSE
  (`mergeFeed`), releitura pós-envio do Inbox na conversa errada e rascunho apagado, envio próprio
  sem ir ao fim (`stickKey`), nome longo de remetente alargando o `<main>` (`min-w-0`), contraste
  do texto secundário no balão de saída (`zinc-300`), e 8 de testes/infra (margem de 2 s, ordem do
  LRU, carência que recomeça, ordenação das reações, LRU de ACK, cor por participante, `tsc` do
  painel arrastando arquivo do gateway → import dinâmico, README/CLAUDE.md dos scripts de teste).
  Gateway: 4 confirmados, 3 refutados — pushName do participante congelava no 1º valor (e o par
  aprendido por reação offline nunca ia ao diretório) → grava quando o nome muda (`groupPushName`,
  teto 5000); nome Latin-1 com `%` `\` `;` `=` quebrava o download no n8n → `filename*`; contrato
  dizia que as linhas antigas de grupo têm o jid do grupo (as do `/sync` do wwebjs têm o autor cru)
  → texto corrigido. Achado paralelo tratado na etapa: mimetype inválido do remetente derrubava o
  `/media` no Content-Type (`safeContentType`, e2e com prova de vermelho).
- 00:10–00:40 — **validação no Chrome 153** (Mac, extensão; a sessão apontava para um Chrome de
  outra máquina — o dono escolheu o do Mac e fez o login) com o seed local (3 sessões `e23-seed-*`,
  84 mensagens, mídia no MinIO de dev) e o gateway de dev com `S3_*` na linha de comando (o `.env`
  local não tem S3): tipos de balão, cartões, prévias sem "…", imagens por `blob:` (0 pedidos ao
  MinIO; 5 `GET /media` sob demanda), Ogg/Opus decodificando (3,00 s; o `<audio>` não carrega com a
  aba oculta — Chrome adia mídia e IntersectionObserver em página oculta), AMR → "Baixar", tiques
  ao vivo (null → Enviada → Lida; ACK atrasado de "entregue" não regride), reação ao vivo (põe/tira,
  mantida depois da recarga de 20 s), mensagem nova no fluxo e na conversa sem puxar a rolagem, grupo
  com nome/cor por participante e linha legada sem rótulo, 0 re-download de mídia em 8 s de polling,
  documento com emoji no nome → 200, console sem erro. Achado na validação e corrigido: o lightbox
  dependia do evento `close` (entregue depois, atrasado com a aba oculta) — fecha agora pelo
  `cancel`/botão/clique fora e devolve o foco (`useLayoutEffect`). **Safari: não validado** (a
  ferramenta só lê o Safari) — tarefa do dono.
- 00:40 — ambiente desmontado: gateway/painel de dev parados, `seed.mjs down` (0 linhas
  `e23-seed-*`, `wa_sessions` = 0), 7 objetos de PoC `media/poc-e23-midia/*` removidos do MinIO de
  dev, abas do Chrome fechadas.

- 01:20–02:10 (26/09) — **conferência do dono no painel local** (seed de volta, gateway/painel de
  dev): (1) "clicar nas conversas às vezes não pega" no Atendimento — registrador de ponteiro na aba
  mostrou dezenas de cliques caindo na `DIV` da linha, fora do `<button>`: só nome/prévia era
  clicável, e a faixa do "🟡 não preciso responder" e as margens não (o fundo acende na linha toda;
  pré-existente desde 15/09; no Inbox a linha inteira já era o botão — 63 cliques, 0 perdidos) →
  linha inteira abre a conversa, botões de triagem com `stopPropagation`; (2) "Enviar: nada
  acontece" — o POST saía (400 "Sessão não iniciada" nas sessões de teste) mas o erro ia para o topo
  da página, e sem texto o botão desabilitado parecia ativo → erro junto da caixa em linguagem de
  operador (`lib/send-feedback.ts`), caixa travada com aviso quando o aparelho está desligado, botão
  desabilitado cinza com dica. Validado no Chrome (clique na faixa de baixo abre; Helena/STOPPED
  travada; erro ao lado do campo). Painel 122/122.

## Provas (26/09, local — macOS, Node 26.0.0)

- `npm run lint` · `npm run format:check` · `npm run depcruise` (230 módulos, 0 violação) · `tsc`
  do gateway, do painel e do contracts · `node scripts/mapa-codigo.mjs --check` · `npm run
gateway:build` · `npm run dashboard:build` · guardas de build (`patches`, `dist`, `deps` — 31
  pacotes, `prisma`) · `docker build` da imagem do painel (com a devDependency nova) — verdes.
- `npm run test` — gateway **50 arquivos, 530/530** (eram 477 na E22: +53 — engines modos LID/PN,
  pushName, `wwebjsGroupSender`, `content-disposition`/`safeContentType`, e2e `conversas-grupo` e
  casos no `media`) + painel **5 arquivos, 118/118**.
- Prova de vermelho: gateway — testes escritos antes do código (TDD do subagente: 15 unit + 6 e2e
  falhando contra a HEAD; na 2ª rodada 9 unit + 1 e2e contra o código anterior); `safeContentType`
  — e2e falha com a linha antiga; painel — 17 mutantes manuais mortos (10 + 7 da revisão).
- `tsc --listFilesOnly -p apps/dashboard` → 0 arquivos do gateway (import dinâmico nos specs).

- **CI do PR #7 (run 36210990440, `5fb93a2`+`5f2d8fa`, amd64):** `ci` 2m57s ✅ (format, depcruise,
  tsc dos 3 projetos, **testes do painel no passo novo**, suíte do gateway com coverage contra
  Postgres/Redis/MinIO) · `imagens` 2m30s ✅ (build das 2 imagens — o painel com a devDependency nova
  — + boot do gateway até o `/health` + smoke do login) · `advisories` 15s ✅ (rodou porque o
  lockfile mudou; run 36210990388).

### Reconciliação documental — R3/R9

- Contrato e comportamento mudaram → INTEGRACAO (§3 `senderJid` na tabela; §3.1 `Content-Disposition`
  com `filename*`, `Content-Type` seguro, 503, limitação do apóstrofo no n8n; §3.2 `senderJid` de
  grupo + item 9 da lista do n8n; §12 `senderName`; §13 casar por sessionId + keyId), `packages/
contracts` (`MessageDto.senderJid` comentado, `senderName`, `lastText` corrigido), DECISOES (D-029),
  ARQUITETURA (messaging lê `infra/directory`), MAPA-CODIGO (§3.2, §4.2, §4.5 — testes, SSE, Inbox,
  Atendimento, invariantes de mídia/tempo real; §5 P-067, P-072, P-074, P-076..P-079), PENDENCIAS
  (P-067 ✅, P-072 ✅ com os achados de ACK reconciliados, P-074 ✅ com a fórmula corrigida, P-076 ✅,
  P-077..P-079 novas), ROTEIRO (E23 ✅, diário, mensagem da E24, tarefas do dono), CHANGELOG, README
  e CLAUDE.md (comandos de teste), ESTADO, SESSOES, mapa gerado.
- **Docs-n/a:** AGENTS.md (não versionado — está fora do git na raiz; não mexido), deploy-a-onda1.md
  e rollback-gateway.md (a E23 não muda o rollback do deploy G: só código de painel e campos
  aditivos), env.example (nada novo de ambiente).
- **Fora do repo (do dono):** a skill local `conexozenvo-n8n-node` pode citar que `senderJid` em grupo
  é o participante (hoje orienta responder para `chatJid`, que continua certo).

### Checkpoint

- **O QUE FOI FEITO:** painel fiel ao WhatsApp Web no Inbox e no Atendimento (balões compartilhados,
  cartões por tipo, mídia por blob com cache, tiques e reações ao vivo, SSE resiliente, rolagem
  certa, lightbox acessível); remetente de grupo nas 2 engines + `senderName`; `/media` sem 500 por
  nome ou mimetype; vitest no painel.
- **PACOTES:** nenhum novo — `vitest ^4.1.11` só declarado no painel (já estava instalado; lockfile
  +1 linha, `npm ci` do Dockerfile do painel instala +28 pacotes no estágio de build, imagem final
  igual). Baileys rc14 e wwebjs 1.34.7 seguem os mais novos (passo 0).
- **DECISÕES REGISTRADAS:** D-029 (P-074 muda o valor de `senderJid` em grupo sem `/api/v1`; mídia só
  por blob; tipos seguros de blob; tiques sem grupo; casamento por sessionId + keyId; SSE recriado;
  `Content-Disposition`/`Content-Type` do `/media`; balão `emerald-800`; testes do painel).
- **EFEITO DE DEPLOY (deploy G, fim da Onda 8):** painel novo (sem migration); webhook `message` em
  grupo passa a trazer o participante em `senderJid`; `GET /messages` ganha `senderName`; `/media`
  deixa de dar 500 e muda o header de nomes com `%`/`;`/`=`/`\`. Os dois apps sobem juntos (deploy
  manual — D-027); o painel tolera gateway sem os campos novos.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** remetente de grupo errado (modo PN) → specs com as funções
  reais da rc14; 1:1/fromMe mudando → guardas nos specs das engines; blob executável na origem do
  painel → `safeBlobType` + specs com HTML/SVG/mimetype composto; tique/reação divergindo da recarga
  → espelho do `reaction-key.ts` e memórias testadas; regressão de UX (rolagem, lightbox) → só
  validação manual (componentes sem teste automatizado).

## BLOQUEADO EM VOCÊ

- **Deploy A (Onda 1) continua pendente** — [how-to/deploy-a-onda1.md](../how-to/deploy-a-onda1.md)
  §1–§2; depois o B-004 (§3).
- **Não mergear o PR #7 agora:** ele cresce com a E24–E25 e o merge (= deploy G) é no fim da onda.
- **Conferir no Safari** (antes do deploy G): com o painel local ou, depois do deploy, em produção —
  áudio Ogg/Opus tocando no clique, imagem, vídeo com avanço/retrocesso, "Baixar" de documento,
  lightbox (Esc fecha). No Chrome já foi validado.
- **Seus fluxos n8n que usam `senderJid` em GRUPO** (como destino ou para saber se é grupo): trocar
  por `chatJid` antes do deploy G (INTEGRACAO §3.2 item 9).
- **Abertura da E24:** confirmar os limites do encaminhar (5 destinos, 1 se "com frequência", só a
  mesma sessão, cold com 423) e decidir se a P-077 (ecos de localização/enquete sem link/opções)
  entra junto.
- **Opcional:** o balão de saída agora é verde-escuro fixo (`emerald-800`, como o WhatsApp Web) e não
  segue a cor de marca do cliente — se preferir a cor de marca, é uma troca de classe (com contraste
  pior).

## DOCS TOCADAS

`CHANGELOG.md` · `README.md` · `CLAUDE.md` · `docs/ESTADO.md` · `docs/SESSOES.md` ·
`docs/PENDENCIAS.md` · `docs/DECISOES.md` · `docs/INTEGRACAO.md` · `docs/MAPA-CODIGO.md` ·
`docs/ARQUITETURA.md` · `docs/ROTEIRO-ONDAS-2026-09.md` · `docs/reference/mapa-codigo/*` (gerado) ·
`packages/contracts/src/index.ts` (comentários) · esta sessão.
