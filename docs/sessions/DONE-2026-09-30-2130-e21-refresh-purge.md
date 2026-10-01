# Sessão: E21 continuação — purge de refresh tokens (P-005)

- **Status:** ✅ encerrada em código; gates remotos e merge no PR canônico.
- **Início:** 30/09/2026 21:30 BRT.
- **Branch/base:** `feature/onda21-refresh-purge`, `origin/main=bc2896d`.
- **Objetivo:** purge de expirados sem perder detecção de reuso; um PR, revisão independente, CI verde e merge ao fim conforme roteiro.
- **Escopo:** IAM (porta/repositório/agendador), testes unitários e de efeito de auth/SQL, exemplos de env e documentação/mapa.
- **Fora do escopo:** P-036/P-046, contratos/rotas/deps/migration nova, engines/ATIVA lid-envio-wwebjs, repo n8n, contas/QR/check/envios reais, produção/Dokploy/deploy/canário/filas.

## ECO DE LEITURA

- **ESTADO/SESSOES:** ordem R9 cumprida, SESSOES completo/avisos e cinco últimas entradas; sessão alheia lid-envio-wwebjs preservada. Produção no último SHA documentado768fb26, sem conferência ao vivo; D-027 publicação manual.
- **Base/PR:** git fetch origin e gh pr view30 confirmam MERGED bc2896d04f39a2aff0a65ed4a71adeb7db3ec3d8; ci/imagens SUCCESS run36790248845. Branch criada dessa base.
- **PENDENCIAS:** assume somente P-005. P-100/P-101/P-102 abertas, P-099 sem drenar; B-004/B-005/B-007/deploys C/D/E/F/canários manuais.
- **Leituras:** AGENTS, BASE v4.3/R0/R3/R6/R9, regras do roteiro e mensagem P-005, DONE P-013, D-009/D-039–D-049, triagem E21, MAPA-CODIGO iam/retention.
- **Invariantes:** revokedAt antes de expiresAt e prazo renovado na rotação; ACK D-049 pending-only/locks/consumo/retenção, G4/G5 D-047 e snapshots7d24h, QR D-048, tipos W5, métrica30d/cota observe0, epochs/lease/CAS/8s, TS5.9.3/CLI11/Vitest5/SWC/CJS/buildinfo e gates anteriores.
- **Locais preexistentes:** .codex/, AGENTS.md, seed-mock.js, apps/gateway/prisma/seed-mock.ts preservados fora do diff. Sem watch ativo; Docker local29.8.0 disponível. Node26.10.0 canônico disponível em /tmp/conexozenvo-e16.

## Recorte registrado antes da implementação

Purge dentro do IAM, em lotes pelo índice expiresAt já existente; conservar ancestral expirado de família com qualquer token não revogado ainda válido. Definir coordenação SQL com rotação/revogação antes de apagar, pois NOT EXISTS sob MVCC isolado pode perder descendente em voo. Não alterar TTL, cookies, respostas HTTP ou política de reuso. Timers test-disabled, sem overlap local e encerramento limpo. Provas reais PostgreSQL/HTTP com transporte falso: acúmulo de expirados, A→B válido/purge/reuso A revoga B, família independente, logout, dois purges e concorrência de rotação na borda temporal. Registrar fontes e evidência red/green antes do fechamento.

## Checkpoints

- Abertura: base/PR30 verificados; análise adversarial do protocolo SQL delegada em somente leitura. Nenhuma operação produtiva.

- Fontes: Context7 resolve-library-id falhou por transporte HTTP; fallback oficial conferido:
  Prisma7.10.0/runtime/client.d.ts (tagged SQL/TransactionClient) e docs v7 raw-queries/transactions;
  PostgreSQL18 explicit-locking §13.3.5 (xact/try advisory) e transaction-iso §13.2.1
  (snapshot por comando READ COMMITTED); Nest12.1.1 lifecycle-events, Node26 timers.
