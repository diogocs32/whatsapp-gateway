# Sessão: E21/P-104 — bootstrap C10 e retorno efetivo de evaluate

- **Status:** ✅ encerrada em código; CI/merge finais no PR canônico.
- **Início:** 01/10/2026 07:36 BRT.
- **Branch/base:** `feature/onda21-guardrail-bootstrap`, `origin/main=57267e7`.
- **Objetivo:** corrigir o empate bootstrap/primeira transição e informar aplicação efetiva em evaluate; um PR, revisão independente, CI verde e merge ao fim.
- **Escopo:** GuardrailService, regressões SQL/consumidores/concorrência locais, docs e mapa gerado; contracts/INTEGRACAO apenas se gatilho de contrato exigir.
- **Fora do escopo:** demais lacunas P-022, deps/env/migration/fuso por hipótese, engines/ATIVA WWEBJS/n8n, produção/Dokploy/deploy/canário/conta/QR/check/envio real.

## ECO DE LEITURA

- ESTADO, SESSOES completo/ativas/avisos/cinco últimas, PENDENCIAS B-xxx/P-022/P-104, BASE v4.3/R0/R3/R6/R8/R9, roteiro P-104 e DONE C10 lidos.
- Fetch confirma PR36 MERGED57267e7 e CI mainSUCCESS36821736740. Advisories main36849896688 failure em investigação separada, sem ampliar dependências/aceites.
- ATIVA lid-envio-wwebjs e `.codex/`, `AGENTS.md`, `seed-mock.js`, `apps/gateway/prisma/seed-mock.ts` preexistentes preservados fora do diff; código disjunto.
- P-104 reproduzida na etapa anterior: Prisma7.10 now do cliente no bootstrap; empate mantém ativa/gate aberto e evaluate.applied=true sem efeito. DefaultSQL/fuso descartados; repetir30testes antes de runtime.
- Preservar eventos explícitos antigos/iguais, CAS/quatro tentativas/P2002/G6, G4/G5 D-047, QR D-048, ACK D-049, IAM D-050, specs licença/cgroup/health/agendamento, W5/E20, TS5.9.3/CLI11/Vitest5/SWC/CJS e epochs/lease/8s.
- P-100/P-101/P-102 abertas/P-099 sem drenar; P-022 parcial. Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais, primeira troca/rollback D-050 stop-first, D-049 migration/stop-first e snapshots7d E21 recalculados ou24h antes enforce/canário. Produção último SHA documentado768fb26, sem consulta.

## Recorte antes da implementação

Recorte escolhido após mapear dois escritores: getState e recordHardSignal/observe criam eventTs=epoch explícito (bootstrap sem evento; updatedAt continua atual). getState preserva releituras; bootstrap não zera/reclassifica eventTs existente; schema/default permanecem iguais. Controle ORM omitindo eventTs conserva prova nowNode7.10. apply público mantém Promise<Row>/parâmetros; helper privado devolve linha e autoria da transição (false se replay/CAS perdida/escrita no mesmo estado, true apenas write ganho com mudança de estado). evaluate preserva currentState inicial/target calculado e todos os campos, corrigindo apenas applied. manter C10 estrito para eventos explícitos. Retorno evaluate deve refletir vitória/escrita/transição desta chamada, inclusive CAS perdida ou vencedor do mesmo estado. Regressões red/green SQL/gate/EventBus reais e barreiras determinísticas, sem sleeps; fontes instaladas/oficiais, mutações com controles positivos e revisão independente antes dos gates finais.

## Checkpoints

- Abertura: root coordena recorte, execuçãoSQL, docs e gates; policy_review analisa invariantes/consumidores, sources_ci valida fontes/versões/advisory.

- BaselineSQL30/30 verde antes de qualquer runtime (Node26.0.0); execuções finais usarão Node26.10.0/npm11.19.1 canônicos. PostgreSQL da fixture local; sem watcher gateway.

