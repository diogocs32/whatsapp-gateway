# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

### Corrigido — mídia recebida no Baileys (26/09 — E10/P-050/P-075; PR #11, sem deploy)

- Download recebido tem espera total de 90 s, inclusive reupload e segunda tentativa; falha publica o evento com metadados sem `mediaKey`. Um dispatcher Undici 8.10.2 por mídia usa o mesmo proxy HTTP/HTTPS escolhido para o socket e é destruído ao concluir/expirar. Em SOCKS, a CDN não é buscada diretamente e o evento fica só com metadados até prova do caminho pelo proxy.
- HTTP 404/410 da CDN aciona `sock.updateMediaMessage` com espera de até 20 s e um novo download. Vídeo redondo `ptvMessage` é adaptado para o reupload sem perder o `raw` original. `fetchAgent` permanece no upload. Testes locais usam rc14, fetch/socket falsos e proxy HTTP local; canário real aguarda E12 e ordem do dono. A espera interna sem cancelamento da rc14 está na P-087.

### Alterado — desconexões e versão do Baileys (26/09 — E9/P-049; PR #11, sem deploy)

- Desconexões 401/403/405/408/411/428/440/500/503/515 agora seguem uma matriz explícita: 403/411/405 param em FAILED, 405 publica `session.client_too_old`, 515 reinicia sem consumir o orçamento comum (com teto separado para repetição) e 440 faz uma tentativa após 60 s sem gravar estado terminal. Quedas transitórias não deixam a engine local aceitar envios no socket fechado.
- `GET /sessions` e `GET /sessions/:id` acrescentam `lastErrorDetails: {code,reason}` persistido; `lastError` textual permanece. `session.status` terminal acrescenta o detalhe e `/metrics` oferece `wa_disconnects_total{engine,code}` desde o boot.
- A consulta de versão tem espera de 3 s, single-flight e intervalo mínimo de 30 s; só resposta `isLatest:true` renova o cache de 12 h. Cada conexão registra a versão efetiva. Um par de envs permite sobrepor a versão apenas para o ID de uma sessão canário. Migration aditiva aplicada apenas no banco local de testes. Testes usam socket falso e preservam a pausa provisória da E8.

### Adicionado — pausa temporária por restrição nativa do Baileys (26/09 — E8/P-048; PR #11, sem deploy)

- `reachoutTimeLock`, `message-capping.update` CAPPED e ACK ERROR 463 agora gravam o sinal e pausam todos os envios da sessão pelo prazo disponível; `fetchAccountReachoutTimelock()` tem espera limitada a 3 s e intervalo mínimo de 30 s. A espera não cancela o RPC: uma resposta tardia ainda confirma o prazo se o socket e a consulta forem atuais. ERROR 479 é contado sem classificar a sessão como banida.
- A trava sobrevive a restart por migration aditiva em `session_guardrail`, responde HTTP 423 no contrato já usado pelo n8n e libera o próximo envio após o prazo, sem ação manual. Campanhas aguardam e re-agendam; ACK ERROR passa a persistir como `error`.
- Evento aditivo `session.restricted` com prazo, fonte e tipo de enforcement em `packages/contracts` e `INTEGRACAO`. A notificação rc14 não distingue prazo enviado pelo servidor de `Date` fabricado como agora + 60 s: seu prazo válido é preservado como `source: temporary`, inclusive se superar 60 s; capping mais curto não o reduz. Só a resposta direta do RPC confirma `timeEnforcementEnds`; sem prazo válido, o fallback é 60 s. Um alerta provisório pode ser seguido de atualização confirmada e do eco provisório do RPC. Testes unit e e2e com socket falso cobrem pausa, alerta, retomada e envios normais; canário fica para a janela posterior à E12.

### Alterado — Baileys recupera mensagens recebidas na fila offline (26/09 — E7/P-047; PR #11, sem deploy)

- `messages.upsert` `append` recebido durante queda/reconexão/deploy entra no mesmo fluxo de banco, webhook, Inbox e reply-rate do `notify`, limitado a 48 h. Eco de envio próprio, status e newsletter são filtrados por mensagem.
- Dedupe por `sessionId` + `keyId` antes do evento, em cache e por consulta ao banco após restart. `describeBaileysMessage`, reação separada, autor de grupo e `raw` inbound foram preservados. Sem migration ou campo público novo; `INTEGRACAO` §3.2 documenta o horário original da mensagem.
- Testes de efeito e runbook do canário da Onda 2; duas instâncias simultâneas e outbox seguem P-056/B-004 e P-034. PR #11 depende do PR #10 ainda aberto. Nenhum merge/deploy da Onda 2 nesta etapa.

### Alterado — wwebjs com perfil de mídia e memória leve (26/09 — E6/P-060, D-033; sem deploy)

- Download recebido por stream de 2 MB, fila por sessão e 24 MB de teto de envio WWEBJS; mídia de grupo só baixa automaticamente com opt-in explícito. Sem opt-in, webhook mantém metadados e não inclui `mediaKey`.
- `ready` evita varredura de agenda repetida após heal; patch da lib impede injeção concorrente no `onAppStateHasSyncedEvent`; falha/teto de destroy encerra a árvore do Chromium por PID; flags revistas e perfil JSHeap/PSS/IndexedDB por sessão nos logs.
- Medição local isolada sem conta e roteiro do canário ampliado. Compatibilidade de vídeo, PSS com conta e comportamento real de download em grupo dependem do canário do dono após deploy W.

### Adicionado — wwebjs pronto para canário isolado (26/09 — sessão `e5-wwebjs-pronto`, etapa E5, P-059/P-073 — **PR #8 mergeado na `main`, deploy W pendente; E6 ainda aberta**; D-032)

- Patch da `whatsapp-web.js@1.34.7` cobre a colisão `__x_id` da mídia, fallback WID/MsgKey, contador de chats descartados e validação da versão no cache local. O default continua na última build validada; a candidata `2.3000.1046934385-alpha` fica disponível por sessão para canário no próximo start.
- `PATCH/GET /api/sessions/:id/config` expõe `wwebjsWebVersion` nullable (migration aditiva); logs informam build pedida/efetiva e Chromium. LOGOUT/UNPAIRED/CONFLICT param sem novo QR automático; bloqueios TOS falham com código; pairing e recargas automáticas têm teto.
- Teste instável da P-073 usa cliente falso sem abrir Chromium; 483 unit do gateway, 281 e2e locais e 180 testes do painel passaram. Runbook do canário em `docs/how-to/canario-wwebjs-onda6.md`. P-086 registra o link público temporário para conexão por QR como trabalho futuro.

### Adicionado — encaminhar no painel, fiel ao WhatsApp Web (26/09 — sessão `e25-encaminhar-painel`, etapa E25, P-068 parte interface — **fecha a Onda 8; PR #7, sobe no deploy G**; ver `docs/sessions/DONE-2026-09-26-0553-e25-encaminhar-painel.md`, D-031)

- **Fluxo do WhatsApp Web no Inbox e no Atendimento:** menu **⌄** no balão (aparece no hover/foco; sem mouse, sempre) → **Encaminhar** → modo seleção (1 mensagem por vez — decisão do dono; "Cancelar encaminhamento", "1 selecionada") → diálogo **"Encaminhar mensagem para"** com "Pesquisar nome ou número" (sem acento; dígitos acham número ou nome) e "Conversas recentes" da MESMA sessão (contatos **e grupos**) → ➤ **Enviar**. Atalho **↪ "Encaminhar mídia"** ao lado de foto, vídeo, documento, localização e contato (direto ao diálogo). A ação some nos tipos que o gateway recusa (enquete, evento, convite, voto, `other`).
- **Limites e textos do WhatsApp:** até 5 conversas; 1 quando a original é "encaminhada com frequência" (também quando o servidor descobre pelo contador vivo); **só 1 grupo** quando a original já veio encaminhada (regra da FAQ — a API ainda não tem, P-085); aviso "Esta mensagem será marcada como encaminhada com frequência."; o mesmo número com/sem o 9º dígito não pode ser marcado duas vezes.
- **Resultado por destino** a partir de `results[]`: enviada, já tinha sido (repetição), **confirmação pendente** (WWEBJS `confirmed:false` — "não reenvie"), **pode ter saído** (tempo esgotado — "confira no celular") e falha com o motivo; tudo certo → o diálogo fecha e a conversa avisa "Você encaminhou 1 item para …". Textos de operador para 400 com `code` (apagada/editada/visualização única/tipo/original indisponível → "encaminhe pelo celular", o ➤ trava), 404, 409, 423 (com o estado do guard-rail e os destinos de 1º contato — tirá-los libera o resto) e aparelho desconectado.
- **Sem reenvio duplicado:** `idempotencyKey` por clique (mesmo conjunto → mesma chave; o gateway faz replay); quem saiu/pode ter saído fica travado; desfecho incerto (sem resposta, 5xx, "em andamento") congela o pedido até repeti-lo igual; fechar e reabrir retoma o estado — memória por aba que sobrevive a troca de conversa/tela, recarga e login expirado; um encaminhamento por vez por conversa.
- **Acessibilidade:** menu button do APG (Enter/↓/Esc/Tab/setas, foco devolvido), `<dialog>` modal com foco na busca, Esc e clique fora (o `closedby` não existe no Safari estável), checkboxes nativos em grupo rotulado, seleção com nome acessível que inclui o conteúdo, regiões `role=status` sempre montadas, foco que nunca cai no `<body>`.
- **Cliente HTTP:** `ApiError` passa a levar `code` e o corpo (aditivo) e `api.sessions.forward`.
- **Docs:** INTEGRACAO §2 corrigida (recusas descobertas na engine e o 423 vêm **com** `results`; o 423 traz `state` e não traz `statusCode`); runbook do deploy G (`docs/how-to/deploy-g-onda8.md`); teste com chip ganhou a §4 "pelo painel"; P-084 (sugerir o proxy da sessão apagada — pedido do dono) e P-085 registradas.
- **Testes:** `lib/forward.spec.ts` (espelho conferido contra o `forward.decision.ts`/`engine.port.ts` reais), `lib/forward-memory.spec.ts` e `lib/api.spec.ts` — painel 180 testes; validação no Chrome com seed local e gateway local (erro real ponta a ponta + 14 cenários simulados); 2 revisões adversariais (1ª: 62 agentes, 21 achados confirmados; 2ª, só sobre as correções: 15 achados — todos tratados).

