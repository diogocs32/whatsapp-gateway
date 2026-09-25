# Sessão: analise-atualizacoes

- **Status:** ✅ DONE — análise documental concluída e salva; nada implementado.
- **Início:** 23/09/2026 ~17:50 BRT · **Encerramento:** 24/09/2026 (pedido do dono: "deixe tudo isso salvo, pois vou iniciar outro chat").
- **Objetivo:** (1) "análise de tudo o que eu preciso atualizar da plataforma, todas as versões, se tem coisa nova e melhor para garantir a estabilidade das contas"; (2) "tem algo do wwebjs que diminui consumo de memória? hoje está tudo Baileys, pois o wwebjs consome muita memória e processamento".
- **Escopo:** relatórios novos em `docs/`, evidência bruta em `docs/reference/`, registros em PENDENCIAS/SESSOES/SESSOES_ARQUIVO/ESTADO/MAPA/AUDITORIAS/CHANGELOG, aviso de correção no runbook `deploy-dokploy.md`. Leitura do monorepo, `npm outdated`/`npm audit` locais, pesquisa externa (npm, API do GitHub, docs oficiais, Context7), medições locais descartáveis de Chromium/Baileys **sem parear conta**.
- **Fora do escopo:** código, dependências, lockfile, configuração, banco, produção/Dokploy, envio de mensagens, arquivos de outras sessões (a ATIVA `lid-envio-wwebjs` foi só lida), push.
- **Branch:** `feature/analise-atualizacoes-20260923`, base `0a68326` (main).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** M3 concluída; próxima M4 (A1 backup "a mais urgente"). Último deploy 15/09 `768fb26`. Texto ainda diz "frota 100% Baileys" (18/08) enquanto a ATIVA de 31/08 prova 18 WWEBJS + 1 Baileys — divergência registrada (P-063); em 23/09 o dono informou frota 100% Baileys.
- **SESSOES:** 1 ativa (`lid-envio-wwebjs`, dona do `wwebjs.engine.ts` — não tocada); avisos de 15/09 (caixa única, MinIO quay.io) e 18/08 (CI) lidos; 5 últimas do histórico lidas.
- **PENDENCIAS:** B-001 (WA_REQUIRE_PROXY ausente no Dokploy novo), B-002 (build expira 13/10), B-003 aberta; P-001, P-012, P-017, P-019, P-021, P-025/P-026, P-027..P-046 considerados.
- **BASE:** v4.3; R0 (não quebrar prod/contrato), R3 (doc fiel), R6, R9 aplicados — somente documentação.
- **Estado inicial:** `AGENTS.md` não rastreado preexistente, preservado.

## Método

1. Snapshot local: versões do lockfile, `npm outdated`, `npm audit --ignore-scripts` (11 vulnerabilidades: 9 high, 2 moderate).
2. Workflow `analise-atualizacoes-conexozenvo` (run `wf_51203db2-1a2`): 8 frentes (baileys, wwebjs, backend, frontend-tooling, infra, oficial-politica, alternativas, codigo-estabilidade) → 1 verificador adversarial por frente → crítico de completude (lacunas, conflitos, ondas). 17 agentes.
3. Conferência manual na fonte dos achados que mudam prioridade: código do Dokploy v0.30.2 (start-first), GHSA-9c5c (Nest), GHSA-hv4r (MinIO), GHSA-w4v4 (Traefik), `versions.json` do wa-version, ATIVA de 31/08 (frota).
4. Workflow `wwebjs-memoria-cpu` (run `wf_ad3a56a0-e1b`): 4 frentes (código do gateway, Chromium/puppeteer, upstream/referências, "precisa de wwebjs?") + 4 verificadores; medições locais em página não logada. Conferência manual: `downloadMediaStream` no pin, `AutomationControlled` já aplicado pela lib, 3 operações 501 no Baileys, `recordGroupParticipants` ignora `phoneNumber`, heap do Node = 50% do cgroup.

## Encerramento — 24/09/2026

**RESULTADO:**

- [analise-atualizacoes-2026-09.md](../analise-atualizacoes-2026-09.md): conclusão, premissas erradas nas docs, ações do dono (B-004..B-007), achados do Baileys (P-047..P-052), wwebjs (P-059), tabela de versões, segurança, infra, política do WhatsApp (mudou em 23/09), engines alternativas, o que não fazer, ondas 0–7 com critérios de aceite.
- [analise-wwebjs-memoria-2026-09.md](../analise-wwebjs-memoria-2026-09.md): não há "modo leve"; flags restantes ~7–10%; maior alavanca = mídia (`downloadMediaStream`, sem auto-download de grupo, fila, teto de envio); provavelmente dispensável (Baileys lê `phone_number` do roster) → A/B de leads (P-060/P-061).
- Evidência bruta: `docs/reference/analise-atualizacoes-2026-09.json` e `docs/reference/analise-wwebjs-memoria-2026-09.json`.

