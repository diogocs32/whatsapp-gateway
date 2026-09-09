# Sessão: logs-sem-erro-batido

- **Status:** 🟢 ATIVA — código entregue na branch; aguarda decisão do dono (merge + deploy)
- **Início:** 09/09/2026 14:00 (BRT) — na mesma conversa que validou o deploy `2836c65` em produção
- **Objetivo:** pedido do dono, literal: _"melhore os logs para não passar nenhum erro batido"_.
  Todo erro que o gateway pega tem de aparecer no log do Dokploy como UMA linha JSON com
  contexto (sessão, rota, motivo, stack) — sem catch mudo, sem `{}` no lugar do erro, sem texto
  solto multi-linha de lib misturado ao JSON.
- **Escopo (tocou):** `apps/gateway/src/bootstrap` (log-redaction, console-bridge NOVO,
  logging-exception.filter NOVO, main.ts, app.module.ts), `modules/sessions` (wwebjs + Baileys +
  session-manager), `modules/webhooks` e `modules/campaigns` (filas BullMQ), `modules/iam`
  (api-key repo, auth-session), `modules/messaging` (controller), `test/setup-app.ts`, docs.
- **Fora do escopo:** dashboard, contratos, schema, deps, o formato dos eventos/webhooks.
- **Branch:** `feature/logs-sem-erro-batido` (base `2836c65` = produção).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** produção = `2836c65` (ondas A–H da auditoria, deploy 09/09 16:41 UTC, validado
  nesta conversa — ver DONE da sessão `aplicacao-auditoria`). Esta branch NÃO está em produção.
- **SESSOES.md:** `lid-envio-wwebjs` (alheia) segue listada como ativa — não toco.
  `aplicacao-auditoria` encerrada aqui (DONE com a validação do deploy).
- **PENDENCIAS.md:** P-041 (regressão do statusCode no request-log) e P-042 (logs sem erro
  batido) criadas nesta sessão. B-003 ganhou evidência (sessão `ddd` pareou em prod após o
  deploy) mas continua no dono.
- **Travas:** TS 5.9.3 · wwebjs tarball + patch intocados · Baileys rc14 intocado · sem
  migration · sem mudança de contrato `/api` (R0) · push na main = deploy stop-first (janela do
  dono).

## Diagnóstico (evidência de produção, container `7192ca1ec8cd`, 09/09 16:41–17:00 UTC)

1. **`res.statusCode` = `null` em 100% das linhas `request completed`** (47/47 amostradas) e
   `res.headers` ausente. Causa: regressão da onda A (ABE-08/P-032, `8f50861`) — o pino-http
   EMBRULHA serializers customizados (`wrapResponseSerializer`: `custom(std(res))`), então o
   objeto que chega ao nosso serializer JÁ está serializado; reaplicar `stdSerializers.res` lia
   `headersSent` de um objeto sem essa propriedade → `statusCode: null`. O nível (warn para 4xx)
   estava certo porque `customLogLevel` usa o `res` cru. Nem o spec unitário pegava: ele chamava
   o serializer com um objeto cru. → **P-041**.
2. **Erro logado como `{ e }` vira `"e":{}`** — o pino só serializa `Error` na chave `err`.
   Visto às 16:54:59: `[50] wwebjs: syncAddressBook falhou e={}` (mensagem perdida). 18 sites
   nas duas engines (11 wwebjs, 7 Baileys); `falha ao inicializar` logava só a string
   (`err: msg`, sem stack).
3. **Texto solto multi-linha fora do JSON** às 16:50:15: o libsignal (Baileys) despeja o
   registro da sessão Signal com `console.info("Closing session:", {...Buffers...})` — dezenas de
   linhas soltas entre as linhas JSON; o BullMQ também usa `console.error` como fallback quando o
   evento `'error'` não tem listener (as duas filas não tinham).
4. **4xx deliberados sem motivo no log** (409/423/400/401/403): só `request completed` em warn,
   sem mensagem, sem sessão, sem quem chamou. 500 inesperado era logado pelo Nest sem contexto de
   request.
5. **21 catches mudos** (`.catch(() => undefined|{}|null)`) — os que importam: diretório de
   contatos, persistência de FAILED, `lastUsedAt` da api key, re-hash da senha, presigned URL de
   mídia (mensagem sai sem `mediaUrl` sem ninguém saber), desfazer marca de reentrega da DLQ,
   fechamento das filas, locks/marcadores do perfil do Chromium, forwarder do proxy, destroy do
   client antigo, `resolveNames`.
6. **`lastError` fantasma:** sessão parada/deslogada pelo usuário mantinha
   `"desconectado (LOGOUT) — reconectando (tentativa 1/5)"` (14 sessões STOPPED assim às 16:47) —
   `doStop`/`doLogout` emitiam `STOPPED` sem `error: null`, e o manager só sobrescreve
   `lastError` quando o campo vem.