### Adicionado — encaminhar mensagem fiel ao WhatsApp Web, parte API/engines (26/09 — sessão `e24-encaminhar-api`, etapa E24, P-068 parte API + P-077 — **PR #7 da Onda 8, sobe no deploy G**; ver `docs/sessions/DONE-2026-09-26-0152-e24-encaminhar-api.md` e D-030)

- **Rota aditiva** `POST /api/sessions/:s/messages/:msgId/forward` `{to[] (1–5), cold?, idempotencyKey?}` → 201 `{results[]}` (uma posição por destino): a cópia chega com o selo "Encaminhada" (mídia reaproveitada, sem novo upload) e sem a citação/menções da original. Limites do dono: até 5 destinos; 1 só se a original já é "encaminhada com frequência" (score ≥ 5); só a mesma sessão; destino SEM conversa (nenhuma mensagem recebida dele no número exato) vira cold à força → sessão bloqueada = 423 no pedido inteiro, nada sai; `idempotencyKey` reserva o PEDIDO (outra mensagem/outro conjunto → 409) e cada destino usa `<chave>:<destino>`; um destino por vez com 1–3 s entre envios (também entre pedidos da mesma sessão). Recusas antes de enviar com `code`: `FORWARD_UNSUPPORTED` (apagada, editada, visualização única, temporária vencida, enquete, evento, convite, localização em tempo real, botões/empresa, lottie no Baileys), `FORWARD_SOURCE_UNAVAILABLE` (original indisponível), `FORWARD_LIMIT`. Contratos `ForwardMessageRequest`/`ForwardResultDto`; INTEGRACAO §2, §3.2, §13; D-030.
- **Baileys:** `sendMessage({forward})` com SÓ o nó de conteúdo — o `generateForwardMessageContent` da rc14 escolhe o nó por `Object.keys(content)[0]` e, com `messageContextInfo`/SKDM de grupo na frente, perdia o selo e vazava a citação da original (provado offline). A original das RECEBIDAS passa a ser guardada em `wa_messages.raw` (retenção de 7 dias; webhook, SSE e agora o fan-out do Redis a removem; as listagens a deixam de fora); sem ela, texto remonta fiel e o resto é recusado. `decodeProto` com `proto.Message.fromObject` (sem ele, enum ≠ 0 virava 0 — vale também para o retry de descriptografia). Marcas `revokedAt`/`editedAt` pelo `messages.update` REVOKE/EDIT (migration aditiva `20260926052719_encaminhar_marcas_apagada_editada`, só do mesmo lado, sem engolir ACK fundido). Eco pelo que de fato saiu, com o objeto S3 da original.
- **wwebjs:** caminho nativo `Message.forward` (o do botão "Encaminhar" do WhatsApp Web). Como a lib não devolve o id, o eco `message_create` é correlacionado (destino — inclusive o `@lid` do cache local — + tipo + texto/legenda) ANTES da janela de 3 s e sai `source:'api'` com o cold/chave do destino (antes viraria `phone` = handoff falso); o op do fallback de LID devolve o destino (o `undefined` do forward fazia reenviar pelo PN — encaminhar 2×); teto de 30 s no forward; sem eco em 10 s → `confirmed:false`, sem id.
- **P-077:** ecos de localização e enquete enviadas pela API trazem o mesmo texto das recebidas (link do mapa; `• opções`) — **muda o `text` do webhook desses ecos** (INTEGRACAO §3.2).
- **Correções de carona:** texto, nome de arquivo, mimetype e `raw` com `\u0000` ou surrogate UTF-16 solto derrubavam o INSERT e a mensagem sumia (PG: `text`/`jsonb` recusam) — limpos na gravação.
- **Testes:** `forward.decision.spec.ts` (40+), `baileys.forward.spec.ts` (64, lib real), `wwebjs.forward.spec.ts` (62) e e2e `conversas-encaminhar.e2e-spec.ts` (56 — matriz HTTP, idempotência do lote, 423, ritmo/mutex, efeito pelo EventBus e cadeia com o `BaileysEngine` real). Mapeamento (19 agentes), 4 escritores de teste (7 bugs achados, corrigidos) e revisão adversarial (62 agentes: 15 confirmados + 5 divididos, todos tratados). Gateway 471 unit + 281 e2e; painel 122. Roteiro do teste com chip: `docs/how-to/teste-chip-encaminhar.md`.

### Adicionado — conversas fiéis ao WhatsApp Web, parte painel (25/09 — sessão `e23-conversas-painel`, etapa E23, P-067 + P-072 parte painel + P-074 — **PR da Onda 8, sobe no deploy G**; ver `docs/sessions/DONE-2026-09-25-2120-e23-conversas-painel.md` e D-029)

