# 📌 PENDÊNCIAS — ConexoZenvo

> Quadro central (R9 · v4.3). Toda pendência descoberta em sessão entra AQUI na
> hora (não fica só no DONE-). Bloqueio que depende do dono/terceiro é B-xxx e
> vive no topo; pendência técnica é P-xxx e qualquer sessão pode assumir.
> Criado em 12/08/2026 (sessão `adocao-base-v43`), semeado com as pendências
> vivas do ESTADO.md e dos DONE- recentes.

## 🚧 BLOQUEADO EM MIM OU EM TERCEIRO (B-xxx — só o dono resolve)

### B-001 · 🟢 QUASE FECHADA — constatado 13/08 ~23h UTC (leitura da env de prod): `WA_REQUIRE_PROXY=true` JÁ ESTÁ LIGADO e o fix do forwarder (7e05fc1) está deployado

- **✅ Constatação 13/08 (sessão `wwebjs-store-travado`, leitura da Environment Settings):**
  `WA_REQUIRE_PROXY=true` presente na env de prod (linha 39) e o fix proxy-chain mergeado/deployado
  (`7e05fc1`, container de 20:01 UTC). Os 20 IPs residenciais estão importados e atribuídos.
  **Falta só o dono responder "B-001 feito"** (com a data em que ligou) para fechar formalmente —
  e remover o texto de contorno abaixo. Higiene residual: DIOGO (wwebjs) compartilha o proxy #1 com
  uma Baileys — mover p/ IP livre (P-014 plano revisado, item 2).

- **⚠️ DESCOBERTA 13/08 (sessão `wwebjs-proxy-anonimizado`):** os 20 IPs residenciais estão
  importados e atribuídos (1/sessão, Proxy fixo), MAS o **wwebjs não conseguia usá-los**: o
  Webshare responde o 407 do CONNECT com `Connection: close`, a auth por desafio do Puppeteer
  (`page.authenticate`) não completa e o Chromium falha com `ERR_TUNNEL_CONNECTION_FAILED` — e o
  gateway marcava o proxy (são) como DEAD a cada tentativa (falso "proxy morto"; teste ipify
  passa porque o Node manda `Proxy-Authorization` proativo). **Corrigido em código** na branch
  `feature/wwebjs-proxy-anonimizado` (forwarder local proxy-chain) — aguarda merge+deploy.
  Alternativa/adicional sem código: **IP Authorization** no painel Webshare (autorizar o IP do
  VPS → CONNECT sem credencial funciona no Chromium).

