# Sessão: e2-guardas-build

- **Status:** ✅ DONE — P-055 entregue na branch da Onda 1 (PR aberto; merge do dono no fim da E4).
- **Início:** 25/09/2026 ~09:15 BRT (macOS) — mesmo chat da E1, a pedido do dono ("ok, pode continuar")
- **Objetivo:** Etapa **E2** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) — **P-055, guardas de build**:
  build que aplica patch errado, gera imagem sem `dist/main.js` ou com dependência faltando tem de
  FALHAR (CI e Dockerfile) — pré-requisito do stop-first (B-004). + runbook de rollback manual.
- **Escopo (pode tocar):** `package.json` (postinstall), `apps/gateway/Dockerfile`,
  `apps/dashboard/Dockerfile` (comentário), `.github/workflows/ci.yml`, `scripts/guardas-build.sh` e
  `scripts/verificar-deps-runtime.cjs` (novos), `docs/how-to/rollback-gateway.md` (novo), docs de
  encerramento (PENDENCIAS, ESTADO, SESSOES, CHANGELOG, MAPA, MAPA-CODIGO, roteiro, deploy-dokploy).
- **Fora do escopo:** código de runtime em `apps/gateway/src` (nada muda em comportamento), versões
  de dependências (E3), produção/Dokploy (o B-004 é do dono, depois do deploy A).
- **Branch:** `feature/onda1-guardas-seguranca` (criada de `feature/onda0b-mapa-roteiro` `62458bd`
  — o PR #5 da E1 ainda não foi mergeado). PR da Onda 1 aberto nesta etapa; merge = dono no fim da E4.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO/SESSOES/PENDENCIAS:** lidos na E1 deste mesmo chat (nada mudou desde então além do que a
  E1 escreveu). Sessão ativa alheia `lid-envio-wwebjs` não tocada. B-004 exige esta etapa antes.
- **Roteiro E2 + MAPA-CODIGO §4.4 e §5.1 P-055:** locais `package.json:31`,
  `apps/gateway/Dockerfile:25-33`, `ci.yml:81-82`; marcadores do patch; risco de timeout do CI com
  build de imagem → job separado.
- **Travas:** merge na main = deploy (package.json e `apps/*/Dockerfile` estão nos Watch Paths) →
  PR sem merge; nunca `nest build` com watch (conferido: nenhum `nest start` rodando).

## Fontes (documentation-first)

- `node_modules/patch-package/dist/index.js:91-94` (8.0.1): sem `--error-on-fail`, fora de CI
  (`ci-info`), falha de patch sai com código 0; README `:204-215`.
- Marcadores do patch: reconstruído o original com `git apply -R patches/whatsapp-web.js+1.34.7.patch`
  numa cópia — `window.WWebJS.getMsgKeyId` e `already exists` têm 0 ocorrências no original.
