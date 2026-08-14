# Sessão 2026-08-13-2100 · wwebjs-store-travado (INVESTIGAÇÃO EM ABERTO)

> **Continuação** da sessão `wwebjs-proxy-anonimizado` (fix do proxy JÁ mergeado e em prod —
> `7e05fc1`). Esta abre um problema NOVO descoberto na validação pós-deploy: a página do
> WhatsApp Web da sessão wwebjs **trava** (getChats/sendMessage penduram 240s). Diagnóstico
> parcial; **falta ler os logs do Dokploy** (o dono ia logar) para fechar a causa raiz.

- **Branch a criar:** `feature/wwebjs-store-travado` (ainda NÃO criada — a investigação parou
  antes de tocar código; hoje está tudo na `main`, deploy `7e05fc1`).
- **Status:** 🟠 EM PROGRESSO — PASSO 1 (log) EXECUTADO em 13/08 ~23h UTC (dono logou no Dokploy;
  leitura via navegador). Causa raiz ainda não cravada, mas o PORQUÊ da cegueira foi: ver abaixo.

---

## ✅ PASSO 1 EXECUTADO (13/08 ~23:00 UTC) — o log NÃO tem o que o plano mandava procurar, e o motivo é config

**Descoberta central: `WA_LOG_LEVEL=warn` na env de prod** (Environment Settings, linha 33) —
o logger das ENGINES é um pino separado do global (`session-manager.service.ts:121`, nível via
`WA_LOG_LEVEL`, default `error` em `bootstrap/config.ts:86`). TODOS os logs de diagnóstico do
plano são `logger.info` (`wwebjs.engine.ts`): `loading_screen` (:439), "usando proxy" (:279),
"forwarder local proxy-chain" (:359), pairing code (:484). **Com warn, nenhum deles chega ao
Dokploy** — a busca por `loading_screen` era impossível por construção. (O ProxyResolver usa o
logger GLOBAL `LOG_LEVEL`=info, por isso os "Sessão … → proxy #N" aparecem.)

**Evidência colhida no log do container `abe412edcad7` (boot 17:01:43 BRT = 20:01 UTC, janela 5000 linhas cobre o boot):**

| Hora (BRT) | Evento |
| ---------- | ------ |
| 17:01:48 | Boot: todas as sessões resolvem proxy; Baileys `01KWJQGVSS…` → **proxy #1** `104.165.153.111:5744` |
| 17:02:06 | `POST /sessions/01KZXVSMXZZT9EJ4EPRRVPBM4Y/start` (DIOGO wwebjs, browser) → **proxy #1** (compartilhado!) |
| 17:12:09 | ⚠️ warn: `Runtime.callFunctionOn timed out` (240s) em `getContacts` (syncAddressBook pós-ready do 1º QR ~17:05) |
| 17:16:15 | `POST /start` DIOGO de novo → **proxy #1** de novo (2ª reconexão de QR) |
| 17:24:06 | ⚠️ warn: mesmo timeout de `getContacts` (pós-ready do 2º QR ~17:16-17) |
| 17:58–18:44 | Só re-resoluções de proxy das Baileys (#1 e #2) — nada mais da wwebjs |

**O que NÃO apareceu (e apareceria, pois são warn/error):** `change_state` (sem CONFLICT/UNPAIRED/
TIMEOUT), "Store ainda sincronizando" (o retry do `withStoreReady` NUNCA atuou — as chamadas não
falham com "store undefined", elas PENDURAM no CDP até o protocolTimeout), fallback do forwarder
(o proxy-chain subiu OK), proxy marcado DEAD, disconnected. **Conclusão reforçada:** página abre,
WS conecta (WORKING), forwarder OK — mas os `Runtime.callFunctionOn` no Store nunca resolvem.
Consistente com sincronização pós-login incompleta após new-qr em rajada (com `purgeAuthDir` =
login do zero), ou Store da build antiga travando. Falta o `loading_screen` para cravar → 1º
passo agora é DESTRAVAR A OBSERVABILIDADE (abaixo).

**Envs confirmadas na aba Environment (13/08 ~23h UTC):**
- `WA_LOG_LEVEL=warn` (linha 33) — causa da cegueira acima.
- `WA_REQUIRE_PROXY=true` (linha 39) — **JÁ LIGADO** (docs diziam pendente; B-001 na prática concluída). ⚠️ Invalida o PASSO 2 como escrito (teste sem-proxy seria BLOQUEADO pelo guard — engine recusa e vira FAILED).
- `WWEBJS_WEB_VERSION=2.3000.1042271047-alpha` (linha 65) — rollback do B-002 confirmado na env (expira 28/08; bisect ≤1044.x segue com prazo ~25/08).
- `GUARDRAIL_ENFORCE=true` (linha 63) — **DIVERGÊNCIA com ESTADO.md/M2** (docs dizem observação `false`). Confirmar com o dono se foi intencional → se sim, M2 está de fato ligada e a onda precisa ser reconciliada.

## ✅ EXECUÇÃO 13/08 ~23:30–23:50 UTC (continuação — passos 1, 2 e restart FEITOS; sintoma PERSISTE)

- **`WA_LOG_LEVEL=info` aplicado** (dono salvou na env; Dokploy auto-redeployou ~23:30 UTC, redeploy
  de 5s sem rebuild — container novo `4d128e828504`). Confirmado `WWEBJS_WEB_VERSION=1042271047`
  na env (linha 65).
- **DIOGO movida do proxy #1 → #27 `104.165.159.224:5357`** (IP livre; painel Proxies →
  Atribuição por sessão → Salvo ✓). Fim do compartilhamento com a Baileys "Diogo". #30 segue livre.
