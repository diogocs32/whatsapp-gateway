---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-29
validade: 2026-12-25
status: ativo
origem: P-054 (etapa E3 — patches de segurança sem major)
---

# 🛡️ Checagem de advisories de REPOSITÓRIO (o que o `npm audit` não vê)

> **Problema:** o `npm audit` consulta só o GitHub Advisory Database global. Advisory publicado
> **apenas no repositório** do mantenedor fica invisível. Exemplo real: **GHSA-9c5c-9qcx-q35q**
> (nestjs/nest, `@nestjs/platform-fastify < 11.2.4`, campo `ecosystem` vazio, 404 na base global).
> Em 25/09/2026 eram 12 advisories de repositório afetando o lockfile, 10 invisíveis ao `npm audit`.
>
> **Solução:** `scripts/checar-advisories.mjs` + `scripts/checar-advisories.config.json`, rodando
> todo dia às 07:23 BRT no workflow `.github/workflows/advisories.yml` **depois que ele estiver na
> `main`** (antes disso só roda em PR), também em PR que mexe no lockfile, em `apps/gateway/package.json`,
> no `apps/gateway/Dockerfile` ou no script, e manual via **Actions → Advisories → Run workflow**.

## 1. O que é checado

| Tipo no config | O que é avaliado                                                                                                                                                                                                                                                                                                                                       | Exemplo                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `npm`          | Cada pacote citado no advisory × **todas** as cópias dele no `package-lock.json` (casa pelo nome; lista "a, b" vira um nome por item; nome fora do lockfile é avaliado contra o único pacote do repo ou vira aviso; `ecosystem` só é anotação)                                                                                                         | nestjs/nest, fastify/\*, Baileys |
| `runtime`      | Componente EMBUTIDO no Node (o `fetch`/safe-fetch do gateway — fora do lockfile): com `imagem`, o undici do Node fixado no `FROM` do **estágio final** do Dockerfile (lido de `deps/undici` no repo nodejs/node naquela tag) + releases de segurança mais novas da mesma linha (`nodejs.org/dist/index.json`); estágio final sem versão exata = exit 2 | nodejs/undici                    |
| `infra`        | Com `producao` preenchida: as faixas × essa versão. Sem ela: high/critical dos últimos `janelaInfraDias` (180)                                                                                                                                                                                                                                         | traefik, Dokploy, redis, MinIO   |

Faixas de advisory de repositório são **texto livre** (`>= 12.0.0 < 12.0.2 and < 11.2.4`,
`< 12.0.3 || < 11.2.5`, `<7.0.0-rc12,<6.7.22`, `≤ v0.29.4`, `All`, `TBD`…). O comparador próprio do
script dá `afetada` / `nao-afetada` / `indeterminada` e, na dúvida, **nunca** diz `nao-afetada`. Faixa
ambígua é desempatada por `patched_versions` (instalada ≥ versão corrigida da mesma major.minor → não
afetada); sem desempate vira `indeterminada` (triagem humana). Os casos reais estão no `--autoteste`.

## 2. Rodar localmente

```bash
node scripts/checar-advisories.mjs                    # relatório markdown no stdout
node scripts/checar-advisories.mjs --json /tmp/a.json # + resultado em JSON
node scripts/checar-advisories.mjs --autoteste        # comparador, offline
node scripts/checar-advisories.mjs --informativo      # pendência não quebra (só exit 2)
node scripts/checar-advisories.mjs --config <cópia.json> --lockfile <outro-lock.json>  # simulação
```

Token: `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token` → sem token. **Sem token não cabe** (60 req/h;
são 63 repos = 63 requisições por rodada em 25/09, nenhum com mais de 100 advisories) → faça
`gh auth login` antes. **Exit:** `0` nada pendente · `1`
pendência · `2` falha de consulta/config (API fora, rede, repo renomeado sem config atualizado).