- **Balões compartilhados** (P-067): `components/chat/{ChatThread,MessageBubble,MediaView,Ticks,Reactions,ForwardedTag}` no Inbox e na aba Conversa do Atendimento — nome do participante em grupo, selo "↪ Encaminhada"/"↪↪ Encaminhada com frequência", cartões de localização (link do mapa reconstruído dos números), contato, enquete, evento e convite, texto multilinha, hora `HH:mm` + "aparelho" + tique, pílula de reações; prévia da lista e do Fluxo ao vivo **sem "…"** (tipo desconhecido/legado = "Mensagem não suportada — veja no celular"; legado do wwebjs: vCard cru vira contato, miniatura base64 some). Helpers antes duplicados em `lib/{jid,time-format,message-format}.ts`.
- **Mídia pelo gateway como blob** (P-067, D-029): `GET …/messages/:id/media` com cookie + silent refresh → object URL em cache por mensagem (`lib/media-cache.ts`: ref-count, liberação adiada 30 s por causa do StrictMode, LRU de 200 MB, fila de 3, 404 permanente, 429 = pausa de 60 s). Imagem ao aparecer na tela, áudio/vídeo/documento no clique; lightbox em `<dialog>` modal; "Baixar" quando o navegador não toca o formato. Fim da URL pré-assinada que mudava a cada 2,5 s (o `<audio>` recarregava) e do `<img>` barrado pelo CORP. Documento, SVG e mimetype composto/malformado viram `application/octet-stream` (nunca executam na origem do painel).
- **Tiques ✓/✓✓ e reações ao vivo** (P-072, só exibição): tique só em mensagem enviada, nunca em grupo/transmissão/canal nem sem confirmação; o Atendimento ouve `message.ack`/`message.reaction` no SSE, casando por `(sessionId, keyId)`, sem regredir, com memória reaplicada sobre cada recarga; SSE recriado depois de fechar de vez (401 após 15 min, 429, 502) e conversa aberta relida a cada 5 s enquanto o stream está fora; Fluxo ao vivo não perde o item recém-chegado quando um GET antigo volta; filtro de aparelho não volta ao anterior.
- **Rolagem e layout:** a conversa só vai ao fim quando chega mensagem nova e o operador já estava perto do fim (o polling de 2,5 s do Inbox puxava a tela para baixo); o envio do próprio operador leva ao fim; o Atendimento passou a ter altura de janela (o painel da conversa rola por dentro). Balão de saída `emerald-800` (contraste 7,6:1; o `emerald-600` reprovava o WCAG).
- **Remetente de grupo** (P-074, D-029): `senderJid` de mensagem RECEBIDA em grupo = o participante nas duas engines (Baileys: lado telefone primeiro, par LID↔telefone e pushName no diretório; wwebjs: `msg.author`, `@lid` só pelo cache, sem consulta de rede — também no backfill). `senderName` aditivo no `GET /messages`/`/search` (agenda > pushName). **Muda o valor do `senderJid` no webhook `message` em grupo** — INTEGRACAO §3.2 item 9.
- **Correção:** `GET …/media` de documento com nome fora do Latin-1 (travessão, aspas curvas, emoji) respondia **500** (`ERR_INVALID_CHAR`) → `filename` ASCII + `filename*` UTF-8; nomes Latin-1 sem `%` `\` `;` `=` saem idênticos (P-076); mimetype do remetente que não cabe num header (também 500) cai no tipo do S3. INTEGRACAO §3.1 documenta também o 503.
- **Correções depois da conferência do dono (26/09):** no Atendimento a LINHA inteira da conversa passou a abrir a conversa (só o nome/prévia era clicável — o clique na faixa do "🟡 não preciso responder" ou na margem se perdia, com o fundo acendendo na linha toda; pré-existente desde 15/09); o erro do "Enviar" aparece junto da caixa de resposta e em linguagem de operador (antes ficava no topo da página e parecia que nada acontecia); a caixa de resposta fica travada, com aviso, quando o aparelho da conversa está desligado/sem conexão; o botão Enviar desabilitado ficou cinza com dica (parecia um botão ativo). `lib/send-feedback.ts` + spec. Cursor de mãozinha em todo botão e seletor habilitado do painel (o preflight do Tailwind 4 deixa `cursor: default` em botão — receita oficial do upgrade guide em `index.css`).
- **Testes/CI:** vitest no painel (devDependency `^4.1.11`, já instalado — lockfile +1 linha) com passo próprio no CI; 118 testes em `apps/dashboard/src/lib/*.spec.ts` (ida e volta com o `message-content.ts` e espelho do `reaction-key.ts` do gateway por import dinâmico), 17 mutantes manuais mortos; gateway com testes novos das engines (modos LID/PN do rc14), `content-disposition.spec.ts` e e2e `conversas-grupo` + casos no `media`. Scripts raiz `test`/`test:unit` rodam também o painel.

### Adicionado — conversas fiéis ao WhatsApp Web, parte gateway (25/09 — sessão `e22-conversas-gateway`, etapa E22, P-066 + P-072 parte gateway — **abre a Onda 8; PR da Onda 8, sobe no deploy G**; ver `docs/sessions/DONE-2026-09-25-1727-e22-conversas-gateway.md` e D-028)

- **Conteúdo fiel nas duas engines** (P-066): funções puras `describeBaileysMessage` (`baileys-content.ts`) e `describeWwebjsMessage` (`wwebjs-content.ts`), com formatadores comuns (`message-content.ts`). Tipos novos no lugar de `other`/"…": `location` (nome — endereço + link do mapa), `contact` (nome — telefones), `poll` (pergunta + opções), `event`, `group_invite`, `poll_vote` (voto do contato, Baileys); respostas de botão/lista/fluxo viram `text`; vídeo redondo = `video`; figurinha animada (lottie) = `sticker` com download do conteúdo desembrulhado; produto/pedido/pagamento = `other` com resumo. Ignorados: reação, fixar/manter, álbum-mãe, protocolo/chaves, resposta a evento, sistema e ligação (wwebjs). No wwebjs a mídia é decidida pelo `type` (mídia sem `directPath` não vira mais texto com o `body` cru; tipo sem cartão de mídia COM arquivo continua baixado como documento) e o tipo de sistema sai antes da espera de 3 s (sem handoff falso); o backfill usa a mesma descrição.
- **Reações em tabela própria** (P-066, D-028): `wa_message_reactions` (migration aditiva `20260925203458_reacoes_encaminhada`), `ReactionPersister` (troca substitui, remoção = lápide `emoji=''` com guarda de horário; `@lid`×telefone e sufixo de aparelho não duplicam). A reação **sai do evento `message`** (fica só `message.reaction`): não põe mais a conversa em 🔴, não conta como mensagem e não pausa a IA quando o dono reage pelo celular. `GET /messages` e `/search` trazem `reactions[]` (uma consulta por página, por keyId).
- **Reply-rate conta reação do contato** (D-028), no mesmo deploy: ao próprio cold (keyId), no mesmo chat depois do cold, e a follow-up do chat (keyId — pega `@lid` não resolvido); teto por `LEAST(timestamp, createdAt)` quando a linha nasceu depois do cold (senão, a última mudança). Fixar/manter, resposta a evento e ligação (wwebjs) deixam de contar (eram `other`). Retenção das reações com `RETENTION_MESSAGES_DAYS`.
- **Selo "Encaminhada"** (P-066): `wa_messages.isForwarded`/`forwardingScore` (aditivos), no webhook `message`, no `GET /messages` e no feed; "com frequência" = score ≥ 5 (FAQ oficial).
- **Caixa única** (P-072, só exibição): `status` (ACK da enviada) aditivo no `GET /api/inbox/messages`. Achados para a E23 registrados na P-072 (grupo no Baileys sem ACK; recibo `read-self` marca entrada como `read`).
- **Correções:** remetente da reação em grupo (Baileys) era o autor da mensagem-alvo (e `""` em 1:1) → quem reagiu, pelo lado telefone do par endereço/`*Alt` (em modo PN o `*Alt` é o `@lid`), aprendendo o par `@lid`↔telefone da própria reação; `chatJid` da reação normalizado `@lid`→telefone como as mensagens; o merge LID→telefone das duas engines também reescreve as reações; reação do wwebjs com chave-alvo em `$1` (builds ≥ 2.3000.104x) ou `remote` como Wid deixava de ser descartada/lançar; timestamp da reação do wwebjs arredondado para segundos.
- **Contratos** (aditivos): `MessageDto.isForwarded/forwardingScore/reactions` + `MessageReactionDto`, `InboxFeedItemDto.status/isForwarded/forwardingScore`, `WEBHOOK_EVENTS` com `message.ack` e `message.reaction` (o painel passa a oferecer). INTEGRACAO §3 (tabela de tipos, lista do que conferir nos fluxos n8n — inclusive como voltar a receber reação com o Trigger 0.4.1 sem quebrar o fluxo; payload real do `message.ack` corrigido), §4, §12 e §13; nota de rollback do deploy G em `how-to/rollback-gateway.md`.
- **Testes:** unit sem infra — `baileys-content.spec.ts` (fixtures pelo caminho do fio encode→decode), `baileys.inbound.spec.ts` e `wwebjs.inbound.spec.ts` (engines com a lib real e socket/cliente falso: reação fora do `message`, modo PN/LID, lottie, sistema do celular, `$1`, backfill), `wwebjs-content.spec.ts`, `message-content.spec.ts`, `reaction-key.spec.ts`; e2e de efeito `conversas-reacoes.e2e-spec.ts` (grava/troca/remove, fora de ordem determinístico, LID nos dois sentidos, grupo, encaminhada, reply-rate com 11 casos — 2 pelo EventBus —, retenção, feed). Os de efeito falham com o código antigo (7/11 no e2e, 7/7 na engine; mutantes do lottie e do teto do reply-rate mortos). Revisão adversarial (5 lentes + 2 céticos por achado, 37 agentes): 15 achados confirmados, todos tratados. 477/477.

### Segurança — borda HTTP pela rota resolvida e egress IPv6 (25/09 — sessão `e4-rotas-egress`, etapa E4, P-053/P-065/P-070/P-071 — **fecha a Onda 1; aguarda merge do dono = deploy A**; ver `docs/sessions/DONE-2026-09-25-1443-e4-rotas-egress.md` e `docs/how-to/deploy-a-onda1.md`)

- **Teto do login preso à rota** (P-053, D-025): `@RouteConfig({ rateLimit: { max: 10, timeWindow: '1 minute' } })` no `AuthController.signIn` — forma absoluta (`POST http://host/api/auth/login`) e %-encoding (`/api/auth/%6Cogin`, `/%61pi/…`) caíam no teto global de 600/min (10 de 13 variantes medidas furavam). O login ganha contador próprio: o tráfego do mesmo IP não o esgota mais. `/health` isento pela rota (inclusive `?x`, `HEAD` e forma absoluta). Registro único em `bootstrap/rate-limit.ts`.
- **Request-log pela rota:** a rota resolvida é carimbada no request cru (`bootstrap/route-url.ts`, hook no `buildFastifyAdapter`) e o `customLogLevel` (opções extraídas para `bootstrap/http-logger.ts`) silencia `/health` e `/metrics` exceto 5xx/erro — o `autoLogging.ignore` antigo era código morto (o middleware via `req.url` `'/'`). O 503 do `/health` continua em `error`.
- **Auditoria pela rota:** o `AuditInterceptor` decide QUEM audita por `routeOptions.url`; mutações em `/%61pi/…`, forma absoluta e sessões com nome começando por `messages` passam a entrar na trilha. A coluna `path` segue o alvo cru (sem query), com teto de 512 caracteres.
- **Egress com `net.BlockList`** (P-065, D-026): `http://[::ffff:127.0.0.1]/` (o URL normaliza para `::ffff:7f00:1`) chegava ao loopback — reproduzido no macOS e no Linux. Agora faixas especiais da IANA (v4 + TEST-NETs e `192.88.99.0/24`) e IPv6 só no unicast global `2000::/3` (sem `2001::/23`, `2001:db8::/32`, `2002::/16`, `3fff::/20`; `::/8` sem `::ffff:0:0/96`). Guarda no spec contra a regra que bloquearia todo IPv4.
- **Fotos por URL com política de egress** (P-070): `POST …/groups/{g}/photo` e `POST …/profile/photo` usavam `fetch` cru (loopback/metadata passavam; corpo inteiro na memória) → `fetchImageByUrl` (egress, 3 redirects validados, teto de 10 MB em fluxo; 400 `URL da imagem recusada`).
- **Alvo ambíguo recusado** (P-071): forma absoluta com `?`/`#` antes do caminho (`POST http://h?x=/api/…`) → 400 na borda — o router casava a rota da query enquanto middie/Nest resolviam `/` (mutação sem log, auditoria só com o host).
- **Testes/CI:** `rate-limit.spec.ts`, `http-logger.spec.ts`, `audit.interceptor.spec.ts` (socket cru), `test/audit.e2e-spec.ts`, casos novos em `safe-fetch.spec.ts`, `f5` e `webhooks`; smoke no job `imagens` (10 logins em 4 grafias → 401, 11º → 429). Todos falham com o código antigo. 360/360.

### Segurança — patches sem major e checagem de advisories de repositório (25/09 — sessão `e3-patches-seguranca`, etapa E3, P-054 — **aguarda merge do dono no fim da Onda 1 = deploy A**; ver `docs/sessions/DONE-2026-09-25-1053-e3-patches-seguranca.md`)

- **NestJS 11.2.6** (`core`, `common`, `platform-fastify`, `testing` — exatos): corrige o GHSA-9c5c-9qcx-q35q (high, invisível ao `npm audit`): middleware com escopo de rota era pulado com alvo em forma absoluta (`GET http://host/…`). No gateway o único middleware é o pino-http, então o efeito era request sem linha de log; os guards não eram afetados. O adapter passa a usar o `@fastify/middie` 9.3.4 oficial. Spec de regressão `fastify-adapter.absolute-form.spec.ts` (falha na 11.2.3). fastify segue 5.11.3 (pin exato do Nest 11).
- **`@fastify/multipart` 10.1.2** + **`POST …/messages/media` lê o corpo inteiro antes de enviar:** 2+ arquivos → **413** `reach files limit` sem enviar nada (na 10.1.1 era 500 `Premature close`, que ainda travava a conexão keep-alive seguinte; com a 10.1.2 e o código antigo virava 201 com o 2º arquivo descartado calado). Campos de texto agora valem em qualquer ordem; campo com nome reservado → 400. Contrato documentado na `INTEGRACAO.md` (D-024).
- **`bullmq` 5.81.5:** o Worker volta a consumir quando o comando bloqueante reenviado pelo ioredis fica sem resposta (conexão half-open) — a 5.81.4 parava em silêncio (reproduzido em laboratório). Restart e quedas de 30/70 s do Redis provados no gateway real em dev.
- **Transitivos com advisory de repositório** (achados pela checagem nova, sem major): `@fastify/proxy-addr` 5.1.1 (GHSA-8cmm, critical — latente com `trustProxy: true`), `@fastify/busboy` 3.2.2 (GHSA-gxm5), `fast-uri` 4.2.1/3.1.8 (GHSA-hrr3, GHSA-jvvf).
- **`protobufjs` 7.6.6** (transitivo do Baileys; hardening do `Reader.uint32`, sem advisory — diferencial com WAProto/libsignal reais sem diferença de resultado). `allowScripts`: `protobufjs@7.6.6` — o campo é lido pelo npm ≥ 11.16 do CI/Docker.
- **Node do gateway fixado em `node:26.10.0-bookworm-slim`** (antes a tag móvel `node:26-bookworm-slim` + build sem `--pull` deixavam o Node — e o undici EMBUTIDO que o `fetch`/safe-fetch usa — ao acaso do cache; Node < 26.8.2 traz undici < 8.10.2 — até 11 advisories de repositório de nodejs/undici de 04/09 no 26.8.0/26.8.1 e, em Node 26 mais antigo, também os de junho/julho: 22 no 26.0.0). A checagem de advisories avalia o undici do Node fixado no `FROM`. Digest fica para a P-062.
- **Log sem erro falso:** 4xx estilo http-errors (ex.: `FST_FILES_LIMIT`) deixa de gerar `ERROR [ExceptionsHandler]` com stack; resposta idêntica, fica só o warn do `LoggingExceptionFilter`.
- **Checagem diária de advisories de REPOSITÓRIO** (o `npm audit` só vê o banco global): `scripts/checar-advisories.mjs` + `scripts/checar-advisories.config.json` + workflow `.github/workflows/advisories.yml` (cron diário, `workflow_dispatch`, informativo em PR, `permissions: contents: read`) + [docs/how-to/checar-advisories.md](docs/how-to/checar-advisories.md). Cobre nestjs/nest, fastify/\*, Baileys, wwebjs, protobufjs, bullmq/ioredis, demais dependências diretas, o undici embutido no Node fixado no Dockerfile + releases de segurança do Node (`nodejs.org/dist/index.json`) e a infra (Traefik, Dokploy, Redis, MinIO fork). Falha só com advisory sem aceite datado (D-023).

### Adicionado — guardas de build (25/09 — sessão `e2-guardas-build`, etapa E2, P-055 — **aguarda merge do dono no fim da Onda 1 = deploy A**; ver `docs/sessions/DONE-2026-09-25-0915-e2-guardas-build.md`)

Pré-requisito do stop-first (B-004): com stop-first não há container antigo segurando a API, então imagem quebrada precisa falhar no BUILD.

- **`patch-package --error-on-fail`** no postinstall: fora de CI (build do Dokploy) um patch que não aplicava saía com código 0 e a imagem subia com o whatsapp-web.js sem o fix `$1`.
- **`scripts/guardas-build.sh`** (`patches` · `dist` · `deps` · `prisma`) + **`scripts/verificar-deps-runtime.cjs`**, rodando no `apps/gateway/Dockerfile` (depois do `npm ci`, depois do build e na imagem final) e no CI: patch do wwebjs aplicado, `dist/main.js` gerado, todo pacote que o dist usa resolve **e carrega** no `node_modules` final (pega o `Cannot find module 'zod'` de 16/08 e dependência transitiva) e `prisma validate` com o CLI/config do entrypoint.
- **CI — job `imagens`:** `docker build` das imagens do dashboard e do gateway (os mesmos Dockerfiles do Dokploy) + boot real do gateway contra Postgres/Redis/MinIO até o `/health` voltar ok com banco, Redis e storage.
- **Dashboard:** o Dockerfile deixa de copiar `patches/` (o `npm ci` dele não instala o wwebjs; com a flag nova o build quebraria — achado da revisão adversarial).
- **Runbook** [docs/how-to/rollback-gateway.md](docs/how-to/rollback-gateway.md): rollback por registry do Dokploy × `git revert`, com tempos medidos (build local 122 s sem cache / 48 s com cache; `/health` ok ~2 s após o start).
- Provas locais: patch corrompido, `patches/` vazio, `zod`, `sonic-boom` e `dotenv` removidos — todos derrubam o `docker build`; caminho normal passa.

### Documentação / ferramentas (25/09 — sessão `onda0b-mapa-roteiro` — doc-only, SEM deploy; ver `docs/sessions/DONE-2026-09-25-0700-onda0b-mapa-roteiro.md`)

- **Mapa do código:** `scripts/mapa-codigo.mjs` gera, com o compilador do TypeScript (type-checker), o inventário de todas as funções/métodos com linha, injeção de dependência, chamadas resolvidas ("chama"/"chamado por"), implementações da `IEngine`, rotas HTTP, filas BullMQ e jobId montado nos chamadores, eventos do EventBus, acesso Prisma por modelo, variáveis de ambiente e títulos de testes → `docs/reference/mapa-codigo/` (`--check` compara byte a byte). Camada de relações verificada adversarialmente em [docs/MAPA-CODIGO.md](docs/MAPA-CODIGO.md): fluxos ponta a ponta, áreas, "onde mexer por pendência" e divergências doc × código.
- **Roteiro de execução** [docs/ROTEIRO-ONDAS-2026-09.md](docs/ROTEIRO-ONDAS-2026-09.md): etapas E1–E21 (1 etapa = 1 chat), regras comuns, mensagens prontas para o próximo chat e ações do dono por momento.
- **Reconciliação documental (P-063):** start-first do Dokploy corrigido no runbook/§6B.11/P-015 (D-020); Health Check do Swarm vazio (#5171); B-002 com a quebra de mídia das builds ≥ ~17/09; P-019/P-020 marcadas em produção desde 16/08; motivos da D-016/P-021 corrigidos (boom só tipo, ulid 3 tem CJS, BullMQ 6 com ioredis 5); `motores-whatsapp.md`/DOCUMENTO com BSUID, cobrança por mensagem e policy de 23/09; nota do `npm audit` cego a advisories de repositório; CLAUDE.md rc14 + comandos no macOS.
- **Decisões:** D-020 (premissa do stop-first), D-021 (duas engines vivas; Onda 6 obrigatória), D-022 (sinal duro → pausa até o fim + alerta).
- **Corrigido (CI/dev, sem deploy):** o `quay.io/minio/*` passou a responder 401 (repositórios fechados depois de 15/09) e derrubou o CI; `docker-compose.yml` e `ci.yml` agora usam o fork mantido `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` (última tag com identidade MinIO, já com a correção da CVE-2026-41145) e o cliente `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`. Fluxo do CI reproduzido localmente: infra `--wait`, bucket, migrations e 331/331 testes (unit + e2e).

### Documentação (23–24/09 — sessão `analise-atualizacoes` — doc-only, SEM deploy; ver `docs/sessions/DONE-2026-09-23-1750-analise-atualizacoes.md`)

- **Análise de atualizações e estabilidade das contas** ([docs/analise-atualizacoes-2026-09.md](docs/analise-atualizacoes-2026-09.md)): delta desde a auditoria de 09/09 — nenhuma versão nova de Baileys (rc14) nem wwebjs (1.34.7); Dokploy aplica `start-first` com Update Config vazio (runbook/D-014 errados → aviso no `deploy-dokploy.md` e B-004); produção sem backup (B-005); MinIO com CVE-2026-41145 (B-006); Nest GHSA-9c5c (high) invisível ao npm audit; lacunas do Baileys (mensagens offline descartadas, sinais de restrição ignorados, download de mídia sem proxy); política do WhatsApp alterada em 23/09; ondas 0–7 com critérios de aceite. Pendências B-004..B-007 e P-047..P-064.
- **wwebjs: memória/CPU** ([docs/analise-wwebjs-memoria-2026-09.md](docs/analise-wwebjs-memoria-2026-09.md)): sem "modo leve" na lib; flags restantes ~7–10%; maior alavanca é a mídia (`downloadMediaStream`, sem auto-download de grupo, fila, teto de envio); Baileys provavelmente cobre os leads com telefone (A/B proposto).
- Evidência bruta dos dois workflows em `docs/reference/analise-*-2026-09.json`.

### Adicionado (15/09 — sessão `caixa-unica-triagem` — **EM PRODUÇÃO 15/09 ~14:07 UTC**, PR #4, CI verde com o e2e novo na 1ª execução real, merge ff `768fb26`; validado por fora: rotas `/api/inbox/*` 404→401, migration aplicada no boot, bundle do dashboard com a rota — ver `docs/sessions/DONE-2026-09-15-1019-caixa-unica-triagem.md`)

Pedido do dono: uma tela para monitorar o que chega de TODOS os aparelhos sem escolher sessão, com semáforo por conversa (respostas 100% humanas, no aparelho).

- **Caixa única de triagem (painel `Atendimento`, rota `/atendimento`):** todas as conversas de todas as sessões numa lista só, ao vivo pelo SSE já existente, com bolinha por conversa — 🔴 `pending` (última mensagem é do contato), 🟢 `answered` (última mensagem é minha, **inclusive respondida no celular**, `source='phone'`), 🟡 `ignored` (marcado à mão "não preciso responder"). **Regra de ouro:** entrada NOVA devolve a conversa para 🔴, estivesse 🟡 ou 🟢. Contadores por cor, filtro por cor e por aparelho, fluxo cronológico de todas as mensagens ("Fluxo ao vivo") e caixa de resposta OPCIONAL (reusa `POST /messages/text` com idempotencyKey — nada automático). A `Inbox` antiga (por sessão) segue como era.
- **API aditiva (R0 — nada existente muda):** `GET /api/inbox/conversations` (`?sessions=`, `?status=`, `?limit=`; responde `{counts, conversations}` com `counts` do conjunto inteiro), `GET /api/inbox/messages` (fluxo cronológico) e `POST /api/inbox/sessions/{sessao}/triage` (`{chatJid, state: ignored|pending, keyId?}`). Grupo (`@g.us`), transmissão (`@broadcast`) e canal (`@newsletter`) **nunca** entram. Documentado em [INTEGRACAO §13](docs/INTEGRACAO.md).
- **Schema:** tabela nova `wa_conversation_triage` (migration aditiva `20260915140000_conversation_triage`) — guarda SÓ o amarelo, ancorado no `keyId` da entrada que estava na tela; 🔴/🟢 são derivados de `wa_messages` (sem flag de "lido", sem job de limpeza: entrada nova invalida a âncora sozinha). Dona: módulo `messaging` (ARQUITETURA atualizada).
- **Anti-atropelo:** o painel manda o `keyId` da entrada que exibiu; se chegou mensagem nova antes do clique, o gateway **não grava** a marca e devolve `status: "pending"` (o amarelo nunca engole mensagem não lida).
- **Contracts:** `InboxConversationDto`/`InboxCounts`/`InboxConversationsResponse`/`InboxFeedItemDto`/`InboxTriageRequest`/`InboxTriageResponse`/`InboxTriageStatus`; `MessageDto` passa a declarar `keyId`, `source` e `isCold` — campos que o `GET /messages` já devolvia e o DTO omitia (drift corrigido, aditivo).
- **Infra CI/dev (fix de carona no mesmo deploy):** MinIO do `docker-compose.yml` e do passo de bucket do CI agora vêm do **quay.io com tag pinada** (`quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` · `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z`) — o Docker Hub passou a negar o pull de `minio/minio` e derrubou o CI em 15/09. MinIO de produção não é afetado (serviço próprio no Dokploy).
- **Testes:** 8 unitários da derivação do semáforo (`triage-status.spec.ts`) + e2e `inbox-triage.e2e-spec.ts` (16 casos: lista cruzando 2 aparelhos, verde por resposta no celular, grupo ausente, amarelo, regra de ouro nos dois sentidos, anti-atropelo, filtros — inclusive por NOME com sessão id≠name —, 400/404/401). SQL agregado validado contra um PostgreSQL 18 real nesta máquina (cluster temporário) porque o e2e só roda no CI.

### Corrigido (09/09 — sessão `baileys-shutdown` — **EM PRODUÇÃO 09/09 ~18:15 UTC**, merge ff `301d42d`, validado — ver `docs/sessions/DONE-2026-09-09-1745-baileys-shutdown.md`)

- **Baileys reidrata no deploy (P-043):** `BaileysEngine.shutdown()` passa a fechar o socket SEM persistir status, espelhando o wwebjs. Antes, o `onModuleDestroy` do container que morre no deploy stop-first caía no `stop()` (o Baileys não tinha `shutdown()`) e gravava `STOPPED`; como os dois containers coexistem por ~15 s, esse `STOPPED` sobrescrevia o `WORKING` do container novo (visto em prod: Diogo enviando com status STOPPED) — e, no pior caso, impediria a reidratação (o `findAutostart` ignora STOPPED). Comentário da porta `IEngine.shutdown` corrigido (o motivo é NÃO persistir status, não "risco de perfil sujo"). 3 testes unitários novos.

### Corrigido / Adicionado (09/09 — sessão `logs-sem-erro-batido` — **EM PRODUÇÃO 09/09 ~17:27 UTC**, merge ff `4af6f9b`, validado em produção — ver `docs/sessions/DONE-2026-09-09-1400-logs-sem-erro-batido.md`)

Pedido do dono: "melhore os logs para não passar nenhum erro batido". Sem mudança de contrato, schema, env ou dependências (checkpoint em `docs/sessions/ATIVA-2026-09-09-1400-logs-sem-erro-batido.md`).

- **Corrigido (P-041):** `request completed` voltou a trazer `res.statusCode` e `res.headers` — o serializer de redação reaplicava o serializer padrão no objeto que o pino-http já tinha serializado (`statusCode: null` em 100% das linhas desde `2836c65`). Teste com o pino-http REAL (`log-redaction.pino-http.spec.ts`) garante status + redação de cookie/authorization/x-api-key/set-cookie/`?token=`.
- **Corrigido (P-042):** erros logados como `{ e }` (18 sites nas engines) saem com mensagem e stack — `{ err: e }` na origem + aliases `e`/`error`/`cause`/`exception` no serializer; `falha ao inicializar` (wwebjs) loga o `Error` inteiro.
- **Adicionado:** `LoggingExceptionFilter` global (estende `BaseExceptionFilter`; resposta idêntica — R0): uma linha por exceção com `reqId`, método, URL mascarada, status, `code`, sessão (`params.id`), usuário/api key (nome), IP — 4xx em `warn`, 5xx em `error` com stack. Instalado também nos e2e.
- **Adicionado:** `console-bridge` — `console.*` das libs (libsignal despeja o registro da sessão Signal; BullMQ usa `console.error` sem listener de `'error'`) vira UMA linha JSON (`log/info` → debug, `warn`/`error` → mesmo nível, teto de 4000 chars).
- **Adicionado:** `worker.on('error')`/`queue.on('error')` nas filas de webhooks e campanhas; `failed` com `job.id`, tentativa e evento; fechamento das filas e DLQ (desfazer reentrega) com aviso.
- **Corrigido:** catches mudos com registro — diretório de contatos, persistência de FAILED, `lastUsedAt` da api key, re-hash de senha, presigned URL de mídia (`mediaUrl indisponível`), locks/marcadores do perfil do Chromium, forwarder do proxy, destroy do client antigo, `resolveNames`; presence de campanha em debug.
- **Corrigido (painel):** sessão parada/deslogada pelo usuário deixa de exibir o `lastError` da execução anterior ("desconectado (LOGOUT) — reconectando (tentativa 1/5)" em sessão STOPPED) — `STOPPED` com `error: null` nas duas engines.

### Segurança / Corrigido / Adicionado (09/09 — sessão `aplicacao-auditoria` — **EM PRODUÇÃO 09/09 ~16:41 UTC**, PR #1 merge ff `2836c65`, validado em produção — ver `docs/sessions/DONE-2026-09-09-1050-aplicacao-auditoria.md`)

Aplicação das recomendações da [auditoria 09/2026](docs/auditoria-melhorias-2026-09.md) em ondas (checkpoint em `docs/sessions/ATIVA-2026-09-09-1050-aplicacao-auditoria.md`, seção ⚠️ com as mudanças de comportamento):

- **Segurança (onda A — P-032/P-033/P-035/P-037):** cookie, `set-cookie`, `?token=` e `Authorization`/`X-Api-Key` redigidos no log HTTP; verificação CSRF para requisições com efeito autenticadas por cookie (`Origin` na allowlist `CORS_ORIGIN`); reset de senha/rebaixamento revogam as famílias de refresh; senha nova 8..128 com scrypt versionado (`PASSWORD_SCRYPT_LOG2N`, re-hash no login) e tempo constante para usuário inexistente; `rediss://`/`REDIS_TLS` e `DB_SSL_CA`; `/health` com prazo por probe; `GET /media` responde 503 (não 404) com storage indisponível; limits de query clampados; headers reservados do webhook protegidos, redirect não seguido, reentrega da DLQ reservada; `gateway_process_errors_total{kind}` em `/metrics`.
- **Ciclo de vida das engines (onda B — P-025/P-026a/WA-09/11/12/15/18):** `initialize()` do wwebjs com teto (`WWEBJS_INIT_TIMEOUT_MS`, 4 min) e 1 retentativa → FAILED com motivo; watchdog de QR/pairing parado (recupera até 3×); callbacks de client antigo ignorados; estado UNPAIRED/CONFLICT vira DEGRADED; pairing code sai em `GET /sessions/:id/qr` (`pairingCode`) e não no log; WARN de idade da build fixa; Baileys com timer de reconexão único por geração e `cachedGroupMetadata`.
- **Garantias de envio (onda C — P-028/P-029, ABE-02..05):** tabela `wa_send_intents` (migration `20260909150000`): com `idempotencyKey` a intenção é reservada ANTES do transporte — replay, **409** para key em voo ou reutilizada com payload diferente, retry após falha; campanhas com `firstContact` (default true, aditivo em contracts/painel) passam pelo gate cold, enviam com `cold: true` e idempotencyKey determinística; start atômico, reserva atômica de destinatário, `dailyCap` por dia local, pausa revalidada antes do efeito, `/resume` reagenda pendentes.
- **Egress/SSRF (onda D — P-031):** `shared-kernel/safe-fetch` — só http/https público, sem credenciais, redirects revalidados, corpo em fluxo com teto `MEDIA_MAX_BYTES`; aplicado a webhook (cadastro 400 / entrega → dead-letter), mediaUrl de campanha e `/messages/media-url`; `EGRESS_ALLOW_HOSTS` para destino interno legítimo.
- **Guard-rail (onda E — P-030):** cooldown respeitado, quarentena manual só sai por override, mediana zero/velha não vira baseline, Nmin único (reply-rate usa o mesmo), transição por compare-and-swap, falha de evento vira log+métrica, `401` deixa de ser "ban".
- **Painel + CI (onda F — P-038/P-039):** Inbox com envio idempotente e trava de duplo clique, respostas obsoletas descartadas na troca de sessão/chat, "Gerar novo QR" sem rajadas, modal acessível (dialog/Escape/foco), ErrorBoundary + `vite:preloadError`; CI com `permissions: contents: read`, actions por SHA, typecheck do dashboard e dos contracts, `npm audit` informativo.
- **Dependências (onda G — P-038, sem majors):** sharp 0.35.4 · fast-uri 3.1.7/4.1.4 · js-yaml 4.3.2 · vitest 4.1.11 · Nest 11.2.3 · Prisma 7.10.0 · BullMQ 5.81.4 · AWS SDK 3.1128.0 · @fastify/helmet 13.1.1 · Vite 8.2.2 · react-router 7.18.3 · eslint 10.10.0 / typescript-eslint 8.70.0 · @swc/core 1.16.2. TypeScript segue 5.9.3; Fastify segue 5.11.3 (pin do Nest 11); wwebjs/Baileys intocados. `npm audit`: 17 → 11 pacotes (2 moderate, 9 high — restam fastify 5.11.3 pinado pelo Nest 11, mysql2/deepmerge-ts via Prisma, extract-zip via puppeteer/wwebjs; alcance documentado no relatório §7.5).
- **Docs:** INTEGRACAO (409, egress, CSRF, campanhas, cooldown), `env.example`, PENDENCIAS (P-025..P-040), ESTADO (produção = `740b911`), SESSOES.

### Documentação (09/09 — sessão `auditoria-melhorias`, sem alteração de código)

- [Auditoria de melhorias e atualizações](docs/auditoria-melhorias-2026-09.md): riscos de contas WhatsApp, engines/guardrail, backend, segurança, continuidade, contratos e dashboard; evidência local, documentação oficial e relatos upstream, com prioridades e critérios de aceite.
- Inventário de 69 pacotes e snapshot do `npm audit`: 17 pacotes sinalizados (12 high, 5 moderate), associados a 14 GHSAs únicos; recomendações de atualização compatível e triagem de alcance, sem instalar ou corrigir dependências.
- Registrados P-027..P-040; atualizados mapa, agenda e encerramento R9. Nenhuma alteração de runtime, banco, configuração ou produção; nenhuma garantia de não banimento.

### Corrigido (31/08 — sessão `envio-sem-onwhatsapp` — **EM PRODUÇÃO ~20:45 UTC**, merge ff `66b7076`, validado com envio real entregue)

- **Envio Baileys sem consulta de existência**: `resolveJid` não chama mais `sock.onWhatsApp`
  a cada envio. Em produção (31/08), pós-reconexão a consulta voltava vazia/`exists:false`
  para números válidos e TODO envio morria com 400 ("O número X não está no WhatsApp");
  além do risco de ban do padrão contact-check. Agora o JID é resolvido localmente
  (`toJid`) e destino inexistente simplesmente não entrega (ACK não evolui — o ledger
  conta a história). Aberta P-023 (9º dígito determinístico) como follow-up.

### Adicionado (18/08 — sessão `m3-qualidade` — **EM PRODUÇÃO ~11:50 UTC**, merge ff `4ea1c75`, CI novo verde)

- **Fronteiras de módulo viram código no CI** (`.dependency-cruiser.cjs`, D-018): as regras de
  ARQUITETURA.md §"Regras de dependência" (internals de módulo alheio, shared-kernel→módulo,
  infra→módulo, src→test, ciclos) agora quebram o build se violadas — todas como `error`
  (levantamento provou zero violação/ciclo em 176 módulos).
- **Testes unitários de domínio** (projeto vitest `unit`, roda SEM infra): máquina de decisão G5
  do guardrail (tabela completa + C10 + hard-gate + mediana da frota + observação×enforce) e
  crypto do shared-kernel (scrypt + vetores FIXOS de HMAC-SHA512/SHA-512 — contrato com os
  integradores de webhook). 28 testes novos; suíte total 198.
- **Cobertura v8 no CI** (`test:cov`, baseline 42% linhas, sem threshold — D-018) e passos novos
  de `format:check` + `depcruise` no workflow.
- **`tsconfig.build.json`**: `nest build` deixa de compilar `**/*spec.ts` para o `dist/`
  (provado com require do grafo completo — lição D-016). Prettier normalizado no repo inteiro +
  ignores de runtime (P-004 ✅). Carona: `@types/pg` 8.23.1.

### Corrigido (16/08 — hotfix pós-deploy da sessão `otimizacao-deps-hotpaths`)

- **Imagem do gateway sem deps ANINHADAS do workspace → boot morria com `Cannot find module
'zod'`** (deploy de 22:11 UTC: build Done, migration aplicada, mas o container novo saía com
  Exited(1) e o Swarm segurava o antigo — produção nunca ficou fora). Causa: o `npm update`
  levou o `eslint-plugin-react-hooks` (devDep da RAIZ) a exigir **zod@4**, que tomou o slot da
  raiz; o **zod@3 do gateway** foi aninhado em `apps/gateway/node_modules` — que o Dockerfile
  NÃO copiava (só `/app/node_modules`), e o `npm prune --omit=dev` ainda removia o zod@4 da raiz
  por ser dev. Fix: o estágio runtime agora copia TAMBÉM `apps/gateway/node_modules` (cobre
  qualquer dep nessa situação; `mkdir -p` no build garante a pasta mesmo com hoisting total).
  Validado com **build local da imagem real** + smoke de require do grafo completo do dist.

### Alterado (16/08 — sessão `otimizacao-deps-hotpaths`)

- **Dependências atualizadas dentro da compatibilidade (D-016)**: NestJS 11.1.27→11.2.1 (fixes de
  SSE: teardown no disconnect e abort — o gateway TEM endpoint SSE), Prisma 7.8→7.9.1 (fix oficial
  de **connection leak em transações interativas no adapter Postgres**), fastify 5.8.5→**5.11.3**
  (o exato que o `@nestjs/platform-fastify@11.2.1` declara — mesma regra do pin de ca0629d; traz
  "reduced per-request overhead" do 5.10 e cache de content-type na serialização do 5.11),
  Baileys rc13→**rc14** (8 commits de bugfix, sem breaking; validar reconexão da frota no deploy),
  BullMQ 5.79→5.81.3 (**dedupa o ioredis** — antes havia 5.10.1 aninhada + 5.11.1 raiz),
  pino 9→**10.3.1** (único breaking = drop de Node 18; **unifica as cópias** — o pino-http@11 exige
  pino 10 e mantinha uma segunda cópia aninhada), pg 8.23, @fastify/* minors, aws-sdk 3.1111,
  vitest 4.1.10, react 19.2.8, react-router 7.18.2, vite 8.2.1, tailwind 4.3.3. Majors deferidos
  com motivo documentado → P-021.
- **Pool do Postgres com tuning explícito**: o driver adapter do Prisma 7 herda os defaults do
  node-postgres — connect timeout **0** (espera infinita na aquisição com o pool saturado; o
  Prisma 6 usava 5s). Novos envs `DB_POOL_MAX` (default 10), `DB_POOL_CONNECT_TIMEOUT_MS` (5000)
  e `DB_POOL_IDLE_TIMEOUT_MS` (300000) — defaults = paridade Prisma 6 conforme a doc oficial.
- **`recordMany` (diretório de contatos) em LOTE**: sync de agenda/leads fazia 1 upsert POR
  contato em série; agora `INSERT ... ON CONFLICT (sessionId, waId) DO UPDATE SET col =