- **Restart ÚNICO da DIOGO** (~23:40 UTC): Iniciando → Conectado em ~1 min SEM pedir QR
  (LocalAuth reaproveitado — reconexão W1 ok).
- **PROBE (painel Grupos, sessão DIOGO): `getChats` pendurou 240s → `Runtime.callFunctionOn
  timed out`.** 🔴 **O travamento NÃO é rajada de QR nem proxy compartilhado**: persiste com
  restart limpo + proxy dedicado + container novo.
- **Leitura atualizada da causa:** o teste de PN (leads 99/99, usa o MESMO Store) passou às
  ~19:50 UTC na MESMA build — antes das reconexões. O que mudou foi o **login do ZERO**
  (new-qr → purgeAuthDir): a sincronização pós-login desse perfil novo nunca completa (na build
  `1042271047`, que expira 28/08) e a página fica com evaluates pendurados PARA SEMPRE — mesmo
  após restarts (o perfil meio-sincronizado persiste no LocalAuth). **Prova final: `loading_screen`
  no log do container atual (info já ligado)** — travado em X% <100 crava; se nem aparece, a página
  trava antes do progresso.
- **Código entregue nesta branch (`a43fb63`)**: `raceStoreOp` + probe `getState()` (10s) + teto
  45s/tentativa no `withStoreReady` + `lastLoadingPct` na mensagem de erro. 34/34 testes ·
  tsc/eslint/prettier OK. **Aguardando: ler o loading_screen ANTES de mergear+deployar** (o
  deploy troca o container e perde o log da evidência).
- ⚠️ Login do Dokploy EXPIROU no meio (~23:45) — a leitura final do log ficou bloqueada no dono
  logar de novo.

### 🎯 CAUSA CRAVADA (13/08 ~23:55 UTC — loading_screen lido com o dono logado)
Progressão no container `4d128e828504` (horários BRT): **20:22 `0%` → 20:27 `100%` ✅** (1ª subida,
auto-restore no boot — sincronizou COMPLETA) · **20:37:52 `0%` → 20:38:00 `70%` → :01 `87%` →
:02 `99%` 🔴 e NUNCA progrediu** (2ª subida, o restart da validação). Conclusão: **a
re-sincronização pós-subida é uma LOTERIA na build `1042271047` — às vezes fecha (100%), às vezes
empaca nos últimos 1% (99%) e aí TODO evaluate do Store pendura para sempre** (getChats/
getContacts 240s → `Runtime.callFunctionOn timed out`). Não é proxy, não é rajada de QR, não é
memória. Os travamentos de 17:12/17:24 e o probe 20:42 são o MESMO fenômeno (sync empacada).
Errata: o filtro de busca do Dokploy quebra com `:` — "wwebjs:" retornava vazio e escondeu a 1ª
subida; usar termos sem dois-pontos (ex.: `carregando`, `wwebjs`).

