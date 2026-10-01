# Sessão: E21/P-022 — testes do parser cgroup

- **Status:** ✅ encerrada em código; CI/merge finais no PR canônico da branch.
- **Início:** 30/09/2026 22:56 BRT.
- **Branch/base:** `feature/onda21-cgroup-tests`, `origin/main=c818f89`.
- **Objetivo:** fechar somente a lacuna de testes do parser cgroup, com revisão independente, um PR, CI verde e merge ao fim conforme roteiro.
- **Escopo:** specs de `shared-kernel/memory.ts` e consumidores health/observability com portas falsas; documentação e mapa.
- **Fora do escopo:** runtime/política/API/env/schema/deps/build, demais lacunas P-022, engines/ATIVA WWEBJS/node n8n e produção/Dokploy/deploy/canário/conta/QR/check/envio real.

## ECO DE LEITURA

- **R9:** ESTADO, SESSOES completo/avisos/cinco últimas, PENDENCIAS, BASE v4.3/R0/R3/R6/R9, DONE licença, triagem E21 e mapa shared-kernel/memory/health lidos. Sessão alheia `lid-envio-wwebjs` permanece fora do escopo.
- **Base remota:** fetch realizado; PR32 MERGED `c818f890f831e5b48c6fc5b6303c64029aecc9af`, checks ci/imagens SUCCESS no run36801357400, CI main SUCCESS36802076236. Feature criada de origin/main atualizada.
- **Lacuna confirmada:** nenhum spec de memoryStats/current/inactive_file encontrado; health e2e não controla cgroup. Parser privado será exercitado pela API pública real, sem extração.
- **Recorte:** current−inactive_file, leitura/valores inválidos, limite ausente, fallback heap V8, arredondamento e limiar dos consumidores reais. Fixtures interceptam fs/process/v8; nenhum arquivo cgroup/proc real acessado. Mutações em cópia isolada e controle positivo.
- **Invariantes:** licença/claims/cache/limites existentes, D-050 purge/família/reuso/locks/recheck READ COMMITTED/timers, ACK D-049, G4/G5 D-047, QR D-048, tipos W5, métrica30d/cota observe0, TS5.9.3/CLI11/Vitest5/SWC/CJS/buildinfo e epochs/lease/CAS/8s preservados.
- **Operação/pendências:** P-022 parcial; P-100/P-101/P-102 abertas/P-099 sem drenar. Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais, primeira troca/rollback D-050 stop-first, migration/stop-first D-049 e snapshots7d E21 recalculados ou24h antes enforce/canário mantidos. Produção último SHA documentado768fb26, sem conferência ao vivo.
- **Locais:** `.codex/`, `AGENTS.md`, `seed-mock.js`, `apps/gateway/prisma/seed-mock.ts` preservados fora do diff; nenhum watch encontrado. Node26.10.0 disponível no runtime canônico em /tmp/conexozenvo-e16.

## Recorte antes da implementação

O parser aceita current finito positivo, usa zero quando a chave inactive_file não casa,
retorna current quando a subtração não é positiva, e retorna null se qualquer leitura
falhar. memoryStats usa cgroup somente com limite positivo; fallback é used_heap_size /
heap_size_limit, nunca heapTotal/RSS. Health compara o ratio arredondado com <0.9;
summary repassa os campos. Testes caracterizam essa política sem endurecer o parser.

## Checkpoints

