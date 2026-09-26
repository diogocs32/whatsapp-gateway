# Sessão: integracao-branches

- **Status:** ✅ DONE — 26/09/2026 20:08 BRT; PR #13 mergeado, sem deploy.
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
- 20:07 — PR #13 com jobs [`ci`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36278240407/job/108505006923) e [`imagens`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36278240407/job/108505006962) verdes; merge commit `2f02f02` confirmado em `origin/main`. Nenhum Deploy foi executado.

## RESULTADO para quem não participou

- Das branches remotas, 11 já eram ancestrais da `main`. `coleta-mac` e `feature/m2-guardrail-ativo` tinham conteúdo histórico exclusivo; a branch local `feature/detector-nao-entrega` tinha um commit exclusivo. As três pontas agora são ancestrais de `2f02f02`, junto das demais branches locais/remotas inventariadas. Nenhum PR ficou aberto por esta integração.
- O JSONL M2 canônico tem 12 coletas de 10 a 19/07: 8 anteriores ao flip e 4 posteriores. A coleta 8 completa 7 dias; a 9 registra `enforce:true` e `applied:true`. D-017, DONE M2 e arquivo de sessões distinguem a evidência conhecida em 18/08 da recuperada em 26/09; não houve nova consulta à produção.
- O detector antigo não entra com o comportamento de `banida`: agora é observador somente WWEBJS, default desligado, WARN sem evento ou mutação. P-088 guarda a decisão sobre qualquer ação futura. O coletor de observação M2 rejeita o arquivo arquivado e documenta que sua consulta pode aplicar transições quando o enforce estiver ligado.
- Sem migration, rota/payload público ou mudança de `packages/contracts`. E11/E12 e os canários/deploys do roteiro continuam pendentes; esta integração não os executou. Worktrees sujas de outras sessões foram preservadas.

## RECONCILIAÇÃO DOCUMENTAL (R3)

- Provider/consulta do guardrail → `ARQUITETURA.md`, `MAPA-CODIGO.md` e referência gerada; env nova → ambos os exemplos de env, D-035 e P-088. Sem campo público ou rota novos → `packages/contracts` não muda; `INTEGRACAO.md` esclarece a ausência de evento/bloqueio no observador.
- Procedimento do coletor e histórico M2 → how-to com `revisado_em`, DONE M2, D-017, `SESSOES_ARQUIVO`, `PROJETO`, `SESSOES` e `CHANGELOG`. `docs/ADOCAO.md` conserva o diagnóstico datado de 21/07 (quando M2 estava em curso), não representa o estado atual.
- Roteiro mantém E11/E12 pendentes. Nenhum gatilho documental do diff ficou sem destino.

## Checkpoint R9

- **Commits/PR:** `7ff92cd` (Mac), `5c0537d` (M2), `484fa90` (detector/docs), PR #13 mergeado em `2f02f02`; fechamento documental em PR posterior a partir do merge. `ci`/`imagens` verdes no run `36278240407`.
- **BLOQUEADO EM VOCÊ:** nenhum para a integração das branches. E11/E12, P-088 e deploys/canários A/G/W/B seguem pendentes conforme roteiro/PENDENCIAS; B-004/B-005/B-007 permanecem, sem operação nesta sessão.
- **DOCS TOCADAS:** `ARQUITETURA`, `DECISOES`, `ESTADO`, `INTEGRACAO`, `MAPA-CODIGO` + referência, `PENDENCIAS`, `PROJETO`, `ROTEIRO-ONDAS`, `SESSOES`/arquivo, how-to M2, DONE M2/fechamento antigo, `CHANGELOG` e este DONE. Exemplos de env também atualizados.
- **Retomada:** abrir E11/P-051 em `feature/onda2-baileys-e11-e12` a partir de `origin/main`; preservar E7–E10, seguir documentação oficial da versão instalada, testes locais/fakes e canário só depois de E12/merge/deploy B autorizado.
