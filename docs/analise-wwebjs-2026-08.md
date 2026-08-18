---
tipo: explanation
dono: Diogo
revisado_em: 2026-08-12
validade: 2026-11-12
status: ativo
partes: 2 (parte 2 = catálogo de recursos, §7–§8, adicionada 2026-08-12)
---

# 🔬 Análise minuciosa do motor whatsapp-web.js (wwebjs) — 2026-08

> Fonte: auditoria de código em 12/08/2026 (sessão `2026-08-12-1551-analise-wwebjs`,
> R21 parcial — leitura, sem alteração de código). 3 subagentes cruzaram
> `wwebjs.engine.ts` (1002 linhas) × `baileys.engine.ts` (1349) × contrato `IEngine`
> × todos os consumidores × doc oficial da lib 1.34.7 (Context7 + `node_modules`).
> Toda afirmação abaixo cita `arquivo:linha`. Objetivo do usuário: usar o wwebjs de
> forma **intensa nos próximos dias** com "tudo funcionando 100%" e "todas as
> funcionalidades possíveis".
>
> **Parte 1** (§1–§6): matriz do que EXISTE hoje + defeitos + plano de correção.
> **Parte 2** (§7–§8, sessão `analise-wwebjs-parte2`): catálogo de TODAS as
> capacidades da lib 1.34.7 (extraído do código instalado — 84 métodos no Client +
> 27 structures) + plano de recursos NOVOS.

## TL;DR — o veredito

O motor wwebjs **cumpre o núcleo** (conexão/QR, status, enviar/receber texto, ACK,
presença básica, LID→telefone via Store oficial, extração de leads de grupo) e é
**superior ao Baileys** exatamente no que justifica sua existência: resolver
número+nome de membros de grupo em massa (Store oficial do WhatsApp Web) e salvar
contatos na agenda. Fora disso, está **incompleto e com 3 defeitos críticos** que
batem direto no "uso intenso":

1. **Não reconecta sozinho.** Se a sessão cai, fica `DEGRADED` até um restart manual
   — e, pior, `POST /start` vira **no-op silencioso** (a rota responde 200 e nada
   acontece). `wwebjs.engine.ts:140` + `:269-273`.
2. **Ignora `WA_REQUIRE_PROXY`.** Com o guard anti-flag LIGADO, uma sessão wwebjs sem
   proxy vivo **conecta pelo IP do datacenter** — o exato vazamento que o hardening de
   21/07 (commit `1525e4e`) foi criado para impedir. `wwebjs.engine.ts:139-295` (o
   guard existe só no Baileys, `baileys.engine.ts:489`).
3. **Toda mídia recebida é descartada** (vira `type:'other'`, sem download, sem S3);
   e a mídia enviada também não sobe ao S3. `GET /:msgId/media` responde **404** para
   100% das mídias wwebjs, nas duas direções. `wwebjs.engine.ts:590` e `:516-550`.

Além disso: **12 dos 28 métodos** do contrato lançam "não suportado" (`nope()`) —
e **nenhum é limitação da lib**: todos têm API pronta na 1.34.7. E há **zero teste
e2e** exercitando o caminho wwebjs (os fakes fazem as 14 operações não suportadas
"passarem" verdes).

E uma **bomba-relógio de calendário**: `WWEBJS_WEB_VERSION` está pinada numa versão
que a Meta expira "~fim de agosto/2026" (`wwebjs.engine.ts:39-40`) — a semanas de
vencer. Quando expirar, o init cai no fallback `live`, que traz builds novas que
**escondem o número dos participantes** — degradando justamente a extração de leads.

---

> **Atualização 12/08 (sessão `wwebjs-qualidade-max`):** fechados vários P2 e o anti-flag da P-012.
> **Desempenho:** `groupInfo`/`/leads` deixou de ser O(N) round-trips CDP → passou a
> `getContacts()` 1× + `getContactLidAndPhone` em blocos de 50 (§8 W8/robustez — o LID artesanal
> vira fallback). **Presença:** `available`/`unavailable` agora são presença global real (não mais
> `clearState`). **Login/diagnóstico:** `requestPairingCode`→status `PAIRING_CODE` + listeners
> `code`/`change_state`; guard de Chromium ausente com erro acionável. **Anti-flag:** UA realista e
> **estável por sessão** (P-012) + `WWEBJS_*` no zod. **Higiene:** `clearTimeout` no destroy,
> `cacheLidPn` único, early-return `stopped` no sync do `ready`. **Recurso novo (W8):** grupos
> avançados — membership requests (list/approve/reject com anti-flood), settings announce/restrict,
> foto de grupo — nas 2 engines. Resta da P-012 só o `recordHardSignal` morto (decisão de produto).

## 1. Como o wwebjs funciona hoje no gateway