COALESCE(EXCLUDED.col, atual)` em chunks de 200 (round-trips O(N)→O(N/200)), mesma semântica
  de merge (nunca sobrescreve dado conhecido com null); fallback por registro se um chunk falhar.
- **ACK de mensagem atômico**: `updateStatusByKey` (hot path — todo delivered/read) era
  findFirst+update (2 round-trips + corrida read-modify-write entre ACKs concorrentes); virou UM
  UPDATE com a guarda de ranking no SQL (um `delivered` atrasado não sobrescreve mais um `read`).
- **Worker de webhooks com concorrência** (`WEBHOOK_CONCURRENCY`, default 8): o default 1 do
  BullMQ fazia um endpoint lento (teto 10s) segurar TODAS as entregas (head-of-line blocking).
- **Teto de mídia nas campanhas**: `fetchMedia` do worker baixava a URL sem limite de tamanho;
  agora aplica `MEDIA_MAX_BYTES` (content-length antes + tamanho real depois).
- **Índice `wa_contacts (sessionId, phone)`** (migration `indice_wa_contacts_phone`, aditiva):
  `namesFor` (hot path de leads/grupos) busca por OR em waId/lid/jid/**phone** — phone era a única
  chave sem índice; a busca de contatos por telefone no painel também usa.
- **Dashboard com code-splitting por rota** (`React.lazy` + `Suspense`): as 16 telas viram chunks
  próprios do Vite (Login 1,9 kB; vendor 241 kB) em vez de um bundle único; `gzip_vary on` no
  nginx (`Vary: Accept-Encoding` com Traefik/CDN na frente).

### Alterado (16/08 — sessão `dedup-status-alertas`)

- **Dedup de `session.status` na fonte (P-020, D-015)**: o gateway só publica um evento
  `session.status` (webhook + SSE + timeline) quando o par `(status, error)` MUDA. As engines
  reemitiam `WORKING` sem mudança real (Baileys em todo `connection 'open'` → cada reconexão
  transitória; wwebjs no `ready` a cada heal), e o notificador n8n repassava cada uma como alerta
  no zap/telegram — o "muitos alertas, mas nada mudou". `persistStatus` (status atual + detecção de
  engine órfã) segue rodando sempre, antes do gate. Contrato preservado (nota C6 em `INTEGRACAO.md`):
  um status idêntico não é uma transição. `wa_session_events` também para de acumular linhas
  repetidas. 5/5 testes novos (`session-status-dedup.e2e-spec.ts`).

### Adicionado (14/08 — sessão `wwebjs-p015-shutdown-limpo`)

- **Patch `$1` do WA Web** (`patches/whatsapp-web.js+1.34.7.patch`, patch-package no postinstall +
  Dockerfiles + teste que acusa ausência): builds ≥2.3000.104x deixam de quebrar
  sendMessage/getChats/downloadMedia. Build pinada `2.3000.1045101284-alpha` validada em produção
  (leads 99/99 com phone); default do código atualizado. Expira 13/10 (D-013).
- **Shutdown limpo do processo (P-015)**: `shutdown()` na engine wwebjs fecha o Chromium POR FORA
  do mutex de ciclo de vida (teto 7s < grace de 10s do Docker), teto de 8s no `logout()`,
  `stopped` síncrono, marcador `.gateway-clean-shutdown` no perfil (diagnóstico de encerramento
  sujo no boot) e log de duração/estouro no `onModuleDestroy`.
- **Blindagem contra mídia pesada (P-017)**: teto de 24MB para baixar mídia recebida
  (`WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`; acima segue só metadados) + heal imediato quando o renderer
  crasha (`Target crashed`) em QUALQUER caminho (probe, operações, mídia) + retry da build pinada
  antes do fallback live no init.
- **Probe no caminho de envio (P-016)**: sendText/sendMedia/sendLocation/sendPoll falham em ~10s
  com erro acionável (e disparam o heal) quando a página está travada — fim do envio que "não faz
  nada" no painel.
- **Watchdog de sync (P-019 — na main, AGUARDA DEPLOY)**: sonda a página a cada 60s; 3 falhas →
  status DEGRADED com "re-escaneie o QR" (fim do WORKING falso); recupera WORKING sozinho.

### Corrigido / Operação (14/08)

- **P-015 (QR a cada deploy) — causa raiz**: o app no Dokploy estava SEM volume; criado
  `gateway-wwebjs` → `/data/wwebjs` (perfil persiste; validado: 2 trocas de container sem QR).
  Runbook `deploy-dokploy.md` revisado: mount = passo crítico; Update Config **stop-first**
  (start-first com volume compartilhado corrompe o perfil). Memory Limit 2GB → **4GB** (D-014).
- **Regra operacional registrada**: re-sincronização de RECONEXÃO empaca em 99% nas builds atuais
  (bootstrap pós-QR completa sempre) ⇒ deploys do gateway em lote, janela com re-scan aceitável.

### Desempenho

- **wwebjs — extração de leads em LOTE** (sessão `2026-08-12-2043-wwebjs-qualidade-max`): `GET
/groups/{id}` (e `/leads`) resolvia número+nome com **1 round-trip CDP por participante** +
  1 `evaluate` por `@lid` — grupo de 500 levava minutos. Agora usa **1 `getContacts()`** (mapa
  id→contato) + **`getContactLidAndPhone` em blocos de 50** (via oficial da lib para o par
  LID↔telefone). Round-trips O(N) → O(N/50); nomes, telefones e o registro no diretório saem
  idênticos. Fallback um-a-um preservado quando o lote falha.

### Corrigido

- **wwebjs — presença global `available`/`unavailable` real** (sessão `…-2043-wwebjs-qualidade-max`):
  esses dois estados degradavam para `clearState` do chat (respondiam `ok` sem alterar a presença
  online/offline da conta). Agora usam `sendPresenceAvailable`/`sendPresenceUnavailable` (paridade
  com o Baileys). `composing`/`recording`/`paused` inalterados.
- **wwebjs — `PAIRING_CODE` + diagnóstico de queda** (sessão `…-2043-wwebjs-qualidade-max`):
  `requestPairingCode` agora seta o status `PAIRING_CODE` (paridade com o Baileys — o painel/n8n
  distingue "esperando código" de "esperando QR"); listeners `code` (renovação do pairing a cada
  ~3 min) e `change_state` (CONFLICT/UNPAIRED/TIMEOUT **antes** do disconnect) logam o porquê da
  queda. Guard de Chromium ausente (`WWEBJS_CHROME_PATH` errado) falha com erro acionável em vez
  de ENOENT críptico. Higiene: `clearTimeout` no `destroy`, dedup do eco sem `sleep` de 3 s à toa.

- **wwebjs — `announce`/`restrict` reais nos grupos** (sessão `2026-08-12-1959-wwebjs-p012-announce-restrict`,
  P-012): `GET /groups` e `GET /groups/{id}` da engine wwebjs devolviam sempre
  `announce:false`/`restrict:false` (valores fixos — a API mentia). Agora leem os flags reais do
  `groupMetadata` (announce = só admin envia · restrict = só admin edita info). Fallback `false`
  quando a metadata não está carregada (sem regressão). O Baileys já devolvia os valores reais.

### Adicionado

- **W7 — inbox: busca de mensagens** (sessão `2026-08-13-0810-wwebjs-w7c-search`, P-011): recurso
  NOVO aditivo. `GET /api/sessions/{s}/messages/search?q=termo` (opcional `&chatId=&limit=`) busca o
  termo no texto das mensagens (case-insensitive, mais recente primeiro), mesmo formato do
  `GET /messages`. Servida do **banco** → funciona nas **2 engines** e alcança o histórico importado
  pelo backfill. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em P-013.
  **Fecha o W7** (backfill + gestão de chat + busca — todos os itens entregues).
- **W7 — inbox: gestão de chat** (sessão `2026-08-13-0744-wwebjs-w7b-chat-mgmt`, P-011): recurso
  NOVO aditivo. `POST /api/sessions/{s}/messages/{chatId}/flag` (`{flag, enabled}`) arquiva/fixa/
  silencia/marca-não-lido uma conversa (`flag` ∈ archive|pin|mute|unread; `unread` com
  `enabled:false` marca como lido). Só **WWEBJS**; numa **Baileys** responde **501** (archive/
  markRead exigem app-state sync com o histórico — fora do escopo, e falha silenciosa é vetada pelo
  R6). Idempotente. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em
  P-013. Fecha o W7 exceto `searchMessages`.
- **W7 — inbox: backfill de histórico** (sessão `2026-08-13-0726-wwebjs-w7-inbox`, P-011):
  recurso NOVO aditivo. `POST /api/sessions/{s}/messages/sync` (`{chatId?, limit?, maxChats?}`)
  puxa o histórico da engine e grava no banco, populando a inbox de leitura que já existia
  (`GET /messages/conversations` + `GET /messages`) com conversas **anteriores à conexão**.
  Só **WWEBJS** (via `getChats`/`Chat.fetchMessages`); numa sessão **Baileys** responde **501**
  (sem store de histórico — a inbox ao vivo dele segue funcionando). O backfill grava DIRETO no
  banco (dedup por mensagem), **não** dispara webhook nem conta no reply-rate. Mídia histórica sem
  binário (`mediaKey` null → `GET /media` 404). Sem migration/env/breaking. Documentado em
  `INTEGRACAO.md` §12; contracts em P-013. Gestão de chat (archive/pin/mute) e `searchMessages` =
  próximos incrementos do W7.
- **W8 — grupos avançados: fila de entrada, travas admin-only e foto** (sessão
  `2026-08-12-2043-wwebjs-qualidade-max`, P-011): recurso NOVO aditivo nas DUAS engines.
  `GET /api/sessions/{s}/groups/{g}/membership-requests` (fila de entrada pendente),
  `POST …/membership-requests` (`{action: approve|reject, participants?}` — sem `participants`
  age sobre toda a fila, com **anti-flood** de 250–500 ms entre pedidos),
  `POST …/settings` (`{announce?, restrict?}` — travar envio/edição para admins) e
  `POST …/photo` (`{url}` — foto do grupo, o gateway baixa a imagem ≤10 MB). wwebjs via
  `getGroupMembershipRequests`/`approve`/`reject` + `setMessagesAdminsOnly`/`setInfoAdminsOnly`
  - `setPicture`; Baileys via `groupRequestParticipantsList`/`Update` + `groupSettingUpdate`
  - `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §9.2;
    contracts em P-013.
