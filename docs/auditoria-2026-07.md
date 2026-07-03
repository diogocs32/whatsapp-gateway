# Auditoria 07/2026 — plano de melhorias e progressão

> **Este é o documento de acompanhamento.** Cada item tem um status; quando algo for
> implementado, a linha é atualizada com data e commit. Não apagar itens — histórico importa.
>
> Legenda: ✅ concluído · 🔶 em andamento/parcial · ⬜ pendente · 🔧 operacional (não é código)

## Contexto

Auditoria completa de 02/07/2026 (base: commit `2d4256a`) motivada por três queixas em produção:

1. **"Trava muito"** — pico de CPU/RAM no boot (todas as sessões iniciando em paralelo, N Chromium
   simultâneos) + sem Memory Limit no Dokploy + rotas penduradas.
2. **"Demora para iniciar sessão"** — rotas de start sem teto de tempo (wwebjs pode segurar a rota
   por até 240s via `protocolTimeout`), download da versão web a cada start, `fetchLatestBaileysVersion`
   a cada connect.
3. **"Proxy não funciona no wwebjs"** — health-check marcava proxy com credencial recusada (HTTP 407)
   como ALIVE; o resolver atribuía esse proxy; o Chromium falhava com `ERR_INVALID_AUTH_CREDENTIALS`.
   Em produção soma-se a credencial divergente no banco (corrigível com re-sync Webshare).

## Progressão

### Ações operacionais (sem código — fazer no Dokploy/dashboard de produção)

| #   | Item                                                                                                                                 | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| O1  | Re-sync Webshare no dashboard de prod + restart da sessão (corrige credencial divergente no banco; alternativa rápida: proxy = NONE) | 🔧 ⬜  |
| O2  | Memory Limit ~1.5–2 GB no gateway (Dokploy → Advanced → Resources) + Redeploy — sem isso o auto-tune de heap do entrypoint não age   | 🔧 ⬜  |
| O3  | Resolver "Validate DNS" amarelo do domínio no Dokploy                                                                                | 🔧 ⬜  |

### P0 — ataca as queixas diretamente

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                      | Status        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 3   | **Health-check de proxy: só 2xx = ALIVE; 407 = DEAD (`PROXY_AUTH`)** — `proxy-health-tester.ts` valida `statusCode` (antes, QUALQUER resposta HTTP virava ALIVE — inclusive o 407 que o `https-proxy-agent` repassa ao parser). `TestResult` ganhou `reason` (PROXY_AUTH / HTTP_xxx / TIMEOUT / erro de socket) na resposta de `POST /api/proxies/:id/test` e log de warn no gateway.                     | ✅ 02/07/2026 |
| 4   | **Teto de tempo no start (15s)** — `session-manager.service.ts`: `start()` (usado por `POST /sessions`, `POST /:id/start`, `restart` e `pairing-code`) agora responde em ≤15s; erro dentro da janela propaga ao cliente; erro depois do teto vira `status FAILED` + `lastError` persistidos (aparece no polling). Antes a rota ficava pendurada até 240s (Traefik cortava com 499/504 = "botão travado"). | ✅ 02/07/2026 |
| 5   | **Autostart escalonado no boot** — `onApplicationBootstrap` reidrata UMA sessão por vez (fora do bootstrap do Nest), Baileys antes de WWEBJS, DEGRADED por último. Antes: todas em paralelo = N Chromium de uma vez = pico de RAM/OOM ("trava tudo" no deploy).                                                                                                                                           | ✅ 02/07/2026 |

### P1 — latência e resiliência

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                    | Status        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 6   | Cache local da webVersion do wwebjs — feito: HTML pré-baixado 1× por versão em `{WWEBJS_DATA_PATH}/.webcache` (volume persistente) e servido via LocalWebCache; fallback p/ o cache remoto se o download falhar. Zero rede por start.                                                                                                                                                                   | ✅ 02/07/2026 |
| 7   | Cachear `fetchLatestBaileysVersion()` — feito: cache de processo (TTL 12h) usado em todo connect/reconnect; em falha usa a última versão conhecida ou a default embutida do Baileys.                                                                                                                                                                                                                    | ✅ 02/07/2026 |
| 8   | Fallback de proxy no `handleInitFailure` do wwebjs: erro de auth/tunnel → marca o proxy atual DEAD (`ProxyResolver.reportFailure`) e, nos modos RANGE/GLOBAL, retenta 1× com o próximo candidato (ou direto se o pool esgotou). No SINGLE (proxy pinado de propósito) mantém FAILED com motivo.                                                                                                         | ✅ 02/07/2026 |
| 8b  | Fallback de proxy no BAILEYS (engine principal): close com assinatura de erro de rede/túnel (407/ERR_TUNNEL/ECONNREFUSED/…) marca o proxy atual DEAD antes da reconexão — o connect() seguinte re-resolve e pula os DEAD nos modos rotativos. Falso-positivo é revivido pelo item 9.                                                                                                                    | ✅ 02/07/2026 |
| 9   | Re-teste periódico de proxies — feito: setInterval (unref) no ProxyService, `PROXY_RETEST_INTERVAL_MIN` (default 30 min; 0 desliga; off em NODE_ENV=test). Revive DEAD que voltou e derruba quem morreu.                                                                                                                                                                                                | ✅ 02/07/2026 |
| 10  | webVersion do wwebjs: `WWEBJS_WEB_VERSION` agora aceita `auto` (novo DEFAULT — resolve a `currentVersion` do versions.json do wa-version, cache de 6h por processo, fallback p/ a versão fixa se o fetch falhar), `live` ou versão explícita. Falha de init com versão fixada (compatível com expirada) → retry único com `live` + warn pedindo atualização. Desarma a bomba-relógio de ~fim de agosto. | ✅ 02/07/2026 |
| 11  | Proxy com username sem password — feito: 400 no create (zod refine), linha rejeitada no bulk import, e warn explícito na engine wwebjs quando um proxy assim ainda existir no banco.                                                                                                                                                                                                                    | ✅ 02/07/2026 |
| 12  | Teto de tempo no `onModuleDestroy` — feito: Promise.race de 15s no stop de todas as engines; o redeploy não fica pendurado atrás de um Chromium travado.                                                                                                                                                                                                                                                | ✅ 02/07/2026 |

