# Sessão: onda0b-mapa-roteiro

- **Status:** ✅ DONE — mapa, roteiro e reconciliação entregues; doc-only (sem deploy).
- **Início:** 25/09/2026 ~07:00 BRT (macOS)
- **Objetivo:** Etapa 1 do plano "todas as melhorias, 1 por chat" pedido pelo dono em 25/09:
  (1) **mapa do código** — todas as funções com onde estão e como se relacionam (inventário
  gerado pelo compilador TS + camada semântica verificada); (2) **roteiro** das etapas seguintes
  (1 etapa = 1 chat) com a mensagem pronta de cada chat; (3) **Onda 0B / P-063** — reconciliação
  documental das premissas erradas apontadas pela análise de 23/09; (4) decisões do dono de 25/09.
- **Escopo (pode tocar):** `scripts/mapa-codigo.mjs` (novo), `docs/reference/mapa-codigo/**`
  (gerado), `docs/MAPA-CODIGO.md` (novo), `docs/ROTEIRO-ONDAS-2026-09.md` (novo),
  `.prettierignore`, docs de reconciliação (P-063: `deploy-dokploy.md`, `agent-whatzapp_api.md`,
  `DECISOES.md`, `PENDENCIAS.md`, `motores-whatsapp.md`, `DOCUMENTO_CONEXOZENVO_NESTJS.md`,
  `auditoria-melhorias-2026-09.md`, `CLAUDE.md`), ESTADO/SESSOES/MAPA/CHANGELOG no encerramento.
- **Fora do escopo:** qualquer código em `apps/` ou `packages/`, `package*.json`, Dockerfile, CI
  (tudo isso dispara deploy pelos Watch Paths ou muda runtime) · comentários errados em
  `baileys.engine.ts:547,587-590` e `wwebjs.engine.ts:63-65` (ficam nas etapas P-050/P-052/P-059)
  · `allowScripts` (P-062) · produção/Dokploy · a ATIVA `lid-envio-wwebjs` de outra sessão.
- **Branch:** `feature/onda0b-mapa-roteiro` (criada de `feature/analise-atualizacoes-20260923`
  `4746dfb`, que ainda não foi para a main — o PR leva os dois commits de docs).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** M3 concluída; nota de 23/09 da análise (start-first, sem backup, MinIO CVE, Nest
  GHSA-9c5c, frota 100% Baileys segundo o dono); `.cloud` é a produção; próximo = Onda 0 (dono) e
  Ondas 1–2. Último deploy 15/09 `768fb26`.
- **SESSOES.md:** 1 ativa `lid-envio-wwebjs` (31/08) — a branch `fix/lid-envio-wwebjs` já está
  mergeada na main (`git branch --merged main`), mas a sessão não foi encerrada; não toco no ATIVA
  alheio (explicado ao dono). Avisos lidos: 23/09 (start-first, `.cloud`=prod, frota, npm audit
  cego), 15/09 (caixa única, MinIO quay.io), 18/08 (CI: format:check/depcruise/coverage).
- **PENDENCIAS.md:** B-001..B-007; P-047..P-064 (ondas da análise); abertas anteriores P-001,
  P-002, P-005, P-012, P-013, P-018, P-022, P-023, P-024, P-027..P-040 (parciais), P-044..P-046.
- **Travas:** TS 5.9.3 · jobId sem `:` · forward-only · nunca `nest build` com watch · push na main
  = deploy (Watch Paths: `apps/<app>/**`, `packages/contracts/**`, `package.json`,
  `package-lock.json` — `docs/`, `scripts/` e `CLAUDE.md` não deployam).
- **Ambiente:** macOS, Node v26.0.0, npm 11.12.1. Linha de base 25/09 07:00: `npm run test:unit`
  133/133 · `tsc --noEmit` ok · `npm run lint` ok · `npm run depcruise` ok (207 módulos). Docker
  Desktop desligado (e2e não rodado nesta etapa — doc-only).
- **Estado inicial:** `AGENTS.md` não rastreado preexistente — preservado.

## Decisões do dono nesta abertura (25/09, via pergunta estruturada)

1. **Merge/deploy:** o Claude abre o PR com CI verde; **o dono faz o merge** (janela calma).
2. **P-048 (sinal duro):** restrição real (463 / reachout timelock / message capping) → **pausar
   envios da sessão até o fim informado pelo WhatsApp (`timeEnforcementEnds`) + alertar**; volta
   sozinha. Não travar como `banida`.