- **Anti-flag wwebjs — User-Agent realista e estável por sessão** (sessão
  `…-2043-wwebjs-qualidade-max`, P-012): o UA do Chromium passa a variar por sessão de forma
  **determinística** (paridade com o `browser-fingerprint` do Baileys) — estável entre reconexões,
  distinto entre sessões (frota inteira com UA idêntico denuncia automação). `WWEBJS_USER_AGENT`
  segue como override global. Variáveis `WWEBJS_*` agora validadas no zod do boot (vazio = ausente).

- **W8 — perfil da conta: status, nome e foto** (sessões `…-1941-wwebjs-w8-perfil-conta`
  e `…-1947-wwebjs-w8b-foto-perfil`, P-011): recurso NOVO aditivo nas DUAS engines.
  `POST /api/sessions/{s}/profile/status` (`{status}` — recado/"about", ≤139),
  `POST …/profile/name` (`{name}` — nome de exibição, ≤25) e `POST …/profile/photo`
  (`{url}` — o gateway baixa a imagem, ≤10 MB). wwebjs via `setStatus`/`setDisplayName`/
  `setProfilePicture`, Baileys via `updateProfileStatus`/`updateProfileName`/
  `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md`;
  contracts em P-013.
- **W6 — webhook mais rico: reações recebidas** (sessão `2026-08-12-1921-wwebjs-w6-webhook-reacoes`,
  P-011): novo evento **`message.reaction`** no webhook — quando o contato (ou você, em outro device)
  reage a uma mensagem. Payload `{ keyId (msg-alvo), chatJid, senderJid, emoji ('' = reação removida),
fromMe, timestamp }`. Capturado nas DUAS engines (wwebjs `message_reaction`, Baileys
  `messages.reaction`) e roteado ao webhook pelo fluxo existente (dedup por id de envelope, filtro por
  nome de evento — assine `*` ou `message.reaction`). Completa o round-trip de reações da W5. Sem
  migration/env/breaking. Documentado em `INTEGRACAO.md`; contracts em P-013. Edição/revogação/votos
  (vote_update) recebidos = incrementos futuros (Baileys exige inspeção de protocolMessage/decifrar).