### P2 — maturidade de produto

| #   | Item                                                                                                                                                                                                     | Status                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 13  | Retenção/purge de dados: `wa_messages` (guarda `raw` jsonb inteiro), `wa_session_events`, `wa_audit_logs` crescem para sempre                                                                            | ⬜                               |
| 14  | Rate limiting global + login (`@fastify/rate-limit`); proteger `/metrics` (hoje público sem auth)                                                                                                        | ⬜                               |
| 15  | CI (GitHub Actions): lint + typecheck + vitest + build da imagem; parar de buildar no servidor                                                                                                           | ⬜                               |
| 16  | Contadores agregados/cache Redis no lugar de `count()` full-table a cada 5s (`metrics.service.ts` + polling do dashboard)                                                                                | ⬜                               |
| 17  | Container não-root + prune de devDeps na imagem runtime                                                                                                                                                  | ⬜                               |
| 18  | Logs estruturados na app toda (nestjs-pino — hoje pino só na engine Baileys)                                                                                                                             | ⬜                               |
| 19  | helmet/security headers (gateway + nginx do dashboard); JWT do dashboard fora do localStorage                                                                                                            | ⬜                               |
| 20  | Fan-out de eventos via Redis pub/sub (EventBus in-process = teto de 1 réplica) — só quando for escalar                                                                                                   | ⬜                               |
| 21  | Manter dependências nas versões mais atuais compatíveis (respeitando override TS 5.9.3, Baileys 7.x, wwebjs oficial)                                                                                     | ✅ 02/07/2026 (ver seção abaixo) |
| 22  | Higiene dos e2e: o teste de create sobe um socket Baileys REAL que às vezes morre após o `app.close()` → "1 error" (unhandled) intermitente no sumário do vitest. Mockar a engine/EngineFactory nos e2e. | ⬜                               |

## Detalhe do que foi implementado em 02/07/2026 (itens 3, 4, 5)

**Arquivos alterados:**

- `apps/gateway/src/modules/proxies/infrastructure/proxy-health-tester.ts`
  - Resposta não-2xx agora é DEAD com `reason` (`PROXY_AUTH` para 407, `HTTP_<code>` para o resto).
  - Timeout e erro de socket também preenchem `reason` (`TIMEOUT` / mensagem do erro).
- `apps/gateway/src/modules/proxies/application/proxy.service.ts`
  - `TestResult.reason` exposto na API de teste; warn no log quando um proxy morre no teste.
- `apps/gateway/src/modules/sessions/application/session-manager.service.ts`
  - `START_TIMEOUT_MS = 15_000` + `startWithTimeout()`: erro rápido propaga (cliente vê o motivo);
    erro tardio vira `FAILED` + `lastError` persistidos — nunca falha silenciosa nem unhandledRejection.
  - `restart()` simplificado (o start já se auto-limita).
  - `requestPairingCode()` usa o mesmo teto.
  - `onApplicationBootstrap()` reidrata em fila sequencial ordenada (Baileys → WWEBJS → DEGRADED).

**Validação:** `tsc --noEmit` limpo + suíte e2e completa **65/65** em 02/07/2026.

**Comportamento esperado após deploy:**

- `POST /api/sessions/:id/start` responde em ≤15s SEMPRE (mesmo com proxy ruim); o estado real
  (SCAN_QR_CODE / WORKING / FAILED com motivo) chega pelo polling de status/QR.
