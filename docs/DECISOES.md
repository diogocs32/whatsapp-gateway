# 📜 DECISÕES — ConexoZenvo

> Log **append-only** (R3): data, decisão, motivo, alternativas consideradas.
> Nunca apagar — decisão revertida ganha entrada NOVA apontando para a antiga.
> Decisões históricas (pré-M0) estão em [agent-whatzapp_api.md §7](agent-whatzapp_api.md) e na [auditoria-2026-07.md](auditoria-2026-07.md) — não duplicadas aqui.

---

## D-001 — 2026-07-10 — Adotar processo de ondas M0–M6 com doc viva

- **Decisão:** o projeto passa a operar pelo `DOCUMENTO_CONEXOZENVO_NESTJS.md` (raiz): ondas M0–M6, regras R0–R10, sessões paralelas com branch própria e checkpoint por onda.
- **Motivo:** produto vivo em produção com contrato de API público (node n8n no npm) — precisa de processo que proteja produção (R0) e de memória externa consistente entre conversas (R3/R9).
- **Alternativas:** seguir ad-hoc por memória do Claude (rejeitado: já causou retrabalho e estado divergente entre conversas).

## D-002 — 2026-07-10 — Tabelas donas validadas contra o schema.prisma (divergências do esboço)

- **Decisão:** o mapa de donos por tabela em [ARQUITETURA.md](ARQUITETURA.md) segue o CÓDIGO real (quem escreve), não o esboço do documento mestre. Divergências encontradas na validação da M0:
  1. `wa_session_events` — dono real é **observability** (`session-event.logger.ts` cria; `retention.service.ts` purga). O esboço atribuía a sessions.
  2. `session_metrics` — dono real é **observability** (`reply-rate.service.ts` faz o upsert dos snapshots G4); o guardrail apenas LÊ para o veredito. O esboço atribuía a guardrail.
  3. `wa_contacts` — quem escreve é `infra/directory/contact-directory.service.ts` (upsert); o módulo contacts só lê/expõe. Exceção consciente à regra "infra não conhece negócio" — herdada do blueprint F5; revisitar quando o módulo contacts for tocado.
  4. Não existem tabelas `groups_*` nem `leads` — extração de leads opera sobre dados das engines e do diretório de contatos, sem persistência própria.
- **Motivo:** fronteira documentada errada é pior que fronteira ausente; o enforcement da M3 (dependency-cruiser) precisa partir do mapa VERDADEIRO.
- **Alternativas:** mover a escrita para os módulos "ideais" já na M0 (rejeitado: M0 é onda de documentação — refactor sem teste unitário de domínio, que só chega na M3, viola R0).

## D-003 — 2026-07-10 — Módulo `channels` ≠ abstração de engine; engines vivem em `sessions/infrastructure/`

- **Decisão:** registrar que o módulo `channels` expõe **Canais/newsletter do WhatsApp** (REST `sessions/:id/channels`, beta). A abstração de engine (interface IEngine, `EngineFactory`, `baileys/`, `wwebjs/`) vive em `modules/sessions/infrastructure/`. O documento mestre descrevia `channels` como "casa da engine" — está corrigido na ARQUITETURA.md.
- **Impacto futuro (M6):** a engine META_CLOUD nasce em `modules/sessions/infrastructure/meta-cloud/` atrás da MESMA IEngine (ou, se a sessão R9 da M6 decidir extrair a camada de engines para módulo próprio, isso será uma decisão nova aqui).
- **Motivo:** implementar a M6 no lugar errado quebraria a fronteira R10 logo na feature mais estratégica.

## D-004 — 2026-07-10 — Docs existentes permanecem como fonte, linkados (não duplicados)

- **Decisão:** [INTEGRACAO.md](INTEGRACAO.md) (contrato da API), [auditoria-2026-07.md](auditoria-2026-07.md) (backlog/histórico), [deploy-dokploy.md](deploy-dokploy.md) (deploy), [agent-whatzapp_api.md](agent-whatzapp_api.md) (gargalos/operação) e [motores-whatsapp.md](motores-whatsapp.md) (comparativo de engines) permanecem como estão; os arquivos novos da M0 os REFERENCIAM.
- **Motivo:** duplicação = duas fontes que divergem; a auditoria já provou ser um bom documento de acompanhamento.
- **Alternativas:** consolidar tudo em ARQUITETURA/PROJETO (rejeitado: perderia histórico e quebraria links externos já usados).

## D-005 — 2026-07-10 — Janela de observação do guard-rail antes de ligar o enforce (M2)

- **Decisão:** observar o guard-rail por **≥ 7 dias** (coleta 1×/dia via `scripts/guardrail-observe.mjs`,
  acumulando `targetState` vs estado real por sessão em `docs/observacao/guardrail-m2.jsonl`) e SÓ
  ligar `GUARDRAIL_ENFORCE=true` quando os 5 critérios de aceite do
  [how-to/observacao-guardrail-m2.md](how-to/observacao-guardrail-m2.md) forem cumpridos — incluindo
  o teste prévio do HTTP 423 nos fluxos n8n via override manual (que bloqueia mesmo em observação).