- **W5b — mensagens ricas: localização e enquete** (sessão `2026-08-12-1902-wwebjs-w5b-location-poll`,
  P-011): recurso NOVO aditivo nas DUAS engines. **Localização**: `POST /api/sessions/{s}/messages/location`
  (`{to, latitude, longitude, name?, address?}`). **Enquete/poll**: `POST /api/sessions/{s}/messages/poll`
  (`{to, name, options[2..12], multi?}`). Ambos com `cold`/`idempotencyKey` e o mesmo hard-gate do
  guard-rail. Sem migration/env/breaking (rotas novas). Documentado em `INTEGRACAO.md`; contracts em
  P-013. **Reply/quote deferido** (o Baileys só persiste `raw` de mensagens enviadas, não das recebidas);
  captura de votos (`vote_update`) e vCard = incrementos futuros.
- **W5 — mensagens ricas: reações e menções** (sessão `2026-08-12-1746-wwebjs-w5-mensagens-ricas`,
  P-011 1º incremento): recurso NOVO **aditivo** nas DUAS engines (Baileys + wwebjs). **Reações**:
  `POST /api/sessions/{s}/messages/{msgId}/reaction` com `{ emoji }` (emoji vazio remove a reação).
  **Menções**: `text` e `media-url` aceitam `mentions: [números/JIDs]` (marca @, até 50). Sem
  migration, sem env, sem breaking (campos opcionais; rota nova). Contrato documentado em
  `INTEGRACAO.md`; formalização em `packages/contracts` adiada (P-013 — o arquivo está no escopo
  da sessão ativa `auth-refresh`, R9). location/poll/reply/vCard ficam para o próximo incremento.

