# Sessão 2026-08-13-2100 · wwebjs-store-travado (INVESTIGAÇÃO EM ABERTO)

> **Continuação** da sessão `wwebjs-proxy-anonimizado` (fix do proxy JÁ mergeado e em prod —
> `7e05fc1`). Esta abre um problema NOVO descoberto na validação pós-deploy: a página do
> WhatsApp Web da sessão wwebjs **trava** (getChats/sendMessage penduram 240s). Diagnóstico
> parcial; **falta ler os logs do Dokploy** (o dono ia logar) para fechar a causa raiz.

- **Branch a criar:** `feature/wwebjs-store-travado` (ainda NÃO criada — a investigação parou
  antes de tocar código; hoje está tudo na `main`, deploy `7e05fc1`).
- **Status:** 🔴 ABERTO — sintoma reproduzido e isolado; causa raiz NÃO confirmada (falta log).

---

## 🎯 PARA A PRÓXIMA SESSÃO — ordem de execução

### PASSO 1 — ler os logs do Dokploy (bloqueado em ação do dono: login)
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