## Entregue (1 commit na branch)

- **`bootstrap/log-redaction.ts`:** serializers detectam objeto já serializado (`raw`) e só
  então aplicam o padrão → statusCode/headers de volta; `errorAliasSerializers()` (`err`, `e`,
  `error`, `cause`, `exception` → serializer de Error) e `logSerializers()` usado no
  `app.module.ts`. Specs: caso embrulhado (`wrapResponseSerializer`/`wrapRequestSerializer`) e
  **`log-redaction.pino-http.spec.ts`** com o pino-http REAL sobre um `http.createServer`:
  `request completed` traz `statusCode: 409`, e cookie/authorization/x-api-key/set-cookie/
  `?token=` não aparecem no JSON (o teste inicial pegou que passar serializers a um logger
  pré-construído NÃO funciona — o child do pino-http sobrepõe req/res).
- **`bootstrap/console-bridge.ts` (novo):** `console.log/info/debug/trace` → `debug`,
  `warn` → `warn`, `error` → `error`, contexto `console`, `util.format` + teto de 4000 chars, uma
  linha por chamada, nunca lança. Instalado no `main.ts` após `useLogger`.
- **`bootstrap/logging-exception.filter.ts` (novo):** `@Catch()` global estendendo
  `BaseExceptionFilter` (a resposta é a do Nest — R0). Uma linha por exceção: `reqId`, método,
  URL mascarada, status, `code`, `session` (`params.id`), `user`/`apiKey` (nome, nunca segredo),
  `ip`; 4xx → warn, 5xx → error com `err` (stack). `describeException()` pura com spec.
  Registrado em `main.ts` e em `test/setup-app.ts` (paridade nos e2e).
- **Engines:** `{ e }` → `{ err: e }` (18 sites); `falha ao inicializar` loga o `Error` (stack);
  `doStop`/`doLogout` (wwebjs) e `doStop`/branch `stopped` (Baileys) emitem `STOPPED` com
  `error: null`; catches do perfil/proxy/destroy/resolveNames com log (warn/debug conforme o
  efeito).
- **Filas BullMQ:** `worker.on('error')` + `queue.on('error')` nas duas filas (webhooks e
  campanhas) com stack; `failed` com `job.id`, tentativa e evento; fechamento com aviso; DLQ
  avisa quando não desfaz a marca de reentrega.
- **Demais catches:** manager (contatos, FAILED), api-key `lastUsedAt`, re-hash de senha,
  presigned URL (`mediaUrl indisponível para <key>`), presence de campanha (debug — o envio que
  segue já loga a falha real).
- **Mantidos de propósito (documentados no código):** `safe-fetch` (cancel de corpo — lib pura)
  e `raceStoreOp` (rejeição tardia da chamada órfã).

## Verificação

- `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run format:check` ✅ · `npm run depcruise` ✅
  (199 módulos) · `npm run test:unit` ✅ **122 testes / 13 arquivos** (eram 107 / 10; +15 em
  `bootstrap`, nenhum removido) — inclui o teste de integração com o pino-http real.
- e2e (CI, precisa de infra): rodam com o filtro global instalado — uma regressão nele quebraria
  as asserções de status/corpo já existentes (auth, webhooks, messages).

## ⚠️ Mudanças de comportamento observáveis (para o dono decidir o deploy)

1. **Log:** `console.log/info` de libs (libsignal "Closing session", etc.) passa a `debug` —
   some com `LOG_LEVEL=info` (produção). Para ver, `LOG_LEVEL=debug`. `console.warn/error`
   continuam visíveis, agora em JSON.
2. **Log:** todo 4xx gera uma linha `warn` com motivo (`http 409 POST /api/...: <mensagem>`),
   além do `request completed`. 401 de token expirado do painel também aparece (até o refresh).
3. **Painel:** sessão parada/deslogada pelo usuário fica com "último erro" vazio (antes
   guardava o erro da execução anterior).
4. Sem mudança de contrato, schema, env ou dependências.

## BLOQUEADO EM VOCÊ

- Decidir merge (`feature/logs-sem-erro-batido` → main) e a janela de deploy (stop-first
  reinicia a frota — R0; a reidratação escalonada leva ~3 min para 20 sessões).

## DOCS TOCADAS

- `docs/PENDENCIAS.md` (P-041, P-042, P-025 validada, P-032 anotada, B-003 evidência) ·
  `docs/SESSOES.md` · `docs/ESTADO.md` (produção = `2836c65`) · `CHANGELOG.md` ·
  `docs/sessions/DONE-2026-09-09-1050-aplicacao-auditoria.md` (validação do deploy) · este
  arquivo.
