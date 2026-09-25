# Sessão: e3-patches-seguranca

- **Status:** ✅ DONE — P-054 entregue na branch da Onda 1 (PR #6; merge do dono no fim da E4 =
  deploy A).
- **Início:** 25/09/2026 10:53 BRT (macOS, Node 26.0.0 / npm 11.12.1, Docker Desktop 29.8.0)
- **Objetivo:** Etapa **E3** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) — **P-054, patches de
  segurança/estabilidade sem major**: `@nestjs/*` 11.2.6 (GHSA-9c5c-9qcx-q35q), `@fastify/multipart`
  10.1.2, `bullmq` 5.81.5, `protobufjs` 7.6.6 + checagem periódica de advisories de REPOSITÓRIO
  (o `npm audit` não enxerga).
- **Escopo final (tocado):** `apps/gateway/package.json`, `package.json` (raiz — só `allowScripts`),
  `package-lock.json`, `apps/gateway/Dockerfile` (pin do Node), `MessagesController.sendMedia`,
  `LoggingExceptionFilter`, testes (`media.e2e-spec.ts`, `logging-exception.filter.spec.ts`,
  `fastify-adapter.absolute-form.spec.ts`), `scripts/checar-advisories.mjs` + `.config.json`,
  `.github/workflows/advisories.yml`, `docs/how-to/checar-advisories.md`, 1 comentário em
  `apps/dashboard/src/lib/api.ts`, mapa gerado e docs de encerramento.
- **Fora do escopo (mantido):** majors (P-062), fastify 5.12 (vem com Nest ≥ 12.0.4), `prisma@latest`,
  `npm audit fix --force`, rota real no rate-limit (P-053 → E4), egress IPv6 (P-065 → E4),
  produção/Dokploy.