**O Node local NÃO conta:** o runtime avaliado é o do `FROM node:26.10.0-bookworm-slim` do estágio
final de `apps/gateway/Dockerfile` (undici 8.10.2); `ARG` e espelho de registry são resolvidos. Se o
estágio final voltar a uma tag móvel (ou digest puro), a rodada sai com **exit 2** — a versão de
produção ficaria ao acaso do cache do build. Advisory novo do undici ou release de segurança do Node
(`security: true` em `nodejs.org/dist/index.json`) mais nova que a fixada → **subir o `FROM` nos DOIS
estágios** (não há aceite para isso) e conferir o `Runtime: Node …` no log de boot depois do deploy.
Release comum mais nova vira **aviso**: a tag exata deixa de receber rebuild da base Debian.

Comando manual equivalente para UM repo (útil para conferir o script):

```bash
gh api 'repos/nestjs/nest/security-advisories?state=published&per_page=100' --paginate \
  --jq '.[] | [.ghsa_id, .severity, .published_at[0:10],
        (.vulnerabilities[]? | "\(.package.name) \(.vulnerable_version_range) → \(.patched_versions)")] | @tsv'
```

## 3. Ler o relatório

Aparece no stdout e no **resumo do job** (Actions → execução → Summary).

- **Resultado** (topo): `✅ nada pendente`, `❌ N pendência(s)` ou `⚠️ falha de consulta`.
- **Runtime**: qual Node/undici entrou na conta — o do `FROM` do Dockerfile (produção a partir do
  deploy que levar o pin; a imagem de 15/09 usou a tag móvel: conferir `Runtime: Node …` no log de
  boot ou `node -p process.versions` no container — B-007).
- **Achados**: linha `PENDENTE` = afetada/indeterminada sem aceite válido; `aceito até …` = aceite
  vigente (com o motivo). `onde` mostra o caminho no lockfile, `N cópias` ou `(só dev)`.
- **Infra sem versão de produção**: `Novas` falham (publicadas ou **atualizadas** depois do
  reconhecimento — `⚠️ atualizado após o reconhecimento — releia`); `Reconhecidas` (recolhidas) são
  advisories já lidos, pendentes da B-007.
- **Cobertura**: dependência direta de runtime de `apps/gateway/package.json` sem repo no config.
- **Avisos**: aceite vencido/inválido/sem uso, repo redirecionado (renomeado), token recusado,
  advisories de pacote fora do lockfile (ex.: `@nestjs/microservices`), Node fixado atrás da linha.

## 4. Aceitar um advisory (npm/runtime) — decisão do **dono**

Só quando o advisory **não se aplica** ao uso do gateway ou o fix exige major fora do escopo. Entrada
em `aceitos` do config:

```json
{
  "ghsa": "GHSA-p68q-wchp-6fh7",
  "pacote": "fastify",
  "motivo": "por que não se aplica AQUI (com arquivo:linha/grep) + o que libera o fix",
  "revisarAte": "2026-11-30"
}
```

- `pacote` = nome npm; no runtime, `undici`; em infra com `producao`, o `owner/repo`.
- `revisarAte` (AAAA-MM-DD, vale o dia inteiro): **vencido ou inválido volta a falhar**. Prazo curto
  (≤ ~2 meses) — o objetivo é revisar, não esquecer.
- Motivo técnico **verificável**, não "baixo risco". Os sete aceites de Fastify 5.11.3
  foram removidos na E18 (D-044): Fastify 5.12.5 cobre as versões corrigidas conferidas
  nos advisories oficiais. O JSON acima é apenas exemplo, não aceite vigente.
- Aceite sem achado correspondente aparece em **Avisos** → remova do config.

## 5. Infra: reconhecer e, depois da B-007, preencher `producao`

Cada repo `infra` tem `producao` (versão ou `null`), `devCi` (informativo), `reconhecidoEm` e
`motivoReconhecimento`.

- **`producao: null`** (hoje, todos): high/critical dos últimos 180 dias aparecem. `reconhecidoEm` é o
  **instante** (ISO em UTC, ex.: `"2026-09-25T16:21:13Z"`) em que a lista foi lida: publicados **e**
  atualizados até ele ficam em "Reconhecidas" sem falhar; publicados ou atualizados **depois** (mesmo
  no mesmo dia, ou um antigo que o mantenedor mexeu) falham. Data no futuro é erro de config.
  Leu o relatório e decidiu? Copie o instante da linha **Rodada** do relatório lido para
  `reconhecidoEm` e atualize o motivo.