- **wwebjs W4 — paridade funcional do motor** (sessão `2026-08-12-1736-wwebjs-w4-superficie`,
  P-010): os 14 métodos que a engine whatsapp-web.js respondia como "não suportado" (HTTP 501)
  passam a **funcionar de verdade** — a API já existia na lib 1.34.7. Grupos: `createGroup`,
  `updateParticipants` (add/remove/promover/rebaixar), `leaveGroup`, `setGroupSubject`,
  `setGroupDescription`, `groupInviteCode`, `groupRevokeInvite`. Contatos: `checkNumbers`
  (checa se o número tem WhatsApp + JID canônico), `profilePicture`, `setBlock`
  (bloquear/desbloquear). Canais/newsletter (beta): `createChannel`, `channelInfo`,
  `followChannel`, `unfollowChannel`. O motor wwebjs passa a ter **paridade com o Baileys** no
  contrato IEngine. Sem mudança de contrato (as rotas já existiam; deixaram de responder 501). O
  mecanismo `UnsupportedEngineOperationError`→501 permanece como contrato de capacidade de engine
  (dormante — sem operações não suportadas hoje; previsto para a futura engine META_CLOUD).

### Corrigido

- **wwebjs W3 — ciclo de vida e recuperação** (sessão `2026-08-12-1723-wwebjs-w3-ciclo-vida`,
  P-009): as credenciais do wwebjs vivem em disco (LocalAuth em `{WWEBJS_DATA_PATH}/session-<id>`),
  não no Postgres — agora `logout`/`new-qr`/`DELETE` **limpam o perfil do Chromium do disco**
  (`WWebJSEngine.purgeAuthDir`). Fim de dois defeitos: (a) `DELETE /api/sessions/:id` deixava o
  perfil (dezenas–centenas de MB) órfão no volume para sempre a cada sessão WWEBJS removida;
  (b) `POST /api/sessions/:id/new-qr` era no-op para wwebjs (limpava só o Postgres → o LocalAuth
  restaurava o mesmo perfil e a sessão voltava sem QR novo) — agora recupera de verdade. Robustez:
  `destroy()` do Chromium com **teto de 12s** (um Chromium travado não pendura mais o mutex de ciclo
  de vida da sessão), `qrBase64` zerado no `stop` (não serve QR morto) e teto FIFO no cache
  LID→telefone. Operações não suportadas pelo wwebjs (grupos de escrita, canais, checkNumbers,
  profilePicture, setBlock) passam a responder **HTTP 501** (Not Implemented) em vez de 400, via
  `UnsupportedEngineOperationError` — o integrador distingue "engine não faz isso" de "payload
  inválido". Sem migration/env/contrato.
