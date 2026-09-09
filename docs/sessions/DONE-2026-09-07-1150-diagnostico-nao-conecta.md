# Sessão: diagnostico-nao-conecta

- **Status:** ✅ ENCERRADA 09/09/2026 — diagnóstico entregue (commit `b982d10`); B-003 (teste da build nova + leitura do celular) segue aberta no quadro; P-025/P-026 ganharam código na sessão `aplicacao-auditoria` (09/09)
- **Início:** 07/09/2026 11:50 (BRT)
- **Objetivo:** responder ao "não está conectando": levantar TODOS os erros do gateway em produção
  (Dokploy `89.116.73.121`, app `gateway`, container `16f3f005857a`, boot 01/09 00:14 UTC) e do
  painel, datar as quedas e apontar causa + ações.
- **Escopo (pode tocar):** docs de sessão · PENDENCIAS.md · SESSOES.md. Nenhum arquivo de código.
- **Fora do escopo:** qualquer ação em produção (R0 — só descrever o passo a passo) · engines.
- **Branch:** `feature/diagnostico-nao-conecta-0709` (criada de `main` `2c8001b`).
  Atenção: a main LOCAL está 1 commit à frente de `origin/main` (`2c8001b` — formata
  DOCUMENTO_UNIVERSAL_v4.3; corrige o `format:check` vermelho da main) e NÃO foi pushada.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** produção no Dokploy novo (89.116.73.121, api.conexozenvo.cloud + .com no mesmo
  IP, MinIO). Último deploy registrado = `66b7076` (31/08). **Deriva:** a aba Deployments mostra
  o deploy `740b911` (lid-envio-wwebjs) como o mais recente (Done, 3m38s) → container atual subiu
  em **01/09 00:14 UTC** (`/health` uptime 571 023 s às 14:51 UTC). O ESTADO ainda não registra.
- **SESSOES.md:** `lid-envio-wwebjs` continua listada ATIVA, mas seu commit `740b911` já está na
  main e em produção — o encerramento dela está pendente (não toco em ATIVA alheio). Aviso do CI
  novo (18/08) lido.
- **PENDENCIAS.md:** P-023/P-024 abertas (não toco). B-001 afirma `WA_REQUIRE_PROXY=true` — isso
  valia no Dokploy ANTIGO; ver achado 6 sobre a env do novo.
- **Travas:** TS 5.9.3 · wwebjs tarball `1780711` + `patches/whatsapp-web.js+1.34.7.patch` ·
  jobId sem `:` · forward-only · push na main = deploy stop-first (janela do dono) · sem Docker
  nesta máquina.

## Método (tudo somente-leitura)

- **Logs do container** pelo WebSocket do Dokploy (`/docker-container-logs`): o servidor recusa
  `tail` > 10 000 (close 4000) e o `--tail` do docker é aplicado ANTES do `grep` do `search`, então
  a janela útil foi **04/09 03:16 → 07/09 14:56 UTC** (8 000 linhas, das quais 5 611 são o dump
  `SessionEntry` do libsignal impresso pelo Baileys a cada reconexão — polui o log).
- **API do painel** (dono logado no Chrome; cookie httpOnly): `GET /api/sessions`, `/:id/qr`,
  `/:id/health`, `/:id/proxy`, `/observability/timeline/:id` (tabela `wa_session_events`, 30 dias),
  `/observability/reply-rate/:id`, `/audit?limit&offset`, `/proxies`.
- **Código:** `wwebjs.engine.ts` (doStart · handleInitFailure · handleDisconnect · setStatus),
  `session-manager.service.ts` (start/startWithTimeout · newQr · persistStatus), `Client.js` da lib
  pinada (`initialize` → `page.goto(..., timeout: 0)` → `inject`, gate `authTimeoutMs` 30 s).

## Achados (07/09, 14:50–15:20 UTC)