- GREEN:53/53 em C10/default/G5/G6/G7; revisão independente repetiu41/41 (C10/default) e aprovou sem bloqueantes. Dois casos do bug convertidos em efeitos desejados com relógio2040; original Date nunca é substituída pela sentinela no cenário de empate.
- RED canônico:19falhas/12pass em C10 e6falhas/4pass no default; falhas são assertions esperadas. Baseline anterior30/30 pass antes de runtime. Logs /tmp/conexozenvo-e21-p104-{baseline,c10-red,default-red,green,review}.log.
- Mutações scratch:14/14 recusadas por assertions, controles41/41 antes/depois, todas41executadas/zero timeout/infra/semantic/unhandled. Bootstrap getState17/hardSignal2, igualdade5/antigo11, evaluate true6/recusa true4/mesmo-state write true1/terminalCAS true1, CASpredicado9/count0win9, G6off18/duplicado2, retry2/4duas cada. Summary/audit em /tmp/conexozenvo-e21-p104-mutations/mutation-logs/{summary,assertion-audit}.json; harness /tmp/e21-p104-mutation-harness.py. Repo/scratch restaurado sourceSHA2566a1f21c566597e9321a806d27ee3ece1df9c6f34da1695660ec9c9e2865e9f16; specs/fixture hashes registrados idênticos.
- Gates locais Node26.10.0/npm11.19.1:1901gateway/118arquivos com coverage (statements75.65%,branches68.24%,functions73.45%,lines77.36%; sem piso novo D-018),292painel/14arquivos; lint (somente dois seeds preexistentes excluídos), três typechecks, depcruise304módulos/1143dependências, Prisma generate7.10.0, ambos builds e guardas patches/dist verdes. Coverage log /tmp/conexozenvo-e21-p104-coverage.log; demais logs /tmp/conexozenvo-e21-p104-*.log.
- Mapa gerado21arquivos/372fontes/1845símbolos/129rotas. P-105 registrada separadamente: Advisories main36849896688 detectou sharp0.35.4/GHSA-wq5f-xc86-pv6w high; nenhuma dependência/aceite foi alterada neste recorte. O advisory descreve possível RCE em Linux/glibc sob condições específicas, sem exploração/versionamento produtivo consultados.

## Fontes verificadas

Prisma/client/adapter7.10.0, pg8.23.0, Vitest5.0.2, TS5.9.3, PostgreSQL local18.4. Context7 `/prisma/web` e `/websites/postgresql_18` usados conforme skill context7-mcp, com tag/hash/fonte instalada porque o índice não oferece minor7.10 específica. Client gerado class.ts20–21 confirma engine0edf323efd1d98336f3f0a68684b56f689b900d3.

