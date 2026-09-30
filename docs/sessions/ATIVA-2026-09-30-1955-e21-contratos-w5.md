# Sessão: E21 continuação — contratos W5 (P-013)

- **Status:** 🟢 em andamento.
- **Início:** 30/09/2026 19:55 BRT.
- **Branch/base:** `feature/onda21-contratos-w5`, `origin/main=86f9041`.
- **Objetivo:** formalizar `mentions?: string[]` em `SendTextRequest` e `SendReactionRequest { emoji: string }`; um PR, revisão independente, CI verde e merge ao fim.
- **Escopo:** `packages/contracts` (ponto global), testes de compatibilidade de tipos/schemas/fixtures no gateway; consumidor do painel somente se necessário para usar os tipos sem mudança de runtime; documentação e mapa.
- **Fora do escopo:** novas rotas, restrições ou comportamento de envio; demais campos/tipos/backlog; repo publicado do node n8n (leitura apenas); engines e ATIVA lid-envio-wwebjs; contas/QR/check/envios reais, produção/Dokploy/deploy/canário, limpeza de filas.

## ECO DE LEITURA

- **ESTADO/SESSOES:** lidos na ordem R9; SESSOES completo, avisos e cinco últimas sessões. Sessão ativa alheia lid-envio-wwebjs e seus arquivos preservados. Produção último SHA documentado768fb26, sem conferência ao vivo; D-027 publicação manual.
- **Base/PR:** git fetch origin e gh pr view29 confirmam MERGED em86f9041c41b193a3c94610f0c068149801fb5eb6; ci/imagens SUCCESS no run36749216448. Branch nova dessa base.
- **PENDENCIAS:** assume somente P-013. P-100/P-101/P-102 abertas; P-099 sem drenar. B-004/B-005/B-007 e deploys C/D/E/F/canários manuais.
- **Leituras:** BASE v4.3/R0–R21 e Regras de toda etapa; DONE-2026-09-30-1327-e21-ack-duravel; D-039–D-049; triagem E21; MAPA-CODIGO messaging/contracts e inventário contracts.
- **Invariantes absorvidas:** D-049 pending-only/ranking/latest/inbound/locks/consumo/histórico/retenção; primeira publicação migration aditiva e stop-first. D-047 identidade segura/ambiguousMature/reliable e snapshots7d recalculados ou expiração24h antes enforce/canário. D-048 QR inicial exato/STOPPED/auth intacta. Métrica30d/cota observe0; epochs/lease/CAS/8s; TS5.9.3/CLI11, Vitest5/.mts/SWC/e2e serial, node20/node16 CommonJS/buildinfo em dist e gates E16–E21.
- **Locais preexistentes:** .codex/, AGENTS.md, seed-mock.js, apps/gateway/prisma/seed-mock.ts identificados pelo git status e preservados fora do diff.

## Recorte registrado antes da implementação

O diff de produto se limita aos dois tipos solicitados. SendTextSchema já aceita mentions opcional (array de strings, até50 itens); reactionSchema exige string, permite vazio e limita20 caracteres. Não exportar/refatorar schemas nem adicionar validação runtime. cold/idempotencyKey/deduped/envelope e demais contratos são divergências fora deste recorte; documentar o limite no mapa sem ampliar P-013.

Prova: compilar fixtures tipadas com TS5.9.3, exercitar rotas reais com AppModule/banco sintético e SessionManager falso (sem conta/socket real). Sessão fixture criada por SQL/Prisma em STOPPED/autostart=false, nunca POST/sessions. Fixtures antigas/painel/n8n0.4.1 devem conservar payload/status; mentions omitido/vazio/limites e reação normal/vazia/limites conferidos contra borda existente. Instalação estrita com Node26.10/npm11.19, patches, typechecks, testes adequados, builds, guardas/mapa e revisão independente antes do commit.

## Checkpoints

- Abertura: PR29/base confirmados; auditoria de schemas/consumidores delegada em somente leitura.

- Fontes conferidas: TS5.9.3 via Context7 `/microsoft/typescript/v5.9.3` (fixtures satisfies),
  [semântica oficial](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html);
  Zod3.25.76 do gateway (raiz4 transitiva não usada pela rota),
  [fonte v3](https://github.com/colinhacks/zod/blob/v3.25.76/packages/zod/src/v3/types.ts);
  [Vitest5.0.2/tipos](https://github.com/vitest-dev/vitest/blob/v5.0.2/docs/guide/testing-types.md);
  [Prisma7/CRUD](https://www.prisma.io/docs/orm/v7/prisma-client/queries/crud).
- Consumidores: painel api.ts318–334 e tarball npm0.4.1 em
  /tmp/conexozenvo-e18-n8n/package (package.json/dist WhatsappGateway.node.js) conferidos
  em somente leitura; usam HTTP to/text/cold/idempotencyKey, sem mentions/reaction.
  n8n-workflow é peer; nenhum contracts dependency. Não há motivo para editar consumidores.
- RED tsc: TS2305 SendReactionRequest inexistente e TS2353 mentions ausente; GREEN após6linhas
  aditivas em contracts. Logs /tmp/conexozenvo-e21-contracts-types-{red,green}.log.
- Instalação: Node26.10.0/npm11.19.1, npm ci --strict-allow-scripts/PUPPETEER_SKIP_DOWNLOAD=true,
  postinstall e patches verdes; manifests/lock intactos. Prisma generate aprovado.
- HTTP inicial20/20 em3,24s, AppModule/schemas/guards/DB reais, manager falso e fixture SQL
  STOPPED/autostart=false; nenhuma engine iniciada. Revisão apontou cleanup bloqueado por
  assertion no afterAll; corrigido por finally com close garantido.

- Validação completa: unit1017/1017 +painel292/292; cobertura gateway1598/1598 em104arquivos,
  310,14s (statements74,69%, branches67,02%, functions72,78%, lines76,49%). Inclui gates
  E16–E21 e ACK D-049; log /tmp/conexozenvo-e21-contracts-coverage.log.
- Typechecks gateway/dashboard/contracts e adicional da fixture HTTP aprovados. Builds ambos,
  patches/dist/deps/prisma aprovados (216JS/33pacotes, DI Nest único e128ULIDs CommonJS).
  Lint sem erros/fronteiras292módulos aprovados; exclusivamente arquivos locais preexistentes
  excluídos do lint/formato. CLI11/TS5.9.3/Vitest5.0.2 e Zod3.25.76 confirmados por npm ls.
- Mutação de tipos em cópias temporárias: controle exit0; remover mentions, torná-lo obrigatório,
  itens number[] e emoji opcional retornam exit2 em assertions/fixtures. Nenhuma mutação no root.
  O harness inicial precisou typeRoots e rootDir explícitos para a cópia externa; só depois do
  controle positivo os resultados de mutação foram aceitos. Logs /tmp/conexozenvo-e21-contracts-mutation-*.log.
- Revisão técnica independente APROVADA, sem bloqueadores. Divergências documentais de mentions,
  guarda de tipos e consumo externo foram corrigidas no MAPA-CODIGO; demais contratos seguem P-040.