**Mitigações:** (a) código desta branch (teto/probe — erro acionável em ~10s com o % da sync na
mensagem, em vez de 240s mudo); (b) operacional: restart re-rola a loteria até pegar 100%;
(c) DEFINITIVO (candidato): bisect B-002 (~25/08) numa build ≤1044.x que sincronize estável —
testar grupos+leads+phone E a sync 100% na mesma janela; (d) futuro (P-001 watchdog): auto-reload
quando o loading não atingir 100% em N min — agora há sinal (`lastLoadingPct`) para isso.

### 📌 GO DO DONO 14/08 — FOCO SOMENTE WWEBJS (D-012) + PIN DO COMMIT `1780711`
- Dono decidiu (~00:30 UTC): **escopo de engine = somente wwebjs** (Baileys rc14 e wa-js fora,
  registrados como opções na pesquisa). GO para o item 1 do plano da pesquisa.
- **Implementado nesta branch**: `apps/gateway/package.json` → `whatsapp-web.js` sai do npm
  `^1.34.7` e vira **tarball do commit `1780711a1c86dfeca7c5ba6a66f950eac93dde28`** (main do
  `wwebjs/whatsapp-web.js`, contém o PR #201653 — fix da injeção concorrente pós-QR, AUSENTE do
  npm). Tarball (não git URL) porque o stage de build do Docker não tem `git` e tarball não roda o
  `prepare` da lib. Lockfile atualizado (URL + integrity sha512).
- **Verificação**: commit confere na API GitHub (só `src/Client.js` +347/−288); código instalado
  tem filtro main-frame (`frame.parentFrame() !== null`), `_framenavigatedRegistered`,
  `_wwjsListeners`; versão segue 1.34.7; deps idênticas (puppeteer 24.38.0). 34/34 testes ·
  tsc · eslint OK. Racional completo: D-012 em `DECISOES.md` + `pesquisa-wwebjs-2026-08.md` §4.
- **Validação em prod (após merge+deploy)**: subir a DIOGO, fazer 1-2 ciclos de QR (o gatilho do
  P-014) e confirmar: sem hang de Store, `ready` único, grupos respondendo. Se ainda oscilar logo
  pós-login (sync pesada legítima), o teto/probe segue cobrindo a UX.
- **Próximo passo depois desta validação (B-002)**: build nova + patch `$1` via patch-package
  ANTES de 28/08 (expiração da `1042271047`).
- Validação da rodada anterior (pós-scan ~00:10-00:20 UTC): sync 100% → 1º `getChats` OK (175
  grupos) → depois evaluates pendurando com o teto novo respondendo em 10-45s com o % na mensagem
  (comportamento esperado do código novo; o hang de fundo é o que o pin do `1780711` ataca).

### 📊 VALIDAÇÃO DO PIN `1780711` EM PROD (14/08 00:38–01:15 UTC) — vitória parcial + 2 achados novos
- Deploy `4e30159` DONE (1m57s — `npm ci` com o tarball do GitHub passou; integridade OK).
- Container `1bd4656aa2a7` (00:38 UTC): log agora mostra **"Reidratando sessão DIOGO (WWEBJS)"**
  (auto-restore do wwebjs EXISTE) com proxy #27 + forwarder ✓ — mas a reidratação não vingou
  (QR exigido; **3ª vez seguida** que troca de container invalida o LocalAuth — suspeita: perfil
  gravado pela build 1045 com chaves `$1` misturadas + shutdowns sujos).