- Política delimitada: cutoff agora−7dias default; 0 desliga purge. Preservar família com qualquer
  token não revogado com expiresAt>=cutoff (inclui margem). Candidatos excluem família protegida
  ANTES do LIMIT, try-lock por usuário, DELETE em comando novo revalida família.
  Todas mutações usam o mesmo advisory xact userId; CAS/leitura inicial preservam raced.
  Agendador IAM segue RETENTION_SWEEP_HOURS6, primeira2min, até20lotes500, single-flight,
  shutdown await/clear timers. Sem alteração de TTL/HTTP/migration/deps.

- RED de efeito: antes de purgeExpired,6/6 testes falharam por método inexistente; HTTP/auth/SQL
  carregaram normalmente. GREEN final20/20 em5,98s, incluindo A→B/reuso após purge,
  isolamento/logouts/revokeAll, lotes/fronteira/margem, duas réplicas, stale candidate,
  rotação na expiração, ok+raced e revogação concorrente. Fixture candidate adiciona só
  userId parametrizado ANTES ORDER/LIMIT; DELETE permanece real. Clients/barreiras/pg_locks
  provam disputa, clock_timestamp decide expiração; nenhum tempo fixo decide resultado.
- Unit scheduler21/21; suíte unit completa1038gateway+292painel verdes. Typecheck gateway/
  dashboard e fixture e2e específico aprovados. Instalação estrita Node26.10.0/npm11.19.1,
  patches/Prisma generate aprovados; versions Prisma7.10.0/Nest12.1.1/TS5.9.3/Vitest5.0.2.
- Builds gateway/dashboard aprovados; guardas patches/dist/deps/prisma verdes
  (217JS/33pacotes, DI Nest único e128ULIDs CommonJS). Lint final zero avisos/fronteiras294módulos;
  formato de versionados+novos aprovado (exclui só seeds locais preexistentes).
- Revisão independente código/testes APROVADA, sem bloqueadores. Duas revisões recomendaram
  explicitar READ COMMITTED para não depender do default do banco: aplicado ao purge.
  Hook shutdown IAM aguarda sweep antes da desconexão Prisma global (Nest12 ordem reversa).
- Mutações em /tmp/conexozenvo-e21-refresh-mutations com banco local exclusivo
  e21_refresh_mutations; nenhuma edição no source root. Controle20/20 verde, método sem
  guarda familiar e DELETE sem recheck recusados; demais/cobertura aguardando conclusão.

- Validação completa:1639/1639 gateway em106arquivos com cobertura,305,62s;
  statements74,94%, branches67,34%, functions73,01%, lines76,69%.
  Painel292/292, instalação estrita/typechecks/builds/patches/lint/formato/fronteiras/guardas verdes.
- Quatro mutações recusadas com controle20/20 em cópia/banco local próprios: purge só por data,
  DELETE sem recheck familiar, rotate sem advisory lock (pg_locks count0 vs1), expiração antes
  de reuso (B permanece não revogado). Logs /tmp/conexozenvo-e21-refresh-mutation-*.log.
  Primeiro controle da cópia falhou por dependência Nest workspace faltante; só após corrigir
  resolução e obter controle positivo foram aceitos resultados. Primeiro teste de lock removido
  bloqueou DELETE e expirou transação; repetido com prova pg_locks explícita para falha determinística.
  Nenhuma mutação no checkout principal/produção. Migrations só no banco local novo de mutação.

## Encerramento / resultado

P-005 entregue no IAM. Purge em lotes preserva todos os ancestrais expirados de
famílias protegidas; após limpar, reuso de A revoga B válido via fluxo HTTP real.
NOT EXISTS de candidatos/final, lock de todos escritores e READ COMMITTED
explícito coordenam a corrida com rotação. TTL/cookies/payload intactos; sem
schema/migration/dependência nova. Env nova nos dois exemplos, margem7dias/0desliga;
primeira troca e rollback stop-first porque N-1 ignora protocolo. Até20lotes500,
2min/6h, single-flight e shutdown aguardado. Famílias ativas indefinidamente
conservam trilha longa; reset versus login fora do lock não é coberto por este recorte.

