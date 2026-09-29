---
id: e16-manutencao
inicio: 2026-09-29 13:40 BRT
branch: feature/onda5a-manutencao
base: origin/main 54c659ae05638f58589afa4742d55fccbb32ab98 (merge PR 21)
etapa: E16 / P-062 parte 1
status: concluida-em-codigo — CI/merge como gates do PR; deploy D manual pendente
---

# E16 — manutenção leve de imagens, CI e dependências

## ECO DE LEITURA (R9)

- ESTADO: E15 concluída em código, produção no último SHA documentado `768fb26`, sem
  conferência ao vivo. PR #21 confirmado MERGED em `54c659a` por `gh pr view 21` em 29/09;
  jobs `ci` e `imagens` SUCCESS. `git fetch origin` confirmou essa base.
- SESSOES completo e cinco últimas: preservar a sessão alheia `lid-envio-wwebjs` e os
  arquivos locais untracked `.codex/`, `AGENTS.md`, `seed-mock.js` e
  `apps/gateway/prisma/seed-mock.ts`. Nenhum watch Nest/Vite/processo dist encontrado.
- PENDENCIAS: assumir só P-062 parte 1. E17 (BullMQ 6/ulid 3), E18 (Nest 12) e E19
  (demais majors) ficam para etapas próprias. P-099 exige medir backlog, nunca drenar filas.
- DONE E15 e D-039/D-040/D-041: preservar lease/auth cercados, épocas e limiter/slot 8 s,
  afinidade e falha explícita do proxy; DEAD na mesma transação da lease. D-038 proíbe
  apagar atribuições órfãs carimbadas. Nenhuma alteração de engine/contrato nesta etapa.
- Avisos E2/E3/E11 e MAPA-CODIGO §4.4/P-062: postinstall deve falhar se patch não aplicar;
  gateway tem as duas engines e Chromium, painel instala só seu workspace sem patches;
  manter guardas de patches/dist/deps/Prisma, TS 5.9.3 e allowScripts revisado.
- Roteiro/Regras: um PR, revisão por agentes, CI verde e merge ao fim. D-027: deploys
  manuais. Deploy C e canários anteriores continuam com o dono (B-004/B-005/B-007,
  P-099, B-001 depois); nenhum Dokploy, conta, QR ou envio real nesta sessão.

## Escopo e plano

1. Dockerfiles dos dois apps, workflows CI/advisories, manifests/lockfile e guardas/smoke
   de build se necessário. Pontos globais: `package.json`, `package-lock.json`, `ci.yml`.
2. Fontes oficiais/versões instaladas antes de editar; Node/nginx por digest, Actions
   node24 por SHA e Ubuntu fixo, ts-node só se comprovada ausência de uso, allowScripts
   explícito e minors de tooling/React. Sem migrations/env/rotas/payloads novos.
3. npm ci/postinstall, unit/e2e com fakes, lint/formato/fronteiras/typechecks/builds e
   Dockerfiles com smoke; revisão independente; mapa/docs/checklist deploy D e E17.
4. Commit/PR/CI/merge autorizados pelo dono. O deploy permanece manual.

## Fontes verificadas antes da mudança

- Node local original 26.0.0/npm 11.12.1 não prova a política nova. Validação executada
  com distribuição oficial isolada Node 26.10.0/npm 11.19.1, sem instalar globalmente;
  SHASUMS256 conferido, Undici embutido 8.10.2. Runtime das imagens também conferido.
- Docker `buildx imagetools inspect`: índices OCI com linux/amd64 e linux/arm64;
  [política oficial de pins](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions).
  Node `26.10.0-bookworm-slim@sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2`
  nos três FROM; nginx `1.30.5-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94`.