- Dono escaneou QR ~00:43 UTC → `loading_screen` **direto a 100%** (00:43:31) →
  🎉 **"agenda sincronizada para o diretório" count=1696** (00:43:55) — **o `getContacts` que
  SEMPRE estourava 240s FUNCIONOU com a lib pinada.** Evidência forte de que o `1780711` age.
- 00:50 UTC: um `syncAddressBook` posterior falhou com **erro VAZIO** (`e:{}`) — é o **reload
  interno** que o WhatsApp Web faz pós-pareamento ("Execution context was destroyed" nos probes
  do painel). Depois do reload a página segue instável (probes 10s/45s estouram intermitentes;
  um `getChats` retornara 175 grupos antes, na rodada anterior).
- **ACHADO/GAP nosso**: `Logout`/`Parar` do painel PRESOS — o `client.logout()` da lib faz
  evaluates SEM teto na página travada e segura o **mutex de ciclo de vida** (W1); o Parar
  enfileira atrás. **Correção a fazer (próximo incremento): teto também no ciclo de vida**
  (race no `logout()` com fallback direto para `destroy()`+purge).
- **Suspeita a investigar**: possível troca extra de container (`cd9041d1efe3` → `1bd4656aa2a7`,
  ~00:41→00:38?) sem novo deployment — se confirmado crash de processo, o PR **#201893** (aberto,
  serializa inject e evita unhandled rejection do exposeFunction derrubar o Node) vira candidato.
- **Plano acordado com o dono (perfil zerado sem excluir a sessão)**: desconectar o aparelho
  PELO CELULAR (Aparelhos conectados → sair do "Chrome (Linux)") → lado servidor derruba a
  sessão → o cliente destrava → Logout no painel (purga LocalAuth) → Conectar → **um** scan
  de QR num perfil 100% virgem, sincronizado só pela build 1042 + lib pinada.

### 🔬 RODADA FINAL 14/08 00:50–01:35 UTC — ASSASSINO IDENTIFICADO + otimização/auto-heal deployados
- **Perfil VIRGEM testado** (dono desconectou pelo celular → Reload do Dokploy matou o Chromium
  zumbi → QR limpo ~01:17): grupos carregaram RÁPIDO (getChats ✓)… e o **clique no grupo travou a
  página de novo** ⇒ perfil envenenado NÃO era a causa única.
- **ASSASSINO CRAVADO: `getContacts()` tardio.** `groupInfo` → `resolveParticipantsBatch` →
  `getContacts()` (enriquecia NOMES) trava o event loop da página para sempre — só funciona
  imediatamente pós-login (agenda 1696 às 00:43). Com o teto de 45s, caía no fallback
  `getContactById` um-a-um (N round-trips) → o "chegou mas demorou MUITO" do dono. O TELEFONE dos
  leads nunca veio daí (vem do `p.id` + cache + lote `getContactLidAndPhone`, inofensivo).
- **Correções deployadas (`0e89017`, push 01:24 UTC — commit direto na main, nota de processo):**
  1. `resolveParticipantsBatch` SEM `getContacts`/`getContactById` — nomes via
     `deps.contacts.resolveNames` (BANCO, zero CDP); phone inalterado (lote LID). groupInfo em
     segundos.
  2. **Auto-heal**: probe de página morta dispara `pupPage.reload()` automático em background
     (sem QR; re-injeção garantida pelo commit 1780711), single-flight + cooldown 120s.
  3. Testes 36/36 · tsc · eslint · prettier.
- **P-015 REGISTRADA**: QR exigido a CADA troca de container (4 ocorrências) mesmo com perfil
  virgem; restart interno reconecta sem QR. Suspeita: shutdown com mutex de ciclo de vida preso
  estoura o teto de 15s do `onModuleDestroy` → Chromium morre sujo → perfil rejeitado. Correção
  proposta na pendência (bypass do mutex no shutdown + logs).
- **Decisão do dono registrada**: build nova do WA Web (passo 2 — patch `$1` + pinar recente)
  fica para a PRÓXIMA janela calma, antes de 28/08.