- Abertura: fonte oficial e matriz adversarial delegadas; nova feature de origin/main, nenhuma operação produtiva.
- Fontes oficiais conferidas: [Linux cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory-interface-files) documenta memory.current em bytes/descendentes e memory.stat por chaves cuja posição pode mudar; [Docker stats](https://docs.docker.com/reference/cli/docker/container/stats/#description) usa inactive_file no desconto cgroup v2. Não se interpreta inactive_file como todo cache recuperável.
- Node26.10.0 confirmado no PATH canônico, npm11.19.1; contratos de constrainedMemory (bytes/0 sem limite conhecido) e V8 (used_heap_size/heap_size_limit em bytes) conferidos nas fontes fixas `https://nodejs.org/download/release/v26.10.0/docs/api/process.md` e `v8.md`, cópias `/tmp/conexozenvo-e21-process-26.10.0.md:1104-1106` e `/tmp/conexozenvo-e21-v8-26.10.0.md:227-233`. Espelho local oficial Node26 `process.md:1144-1146` e `v8.md:250-256` corroboram.
- Vitest5.0.2 instalado; mocks hoisted/variáveis vi.hoisted conferidos na [doc fixada](https://github.com/vitest-dev/vitest/blob/v5.0.2/docs/api/vi.md#vimock) e `node_modules/vitest/dist/index.d.ts:627-640`. TS5.9.3/Nest12.1.1/Prisma7.10.0 preservados. Sem reinstalação/dependência nova.
- Implementação:39 casos pela API memoryStats real e19 pelos consumidores health/summary reais; somente fontes fs/process/v8 e portas de infra falsas. Nenhuma extração/export/runtime novo, nenhum cgroup/proc real lido. Gramática permissiva explicitamente caracterizada (Number(trim)/prefixo numérico), sem endurecimento.
- Validação local:58 focused/1154unit gateway (64arquivos)/292painel verdes, tsc gateway e ESLint global verdes (exclusão apenas dos dois seeds locais), fronteiras301módulos/1129dependências e guardas patches verdes. Coverage do arquivo memory.ts42.22% statements/55.55% branches/50% functions/42.85% lines: trechos Chromium/PSS18-60 fora do recorte, não cobertos. Não é cobertura100% do arquivo/shared-kernel nem piso novo (D-018).
- No recorte round2/parser/memoryStats (linhas63-117), coverage JSON registra19/19 statements,20/20branches e3/3funções. As três funções Chromium/PSS continuam sem cobertura; não há alegação de100% do arquivo.
- Oito mutações em cópia isolada `/tmp/conexozenvo-e21-cgroup-mutations`, controles58/58 antes/depois: ignorar inactive_file16assertions, clamp WS zero2, aceitar current<=0 4, erro stat retorna current4, ratio sempre heap25, denominador heapTotal33, sem arredondamento3 e health<=0.9 2. Todas executaram58tests; parsing/import inválido não foi contado. Harness `/tmp/e21-cgroup-mutation-harness.py`, logs/JSONs em `mutation-logs/summary.json`; hashes memory.ts/health.service.ts iguais antes/depois/checkout real.
- Revisão independente APROVADA sem bloqueadores, incluindo rerun58/58 em Node26.10.0/Vitest5.0.2. Portas falsas comprovam o relatório/summary da aplicação, sem HTTP/banco/Redis/engine real.

## Encerramento / resultado

Lacuna cgroup P-022 coberta em três specs sem alteração de runtime. A fixture positiva
900bytes current/300inactive_file/1000limite resulta em600bytes/0.60 de pressão;
V8 distinto retorna0.46 e RSS/heapTotal não alteram o denominador. Falhas/valores
inválidos de current não leem stat e usam heap; stat ausente também usa heap, enquanto
stat legível sem chave reconhecida usa current. Desconto >=current mantém current,
ratio acima de1 permanece visível e cada coleta relê as fontes.

Health com heap0.97/container0.70 retorna ok; heap0.20/container0.95 degrada. A
igualdade0.90 e o valor0.896 arredondado para0.90 degradam conforme política atual.
Summary conserva campos/unidades/limite positivo ou null e fallback. Gramática atual
não foi endurecida e Chromium/PSS continua fora deste recorte.

- **Base/remoto:** PR32 MERGEDc818f89, ci/imagensSUCCESS36801357400 e CI mainSUCCESS36802076236 reconfirmados na abertura. Commits/CI/merge desta feature são rastreáveis no PR canônico; produção não consultada/operada.
- **R3:** diff só specs/inventários/documentação, sem gatilho de rota/payload/schema/env/provider/decisão cara/build/deps; contracts/INTEGRACAO/ARQUITETURA/DECISOES sem mudança requerida. Mapa/estado/pendências/triagem/roteiro reconciliados.
- **P-022 parcial:** withDeadline/probes health é próximo recorte independente; C10 e demais lacunas continuam abertas. P-100/P-101/P-102 abertas/P-099 sem drenar, ATIVA WWEBJS/locais preexistentes preservados.
- **Operação:** nenhum efeito de deploy deste diff; publicação/canários anteriores C/D/E/F/B-004/B-005/B-007 manuais, D-050 primeira troca/rollback stop-first, D-049 migration/stop-first e snapshots7d E21 recalculados ou24h antes enforce/canário mantidos.

## ✅ CHECKPOINT — E21/P-022 · sessão2026-09-30-2256-e21-cgroup-tests

- **O QUE FOI FEITO:**58 regressões cgroup/consumidores, oito mutações com controles positivos, revisão independente e documentação reconciliada. P-022 parcial.
- **ARQUIVOS CRIADOS/ALTERADOS:** memory.spec.ts, health-memory.spec.ts, metrics-memory.spec.ts e docs/inventários abaixo.
- **PACOTES ADICIONADOS / DECISÕES REGISTRADAS:** nenhum/nenhuma; política existente preservada.
- **EFEITO DE DEPLOY:** nenhum; somente testes/documentação, sem operação produtiva.
- **AÇÕES OPERACIONAIS PARA O USUÁRIO:** nenhuma nova deste diff; gates/publicação/canários anteriores continuam manuais.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** pressão falsa por desconto/denominador/fallback/limiar errado →58specs/oito mutações; mocks/CommonJS incompatíveis →tsc/CI.
- **BLOQUEADO EM VOCÊ:** nenhum para código/PR/merge; operações anteriores manuais.
- **DOCS TOCADAS:** CHANGELOG, ESTADO, SESSOES/ARQUIVO, PENDENCIAS, ROTEIRO, MAPA-CODIGO, triagem E21, inventários gerados e este DONE. Nenhum Docs-n/a requerido/omitido.
- **COMANDOS PARA VALIDAR:** PATH Node26.10.0; npm run test:unit; tsc --noEmit -p apps/gateway/tsconfig.json; ESLint global excluindo apenas dois seeds locais; Prettier --check de versionados/novos; npm run depcruise; guardas-build.sh patches; mapa-codigo.mjs --check. Focused/coverage nos três specs, include memory.ts, report JSON em /tmp/conexozenvo-e21-cgroup-coverage. CI roda suíte unit/e2e completa, cobertura, typechecks/builds/imagens/smokes; sem novo e2e/runtime/build neste diff, não necessário subir infra/repetir builds localmente.
- **SESSÃO ATUALIZADA:** sim; ATIVA→DONE, histórico15/arquivo preservados.
- **PARA CONTINUAR EM NOVA CONVERSA:** “Continue E21/P-022 pelo recorte de testes de withDeadline e probes do health no roteiro, partindo de origin/main.”
