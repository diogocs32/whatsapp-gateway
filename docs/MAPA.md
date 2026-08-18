# 🧭 MAPA — ConexoZenvo

> Guia de navegação das referências (R3/R8). Toda sigla usada no projeto tem
> entrada aqui. Referência sem entrada no MAPA = referência inválida — criou um
> tipo novo de referência, registre aqui na hora.

## Legenda de siglas

| Sigla              | O que é                                                     | Onde encontrar                                                                          |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| M0–M6              | Ondas de melhoria (roadmap)                                 | `BASE_CONEXOZENVO.md` § R2 · status em `ESTADO.md`                                      |
| A1–A11             | Ondas de adoção da base (A1–A7 = v3.2 · A8–A11 = v4.3)      | `ADOCAO.md` (plano) · status em `ESTADO.md`                                             |
| R0–R21             | Regras de execução                                          | `BASE_CONEXOZENVO.md` § REGRAS (R0 é específica do projeto)                             |
| vX.Y (base)        | Versão da base universal aplicada                           | topo do `BASE_CONEXOZENVO.md` · genérica em `docs/DOCUMENTO_UNIVERSAL.md`               |
| D-xxx              | Decisão registrada                                          | `DECISOES.md` (append-only, buscar pelo código)                                         |
| P-xxx              | Pendência técnica registrada                                | `PENDENCIAS.md` (quadro central — R9)                                                   |
| B-xxx              | Bloqueio em ação do dono/terceiro                           | `PENDENCIAS.md` § topo (R9/v3.8)                                                        |
| BRIEFING-<assunto> | Proposta que cruza fronteira (muda a base/outro repo)       | `docs/briefings/` (R20 — nasce sob demanda)                                             |
| V0–V9              | Fases da varredura de código                                | `BASE_CONEXOZENVO.md` § R21 · detalhe no `DOCUMENTO_UNIVERSAL.md` Parte 7               |
| 📢                 | Aviso entre sessões (leitura obrigatória na abertura)       | `SESSOES.md` § Avisos (R9)                                                              |
| Docs-n/a           | Trailer de commit: gatilho de doc dispensado com motivo     | `BASE_CONEXOZENVO.md` § R3 (fidedignidade)                                              |
| O1–O4              | Itens operacionais da auditoria 07/2026 (concluídos)        | `auditoria-2026-07.md`                                                                  |
| Itens 1–26         | Achados da auditoria de código 07/2026                      | `auditoria-2026-07.md`                                                                  |
| G1–G8              | Regras do guard-rail anti-ban (quarentena, 423, reply-rate) | módulo `guardrail` · `how-to/observacao-guardrail-m2.md`                                |
| N1–N8              | Tratamentos no node n8n (repo separado, publicado no npm)   | repo `n8n-nodes-conexozenvo-gateway` · dependência em `DECISOES.md`                     |
| CP-xxx             | Checkpoints numerados de sessões antigas (legado)           | arquivos em `sessions/`                                                                 |
| ATIVA-/DONE-[id]   | Sessão de trabalho (R9)                                     | `sessions/` · painel em `SESSOES.md` · antigas em `SESSOES_ARQUIVO.md` (quando existir) |
| LID / PN           | Identificadores WhatsApp (id anônimo Meta / phone number)   | glossário em `ARQUITETURA.md`                                                           |
| 423                | HTTP `SESSION_QUARANTINED` (hard-gate do guard-rail)        | `INTEGRACAO.md` · `BASE_CONEXOZENVO.md` § R5/G-refs                                     |
| META_CLOUD         | Futura engine da API oficial da Meta                        | `DOCUMENTO_CONEXOZENVO_NESTJS.md` § FEATURE DIRECIONADA                                 |

## Quero... → abro...

| Preciso de                                             | Arquivo                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| O que fazer agora / onde parei                         | `ESTADO.md`                                                                   |
| Quem está mexendo em quê agora                         | `SESSOES.md` (ativas + 📢 Avisos)                                             |
| O que ficou pendente / o que depende de MIM            | `PENDENCIAS.md` (P-xxx e B-xxx)                                               |
| Base aplicada, regras, stack e ondas                   | `BASE_CONEXOZENVO.md` (raiz)                                                  |
| Por que algo foi decidido                              | `DECISOES.md`                                                                 |
| Proposta de mudança na base universal                  | `docs/briefings/` (R20)                                                       |
| O que aprendemos de um incidente                       | `docs/postmortems/` (R15 — nasce sob demanda)                                 |
| Diagnóstico e plano de adoção (v3.2+v4.3)              | `ADOCAO.md` (temporário — R18)                                                |
| Fronteiras de módulos e glossário                      | `ARQUITETURA.md`                                                              |
| Regras de negócio / visão                              | `PROJETO.md`                                                                  |
| Contrato para integradores (API)                       | `INTEGRACAO.md`                                                               |
| Armadilhas de operação (WSL, LID, memória)             | `agent-whatzapp_api.md` §6/§6B                                                |
| Deploy no Dokploy                                      | `deploy-dokploy.md`                                                           |
| Comparativo de engines WhatsApp                        | `motores-whatsapp.md`                                                         |
| Análise do motor wwebjs (matriz + plano 100%)          | `analise-wwebjs-2026-08.md`                                                   |
| Backlog/auditoria 07/2026                              | `auditoria-2026-07.md`                                                        |
| Agenda de auditorias recorrentes                       | `AUDITORIAS.md`                                                               |
| Tarefas sem pressão (como fazer X)                     | `how-to/`                                                                     |
| Operar sob pressão (deploy, rollback, restore, chaves) | `runbooks/` (R3 — nasce sob demanda; hoje em `how-to/` e `deploy-dokploy.md`) |
| Histórico de versões                                   | `../CHANGELOG.md`                                                             |
| Instruções do Claude Code                              | `../CLAUDE.md`                                                                |

## Convenção de citação

Sigla resolve? Use a sigla. Não resolve? Cite completo: "arquivo § seção"
(ex.: "ver `BASE_CONEXOZENVO.md` § R15").
