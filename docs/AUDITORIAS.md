# 🔎 AUDITORIAS — ConexoZenvo

> Agenda viva (R17). Auditoria sem agenda = auditoria morta — a auditoria
> 07/2026 foi excelente e única; esta tabela impede que ela vire foto velha.
> Cada linha: dono, última execução, próxima. Atualizar AO EXECUTAR.

| Auditoria                                         | Cadência       | Dono   | Última      | Próxima      |
| ------------------------------------------------- | -------------- | ------ | ----------- | ------------ |
| npm audit (gate CI)                               | todo CI        | CI     | — (instalar: ADOCAO) | ao instalar |
| Secret scanning gitleaks (gate CI + pre-commit)   | todo CI        | CI     | — (instalar: ADOCAO) | ao instalar |
| Integridade da doc viva (links)                   | todo CI        | CI     | — (instalar: ADOCAO) | ao instalar |
| Dependências desatualizadas (`npm outdated`)      | mensal         | Diogo  | —           | 2026-08      |
| Índices e queries lentas (Postgres prod)          | trimestral     | Diogo  | parcial na auditoria 07/2026 | 2026-10 |
| Teste de RESTORE do backup                        | trimestral     | Diogo  | NUNCA (backup nasce na M4) | M4 + 1 dia |
| Ensaio de rollback de deploy (R15)                | trimestral     | Diogo  | NUNCA       | após ADOCAO do R15 |
| Redução da baseline de análise estática           | trimestral     | CI/Diogo | —         | após M3      |
| Compliance de versão (upgrade major/rc: NestJS, Prisma, **Baileys**, wwebjs) | a cada upgrade | sessão R9 do upgrade | Baileys 7.0.0-rc13 em uso | no próximo bump |
| Auditoria completa de código (estilo 07/2026)     | semestral      | sessão R9 dedicada | 2026-07-10 (100% ✅) | 2027-01 |
| Campos sensíveis × criptografia                   | ➖ (Dados sensíveis: não) | —  | —   | se virar "sim" |

## Regras

- Executou → atualiza "Última" e "Próxima" na MESMA sessão (R9).
- Achado de auditoria vira item em `auditoria-*.md` novo ou entrada no
  backlog do `ESTADO.md` — nunca fica só na cabeça.
- Linha nova entra quando um gate novo nasce (ex.: smoke do artefato — R15).
