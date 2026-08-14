# Sessão 2026-08-14-0707 · wwebjs-p015-shutdown-limpo

> Assume a **P-015** (registrada 14/08 pela sessão `wwebjs-store-travado`): QR exigido a CADA
> troca de container do gateway (4 ocorrências 13-14/08), mesmo com perfil virgem — restart
> interno de sessão reconecta SEM QR; troca de container SEMPRE invalida o LocalAuth.

- **Branch:** `feature/wwebjs-p015-shutdown-limpo`
- **Escopo:** `wwebjs.engine.ts` (ciclo de vida/shutdown) + `engine.port.ts` (método opcional) +
  `session-manager.service.ts` (onModuleDestroy) + teste e2e + docs. ⚠️ Sobreposição com o escopo
  da sessão `wwebjs-store-travado` (ATIVA, mas o próprio arquivo dela declara a rodada ENCERRÁVEL
  com P-014 resolvida) — aviso registrado em SESSOES.md 📢.
- **Status:** 🟡 EM VALIDAÇÃO (mergeado na main e **pushado 14/08 ~10:15 UTC**, `13a2de8` — deploy
  rodou; passo 1 da validação executado, ver abaixo) — resta a 2ª troca de container
- **Validação passo 1 EXECUTADO 14/08 ~10:20 UTC:** deploy trocou o container e a DIOGO **pediu QR
  como previsto** (1ª troca — o container velho encerrou pelo código SEM o fix; 5ª ocorrência da
  P-015, a última esperada). Dono escaneou. Próximo: aguardar sync 100% + sessão estável → conferir
  o WARN `perfil existente SEM marca de fechamento limpo` no log do boot → **2ª troca** (Redeploy
  único no Dokploy) → esperado: `shutdown fechou o Chromium limpo` no encerramento e volta **SEM
  QR** com `perfil fechado limpo na última execução` no boot novo.

## Diagnóstico (herdado da P-015 + leitura do código)

Cadeia do shutdown sujo:

1. `SessionManager.onModuleDestroy` (`session-manager.service.ts:91`) chama `engine.stop()` com
   teto GLOBAL de 15s.
2. `WWebJSEngine.stop()` passa pelo **mutex de ciclo de vida** (`serialize`, `wwebjs.engine.ts:242`).
   Se uma operação pendurada segura a fila — ex.: `doLogout` chama `client.logout()` **SEM teto**
   (`wwebjs.engine.ts:816`; evaluates numa página travada penduram até o protocolTimeout de 240s) —
   o `doStop` **nunca começa** dentro dos 15s.
3. Teto estoura → Nest segue o shutdown → processo morre → Chromium leva SIGKILL **no meio de
   escritas do perfil** → LocalAuth sujo → WhatsApp rejeita na volta → QR.

Agravante encontrado: diferente do Baileys (`baileys.engine.ts:1519`), o `stop()`/`logout()` do
wwebjs NÃO marca `stopped=true` fora da fila — reconexão agendada pode disputar com um stop
enfileirado.

Restrição descoberta: `findAutostart` (`prisma-session.repository.ts:105`) só reidrata status
WORKING/STARTING/SCAN_QR/PAIRING/DEGRADED — o caminho novo de shutdown **não pode** persistir
`STOPPED` (senão a sessão não volta no boot do container novo).

## Plano

1. `WWebJSEngine.shutdown()` — **bypass do mutex**: `destroy()` direto da lib com teto próprio
   (~12s), fecha forwarder; **sem** setStatus (preserva autostart). IEngine ganha `shutdown?()`
   opcional; Baileys segue no `stop()` (socket fecha rápido).
2. Teto no `client.logout()` dentro do `doLogout` (GAP "Logout/Parar presos" da sessão
   store-travado): race ~8s → segue para destroy+purge.
3. `stopped=true` síncrono no `stop()`/`logout()` (paridade com Baileys).
4. `onModuleDestroy`: usa `shutdown()` quando existir + **log de duração e de estouro** (quais
   sessões não fecharam em 15s — P-015 fica observável).
