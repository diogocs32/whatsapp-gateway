# Sessão: E21/P-022 — agendamento de CampaignService (start/resume)

- **Status:** ✅ encerrada em código; CI/merge finais no PR canônico da branch.
- **Início:** 01/10/2026 00:58 BRT.
- **Branch/base:** `feature/onda21-campaign-scheduling-tests`, `origin/main=8987018`.
- **Objetivo:** cobrir o agendamento existente por start/resume; um PR, revisão independente, CI verde e merge ao fim conforme roteiro.
- **Escopo:** novo spec ao lado do CampaignService, documentação e mapa gerado.
- **Fora do escopo:** runtime/política/worker/8s/API/env/schema/deps/build, C10/SQL e outras lacunas P-022, engines/ATIVA WWEBJS/n8n e produção/Dokploy/deploy/canário/conta/QR/check/envio real.

## ECO DE LEITURA

- ESTADO, SESSOES completo/ativas/avisos/cinco últimas, PENDENCIAS B-xxx/P-022, BASE v4.3/R0/R3/R6/R9, roteiro, DONE health, triagem E21 e MAPA-CODIGO campaigns/P-022 lidos. ATIVA lid-envio-wwebjs e arquivos locais preexistentes preservados fora do diff.
- Fetch confirma PR34 MERGED8987018, ci/imagens SUCCESS run36807850771; CI main SUCCESS36808626625. Feature própria criada da origin/main atualizada.
- Lacuna reconfirmada: nenhum spec dedicado ao serviço; e2e recovery/BullMQ6 usam min=max1/12 e provam recuperação/fila/8s, sem fronteiras do jitter. Assume somente agendamento por portas falsas; P-022 permanece parcial, C10 exige prova Prisma/SQL/default própria.
- Preservar licença/cgroup/withDeadline/health, D-050 purge/família/reuso/locks/recheck READ COMMITTED/timers, ACK D-049, G4/G5 D-047, QR D-048, W5/E20, TS5.9.3/CLI11/Vitest5/SWC/CJS/buildinfo e epochs/lease/CAS/8s.
- P-100/P-101/P-102 abertas/P-099 sem drenar. Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais; D-050 primeira troca/rollback stop-first, D-049 migration/stop-first e snapshots7d E21 recalculados ou24h antes enforce/canário. Produção último SHA documentado768fb26, sem consulta/operação.

## Recorte antes da implementação

CampaignService real por start/resume, sem acessar métodos privados nem exportar randInt.
Repo e queue falsos; Math.random e Date controlados. Fixtures e resultados literais
provam offset futuro/passado/igual/null, jitter inteiro mínimo/máximo inclusivos e
fronteiras internas, primeiro destinatário já atrasado e soma acumulada, inclusive
lista vazia. Payload e jobId devem carregar a época devolvida pelo CAS, mesmo zero;
startedAt existente se conserva. Status inelegíveis/CAS perdida não consultam
pendentes nem enfileiram. Enqueue é sequencial; falha após prefixo ou na listagem
pausa a mesma época e propaga erro; resume posterior agenda todos PENDING em nova
época. Barreiras de Promise exercitam corrida/perda de CAS e falha atrasada sem
substituir a prova SQL/Redis/worker já existente. Nenhuma política nova de rollback.

## Checkpoints