- **Branch:** `feature/onda1-guardas-seguranca` (continuação da E2, `6496979`).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** onda atual M3 concluída; execução em curso pelo roteiro de 25/09, E1 ✅ e E2 ✅,
  próxima = E3. Produção inalterada desde 15/09 (`768fb26`). `.cloud` = produção, sem homologação.
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`) —
  não tocada. Avisos: postinstall com `--error-on-fail`; dashboard sem `patches/`; CI com job
  `imagens`; MinIO dev/CI = `pgsty/minio`.
- **PENDENCIAS:** P-054 (esta etapa); B-004 depende do deploy A; B-005/B-006/B-007 do dono;
  P-021/P-062 = majors (fora).
- **Roteiro E3 + MAPA-CODIGO §4.4 e §5.1 P-054:** `apps/gateway/package.json:29-42`,
  `fastify-adapter.ts:17-19` (multipart `files:1`), `MessagesController.sendMedia`, workers
  `webhook-queue.ts:77-133` e `campaign-queue.ts:81-110`; fastify 5.11.3 exato; reconferir a ordem
  de hooks após o bump do Nest; checagem de advisories agendada com permissions mínimas; e2e de 2
  arquivos → 4xx; BullMQ manual em dev (e2e não sobe Worker).
- **Versões instaladas no início (npm ls):** @nestjs/core/common/platform-fastify/testing 11.2.3,
  @fastify/multipart 10.1.1, bullmq 5.81.4, ioredis 5.11.1, protobufjs 7.6.5, fastify 5.11.3,
  typescript 5.9.3 (override).

## Fontes (documentation-first)

- **Tarballs oficiais baixados e comparados (`npm pack` + `diff -ru`)**: @nestjs/core, common,
  platform-fastify, testing 11.2.3 × 11.2.6 (core/common/testing sem mudança de código; só o adapter
  do platform-fastify: clone `fastify-middie.js` → `@fastify/middie` 9.3.4); @fastify/multipart
  10.1.0 × 10.1.1 × 10.1.2; bullmq 5.81.4 × 5.81.5 (`dist/*/classes/worker.js` e
  `redis-connection.js`); protobufjs 7.6.5 × 7.6.6 (`reader.js`, `decoder.js`, `wrappers.js`).
- **Release notes / PRs / issues (gh):** nestjs/nest v11.2.4–v11.2.6 (commit 5226fe084c);
  fastify/fastify-multipart#642/#643; taskforcesh/bullmq PR #4722 (backport do #4586) e issue #4585
  ("v5 recovers" — restart do Redis já se recuperava na v5); protobufjs #2422.
- **Advisories:** `gh api repos/nestjs/nest/security-advisories/GHSA-9c5c-9qcx-q35q` (faixa
  `>= 12.0.0 < 12.0.2 and < 11.2.4`, ecosystem vazio) e `gh api /advisories/GHSA-9c5c-9qcx-q35q` →
  404 (base global); varredura de 63 repos com o script novo.
- **npm `allowScripts`:** código do npm 11.16+/11.19.1/12.1.0 (arborist `script-allowed.js`,
  `rebuild.js`) e log do CI run 36137895456 (`install-scripts … not yet covered by allowScripts:
protobufjs@7.6.5`). A página `docs.npmjs.com/cli/v11/configuring-npm/package-json` não documenta o
  campo; ele aparece só na doc embutida dos comandos do CLI ≥ 11.16.
- **Node/undici:** `gh api repos/nodejs/node/contents/deps/undici/src/package.json?ref=vX` (26.8.1 →
  8.10.0; 26.8.2/26.9.0/26.10.0 → 8.10.2); `https://nodejs.org/dist/index.json` (campo `security`;
  26.3.1 e 26.5.1 marcadas); `docker run node:26.10.0-bookworm-slim` → v26.10.0, undici 8.10.2,
  npm 11.19.1.
- **GitHub (docs.github.com):** REST repository-advisories, paginação, rate limits (primário e
  secundário respondem 403 **ou** 429), Actions `schedule`/`workflow_dispatch`/`pull_request.paths`,
  `permissions`, notificações de workflow — URLs no `how-to/checar-advisories.md`.
- **Dokploy:** o espelho local (`~/dioggo-agents/agentes/docs/dokploy/latest`) não documenta build sem
  cache; "build sem `--pull`" vem da análise de 23/09 §8 (código do Dokploy v0.30.2).

## Diário

- 10:57 — linha de base (infra dev de pé, `npm run test`): 36 arquivos, **331/331** verdes.
- 10:59 — e2e novo "2 arquivos" na **multipart 10.1.1**: **500** `Premature close`, sem `sendMedia`.
- 10:55–11:35 — workflow `e3-pesquisa-p054` (5 frentes + 5 verificadores adversariais). Achados que
  mudaram o plano: (a) com `req.file()` a 10.1.2 responde **201** para 2 arquivos (1º enviado, 2º
  descartado calado); (b) a bullmq 5.81.5 corrige Worker parado em conexão half-open — restart do Redis
  já se recuperava; (c) `allowScripts` NÃO é inerte no CI/Docker.
- 11:36–11:45 — spec GHSA-9c5c na **11.2.3**: forma absoluta pula o middleware (**FAIL**); controller novo
  - e2e na 10.1.1: 2 arquivos → 500.
- 11:36–11:45 — bumps (lock de antes guardado): Nest 11.2.6 ×4, multipart 10.1.2, bullmq 5.81.5 exatos;
  `npm update protobufjs`; `npm update @fastify/proxy-addr @fastify/busboy`; `npm update fast-uri`.
  Diff do lock conferido entrada a entrada (Python): só os pacotes-alvo + `@fastify/middie` 9.3.4.
- 11:36–11:45 — `LoggingExceptionFilter.clientErrorAsHttpException` (4xx estilo http-errors →
  `HttpException` de mesmo corpo): sem ela o e2e imprime `ERROR [ExceptionsHandler] FastifyError: reach
files limit`; com ela, nenhuma linha ERROR.
- 11:45–11:51 — BullMQ: laboratório half-open (proxy TCP) **5.81.4 TRAVADO** (exit 2, 0 erros) ×
  **5.81.5 volta** em 24,2 s; gateway real em dev (`NODE_ENV=development`, Redis db 3, porta 3100,
  0 sessões no banco) com `docker compose restart redis`, 30 s e 70 s parado → Worker volta nos três,
  `failed=0`, os 2 Workers de novo em `flags=b`; SIGTERM → `exit 143` sem erro de shutdown.
- 11:53 — `docker build` do gateway (4 guardas ok) e do dashboard: ok.
- 11:55–13:16 — agente implementou a checagem (script + config + workflow + how-to) a partir do
  protótipo com as correções da verificação; revisado linha a linha antes de assumir.
- ~12:20 — achado: produção de 15/09 usou a tag móvel `node:26-bookworm-slim` (build sem `--pull`) →
  Node/undici ao acaso do cache. **Pin `node:26.10.0-bookworm-slim`** no Dockerfile do gateway; a
  checagem passa a avaliar o undici do Node fixado. Imagem reconstruída: v26.10.0, undici 8.10.2.
- 12:15 e 13:52 — revisão adversarial em 2 rodadas (5 + 6 dimensões, 2 céticos por achado). Rodada 1:
  NaN no filtro (resposta sairia 200) e linhas velhas no MAPA — corrigidos. Rodada 2: 26 achados
  confirmados (maioria menor) — todos tratados: teste do "`to` depois do arquivo" não distinguia o
  código antigo (agora manda o `to` num pedaço atrasado: antigo 400 × novo 201); teste afirma que o
  Nest não loga ERROR no 413; workflow roda em PR que muda Dockerfile/package.json do gateway;
  script: estágio final do Dockerfile (ARG, espelho, estágio herdado) e exit 2 sem pin, releases de
  segurança do Node, nomes em lista e fora do lockfile, faixa invertida (regra C), reconhecimento de
  infra por instante (`reconhecidoEm`) com "atualizado depois" falhando, 403 de rate limit sem
  descartar o token; docs (INTEGRACAO 406/1000 partes, D-024, MAPA, ROTEIRO E16, AUDITORIAS,
  CHANGELOG, how-to do e-mail).
- ~13:55 — pedidos novos do dono no meio da etapa (emoji "…", áudio e imagem nas conversas;
  encaminhar mensagem fiel ao WhatsApp Web): fora da E3 — diagnóstico só leitura disparado e
  registrado como Onda 8 (E22–E25, P-066..P-069) com o relatório
  `docs/analise-conversas-whatsapp-web-2026-09.md` (causas provadas no código).

## Provas (25/09, local)

| Prova                                            | Antes (versão/código antigo)     | Depois                                                       |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------ |
| GHSA-9c5c (spec com socket cru, forma absoluta)  | 11.2.3: middleware pulado (FAIL) | 11.2.6: middleware roda (2/2)                                |
| Upload com 2 arquivos (e2e)                      | 10.1.1: 500 `Premature close`    | 413 `reach files limit`, `sendMedia` não chamado, sem ERROR  |
| `to` depois do arquivo, em pedaço atrasado (e2e) | controller antigo: 400           | 201, `to` lido                                               |
| Campo com nome reservado (e2e)                   | controller antigo: 200 e envia   | 400, nada enviado                                            |
| BullMQ half-open (laboratório)                   | 5.81.4: TRAVADO, 0 erros         | 5.81.5: volta em 24,2 s                                      |
| BullMQ restart/30 s/70 s de Redis (gateway dev)  | —                                | volta nos 3, `failed=0`                                      |
| Checagem com o lock de antes                     | —                                | acusa 9c5c, 8cmm, gxm5, hrr3 (×2), jvvf — exit 1             |
| Checagem com Node fixado em 26.5.0 / tag móvel   | —                                | release de segurança v26.5.1 + 15 undici (exit 1) / exit 2   |
| Checagem real (lock atual, Node 26.10.0)         | —                                | 0 pendências (7 aceites do fastify), 75 infra reconhecidos   |
| Suíte                                            | 331/331                          | **338/338** (37 arquivos) · autoteste do script **146/146**  |
| Imagens                                          | —                                | gateway (4 guardas, Node v26.10.0/undici 8.10.2) e dashboard |

Validação local final: `npm run lint` · `npm run format:check` · `npm run depcruise` ·
`npx tsc --noEmit` (gateway e dashboard) · `npm run test` (unit + e2e com infra) ·
`node scripts/mapa-codigo.mjs --check` · `npm run gateway:build` (dist ok) · `npm run dashboard:build`.

**CI do PR #6 (commits `7b101f4`, `6f132fe`, `28f3564`; runs 36165240423 e 36165240488, Linux
amd64):** `ci` 3m00s ✅ · `imagens` 2m30s ✅ · `advisories` 21s ✅ — primeira execução real da
checagem: `token: GITHUB_TOKEN` leu os 63 repos de terceiros sem recusa (rate-limit restante 4930),
runtime avaliado `node:26.10.0-bookworm-slim · undici 8.10.2`, resultado "nada pendente". O aviso
`install-scripts … not yet covered by allowScripts` caiu de 2 pacotes para 1 (sobra
`puppeteer@24.38.0` — E16).

### Reconciliação documental — R3/R9

- Stack/versões, build e contrato mudaram → MAPA-CODIGO (versões, middie oficial, sendMedia,
  filtro, allowScripts, BullMQ, Dockerfile, CI, P-053/P-054/P-062 em §5.1, convenções de linha),
  INTEGRACAO (upload multipart), DECISOES (D-023, D-024), PENDENCIAS (P-038, P-053, P-054, P-062,
  B-007), ESTADO, ROTEIRO (E3 ✅, E4, E16, ações do dono, diário), AUDITORIAS (linha nova),
  CHANGELOG, análise de 23/09 e auditoria §7.5 (notas datadas), how-to novo.
- **Docs-n/a:** ARQUITETURA (nenhuma fronteira/tabela mudou), `packages/contracts` (nenhum payload
  novo — o upload multipart não tem DTO), CLAUDE.md (stack citada sem versão de patch).

### Checkpoint

- **O QUE FOI FEITO:** P-054 completa + transitivos com advisory de repositório + pin do Node +
  checagem diária de advisories de repositório (script, workflow, how-to) + upload multipart que
  recusa 2+ arquivos sem enviar + 4xx sem ERROR falso no log.
- **PACOTES:** nenhum novo direto; transitivo novo `@fastify/middie` 9.3.4 (dep do Nest 11.2.6).
- **DECISÕES REGISTRADAS:** D-023 (advisories de repositório, aceites datados, patches transitivos,
  pin do Node) e D-024 (upload multipart).
- **EFEITO DE DEPLOY (no merge da Onda 1 = deploy A):** gateway e dashboard reconstroem; gateway em
  Node 26.10.0; `POST /messages/media` com 2+ arquivos passa de 500 para 413; request em forma
  absoluta volta a ter linha de log; nenhuma rota/payload novo.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** regressão de comportamento no upload → 3 e2e que falham
  com o código antigo; regressão de dependência → job `imagens` (build + boot + `/health`) e
  checagem de advisories no PR; resposta de erro diferente → unit do filtro + e2e do corpo 413.

## BLOQUEADO EM VOCÊ

- Nada novo que bloqueie a E4. Depois do deploy A (fim da E4): ativar o e-mail de falha de Actions
  (Settings → Notifications → System → Actions → Email + "Only notify for failed workflows") e rodar
  `gh workflow run advisories.yml` uma vez na main. Rever os 7 aceites do fastify até 30/11/2026.
- B-007 ganhou 1 item: a linha `Runtime: Node …` do log de boot da imagem atual (15/09) — diz se a
  produção de hoje está com undici afetado.

## DOCS TOCADAS

`CHANGELOG.md` · `docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/DECISOES.md` ·
`docs/INTEGRACAO.md` · `docs/MAPA-CODIGO.md` · `docs/ROTEIRO-ONDAS-2026-09.md` · `docs/AUDITORIAS.md`
· `docs/analise-atualizacoes-2026-09.md` · `docs/auditoria-melhorias-2026-09.md` ·
`docs/how-to/checar-advisories.md` (novo) · `docs/reference/mapa-codigo/*` (gerado) · esta sessão.