- `POST /api/proxies/test-all` passa a marcar DEAD os proxies com credencial errada (os "11 ALIVE
  fantasmas" desaparecem) e a resposta diz o motivo (`reason`).
- Deploy/restart do container não dispara mais N Chromium simultâneos.

## Atualização de dependências — 02/07/2026 (item 21)

**Atualizados (dentro do range / compatíveis):**

| Pacote                                    | De → Para                                           | Workspace |
| ----------------------------------------- | --------------------------------------------------- | --------- |
| @aws-sdk/client-s3 + s3-request-presigner | 3.1075.0 → 3.1078.0                                 | gateway   |
| bullmq                                    | 5.79.1 → 5.79.2                                     | gateway   |
| @types/node                               | 22.20.0 → **26.1.0** (alinha com o runtime Node 26) | gateway   |
| vite                                      | 8.1.0 → 8.1.3                                       | dashboard |
| tailwindcss + @tailwindcss/vite           | 4.3.1 → 4.3.2                                       | dashboard |
| react-router-dom                          | 7.18.0 → 7.18.1                                     | dashboard |

**Mantidos de propósito (o "mais atual compatível" é o que já está):**

- **fastify 5.8.5 (pinado exato)** — o `@nestjs/platform-fastify@11.1.27` (última versão) pina
  `fastify: "5.8.5"` EXATO; subir para 5.9.0 cria DUAS cópias do fastify no node_modules (risco de
  plugin registrado numa instância e app rodando na outra). Só subir fastify junto com o
  platform-fastify. ⚠️ gotcha registrado.
- **@whiskeysockets/baileys 7.0.0-rc13** e **whatsapp-web.js 1.34.7** — confirmadas como `latest`
  no registry em 02/07/2026 (nada mais novo existe).
- **typescript 5.9.3** — override na raiz; TS 6.0.3 quebra o `nest build` (gotcha conhecido).
- **zod 3** (latest 4.4.3) — major com API quebrada; todos os DTOs usam zod 3. Migração é projeto à parte.
- **pino 9** (latest 10) — a engine Baileys espera logger pino 9-compatível (dep interna do Baileys).
- **@hapi/boom 9** (latest 10) — precisa casar com a versão que o Baileys usa internamente (erros de desconexão).
- **ulid 2** (latest 3) e **dotenv 16** (latest 17) — majors sem benefício que justifique o risco agora.

**Validação:** `tsc --noEmit` OK · `nest build` OK · `vite build` OK · e2e **65/65** OK (02/07/2026).

## Como verificar em produção (depois do deploy)

1. `POST /api/proxies/test-all` → conferir que proxies 407 agora aparecem `DEAD` com `reason: "PROXY_AUTH"`.
2. Dashboard → Sincronizar Webshare → religar proxy → restart da sessão wwebjs → QR deve aparecer.
3. Cronometrar o clique em "Iniciar" numa sessão wwebjs: resposta da rota em ≤15s.
4. Redeploy com 2+ sessões autostart: logs devem mostrar "Reidratando sessão ..." UMA por vez.

## Histórico

- **02/07/2026** — Auditoria completa (3 frentes) + implementação dos itens 3, 4 e 5. e2e 65/65.
- **02/07/2026** — Item 21: dependências atualizadas dentro da compatibilidade (@types/node 26,
  aws-sdk, bullmq, vite, tailwind, react-router-dom); fastify pinado 5.8.5 exato (pin do
  platform-fastify); Baileys/wwebjs já eram latest. Typecheck + nest build + vite build + e2e 65/65.
- **03/07/2026 (madrugada)** — Itens **6, 7, 8b, 9, 11 e 12** implementados (P1 COMPLETO). 7: cache
  TTL 12h do `fetchLatestBaileysVersion` (tira HTTP do hot path de connect/reconnect do Baileys).
  8b: fallback de proxy no Baileys (marca DEAD no close com assinatura de proxy; a reconexão
  re-resolve). 9: re-teste periódico (`PROXY_RETEST_INTERVAL_MIN`, default 30 min) — também revive
  falso-positivos. 11: validação username+password (create/bulk/warn na engine). 12: teto de 15s no
  shutdown. 6: HTML da webVersion pré-baixado no volume (`.webcache`) + LocalWebCache. Novo item 22
  (flake de teardown nos e2e). Validação: prettier/eslint/tsc ok, e2e 65/65.
- **02/07/2026 (noite)** — Itens 8 e 10 implementados (tarefa agendada). Item 8: `reportFailure` no
  `ProxyResolver` + retry no `handleInitFailure` do wwebjs (arquivos: `proxy-resolver.service.ts`,
  `baileys.engine.ts` [dep], `session-manager.service.ts` [fiação], `wwebjs.engine.ts`). Item 10:
  modo `auto`/`live`/explícito na `WWEBJS_WEB_VERSION` (default mudou p/ `auto`) + retry `live`
  pós-falha; documentado no `env.production.example`. Fonte confirmada: versions.json do wa-version
  (`currentVersion` em 02/07: 2.3000.1042562325-alpha). Validação: prettier/eslint/tsc ok, e2e 65/65.
