# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

### Corrigido

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
