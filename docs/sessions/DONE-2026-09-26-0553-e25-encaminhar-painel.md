# Sessão: e25-encaminhar-painel

- **Status:** ✅ DONE — P-068 parte interface entregue na branch `feature/onda8-conversas` (PR #7 —
  **fecha a Onda 8**; merge do dono = deploy G). D-031. P-084 (pedido do dono → E26) e P-085 abertas.
- **Início:** 26/09/2026 05:53 BRT (08:53 UTC) — macOS, Node 26.0.0 / npm 11.12.1
- **Objetivo:** Etapa **E25** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) (Onda 8 — conversas fiéis ao
  WhatsApp Web): **P-068 parte interface** — encaminhar fiel ao WhatsApp Web no painel (Inbox e
  Atendimento): menu ⌄ no balão → "Encaminhar" → modo seleção → diálogo "Encaminhar mensagem para"
  (busca, conversas da MESMA sessão, até 5; só 1 quando a original tem `forwardingScore ≥ 5`) → ➤ com
  progresso e erro por destino a partir de `results[]`; atalho ↪ nas mídias; ação escondida nos tipos
  que o gateway recusa; mensagens de operador para 400 com `code`, 423, 409 e `confirmed:false`;
  `idempotencyKey` por clique. **Esta etapa FECHA a Onda 8** (merge do PR #7 = deploy G).
- **Escopo previsto:** `apps/dashboard/src/` — `components/chat/*` (MessageBubble, ChatThread,
  MediaView, componentes novos do encaminhar), `lib/api.ts` (rota nova + `code`/`results` no
  `ApiError`), libs puras novas em `lib/*` com vitest, `routes/Inbox.tsx` e `routes/Atendimento.tsx`
  (só a ligação). Docs: MAPA-CODIGO §4.5, roteiro, PENDENCIAS, ESTADO, CHANGELOG, checklist do
  deploy G. **Sem mudança no gateway nem no contrato** (a rota e os tipos são da E24) — se algo do
  gateway se provar necessário, entra aditivo e documentado.
- **Fora do escopo:** gateway/engines (E24 fechou a API), editadas/apagadas/citação (P-069), mídia
  antiga pelo S3 (P-080), cold derivado no `/text` (P-081), produção/Dokploy (R0) — nenhum envio real;
  o teste com chip e a conferência no Safari são do dono.
- **Branch:** `feature/onda8-conversas` (continuação da E24 — PR #7 da Onda 8).

## Decisões do dono na abertura (26/09, pergunta no chat)

1. **Modo seleção = só 1 mensagem por encaminhamento** (recomendado): clicar noutra mensagem troca a
   seleção; 1 pedido = no máximo 5 envios — mesmo risco anti-ban da E24 (D-030). Selecionar várias
   (como o WhatsApp Web) ficou de fora.
2. **Destinos = contatos e grupos da mesma sessão** (recomendado): fiel ao WhatsApp Web e ao que a
   API da E24 aceita (`@g.us`); grupo sem mensagem recebida conta como 1º contato (cold → trava 423).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** execução pelo roteiro; Onda 1 mergeada, **deploy A não feito** — produção segue em
  `768fb26`; todo auto-deploy desligado (D-027). Onda 8 na branch `feature/onda8-conversas` (PR #7,
  CI verde em 26/09, sem merge): E22 (D-028), E23 (D-029) e E24 (D-030) ✅; próxima = **E25** (fecha a
  Onda 8 = deploy G). E5 tem prazo (build do wwebjs até 13/10; se chegar 08/10, pular para ela —
  hoje é 26/09).
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`,
  branch `fix/lid-envio-wwebjs`) — a E25 não toca o gateway. Avisos lidos: E24 (rota `/forward`,
  `raw` fora das listagens, `ForwardEchoRegistry` no wwebjs, P-080..P-083), E23 (painel desenha por
  `lib/message-format.ts` com ida e volta; mídia só pelo `/media` como blob, nunca `mediaUrl` como
  `src`; casar tempo real por (sessionId, keyId), memórias fora do updater; vitest do painel por
  workspace), E22, E4 (deploy manual; conferir uptime do `/health`), E3, E2, onda0b (`node
scripts/mapa-codigo.mjs` e commitar), 15/09, 18/08.
- **PENDENCIAS:** P-068 (etapa — parte interface), P-083 (o que só o chip prova — roteiro
  `how-to/teste-chip-encaminhar.md`), P-080/P-081 (decisões do dono, fora), P-069/P-073/P-075/P-078/
  P-079/P-082 fora. B-004..B-007 e o checklist do deploy A seguem com o dono.
- **Roteiro E25 + Diário da E24:** rota `POST …/messages/:msgId/forward` → `results[]` na ordem de
  `to`; 400 com `code` (`FORWARD_UNSUPPORTED`/`FORWARD_SOURCE_UNAVAILABLE`/`FORWARD_LIMIT`), 404,
  409 e 423 ANTES de enviar; destino sem conversa RECEBIDA no número exato = cold à força; quarentena
  com algum cold = 423 no pedido inteiro (nada sai); Baileys guarda a original 7 dias (mídia antiga
  → `FORWARD_SOURCE_UNAVAILABLE`); wwebjs `confirmed:false` = saiu sem o id a tempo (o painel NÃO
  oferece reenviar); o eco é mensagem nossa (`source:'api'`) com o selo — já desenhado pelo
  `ForwardedTag` (E23).
- **INTEGRACAO §2 (Encaminhar) / §3.2 / §13:** limites 1–5 sem repetir (9º dígito conta como
  repetido); `forwardingScore ≥ 5` → só 1; destinos aceitos: número, `@s.whatsapp.net`/`@c.us`,
  `@g.us`, `@lid` (canal/lista → 400); 201 `{results:[{target,to,ok,id,deduped,cold,idempotencyKey,
isForwarded?,forwardingScore?,confirmed?,status?,code?,error?}]}`; nenhum ok → status comum
  (409/400) ou 400 `FORWARD_FAILED` com `results`; sem `results` = recusas antes de olhar os destinos
  (400 de validação/destino/tipo/limite, 404, 409 da chave do pedido); a mesma chave com outro
  conjunto de destinos → 409; chave derivada `<chave>:<destino>`; o destino vai para 🟢 na caixa
  única.
- **D-030:** ordem F0→F3, reserva do LOTE, gate cold UMA vez, 1–3 s entre envios efetivos (a
  resposta leva segundos), apagada/editada recusada depois do replay.
- **MAPA-CODIGO §3.12/§4.5:** `ForwardService` (mutex por sessão, `batchStatus`); painel: `lib/api.ts`
  `parseError` **descarta o `code` do corpo** (só lê `message`) — a E25 precisa ler `code`/`results`;
  `ChatThread`/`MessageBubble` compartilhados; `<dialog>` modal já usado no lightbox (`MediaView`).
- **contracts:** `ForwardMessageRequest {to[], cold?, idempotencyKey?}`, `ForwardResultDto`,
  `ForwardMessageResponse {results}` já existem (E24).
- **Análise §4 (UI fiel):** menu ⌄ → Encaminhar → modo seleção → "Encaminhar mensagem para" (busca,
  conversas da mesma sessão, até 5) → ➤ com progresso/erro por destino; atalho ↪ nas mídias; selos.

## Passo 0 — upstream

Etapa só de painel (sem engine) — a regra 4 do roteiro não se aplica. Instalados: React/React DOM
19.2.8, @types/react 19.2.18, Tailwind 4.3.3, Vite 8.2.2, vitest 4.1.11, Node 26.0.0.

## Fontes (documentation-first — acessadas em 26/09/2026)

- **`<dialog>`**: WHATWG HTML (the dialog element — top layer, documento bloqueado, `cancel`
  cancelável com `canPreventClose`, `close` entregue por tarefa, foco anterior restaurado); MDN
  `dialog`, `HTMLDialogElement/cancel_event`, `closedBy` (BCD: Chrome 134, Firefox 141, **Safari só
  preview** → clique fora implementado à mão), `::backdrop`, `inert`.
- **React 19.2.8**: react.dev "common components" (`onCancel`/`onClose` de `<dialog>` BORBULHAM na
  árvore React → guarda `e.target === e.currentTarget`); `react-dom-client.development.js` (`autoFocus`
  vira `focus()` no commit, não atributo → foco explícito na busca depois do `showModal`); `useId`;
  StrictMode (efeitos 2× em dev).
- **WAI-ARIA APG**: menu button (Enter/Espaço/↓ abrem com foco no 1º item, Esc devolve o foco,
  `aria-haspopup`/`aria-expanded`, itens `tabindex=-1`), dialog modal (foco inicial, Esc,
  `aria-labelledby`), checkbox (lista de checkboxes nativos num grupo rotulado — listbox não aceita
  controles dentro).
- **Tailwind 4** (espelho `~/dioggo-agents/agentes/docs/tailwind/4/`): `upgrade-guide.mdx:759-770`
  (`hover` só em `@media (hover: hover)`), `hover-focus-and-other-states.mdx:1895` (`pointer-coarse`/
  `not-pointer-fine`), `:759-816` (`group/{nome}`), `background-image.mdx:46-52` (`bg-linear-to-*`);
  compilado e conferido no CSS do build (`not-pointer-fine:pr-8`, `group-has-[:focus-visible]/msg`).
- **Busca sem acento**: MDN `String.prototype.normalize` + `\p{M}` (o `\p{Diacritic}` apaga `^` e
  crase — testado no Node 26).
- **`crypto.randomUUID`**: MDN (contexto seguro — `localhost` e https ok; IP de LAN por http não).
- **Fidelidade ao WhatsApp**: FAQ oficial pt_BR — faq.whatsapp.com/887468535575482 (como encaminhar
  no Web: menu ⌄ → Encaminhar; até 5 conversas "incluindo apenas um grupo" se já encaminhada; "com
  frequência" → 1 conversa), /1053543185312573 (limites e selos), /982833196228708 (atalho ao lado da
  mídia), /1077018839582332 (visualização única não encaminha); blog.whatsapp.com (more-changes-to-
  forwarding). Textos exatos lidos no JavaScript pt_BR do web.whatsapp.com (`client_revision
1048557256`): "Encaminhar mensagem para", "Pesquisar nome ou número", "Conversas recentes",
  "Cancelar encaminhamento", "1 selecionada", "Enviar", "Encaminhar mídia", "Você só pode
  compartilhar com até {n} conversas.", "As mensagens encaminhadas com frequência podem ser
  compartilhadas com apenas 1 conversa por vez.", "Você pode enviar mensagens encaminhadas para
  apenas uma conversa em grupo por vez.", "Esta mensagem será marcada como encaminhada com
  frequência.", "Você encaminhou 1 item." (código do produto, não documentação — pode mudar).
- **Gateway (contrato real)**: `forward.service.ts`/`forward.decision.ts`/`send-intent.service.ts`/
  `logging-exception.filter.ts` + `test/conversas-encaminhar.e2e-spec.ts` — 5 formatos de corpo de
  erro (o 423 sem `statusCode`, com `state`); divergência na INTEGRACAO §2 corrigida.

## Log

- 05:53 — abertura, leitura obrigatória, decisões do dono (1 mensagem; contatos e grupos).
- 06:00 — mapeamento em paralelo (workflow, 5 agentes: painel, contrato real, doc oficial,
  fidelidade WhatsApp, plano de validação local).
- 06:01 — `lib/forward.ts` + spec (ida e volta com o gateway real); `ApiError` com `code`/`body`.
- 06:05 — **pedido novo do dono** (no chat): sugerir o proxy da sessão apagada ao recriar com o
  mesmo nome → levantamento somente leitura (1 agente) → **P-084** (abordagem A) e **E26** no roteiro.
- 06:05–06:14 — componentes (`MessageMenu`, `SelectionBar`, `ForwardDialog`, contexto), ligação no
  `ChatThread`/`MessageBubble`/Inbox/Atendimento; ajustes da pesquisa de fidelidade (textos oficiais,
  regra de 1 grupo, aviso "com frequência", atalho sem voz/figurinha, "pode ter saído" travado).
- 06:14–06:40 — **validação no Chrome** (Mac, seed local da E23 regravado, gateway local sem aparelho,
  login feito pelo dono): menu ⌄ com foco no item (APG), modo seleção e troca, diálogo com foco na
  busca, busca por número, **erro real ponta a ponta** (gateway local → 400 `FORWARD_FAILED` "Sessão
  não iniciada" com `results[]` → faixa "aparelho não conectado" + motivo por destino), repetição com
  a MESMA chave (conferido em `wa_send_intents`), simulador do `/forward` por `window.fetch` com 14
  cenários (ok, parcial, deduped, confirmed:false, timeout, 423, apagada, sem original, tipo, limite,
  404, 409 de conflito → chave nova, rede → mesma chave, Esc/clique fora), Atendimento (grupos no
  diálogo, caixa de resposta trocada pela barra, aparelho desligado trava o ➤). Achados da própria
  validação: recusa da mensagem precisa travar o ➤; "celular" repetido; limite vivo → 1 conversa;
  foco caía no `<body>`; **Chrome fecha o `<dialog>` à força num Esc repetido durante o envio** →
  resultado reaberto no fim se algo falhou.
- 06:20–06:37 — **revisão adversarial** (workflow: 6 lentes + 2 céticos por achado = 62 agentes): 28
  achados, **21 confirmados, todos tratados** — o principal: depois de desfecho incerto (sem resposta,
  502 no deploy start-first, 409 "em andamento") dava para mudar os destinos ou fechar/reabrir e o
  pedido saía com chave nova para quem já podia ter recebido → pedido **congelado** + memória por
  mensagem; mais foco (menu, saída da seleção), regiões vivas, nome acessível da seleção, 423 com o
  estado real, 404 que não é da mensagem, busca numérica pelo nome, espaço do ⌄ em tela de toque,
  faixa com `results[]` sem "Não encaminhada" por cima de "pode ter saído", 7 mutantes sobreviventes
  → testes novos.
- 06:40 — revalidação no Chrome do congelamento (clicar outro destino é barrado com a dica; fechar/
  reabrir retoma; "Tentar de novo" com a mesma chave) e do foco (Esc sai da seleção → caixa de
  resposta).

- 06:41–07:25 — **2ª revisão adversarial** só sobre as correções (workflow: 3 lentes + 2 céticos =
  33 agentes): 15 achados, 7 confirmados, todos tratados — a memória do diálogo saiu do `ChatThread`
  para `lib/forward-memory.ts` (por aba, `sessionStorage`, 24 h: sobrevive a troca de conversa/tela,
  recarga e login expirado; gravada ANTES da resposta e com o desfecho mesmo com a tela fechada;
  sucesso não visto fica guardado); o congelado só descongela com `results[]` (429/401/403 não);
  destino "em andamento" dentro de `results[]` trava como "pode ter saído" (repetir retomaria quem
  estourou o tempo — takeover no gateway); faixa resume todas as conversas do diálogo (não só o
  último pedido; sem "nenhuma das 1"); textos menos absolutos; 404 de rota ausente não vira recusa
  gravada; "Sessão não encontrada" com o nome do aparelho; foco (caixa de texto antes do 📎, conversa
  quando tudo está desabilitado, `preventScroll`), Esc e ↪ com o diálogo fechado à força. Provado no
  Chrome (troca de conversa → volta → mesma chave) e em jsdom com o `ForwardDialog` real (sair da
  tela durante o envio: sucesso → destinos travados; rede caiu → congelado, mesma chave e conjunto).
- 06:58 — observação fora do escopo: o painel local deslogou com dois `POST /api/auth/refresh`
  simultâneos ("Sessão expirada", 06:58:50) — é a corrida de várias abas descrita no MAPA-CODIGO §4.5
  ("lido no código, não reproduzido"); não investigado nesta etapa.

## Decisões e escolhas (D-031)

Detalhe em `docs/DECISOES.md` D-031. Resumo: 1 mensagem por encaminhamento e destinos = contatos e
grupos (dono); textos/regras do WhatsApp Web; o painel aplica "só 1 grupo quando já encaminhada"
(mais restritivo que a API — P-085); `idempotencyKey` por clique com travas, pedido congelado no
desfecho incerto e memória ao fechar/reabrir; `ApiError` com `code`/`body`; nada no gateway.

## Pendências abertas nesta sessão

- **P-084** — sugerir o proxy da sessão apagada ao recriar com o mesmo nome (pedido do dono no chat;
  levantamento somente leitura feito; abordagem A recomendada) → **E26** no roteiro.
- **P-085** — regra "encaminhada → só 1 grupo" também na API (decisão do dono; 400 novo para o n8n) +
  contador do Baileys sem teto (cópia de original com 4 sai com 5 — conferir no chip).
- Resíduos aceitos (D-031): a memória dos diálogos é por ABA e vale 24 h (outra aba, outro
  navegador ou dados do site apagados não enxergam as travas — um diálogo novo gera chave nova); a
  repetição com a MESMA chave de um pedido cujo destino estourou o tempo no gateway retoma esse
  destino (takeover da intenção `failed` — comportamento da E24; o painel trava o destino quando o
  `results[]` chega, mas não quando a resposta nunca chega); a mesma pessoa em dois chats (`@lid` e
  telefone) aparece duas vezes no diálogo e o gateway não detecta (2 cópias) — pré-existente da E24.

## Validação

- lint (o único erro é do `seed-mock.js` solto na raiz, não versionado — alheio) · format:check ·
  depcruise · tsc (gateway, painel, contracts) · `npm run test:unit` (gateway 471 + painel 180; suíte completa do gateway com infra: 752/752) ·
  `npm run dashboard:build` (variantes novas do Tailwind conferidas no CSS gerado) ·
  `node scripts/mapa-codigo.mjs --check`.
- Chrome (Mac) com gateway e painel locais, seed local: ver Log.
- Gateway sem mudança → e2e não rodados localmente (o CI roda a suíte inteira).

## Checkpoint (R9 v4.3)

- **Entregue:** encaminhar no painel (Inbox e Atendimento) fiel ao WhatsApp Web — commits `06d4ac1`
  (feat) e `f6d0116` (correções das 2 revisões adversariais) + o commit de docs deste encerramento.
- **Onde parou:** Onda 8 completa no PR #7 (E22–E25). Nada em produção (produção segue em `768fb26`;
  deploy A e deploy G pendentes).
- **Próxima etapa:** **E5** (Onda 6 — wwebjs pronto para uso; prazo da build: 13/10) — partir da main
  se o PR #7 já tiver sido mergeado, senão de `feature/onda8-conversas`. Depois: **E26** (P-084).
- **BLOQUEADO EM VOCÊ:**
  1. Deploy G = merge do PR #7 + Deploy manual dos 2 apps — `how-to/deploy-g-onda8.md` (de preferência
     depois do deploy A; antes: fluxos n8n pela INTEGRACAO §3.2, conferência no Safari, cópia do
     banco — B-005 segue aberto).
  2. Teste com chip do encaminhar (API e painel) — `how-to/teste-chip-encaminhar.md` §2–§4.
  3. Decidir P-085 (regra "encaminhada → só 1 grupo" também na API) — e seguem abertas P-080/P-081.
  4. Deploy A (Onda 1) e B-004..B-007 continuam com você (sem mudança nesta etapa).
- **DOCS TOCADAS:** `docs/INTEGRACAO.md` §2 (correção: recusas da engine e 423 com `results`; `state`
  no 423), `docs/DECISOES.md` (D-031), `docs/PENDENCIAS.md` (P-068 ✅ interface; P-084, P-085),
  `docs/MAPA-CODIGO.md` (§3.12 passo 9, §4.5 arquivos/invariantes/testes, "Onde mexer" P-068/P-084/
  P-085) + `docs/reference/mapa-codigo/` regenerado, `docs/ROTEIRO-ONDAS-2026-09.md` (E25 ✅, E26,
  mensagem da E5 ajustada, diário, ações do dono), `docs/ESTADO.md`, `docs/SESSOES.md` (aviso +
  histórico), `CHANGELOG.md`, `docs/how-to/deploy-g-onda8.md` (novo), `docs/how-to/teste-chip-
encaminhar.md` (§4 pelo painel).
- **Reconciliação documental (R3):** o diff não mexe no gateway nem no contrato — a única afirmação
  que ficou falsa era a da INTEGRACAO §2 sobre recusas "sem `results`" (divergência da E24, corrigida);
  MAPA-CODIGO §4.5 dizia "118 its" no painel (atualizado) e que o `parseError` descarta o `code`
  (agora lê — anotado no invariante do encaminhar).

## CI do PR #7 (26/09)

- `943b6ed` (feat `06d4ac1` + fix `f6d0116` + docs): **ci** ✅ (3m04s — run 36234576550), **imagens** ✅
  (2m26s — build dos 2 Dockerfiles + boot do gateway), **advisories** ✅ (run 36234576539). PR #7
  pronto para o merge do dono (deploy G — `how-to/deploy-g-onda8.md`).
