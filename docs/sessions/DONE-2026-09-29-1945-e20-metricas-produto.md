# Sessão: E20 — métricas e regras de produto

- **Status:** ✅ CONCLUÍDA EM CÓDIGO
- **Início:** 29/09/2026 19:45 BRT
- **Objetivo:** P-064 parte código e P-061 por fixtures; um PR, revisão, CI verde e merge ao fim.
- **Branch/base:** `feature/onda7-metricas-produto`, `origin/main=5ffa267` (E19/PR #25 mergeado, ci/imagens/advisories verdes confirmados por `gh pr view 25`).
- **Escopo:** observability (métrica 30 dias), contacts (cota observável/compatível), sessions fora de `infrastructure/wwebjs/` (inventário com fonte comprovada), groups (A/B fixtures), testes e documentação. Contatos globais: `packages/contracts`, config/env.example, eventualmente schema aditivo; declarar antes de mudar.
- **Fora do escopo:** sessão `lid-envio-wwebjs` e seu ATIVA; majors/patches/contrato de envio, canal oficial, add/createGroup, backfill/chatModify, P-100 runtime, drenar filas, Dokploy/deploy/canário, conta/QR/check/envio reais.

## ECO DE LEITURA

- **ESTADO:** E13–E19 em código, produção no último SHA documentado `768fb26`, sem conferência ao vivo. Auto Deploy consta desligado (D-027); merge não é deploy. Reconciliar PR #25/`5ffa267` ao fechamento.
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (pasta da engine WWEBJS preservada). Absorvidos avisos E19: Vitest/coverage5.0.2, .mts/SWC/decorators/e2e serial, TS5.9.3/CLI11, node20/node16 CommonJS e buildinfo em dist; E18/Nest12/Fastify5.12.5/DI; E17/BullMQ6+ioredis5/ULID3; E13–E15/lease/CAS/épocas/8s/proxy. Últimas cinco sessões E19–E15 lidas.
- **PENDENCIAS:** assume P-064 parte código + P-061 A/B informativo com fixtures. P-100 aberta, sem force-close/retries reduzidos; P-099 sem drenar. B-004/B-005/B-007 e deploys C/D/E/F/canários manuais continuam.
- **Roteiro/base:** E20/mensagem linha371, Regras de toda etapa, BASE v4.3/R0/R3/R6/R9/R10/R11 e D-039–D-045. D-021 conserva ambas engines e Chromium. n8n0.4.1 exige defaults compatíveis, sem restrição/status novo sem decisão explícita.

## Plano e evidência

- Três agentes em escopos disjuntos: métrica, cota, inventário/A-B; revisão independente ao fim.
- Métrica proposta: primeiro outbound observado nos últimos30d sem inbound/reação posterior, destino individual, cobertura limitada ao histórico retido. Definição opcional perguntada ao dono; não entra no guardrail/envio.
- Cota: política sem quebra de default; pergunta opcional sobre observar/opt-in e status. Implementação de bloqueio depende da escolha, observação pode avançar.
- Inventário: verificar semântica oficial de platform antes de inferir pessoal/Business; UNKNOWN quando evidência insuficiente, sem consulta ao WhatsApp.
- Fontes, comandos e resultados serão acrescentados nos checkpoints.

## Implementação, fontes e revisão

- Novas rotas autenticadas/DTOs: métrica first-observed-outbound30d/retained-history,
  cota observe default0 e inventário pessoal/Business/UNKNOWN; definição canônica no how-to E20.
- Baileys dedup por dígitos dentro do lote preserva ordem/máscara/duplicados/canônico; full batch P-102.
- Fontes oficiais rc14/helper/platform pair-success/protobuf/USync, WWEBJS ClientInfo/isBusiness,
  Redis EVAL/INCRBY/PEXPIRE, Prisma7.10/Postgres18 e Context7. Registry latest rc14/1.34.7;
  versões instaladas TS5.9.3/CLI11.0.24/Vitest5.0.2/BullMQ6.3.10/ioredis5.11.1 preservadas.
- Revisões independentes cruzadas: quota, inventário/A-B, SQL métrica e dedup Baileys aprovados.
  Corrigidos alvo LID ambíguo por keyId não UNIQUE e colisão da rota estática com nome de sessão;
  regressões efetivas adicionadas. Repro SELECT-only pós-fix não marca dois destinatários.
- P-103: mesmo padrão permanece no G4 legado, reprodução VALUES/SELECT em reference;
  responded2 para uma reação em dois cenários. Sem ocorrência produtiva verificada, G4/G5 intactos.

## Validação final local

- Instalação limpa Node26.10.0/npm11.19.1 `npm ci --strict-allow-scripts`, postinstall e patches verdes.
- `npm run test:unit`: 996 gateway +292 painel. Coverage final gateway:1482/1482,99 arquivos;
  73.82% statements,65.63% branches,71.8% functions,75.67% lines. Painel292/292,14 arquivos.
- Três typechecks, lint/formato dos arquivos versionados +novos da etapa (seeds/untracked alheios
  preservados), depcruise/mapa e guardas/builds dos dois apps aprovados.
- Dois Dockerfiles finais passaram; runtime final Node26.10.0, auth/API-key401/login201/10falhas→429,
  painelSPA/assets/cache/gzip/404, SQL Prisma e novas rotas exercitados em imagem/banco descartáveis.
- **Desvio do harness:** primeiro smoke tentou criar fixture por POST /sessions com autostart=false,
  mas a rota chama start incondicionalmente. Foi acionada engine sem conta no ambiente descartável;
  container encerrado e fixture removida. Não houve pareamento, conta/número real, contact-check ou
  envio; geração de QR nessa tentativa não foi verificada. Corrigido harness para INSERT SQL
  STOPPED/autostart=false e somente GETs. Smoke final passou sem iniciar engine; shutdown143/semOOM
  com Redis saudável é prova ociosa, não resolve P-100. Containers/tmpfs removidos, infra dev preservada.
- Uma execução global durante correções misturou transforms anteriores com os novos testes;
  não foi aceita como gate. Coverage final em processo novo sobre diff congelado passou integralmente.
- Artefatos locais: `/private/tmp/conexozenvo-e20/`; comandos canônicos CI/scripts preservados.

## Encerramento/checkpoint R9/R3

- **RESULTADO:** E20/P-064 parte código +P-061 fixtures concluída; revisão/local aprovadas.
  PR/CI/merge são gates remotos finais, rastreados no PR; produção não foi operada/verificada.
- **ARQUIVOS:** observability/contacts/sessions (fora WWEBJS), tests, contracts, config/envs,
  docs/how-to/reference/mapa/D-046/INTEGRACAO/ARQUITETURA/PENDENCIAS/roteiro e docs de estado/sessão.
- **PACOTES ADICIONADOS:** nenhum; sem migration, lock/pins/deps alterados.
- **EFEITO DE DEPLOY:** novas leituras/observações; default cota0 preserva comportamento.
  Publicação depende de deploy manual após pré-requisitos das ondas anteriores.
- **CLASSES/GATES:** resposta atribuída ao destino errado→fixtures colisão/LID/keyId;
  sombra de rota por nome→HTTP real regressão; quota compartilhada/TTL/Redis fora→dois apps/EVAL;
  credenciais/inferência falsa→projeção segura/UNKNOWN/fixtures; envio contaminado→quota não chamada;
  API/build/toolchain→gates E16–E19 e smoke final. Harness futuro usa fixture SQL sem POST /sessions.
- **BLOQUEADO EM VOCÊ:** nada para código/PR/merge autorizado; B-004/B-005/B-007 e
  deploys C/D/E/F/canários/aceites reais continuam manuais.
- **PENDÊNCIAS:** P-064 políticas/canal oficial/piloto, P-061 grupo real, P-101 cobertura inventário,
  P-102 full batch, P-103 G4 legado; P-100 aberta sem force-close/retries reduzidos e P-099 sem drenar.
- **DOCS TOCADAS PELO DIFF:** INTEGRACAO/contracts (rotas/DTOs), config/env.examples (envs),
  ARQUITETURA/SESSOES (fluxos/rotas), D-046/CHANGELOG (decisão/resultado), how-to/reference/MAPA/
  MAPA-CODIGO/inventário gerado, PENDENCIAS/roteiro (limites/E21), ESTADO/SESSOES/arquivo/esta sessão.
- **Docs-n/a:** sem tabela/migration/provider exportado/evento/script novo; BASE/CLAUDE/deployrunbooks
  anteriores não se tornam falsos. Base v4.3 e limites manuais preservados. How-to E20 descreve publicação.
- **Retomada:** E21 pela mensagem no roteiro após merge E20; primeiro triagem com P-103,
  preservando D-039–D-046, contratos, métricas/cota observada e fronteiras operacionais.

## PR e gates remotos

- Código/docs `91b1cef`, base `5ffa267`, [PR #26](https://github.com/diogocs32/whatsapp-gateway/pull/26).
- ESTADO reconciliado após abertura do PR; head final exige ci/imagens/advisories verdes.
  Merge ao fim autorizado; estado/SHA de integração e checks finais no PR canônico.
- P-100 aberta, P-099 sem drenar, produção/deploys/canários manuais preservados.
