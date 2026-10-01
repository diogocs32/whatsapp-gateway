# Sessão: E21/P-022 — C10 GuardrailService.getState/apply

- **Status:** ✅ encerrada em código; CI/merge finais no PR canônico da branch.
- **Início:** 01/10/2026 02:13 BRT.
- **Branch/base:** `feature/onda21-guardrail-c10-tests`, `origin/main=b842d4b`.
- **Objetivo:** determinar a origem do default eventTs no Prisma instalado e provar ordenação/CAS pelo serviço real; um PR, revisão independente, CI verde e merge ao fim.
- **Escopo:** testes de efeito locais de guardrail, documentação e mapa gerado. Eventual ajuste de runtime somente após reprodução e delimitação documentadas.
- **Fora do escopo:** outras lacunas P-022, deps/API/env/migration por hipótese, engines/ATIVA WWEBJS/n8n, produção/Dokploy/deploy/canário/conta/QR/check/envio real.

## ECO DE LEITURA

- ESTADO, SESSOES completo/ativas/avisos/cinco últimas, PENDENCIAS B-xxx/P-022, BASE v4.3/R0/R3/R6/R9, roteiro C10, DONE agendamento, triagem E21 e MAPA-CODIGO guardrail/P-022 lidos.
- Fetch confirma PR35 MERGED `b842d4b08d89aca1259d16b07f72a0bc6df46508`; CI main SUCCESS run36815124389. Nova feature criada da origin/main atualizada.
- ATIVA lid-envio-wwebjs e `.codex/`, `AGENTS.md`, `seed-mock.js`, `apps/gateway/prisma/seed-mock.ts` preexistentes ficam preservados fora do diff.
- C10 atual: getState omite eventTs no create; schema @default(now()), migration DEFAULT CURRENT_TIMESTAMP TIMESTAMP(3). apply ignora eventTs antigo/igual e faz CAS pelo eventTs lido, com retry limitado. A origem efetiva do default ainda precisa de SQL/default/valor persistido; fakes não a decidem.
- Preservar licença/cgroup/health/agendamento, D-050 purge/família/reuso/locks/recheck READ COMMITTED/timers, ACK D-049, G4/G5 D-047, QR D-048, W5/E20, TS5.9.3/CLI11/Vitest5/SWC/CJS/buildinfo e epochs/lease/CAS/8s.
- P-100/P-101/P-102 abertas/P-099 sem drenar. Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais; D-050 primeira troca/rollback stop-first, D-049 migration/stop-first e snapshots7d E21 recalculados ou24h antes enforce/canário. Produção último SHA documentado768fb26; nenhuma consulta/operação.

## Recorte antes da implementação

Prisma/adapter pg instalados e PostgreSQL local isolado, com relógio Node controlado e TimeZone explicitamente fixada na conexão/transação. Capturar consulta/params do create/upsert, default do catálogo e eventTs persistido; comparar com relógio SQL da transação, sem sleep arbitrário. Serviço e consumidores reais devem provar getState idempotente, eventos antigo/igual/novo, primeira transição após bootstrap e corrida CAS/create com barreiras determinísticas. EventBus real ou porta observável com término explícito do efeito. Mutações com controles positivos; nenhuma correção de política/default ou migration antes de evidência.

## Checkpoints

