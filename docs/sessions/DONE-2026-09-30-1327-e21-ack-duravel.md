# Sessão: E21 continuação — ACK antes da persistência (P-078)

- **Status:** ✅ ENTREGUE EM CÓDIGO; CI/merge finais no [PR #29](https://github.com/diogocs32/whatsapp-gateway/pull/29), sem deploy.
- **Início:** 30/09/2026 13:27 BRT.
- **Branch/base:** `feature/onda21-ack-duravel`, `origin/main=899e86d`.
- **Objetivo:** reproduzir ACK antes do INSERT e corrigir sua persistência entre restart/réplicas; um PR, revisão independente, CI verde e merge ao fim.
- **Escopo:** módulo messaging (repositório/persister e testes), schema/migration aditiva se necessária, retenção do registro de ACK e documentação/mapa. Pontos globais: `schema.prisma`; nenhum payload público planejado.
- **Fora do escopo:** engines/ATIVA `lid-envio-wwebjs`, demais recortes do backlog, produção/Dokploy/deploy/canário, contas/QR/check/envios reais e limpeza de filas.

## ECO DE LEITURA

- **ESTADO:** E21/P-103 e P-018/P-091 entregues; produção no último SHA documentado `768fb26`, sem consulta atual. `git fetch origin` e `gh pr view 28` confirmam PR28 MERGED em `899e86d4d3f8d66cfdc03d62005f7f03d8d7688f`, ci/imagens SUCCESS em 30/09.
- **SESSOES:** arquivo completo, avisos e cinco últimas sessões lidos. Sessão alheia `lid-envio-wwebjs` preservada. Absorvidos D-047 identidade segura/ambiguousMature/reliable=false e D-048 QR inicial esgotado/STOPPED, sem parada imediata pelo token.
- **PENDENCIAS:** assume somente P-078. P-100/P-101/P-102 abertas, P-099 sem drenar. B-004/B-005/B-007 e deploys C/D/E/F/canários continuam manuais; snapshots7d precisam recálculo ou expiração24h antes de enforce/canário E21.
- **Roteiro/base:** mensagem P-078 em ROTEIRO; BASE v4.3/R0/R3/R6/R9; DONE QR e triagem E21. Preserve epochs/lease/CAS/8s, contrato n8n0.4.1, métrica30d/cota observe0, TS5.9.3/CLI11, Vitest5/.mts/SWC/e2e serial, node20/node16 CommonJS/buildinfo em dist e gates E16–E21.

## Recorte e checkpoints

- A reprodução de ACK antes do INSERT será registrada antes da implementação. Cache local sozinho é insuficiente; a solução deverá preservar ranking `sent < delivered < read < error`, alvo mais recente `(sessionId,keyId)` e política inbound existente.
- Arquivos locais preexistentes `.codex/`, `AGENTS.md`, `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts` preservados.

- **Reprodução antes do código:** `npm run test:e2e -w apps/gateway -- test/ack-red.e2e-spec.ts` com Node26.10/npm11.19 em 30/09 retornou exit1: `expected null to be 'read'`. ACK read aguardado antes do save, repositório novo sobre Postgres local; log `/tmp/conexozenvo-e21-ack-red.log`. Não depende de S3/engine/rede WhatsApp.
- **Recorte acordado antes de implementar:** tabela pending-only `wa_pending_message_acks` por sessão/key, rank máximo/lastSeenAt e cascade da sessão. ACK/save/histórico adquirem mesmo advisory xact lock em statement anterior às leituras, ReadCommitted. Consumo/delete junto ao INSERT/update; registro consumido não é reaplicado a futuros INSERTs da mesma key. Histórico em chunks/locks ordenados pelo hash efetivo. Retenção pela env existente RETENTION_MESSAGES_DAYS/default90 (0 desliga), lastSeenAt renovado mesmo em ACK duplicado/regressivo; sem nova env/contrato/evento. Alvo latest timestamp, ranking error superior e inbound mantidos.
- **Fontes/instalação:** Prisma7.10/Postgres18 locais, Context7 `/prisma/web` e docs oficiais PG18 locks/snapshots + Prisma transações interativas. Node26.10.0/npm11.19.1 de runtime local pinado; instalação estrita/patches aprovados. Primeira instalação usou shell26.0/npm11.12, que não prova strict; refeita com runtime correto, sem manifest/lock alterado.

- Primeiro GREEN da reprodução:1/1 em4,45s, exit0, log `/tmp/conexozenvo-e21-ack-green.log`. Migration aditiva aplicada só no Postgres local18.4 por `prisma migrate deploy`, client7.10 gerado; nenhuma migration antiga/edit/reset.
- Revisão independente identificou consumo singular concorrendo com purge (P2025 rollback INSERT) e propriedades herdadas de ACK_RANK. Corrigidos com deleteMany tolerando0 e Object.hasOwn; casos de efeito solicitados. N-1 ignorando locks exige primeiro deploy stop-first; rollback mantém schema, mas perde correção. Histórico foi otimizado com findMany por chunk e dedup anteslock; chunk falho deixa os anteriores importados e retry dedup recupera (limite/teste explícitos).
- Builds gateway/painel, patches/dist e typechecks iniciais verdes; comando dashboard inicialmente apontou tsconfig.app inexistente, corrigido para tsconfig.json sem mudança de código/config.

- 28 testes de efeito novos aprovados com MessagePersister/EventBus/Postgres/HTTP/Inbox/G4 reais e manager falso. Duas conexões/persisters distintos, ambas ordens de corrida aguardando advisory lock comprovadas por pg_locks, perda de objetos/conexões no restart sem cache local, ranks/error/inbound, colisões/consumo, histórico55/chunk2 rollback e retry, idempotência e rollback do INSERT, retenção/renovação/env0/cascade/purge concorrente e D-047 unreliable preservada.
- Revisão final independente APROVADA, sem achados abertos. Mutação em worktree isolado: controle28/28; no-lock2falhas(pg_locks), no-pending18falhas(status/GET/Inbox/G4/restart), delete singular1falha(P2025/INSERT rollback), no-rank2falhas(regressão). Todas falhas em assertions com28testes coletados; root não mutado. Logs `/tmp/conexozenvo-e21-ack-mutation-*.log`.
- Unit gateway1015/1015+painel292/292, typechecks finais, builds ambos, lint/fronteiras e guardas patches/dist/deps/Prisma verdes. Guardadeps valida216JS/33pacotes, DI Nest único/ULIDCommonJS. Comando `guardas-build.sh runtime` inexistente retornouusage2; a verificação runtime real fica em `guardas-build.sh deps apps/gateway/dist`, já aprovada. Coverage global aprovado:102 arquivos/1576 testes em306,05s; statements74,57%, branches66,91%, functions72,72%, lines76,37%. Painel292/292. Log `/tmp/conexozenvo-e21-ack-coverage.log`.

## Encerramento / resultado para a próxima conversa

P-078 corrigida em código: recibo anterior à mensagem fica durável no PostgreSQL e é
aplicado/consumido no commit do INSERT ou backfill. Não depende de cache local; duas
instâncias compartilham o lock por sessão/key. Mantidos rank/error, inbound/latest timestamp,
contrato n8n, G4/G5 D-047 e QR D-048. Migration aditiva; rollback N-1 mantém schema mas
perde correção; primeira publicação stop-first. EventBus segue assíncrono: durabilidade
começa no commit, sem outbox/replay sintético. Histórico é atômico por chunk50, retry dedup.

- **Commits/PR/CI:** branch `feature/onda21-ack-duravel` da base `899e86d`; implementação `4d5b332`, [PR #29](https://github.com/diogocs32/whatsapp-gateway/pull/29). CI/merge finais são conferidos no PR canônico; docs de encerramento em commit próprio. Nenhuma publicação ou prova produtiva.
- **Reprodução/validação:** RED comprovou `null` em vez de `read`; GREEN28/28 efeitos reais de banco/MessagePersister/HTTP/Inbox/G4 com transporte falso. Quatro mutações recusadas e revisão independente final aprovada. Gateway1576/1576 com coverage, painel292/292; typechecks, builds, lint, format/mapa/fronteiras e guardas patches/dist/deps/Prisma.
- **Reconciliação R3:** schema/tabela → ARQUITETURA + migration/mapa; mudança de persistência/semântica → INTEGRACAO/how-to/D-049/CHANGELOG; recorte/limites → PENDENCIAS/triagem/roteiro/SESSOES/DONE; ESTADO reconciliado após abertura do PR #29. Nenhuma env, dependência, regra de BASE, projeção CLAUDE ou payload novo; sem gatilho para alteração de contracts/env.example/README/BASE. Sem Docs-n/a.
- **Pendências:** P-078 entrega código; publicação manual já coberta B-004/B-005/B-007 e checklist D-049. P-100/P-101/P-102 abertas; P-099 sem drenar. Próximo recorte P-013 em nova branch/PR após merge, mensagem no roteiro. Nenhuma sessão alheia/engine/arquivo local preexistente alterada.
- **Arquivamento R9:** ATIVA→DONE; linha movida ao histórico; duas linhas mais antigas movidas integralmente ao SESSOES_ARQUIVO para manter15. Aviso D-049 preservado para outras conversas/publicação ainda não absorvida.

## ✅ CHECKPOINT — E21 continuação · sessão 2026-09-30-1327-e21-ack-duravel

- **O QUE FOI FEITO:** ACK pending-only durável e reconciliação serializada/transacional, histórico/retention; 28 testes de efeito, quatro mutações, revisão e gates locais completos.
- **ARQUIVOS CRIADOS/ALTERADOS:** schema e migration `20260930163000_pending_message_acks`; repositório messaging/domain; RetentionService; `test/ack-persistence.e2e-spec.ts`; docs abaixo.
- **PACOTES ADICIONADOS:** nenhum.
- **DECISÕES REGISTRADAS:** D-049.
- **EFEITO DE DEPLOY:** nenhum nesta sessão. Para publicar: migration aditiva pelo migrate deploy e primeira troca stop-first; sem nova env/rota/payload/engine.
- **AÇÕES OPERACIONAIS PARA O USUÁRIO:** seguir [política e publicação manual](../how-to/ack-persistencia-e21.md) após C/D/E/F/B-004/B-005/B-007; snapshots7d recalculados ou expiração24h antes enforce/canário E21.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** perda/regressão de ACK, corrida entre réplicas/INSERT, consumo antes de rollback ou purge → testes de efeito Postgres/HTTP/Inbox/G4, barreiras pg_locks, rollback/histórico/retention e quatro mutações recusadas; schema/boot → migration e imagens/smokes do CI.
- **BLOQUEADO EM VOCÊ:** nenhum para código/PR/merge; publicação/canários e B-004/B-005/B-007 seguem manuais.
- **DOCS TOCADAS PELO DIFF:** CHANGELOG, ARQUITETURA, DECISOES, INTEGRACAO, MAPA-CODIGO e mapas gerados, MAPA, PENDENCIAS, ROTEIRO-ONDAS-2026-09, SESSOES/SESSOES_ARQUIVO, ESTADO (após PR), triagem E21, how-to ACK e este DONE.
- **COMANDOS PARA VALIDAR:** npm ci --strict-allow-scripts · npm run test:cov -w apps/gateway · npm run test -w apps/dashboard · typechecks dos três pacotes · npm run lint · npm run format:check · npm run depcruise · npm run gateway:build · npm run dashboard:build · guardas-build.sh patches/dist/deps/prisma · node scripts/mapa-codigo.mjs --check. Lint/format locais excluem somente seeds preexistentes não versionados.
- **SESSÃO ATUALIZADA:** sim; ESTADO reconciliado após PR #29.
- **PARA CONTINUAR EM NOVA CONVERSA:** “Continuação P-013 pronta no roteiro (E21: tipos aditivos já aceitos pela API); leia ESTADO/SESSOES e execute o recorte em nova feature da origin/main.”