- Abertura: implementação e revisão/matriz independentes delegadas; root cuida fontes, mutações, gates e reconciliação documental.
- Versões instaladas reconfirmadas: Vitest/coverage5.0.2, TS5.9.3, BullMQ6.3.10. Node26.10.0 canônico disponível em `/tmp/conexozenvo-e16/node-v26.10.0-darwin-arm64/bin/node`; sem reinstalação. Nenhum watcher deste projeto identificado.
- Context7 resolve/query `/vitest-dev/vitest` consultado; índice retorna main, sem versão5. API reconfirmada na [tag5.0.2](https://github.com/vitest-dev/vitest/blob/v5.0.2/docs/api/vi.md), cópia `/tmp/conexozenvo-e21-vi-5.0.2.md`, e tipos instalados: spyOn/restoreAllMocks/useFakeTimers/setSystemTime/useRealTimers. Relógio simulado controla datas; estes testes não prometem horário real de execução BullMQ.
- Fonte ECMAScript [Math.random](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.random) conferida: valores no intervalo [0,1); fixtures usam 0 e 1−2^-53, nunca 1. Tag Vitest5.0.2 baixada de novo em `/tmp/conexozenvo-e21-campaign-vi-5.0.2.md` (linhas552-590/1163-1211/1261-1267) para confirmação atual, além dos tipos instalados.
- Revisão preliminar confirmou C10 separada: getState omite eventTs no create, schema default now() e migration DEFAULT CURRENT_TIMESTAMP. Fakes existentes não determinam a origem do default. Próximo handoff exige prova Prisma/SQL, sem correção por hipótese.
- Implementação inicial: spec dedicado com CampaignService real, resultados literais e portas falsas tipadas; lookup/transition falhos não pausam, list/queue falhos pausam época adquirida, pause count0 ainda propaga erro. Falha da própria pauseIfRunning substitui erro original conforme comportamento atual; sem nova política de erro/rollback. Barreiras verificam enqueue serial, CAS winner/loser e pausa aguardada; não há simulação completa de banco nem worker.
- Revisão adversarial inicial:71focused verdes, sem bloqueador runtime/contrato. Fortalecimentos dentro do recorte: relógio avança depois do primeiro enqueue (offset fixo), avança enquanto listagem espera (offset calculado após listagem) e drenagem de microtasks antes de afirmar awaitpause. Época0 é resposta artificial válida da porta number|null, não trajetória alegada do SQL que incrementa default0. Controles finais serão da versão estabilizada; mutações preliminares71 não entram no resultado final.
- Versão final estabilizada:75focused verdes,75/75 em revisão independente. Typecheck gateway e ESLint dos specs/global verdes (global exclui somente os dois seeds preexistentes). Suite local1259unitgateway/67arquivos +292painel/14arquivos verde; Node26.10.0. Fronteiras304módulos/1143dependências e guardas patches verdes. Mapa regenerado:21arquivos/369fontes/1843símbolos/129rotas.
- Coverage focused somente campaign.service:33/46statements,6/13funções,20/22branches. RandInt/start/resume/schedulePending/scheduleOrPause reais exercitados; create/list/get/recipients/pause/cancel/remove não são alvo deste spec. Sem piso novo ou alegação de100% do serviço/domínio.
- Mutações finais:24/24 recusadas por assertions, cada rodada executou75cases; controles75/75 antes/depois. Vinte e uma falharam somente por assertions; três também tiveram timeouts incidentais (gate resume invertido4, enqueue semawait2, pausa omitida2), que não são a razão contabilizada da morte. Reporter JSON não prova ausência de unhandled dos mutants. Nenhum erro de parsing/import conta como prova.
- Harness `/tmp/e21-campaign-scheduling-mutation-harness.py`; resumo/auditoria/logs em `/tmp/conexozenvo-e21-campaign-scheduling-mutations/mutation-logs/{summary,assertion-audit}.json`. Range sem+1 (22falhas), floor→round40/ceil44, unidade50, soma21, offset futuro6/passado2/recalcular2/antes-listagem2, epoch payload snapshot50/fixo50 e jobId snapshot50/fixo50, CAS start2/resume2, gate resume invertido37/ampliado3, finalizadas2, pausa semepoch11/epocherrada11, enqueue semawait11/pausa semawait4, erro sempausar11/engolido9. Todas têm pelo menos duas assertions independentes.
- SHA256 CampaignService original/scratchrestaurado/repo iguais `9f02b6e22198bcd64e2c0fef4910815add1db8eb57de0d75c290ae7a9485b265`; spec final e hashes registrados no resumo. Mutações preliminares71 preservadas em scratch separado e não contadas como controles finais.

## Encerramento / resultado

A lacuna de agendamento P-022 está coberta por75testes no CampaignService real.
Repo/queue falsos e relógio/Math.random controlados caracterizam jitter mínimo e
máximo inclusivos, fronteiras internas, offset calculado após listagem e conservado
durante o loop, atraso do primeiro/soma/ordem e epoch/jobId da transição conquistada.
StartedAt/status/no-op/perda de CAS, prefixo enfileirado antes da falha, interrupção
do restante e nova época no resume estão cobertos. Barreiras provam await serial
no enqueue, winner/loser de CAS e await da pausa, inclusive count0. Se a própria
pausa rejeita, seu erro substitui o original conforme comportamento atual.
Época0 é resposta artificial válida da porta number|null, não trajetória alegada
no SQL que incrementa default0. Nenhuma implementação privada foi extraída/exportada.

Estes testes provam contrato do serviço com portas falsas. Não provam atomicidade
SQL, jobs/entrega Redis, worker/limiter8s, pontualidade produtiva ou comportamento de
WhatsApp. Os e2e recovery/BullMQ6 preservados exercitam SQL/Redis/worker com transporte falso no CI.
Nenhum runtime/política/API/env/schema/deps/build foi alterado; nenhuma conta/QR/
check/envio real nem consulta/operação produtiva/Dokploy/deploy/canário foi feita.

- **Base/remoto:** PR34 MERGED8987018, ci/imagensSUCCESS36807850771 e CI mainSUCCESS36808626625 reconfirmados01/10. Commits/CI/merge desta feature ficam no PR canônico; merge não comprova publicação.
- **R3:** diff só spec/inventários/docs; nenhum gatilho de rota/payload/schema/env/provider/decisão cara/build/deps. Contracts/INTEGRACAO/ARQUITETURA/DECISOES não precisam mudar. Mapa reconcilia jobId com epoch, start PAUSED, ausência de loop PAUSED E14 e separação provas serviço/SQL/Redis; detalhes worker apontam §3.6/D-040.
- **P-022 parcial:** próximo C10/GuardrailService.getState/apply exige prova própria Prisma7/SQL/default/eventTs/TimeZone, sem correção por hipótese. Demais lacunas abertas; stripRaw/HMAC já têm provas de efeito. P-100/P-101/P-102 abertas/P-099 sem drenar; ATIVA WWEBJS/locais preexistentes preservados.
- **Operação:** gates/publicação/canários C/D/E/F/B-004/B-005/B-007 anteriores manuais, D-050 primeira troca/rollback stop-first, D-049 migration/stop-first e snapshots7d recalculados ou24h antes enforce/canário preservados. Nenhuma ação operacional nova deste diff.

## ✅ CHECKPOINT — E21/P-022 · sessão2026-10-01-0058-e21-campaign-scheduling-tests

- **O QUE FOI FEITO:**75regressões de agendamento start/resume,24mutações com controles positivos, revisão independente e reconciliação documental; P-022 parcial.
- **ARQUIVOS CRIADOS/ALTERADOS:** campaign-scheduling.spec.ts, documentação e dois inventários gerados.
- **PACOTES ADICIONADOS / DECISÕES REGISTRADAS:** nenhum/nenhuma; sem política nova.
- **EFEITO DE DEPLOY:** nenhum; somente testes/documentação, nenhuma operação produtiva.
- **AÇÕES OPERACIONAIS PARA O USUÁRIO:** nenhuma nova; gates/publicação/canários anteriores continuam manuais.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** offset/jitter/acúmulo/epoch/jobId/gates/await incorretos →75focused/24mutações; porta fake/tipos/decorators incompatíveis →typecheck/CI.
- **BLOQUEADO EM VOCÊ:** nenhum para código/PR/merge; operações anteriores manuais.
- **DOCS TOCADAS:** CHANGELOG, ESTADO, SESSOES/ARQUIVO, PENDENCIAS, ROTEIRO, MAPA-CODIGO, triagem E21, inventários README/gateway-campaigns e este DONE; nenhum Docs-n/a omitido.
- **COMANDOS PARA VALIDAR:** PATH Node26.10.0; npm run test:unit; tsc --noEmit -p apps/gateway/tsconfig.json; ESLint global excluindo somente seed-mock.js/apps/gateway/prisma/seed-mock.ts; Prettier --check --ignore-unknown dos versionados/novos; npm run depcruise; guardas-build.sh patches; mapa-codigo.mjs --check. Focused/coverage: vitest run --project unit src/modules/campaigns/application/campaign-scheduling.spec.ts, include campaign.service.ts e JSON em /tmp/conexozenvo-e21-campaign-coverage. CI roda unit/e2e completos, cobertura/typechecks/builds/imagens/smokes; diff só spec/docs não exige subir infra/repetir builds localmente.
- **GATES FINAIS LOCAIS:** Prettier de649versionados/novos com --ignore-unknown verde (locais preexistentes fora da seleção); mapa21arquivos em dia; diff --check verde. Revisão independente APROVADA após conferir histórico15, arquivo preservado, contagens/hashes/limites e tabela divergência dev×produção.
- **SESSÃO ATUALIZADA:** sim; ATIVA→DONE/histórico15/arquivo preservados.
- **PARA CONTINUAR EM NOVA CONVERSA:** “Continue E21/P-022 pelo recorte C10 de GuardrailService.getState/apply no roteiro, partindo de origin/main.”