- Abertura: root coordena evidência/default, fontes, gates e docs; implementação/matriz/revisão independentes delegadas após mapear o serviço.
- Versões: Node26.10.0 canônico em /tmp/conexozenvo-e16; Prisma Client/adapter7.10.0, pg8.23.0, Vitest5.0.2, TS5.9.3. PostgreSQL LOCAL18.4; nenhum watcher deste gateway encontrado. PR35 merge/CI main reconfirmados na abertura.
- Fixture exclusiva por schema c10_uuid, host local validado e conexão pg com campos explícitos (query params da URL não sobrepõem host/opções). Todas as migrations versionadas são aplicadas somente no schema novo, inclusive enums/FKs/defaults; dados reais não são copiados. TimeZone e search_path fixos por conexão, set_config local nas transações e assertions do fuso/schema efetivo. Cleanup disconnects/schema/pool, inclusive falhas iniciais, com release protegido por finally.
- Tentativa inicial de LIKE public INCLUDING ALL não servia: adapter qualifica enum pelo schema próprio (42704 c10.Engine inexistente). Substituída pelas migrations reais na fixture, sem alterar nenhuma migration/aplicação/DB real.
- Probe decisivo: Node2001-02-03T04:05:06.007Z vs transaction_timestampSQL2026-10-01T05:19:39.455Z/UTC; INSERT session_guardrail inclui colunas eventTs/updatedAt e parâmetros2001, ambos persistidos2001. DEFAULT CURRENT_TIMESTAMP continua no catálogo TIMESTAMP(3), mas o ORM não o utiliza neste caminho. Hipótese de defaultDB/fuso causando bootstrap getState rejeitada.
- Fontes oficiais consultadas: Context7 /prisma/web (doc v7 now/default/updatedAt, índice sem tag minor), [schema v7 now](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference#now), [PG18 funções de tempo](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT) e [tipos de tempo](https://www.postgresql.org/docs/18/datatype-datetime.html). Doc de default descreve DDL; fonte tag/hash abaixo explica materialização no write observado.
- Client gerado internal/class.ts:20-21 confirma7.10.0/engine0edf323efd1d98336f3f0a68684b56f689b900d3. [NowGenerator7.10](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/interpreter/generators.ts#L47-L55) usa new Date/ISO/snapshot; [evaluateArg](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/interpreter/render-query.ts#L44-L68) resolve generator; [DefaultKind do engine instalado](https://github.com/prisma/prisma-engines/blob/0edf323efd1d98336f3f0a68684b56f689b900d3/query-compiler/query-structure/src/default_value.rs#L72-L81) transforma now em GeneratorCall, ao contrário de dbgenerated/autoincrement. Fonte primária e SQL se reforçam.
- Versão final:30focused em dois specs (20ordenação/efeitos,10default). Seis caminhos ORM autocommit/transação×UTC/SãoPaulo/Tokyo conferem SQL/params/eventTs persistido Node; três INSERTs SQL positivos omitindo eventTs usam relógio da mesma transação, com deslocamento da coluna sem fuso lido pelo adapter. Catálogo prova default/tipo. Serviço/ReplyRate/EventBus reais cobrem getState/health/gate/manual/evaluate/hardSignal, eventos antigo/igual/novo, mesma state/recuperação/pausa, CAS com vencedor novo/velho/igual, P2002 concorrente real e limite4writes.
- Relógio simulado controla somente Date; IO/timers/microtasks reais. Barreira de Promise ordena escritores; sentinela após lookup de emit e flush aguardam o efeito, sem sleep arbitrário. Revisão independente repetiu30/30 e aprovou código/fixture/fontes sem bloqueantes.
- P-104 registrada: empate do bootstrap conserva ativa inclusive override manual; evaluate marca applied=true sem persistir/emitir. Caracterização explícita do runtime existente, sem chamá-la garantia desejada. Correção/política de empate é próximo recorte; antigos/iguais explícitos não devem perder dedup. Sem evidência de ocorrência em produção.
- Mutações finais somente scratch:18candidatos,17recusados por assertions e um retryP2002→throw com2erros semânticos inesperados contado separadamente. Controles30/30 antes/depois; todas as rodadas executaram30, sem timeout/import/unhandled. Assertions: igualdade4/guarda antiga7/predicadoCAS4/retorno stale4/current2/P2002returnwinner2/limiteCAS2ou4=1cada/emissão duplicada1/suprimida12/início quarentena reset1/cooldown unidade2/recuperação início1/cooldown1/bootstrap epoch0,+1,fixo=6cada. Nenhum mínimo artificial de assertions por mutante; uma assertion efetiva com controle válido basta.
- Harness `/tmp/e21-guardrail-c10-mutation-harness.py`; resumo/auditoria/logs em `/tmp/conexozenvo-e21-guardrail-c10-mutations/mutation-logs/{summary,assertion-audit}.json`. Source original/scratch restaurado/repo SHA256 iguais `75f7513c42a93891b3601c0aecb63392b824ec589e26a44bc64d7024445f7045`; hashes dos specs/fixture e rodada final no summary. Zero alteração de runtime no repo.
- Suíte completa local Node26.10.0:1890gateway/118arquivos com coverage verde (statements75.66%,branches68.25%,funções73.43%,linhas77.35%; sem piso novo D-018), mais292painel/14arquivos. Log `/tmp/conexozenvo-e21-c10-coverage.log`. Script test:unit também verde:1259gateway+292painel (`/tmp/conexozenvo-e21-c10-unit.log`). ESLint exclui somente os dois seeds preexistentes; Prettier de todos os arquivos versionados e novos, três typechecks, fronteiras304módulos/1143dependências, guardas patches/dist e builds gateway/dashboard verdes. Mapa gerado:21arquivos/372fontes/1844símbolos/129rotas.

## Encerramento / resultado

C10 está coberta no recorte de testes, sem alterar runtime/política/API/env/deps/schema.
Prisma/adapter7.10.0 com query compiler instalado materializa now do cliente no
INSERT getState; DDL/default SQL sozinho não determinava a origem usada. Testes
confrontam SQL/params/default/valores persistidos com relógios separados e TimeZone
explícita em três fusos, transações e autocommit. O controle SQL omitindo eventTs
prova CURRENT_TIMESTAMP real do banco; sua coluna TIMESTAMP sem fuso é interpretada
como UTC pelo adapter. Esse deslocamento do controle não é causa do caminho ORM.

Ordenação antigo/igual/novo, getState idempotente, consumidores reais e primeira
transição com timestamp estritamente novo têm efeito SQL/gate/eventos. Barreiras
provam CAS/P2002 reais com vencedor mais novo/velho/igual e limite4writes, sem
sleep arbitrário; flush aguarda publicação pelo EventBus real. Não há prova de
entrega webhook/Redis/WhatsApp nova, nem cobertura de toda máquina de estados;
terminal create/P2002 repetido e erros não-P2002 permanecem fora desta matriz.

P-104 registra comportamento reproduzido, não garantia desejada: empate após
bootstrap bloqueia a transição implícita/manual, mantendo ativa/gate aberto;
evaluate reporta applied=true apesar de não gravar/emitir. A hipótese defaultDB foi
descartada antes de qualquer correção. Próximo recorte trata bootstrap e resultado
efetivo sem abrir eventos explícitos antigos/iguais ou inventar migration/fuso.

- **Base/remoto:** PR35 MERGEDb842d4b, CI mainSUCCESS36815124389 reconfirmados01/10. Commits/CI/merge desta feature ficam no PR canônico; merge não comprova publicação.
- **R3:** diff só testes/fixture/inventários/docs. Mapa/pendência/triagem/roteiro removem origem default não verificada e registram P-104. Nenhum gatilho novo de rota/payload/schema/env/provider/decisão cara/build/deps; contracts/INTEGRACAO/ARQUITETURA/DECISOES não exigem alteração. Sem mudança de instrução BASE/CLAUDE.
- **P-022 parcial:** C10/default/ordenação coberta; P-104/demais lacunas abertas. P-100/P-101/P-102 abertas/P-099 sem drenar; ATIVA WWEBJS/locais preexistentes preservados.
- **Operação:** nenhuma consulta/operação produtiva/TimeZone produtiva, conta/QR/check/envio real, Dokploy/deploy/canário. Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais; D-050 primeira troca/rollback stop-first, D-049 migration/stop-first e snapshots7d E21 recalculados ou24h antes enforce/canário mantidos. Sem nova ação operacional por este diff de testes.

## CHECKPOINT R9

- **O QUE FOI FEITO:**30testes C10 SQL/default/ordenação/consumidores/CAS/P2002,17mutações por assertions com controles, revisão independente e gates locais.
- **ARQUIVOS:** dois specs+fixture locais; mapa gerado e documentação de estado/pendências/triagem/roteiro/sessão/changelog.
- **PACOTES/DECISÕES/EFEITO DE DEPLOY:** nenhum pacote/decisão cara/runtime/migration/env/API nova; efeito de deploy nenhum.
- **CLASSE DE ERRO E GATE:** origem default inferida pelo DDL, replay antigo/igual, CAS stale e evento incoerente capturados por SQL/params/valor persistido/gate/EventBus + mutações e suíte de efeito no CI. P-104 está caracterizada para correção futura, não resolvida.
- **BLOQUEADO EM VOCÊ:** nada para fechar este recorte de testes; B-001/B-003/B-004/B-005/B-006/B-007 e canários/publicação seguem seus gates manuais anteriores.
- **DOCS TOCADAS:** ESTADO, SESSOES/SESSOES_ARQUIVO, PENDENCIAS, MAPA-CODIGO/inventários, triagem E21, ROTEIRO, CHANGELOG e este DONE; R3 reconciliado.
- **VALIDAR:** `npm run test:e2e -w apps/gateway -- test/guardrail-c10.e2e-spec.ts test/guardrail-default.e2e-spec.ts`; lint/formato versionados, depcruise, três typechecks, `npm run test:cov -w apps/gateway`, painel, builds e guardas; CI obrigatório antes do merge.
- **CONTINUAR:** mensagem completa E21/P-104 no roteiro; partir da origin/main depois do merge deste PR.