- **Quando a B-007 trouxer as versões** (`traefik version`, versão do painel Dokploy, `INFO server` do
  Redis, imagem do MinIO): preencha `"producao": "3.6.7"` (sem `v`). A partir daí o repo é avaliado
  como npm: **toda** faixa que pega a versão falha até atualizar a infra ou aceitar
  (`"pacote": "traefik/traefik"`). O `reconhecidoEm` deixa de ser usado.
- MinIO: a produção é o community arquivado (`minio/minio`, B-006). O fork do dev/CI (`pgsty/minio`,
  hoje redirecionado para `pgsty/silo`) não publica advisories — correções saem nas release notes.

## 6. Node e undici

`nodejs/node` **não publica** advisories de repositório (0 em 25/09/2026, `gh api
repos/nodejs/node/security-advisories`). A fonte oficial de segurança do Node é
<https://nodejs.org/en/blog/vulnerability> (há feed RSS). O undici embutido é coberto pelo tipo
`runtime` (advisories de `nodejs/undici`), na versão que vem com o Node fixado no Dockerfile, e as
releases de segurança do próprio Node são lidas de `nodejs.org/dist/index.json` (campo `security`).
**Troca assumida com o pin (D-023):** o Node de produção não sobe mais sozinho com o cache do build —
o gatilho para subir o `FROM` é esse alerta. Tabela útil (conferida em 25/09 em
`deps/undici/src/package.json` de cada tag): Node 26.8.0/26.8.1 → undici 8.10.0; 26.8.2, 26.9.0 e
26.10.0 → 8.10.2.

## 7. Quando revisar a lista de repos

- Entrou dependência de **runtime** nova em `apps/gateway/package.json` → a seção **Cobertura** avisa;
  inclua `{ "repo": "owner/repo", "tipo": "npm", "pacotes": ["nome"] }` (o owner/repo está no campo
  `repository` de `node_modules/<pkg>/package.json` — confira com `gh api repos/<o>/<r>`, porque o
  campo às vezes aponta nome antigo: `prisma/prisma` → `prisma/orm`, `siimon/prom-client` →
  `prometheus/client_js`).
- **Aviso de redirecionamento (HTTP 301)** → repo renomeado/transferido: troque pelo nome novo.
- Nova peça de infra em produção → novo repo `infra`.

## 8. Notificação de falha (cron)

- O e-mail de falha de workflow agendado vai para **quem criou o workflow ou alterou o `cron` por
  último** (quem reativar um workflow desativado passa a receber).
- Só chega se essa pessoa ligou o e-mail de Actions (o padrão é não notificar): **Settings →
  Notifications → System → Actions → marcar "Email" e "Only notify for failed workflows" → Save**.
- Em repositório **público**, workflow agendado é desativado após 60 dias sem atividade no repo.
- `schedule` e `workflow_dispatch` só funcionam com o arquivo na **branch padrão** (`main`).

## Fontes (conferidas em 25/09/2026)

- REST — List repository security advisories (parâmetros `state`, `per_page`, cursor; campos
  `vulnerable_version_range`/`patched_versions`; `ecosystem` documentado como enum, mas os dados
  reais trazem `''` e `typescript`): <https://docs.github.com/en/rest/security-advisories/repository-advisories>
- Paginação pelo header `link` (`rel="next"`): <https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api>
- Rate limit (60/h sem token; 1.000/h por repo com `GITHUB_TOKEN`; 403/429 ao estourar):
  <https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api>
- `gh api` (`--paginate`, `--jq`, `--slurp`): <https://cli.github.com/manual/gh_api>
- `schedule` (branch padrão, atrasos na virada da hora, 60 dias, quem recebe) e `workflow_dispatch`:
  <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>
- Notificações de workflow: <https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs>
  e <https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications>
- `permissions` (não listadas viram `none`) e `concurrency`:
  <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- Resumo do job (`GITHUB_STEP_SUMMARY`, 1 MiB por step):
  <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands>
- `setup-node` `check-latest` (sem ele, usa a versão em cache do runner):
  <https://github.com/actions/setup-node/blob/v4.4.0/docs/advanced-usage.md#check-latest-version>
- Segurança do Node: <https://nodejs.org/en/blog/vulnerability>