- **✅ VALIDADO EM PRODUÇÃO 14/08 ~01:45 UTC** (sessão DIOGO recriada pelo dono, id novo
  `01KZYXFPRKD6JB3S513HEPNYS2`, proxy fixo **#30** `104.165.159.16:5149`):
  - `getChats` (175 grupos) em <10s ✓
  - **Clique no grupo — o teste que SEMPRE travava — respondeu em segundos**: grupo pequeno
    `[DOCTA] Contas a Pagar` (5 membros COM telefone, nomes Dudu/LM/Samuel/Yuri e papéis
    admin/superadmin) E grupo grande `!519 Inteligência Artificial` (**253 membros**) — ambos
    listaram participantes com número. **P-014 RESOLVIDO na prática.**
  - A otimização (`groupInfo` sem `getContacts`) eliminou o travamento E a lentidão de minutos.
- **P-014 → resolvido operacionalmente.** Resta o passo 2 (build nova + patch `$1` antes de 28/08)
  e a P-015 (QR a cada troca de container). Rodada da sessão store-travado ENCERRÁVEL (R9).

### 🚀 DEPLOY DO FIX TETO/PROBE 13/08 23:56 UTC (merge `3e74d25` → push → build 1m03s DONE)
- **Watch Paths Teste 2 VALIDADO**: push de código disparou o build automaticamente.
- Container novo `cd9041d1efe3` saudável; teto/probe EM PRODUÇÃO.
- ⚠️ **DIOGO subiu pedindo QR** ("Aguardando QR") no boot novo — o LocalAuth não foi aceito
  (sequela provável: sync morta em 99% + gateway reiniciado no meio). **BLOQUEADO NO DONO:
  escanear o QR** (celular do 5517988340999). Pós-scan, a sync re-rola a loteria: grupos
  respondendo rápido = ok; erro novo citando "sincronização vista em X%" = travou → Reiniciar
  e repetir (ou antecipar o bisect da build).

## 🎯 PLANO REVISADO (substitui a ordem antiga; passos antigos mantidos abaixo para contexto)

1. **(Dono, 2 min — R0)** Dokploy → conexozenvo → Environment: mudar `WA_LOG_LEVEL=warn` →
   `WA_LOG_LEVEL=info` (temporário, para diagnóstico) → Save → Deploy em janela calma (reinicia o
   gateway). Reverter para `warn` quando P-014 fechar.
2. **(Dono, painel — higiene D-008)** Mover a DIOGO para um IP LIVRE do pool (há 19 ALIVE) — hoje
   ela compartilha o #1 com a Baileys `01KWJQGVSS…` (violação 1 proxy = 1 sessão, confirmada no log
   2×). Isso também serve de teste de isolamento SEM desproteger (não usar o teste sem-proxy do
   antigo PASSO 2 — `WA_REQUIRE_PROXY=true` o bloqueia).
3. **UM restart da DIOGO (sem rajada)** e acompanhar o log com info ligado: `loading_screen` % →
   se trava <100% = sincronização não completa (causa cravada); se chega a 100% e `getChats` ainda
   pendura = Store/build → reforça o bisect do B-002 (a build 1044.x pode resolver TAMBÉM isto).
4. **Código (branch `feature/wwebjs-store-travado`), DEPOIS do log acima:** teto próprio no
   `withStoreReady` (Promise.race ~30–45s por tentativa, sem cancelar CDP subjacente — serializar
   operações pesadas) + gate `storeReady` com PROBE leve + teto (não depender só do evento
   `loading_screen`, que pode nem disparar — zero ocorrências observadas até em conexões que
   funcionaram).
5. **Segurança (dono):** rotacionar a `X-Api-Key` vazada (`cz_WeeXSF…`) — pendente desde 13/08.
   E tirar o arquivo `Webshare 20 proxies.txt` (credenciais dos 20 proxies) da RAIZ do repo —
   está untracked, um `git add .` descuidado o commitaria.

---