- **Motivo:** o hard-gate 423 afeta consumidores externos (contrato público, R0); 7 dias cobrem 2+
  ciclos de maturação do reply-rate (cold-sends só contam no denominador após 72h — C2) e a janela
  operacional de 7d do G4. Falso-positivo de quarentena bloquearia envio legítimo de cliente.
- **Alternativas:** ligar direto (rejeitado: sem evidência de que os limiares não geram falso-positivo
  com a frota real); observação sem prazo (rejeitado: vira nunca — critérios objetivos + data).

## D-006 — 2026-07-10 — Dependência do node n8n (N1–N8) para o enforce do guard-rail

- **Decisão:** registrar que o community node `n8n-nodes-conexozenvo-gateway` (repo separado,
  publicado no npm — v0.2.0 introduziu N1–N8, atual 0.4.1) é o principal consumidor do contrato do
  guard-rail: HTTP **423** com payload `{ code: "SESSION_QUARANTINED", state, message }` (N7
  ramifica e re-enfileira o lead). Qualquer mudança nesse shape é BREAKING (R0) e exige plano de
  versão. Integradores em HTTP puro ou node < 0.2.0 precisam tratar 423 antes do enforce.
- **Motivo:** M2 liga o comportamento que esse contrato promete; a dependência cruza repositórios e
  precisa estar visível para quem mexer no guard-rail ou no node.
- **Alternativas:** — (registro de dependência, exigido pela definição da onda M2).

## D-007 — 2026-07-10 — Booleans de env com parser explícito (fim da pegadinha do coerce.boolean)

- **Decisão:** `DB_SSL`, `GUARDRAIL_ENFORCE` e `S3_FORCE_PATH_STYLE` deixam de usar
  `z.coerce.boolean()` e passam a usar o helper `envBool` (`config.ts`): `true/1/yes/on` liga ·
  `false/0/no/off` desliga · ausente/vazio = default · **valor não reconhecido derruba o boot**
  citando a variável (fail-fast). Regressão travada por `test/config.e2e-spec.ts` (5 testes).
- **Motivo (EP+DO):** no zod 3 (`zod@^3.23.8`), `z.coerce.boolean()` faz `Boolean(input)` —
  QUALQUER string não-vazia vira `true`, inclusive `"false"` e `"0"` (doc oficial:
  https://zod.dev/?id=coercion-for-primitives). Descoberto na M2 ao documentar o
  `env.production.example`: escrever `GUARDRAIL_ENFORCE=false` no Dokploy LIGARIA o enforce, e o
  rollback "=false" não funcionaria; o exemplo antigo `DB_SSL=false` era a mesma armadilha; e era
  impossível desligar `S3_FORCE_PATH_STYLE` por env (AWS S3 inviável).
- **Alternativas:** documentar a pegadinha sem mudar código (rejeitado: rollback contra-intuitivo
  em incidente é risco real); aceitar qualquer valor desconhecido como false (rejeitado: erro de
  digitação silencioso em produção é pior que boot falhando com mensagem clara).

## D-008 — 2026-07-11 — Escolha de proxy livre na criação de sessão (SEM migration)

- **Decisão:** a criação de sessão ganha `proxyId` OPCIONAL (aditivo — R0/R4) e o endpoint
  `GET /api/proxies/available` lista os proxies LIVRES (enabled, não-DEAD e que não são o
  `currentProxyId` de nenhuma sessão existente). Com `proxyId`, a sessão nasce com atribuição
  `SINGLE`/`STICKY` — reusando `session_proxy_assignments`, **sem migration**. Fronteira R10
  preservada: `ProxyService` (exportado pelo ProxiesModule) faz a validação/atribuição; o create
  de sessions valida ANTES de criar e desfaz a sessão se a atribuição falhar (corrida de dois
  creates pelo mesmo proxy → 400, sem sessão órfã nem proxy duplicado).
- **Limitações conscientes:** (1) exclusividade vale para o fluxo SINGLE — RANGE/GLOBAL_ROUND_ROBIN
  podem usar qualquer proxy em runtime; (2) a checagem de "livre" é em nível de aplicação (sem
  constraint no banco — `currentProxyId` único quebraria os modos de pool); (3) assignments órfãos
  (a tabela não tem FK p/ wa_sessions) NÃO seguram proxy — `usedProxyIds()` cruza com sessões vivas.
- **Dependência node n8n** (repo separado): a operação de criar sessão do
  `n8n-nodes-conexozenvo-gateway` pode ganhar o parâmetro opcional `proxyId` + um picker de
  `/proxies/available` (aditivo; publicar versão minor). Registrado como backlog do node.
- **Alternativas:** atribuição automática de proxy livre (1ª versão do pedido — o usuário refinou
  para ESCOLHA explícita em 10/07); modo novo `AUTO_EXCLUSIVE` no enum (rejeitado: migration +
  complexidade sem necessidade — SINGLE já expressa o resultado).