5. Marcador **"fechado limpo"** no authDir: escrito após destroy OK (stop/shutdown), consumido no
   start seguinte — start sem marcador com perfil presente loga WARN (prova/refuta a hipótese da
   P-015 em prod).
6. Testes e2e (padrão `wwebjs-engine.e2e-spec.ts`) + tsc + lint.

## ✅ ENTREGUE 14/08 ~07:20 (tudo do plano, na branch)

- `wwebjs.engine.ts`: `shutdown()` público (bypass do mutex; destroy com teto `destroyTimeoutMs`
  12s; NÃO emite status; grava marcador só se `hadClient && clean`) · teto `logoutTimeoutMs` 8s no
  `client.logout()` via `raceStoreOp` (warn no estouro, segue destroy+purga) · `stopped=true`
  síncrono em `stop()`/`logout()` · `destroyWithTimeout(): boolean` (limpo × estouro) · marcador
  `CLEAN_SHUTDOWN_MARKER` (`.gateway-clean-shutdown`) gravado no fechamento limpo e consumido no
  `doStart` (attempt 0 apenas — retry interno não loga WARN falso): perfil presente sem marcador →
  WARN "encerramento sujo (P-015)".
- `engine.port.ts`: `shutdown?()` opcional na IEngine (Baileys não precisa — socket fecha rápido).
- `session-manager.service.ts` `onModuleDestroy`: usa `shutdown()` quando existe; loga duração
  total e QUAIS sessões estouraram o teto de 15s.
- Testes: +5 no `wwebjs-engine.e2e-spec.ts` (bypass do mutex com fila presa · teto do destroy ·
  marcador gravado/consumido/WARN de sujo · shutdown sem client não mascara · teto do logout).
  **41/41** · `tsc --noEmit` OK · eslint OK · prettier OK. Bateria e2e completa NÃO rodou
  (Docker/infra local parados — mesma convenção das sessões wwebjs anteriores: spec da engine).

## 🔴 2ª TROCA FALHOU (14/08 ~10:3x UTC) — QR pedido de novo → CAUSA REVISADA: overlap start-first

O dono fez o redeploy de validação e a DIOGO **pediu QR de novo**. Releitura do repo achou o
mecanismo que o fix do shutdown não cobre — **`docs/deploy-dokploy.md` §2 configura o Update
Config do Swarm com `"Order": "start-first"`** (zero-downtime):

1. No deploy, o container NOVO sobe (StartPeriod 60s) **enquanto o velho ainda roda** — ambos com
   o volume `/data/wwebjs` montado.
2. O boot novo reidrata a DIOGO e roda `clearStaleSingletonLocks` (`wwebjs.engine.ts:~287`), que
   **apaga o SingletonLock do Chromium AINDA VIVO do container velho** — a premissa do código
   ("1 container por volume → lock remanescente é sempre de processo morto") é violada pelo
   start-first.
3. **Dois Chromium abrem o MESMO perfil ao mesmo tempo** → corrupção (LevelDB/IndexedDB) e/ou o
   WhatsApp vê duas conexões da mesma sessão → invalida → QR.
4. Só depois de o novo ficar healthy o velho recebe SIGTERM — o shutdown limpo (fix de hoje) roda
   TARDE DEMAIS. O shutdown sujo era real, mas é CO-FATOR, não a causa dominante.

Explica tudo: QR a CADA troca (overlap em todo deploy, mesmo perfil virgem) e restart interno sem
QR (mesmo container, sem overlap). Assinatura esperada nos logs (confirmação): boot novo com WARN
`perfil existente SEM marca de fechamento limpo` (o velho ainda nem encerrou quando o novo lê o
perfil) e `Reidratando sessão "DIOGO"` com timestamp ANTERIOR ao `Shutdown: todas as engines
fecharam` do container velho.

**Correção (dono, Dokploy — R0):** gateway → Advanced → Swarm Settings → Update Config →
`"Order": "stop-first"` (mantém Parallelism 1, Delay, FailureAction rollback). Trade-off: deploys
ganham ~30–90s de API fora (boot+migrations); em troca a sessão wwebjs sobrevive ao deploy. O
"zero-downtime" nunca valeu para o WhatsApp — todo deploy invalidava a sessão e exigia QR.
Runbook `deploy-dokploy.md` será atualizado após a mudança confirmada.

