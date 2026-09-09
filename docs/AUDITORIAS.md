# 🔎 AUDITORIAS — ConexoZenvo

> Agenda viva (R17). Auditoria sem agenda = auditoria morta — a auditoria
> 07/2026 foi excelente e única; esta tabela impede que ela vire foto velha.
> Cada linha: dono, última execução, próxima. Atualizar AO EXECUTAR.

| Auditoria                                                                | Cadência                                | Dono                 | Última                                                                           | Próxima                                        |
| ------------------------------------------------------------------------ | --------------------------------------- | -------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| npm audit (gate CI ainda a instalar)                                     | todo CI; consulta manual até instalação | CI/Diogo             | 09/09/2026 manual: 17 pacotes / 14 GHSAs (§7.5)                                  | próxima onda de segurança / P-038              |
| Secret scanning gitleaks (gate CI + pre-commit)                          | todo CI                                 | CI                   | — (instalar: ADOCAO)                                                             | ao instalar                                    |
| Integridade da doc viva (links + MAPA)                                   | todo CI                                 | CI                   | — (instalar: A2/A9)                                                              | ao instalar                                    |
| docs-drift + correspondência estrutural + BASE↔CLAUDE.md (R6 v4.3)       | todo CI                                 | CI                   | — (instalar: A9)                                                                 | ao instalar                                    |
| Catracas da varredura: knip · jscpd · complexidade · cobertura (R21)     | todo CI                                 | CI                   | — (instalar: A10)                                                                | ao instalar                                    |
| Dependências: triagem de versões e compatibilidade                       | mensal                                  | Diogo                | 09/09/2026: 69 pacotes via metadados npm                                         | 2026-10                                        |
| Fila de FRESCOR de docs (`revisado_em` vencido — R3 v4.2)                | mensal                                  | Diogo                | — (frontmatter entra na A11)                                                     | após A11                                       |
| Auto memory do agente (verdade = docs/ — R19)                            | mensal                                  | Diogo                | —                                                                                | 2026-09                                        |
| Índices e queries lentas (Postgres prod)                                 | trimestral                              | Diogo                | parcial na auditoria 07/2026                                                     | 2026-10                                        |
| Teste de RESTORE do backup                                               | trimestral                              | Diogo                | NUNCA (backup nasce na M4/A1)                                                    | A1 + 1 dia                                     |
| Ensaio de rollback de deploy (R15)                                       | trimestral                              | Diogo                | NUNCA                                                                            | após A5                                        |
| Redução da baseline de análise estática                                  | trimestral                              | CI/Diogo             | —                                                                                | após M3                                        |
| **VARREDURA completa V0–V9 (R21)**                                       | trimestral                              | sessão R9 dedicada   | NUNCA                                                                            | 2026-10 (após A10)                             |
| Execução REAL de 1 runbook sorteado (R3/R17)                             | trimestral                              | Diogo                | NUNCA (runbooks nascem na A11)                                                   | após A11                                       |
| Matriz regra × gate (automação sem gate — R6/v3.7)                       | trimestral                              | sessão R9            | —                                                                                | 2026-10                                        |
| Compliance de versão (upgrade major/rc: NestJS, Prisma, Baileys, wwebjs) | a cada upgrade                          | sessão R9 do upgrade | 09/09/2026: lock Baileys rc14 e wwebjs SHA1780711+patch; produção não revalidada | próximo upgrade / P-040                        |
| Revisão ampla de código, melhorias e atualizações                        | semestral                               | sessão R9 dedicada   | 09/09/2026: análise estática + pesquisa; sem ensaio de produção                  | 2027-03; críticos antes, conforme P-027..P-040 |
| Inventário de dados e proteção de segredos/conteúdo                      | semestral e por mudança de finalidade   | Diogo                | 09/09/2026 parcial: não presumir ausência de dados sensíveis                     | P-035/P-036                                    |

## Regras

- Executou → atualiza "Última" e "Próxima" na MESMA sessão (R9).
- Achado de auditoria vira relatório ligado ao quadro central `PENDENCIAS.md` (P-xxx/B-xxx);
  [revisão de 09/09/2026](auditoria-melhorias-2026-09.md): P-027..P-040. Não confundir análise estática com execução completa da V0–V9.
- Linha nova entra quando um gate novo nasce (ex.: smoke do artefato — R15).
