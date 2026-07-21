# Sessão: adocao-base-v32

- **Status:** 🟢 ATIVA
- **Início:** 21/07 16:30 UTC
- **Objetivo:** Upgrade da base de processo (R18 modo UPGRADE): traduzir o
  DOCUMENTO_UNIVERSAL v3.2 para a stack real → BASE_CONEXOZENVO.md canônico na
  raiz + MAPA.md + AUDITORIAS.md + ADOCAO.md (diagnóstico R1–R18 com evidências
  e plano de ondas) + ponteiros (CLAUDE.md, banner no doc antigo, D-009)
- **Escopo (pode tocar):** BASE_CONEXOZENVO.md (raiz, novo) ·
  docs/{MAPA,AUDITORIAS,ADOCAO}.md (novos) · docs/DOCUMENTO_UNIVERSAL.md
  (commit do arquivo trazido pelo usuário) · docs/DECISOES.md (append D-009) ·
  docs/SESSOES.md (linha própria) · CLAUDE.md (ponteiro de processo) ·
  DOCUMENTO_CONEXOZENVO_NESTJS.md (só banner de superseded no topo)
- **Fora do escopo (não tocar):** qualquer código de apps/ e packages/ ·
  schema.prisma · ci.yml · docs/observacao/ e how-to/ da sessão M2 ·
  mudanças não commitadas pré-existentes (env.example, docker-compose.yml —
  são de outra frente, ficam intocadas e fora dos commits desta sessão)
- **Branch:** feature/adocao-base-v32 (a partir da main)

## Progresso

- [21/07 16:35] Análise: doc do projeto (v1.1) veio do universal v2.1; o
  docs/DOCUMENTO_UNIVERSAL.md é v3.2 → deltas = R11–R18 novos + reforços
  R4/R5/R6/R9/R10 (numeração R1–R10 já bate 1:1, upgrade aditivo)
- [21/07 16:50] BASE_CONEXOZENVO.md criado (v3.2 traduzida: NestJS/Prisma/
  Vitest/Dokploy; R0 e ondas M preservados; estado real registrado no R15)
- [21/07 16:55] MAPA.md e AUDITORIAS.md criados
- [21/07 17:00] Inventário de evidências concluído (varredura CI/hooks/Docker/
  env/segurança/banco/fuso/observabilidade) → ADOCAO.md criado: diagnóstico
  R0–R18 com arquivo:linha + 7 ondas A1–A7 priorizadas por risco (A1=backup,
  A2=gates, A3=fuso/Timestamptz, A4=M3, A5=deploy R15, A6=M5, A7=a11y)
- [21/07 17:05] D-009 no DECISOES.md · CLAUDE.md apontando BASE · banner de
  superseded no DOCUMENTO_CONEXOZENVO_NESTJS.md · commit da sessão

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** nenhum (documentação/processo)
- **Pendências para próxima sessão:** —
