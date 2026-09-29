# 🧭 MAPA — ConexoZenvo

> Guia de navegação das referências (R3/R8). Toda sigla usada no projeto tem
> entrada aqui. Referência sem entrada no MAPA = referência inválida — criou um
> tipo novo de referência, registre aqui na hora.

- E18/P-062 parte 3: [deploy F e rollback Nest](how-to/deploy-f-nest12.md),
  [D-044](DECISOES.md#d-044--2026-09-29--nest-12-no-runtime-com-toolchain-11-e-contrato-preservado-p-062-parte-3e18) e
  [DONE E18](sessions/DONE-2026-09-29-1501-e18-nest12.md).

- E17/P-062 parte 2: [deploy E e rollback BullMQ](how-to/deploy-e-bullmq6.md),
  [D-043](DECISOES.md#d-043--2026-09-29--bullmq-6-no-redis-com-ioredis-5-e-ulid-3-p-062-parte-2e17) e
  [DONE E17](sessions/DONE-2026-09-29-1424-e17-bullmq6.md).

## Legenda de siglas

| Sigla               | O que é                                                                                           | Onde encontrar                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M0–M6               | Ondas de melhoria (roadmap)                                                                       | `BASE_CONEXOZENVO.md` § R2 · status em `ESTADO.md`                                         |
| A1–A11              | Ondas de adoção da base (A1–A7 = v3.2 · A8–A11 = v4.3)                                            | `ADOCAO.md` (plano) · status em `ESTADO.md`                                                |
| R0–R21              | Regras de execução                                                                                | `BASE_CONEXOZENVO.md` § REGRAS (R0 é específica do projeto)                                |
| vX.Y (base)         | Versão da base universal aplicada                                                                 | topo do `BASE_CONEXOZENVO.md` · genérica em `docs/DOCUMENTO_UNIVERSAL.md`                  |
| D-xxx               | Decisão registrada                                                                                | `DECISOES.md` (append-only, buscar pelo código)                                            |
| P-xxx               | Pendência técnica registrada                                                                      | `PENDENCIAS.md` (quadro central — R9)                                                      |
| B-xxx               | Bloqueio em ação do dono/terceiro                                                                 | `PENDENCIAS.md` § topo (R9/v3.8)                                                           |
| BRIEFING-<assunto>  | Proposta que cruza fronteira (muda a base/outro repo)                                             | `docs/briefings/` (R20 — nasce sob demanda)                                                |
| V0–V9               | Fases da varredura de código                                                                      | `BASE_CONEXOZENVO.md` § R21 · detalhe no `DOCUMENTO_UNIVERSAL.md` Parte 7                  |
| 📢                  | Aviso entre sessões (leitura obrigatória na abertura)                                             | `SESSOES.md` § Avisos (R9)                                                                 |
| Docs-n/a            | Trailer de commit: gatilho de doc dispensado com motivo                                           | `BASE_CONEXOZENVO.md` § R3 (fidedignidade)                                                 |
| O1–O4               | Itens operacionais da auditoria 07/2026 (concluídos)                                              | `auditoria-2026-07.md`                                                                     |
| Itens 1–26          | Achados da auditoria de código 07/2026                                                            | `auditoria-2026-07.md`                                                                     |
| CON / WA / ABE / UP | Achados de contato, engines, backend e atualizações da auditoria 09/2026; IDs locais ao relatório | [auditoria-melhorias-2026-09.md](auditoria-melhorias-2026-09.md); execução em P-027..P-040 |
| G1–G8               | Regras do guard-rail anti-ban (quarentena, 423, reply-rate)                                       | módulo `guardrail` · `how-to/observacao-guardrail-m2.md`                                   |
| N1–N8               | Tratamentos no node n8n (repo separado, publicado no npm)                                         | repo `n8n-nodes-conexozenvo-gateway` · dependência em `DECISOES.md`                        |
| CP-xxx              | Checkpoints numerados de sessões antigas (legado)                                                 | arquivos em `sessions/`                                                                    |
| ATIVA-/DONE-[id]    | Sessão de trabalho (R9)                                                                           | `sessions/` · painel em `SESSOES.md` · antigas em `SESSOES_ARQUIVO.md` (quando existir)    |
| LID / PN            | Identificadores WhatsApp (id anônimo Meta / phone number)                                         | glossário em `ARQUITETURA.md`                                                              |
| 423                 | HTTP `SESSION_QUARANTINED` (hard-gate do guard-rail)                                              | `INTEGRACAO.md` · `BASE_CONEXOZENVO.md` § R5/G-refs                                        |
| META_CLOUD          | Futura engine da API oficial da Meta                                                              | `DOCUMENTO_CONEXOZENVO_NESTJS.md` § FEATURE DIRECIONADA                                    |
| E1–E21              | Etapas do roteiro de ondas de 09/2026 (1 etapa = 1 chat)                                          | [ROTEIRO-ONDAS-2026-09.md](ROTEIRO-ONDAS-2026-09.md)                                       |

## Quero... → abro...

| Preciso de                                                                                | Arquivo                                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O que fazer agora / onde parei                                                            | `ESTADO.md`                                                                                                                                                       |
| Quem está mexendo em quê agora                                                            | `SESSOES.md` (ativas + 📢 Avisos)                                                                                                                                 |
| O que ficou pendente / o que depende de MIM                                               | `PENDENCIAS.md` (P-xxx e B-xxx)                                                                                                                                   |
| Base aplicada, regras, stack e ondas                                                      | `BASE_CONEXOZENVO.md` (raiz)                                                                                                                                      |
| Por que algo foi decidido                                                                 | `DECISOES.md`                                                                                                                                                     |
| Proposta de mudança na base universal                                                     | `docs/briefings/` (R20)                                                                                                                                           |
| O que aprendemos de um incidente                                                          | `docs/postmortems/` (R15 — nasce sob demanda)                                                                                                                     |
| Diagnóstico e plano de adoção (v3.2+v4.3)                                                 | `ADOCAO.md` (temporário — R18)                                                                                                                                    |
| Fronteiras de módulos e glossário                                                         | `ARQUITETURA.md`                                                                                                                                                  |
| Regras de negócio / visão                                                                 | `PROJETO.md`                                                                                                                                                      |
| Contrato para integradores (API)                                                          | `INTEGRACAO.md`                                                                                                                                                   |
| Armadilhas de operação (WSL, LID, memória)                                                | `agent-whatzapp_api.md` §6/§6B                                                                                                                                    |
| Deploy no Dokploy                                                                         | `deploy-dokploy.md`                                                                                                                                               |
| Deploy C manual da Onda 3: lease, campanhas, proxy e backlog P-099                        | [how-to/deploy-c-onda3.md](how-to/deploy-c-onda3.md)                                                                                                              |
| Deploy D manual: imagens, instalação e manutenção do painel                               | [how-to/deploy-d-manutencao.md](how-to/deploy-d-manutencao.md)                                                                                                    |
| Comparativo de engines WhatsApp                                                           | `motores-whatsapp.md`                                                                                                                                             |
| Análise do motor wwebjs (matriz + plano 100%)                                             | `analise-wwebjs-2026-08.md`                                                                                                                                       |
| Backlog/auditoria 07/2026                                                                 | `auditoria-2026-07.md`                                                                                                                                            |
| Melhorias, atualizações e redução de risco WhatsApp (09/2026)                             | [Auditoria detalhada](auditoria-melhorias-2026-09.md) e [snapshot npm](reference/auditoria-npm-2026-09.json)                                                      |
| Análise de atualizações/versões e estabilidade das contas (23/09/2026)                    | [analise-atualizacoes-2026-09.md](analise-atualizacoes-2026-09.md) · [evidência](reference/analise-atualizacoes-2026-09.json)                                     |
| wwebjs: memória/CPU e se o projeto precisa dele (23/09/2026)                              | [analise-wwebjs-memoria-2026-09.md](analise-wwebjs-memoria-2026-09.md) · [evidência](reference/analise-wwebjs-memoria-2026-09.json)                               |
| Conversas fiéis ao WhatsApp Web: emoji "…", mídia no painel, encaminhar (25/09/2026)      | [analise-conversas-whatsapp-web-2026-09.md](analise-conversas-whatsapp-web-2026-09.md) · Onda 8 do roteiro · P-066..P-069                                         |
| **Onde está cada função e como o código se relaciona** (fluxos, onde mexer por pendência) | [MAPA-CODIGO.md](MAPA-CODIGO.md) · inventário gerado por função/linha: [reference/mapa-codigo/](reference/mapa-codigo/README.md) (`node scripts/mapa-codigo.mjs`) |
| **Qual é a próxima etapa (1 etapa = 1 chat) e o que colar no próximo chat**               | [ROTEIRO-ONDAS-2026-09.md](ROTEIRO-ONDAS-2026-09.md)                                                                                                              |
| Agenda de auditorias recorrentes                                                          | `AUDITORIAS.md`                                                                                                                                                   |
| Tarefas sem pressão (como fazer X)                                                        | `how-to/`                                                                                                                                                         |
| Operar sob pressão (deploy, rollback, restore, chaves)                                    | `runbooks/` (R3 — nasce sob demanda; hoje em `how-to/` e `deploy-dokploy.md`)                                                                                     |
| Histórico de versões                                                                      | `../CHANGELOG.md`                                                                                                                                                 |
| Instruções do Claude Code                                                                 | `../CLAUDE.md`                                                                                                                                                    |

## Convenção de citação

Sigla resolve? Use a sigla. Não resolve? Cite completo: "arquivo § seção"
(ex.: "ver `BASE_CONEXOZENVO.md` § R15").

- E19/P-062 parte 4: [Vitest 5 e preparação TS](sessions/DONE-2026-09-29-1908-e19-vitest5.md), decisão [D-045](DECISOES.md#d-045--2026-09-29--vitest-5-e-preparação-ts-6-mantendo-ts-593cli-11-p-062-parte-4e19).

- E20/P-064 parte código + P-061: [Métricas/cota/inventário](how-to/metricas-produto-e20.md), decisão D-046 e mensagem E21 no [roteiro](ROTEIRO-ONDAS-2026-09.md).

- P-103: [Reprodução SQL somente leitura de colisão de reação no G4](reference/e20-reply-rate-key-collision.sql); triagem na E21.