- [checkout v5.1.0](https://github.com/actions/checkout/releases/tag/v5.1.0) e
  [setup-node v5.0.0](https://github.com/actions/setup-node/releases/tag/v5.0.0):
  SHA/tag e `action.yml` conferidos (`runs.using=node24`, runner ≥2.327.1).
  Ubuntu 24.04 e Node 26.10.0 exatos; credenciais checkout não persistidas.
- [npm 11.19.1 strict preflight](https://github.com/npm/cli/blob/v11.19.1/lib/utils/strict-allow-scripts-preflight.js)
  e Context7 `/npm/cli`: falta de aprovação falha; `false` recusa o script explicitamente.
  `npm explain ts-node` e busca de scripts/configs/fontes rastreados comprovaram que só
  havia a dependência direta sem uso; Nest compila e Vitest usa SWC.
- Releases oficiais: [React 19.3.0](https://github.com/react/react/releases/tag/v19.3.0),
  [Router 7.18.4](https://github.com/remix-run/react-router/releases/tag/react-router%407.18.4),
  [Vite 8.3.1](https://github.com/vitejs/vite/releases/tag/v8.3.1),
  [dependency-cruiser 18.4.0](https://github.com/sverweij/dependency-cruiser/releases/tag/v18.4.0),
  [ESLint 10.11.0](https://github.com/eslint/eslint/releases/tag/v10.11.0),
  [typescript-eslint 8.71.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.71.0),
  [Prettier 3.9.9](https://github.com/prettier/prettier/releases/tag/3.9.9).
  React/DOM/tipos alinhados em 19.3.0; plugin-react, Tailwind e globals já atuais.

## Implementação e revisão

- D-042 fixa bases/Actions e mantém manutenção dentro das majors existentes. Engines,
  Nest, Prisma, BullMQ/ioredis, Vitest, TS 5.9.3 e patches não mudaram. ts-node removido.
- Oito decisões em `allowScripts`: seis anteriores preservadas, fsevents 2.3.3 aprovado
  e puppeteer 24.38.0 negado. Chromium externo por `WWEBJS_CHROME_PATH`, inclusive no
  helper local de memória; `PUPPETEER_SKIP_DOWNLOAD=true` conservado nas imagens/CI.
- Dois agentes mapearam imagens/Actions e dependências. Revisão adversarial independente
  conferiu pins, lockfile, política e smoke; apontou a falta de POST protegido com API key
  inválida na R15. O CI agora exige 401 e também login sintético com cookie.
- Login mantém **201**, comportamento real já existente do endpoint Nest, embora R15
  diga 200 genericamente. R0 prevalece: nenhuma alteração de contrato para mudar o teste.
  O sucesso usa IP reservado separado do balde das dez falhas do smoke de rate-limit.
- `scripts/smoke-dashboard.mjs` valida nginx/SPA/JS/CSS/cache/gzip/headers/asset 404 na
  imagem pronta. Advisories já interpreta `FROM` com digest (146 autotestes verdes).
  actionlint apontou SC2086 preexistente no parâmetro MODO: agora ele é passado com aspas.

## Evidência local e limites

| Gate                                                  | Resultado                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci --strict-allow-scripts` com npm 11.19.1       | 975 pacotes; postinstall e os dois patches aplicados                                      |
| Prisma generate, fronteiras e três typechecks         | Sucesso; dependency-cruiser: 285 módulos/1.048 dependências                               |
| `npm run test:unit`                                   | 983 gateway + 292 painel                                                                  |
| `npm run test`                                        | 1.394 gateway em 86 arquivos + 292 painel em 14 arquivos; inclui E13/E14/E15 com fakes    |
| Builds gateway/dashboard                              | Sucesso, guardas de patches/dist/deps/Prisma preservadas                                  |
| Dockerfiles reais em linux/arm64                      | Ambos construídos; runtime Node 26.10.0 e Chromium 153.0.8010.52                          |
| Gateway isolado com Postgres/Redis/MinIO descartáveis | Health ok, database/redis/storage true, processo Nest UID 1000                            |
| Autenticação no gateway da imagem                     | API key inválida 401; login 201 com cookie; dez falhas 401 e 11ª 429 nas variantes de URL |
| nginx da imagem                                       | `nginx -t` e smoke HTTP passaram                                                          |
| Chrome 154.0.8037.58 sobre bundle nginx               | 12 cenários sintéticos passaram; zero erro JS/rota desconhecida                           |
| Advisories/autotestes                                 | 146/146; avaliação remota pelo job do PR                                                  |

- Chrome: login e digitação, `/conectar` sem token, filtros de sessão (nome/status/número
  anterior), URL/reload/limpar/estado vazio, diálogo de link com Esc/reabertura e formulário
  com troca de engine sem submeter. APIs interceptadas por respostas sintéticas; só 25
  GETs locais de assets/SPA na rede, dois 401 esperados no harness. Nenhuma conta ou QR real.
- Mutações descartáveis: retirar aprovação do SWC causou ESTRICTALLOWSCRIPTS; retirar
  gzip, X-Frame-Options, fallback SPA ou 404 de asset fez o smoke falhar no ponto esperado.
  Nenhuma mutação entrou no diff.
- Lint/formato globais enxergam os seeds untracked anteriores; não foram alterados.
  Lint complementar exclui só esses arquivos e formato verifica os arquivos versionados
  e novos desta etapa: ambos passaram. actionlint 1.7.7, `git diff --check` e mapa
  `--check` (21 arquivos) também passaram. CI limpo é o gate final; mapa sem diff gerado.
- Revisão final independente aprovou auth e runbook, sem regressão concreta pendente.
  Containers e rede exclusivos do smoke foram encerrados após a prova; infra anterior preservada.
- Artefatos temporários desta máquina em `/private/tmp/conexozenvo-e16/`: logs de gates,
  builds, mutações, `ci-auth-smoke.log`, `browser-smoke-result.json` e screenshots.
  Infra do smoke é isolada, efêmera e com credenciais sintéticas; não é prova de produção.

## Checkpoint R9 e reconciliação R3

- **Entregue:** P-062 parte 1 em `feature/onda5a-manutencao`, criada da `origin/main`
  `54c659a` após merge confirmado do PR #21. [PR #22](https://github.com/diogocs32/whatsapp-gateway/pull/22),
  commit de implementação `ce7ada0`; CI verde antes do merge. Resultado remoto no PR.
- **Classe de erro coberta:** script de dependência não revisado, patch/entrypoint/pacote
  ausente no runtime, nginx sem asset/fallback/header/compressão e auth/rate-limit quebrado
  tornam os gates vermelhos; browser sintético cobre execução de React após a minor.
- **Reconciliação:** README explica Node/npm/instalação/Chrome externo; mapa e pendências
  refletem a manutenção entregue; D-042 registra pins e allowScripts. Nenhum schema,
  env, rota, payload ou comando npm novo: INTEGRACAO, contracts e CLAUDE não exigem mudança.
- **Efeito de deploy:** imagens novas dos dois apps exigem deploy D manual. Se a produção
  ainda não recebeu Onda 3, cumprir primeiro C/B-004/B-005/B-007, observar P-099 e B-001
  depois. O digest fixa a base, mas apt/Chromium e conteúdo do runner continuam variáveis.
- **Limites:** sem deploy, canário, conta, QR ou mensagem real; último SHA de produção
  documentado `768fb26`, sem verificação ao vivo. Majors E17/E18/E19 ficam abertas na P-062.

## BLOQUEADO EM VOCÊ

- Nada para implementação/merge. Deploy D, pré-requisitos C e canários dependem da janela
  do dono: [checklist D](../how-to/deploy-d-manutencao.md). Nenhuma operação no Dokploy.

## DOCS TOCADAS

- Este DONE; ESTADO, SESSOES, SESSOES_ARQUIVO (quatro linhas movidas, histórico ativo em 15),
  PENDENCIAS, ROTEIRO-ONDAS-2026-09, DECISOES (D-042), MAPA, MAPA-CODIGO, README, CHANGELOG
  e `how-to/deploy-d-manutencao.md`. Inventário regenerado/conferido, sem diff de fontes.

## Mensagem da próxima etapa

```text
Execute E17/P-062 parte 2 conforme docs/ROTEIRO-ONDAS-2026-09.md, seguindo as Regras de toda etapa: BullMQ 6 com ioredis 5 + ulid 3. Crie feature/onda5b-bullmq6 da origin/main atualizada após merge da E16; um PR, CI verde e merge ao fim.
Leia DONE E16 e D-039/D-040/D-041/D-042. Confirme versões, peers e guias oficiais; preserve épocas, reidratação, limiter/slot de 8 s, lease, reserva cercada e backoff, sem drenar filas. Prove jobs legados, dois workers, reconexão Redis, webhook/retry/DLQ e CJS do ulid no runtime real.
Preserve TS 5.9.3, pins, npm ci --strict-allow-scripts, patches e todos os gates. Sem outras majors, quebra de /api, conta/QR/envio real. Deploys C/D e canários continuam manuais; entregue checklist E com compatibilidade N-1/rollback e mensagem E18.
```