## 🗄️ PLANO ORIGINAL (13/08 21h — SUPERSEDIDO pelo "PLANO REVISADO" acima; mantido para contexto)

> ⚠️ Correções descobertas na execução: o PASSO 1 era impossível como escrito (`WA_LOG_LEVEL=warn`
> suprime os info da engine) e o PASSO 2 está INVÁLIDO (`WA_REQUIRE_PROXY=true` em prod bloqueia
> start sem proxy).

### PASSO 1 — ler os logs do Dokploy (✅ executado 13/08 ~23h, ver seção acima)
Painel Dokploy `http://187.77.248.160:3000` → projeto **campanha/production** → app **conexozenvo**
(gateway, id de serviço `B2ComxiJzaEbaOiLBH_Rv`) → aba **Logs** → **Limit 5000** → filtrar por
`wwebjs`. Procurar, na janela desde a última reconexão da sessão DIOGO (WWEBJS):
- **`loading_screen`** com `percent` — se travou em X% < 100 ⇒ **sincronização não completa**
  (a causa mais provável). Se chegou a 100 ⇒ Store sincronizou e o problema é outro.
- **`change_state`** — `CONFLICT` (outro WhatsApp Web aberto com a conta) / `UNPAIRED`
  (desvinculado pelo celular) / `TIMEOUT`.
- **`Store ainda sincronizando, aguardando…`** (withStoreReady tentando) e o erro final
  `Runtime.callFunctionOn timed out … syncAddressBook/getContacts falhou`.
- **`forwarder local (proxy-chain)`** — confirma que o proxy autenticado subiu (deve aparecer
  no start; a presença prova que o fix do proxy está ativo).

### PASSO 2 — se o log NÃO for conclusivo: teste sem-proxy (autorizado pelo dono como plano B)
Isola se o forwarder/proxy é o gargalo do Chromium (o Baileys usa o mesmo proxy e vai bem, mas o
Chromium baixa MUITO mais na sincronização inicial):
1. `PUT /api/sessions/{DIOGO}/proxy` mode `NONE` (ou painel Proxies → DIOGO → sem proxy) → Salvar.
2. `POST /api/sessions/{DIOGO}/restart` → aguardar WORKING.
3. `GET /api/sessions/{DIOGO}/groups` — **se responde rápido ⇒ o proxy/forwarder é o gargalo do
   Chromium**; se ainda pendura 240s ⇒ é a sincronização/wwebjs em si (não o proxy).
4. **DEVOLVER o proxy** (mode SINGLE, um IP livre — ver higiene abaixo) e restart. Não deixar
   sem proxy (anti-flag). `WA_REQUIRE_PROXY=false` hoje, então o teste é permitido.

### PASSO 3 — otimização de código (só DEPOIS de confirmar a causa — não codar às cegas)
- **Timeout próprio no `withStoreReady`** (`wwebjs.engine.ts:~1303`): hoje, se o `fn()` (ex.:
  `getChats`) **pendura** (não lança), o withStoreReady espera o `protocolTimeout` inteiro
  (**240s**, `wwebjs.engine.ts:404`) antes de devolver erro → péssima UX (o dono espera 4min por
  um 400). Envolver cada tentativa num `Promise.race` com teto (~30–45s) e reintentar/abortar com
  mensagem acionável. **Cuidado:** o race NÃO cancela a chamada CDP subjacente (fica órfã no
  Chromium) — dimensionar o teto para não abortar sincronização legítima e evitar acúmulo de
  chamadas órfãs (serializar as operações pesadas de Store já ajuda).
- **Gate de "pronto de verdade"**: só liberar operações que dependem do Store (getChats,
  groupInfo, leads, syncAddressBook) quando o `loading_screen` chegou a **100%** — hoje o `ready`
  pode disparar antes da sincronização completa (doc wwebjs: `ready` = inicializado; a
  sincronização offline segue no `loading_screen`). Guardar um flag `storeReady` setado no
  loading 100% (ou num probe leve pós-ready) e fazer as rotas pesadas esperarem por ele com teto.