**Se stop-first + shutdown limpo AINDA pedir QR:** próximo suspeito = criptografia de perfil
atada à identidade do container (Chromium sem `--password-store=basic` nos args usa keyring
derivado do ambiente; container novo = chave nova). Fix de 1 linha nos args, se preciso.

## 🎯 CAUSA RAIZ CRAVADA 14/08 ~10:40 UTC — VOLUME NUNCA FOI MONTADO (operação via navegador, dono logado)

Inspeção do app `conexozenvo` no Dokploy (projeto campanha/production, id `B2ComxiJzaEbaOiLBH_Rv`):

- **Advanced → Volumes: "No volumes/mounts configured"** — o passo do runbook
  (`deploy-dokploy.md` §2: Volume Mount `gateway-wwebjs` → `/data/wwebjs`) **nunca foi executado**.
  O perfil LocalAuth vivia no filesystem EFÊMERO do container: restart interno (mesmo container)
  preserva a writable layer → reconecta sem QR; **troca de container descarta tudo → perfil
  virgem → QR SEMPRE**. Explica as 6+ ocorrências, inclusive "mesmo com perfil virgem".
- **Swarm Settings → Update Config: VAZIO** (Order "Select order") — a hipótese do overlap
  start-first estava ERRADA (runbook recomenda start-first, mas nunca foi aplicado; default do
  Swarm = stop-first, sem overlap). Lição: runbook ≠ estado real — auditar o painel antes de
  teorizar.
- Shutdown sujo (fix de hoje) = co-fator teórico; o código fica (higiene + observabilidade do
  marcador, que segue útil no volume).

**EXECUTADO (com autorização do dono, via navegador):**
1. Volume Mount criado no app gateway: `VOLUME · gateway-wwebjs · /data/wwebjs` ✓ (persistido,
   visível na lista).
2. Deploy manual disparado ~10:39 UTC → **Done em 48s** → container novo `d92e3599c91a` healthy.
3. **Prova do mount no log do boot:** `[entrypoint] corrigindo dono de /data/wwebjs para node
   (uid 1000)...` (volume recém-criado nasce root; o chown condicional rodou). Baileys
   reidratando normalmente na sequência.
4. Watch Paths do gateway CONFERIDO no painel: chips `apps/gateway/**`, `packages/contracts/**`,
   `package.json`, `package-lock.json` presentes (config de 13/08 intacta). O deployment com
   título do commit de docs era provavelmente o Redeploy manual do dono (reusa o título do
   último build) — sem evidência de furo no filtro; observar no próximo push doc-only.

**RESTA (validação final):**
1. (Dono) Escanear o QR da DIOGO — **última vez** (o volume começou vazio; o perfil antigo morreu
   com o container efêmero). Aguardar sync 100% + grupos ok. Remover aparelhos "Chrome (Linux)"
   zumbis no celular, se sobrarem.
2. Uma troca de container (Redeploy único, janela calma) → esperado: **volta SEM QR** + no
   encerramento `shutdown fechou o Chromium limpo` + no boot `perfil fechado limpo na última
   execução`. Isso fecha a P-015 de vez.

## ✅ VALIDAÇÃO FINAL 14/08 ~10:51–10:56 UTC — TROCA DE CONTAINER **SEM QR** (P-015 resolvida)

Dono escaneou o QR (~10:45), sync 100%, e autorizou o redeploy de validação (executado via
navegador ~10:50; Done em 3s — cache total, só service update). Container novo `c0cc32f058ac`:

- **Boot SEM linha de chown** → o dono de `/data/wwebjs` já era `node` = **o MESMO volume
  atravessou a troca** (prova de persistência).
- `Reidratando sessão "DIOGO" (WWEBJS)` → proxy #30 + forwarder ✓ → **NENHUM evento de QR** →
  `loading_screen 0% → 95% → 99%` = **o WhatsApp ACEITOU o perfil do volume**. 🎉
- **QR a cada troca de container: RESOLVIDO.** (Baileys todas reconectaram normal; conflito
  `replaced` transitório no swap = esperado no stop-first.)

