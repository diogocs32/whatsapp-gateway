# Sessão: integracao-branches

- **Status:** 🟢 ATIVA — 26/09/2026 19:45 BRT.
- **Objetivo:** reconciliar as branches locais e remotas com conteúdo exclusivo e levar à `main` o que for seguro, por PR com CI verde, sem Deploy.
- **Escopo:** histórico M2 (`docs/observacao/`, DONE M2 e how-to), script de coleta e ignore; branch local do detector de não entrega conforme decisão do dono, `apps/gateway/src/modules/guardrail/` e `bootstrap/config.ts` se integrada; documentação R9/R3, `env.production.example`, `MAPA-CODIGO` e referência gerada conforme diff. Ponto global: `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/PENDENCIAS.md`.
- **Fora do escopo:** E11/E12, alteração de contratos sem necessidade, conta/mensagem/mídia real, deploy e worktrees sujas de outras sessões.
- **Branch:** `feature/integracao-branches-20260926`, criada de `origin/main` (`c1c3536`) em worktree isolada.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7–E10, Onda 6 e Onda 8 já estão na `main`; E11/E12, Deploy A/G/W/B e canários seguem pendentes. Último SHA de produção documentado `768fb26`, sem verificação ao vivo; auto-deploy consta desligado em D-027.
- **SESSOES:** `lid-envio-wwebjs` é a sessão ativa registrada e seu commit `740b911` já é ancestral da `main`; avisos E7/E8/E9/E10 exigem preservar dedupe, pausa 423, política de desconexão e proxy de mídia. A worktree `auditoria-desempenho` tem mudanças não commitadas e não será tocada.
- **PENDENCIAS:** B-004/B-005/B-007 e P-034/P-056/P-087 continuam; o detector local antigo exige revisão por R0 e D-022 antes de entrar na `main`.
- **Inventário Git:** 11 branches remotas de feature já são ancestrais de `origin/main`; as únicas remotas com commits exclusivos são `coleta-mac` (`ac6a340`) e `feature/m2-guardrail-ativo` (`f850cba`). A única local com commit exclusivo é `feature/detector-nao-entrega` (`19058c0`). PRs #1–#12 estão mergeados, nenhum aberto.
- **M2:** `DONE-2026-07-10-1040-m2-guardrail-ativo.md` declara 6 coletas em 5 dias; o ramo antigo contém 12 coletas até 19/07, além de um `ATIVA` obsoleto. A reconciliação deve preservar a sessão encerrada e corrigir a narrativa histórica sem alegar nova verificação de produção.
- **Roteiro:** uma etapa por chat para trabalho da Onda 2; esta integração de branches é demanda posterior do dono e não marca E11/E12 como executadas. CI antes de merge; nenhum Deploy.

## Progresso

- 19:45 — abertura R9; inventário, divergências e conflitos revistos. Preferência sobre o detector solicitada ao dono enquanto o histórico M2 é reconciliado.
- 19:50 — merges explícitos de `coleta-mac` e `origin/feature/m2-guardrail-ativo`; conflitos resolvidos mantendo M2 como DONE. JSONL validado com 12 coletas (8 pré-flip, 4 pós-flip), sem duplicar Mac; D-017, arquivo histórico, how-to e exemplos de env reconciliados. `scripts/coleta.sh` agora exige arquivo novo e não altera o M2 arquivado.
- 19:57 — merge do commit local `19058c0` com guarda R0: varredura WWEBJS opt-in/default 0 e apenas WARN, sem `recordHardSignal`; D-035/P-088 e mapa/contrato documental atualizados. Prisma 7 `$queryRaw` parametrizado e enum PostgreSQL 18 conferidos nas fontes oficiais citadas na D-035. Unit 4/4 e e2e Postgres sintético 1/1; typecheck, lint, formato e fronteiras verdes. Mapa gerado e `--check` verde após os testes. Nenhum payload público, conta ou envio real.
- 20:02 — revisão adversarial encontrou dois riscos no coletor M2: o script podia anexar ao JSONL histórico por caminho alternativo e o `GET /guardrail` pode aplicar transição com enforce ligado. O coletor agora exige caminho novo, rejeita o mesmo inode do arquivo M2 (inclusive alias/symlink) antes de qualquer fetch e o runbook informa o efeito operacional. Sem argumento e com caminhos relativos/absolutos do M2, os comandos falharam sem alterar o SHA-256 do JSONL; nenhum endpoint real foi chamado. PROJETO/INTEGRACAO também foram reconciliados.