- **1 arquivo:** `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
  implementa a interface `IEngine` (`…/application/engine.port.ts`). Escolha da engine
  é **por sessão**, só na criação (`POST /api/sessions {engine}`), persistida em
  `WaSession.engine` (enum `BAILEYS|WWEBJS`); ponto de decisão único em
  `engine.factory.ts:12-14`. Não há rota para trocar a engine de uma sessão existente.
- **Auth:** `LocalAuth` grava o perfil do Chromium em disco (`WWEBJS_DATA_PATH`,
  `/data/wwebjs` em prod, volume Dokploy) — **não** no Postgres (onde mora o Baileys).
  Não usa `RemoteAuth` → a sessão não sobrevive a troca de volume/host.
- **Chromium:** 1 processo por sessão (`headless:true`, ~20 flags, heap cap 512 MB —
  `:199-228`), imagem inclui `chromium`+`fonts-liberation` (`Dockerfile:46-49`), `tini`
  faz reaping. `WWEBJS_CHROME_PATH=/usr/bin/chromium` no Docker sobrescreve o default do
  código (`google-chrome-stable`, que só existe no WSL de dev).
- **webVersion:** pinada e cacheada no volume (`.webcache`/LocalWebCache) para não bater
  rede a cada start; modos `auto`/`live`/fixa.
- **Diferencial real:** LID→telefone via `window.WWebJS.enforceLidAndPnRetrieval` +
  `getContact` por `page.evaluate` (o `window.Store` **não** é exposto na 1.34), com
  merge retroativo das mensagens já gravadas e varredura no `ready`.

Peças de robustez que **já existem e são boas**: mutex de ciclo de vida (`serialize`,
nasceu aqui e foi copiado para o Baileys), limpeza de Singleton locks
(`:124-131`), fallback de proxy e de webVersion no init com mensagens acionáveis
(`handleInitFailure:370-450`), autostart escalonado (Baileys antes de wwebjs, para não
subir N Chromium de uma vez), teto de 15s no start/destroy.

---

## 2. Matriz capacidade da lib × IEngine × estado real

**28 métodos do contrato `IEngine`.** Estado (evidência em `wwebjs.engine.ts` salvo nota):

| #   | Método                | Estado      | Evidência / observação                                                                                               |
| --- | --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `start`               | ✅          | `133-135`→`doStart 139-295`. Mas ver P0-1 (no-op após queda).                                                        |
| 2   | `stop`                | 🟡          | `456-465`: fecha Chromium, mas **não zera `qrBase64` nem caches**.                                                   |
| 3   | `logout`              | 🟡          | `471-485`: apaga userDataDir — **só se `logout()` não lançar** (catch vazio `475-481`).                              |
| 4   | `requestPairingCode`  | 🟡          | `487-489`: não seta status `PAIRING_CODE`, não ouve o evento `code` (renova a cada 3 min).                           |
| 5   | `sendText`            | ✅          | `491-514`. Sem `raw` (retry anti-"Aguardando mensagem" é Baileys-only).                                              |
| 6   | `sendMedia`           | 🟡          | `516-550`: só `caption`+`ptt`. **Sem document/sticker corretos, sem upload S3.**                                     |
| 7   | `sendPresence`        | 🟡          | `552-558`: composing/recording ok; **paused/available/unavailable → `clearState`** (2 globais errados).              |
| 8   | `markRead`            | 🟡          | `561-564`: `chat.sendSeen()` marca o **chat inteiro**; `msgId` ignorado.                                             |
| 9   | `getQrBase64`         | ✅          | `101-103`. Nunca zerado no stop (serve QR morto).                                                                    |
| 10  | `getStatus`           | ✅          | `98-100`.                                                                                                            |
| 11  | `listGroups`          | 🟡          | `853-870`: `announce`/`restrict` **hardcoded false**, `participants:[]`.                                             |
| 12  | `groupInfo`           | 🟡          | `873-894`: **é a razão de existir da engine** (leads). `announce`/`restrict` falsos; participantes 1-a-1 sequencial. |
| 13  | `createGroup`         | ❌ `nope()` | `944`. Lib tem `Client.createGroup`.                                                                                 |
| 14  | `updateParticipants`  | ❌ `nope()` | `947`. Lib tem add/remove/promote/demoteParticipants.                                                                |
| 15  | `leaveGroup`          | ❌ `nope()` | `950`. Lib tem `GroupChat.leave`.                                                                                    |
| 16  | `setGroupSubject`     | ❌ `nope()` | `953`. Lib tem `setSubject`.                                                                                         |
| 17  | `setGroupDescription` | ❌ `nope()` | `956`. Lib tem `setDescription`.                                                                                     |
| 18  | `groupInviteCode`     | ❌ `nope()` | `959`. Lib tem `getInviteCode`.                                                                                      |
| 19  | `groupRevokeInvite`   | ❌ `nope()` | `962`. Lib tem `revokeInvite`.                                                                                       |
| 20  | `checkNumbers`        | ❌ `nope()` | `965`. Lib tem `isRegisteredUser`/`getNumberId`.                                                                     |
| 21  | `profilePicture`      | ❌ `nope()` | `968`. Lib tem `getProfilePicUrl`.                                                                                   |
| 22  | `setBlock`            | ❌ `nope()` | `971`. Lib tem `Contact.block`/`unblock`.                                                                            |
| 23  | `saveContact`         | ✅          | `975-985`: `saveOrEditAddressbookContact` nativo + `syncToPhone`.                                                    |
| 24  | `removeContact`       | ✅          | `986-989`: `deleteAddressbookContact`.                                                                               |
| 25  | `createChannel`       | ❌ `nope()` | `990`. Lib tem `Client.createChannel`.                                                                               |
| 26  | `channelInfo`         | ❌ `nope()` | `993`. Lib tem `getChannels`/`getChannelByInviteCode`.                                                               |
| 27  | `followChannel`       | ❌ `nope()` | `996`. Lib tem `subscribeToChannel`.                                                                                 |
| 28  | `unfollowChannel`     | ❌ `nope()` | `999`. Lib tem `unsubscribeFromChannel`.                                                                             |

**Resumo:** ✅ 6 · 🟡 10 · ❌ 12. Os 12 `nope()` **têm API na lib** (mapa em §8 do
relatório do motor) — são wrappers finos a escrever, não bloqueios.

**Recursos da lib que o gateway sequer expõe no contrato** (oportunidade de recurso
novo): reações (`sendReaction`), reply/quote e menções, editar mensagem, revogar
(apagar) mensagem, enquetes (poll) + `vote_update`, localização, vCard, encaminhar
(forward), perfil próprio (nome/status/foto/presença global), chats
(archive/pin/mute/labels/unread), busca de mensagens, e o evento `call` (chamada
recebida). Nenhum é ouvido/implementado hoje.

**Eventos:** o motor ouve **7** dos ~31 da lib (`qr`, `ready`, `auth_failure`,
`disconnected`, `message_create`, `message_ack`, `loading_screen`). **Não ouve 24**,
com custo real em: `code` (renovação do pairing), `change_state`
(CONFLICT/UNPAIRED/TIMEOUT antes do disconnect), `message_edit` e
`message_revoke_everyone` (o banco guarda texto velho para sempre), `message_reaction`,
`vote_update`, `call`, `group_*`.

---

## 3. Achados por severidade (com evidência)

### 🔴 P0 — corrigir ANTES do uso intenso

| #    | Achado                                                                                                                                                            | Evidência                                                                               | Impacto no uso intenso                                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-1 | **Sem reconexão + `start()` no-op após queda.** `disconnected` só troca status; a lib destrói o browser mas `this.client` fica non-null → `doStart` retorna cedo. | `wwebjs.engine.ts:140`, `:269-273` (vs Baileys `:642-664`)                              | Sessão cai no meio de uma campanha e **não volta** — nem sozinha, nem por `POST /start` (responde 200 e nada). Só `restart` recupera.                                                            |
| P0-2 | **`WA_REQUIRE_PROXY` ignorado.** `deps.requireProxy` nunca é lido no wwebjs.                                                                                      | `wwebjs.engine.ts:139-295` (guard só em `baileys.engine.ts:489`)                        | Com o guard ligado p/ anti-flag, sessão wwebjs sem proxy sobe pelo **IP do datacenter** → risco de flag exatamente no período de uso pesado. Casa com **B-001** (migração p/ proxy residencial). |
| P0-3 | **Mídia recebida descartada + mídia enviada não vai ao S3.** `type:'other'`, sem `downloadMedia`, sem `storeMedia`.                                               | `wwebjs.engine.ts:590`, `:516-550`; `GET media` 404 em `messages.controller.ts:186-210` | Qualquer imagem/áudio/documento que o lead mandar é **irrecuperável**; o inbox e o n8n não recebem o binário.                                                                                    |
| P0-4 | **webVersion a semanas de expirar.** Pin `2.3000.104227…` com aviso "Meta expira ~fim de agosto/2026".                                                            | `wwebjs.engine.ts:39-40,43`; `env.production.example:112-115`                           | Se expirar durante o uso intenso, o fallback `live` traz build que **esconde o número dos leads** — quebra a razão de usar wwebjs. Precisa **revalidar/pinar versão nova válida ANTES**.         |

### 🟠 P1 — alto (defeitos que degradam silenciosamente)

| #    | Achado                                                                                                                                                                                                                                      | Evidência                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P1-1 | **Envelope de webhook rotula toda sessão wwebjs como `engine:'baileys'`** (hardcoded); `guardrail.service.ts:180` faz certo → o mesmo consumidor recebe rótulos contraditórios. Contrato público (node n8n). Um teste **cristaliza o bug**. | `session-manager.service.ts:172`; `webhooks.e2e-spec.ts:102`                  |
| P1-2 | **`POST /:id/new-qr` é no-op de credencial no wwebjs** (limpa só o Postgres; a credencial está no disco/LocalAuth). O botão do painel "gerar novo QR" não recupera sessão wwebjs desconectada pelo celular.                                 | `session-manager.service.ts:340-345` vs `wwebjs.engine.ts:173-176`            |
| P1-3 | **`DELETE /sessions/:id` vaza perfil Chromium** (dezenas–centenas de MB) órfão no volume, para sempre, a cada sessão wwebjs criada+removida.                                                                                                | `session-manager.service.ts:349-358`; nada apaga `/data/wwebjs/session-<id>/` |
| P1-4 | **Zero cobertura e2e do caminho wwebjs**; o `fakeSessionManager` faz as 14 operações não suportadas passarem verdes → 18 arquivos e2e dão impressão de paridade inexistente.                                                                | `apps/gateway/test/setup-app.ts:11-53`; `f5.e2e-spec.ts`                      |
| P1-5 | **`recordHardSignal` nunca é chamado** → `signal.463` e `signal.restriction` são catálogo público morto (nas DUAS engines); `ultimoSinal` sempre null.                                                                                      | `guardrail.service.ts:350` (única ocorrência = a definição)                   |
| P1-6 | **12 `nope()` → HTTP 400 genérico** (não 501/422): para o n8n, "engine não suporta" é indistinguível de "payload inválido".                                                                                                                 | `wwebjs.engine.ts:813-815`; controllers de groups/contacts/channels           |

### 🟡 P2 — médio (paridade e robustez)

- **Anti-flag não cobre wwebjs:** fingerprint/UA estável por sessão foi só Baileys (22/07); `WWEBJS_USER_AGENT` está no env de dev e **ausente do de produção**. `CHANGELOG:11-18`, `env.example:94` vs `env.production.example`.
- **`destroy()` sem teto dentro do mutex** pode travar a fila `lifecycle` da sessão para sempre se o Chromium pendurar. `wwebjs.engine.ts:459,393`.
- **`markRead` marca o chat inteiro** e **todo envio marca visto** (`sendSeen` implícito) → controle fino de leitura inexiste; risco no handoff IA×celular. `:560-564`, §4 do relatório do motor.
- **`sendPresence` degrada 3 de 5 estados** para `clearState` respondendo `{ok:true}`; campanha perde o "parou de digitar". `:552-558`; `campaign-queue.ts:137`.
- **`groupInfo` sequencial sem teto próprio** — grupo de 500 = 500 round-trips CDP, `GET /leads` pode levar minutos; worker de campanha com `concurrency:4` no mesmo Chromium contradiz o comentário de "não paralelizar". `:880-883`, `campaign-queue.ts:68`.
- **`announce`/`restrict` hardcoded false** em `listGroups`/`groupInfo` — 2 campos em que o consumidor não pode confiar. `:865-866,890-891`.
- **Envs `WWEBJS_*` fora do zod** (lidas em escopo de módulo): typo em `WWEBJS_CHROME_PATH` não falha no boot, só no 1º start como `FAILED`. `bootstrap/config.ts` (sem `WWEBJS_*`).
- **`lidToPnCache` sem teto** (cresce pela vida do processo); dedup do eco por `setTimeout(3000)` pode duplicar linha se o `sendMessage` demorar >3s. `:73`, `:573-576`.
- **Dashboard não sinaliza capacidade por engine**: numa sessão wwebjs o painel oferece criar grupo, checar número, foto, bloquear, canais — cada clique volta 400. `Groups.tsx`/`Contacts.tsx` sem condicional.

### 🟢 P3 — baixo / recurso novo

- Recursos da lib ainda não expostos (reações, reply, edição, revogação, poll, localização, vCard, forward, perfil, chats/labels) — backlog de produto, não defeito.
- `raw` (proto) ausente no wwebjs — provavelmente inerente (não há proto); o retry anti-"Aguardando mensagem" é Baileys-only por natureza.

---

## 4. Onde o wwebjs GANHA do Baileys (preservar)

- **LID→telefone via Store oficial** e **nome salvo na agenda** — o Baileys não consegue pelo limite do protocolo Meta. `:673-715`, `:899-939`, `:765-801`.
- **Extração de leads de grupo com número em massa** — é o papel declarado da engine (`auditoria:72`, `ARQUITETURA.md:25`).
- **`saveContact`/`removeContact` nativos** na agenda. `:975-989`.
- **Proxy aplicado no browser** com fallback e diagnóstico acionável. `:150-163,370-450`.
- **Cache local da webVersion** + limpeza de Singleton locks. `:299-364,124-131`.

---

## 5. Plano priorizado para "100% redondo"

Cada onda é **sessão R9 própria** com branch `feature/*`, teste e2e de efeito (R6) e
deploy vigiado (R0 — push dispara redeploy no Dokploy; nunca em rajada com sessão real
conectada). Ordem por risco × custo:

> **Atualização 12/08:** W1 **P0-1 e P0-2 ENTREGUES** (sessão `wwebjs-w1-estabilidade`,
> CHANGELOG Unreleased) — reconexão automática + fim do `start` no-op + guard
> `WA_REQUIRE_PROXY` no wwebjs + 1º teste da engine. **Resta P0-4** (revalidar
> `WWEBJS_WEB_VERSION` — ação operacional no Dokploy, **B-002**).

**W1 — Estabilidade e segurança do motor (P0) — a mais urgente.**

- P0-1: `disconnected` zera `this.client` (1 linha destrava o `start`) + reconexão com
  backoff espelhando o Baileys (`:642-664`).
- P0-2: honrar `deps.requireProxy` no `doStart` (após `:150`) + log de "conexão sem
  proxy" (paridade com o hardening do Baileys). Fecha o vazamento de IP.
- P0-4: revalidar e **pinar uma `WWEBJS_WEB_VERSION` válida** que ainda exponha o
  número (ação operacional no Dokploy + confirmar na extração de leads); documentar a
  cadência "revalidar a cada ~2 meses" em AUDITORIAS.md (linha de compliance de versão
  já existe).
- Gate novo: 1º teste e2e que instancia a engine real (ou um contrato de engine) —
  ataca P1-4 na raiz.

> **Atualização 12/08:** W2 **ENTREGUE** (sessão `wwebjs-w2-midia`, P-008 concluída) —
> mídia inbound/outbound no S3, envelope com `engine` real, `sendMediaAsDocument/Sticker`,
> guard de `sent` null.

**W2 — Mídia e fidelidade de envio (P0-3 + P1).**

- P0-3: `msg.downloadMedia()` + `deps.storeMedia` no `onMessageCreate` (`:590`) e
  `mediaType` real a partir de `msg.type`; upload S3 no `sendMedia` com `mediaKey` no
  eco (paridade com Baileys `:896-912`).
- P1-1: derivar `engine` real no envelope (`session-manager.service.ts:172`) e
  **corrigir o teste** que cristaliza o bug.
- `sendMedia`: `sendMediaAsDocument`/`sendMediaAsSticker` + guarda de `sent` null/undefined.

> **Atualização 12/08:** W3 **ENTREGUE** (sessão `wwebjs-w3-ciclo-vida`, P-009 concluída)
> — `purgeAuthDir` (fim do vazamento de perfil + new-qr recupera), `destroy` com teto,
> `qrBase64`/cache com teto, `nope()`→HTTP 501.

**W3 — Ciclo de vida e paridade de recuperação (P1/P2).**

- P1-2: `new-qr`/`logout`/`remove` limpam o LocalAuth em disco no wwebjs (não só o
  Postgres) — inclui P1-3 (fim do vazamento de perfil no DELETE).
- P2: timeout no `destroy()`; zerar `qrBase64` e caches no stop; teto no `lidToPnCache`.
- P1-6: `nope()` → HTTP 501/422 com corpo estruturado (o n8n distingue).

> **Atualização 12/08:** W4 **ENTREGUE** (sessão `wwebjs-w4-superficie`, P-010 concluída)
> — os 14 `nope()` implementados (grupos completos, checkNumbers, profilePicture, setBlock,
> canais beta): paridade IEngine com o Baileys. Residual (recordHardSignal, dashboard,
> anti-flag, announce/restrict) → **P-012**.

**W4 — Completar a superfície (os 12 `nope()`) + higiene.**

- Implementar os 12 métodos (a API existe na lib — §8 do relatório do motor). Maior
  retorno imediato: `checkNumbers` e `profilePicture`. Grupos completos e canais
  fecham a paridade com o Baileys.
- P1-5: fiar `recordHardSignal` a um sinal real (ou remover o catálogo morto do
  contrato, com plano de versão — R0). Vale para as duas engines.
- Dashboard: desabilitar/rotular ações não suportadas por engine + aviso de custo de RAM.
- Anti-flag: `WWEBJS_USER_AGENT` no env de produção + fingerprint estável por sessão.

**Recursos novos (backlog de produto, fora do "100% do que existe"):** reações, reply,
edição/revogação, poll, localização, vCard, forward, chats/labels — cada um vira P-xxx
quando priorizado.

---

## 6. Recomendações operacionais IMEDIATAS (antes de qualquer código)

Para o uso intenso "nos próximos dias", independentemente das ondas W1–W4:

1. **Revalidar a `WWEBJS_WEB_VERSION` JÁ** (P0-4) — é a única bomba de calendário; se
   expirar no meio do uso, os leads perdem o número. Ação no Dokploy.
2. **Resolver o B-001** (proxy residencial BR + `WA_REQUIRE_PROXY=true`) — mas ciente do
   P0-2: **hoje o guard não protege o wwebjs**, então até a W1 entrar, garantir
   manualmente que **toda sessão wwebjs tenha um proxy residencial atribuído** (Proxy
   fixo), senão ela conecta pelo IP do datacenter mesmo com a flag ligada.
3. **Não reiniciar o gateway em rajada** com sessão wwebjs real conectada (derruba a
   sessão — §6.6 do `agent-whatzapp_api.md`); e **1 réplica** no Dokploy (sessão é
   stateful, volume local).
4. **Monitorar RAM/`/health`** — cada sessão wwebjs ≈ 1 Chromium; `heapUsedPct > 0.9`
   degrada o container e o Traefik pode tirar do balanceador (502). Confirmar Memory
   Limit ativo (O2 da auditoria 07/2026).
5. **Sessão wwebjs que cair NÃO volta sozinha** (P0-1) — até a W1, o procedimento é
   `POST /api/sessions/:id/restart` (não `/start`, que é no-op; nem `/new-qr`, que não
   limpa credencial no wwebjs).

---

---

# PARTE 2 — Catálogo de TODAS as funcionalidades possíveis

> Fonte: leitura do código instalado `node_modules/whatsapp-web.js/src/` (1.34.7) —
> Client.js (84 métodos async), Message.js, Chat/GroupChat/Channel/Contact.js e as 27
> structures. Confirmado na doc oficial (Context7). Cada linha é `Arquivo.js:linha` da
> **lib** (não do gateway). Legenda de estado no gateway: ✅ já exposto · 🟡 exposto
> parcial · ❌ não exposto (recurso novo) · ⛔ inviável/bloqueado.

## 7. O universo de capacidades da lib × o que o gateway expõe

### 7.1 Envio e mensagens ricas (o maior ganho para outreach)

| Capacidade                      | API da lib                                                                   | Gateway                                          | O que habilita                                                   |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Texto / mídia / caption / ptt   | `Client.sendMessage:1386`                                                    | 🟡 (§2: falta document/sticker/gif corretos, S3) | base                                                             |
| **Responder citando** (quote)   | `sendMessage(opts.quotedMessageId)` / `Message.reply:461`                    | ❌                                               | conversa humana ("respondendo à sua msg…") — alto valor no funil |
| **Menções** (@contato / @grupo) | `opts.mentions` / `opts.groupMentions` `:1442-1472`                          | ❌                                               | avisos em grupo, engajamento                                     |
| **Reagir** a mensagem (emoji)   | `Client.sendReaction:1567` / `Message.react:479`                             | ❌                                               | micro-interação humana barata; "curtir" resposta do lead         |
| **Editar** mensagem enviada     | `Message.edit:875`                                                           | ❌                                               | corrigir erro sem reenviar                                       |
| **Apagar** (revoke everyone/me) | `Message.delete:604`                                                         | ❌                                               | retirar mensagem errada                                          |
| **Encaminhar**                  | `Message.forward:497`                                                        | ❌                                               | repassar material a vários leads                                 |
| **Fixar** mensagem no chat      | `Message.pin:718`/`unpin:736`                                                | ❌                                               | destacar CTA                                                     |
| **Estrelar**                    | `Message.star:670`/`unstar:693`                                              | ❌                                               | organização interna                                              |
| **Enquete** + ler votos         | `new Poll` + `opts.poll` · `Client.getPollVotes:3403` · evento `vote_update` | ❌                                               | **engajamento de campanha** — qualificação rápida de lead        |
| **Localização**                 | `new Location` + `opts.location` `:Location.js`                              | ❌                                               | enviar endereço (evento presencial)                              |
| **Cartão de contato** (vCard)   | `opts.contactCard`/`contactCardList`                                         | ❌                                               | passar contato de vendedor/parceiro                              |
| **View-once**                   | `opts.isViewOnce`                                                            | ❌                                               | mídia que some                                                   |
| **Sticker** com nome/autor      | `opts.sendMediaAsSticker/stickerName/Author`                                 | ❌ (hoje vira imagem)                            | branding                                                         |
| Link preview on/off             | `opts.linkPreview`                                                           | ❌                                               | controle de layout                                               |
| Info de entrega detalhada       | `Message.getInfo:758` (delivery/read/played por contato)                     | ❌                                               | quem leu numa lista                                              |

### 7.2 Inbox, histórico e busca (onboarding de sessão)

| Capacidade                                     | API                                                                        | Gateway | Uso                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| Listar todas as conversas                      | `Client.getChats:1668`                                                     | ❌      | popular inbox ao conectar (hoje o inbox só tem o que chega ao vivo) |
| **Puxar histórico** de um chat                 | `Chat.fetchMessages({limit,fromMe}):203`                                   | ❌      | recuperar conversa anterior de um lead                              |
| Sincronizar histórico                          | `Client.syncHistory:3173`/`Chat.syncHistory`                               | ❌      | idem, sob demanda                                                   |
| Buscar mensagens                               | `Client.searchMessages:1645`                                               | ❌      | achar lead por termo                                                |
| Mensagens fixadas                              | `Client.getPinnedMessages:1778`                                            | ❌      | —                                                                   |
| Arquivar / fixar / silenciar / marcar não-lido | `archiveChat:2007`, `pinChat:2035`, `muteChat:2081`, `markChatUnread:2131` | ❌      | gestão de inbox                                                     |

### 7.3 Contatos e perfil próprio

| Capacidade                     | API                                                 | Gateway                      | Nota                                                           |
| ------------------------------ | --------------------------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Número está no WhatsApp / wid  | `isRegisteredUser:2214` / `getNumberId:2224`        | ❌ `nope()` (P0/W4 já prevê) | validação de lista antes de disparar — **crítico p/ campanha** |
| Foto de perfil                 | `getProfilePicUrl:2145`                             | ❌ `nope()` (W4)             | —                                                              |
| Recado ("about")               | `Contact.getAbout:206`                              | ❌                           | enriquecimento de lead                                         |
| Grupos em comum                | `getCommonGroups:2166`                              | ❌                           | contexto de relacionamento                                     |
| Nº de devices do contato       | `getContactDeviceCount:3149`                        | ❌                           | diagnóstico                                                    |
| LID↔telefone em lote (oficial) | `getContactLidAndPhone:3307`                        | ❌ (hoje faz artesanal)      | **substituiria** o `page.evaluate` manual de LID               |
| Bloqueados                     | `getBlockedContacts:2870` · `Contact.block/unblock` | ❌ `nope()` (W4)             | —                                                              |
| Salvar/remover na agenda       | `saveOrEditAddressbookContact:3260`/`delete:3291`   | ✅                           | já exposto                                                     |
| **Meu status/recado**          | `setStatus:1944`                                    | ❌                           | perfil da conta                                                |
| **Meu nome de exibição**       | `setDisplayName:1958`                               | ❌                           | perfil                                                         |
| **Minha foto**                 | `setProfilePicture:2891`/`delete:2907`              | ❌                           | perfil/branding                                                |
| Presença global online/offline | `sendPresenceAvailable:1984`/`Unavailable:1995`     | 🟡 (hoje vira `clearState`)  | corrigir os 2 estados globais (P2)                             |

### 7.4 Grupos avançados

Além dos 7 `nope()` já previstos no W4 (create/participants/leave/subject/desc/invite/revoke):

| Capacidade                   | API                                                                                                                              | Uso                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Criar grupo com opções       | `createGroup(opts):2310` (messageTimer, parentGroupId=comunidade, memberAddMode, membershipApprovalMode, isRestrict, isAnnounce) | grupo já nasce configurado                                  |
| **Aprovar/rejeitar entrada** | `getGroupMembershipRequests:2975` · `approve:3007`/`reject:3029` (com `sleep` anti-flood)                                        | **crescimento de grupo** — moderar fila de entrada em massa |
| Admin-only toggles           | `setAddMembersAdminsOnly:447` · `setMessagesAdminsOnly:483` · `setInfoAdminsOnly:518`                                            | travar grupo durante campanha                               |
| Foto do grupo                | `setPicture:561`/`deletePicture:548`                                                                                             | branding                                                    |
| Info/aceitar convite         | `getInviteInfo:1821` · `acceptInvite:1834` · `acceptGroupV4Invite:1922`                                                          | entrar em grupos                                            |
| Comunidades                  | via `parentGroupId` no createGroup                                                                                               | estrutura de comunidade                                     |

### 7.5 Canais (newsletter) — hoje 100% `nope()`

Os 4 do contrato (create/info/follow/unfollow) + extras da lib: `getSubscribers:105`,
`setReactionSetting:184` (nenhuma/básicas/todas), `transferChannelOwnership:2578`,
`deleteChannel:2725`, `sendChannelAdminInvite:1600`, `searchChannels:2645`
(recomendados/trending/popular/novos). Canais **nem estão no contrato público**
(`INTEGRACAO.md` não tem seção) — decidir se entram (broadcast 1-para-muitos é caso
de uso plausível no "uso intenso").

### 7.6 Eventos entrantes que hoje se perdem (webhook mais rico)

O motor ouve 7 eventos; a lib emite ~31. Capturar estes vira **evento novo no webhook**
(aditivo ao contrato — R0):

| Evento da lib                                       | Habilita                                                    | Prioridade                  |
| --------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| `message_reaction`                                  | saber que o lead reagiu                                     | alta (sinal de engajamento) |
| `vote_update`                                       | resposta de enquete em tempo real                           | alta (qualificação)         |
| `message_edit`                                      | atualizar texto no banco (hoje guarda o velho)              | média                       |
| `message_revoke_everyone`/`_me`                     | marcar msg apagada                                          | média                       |
| `call` (+ `Call.reject:69`)                         | registrar/rejeitar chamada                                  | média                       |
| `change_state`                                      | CONFLICT/UNPAIRED/TIMEOUT antes do disconnect (diagnóstico) | alta (estabilidade)         |
| `code`                                              | renovação do pairing code (a cada 3 min)                    | alta (login por código)     |
| `group_join`/`_leave`/`_admin_changed`/`_update`    | timeline de grupo                                           | média                       |
| `contact_changed`, `unread_count`, `media_uploaded` | —                                                           | baixa                       |

### 7.7 ⛔ Bloqueado / não vale a pena (registrar para não tentar de novo)

- **Buttons / List**: DEPRECATED no próprio código da lib (warn no `sendMessage`
  `:1505/:1514`) — o WhatsApp descontinuou. **Não implementar.**
- **Labels** (`getLabels` etc.) e **Customer Notes**: só conta **WhatsApp Business**
  (guard `smba/smbi`/`smbNotesV1Enabled` lança erro). A conta é comum → ⛔ salvo migração.
- **Battery / `ClientInfo.getBatteryStatus`/`phone`/`me`**: `@deprecated` no multi-device.
- **Chamada**: só dá `reject()`, **não há atender** — no máximo registrar/recusar.
- **Order / Payment**: read-only (loja/pagamento) — só leitura, nicho.
- **`createCallLink:3197`** (link de reunião voz/vídeo), **ScheduledEvent** (evento
  agendado): existem, mas fora do caso de uso de outreach — backlog frio.

## 8. Plano de recursos NOVOS (ondas W5–W8) — depois dos P0/P1 (W1–W4)

> Pré-requisito: **W1–W4 primeiro** (a base tem de estar sólida antes de empilhar
> recurso). Tudo aqui é **aditivo** ao contrato `IEngine`/`INTEGRACAO.md`/
> `packages/contracts` (R0/R4 — novos métodos e eventos, nunca quebrar os atuais).
> Cada recurso ganha teste e2e de efeito (R6). Priorizado por valor no "uso intenso"
> (outreach/campanha) × esforço.

**W5 — Mensagens ricas (maior ROI para conversa humana):**
`reply`/quote · `mentions`/groupMentions · `sendReaction` · `poll` + `vote_update` no
webhook · `location` · `contactCard`/vCard. São os que mais humanizam e engajam o funil.

> **Atualização 12/08:** ENTREGUES **reações + menções** (sessão `wwebjs-w5-mensagens-ricas`)
> e **localização + enquete** (sessão `wwebjs-w5b-location-poll`), nas duas engines, aditivo.
> Restam neste W5: **reply/quote** (deferido — Baileys não persiste `raw` inbound),
> **captura de votos** (`vote_update` — Baileys precisa decifrar), **vCard** (assimétrico).
> `packages/contracts` a formalizar = P-013 (evitou conflito R9 com auth-refresh).

> **Atualização 12/08:** 1º incremento ENTREGUE (sessão `wwebjs-w6-webhook-reacoes`) —
> evento **`message.reaction`** (reações recebidas) nas 2 engines. Restam: edição
> (`message_edit`), revogação (`message_revoke`), votos (`vote_update`), `change_state`,
> `group_*` — Baileys exige inspeção de protocolMessage / decifrar voto.

**W6 — Webhook mais rico (sinais que hoje se perdem):**
capturar `message_reaction`, `vote_update`, `message_edit`, `message_revoke_*`,
`change_state`, `code`, `group_*` → novos eventos aditivos. Casa com a correção do
`recordHardSignal` morto (P1-5) e com o diagnóstico de estabilidade (`change_state`).

**W7 — Inbox e histórico:**
`getChats` + `fetchMessages` (popular o inbox ao conectar e puxar histórico de um lead) ·
`searchMessages` · gestão (archive/pin/mute/markUnread). Fecha o gap "inbox só tem o que
chega ao vivo".

> **Atualização 13/08 (sessão `wwebjs-w7-inbox`):** 1º incremento ENTREGUE — **backfill**.
> Descoberta que redefiniu o escopo: a LEITURA da inbox JÁ existia e é agnóstica de engine
> (`GET /messages/conversations` + `GET /messages`, servidas de `wa_messages`). O W7 virou
> POPULAR o banco: `IEngine.listChats`/`fetchChatHistory` (wwebjs via `getChats`/`fetchMessages`;
> Baileys → 501) + `POST /messages/sync` + `InboxSyncService` que grava direto no repo (dedup por
> keyId, **sem** EventBus → não dispara webhook/reply-rate). Mídia histórica sem binário.
> **Atualização 13/08 (sessão `wwebjs-w7b-chat-mgmt`):** gestão de chat ENTREGUE —
> `setChatFlag(chatJid, flag, enabled)` (archive/pin/mute/unread) via `POST /messages/:chatId/flag`,
> só WWEBJS (Baileys → 501: archive/markRead exigem app-state sync).
> **Atualização 13/08 (sessão `wwebjs-w7c-search`): W7 COMPLETO** — `searchMessages` via
> `GET /messages/search?q=` (busca no banco `wa_messages.text`, agnóstica de engine, alcança o
> histórico do backfill). Todos os itens do W7 entregues (inbox de leitura já existia; backfill +
> gestão de chat + busca adicionados).

> **Atualização 12/08:** 1º incremento ENTREGUE (sessão `wwebjs-w8-perfil-conta`) —
> **status/recado + nome de exibição** da conta, nas 2 engines. Restam: foto de perfil,
> membership requests, admin-only toggles, `getContactLidAndPhone`. W7 (inbox/histórico)
> segue pulado por assimetria (Baileys não tem `getChats` limpo).

**W8 — Perfil próprio + grupos avançados + canais:**
perfil (`setStatus`/`setDisplayName`/`setProfilePicture`, presença global) · membership
requests (approve/reject com anti-flood) · admin-only toggles · foto de grupo · canais
completos (decidir entrada no contrato). `getContactLidAndPhone` oficial substituindo o
LID artesanal entra aqui como robustez.

**Nota de risco transversal (vale para TODA nova capacidade no motor browser):** cada
método é um round-trip CDP no Chromium — **serializar**, respeitar o `sleep` anti-flood
embutido da lib (add/approve participants) e passar pelo **guard-rail** (G1–G8) como
qualquer envio. Recurso de escrita em massa (menção a muitos, aprovar N entradas) é
vetor de flag — tratar como envio cold (hard-gate 423) quando aplicável. E o custo de
RAM por sessão wwebjs continua (1 Chromium) — recurso novo não muda isso.

---

## Referências

- Contrato: `apps/gateway/src/modules/sessions/application/engine.port.ts`
- Motor: `apps/gateway/src/modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`
- Régua: `…/baileys/baileys.engine.ts` · Orquestração: `…/application/session-manager.service.ts`
- Docs: `motores-whatsapp.md` (matriz de engines) · `agent-whatzapp_api.md` §6B.10 (Chromium/RAM) ·
  `INTEGRACAO.md` §9-10 (leads/contatos) · `auditoria-2026-07.md` (itens 3-12,17,23)
- Pendências abertas correlatas: `PENDENCIAS.md` — P-001 (reconexão wwebjs), B-001 (proxy), P-002 (health-tester), P-004 (lint `auth/`)