- **Ação:** concluir a migração para proxy RESIDENCIAL BR: importar os 20 IPs
  Webshare static residential em massa no painel (`user:pass@ip:porta`, source
  MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no
  Dokploy e re-vincular as sessões.
- **Quem:** Diogo (ação operacional no painel + Dokploy — R0).
- **O que bloqueia:** eficácia do hardening anti-flag entregue em 22/07 (o código
  está em produção, mas sem proxy residencial + guard ligado a proteção é parcial).
- **Pronto esperando:** fingerprint por sessão, log de conexão sem proxy e o guard
  `WA_REQUIRE_PROXY` (default false) — tudo em produção desde 22/07.
- **Devolver:** responder "B-001 feito" com a data em que `WA_REQUIRE_PROXY=true`
  entrou no Dokploy (vira registro em DECISOES.md).
- **Contorno em vigor:** `WA_REQUIRE_PROXY=false` (default seguro reverso — sessão
  conecta sem proxy e só LOGA) → removido por [P-002] ao desbloquear.

### B-002 · ✅ FECHADA 14/08/2026 ~14h UTC — build `2.3000.1045101284-alpha` + patch `$1` VALIDADOS em produção

- **✅ VALIDAÇÃO FINAL 14/08:** com o patch `$1` embarcado (`patches/whatsapp-web.js+1.34.7.patch`,
  deploy `a6b05ea`) e a env `WWEBJS_WEB_VERSION=2.3000.1045101284-alpha` (aplicada pelo dono,
  conferida na linha 65 pós-deploy): grupos listam/abrem ✓ · envio inbox ✓ · **leads de grupo real
  99/99 COM telefone e nome** ✓ · reconexão sem QR ✓ · dono relata operação "bem mais rápida".
  A MESMA build quebrava tudo em 13/08 SEM o patch — o patch era a peça que faltava.
  `DEFAULT_WEB_VERSION` do código atualizado para a build validada (commit local, push em janela).
- **Build expira 13/10/2026** → REVALIDAR ~início de outubro (procedimento: pinar candidata →
  sync 100% + leads com phone + envio → trocar env + default). Sem troca, o fallback live +
  patch seguram a operação (o patch tolera `_serialized` E `$1`).
- ⚠️ Aprendizado: builds `1045204510`/live travaram a sync de RECONEXÃO em 99% (4× seguidas);
  na `1045101284` completou. Env do Dokploy: salvar ≠ aplicar (precisa Deploy) e conferir a linha
  após o Save (edição pode não persistir).

<details><summary>Histórico da investigação (13-14/08)</summary>

#### 🟡 ROLLBACK 13/08 ~20h UTC: build 1045 INCOMPATÍVEL com a lib (SEM patch); PN OK na default

- **⚠️ DESCOBERTA 13/08 (sessão `wwebjs-proxy-anonimizado`):** a build `2.3000.1045101284-alpha`
  (aplicada às 13:44 UTC) é **INCOMPATÍVEL com o whatsapp-web.js 1.34.7** (que é a ÚLTIMA versão
  no npm — não há upgrade de lib). Sintomas em produção: `downloadMedia` falhando com erro
  minificado `"r"`, `syncAddressBook`/`getContacts` com `ProtocolError: Runtime.callFunctionOn
  timed out` (240s), `getChats` pendurado indefinidamente → grupos somem e envio trava com a
  sessão WORKING. **Rollback aplicado pelo dono ~19:50 UTC**: env voltou para
  `2.3000.1042271047-alpha` (a default do código, válida até **28/08**).
- **✅ Teste de PN PASSOU 13/08** (na build default): `GET .../groups/{g}/leads` num grupo real de
  99 membros → **99/99 com `phone`, 0 sem número**.
- **✅ Rollback confirmado NA ENV 13/08 ~23h UTC** (sessão `wwebjs-store-travado`, leitura da
  Environment Settings): `WWEBJS_WEB_VERSION=2.3000.1042271047-alpha` (linha 65). Expira **28/08**
  — o bisect ≤1044.x continua com prazo ~25/08. Obs.: a build candidata pode TAMBÉM resolver o
  travamento do Store (P-014) — testar as duas coisas juntas na janela do bisect.
- **🔄 PLANO REFORMULADO 14/08 (pesquisa `docs/pesquisa-wwebjs-2026-08.md`):** o "bisect de build
  estável ≤1044.x" tem premissa FURADA — o wa-version não tem curadoria (expire = released+60d
  mecânico; nada diz que uma build é mais segura que outra). O que quebrou na 1045 é o **rename
  `_serialized`→`$1`** do WA Web (erro minificado `r`/`t` — issues #201845/#201852, SEM fix mergeado
  na lib). Caminho com evidência: **build nova + patch `$1` via patch-package** (receita validada em
  produção por terceiros na issue #201852) — testar PN/leads + sync 100% numa sessão de teste ANTES
  de 28/08 (expiração da `1042271047`). NUNCA `auto`/`live` sem o patch.
- **⚡ ANTECIPADO E IMPLEMENTADO 14/08 ~13h UTC** (sessão `wwebjs-p015-shutdown-limpo`, branch
  `feature/wwebjs-b002-patch-s1`): pós-P-015 a DIOGO ficou NA BUILD LIVE (init pinado estoura 30s —
  perfil "migrado" pela live não reabre na build velha; efeito catraca) e o Modo B ativou em prod
  (envio entrega mas erra `reading 'id'`; leads 400; grupos não abrem). **Patch `$1` implementado**
  (`patches/whatsapp-web.js+1.34.7.patch` + patch-package no postinstall da raiz + `COPY patches`
  nos 2 Dockerfiles + teste que acusa patch ausente; 42/42 · tsc · eslint). **RESTA:** deploy →
  env `WWEBJS_WEB_VERSION=2.3000.1045204510-alpha` (expira 14/10) → teste de PN/leads na DIOGO
  ("B-002 feito" quando leads vierem com `phone`).

- **✅ Aplicado 13/08 ~13:44 UTC (pelo DONO):** `WWEBJS_WEB_VERSION=2.3000.1045101284-alpha`
  (`currentVersion` do wa-version, expira **~13/10/2026** — ~2 meses de folga) colada na env
  Environment Settings, salva e deployada. Container novo confirmado no `/health` (uptime 81s,
  ok, `memoryUsedPct 0.26`, checks true). Encerra o risco do pin antigo do código expirando hoje.
  (A 1ª tentativa via navegador do Claude não persistiu; o dono refez colando direto — ok.)
- **⏳ FALTA (só o dono, precisa da `X-Api-Key`):** o **teste de PN** — `GET /api/sessions/{s}/
  groups/{groupId}/leads` num grupo real e conferir se os leads vêm com `phone` preenchido.
  Se **sim** → responder "B-002 feito" e fechar (revalidar de novo ~início de outubro). Se
  **não** (PN escondido) → pinar uma build mais antiga. (O motor faz resolução ativa LID→telefone,
  então mesmo a build mais nova tende a devolver o número — o teste confirma.)

<details><summary>Histórico do pedido (12/08)</summary>

- **Ação:** revalidar e **pinar uma `WWEBJS_WEB_VERSION` válida** no Dokploy (env do
  gateway) — a atual (`2.3000.1042271047-alpha`) expira ~fim de agosto/2026. Escolher
  uma versão nova em `github.com/wppconnect-team/wa-version` que **ainda exponha o
  número dos participantes** (builds novas escondem o PN no rollout LID) e confirmar
  numa extração de leads real antes de fixar.
- **Quem:** Diogo (ação operacional no Dokploy — R0).
- **O que bloqueia:** uso intenso do wwebjs "nos próximos dias" — se a versão expirar
  durante o uso, o fallback `live` degrada a extração de leads (perde o número).
- **Pronto esperando:** o código já tem fallback (`handleInitFailure` tenta `live` +
  WARN) e aceita `auto`/versão fixa por env — falta só a decisão da versão a fixar.
- **Devolver:** responder "B-002 feito" com a versão fixada e a data.
- **Contorno em vigor:** default fixo no código + retry `live` automático — segura a
  operação, mas com risco de LID-only; **não substitui** a revalidação.
- **Cenário em 12/08 (consulta ao `wa-version`):** o `currentVersion` é
  `2.3000.1045049472-alpha` e as builds atuais expiram **~12/10/2026** (2 meses). O
  default fixado no código (`2.3000.104227…`) é mais antigo e vence ~fim de agosto → o
  fallback `live` vai começar a agir em breve (com risco de esconder o PN).
- **Procedimento de revalidação (ordem):**
  1. Numa sessão wwebjs de teste, pinar um candidato em `WWEBJS_WEB_VERSION` (começar
     por uma build **próxima do default atual**, subindo aos poucos — as mais novas
     tendem a esconder o número).
  2. Rodar `GET /api/sessions/{s}/groups/{groupId}/leads` num grupo real e conferir se
     os leads ainda vêm com `phone` preenchido (PN exposto).
  3. Fixar no Dokploy a **build mais nova que AINDA expõe o PN** e que dê a maior janela
     até expirar. Evitar `auto`/`live` (trazem a mais nova = risco de LID-only).
  4. Anotar a versão + data aqui e responder "B-002 feito".

</details>

</details>

## 📋 Pendências técnicas (P-xxx — qualquer sessão assume)

| ID    | Pendência                                                                                                                                                | Origem                                   | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| P-001 | Estabilidade de sessão P1/P2: watchdog de conexão, auto-heal DEGRADED, tratamento granular de DisconnectReason, reconexão wwebjs                          | DONE-2026-07-21-estabilidade (backlog)   | aberta |
| P-002 | Health-tester de proxies só testa ipify — não prova reputação junto ao WhatsApp; avaliar teste de reputação + remover contorno do B-001 quando resolvido | DONE-2026-07-22-hardening-antiban        | aberta |
| P-003 | Node n8n (repo `n8n-nodes-conexozenvo-gateway`): parâmetro `proxyId` opcional na criação de sessão + picker de `/proxies/available` (aditivo, minor)      | D-008                                    | aberta |
| P-004 | Lint local: `apps/gateway/auth/` nos ignores · normalizar Prettier · `format:check` no CI                                                                 | ESTADO.md § próximos passos (entra na M3) | aberta |
| P-005 | Job de purge de `refresh_tokens` expirados (índice em `expiresAt` já existe)                                                                              | D-009 (backlog)                          | aberta |
| P-006 | Ondas de adoção v4.3: A8 projeção `.claude/` · A9 gates de docs · A10 bateria única + catracas · A11 reorganização docs/ — plano em `ADOCAO.md`            | D-011 (sessão adocao-base-v43)           | aberta |
| P-007 | **wwebjs W1 (P0):** ✅ reconexão automática + fim do `start` no-op · ✅ guard `WA_REQUIRE_PROXY` no wwebjs · ✅ 1º teste da engine real (entregues 12/08, sessão `wwebjs-w1-estabilidade`). **RESTA (B/operacional):** revalidar/pinar `WWEBJS_WEB_VERSION` no Dokploy antes de expirar (~fim ago/2026) — P0-4 | analise-wwebjs-2026-08 (P0-1/2/4)        | parcial |
| ~~P-008~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w2-midia`): mídia inbound `downloadMedia`+S3 e outbound `mediaKey` · envelope de webhook com `engine` REAL (via `engineName` na IEngine) · `sendMediaAsDocument`/`Sticker` + guard de `sent` null | analise-wwebjs-2026-08 (P0-3, P1-1)      | ✅ |
| ~~P-009~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w3-ciclo-vida`): `purgeAuthDir` limpa o LocalAuth em disco no new-qr/logout/remove (fim do vazamento de perfil + new-qr recupera) · `destroy()` com teto · `qrBase64`/cache LID com teto no stop · `nope()`→HTTP 501 | analise-wwebjs-2026-08 (P1-2/3/6)        | ✅ |
| ~~P-010~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w4-superficie`): os 14 `nope()` implementados (grupos completos, checkNumbers, profilePicture, setBlock, canais beta) — paridade IEngine com o Baileys. **Residual movido p/ P-012** (recordHardSignal, dashboard por engine, anti-flag wwebjs, announce/restrict) | analise-wwebjs-2026-08 (P1-4/5, P2)      | ✅ |
| P-013 | **Formalizar em `packages/contracts` os campos da W5** (não tocados por conflito R9 com a sessão ativa `auth-refresh`): `mentions?: string[]` em `SendTextRequest` + tipo `SendReactionRequest { emoji }`. Hoje validados por zod + documentados em INTEGRACAO.md; formalizar quando `auth-refresh` fechar | sessão wwebjs-w5-mensagens-ricas          | aberta |
| P-012 | **wwebjs polimentos residuais:** ✅ `announce`/`restrict` reais (12/08, `p012-announce-restrict`) · ~~dashboard por engine~~ **OBSOLETO** · ✅ **anti-flag wwebjs** (12/08, `wwebjs-qualidade-max`): UA realista e estável POR SESSÃO (determinístico, paridade com o browser-fingerprint do Baileys) + `WWEBJS_USER_AGENT`/`WWEBJS_*` no zod + doc no env de prod. **RESTA:** `recordHardSignal` sem chamador (`signal.463`/`signal.restriction` = catálogo morto nas 2 engines — exige decisão de produto: fiar a sinal real × remover do contrato público com plano de versão R0) | analise-wwebjs-2026-08 (P1-5, P2)        | parcial |
| P-011 | **wwebjs recursos NOVOS (W5–W8, aditivo ao contrato):** ✅ W5/W5b (reações, menções, localização, poll) · ✅ W6 1º incremento (`message.reaction`) · ✅ W8 perfil próprio (status/nome/foto) · ✅ **W8 grupos avançados** (12/08, `wwebjs-qualidade-max`): membership requests (list/approve/reject c/ anti-flood), settings announce/restrict, foto de grupo — nas 2 engines. **RESTAM:** W6 (edit/revoke/vote_update/change_state/group_* — Baileys exige protocolMessage/decifrar) · **W7 COMPLETO ✅** (13/08): backfill (`POST /messages/sync`) · gestão de chat (`POST /messages/:chatId/flag`, wwebjs/501 Baileys) · busca (`GET /messages/search`, agnóstica de engine) · canais completos (getSubscribers/transfer/delete) · vCard · reply/quote (Baileys sem `raw` inbound). Catálogo em `analise-wwebjs-2026-08.md` §7–§8 | analise-wwebjs-2026-08 parte 2           | aberta |
| P-016 | **wwebjs: probe de página no caminho de ENVIO** (`sendText`/`sendMedia`/rotas de mensagem): com a página do Store travada, o envio pendura no CDP e o painel aborta em silêncio — "não envia e não dá erro" (visto 14/08). Fazer o probe leve (getState com teto ~10s) ANTES do envio e devolver erro acionável; NUNCA teto no envio em si (mensagem pode entregar após o estouro → duplicata). Também: watchdog de sync via `lastLoadingPct` (P-001) e manter `WA_LOG_LEVEL=info` até lá | sessão wwebjs-p015-shutdown-limpo (14/08) | aberta |
| P-015 | **wwebjs: QR exigido a CADA troca de container** (mesmo com perfil virgem — 4 ocorrências em 13-14/08). Restart interno de sessão reconecta SEM QR; troca de container SEMPRE invalida. Suspeita dominante: shutdown com **mutex de ciclo de vida ocupado** (página travada prende logout/stop) estoura o teto de 15s do `onModuleDestroy` → processo morre com Chromium no meio de escritas → perfil sujo → WhatsApp rejeita. **✅ CÓDIGO ENTREGUE 14/08** (sessão `wwebjs-p015-shutdown-limpo`, branch própria): `shutdown()` na engine (bypass do mutex — destroy direto com teto de 12s, sem persistir status p/ não quebrar o autostart) chamado pelo `onModuleDestroy` (que agora loga duração e QUAIS sessões estouraram os 15s) · teto de 8s no `client.logout()` (fecha o GAP "Logout/Parar presos" de 14/08) · `stopped` síncrono no stop/logout (paridade Baileys) · marcador `.gateway-clean-shutdown` no perfil: start com perfil presente e sem marcador loga WARN "encerramento sujo" (confirma/refuta a hipótese em prod). 41/41 testes · tsc · eslint. **CAUSA RAIZ CRAVADA E CORRIGIDA 14/08 ~10:40 UTC: o app gateway no Dokploy estava SEM NENHUM volume montado** ("No volumes/mounts configured" — o passo do runbook `deploy-dokploy.md` §2 nunca foi executado). O LocalAuth vivia no FS efêmero do container: restart interno preserva a writable layer (sem QR); troca de container descarta (QR sempre, mesmo "perfil virgem"). Hipóteses anteriores: shutdown sujo = co-fator (fix `13a2de8` fica — higiene + marcador de diagnóstico); overlap start-first = DESCARTADA (Update Config do Swarm está VAZIO → default stop-first; runbook recomendava start-first mas nunca foi aplicado). **Correção executada via navegador (dono logado, autorizou):** Volume Mount `gateway-wwebjs` → `/data/wwebjs` criado + Deploy manual (Done 48s, container `d92e3599c91a`); prova do mount no boot: `[entrypoint] corrigindo dono de /data/wwebjs para node`. **✅ VALIDADA 14/08 ~10:56 UTC: redeploy de validação trocou o container e a DIOGO voltou SEM QR** (log: reidratação → loading 0→99% sem evento de QR; boot sem chown = mesmo volume). **Residuais** (detalhe no ATIVA da sessão): (i) shutdown do velho ainda fechou sujo — grace 10s do Docker < teto 12s do destroy → reduzir `destroyTimeoutMs` p/ ~7s (1 linha, juntar com o passo 2 do B-002); (ii) a sessão atual caiu na webVersion LIVE (init 1 estourou 30s → fallback) — risco B-002/`$1`: dar 1 "Reiniciar" interno na DIOGO em janela calma p/ voltar à build pinada e conferir leads com `phone`. Watch Paths conferido no painel (chips corretos de 13/08) | sessão wwebjs-store-travado (14/08)      | ✅ resolvida (volume + shutdown limpo; validada 14/08 — 2 trocas sem QR) |
| P-014 | 🟢 **RESOLVIDO na prática (14/08 ~01:45 UTC)** — wwebjs: página do Store travava após reconexões de QR — sessão WORKING mas `getChats`/`sendMessage` penduram os 240s do `protocolTimeout` e estouram. Isolado (13/08): **não é proxy** (Baileys usa o mesmo #1 e vai bem; forwarder proxy-chain subiu sem fallback) **nem memória** (heap 8%). **Log do Dokploy LIDO 13/08 ~23h**: os `info` da engine estão suprimidos (`WA_LOG_LEVEL=warn` na env — `loading_screen`/forwarder/"usando proxy" invisíveis por construção); só 2 warns de timeout CDP (17:12/17:24 BRT, pós-ready de cada QR); zero `change_state`, zero "Store ainda sincronizando" (chamadas PENDURAM no CDP, nunca falham com store-undefined). **EXECUÇÃO 13/08 ~23:30–23:50 UTC**: `WA_LOG_LEVEL=info` aplicado (redeploy) · DIOGO movida #1→**#27** (IP dedicado) · restart único limpo (reconectou sem QR) · **PROBE: `getChats` AINDA pendura 240s** ⇒ não é rajada de QR nem proxy — hipótese principal: perfil pós-new-qr nunca completa a sincronização na build `1042271047` (o PN/leads funcionava às 19:50, ANTES do purge). Código do teto/probe ENTREGUE na branch `feature/wwebjs-store-travado` (`a43fb63`, 34/34 testes). **CAUSA CRAVADA + PESQUISA 13-14/08** (`docs/pesquisa-wwebjs-2026-08.md`): sync pós-subida é loteria (100% ok × 99%-stuck × página 100% mas evaluates pendurados). Evidência da comunidade: **injeção concorrente pós-QR** (`framenavigated` de iframes → 3-4 sets de listeners por scan) — **fix mergeado no repo em 25/06 (commit `1780711`, PR #201653) e AUSENTE do npm 1.34.7**; + `getChats` varre `Store.Chat` em mutação durante sync de conta pesada (#3485; `getChatById` não passa por `_models`). Mitigação nossa (teto/probe c/ % na msg) EM PROD e validada (erro em 10-45s c/ diagnóstico, 175 grupos retornaram pós-QR). **GO dado 14/08 (D-012, foco somente wwebjs): dep PINADA no commit `1780711` via tarball** (branch da sessão; 34/34 testes, tsc, eslint) — **resta merge+deploy e validar ciclos de QR em prod**. Depois: preferir `getChatById` onde couber (#3485) e o passo 2 do plano (patch `$1` + build nova, B-002). **✅ VALIDADO EM PROD 14/08 ~01:45 UTC**: pin `1780711` + `groupInfo` SEM `getContacts` (nomes vêm do banco via `resolveNames`; o `getContacts` tardio era o assassino que travava o event loop) + auto-heal (reload via CDP sem QR). DIOGO recriada (proxy fixo #30): 175 grupos <10s, clique em grupo pequeno (5 membros com phone/nomes/papéis) E grande (**253 membros**) respondeu em SEGUNDOS — fim do travamento E da lentidão de minutos. **RESTA:** passo 2 (build nova + patch `$1` até 28/08, B-002) e P-015 (QR a cada troca de container). Futuro: watchdog auto-reload (P-001, usa `lastLoadingPct`). Obs: busca do Dokploy quebra com `:` no termo | sessão wwebjs-store-travado (13/08)      | ✅ resolvido na prática |