3. **wwebjs volta ao roteiro:** "quero as 2 engines atualizadas com o melhor funcionamento
   possível, pois usarei as 2 quando necessário" → Onda 6 (P-059/P-060) entra, com prazo da build
   fixa (sai do catálogo 13/10/2026 07:01 UTC).

## Método

1. Gerador determinístico `scripts/mapa-codigo.mjs` (TypeScript compiler API + type-checker):
   205 arquivos, ~1.200 símbolos, 119 rotas, chamadas resolvidas, filas/jobId, eventos, Prisma,
   env → `docs/reference/mapa-codigo/` (+ `--check`).
2. Workflow `mapa-codigo-e-reconciliacao` (run `wf_90070bda-434`): 6 leitores (sessions/engines,
   mensagens+campanhas, eventos+webhooks+guardrail, plataforma+segurança+build,
   dashboard+contratos+testes, fluxos ponta a ponta) → 3 verificadores adversariais → síntese
   `docs/MAPA-CODIGO.md`; em paralelo, 1 agente de reconciliação P-063 com fonte primária por item.

## Encerramento — 25/09/2026

**RESULTADO:**

- `scripts/mapa-codigo.mjs` + `docs/reference/mapa-codigo/` (21 arquivos gerados): 205 fontes,
  ~1.200 símbolos com linha, 1.155 chamadas resolvidas pelo type-checker, 119 rotas, filas e jobId
  montado nos chamadores, eventos, Prisma, env, títulos de 325 testes. `--check` compara byte a byte.
- [MAPA-CODIGO.md](../MAPA-CODIGO.md): 8 fluxos ponta a ponta, 5 áreas, "onde mexer" P-001..P-065
  (tabela + §5.1 detalhado), 76 divergências doc × código. Verificação adversarial: **1.049
  afirmações conferidas, 85 correções** antes da síntese.
- [ROTEIRO-ONDAS-2026-09.md](../ROTEIRO-ONDAS-2026-09.md): E1–E21, regras de toda etapa, mensagens
  prontas E2–E6, ações do dono por momento, diário com os achados que as próximas etapas precisam.
- Reconciliação P-063 (fonte primária por item): `deploy-dokploy.md` §2 (stop-first explícito +
  Health Check vazio pelo #5171), `agent-whatzapp_api.md` §6B.11, PENDENCIAS (B-002, B-004, P-015,
  P-019, P-020, P-021, P-043, P-063, P-064), D-016 (motivos), `motores-whatsapp.md` e DOCUMENTO
  (BSUID, cobrança por mensagem, policy 23/09), auditoria §7.5 (npm audit cego), CLAUDE.md (rc14 +
  macOS), análise §9 (cobrança de 01/10 não confirmada).
- Decisões: **D-020** (premissa do stop-first), **D-021** (duas engines vivas; Onda 6 obrigatória),
  **D-022** (sinal duro → pausa até o fim + alerta).
- **Fix de carona (CI quebrado):** o PR #5 falhou no passo de infra — `quay.io/minio/minio` e
  `quay.io/minio/mc` respondem 401 (API do quay: 401 nos dois repositórios, 25/09). Trocado em
  `docker-compose.yml` e `ci.yml` pelo fork `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` +
  `pgsty/mc:RELEASE.2026-09-16T00-00-00Z` (tags conferidas no Docker Hub; README do fork: renomeado
  para `pgsty/silo` em 06/08, 2026-08-04 é a última release com identidade MinIO; entrypoint do mc =
  `/usr/bin/mc`, conferido com `docker image inspect`). Reprodução local do CI: `docker compose up -d
--wait`, bucket via mc, `prisma:deploy`, `test:cov` → **36 arquivos, 331/331 testes verdes**. Não
  deploya (arquivos fora dos Watch Paths).
- Pendência nova: **P-065** (segurança — egress aceita IPv6 v4-mapeado em hex; reproduzido) → E4.