- **wwebjs W2 — mídia no S3 + rótulo de engine no webhook** (sessão
  `2026-08-12-1715-wwebjs-w2-midia`, P-008): a engine whatsapp-web.js passa a **baixar a
  mídia recebida** (`msg.downloadMedia`) e persisti-la no S3 — antes toda mídia inbound
  virava `type:'other'` sem download e o `GET /api/sessions/:id/messages/:msgId/media`
  respondia 404 para 100% das mídias WWEBJS. A **mídia enviada** também sobe ao S3
  (`mediaKey` no evento → o webhook recebe a `mediaUrl` e o Inbox mostra o binário).
  Envio ganhou fidelidade de tipo (`sendMediaAsDocument`/`sendMediaAsSticker` — antes um
  sticker ia como imagem) e guard contra retorno null do `sendMessage`. O **envelope de
  eventos (webhook OUT) passa a rotular a engine REAL da sessão**: uma sessão WWEBJS
  reporta `engine:"wwebjs"` (antes TODO evento saía como `baileys`, inclusive de sessões
  WWEBJS — o node n8n recebia o campo errado); implementado via `engineName` na interface
  `IEngine`, derivado no `SessionManager`. Sem mudança de contrato (o campo `engine` já
  existia no envelope). Falha de download/upload emite os metadados sem binário (a
  conversa não some), como no Baileys.
- **wwebjs W1 — estabilidade e segurança do motor** (sessão `2026-08-12-1702-wwebjs-w1-estabilidade`,
  P-007): (P0-1) **reconexão automática** da engine whatsapp-web.js com backoff exponencial + jitter
  (espelha o Baileys, teto `MAX_RECONNECT=5` → `DEGRADED`), e **fim do `start` no-op**: o handler
  `disconnected` agora zera `this.client` — antes a lib destruía o Chromium mas mantinha a instância,
  e `doStart` (`if (this.client) return`) fazia todo `POST /start`/`/restart` responder 200 sem
  reconectar (sessão caía no meio de campanha e não voltava). (P0-2) o guard **`WA_REQUIRE_PROXY`
  agora vale no wwebjs**: sem proxy vivo e com o guard ligado, a engine RECUSA conectar em vez de
  vazar o IP do datacenter (o `1525e4e` injetava `requireProxy` mas o motor browser nunca o lia) +
  log WARN ao conectar sem proxy (paridade com o Baileys). Primeiro teste que instancia a engine
  wwebjs real (`test/wwebjs-engine.e2e-spec.ts`, prova por mutação do guard) — antes a cobertura do
  caminho wwebjs era zero. Sem mudança de contrato. **Ação operacional pendente do dono (P0-4):**
  revalidar/pinar `WWEBJS_WEB_VERSION` no Dokploy antes de a atual expirar (~fim de agosto/2026).

### Adicionado

- **Hardening anti-flag do WhatsApp** (sessão `2026-07-22-1700-hardening-antiban`): fingerprint
  de browser realista e ESTÁVEL por sessão no Baileys (`browser-fingerprint.ts` — pick
  determinístico por sessionId entre 6 fingerprints desktop reais), substituindo o antigo
  `['WhatsApp Gateway','Chrome','1.0.0']` que aparecia como "WhatsApp Gateway" em Aparelhos
  Conectados e denunciava automação. Log WARN quando uma sessão conecta SEM proxy (fim do ponto
  cego — antes a conexão direta pelo IP do servidor era silenciosa). Nova env `WA_REQUIRE_PROXY`
  (default false): quando ligada, a engine recusa conectar sessão sem proxy vivo em vez de vazar
  o IP do servidor/datacenter. Efeito de fingerprint só aparece após RE-VÍNCULO da sessão.
- **P0 estabilidade de sessão** (sessão `2026-07-21-1730-estabilidade-sessoes`): rota
  `POST /api/sessions/:id/new-qr` — limpa as credenciais persistidas e reinicia o socket
  (recuperação de sessão desconectada pelo celular; aditiva — R0/R4, sem tipo novo no contracts).
  O botão "Gerar novo QR" do painel passa a usá-la (antes fazia restart com credenciais mortas
  e a sessão voltava a FAILED sem nunca gerar QR).
- Base universal **v3.2** adotada (D-010): `BASE_CONEXOZENVO.md` (raiz, R0–R18), `docs/MAPA.md`,
  `docs/AUDITORIAS.md`, `docs/ADOCAO.md` (diagnóstico com evidências + ondas A1–A7).

- **M0 · Doc viva**: `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/DECISOES.md`, `docs/ARQUITETURA.md`
  (tabelas donas validadas contra o schema.prisma — divergências em D-002/D-003), `docs/PROJETO.md`,
  `docs/sessions/`, `CLAUDE.md` (raiz) e este `CHANGELOG.md`.
- `DOCUMENTO_CONEXOZENVO_NESTJS.md` (processo de ondas M0–M6) adicionado ao versionamento.
- **Proxy livre na criação de sessão (D-008)**: `GET /api/proxies/available` (proxies enabled,
  não-DEAD e sem sessão usando) e campo OPCIONAL `proxyId` no `POST /api/sessions` — a sessão
  nasce com atribuição `SINGLE`/`STICKY` exclusiva (1 proxy = 1 sessão), ou sem proxy se omitido.
  Dropdown "Proxy (só os livres aparecem)" no formulário de nova sessão do painel; contrato em
  `packages/contracts` (`CreateSessionRequest.proxyId?`) e docs/INTEGRACAO.md §11. Sem migration.

### Alterado

- `docs/auditoria-2026-07.md`: item O4 (S3 em prod) marcado ✅ — resolvido em 04/07/2026
  (Cloudflare R2, bucket `conexozenvo-wa-media`, `storage: true` confirmado no `/health`).
- **M1 · Destravar produção (10/07/2026)**: O1 (re-sync Webshare — todos os proxies ALIVE,
  sessões WORKING), O2 (Memory Limit no Dokploy — `memoryUsedPct` 0→0.27 no `/health`) e
  O3 (Validate DNS verde) concluídos → **auditoria 07/2026 100% encerrada (código + operacional)**.
  Sem mudança de código — onda operacional; produção roda `808c175` desde 13:28 UTC.

### Corrigido

- **Engine Baileys sem mutex de ciclo de vida**: dois `start()` próximos (duplo clique,
  restart sobre start, create + autostart) criavam DOIS sockets — o primeiro ficava órfão e os
  dois brigavam pela sessão (conflito 440 em loop até esgotar as reconexões, QR nunca
  estabilizava). start/stop/logout/reconexão agora serializados por sessão (espelha o mutex que
  a engine wwebjs já tinha).
- **`loggedOut` (desconectado pelo celular) deixava credenciais mortas**: agora limpa
  `wa_auth_keys` + `creds` e para em STOPPED com `lastError` claro — o próximo start gera QR
  novo direto (antes ficava FAILED e todo restart reconectava com as creds inválidas).
- **Painel "logado" após o JWT de 12h expirar**: qualquer 401 de `/api/*` agora desloga e
  redireciona ao `/login` (antes o polling repetia 401 no console indefinidamente com a UI
  aparentando sessão ativa).

- **Booleans de env** (`DB_SSL`, `GUARDRAIL_ENFORCE`, `S3_FORCE_PATH_STYLE`): trocado o
  `z.coerce.boolean()` (que fazia `Boolean(texto)` — `"false"`/`"0"` viravam TRUE) por parser
  explícito `envBool`: `true/1/yes/on` liga · `false/0/no/off` desliga · valor inválido derruba
  o boot com o nome da variável (D-007). Regressão coberta por `test/config.e2e-spec.ts` (suíte 74).