1. **Infra saudável.** `/health` 200 nos dois domínios (database/redis/storage true, heap 3 %);
   Dokploy: 6 serviços running, 0 errored; 20/20 proxies ALIVE no `test-all` que o dono rodou às
   14:56 UTC (inclusive o #25, usado pela sessão nova); volume `gateway-wwebjs` → `/data/wwebjs`
   montado (5 sessões reconectaram SEM QR no boot de 01/09 — perfil persiste).
2. **Frota (19 sessões):** 6 WORKING (contato1, 2, 6, 10, 11 WWEBJS + Diogo BAILEYS — todas
   conectadas desde o boot de 01/09 00:15–00:17 UTC, sem queda desde então) · **12 em
   SCAN_QR_CODE** (11 com `lastError` "desconectado (LOGOUT) — reconectando (tentativa 1/5)" +
   `SM`, criada hoje 14:45 UTC) · **1 STARTING** (contato20, presa desde 01/09 00:16 UTC).
3. **Linha do tempo dos LOGOUT** (`wa_session_events`, UTC) — o WhatsApp desvinculou o aparelho
   (`post_logout=1` na lib → `disconnected('LOGOUT')`), em rajadas:
   - 26/08 12:38–13:06: contato9, 17, 15, 16, 14 (5 chips em 28 min, ~18 h após o pareamento de 25/08)
   - 27/08 12:44: contato1 (repareada 12:45) · 20:14: contato3 · 22:21–22:32: contato16, 17, 7
   - 28/08 13:54: contato8 (repareada 14:02) · 31/08 11:03: contato8 · 31/08 14:33: contato14
   - 01/09 12:10: contato17 · 01/09 13:19: contato13 · 02/09 11:54–12:05: contato5, contato12
     Repareamentos que DERAM certo: 27/08 14:15–14:16 (contato16, 17), 28/08 13:57–14:02
     (contato14, 17, 8). **Desde 28/08 14:02 UTC nenhum pareamento por QR completou** — nenhuma
     transição SCAN_QR_CODE→WORKING em nenhuma sessão; nos logs de 04–07/09 não há `loading_screen`
     nem `change_state` para nenhuma das 12 (só as 5 conectadas alternam OPENING→PAIRING→CONNECTED
     na reconexão periódica). O QR em si É gerado (12/12 com `qr` não-nulo; `updatedAt` batendo a
     cada QR novo), exceto contato7 (página morta desde 02/09 16:23 UTC — QR parado).
4. **Sequência do dono hoje (audit, UTC):** 14:41–14:44 em `01M1490VF0ABRNQ8AV0P272MQZ` (`sm`,
   criada 28/08): start (5 ms = no-op, client já existia) → new-qr (12,4 s) → start → restart →
   logout → start → new-qr → logout ×2 → start ×2 → new-qr → **DELETE 14:44:51** → `POST /sessions`
   14:45 (SM nova) → start → new-qr 14:46:20 → QR gerado (SCAN_QR_CODE 14:45 e 14:46) → 14:56
   `proxies/test-all`. Nada chega ao servidor depois do QR: nenhum `authenticated`/`loading`.
5. **contato20 presa em STARTING desde 01/09 00:16 UTC (6,6 dias):** `client.initialize()` nunca
   resolveu nem rejeitou (sem "falha ao inicializar", sem FAILED). Como o `doStart` roda dentro do
   mutex `serialize`, TODO start/restart/new-qr/logout dessa sessão entra na fila atrás dele —
   o painel responde 201 (teto do `startWithTimeout`) mas nada acontece. Só um restart do
   processo (redeploy) ou DELETE liberam. Provável ponto: `page.goto(WhatsWebURL, { timeout: 0 })`
   da lib (sem teto) — o gate de 30 s (`authTimeoutMs`) só vale DEPOIS do goto. Sem watchdog em
   STARTING/SCAN_QR (o P-019 só cobre WORKING) → também explica contato7.
6. **Env do gateway no Dokploy novo** (aba Environment, 58 linhas lidas com o editor revelado):
   `GUARDRAIL_ENFORCE=true` · `WA_LOG_LEVEL=warn` · `LOG_LEVEL=info` · `WWEBJS_CHROME_PATH=/usr/bin/chromium`
   · `WWEBJS_DATA_PATH=/data/wwebjs` · S3/MinIO (`s3.conexozenvo.cloud`) · CORS com .cloud e .com.
   **Não define** `WWEBJS_WEB_VERSION` (→ default do código `2.3000.1045101284-alpha`, build de
   13/08, 25 dias; expira 13/10 pelo wa-version) **nem** `WA_REQUIRE_PROXY` (→ false: o guard
   anti-vazamento que B-001 dá como ligado NÃO está ligado neste servidor — sessões têm proxy
   SINGLE/STICKY, mas proxy DEAD vira conexão direta sem bloqueio). `WEBSHARE_API_KEY` comentada
   (`/proxies/webshare/status` → `configured:false`; pool importado MANUAL).
7. **Erros nos logs 04–07/09 (todos, classificados):**
   - `stream errored out` code 503 (Baileys/Diogo) 3× em 05/09 00:09–00:28 UTC + 1× "unexpected
     error in 'handling notification' — Connection Closed" (428) → reconexão automática OK
     (STARTING→WORKING em 1 min). Lado WhatsApp, transitório.
   - `reconectando sessão` (Baileys) 19×, statusCode 428, a cada ~8 h (06:42/14:42/22:42) →
     normal (WhatsApp derruba a conexão longa).
   - `wwebjs: estado da conexão mudou` 276× — só das 5 sessões WORKING (OPENING→PAIRING→CONNECTED
     a cada 1–4 h) → normal.
   - **Nenhum** erro do wwebjs (`falha ao inicializar`, `auth_failure`, `falha ao gerar QR`,
     `SEM proxy`, `proxy marcado DEAD`) em toda a janela.
   - `request completed` 4xx: `GET /api/sessions → 401` 293× (painel do dono a cada expiração do
     access de 15 min → refresh → segue; IP residencial/UA Mac+Windows) · `POST /auth/refresh →
401` 34× e `GET /auth/me → 401` 37× (Googlebot 66.249.x, scanner 205.169.39.x, iPhone) →
     ruído · zero 5xx.
8. **Nada no lado gateway explica a falha de pareamento** — a única diferença entre os
   repareamentos que funcionaram (27–28/08) e agora é o TEMPO: mesma build fixa, mesmos proxies,
   mesmo código de engine (o deploy de 01/09 só tocou o envio).

## Causa provável do "não conecta" (ordem de probabilidade) + como confirmar

1. **Build fixa do WhatsApp Web velha demais para NOVOS logins** (`2.3000.1045101284`, 13/08).
   Sessões já autenticadas seguem funcionando (5 WORKING provam), mas o login pós-QR deixa de
   completar. Evidência externa: wppconnect-team/wppconnect-server#2512 (aberta 09/07/2026) —
   build fixa antiga: "cannot log in correctly after scanning the QR code… stuck during the sync
   phase or fail"; removendo a versão fixa, "the same account can scan the QR code and enter the
   chat interface successfully". Evidência interna: último QR que completou = 28/08 14:02 UTC
   (build com 15 dias); hoje 25 dias. **Confirmar (5 min, R0, dono):** Dokploy → gateway →
   Environment → `WWEBJS_WEB_VERSION=2.3000.1046934385-alpha` (currentVersion do wa-version hoje;
   alternativa `auto`) → Save → **Redeploy** (troca o container; o patch `$1` continua valendo) →
   parear a `SM`. Se parear: manter a build nova e revalidar B-002 (sync 100 % + leads com phone +
   envio) antes de reconectar a frota. Risco conhecido (14/08): build nova pode travar sync em 99 %
   → cair para `live` como 2ª tentativa é o fallback já codificado.
2. **Restrição/ban temporário dos chips** — os LOGOUT em rajada (5 chips em 28 min em 26/08;
   3 em 2 h em 27/08) e sempre horas/dias após pareamento, em chips que fazem cold outreach
   (contato5: 62 cold/30 d; contato12: 63; contato13: 49), têm a assinatura de desvinculação pelo
   WhatsApp. Chip restrito não pareia. **Confirmar no celular:** WhatsApp → Dispositivos conectados
   (aparece algo? mensagem "conta não pode usar o WhatsApp"/"temporariamente restrita"?) e o que o
   celular diz ao escanear ("Não foi possível vincular"? fica em "conectando"?).
3. **Reputação do IP de saída dos proxies** (Webshare static residential 104.165.153/159.x) —
   pouco provável (os repareamentos de 27–28/08 passaram pelo mesmo pool e as 5 conectadas usam
   ele), mas o `test-all` só prova ipify, não WhatsApp. Teste barato: parear a `SM` com proxy
   `NONE` uma vez (só para diagnóstico).

## Ações recomendadas (dono — R0, nada foi executado)

1. Teste da build nova (item 1 acima) — resolve ou descarta a causa nº 1 em minutos.
2. **Um** redeploy/restart do gateway (já embutido no passo 1) destrava contato20 (perfil no volume
   → deve voltar SEM QR) e renova a página morta de contato7.
3. Checar no celular dos chips LOGOUT o estado da conta (causa nº 2) antes de insistir no QR.
4. Pushar `2c8001b` (CI da main volta a ficar verde) e encerrar a sessão `lid-envio-wwebjs`.
5. Depois: P-025 (teto no STARTING + watchdog de QR) e P-026 (alerta/rotina de idade da build).

## Pendências abertas por esta sessão

- **B-003** — dono: teste da build nova + leitura do celular dos chips (acima).
- **P-025** — wwebjs: `initialize()` sem teto pendura o mutex (contato20 6,6 dias em STARTING) +
  sem watchdog em STARTING/SCAN_QR (contato7 QR morto desde 02/09).
- **P-026** — build fixa do WhatsApp Web: alerta de idade + procedimento de revalidação
  periódico (B-002 previa "início de outubro"; o pareamento quebrou antes).

## BLOQUEADO EM VOCÊ

- Executar o teste da build nova no Dokploy (env + Redeploy) e reportar: a `SM` pareou? o que o
  celular mostra nos chips LOGOUT?

## DOCS TOCADAS

- `docs/sessions/ATIVA-2026-09-07-1150-diagnostico-nao-conecta.md` (este) · `docs/SESSOES.md`
  (linha ativa) · `docs/PENDENCIAS.md` (B-003, P-025, P-026). Nada de código; nada commitado.