**Não confirmado / adiado (com destino):** cobrança de serviço em 01/10/2026 (doc oficial diz grátis
— nota na análise e P-064); Update Config atual de produção (só o inspect do B-004); data da migração
da frota (B-007); comentários errados em `baileys.engine.ts:547,587-590` (E10/E12),
`wwebjs.engine.ts:63-65` (E5), `engine.port.ts:239-240`/`baileys.engine.ts:1604` "stop-first" e
`config.ts:107-109` (na etapa que tocar o arquivo — lista em MAPA-CODIGO §6); `allowScripts` (E16);
`AGENTS.md:23` rc13 (arquivo não rastreado, preexistente — não tocado); `PROMPT-MESTRE-WHATSAPP-GATEWAY.md:752`
(documento histórico — não tocado).

**Validação:** `node scripts/mapa-codigo.mjs --check` em dia · `npm run format:check` verde ·
`git diff --check` limpo · links locais das docs tocadas conferidos (0 quebrados) · varredura de
segredos no mapa (nada). Código de runtime intocado → sem build/testes novos além da linha de base
(133/133 unit, tsc, lint, depcruise verdes às 07:00).

**Commits/PR:** commit doc-only na branch `feature/onda0b-mapa-roteiro` (leva junto o commit
`4746dfb` da análise de 23/09) → push → PR para a `main`. **Merge = dono**; não deploya (Watch Paths:
só `docs/`, `scripts/`, `CLAUDE.md`, `.prettierignore`).

### Reconciliação documental — R3/R9

- Diff × gatilhos: ferramenta nova (script) → MAPA (navegação) + CHANGELOG; decisões → DECISOES
  (D-020..D-022) + ESTADO + aviso em SESSOES; pendência nova → PENDENCIAS (P-065) + roteiro (E4);
  premissas falsas → corrigidas na origem (lista acima).
- **Docs-n/a:** INTEGRACAO/ARQUITETURA/contracts — nenhum contrato ou fronteira mudou (as divergências
  de ARQUITETURA achadas pelo mapa estão em MAPA-CODIGO §6.6 para a etapa que tocar módulos).

### Checkpoint

- **O QUE FOI FEITO:** mapa do código (gerado + relações verificadas), roteiro 1 etapa = 1 chat,
  reconciliação P-063, D-020..D-022, P-065.
- **PACOTES ADICIONADOS:** nenhum (o script usa o `typescript` já instalado).
- **DECISÕES REGISTRADAS:** D-020, D-021, D-022.
- **EFEITO DE DEPLOY:** nenhum (doc-only + script fora dos Watch Paths).
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** mapa desatualizado depois de mudança de código → `--check`
  - regra 9 do roteiro; afirmação de doc sem fonte → verificação adversarial + fonte primária por item.

## BLOQUEADO EM VOCÊ

- Mergear o PR desta etapa (só docs; não faz deploy).
- **B-005** backup do Postgres fora da VPS + restore testado (o mais urgente).
- **B-006** MinIO → `pgsty/minio` pinado, fechar console 9001, trocar root, access key própria.
- **B-007** diagnóstico somente leitura (lista no PENDENCIAS) — as respostas priorizam E9/E11 e a Onda 4.
- **B-003** checklist no celular + verificação em duas etapas com e-mail.
- **B-004** stop-first — **só depois do deploy A** (fim da E4), com as guardas da P-055 em produção.
- Sessão antiga `lid-envio-wwebjs` (31/08) segue marcada ATIVA no painel, mas o código dela já está
  na main — basta dizer "pode encerrar a sessão antiga" em qualquer chat para eu fechar o registro.

## DOCS TOCADAS

`CLAUDE.md` · `CHANGELOG.md` · `DOCUMENTO_CONEXOZENVO_NESTJS.md` · `.prettierignore` ·
`docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/DECISOES.md` · `docs/MAPA.md` ·
`docs/MAPA-CODIGO.md` (novo) · `docs/ROTEIRO-ONDAS-2026-09.md` (novo) · `docs/reference/mapa-codigo/**`
(novo, gerado) · `docs/deploy-dokploy.md` · `docs/agent-whatzapp_api.md` · `docs/motores-whatsapp.md` ·
`docs/auditoria-melhorias-2026-09.md` · `docs/analise-atualizacoes-2026-09.md` · esta sessão ·
`docker-compose.yml` e `.github/workflows/ci.yml` (MinIO do dev/CI) ·
`scripts/mapa-codigo.mjs` (novo).