- Node: `require.resolve(request, { paths })` (https://nodejs.org/api/modules.html) e
  `module.isBuiltin`.
- Dokploy (espelho local `~/dioggo-agents/agentes/docs/dokploy/latest/core/applications/rollbacks.mdx`):
  rollback automático do Swarm (health) × rollback por registry (Deployments → Rollback Settings).

## Encerramento — 25/09/2026

**RESULTADO:**

- `package.json`: postinstall `patch-package --error-on-fail`.
- `scripts/guardas-build.sh` (novo) — `patches` · `dist` · `deps <dir>` · `prisma`; e
  `scripts/verificar-deps-runtime.cjs` (novo) — resolve **e carrega** cada pacote do dist
  (lookbehind ignora `g.require(...)` da página do WhatsApp Web; crase e `import()` cobertos; falha se
  não achar nenhum pacote).
- `apps/gateway/Dockerfile`: `patches` depois do `npm ci`; `dist` depois do build; no estágio
  production `patches` + `dist` + `deps apps/gateway/dist` + `prisma` antes do ENTRYPOINT.
- `apps/dashboard/Dockerfile`: sem `COPY patches` (+ comentários corrigidos).
- `.github/workflows/ci.yml`: guardas no job `ci`; job novo `imagens` (build dashboard + gateway,
  compose, bucket, smoke do container com `/health` conferido por `jq`).
- `docs/how-to/rollback-gateway.md` (novo): rollback por registry (doc oficial do Dokploy) × `git
revert`, tempos medidos, o que não usar.

**Provas (build local, Docker Desktop 29.8.0, macOS arm64):**

| Cenário                                | Resultado                                                             |
| -------------------------------------- | --------------------------------------------------------------------- |
| Caminho normal — gateway               | exit 0; 122 s sem cache, 48 s com cache; 4 guardas OK na imagem final |
| Caminho normal — dashboard             | exit 0 (sem `patches/`)                                               |
| Patch corrompido (linha removida)      | exit 1 — `**ERROR** Failed to apply patch` (`--error-on-fail`)        |
| `patches/` vazio                       | exit 1 — guarda `patches`                                             |
| `zod` removido da imagem final         | exit 1 — guarda `deps` (16 requires)                                  |
| `sonic-boom` (transitiva do pino) fora | exit 1 — guarda `deps` (carga de pino, nestjs-pino, baileys)          |
| `dotenv` fora (config do Prisma)       | exit 1 — guarda `prisma` (`Cannot find module 'dotenv/config'`)       |
| Smoke do container                     | `/health` ok (database/redis/storage true) ~2 s após o start; healthy |

**Revisão adversarial** (workflow `revisao-e2-guardas-build`, 3 céticos: Dockerfile/Dokploy, GitHub
Actions, semântica dos scripts): **1 bloqueante confirmado pelos 3** — com `--error-on-fail` o build
do dashboard no Dokploy quebraria sempre (o `npm ci` dele não instala o wwebjs, mas copiava
`patches/`; o CI antigo não constrói a imagem do dashboard) → corrigido e provado. Importantes/menores
aplicados: `prisma validate` na imagem final; guarda `deps` passa a carregar os pacotes (transitiva);
smoke confere o corpo do `/health` (storage); regex com crase/`import()` e falha com 0 pacotes;
comentário do `/tmp/guardas` corrigido. Não aplicado: `RUN --mount` (exige confirmar BuildKit no
servidor do Dokploy — ganho de ~20 KB não compensa o risco).

**Validação:** `npm run lint` · `npm run format:check` · `npm run depcruise` ·
`npx tsc --noEmit -p apps/gateway/tsconfig.json` · `npm run test:unit` — ver commit; mapa gerado em
dia (`node scripts/mapa-codigo.mjs --check`; os scripts novos não são TypeScript).

### Reconciliação documental — R3/R9

- Build/CI mudaram → MAPA-CODIGO (§4.4 cadeia de CI/npm lifecycle, tabela de arquivos, P-055 em §5.1),
  runbook novo (MAPA "operar sob pressão" já aponta `how-to/`), `deploy-dokploy.md` (link do
  rollback), PENDENCIAS (P-055 + B-004), ESTADO, SESSOES (aviso + histórico), CHANGELOG, roteiro.
- **Docs-n/a:** INTEGRACAO/contracts/ARQUITETURA — nenhum contrato, rota ou fronteira mudou; DECISOES
  — nenhuma decisão nova (execução de pendência já decidida).

### Checkpoint

- **O QUE FOI FEITO:** P-055 completa + runbook de rollback.
- **PACOTES ADICIONADOS:** nenhum.
- **DECISÕES REGISTRADAS:** nenhuma.
- **EFEITO DE DEPLOY:** quando o dono mergear a Onda 1 (deploy A), gateway e dashboard reconstroem
  (package.json e Dockerfiles nos Watch Paths). Comportamento de runtime inalterado; o build fica mais
  rígido (falha alto em vez de gerar imagem ruim).
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** guarda com falso positivo travando deploy legítimo → caminho
  normal provado local (as 2 imagens) + job `imagens` no CI roda as mesmas guardas antes do merge.

## BLOQUEADO EM VOCÊ

- Nada novo desta etapa. O merge vem no fim da E4 (deploy A) e depois o **B-004**.
- Opcional, recomendado: configurar um **registry** no Dokploy e ligar **Deployments → Rollback
  Settings** no app `gateway` (rollback em segundos — `how-to/rollback-gateway.md` §2).

## DOCS TOCADAS

`CHANGELOG.md` · `docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/MAPA-CODIGO.md`
· `docs/ROTEIRO-ONDAS-2026-09.md` · `docs/deploy-dokploy.md` · `docs/how-to/rollback-gateway.md`
(novo) · esta sessão.
