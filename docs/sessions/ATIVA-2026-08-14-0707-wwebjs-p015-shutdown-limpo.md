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

## Validação em prod (após merge+deploy — dono, R0)

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