- **PR/CI/merge:** implementação057ef42; [PR #31](https://github.com/diogocs32/whatsapp-gateway/pull/31) na feature da basebc2896d; checks finais no PR canônico
  após publicar o commit e a reconciliação final. Revisão independente código/testes aprovada;
  revisão final documental APROVADA (16links/âncoras sem erro, histórico15 e sessão alheia preservados, mapa em dia). Nenhuma consulta/operação produtiva.
- **Reconciliação R3:** env nova → dois exemplos; política/rollout → how-to auth/D-050;
  scheduler/fluxo → ARQUITETURA/MAPA-CODIGO/inventários gerados; entrega/limites →
  PENDENCIAS/triagem/roteiro/SESSOES/SESSOES_ARQUIVO/MAPA/este DONE; ESTADO reconciliado após abrir PR31.
  Sem gatilho de rota/payload/schema/dependência/base ou README/CLAUDE novo.
- **Pendências:** P-005 concluída em código. P-036/P-046 fora do recorte, próximo P-022
  testes de domínio de licença no roteiro. P-100/P-101/P-102 abertas/P-099 sem drenar.
  Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais, D-049 migration/stop-first,
  snapshots7d E21 recalculados ou24h antes enforce/canário; D-050 primeiro rollout/rollback stop-first.
- **Arquivamento:** ATIVA→DONE, linha própria ao histórico, mais antiga preservada no arquivo;
  ATIVA alheio/avisos relevantes/locais preexistentes preservados.

## ✅ CHECKPOINT — E21/P-005 · sessão2026-09-30-2130-e21-refresh-purge

- **O QUE FOI FEITO:** purge IAM seguro preservando reuso, locks SQL/recheck, agendador em
  lotes e provas reais de auth/reuso/logout/revogação/isolamento/concorrência/timers.
- **ARQUIVOS CRIADOS/ALTERADOS:** porta/repositório refresh, IamModule, purge service/spec,
  test/refresh-token-purge.e2e-spec.ts, envs e documentação/inventários abaixo.
- **PACOTES ADICIONADOS:** nenhum; manifests/lock/TS5.9.3/CLI11/Vitest5 intactos.
- **DECISÕES REGISTRADAS:** D-050; D-009/D-039–D-049 preservadas.
- **EFEITO DE DEPLOY:** nenhum nesta sessão. Primeiro rollout/rollback stop-first;
  quando publicado, começa purge2min depois, margem7dias e até10mil linhas por sweep6h.
- **AÇÕES OPERACIONAIS PARA O USUÁRIO:** publicar/canários em janela manual; primeiro
  rollout/rollback D-050 stop-first, junto aos gates/migrations anteriores. Env nova opcional
  default7/0desliga; nenhuma nova migration P-005. Não foi feito deploy/canário.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** ancestral excluído ou candidato stale →20e2e
  SQL/HTTP/clientes/barreiras/pg_locks e quatro mutações; timer/overlap/shutdown/retry →21unit;
  lost-revocation/raced → concorrência real com efeito no descendente.
- **BLOQUEADO EM VOCÊ:** nenhum para código/PR/merge; publicação/canários/B-004/B-005/B-007
  e gates operacionais anteriores continuam manuais.
- **DOCS TOCADAS:** CHANGELOG, ARQUITETURA, DECISOES, how-to/auth-sessao-refresh-rotation,
  MAPA-CODIGO e mapas gerados, MAPA, PENDENCIAS, triagem E21, ROTEIRO, SESSOES/ARQUIVO,
  ESTADO e este DONE. Exemplos env atualizados; sem n/a omitido.
- **COMANDOS PARA VALIDAR:** npm ci --strict-allow-scripts/PUPPETEER_SKIP_DOWNLOAD=true;
  prisma generate; tsc gateway/dashboard/fixturee2e; npm run test:unit;
  npm run test:cov -w apps/gateway; builds gateway/dashboard; lint/formato/fronteiras;
  guardas-build.sh patches/dist/deps apps/gateway/dist/prisma; mapa-codigo.mjs --check.
  Lint/formato excluem exclusivamente seeds locais preexistentes fora do diff.
- **SESSÃO ATUALIZADA:** sim; estado final remoto no PR canônico, ESTADO após criação.
- **PARA CONTINUAR EM NOVA CONVERSA:** “Continue E21/P-022 pelo recorte de testes do domínio
  de licença no roteiro, em nova feature da origin/main após merge da P-005.”