- [NowGenerator7.10](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/interpreter/generators.ts#L47-L55) e [evaluateArg7.10](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/interpreter/render-query.ts#L44-L68): now é materializado pelo cliente. Source map instalado coincide; bootstrap agora envia sentinela explícita, controles ORM/SQL permanecem separados.
- [Engine no hash instalado](https://github.com/prisma/prisma-engines/blob/0edf323efd1d98336f3f0a68684b56f689b900d3/query-compiler/query-structure/src/default_value.rs#L72-L81): now vira GeneratorCall; DDL/default sozinho não define INSERT.
- [updateMany v7](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference#updatemany), [PG18 READ COMMITTED](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED) e [P2002 v7](https://www.prisma.io/docs/orm/v7/reference/error-reference#p2002): count informa escrita, WHERE é reavaliado em corrida e unicidade precisa de retry. Client/adapter instalados confirmados; SQL real prova efeito.

## Encerramento / resultado

P-104 corrigida em código. O bootstrap não é evento aplicado: epoch explícito apenas nos dois creates sem transição permite primeira aplicação imediata sem abrir replay de eventos antigos/iguais. getState preserva releituras; registro de sinal conserva eventTs existente e continua atualizando ultimoSinal. Nenhuma reclassificação/backfill de linhas legadas, migration/default/fuso ou política geral de clock foi feita. Normalizar timestamp com max(now,existing+1) foi descartado porque promoveria chamadas/retries atrasados depois do vencedor.

apply público mantém assinatura/Promise<Row>. Helper privado informa autoria de transição por create/updateMany: true só com write ganho e previousState diferente. evaluate mantém currentState inicial, target calculado e todos os campos, corrigindo applied sem inferi-lo do state/timestamp do vencedor. Retry que grava só metadados no mesmo estado é permitido, retorna false e não duplica G6. CAS/P2002/timestamp original/quatro tentativas, cooldown/G4/G5/sticky/observe e demais consumidores preservados.

Provas locais cobrem SQL/gate/EventBus, primeira aplicação no mesmo relógio, bootstrap concorrente, replay, vencedores CAS mais novos/iguais/mais velhos, mesmo target/timestamp, mesmo target mais velho com write real [0,1], retry com transição e quatro derrotas. Eventos G6 são aguardados no harness por sentinela de conclusão do lookup; não há nova garantia de entrega webhook/outbox/Redis/WhatsApp. Erros finais de create/P2002 repetido e remoção concorrente de linha não foram ampliados neste recorte. Nenhuma ocorrência ou consulta/operação produtiva/TimeZone produtiva, conta/QR/check/envio real, Dokploy/deploy/canário.

R3: runtime interno/testes/mapa/docs. INTEGRACAO documenta semântica já prometida de applied; JSON/rotas/erro/tipos não ganharam campo nem mudaram forma, portanto contracts mantidos (não havia DTO Evaluation compartilhado; ampliar types segue P-040). Providers/consumidores/eventos/payloads/schema/env/deps/processo operacional permanecem; sem gatilho de ARQUITETURA/env/DECISOES/BASE/CLAUDE. Roteiro/PENDENCIAS/triagem/mapa removem P-104 aberta e origem now no getState atual; históricos anteriores permanecem datados.

- **Base/remoto:** PR36 MERGED57267e7, CI mainSUCCESS36821736740 conferidos na abertura. PR/CI/merge desta feature são evidência remota canônica; merge não comprova publicação.
- **Pendências:** P-022 parcial/P-100/P-101/P-102 abertas/P-099 sem drenar. P-105 sharp0.35.5 é próximo recorte separado; main Advisories permanece com pendência real sem aceite novo. ATIVA WWEBJS e locais preexistentes preservados.
- **Operação:** publicação/canários C/D/E/F/B-004/B-005/B-007 manuais; primeira troca/rollback D-050 stop-first, D-049 migration/stop-first e snapshots7d recalculados ou24h antes enforce/canário. Produção último SHA documentado768fb26, sem consulta; D-027 manual. Sem efeito operacional novo de migration/env/deps neste diff.

## CHECKPOINT R9

- **O QUE FOI FEITO:** correção bootstrap/retorno efetivo P-104;41regressões SQL/default/consumidores/concorrência, red/green,14mutações e revisão independente.
- **ARQUIVOS:** GuardrailService, dois specs, mapa/inventários e docs reconciliados.
- **PACOTES/DECISÕES/EFEITO DE DEPLOY:** nenhum pacote/decisão cara/migration/env/API nova; runtime passa a aceitar primeira transição após bootstrap e reportar applied pela transição desta chamada. Publicação manual nos gates existentes.
- **CLASSE DE ERRO E GATE:** empate bootstrap, replay antigo/igual, applied por intenção/state do concorrente ou write sem transição, CAS stale/retry/G6 incoerente; assertions SQL/gate/EventBus/retorno, mutações e suíte de efeito no CI.
- **BLOQUEADO EM VOCÊ:** nada para fechar P-104; B-001/B-003/B-004/B-005/B-006/B-007 e canários/publicação mantêm ações manuais anteriores. Atualizar sharp é recorte separado P-105.
- **DOCS TOCADAS:** ESTADO, SESSOES/SESSOES_ARQUIVO, PENDENCIAS, INTEGRACAO, MAPA-CODIGO/inventários, triagem E21, ROTEIRO, CHANGELOG e este DONE.
- **VALIDAR:** focused C10/default/G5/G6/G7; lint/format versionados, depcruise, três typechecks, gateway coverage/painel, builds/guardas/mapa; CI verde obrigatório antes do merge.
- **CONTINUAR:** mensagem E21/P-105 pronta no roteiro; partir de origin/main após merge deste PR. P-022 permanece parcial.
