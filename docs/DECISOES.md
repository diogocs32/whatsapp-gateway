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