### Residuais registrados (não bloqueiam a P-015)

1. **Shutdown do container velho ainda fechou SUJO** (WARN `SEM marca de fechamento limpo` no
   boot novo): grace period do Docker (10s default) < teto do destroy (12s) — o SIGKILL corta o
   destroy antes do marcador. O perfil sobreviveu MESMO sujo (LevelDB aguentou), mas para o
   marcador funcionar como detector fino: **reduzir `destroyTimeoutMs` para ~7s** (1 linha) no
   próximo incremento de código (juntar com o passo 2 do B-002 antes de 28/08 — evita swap só
   para isso).
2. **Sessão atual caiu na webVersion LIVE**: a 1ª tentativa de init estourou
   (`Waiting failed: 30000ms` — provável recuperação lenta do perfil sujo) e o fallback subiu
   SEM a versão pinada `1042271047`. Risco: build live = rename `$1` (B-002) → leads podem vir
   LID-only e Store pode instabilizar (teto/probe/auto-heal cobrem). **Recomendação: 1
   "Reiniciar" interno da DIOGO no painel em janela calma** (sem QR — restart interno preserva) →
   volta à build pinada. Conferir grupos + leads com `phone` depois.
3. Loading parou em 99% no log (padrão P-014 da sync); sem erro até 10:56. Se grupos travarem, o
   auto-heal (reload) atua; senão, é cosmético da build live.

## 🔧 INCREMENTO B-002 (14/08 ~12:30–13:00 UTC) — patch `$1` + build nova (branch `feature/wwebjs-b002-patch-s1`)