- Fonte da doc (Context7 `/wwebjs/whatsapp-web.js`): `getChats()` → `Promise<Chat[]>`; o client
  emite `loading_screen(percent, message)` no "offline progress update"; `ready` dispara na
  inicialização (antes da sincronização completa em builds recentes).

### PASSO 4 — higiene (independente da causa)
- **Proxy compartilhado (corrigir):** DIOGO (wwebjs) e "Diogo" (Baileys) estão **no mesmo proxy
  `#1` `5TV5CZ` `104.165.153.111:5744`**. O modelo é 1 proxy = 1 sessão (D-008/STICKY exclusivo).
  Atribuir à DIOGO um IP LIVRE do pool (há 19 ALIVE; os `…5TV5CZ`/`…1NXAR9` já estão em uso pelas
  Baileys). Painel Proxies → card DIOGO → escolher IP livre → Salvar → restart.
- **NÃO reconectar o QR em rajada** — cada `new-qr`/logout faz `purgeAuthDir` (login do ZERO) e
  reinicia a sincronização pesada; foi o que empilhou o problema hoje. Fazer UM restart e ESPERAR.

---

## 📋 Evidência coletada (13/08 ~21:00 UTC, via navegador)

| Fato | Medição |
| ---- | ------- |
| `GET /groups` (DIOGO) | **pendura 240s** → `400 Runtime.callFunctionOn timed out` (protocolTimeout) |
| `POST /messages/text` (DIOGO, auto-envio) | **pendura** (abort aos 30s) — nem envio funciona |
| Status DIOGO | `WORKING` (mas página do Chromium travada) |
| Timeline DIOGO | múltiplos STOPPED→STARTING→SCAN_QR→WORKING (20:05, 20:16-17) = **reconexões repetidas** |
| Proxy DIOGO | `#1 5TV5CZ` — **MESMO** da Baileys "Diogo" (que está WORKING e enviou em 1,7s) ⇒ **proxy OK** |
| `/health` | ok · heap **8%** · RAM **22%** · rss 274MB · container 2GB ⇒ **sem pressão de recurso** |
| summary.sessions | WORKING 3 · DEGRADED 7 · STOPPED 9 |

**Conclusão parcial:** a página do WhatsApp Web da sessão wwebjs travou; **não é proxy** (Baileys
usa o mesmo e vai bem) **nem memória**. Gatilho provável: sincronização pós-login não completou
após as reconexões de QR em sequência. **Falta o log do `loading_screen` para cravar.**

---

## 🔒 Contexto herdado (já resolvido na sessão anterior — não reabrir)
- **Fix do proxy autenticado (proxy-chain):** MERGEADO e em prod (`7e05fc1`). O QR da DIOGO
  apareceu **através do proxy** = o túnel funciona. Este problema é DEPOIS do túnel.
- **Build 1045 incompatível:** revertida para `2.3000.1042271047-alpha` (default, válida até
  **28/08**). Teste de PN passou (99/99 com phone) ANTES das reconexões. Bisect da build nova
  (≤ série `1044.x`) segue pendente no **B-002** (prazo ~25/08).

## 🔑 Ação de segurança do dono (fora de código)
- **Rotacionar a `X-Api-Key`** que vazou no chat hoje (`cz_WeeXSF…`) — painel → API keys → revogar
  + criar nova + atualizar no n8n.

## ECO DE LEITURA (R9 v4.3)
- ESTADO: W1–W8 wwebjs em prod; deploy `7e05fc1` (fix proxy). B-001/B-002 abertos.
- PENDENCIAS: B-001 (proxy — 20 IPs importados/atribuídos), B-002 (build/bisect), P-011/012/013 vivas.
- SESSOES ativas: M2 (docs) e auth-refresh (iam/contracts) — escopos disjuntos.
- Avisos: base v4.3 (eco de leitura + reconciliação no encerramento).

## DOCS TOCADAS nesta sessão
- Este arquivo (novo) · `SESSOES.md` (registro) · `PENDENCIAS.md` (P-014 nova).