**Achados de maior impacto:** Dokploy aplica `start-first` com Update Config vazio (B-004); produção sem backup (B-005); MinIO com CVE-2026-41145 e API pública (B-006); Nest GHSA-9c5c high invisível ao npm audit (P-054); mensagens offline do Baileys descartadas (P-047); sinais nativos de restrição ignorados (P-048); download de mídia do Baileys sem proxy e sem timeout (P-050); bypass do teto de login por `req.url` (P-053). **Refutado:** "versão de protocolo Baileys vence 25–26/09" (precedente real ~4,5 meses → risco ~dez/2026).

**Validação:** prettier nos arquivos tocados; `git diff --check`; links locais dos relatórios conferidos; varredura das evidências brutas por credenciais (nenhuma; só o IP da VPS já presente no ESTADO e o usuário default `minioadmin` como texto de alerta). Builds, testes, produção e QR não executados (análise).

**Commits/merge/PR/push:** 1 commit local na branch `feature/analise-atualizacoes-20260923` (doc-only). **Sem push e sem merge** — o dono decide. Watch Paths garantem que push só de `docs/` não redeploya.

### Reconciliação documental — R3/R9

- Relatórios novos → MAPA (navegação) e AUDITORIAS (execução da triagem de dependências e da revisão ampla).
- Achados → PENDENCIAS (B-004..B-007, P-047..P-064; notas em B-003, P-012, P-019, P-021).
- Runbook com instrução comprovadamente errada → aviso ⚠️ no `deploy-dokploy.md` §Update Config apontando o B-004 (a correção completa + D-xxx substituindo a D-014 fica na P-063/Onda 0B, após o dono confirmar o inspect).
- ESTADO → nota datada de 23/09 (achados + frota informada pelo dono) e próximo passo = Onda 0.
- CHANGELOG → entrada documental.
- **Docs-n/a: DECISOES** — nenhuma decisão do dono foi tomada; D-014 (premissa falsa) e D-012 (frota) serão substituídas por D-xxx quando o dono confirmar B-004 e a migração da frota (P-061/P-063). **INTEGRACAO/ARQUITETURA** — nenhum contrato ou fronteira mudou. **CLAUDE.md** (rc13→rc14) — fica para a P-063 (arquivo de instruções compartilhado; mudança isolada numa sessão documental própria).

### Checkpoint

- **O QUE FOI FEITO:** análise completa de versões/estabilidade + análise de memória do wwebjs, salvas com evidência.
- **PACOTES ADICIONADOS:** nenhum.
- **DECISÕES REGISTRADAS:** nenhuma (propostas).
- **EFEITO DE DEPLOY:** nenhum (doc-only).
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** doc inexata / proposta confundida com runtime → verificação adversarial por frente, conferência manual na fonte dos achados críticos, prettier e links.

## BLOQUEADO EM VOCÊ

- **B-004** preencher Update/Rollback Config `stop-first` no Dokploy (e conferir com `docker service inspect`).
- **B-005** backup do Postgres para S3 fora da VPS + restore testado.
- **B-006** trocar MinIO para `pgsty/minio` pinado, fechar console 9001, trocar root se `minioadmin`.
- **B-007** diagnóstico somente leitura (Traefik, Node/Chromium, Redis, Postgres, env, painel, logs, frota, pareamento Baileys com chip).
- **B-003** checklist no celular + 2FA com e-mail nos números.
- Decidir: push/merge desta branch doc-only; D-xxx da frota 100% Baileys (P-061); P-012/P-048 (sinal duro → `banida` ou só alerta).

## DOCS TOCADAS

- `docs/analise-atualizacoes-2026-09.md` (novo)
- `docs/analise-wwebjs-memoria-2026-09.md` (novo)
- `docs/reference/analise-atualizacoes-2026-09.json` (novo)
- `docs/reference/analise-wwebjs-memoria-2026-09.json` (novo)
- `docs/PENDENCIAS.md`
- `docs/SESSOES.md` · `docs/SESSOES_ARQUIVO.md`
- `docs/ESTADO.md`
- `docs/MAPA.md` · `docs/AUDITORIAS.md`
- `docs/deploy-dokploy.md` (aviso)
- `CHANGELOG.md`
- Este arquivo DONE.

**Retomada (próximo chat):** ler ESTADO → SESSOES (aviso de 23/09) → PENDENCIAS (B-004..B-007, P-047..P-064) → [relatório §1, §4, §12](../analise-atualizacoes-2026-09.md). Sugestão de 1ª sessão de código: Onda 1 (P-055 guardas de build + P-054 patches + P-053) ou Onda 2 (Baileys P-047..P-052), cada uma em `feature/*` própria; teste A/B de leads (P-061) é leitura e pode vir antes.