**Gatilho:** pós-validação da P-015, o restart interno reconectou sem QR MAS a sessão ficou na
webVersion **LIVE** (o init com a pinada `1042271047` estourou 30s 2×— perfil "migrado" pela build
nova não reabre na antiga; efeito catraca). Sintomas em prod relatados pelo dono: envio do painel
ENTREGA mas erra na volta (`Cannot read properties of undefined (reading 'id')` — serialização da
key com `$1`), texto fica no input; `GET /groups/:g/leads` → 400; grupos não abrem. Baileys ok
(não passa pelo WA Web) — descarta API/código nosso. **É o Modo B da pesquisa (rename
`_serialized`→`$1`), agora ativo na nossa sessão.** Antecipado o passo 2 do plano (era "antes de
28/08"; virou AGORA).

**Implementado (receita da issue #201852, patch de @choudharyabdullah, validado em produção por
terceiros — colada nos comentários da issue; buscada via `gh api`):**
- `patches/whatsapp-web.js+1.34.7.patch` (gerado com `patch-package` a partir das edições reais na
  lib instalada — o tarball do commit `1780711` só difere no `Client.js`, os arquivos-alvo são os
  do 1.34.7): helper `window.WWebJS.getMsgKeyId` (`_serialized` OU `$1`) usado em
  sendMessage/editMessage/lastReceivedKey · restauração de `_serialized` no `getMessageModel` ·
  `getChats` sequencial com isolamento por chat · guard no `groupMetadata.update` · try/catch
  "already exists" no `exposeFunctionIfAbsent`.
- Raiz: `patch-package` em devDependencies + script `postinstall`. **Fidelidade testada:** rm da
  lib + `npm install` limpo → "Applying patches… ✔" e edições presentes.
- Dockerfiles (gateway + dashboard): `COPY patches ./patches` ANTES do `npm ci` (sem isso o
  postinstall rodaria sem a pasta e a imagem subiria SEM o patch).
- Residual P-015 embarcado: `destroyTimeoutMs` 12s → **7s** (< grace de 10s do Docker; era o que
  impedia o marcador de "fechado limpo" de ser gravado no swap).
- Teste novo: spec falha alto se a lib instalada não tiver o patch (pega `patches/` fora do COPY).
- 42/42 testes · tsc · eslint · prettier.

**Plano de aplicação:** push (deploy do gateway com patch) → mudar env
`WWEBJS_WEB_VERSION=2.3000.1045204510-alpha` (currentVersion, expira **14/10**) no Dokploy
(navegador, autorizado) → validar na DIOGO: envio sem erro no painel, grupos abrem,
`GET /groups/:g/leads` com `phone` (o teste de PN decide o B-002; o motor tem resolução ativa
LID→PN em lote). `DEFAULT_WEB_VERSION` do código só sobe após essa validação.

## ✅✅ DESFECHO 14/08 ~14:00 UTC — TUDO FUNCIONANDO (B-002 VALIDADA) + mapa minucioso do dia

### Estado final validado em produção

- **Build viva:** `WWEBJS_WEB_VERSION=2.3000.1045101284-alpha` (env linha 65, conferida com zoom
  pós-deploy; o dono a colocou — sobrescreveu a `1043890899` que eu havia salvo; o deploy aplicou
  a dele). **Expira 13/10/2026** → revalidar ~início de outubro.
- **Validação funcional (dono + curl):** grupos listam e abrem ✓ · envio pela inbox ✓ (sem o erro
  `reading 'id'`, texto não fica preso) · **leads do grupo real: `total:99, withNumber:99,
  withoutNumber:0`** com nome e papel ✓ · reconexão SEM QR ✓ · dono relata tudo "bem mais rápido".
- **Combinação vencedora:** lib pinada commit `1780711` (fix injeção concorrente, D-012) + **patch
  `$1`** (patch-package, receita #201852) + build 104x pinada + volume `gateway-wwebjs` (perfil
  persistente) + teto/probe/auto-heal (P-014) + shutdown limpo (P-015).
- **Prova do valor do patch:** a MESMA build `1045101284` que em 13/08 (sem patch) quebrou
  downloadMedia/getContacts/getChats hoje roda 100% (com patch).

### Cadeia de causas do dia (cada uma cravada com evidência)

1. **P-015 (QR a cada deploy)** → app SEM volume montado ("No volumes/mounts configured");
   perfil no FS efêmero. Fix: Volume Mount `gateway-wwebjs`→`/data/wwebjs`. Validado: 2 trocas de
   container SEM QR.
2. **Shutdown sujo** (co-fator) → stop() atrás do mutex + logout sem teto + grace 10s < teto 12s.
   Fix: `shutdown()` bypass do mutex + teto 8s no logout + `destroyTimeoutMs` 7s + marcador
   `.gateway-clean-shutdown` (diagnóstico que guiou o dia inteiro).
3. **Catraca de perfil** → perfil sincronizado por build nova não reabre na `1042271047` (init
   estoura 30s → fallback live). Explicou os "reconectou mas quebrado".
4. **Rename `$1`** (Modo B) → na live sem patch: envio entrega mas erra `reading 'id'`, leads 400,
   grupos mudos. Fix: patch `$1` embarcado (postinstall + COPY patches nos 2 Dockerfiles + teste
   que acusa patch ausente).
5. **Sync 99% na reconexão** (Modo A) → na `1045204510` empacou 4× seguidas (boot, 2 auto-heals,
   1 restart); na `1045101284` completou e liberou tudo. Auto-heal e probe funcionaram como
   projetados (erro acionável em 10s, reload automático com cooldown).

### Aprendizados operacionais registrados (para não repetir)

- Editor de env do Dokploy: **salvar ≠ aplicar** (env só entra com Deploy manual) e a edição via
  navegador pode não persistir — SEMPRE reabrir e conferir a linha após Save (2 ocorrências: 13/08
  e hoje).
- Watch Paths OK (push doc-only não deploya — reconfirmado); deployment manual reusa o título do
  último commit (não confundir com webhook).
- `docs/deploy-dokploy.md` corrigido: mount = passo crítico; stop-first (start-first com volume
  compartilhado = 2 Chromium no mesmo perfil).

### Melhorias mapeadas (backlog — "seguimos procurando")

1. **Probe no caminho de envio** (`sendText`/`sendMedia` etc.): hoje página travada = silêncio na
   inbox (front aborta). Probe leve ANTES do envio (nunca teto no envio — duplicata). → P-016.
2. **Watchdog de sync** (P-001, agora com sinal): `lastLoadingPct` <100 por N min → auto-heal
   preventivo (hoje o heal só dispara quando uma operação falha).
3. **Rotacionar a `X-Api-Key`** (exposta 2× em chat — pendente desde 13/08) + tirar
   `Webshare 20 proxies.txt` da raiz do repo (untracked com credenciais).
4. **Revalidação da build ~início out/2026** (expira 13/10) — procedimento: pinar candidata em
   sessão de teste → sync 100% + leads com phone + envio → trocar env + default.
5. Reverter `WA_LOG_LEVEL` para `warn`? MANTER `info` enquanto watchdog/P-016 não existem (o
   diagnóstico de hoje só foi possível com info).
6. `getChatById` em vez de `getChats` onde couber (#3485, barato) — pendente da pesquisa.

## 🌊 CICLO DA TARDE 14/08 (~14:20–15:40 UTC) — crashes de mídia, 4GB, e o diagnóstico refinado da re-sync

1. **Crash de renderer ×2** (`Target crashed` no downloadMedia, grupos de promo) → página morta →
   1º caso derrubou até o container (provável OOM do cgroup 2GB; Swarm recriou task sem deploy).
2. **Entregues em prod**: teto de download de mídia 24MB + heal em crash + probe no envio + retry
   da pinada (`1595ac7`) · heal p/ página CRASHADA em todos os caminhos (`ccc17b1`, P-017c) ·
   **Memory Limit 2GB → 4GB** (autorizado pelo dono; persistência conferida; heap Node auto-ajusta
   p/ 2GB via entrypoint).
3. **Diagnóstico REFINADO (contra-evidência do dono)**: pós-QR a MESMA conta roda leve ⇒ não é
   peso de conta; é o caminho INCREMENTAL da re-sync de reconexão que empaca em 99% (bootstrap
   3/3 ✓; incremental ~10× ✗, em 3 builds). Regra operacional: reconexão não-confiável;
   re-pareamento confiável; deploys de gateway em lote/janela (podem custar re-scan).
4. **Recuperações do dia**: 3 re-scans de QR (todos com sync 100% imediata). Estado final ~15:40:
   dono confirma "após QR tudo ok" (grupos + inbox + curl).
5. **P-019 codada SEM deploy** (commit local `25cad0c`): watchdog 60s → 3 falhas = DEGRADED com
   "re-escaneie o QR" + heal; recupera WORKING sozinho. Entra no próximo lote.
6. Pendências estruturais registradas: P-018 (Baileys não-pareadas em loop de QR — alívio manual:
   pausar autostart) · rotação da X-Api-Key · fix upstream da re-sync é do ecossistema (wa-js tem
   compat fixes; fora de escopo por D-012 — opção futura se o incremental seguir quebrando).

## Validação em prod (roteiro original — SUPERSEDIDO pelo achado acima; 1ª troca executada)

1. Deploy em janela calma. **A 1ª troca de container ainda pode pedir QR** (o container VELHO
   encerra sem o fix e o perfil atual pode já estar sujo) — escanear e deixar sincronizar 100%.
2. No boot novo, conferir no log: `perfil existente SEM marca de fechamento limpo` (esperado na
   1ª vez) e depois `Shutdown: todas as engines fecharam em Xms` no PRÓXIMO encerramento.
3. Fazer a 2ª troca de container (redeploy qualquer): a sessão wwebjs deve voltar **SEM QR** e o
   log do boot deve mostrar `perfil fechado limpo na última execução`. Isso fecha a P-015.
4. Se a 2ª troca AINDA pedir QR **com** o log de "fechado limpo" no boot → hipótese refutada,
   investigar causa alternativa (perfil gravado por build incompatível; ver B-002/patch `$1`).

## ECO DE LEITURA (R9 v4.3)

- ESTADO: P-014 resolvida na prática (pin `1780711` + groupInfo sem getContacts + auto-heal, tudo
  em prod); em prod está `3e74d25`+`0e89017`+`4e30159`; main local sincronizada (docs `1ac2455`).
- PENDENCIAS: P-015 aberta (esta sessão assume) · B-002 prazo 28/08 (build nova + patch `$1`) ·
  B-001 quase fechada (falta o "B-001 feito" do dono) · P-001/002/003/004/005/006/011/012/013 vivas.
- SESSOES ativas: M2 (docs/guardrail), auth-refresh (iam/contracts), wwebjs-proxy-anonimizado
  (fix já em prod), wwebjs-store-travado (encerrável; escopo sobrepõe — aviso 📢 registrado).
- Avisos: `GUARDRAIL_ENFORCE=true` em prod diverge da M2 (a reconciliar pela sessão M2) ·
  `WA_LOG_LEVEL=info` aplicado 13/08 (reverter p/ `warn` quando P-014/P-015 fecharem) · base v4.3.

## DOCS TOCADAS nesta sessão

- Este arquivo (novo) · `SESSOES.md` (registro + 📢) · (no encerramento: `PENDENCIAS.md` P-015,
  `ESTADO.md`, `CHANGELOG` se houver)

---

## 🏁 CHECKPOINT DE ENCERRAMENTO (R9 v4.3) — 14/08/2026 ~16:10 UTC

**Status final:** ✅ ENCERRADA. Produção estável (dono: "após QR tudo ok" ~15:35 UTC).

**Entregue (tudo em prod, exceto onde marcado):**
- P-015 ✅ volume `gateway-wwebjs` + shutdown limpo (bypass mutex, teto logout 8s, destroy 7s,
  marcador de fechamento, logs de estouro) — 2 trocas de container SEM QR validadas.
- B-002 ✅ patch `$1` (patch-package) + build `2.3000.1045101284-alpha` (leads 99/99 com phone;
  expira 13/10). P-007 ✅ por consequência. DEFAULT_WEB_VERSION atualizado.
- P-016 ✅ probe no envio · P-017 ✅ teto de mídia 24MB + heal em crash (todos os caminhos) +
  retry da pinada · Memory Limit 4GB · runbook deploy-dokploy revisado (mount crítico, stop-first).
- P-019 **codada, NÃO deployada** (`25cad0c` na main local) — watchdog anti-"WORKING falso".
- Decisões: D-013 (patch/build) e D-014 (operação + regra deploy=re-scan).
- Descobertas operacionais: env do Dokploy salvar≠aplicar (e edição pode não persistir — conferir);
  deployment manual reusa título do último commit; Watch Paths OK; re-sync INCREMENTAL de
  reconexão empaca em 99% nas builds atuais (bootstrap pós-QR completa 3/3 — contra-evidência do
  dono refinou o diagnóstico: não é peso de conta).

**Reconciliação documental (diff × R3):** ESTADO (deploy/divergência/próximos passos), SESSOES
(histórico + 📢 novo sobre deploy=re-scan e main local à frente), PENDENCIAS (B-002/P-007/P-015/
P-016/P-017 fechadas; P-018/P-019 registradas), DECISOES (D-013/D-014), CHANGELOG (bloco 14/08),
deploy-dokploy.md (revisado de manhã). Nada do diff ficou sem doc.

**BLOQUEADO EM VOCÊ (dono):**
1. Janela para o lote de deploy: push do `25cad0c` (P-019) — 1 troca de container, possível 1
   re-scan do QR. Avisar qual momento.
2. P-018 alívio: pausar/desligar autostart das sessões Baileys não-pareadas (`contatoX`) no painel.
3. Segurança: rotacionar a `X-Api-Key` (exposta 2× em chat) · remover `Webshare 20 proxies.txt`
   da raiz do repo (untracked com credenciais).
4. ~Início de outubro: revalidar a build do WA Web (expira 13/10) — procedimento no B-002.
5. Reverter `WA_LOG_LEVEL` para `warn` SÓ depois do P-019 em prod (o info é o diagnóstico até lá).

**DOCS TOCADAS nesta sessão:** este arquivo · ESTADO.md · SESSOES.md · PENDENCIAS.md ·
DECISOES.md (D-013/D-014) · CHANGELOG.md · deploy-dokploy.md · código: `wwebjs.engine.ts`,
`engine.port.ts`, `session-manager.service.ts`, Dockerfiles (2), `package.json`/lock,
`patches/whatsapp-web.js+1.34.7.patch`, `wwebjs-engine.e2e-spec.ts` (52 testes).
