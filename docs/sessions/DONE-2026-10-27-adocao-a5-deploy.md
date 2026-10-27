# Sessão: adocao-a5-deploy

- **Status:** ✅ DONE em código — E29/A5, passos a–c da adoção (D-052). PR aberto; **merge só depois
  da variável `VITE_API_URL` (B-008)**; produção inalterada (passo d é do dono).
- **Início:** 27/10/2026 ~14:30 BRT.
- **Objetivo:** deploy do jeito do Prontuário (`diogocs32/prontuario-oficial`): imagem pronta no
  GHCR, promoção por etiqueta e limpeza que guarda só as últimas imagens — a A5 do ADOCAO.md.
- **Origem:** orientação do chat maestro a pedido do dono (27/10), não aprovação dele; diferenças
  mostradas ao dono antes de qualquer mudança. **Decisões do dono (27/10, neste chat):** A5 agora, à
  frente da E21/P-022; escopo a+b+c; nomes `conexozenvo-gateway`/`conexozenvo-dashboard`; migrations
  seguem no entrypoint.
- **Escopo:** `.github/workflows/ci.yml` (ponto global), `deploy-production.yml` e
  `limpeza-ghcr.yml` novos, docs R9. **Fora:** código do gateway/painel, Dockerfiles, entrypoint,
  qualquer ação no Dokploy ou nas configurações do GitHub.
- **Branch:** `feature/adocao-a5-deploy`, criada da `origin/main=c937a60` (merge do PR #45).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E28 entregue (PR #45, `c937a60`), sem deploy; fila do roteiro em E21/P-022; deploy
  manual (D-027); produção = Dokploy 89.116.73.121, sem homologação.
- **SESSOES:** única ativa alheia `lid-envio-wwebjs` (engine WWEBJS — disjunta). Avisos: E28/D-051
  (proxies) — não tocado aqui.
- **PENDENCIAS:** B-004 (stop-first do gateway, aberta) e B-005 (sem backup) condicionam o desenho;
  crio **B-008** (ações do dono) e **P-109** (resto da A5).
- **ADOCAO:** A5 = registry GHCR + build 1× + smoke do artefato + promoção gated + rollback por tag +
  retry de banco + graceful shutdown + tag 0.2.0.

## Achados antes de mexer

- `ci.yml`: `ci` e `imagens` paralelos, sem `needs`, sem portão; `imagens` já monta as duas imagens
  com os Dockerfiles do Dokploy e faz smokes (dashboard HTTP; gateway migrate+boot+/health, auth,
  rate-limit). Sem proteção de branch na main (`gh api …/branches/main/protection` → 404).
- Repositório **público** (`whatsapp-gateway`); pacote GHCR nasce privado (GitHub Docs).
- `VITE_API_URL` é build-time (`apps/dashboard/Dockerfile:4-5`, `lib/api.ts:61`), hoje Build Time
  Argument do Dokploy — com o build no CI, vira variável de repositório.
- Entrypoint roda `prisma migrate deploy` na subida (`docker-entrypoint.sh:38-40`).

## Progresso

- Teste local (Docker 29.8.0, buildx 0.37.1, `registry:2`): build padrão envia `image.index.v1`
  (atestado); com `--provenance=false --sbom=false` → `image.manifest.v1`; `imagetools create
--prefer-index=false` preserva o digest e funciona sem setup-buildx; `docker manifest inspect`
  falha em registry sem TLS → a promoção usa `imagetools inspect`. Ensaio da promoção: 1ª (sem
  producao) → troca (anterior guardada) → mesma imagem (sem efeito) → volta (anterior = a que saiu).
- jq da limpeza com lista simulada (15 `sha-`, `producao` e `producao-anterior` antigas, 1 sem
  etiqueta; KEEP 11) → apaga exatamente as 2 `sha-` antigas sem etiqueta fixa + a sem etiqueta;
  `index("producao")` não casa `producao-anterior`.
- actionlint 1.7.7 (docker) limpo nos três workflows (o SC2086 do laço de envio foi corrigido);
  prettier ok.

## Checkpoint

- **Entregue:** `ci.yml` (job `imagens` com `needs: ci`, flags de manifesto único, labels OCI,
  envio `sha-` em push na main com conferência do `mediaType`, resumo no job; portão `ci-completo`);
  `deploy-production.yml`; `limpeza-ghcr.yml` (matrix nos 2 pacotes, KEEP 11, só manual).
- **Decisões registradas:** D-052.
- **Provas:** ver Progresso; CI do PR.
- **Classe de erro introduzível e gate:** imagem com índice/atestado (limpeza quebraria) → flags +
  conferência pós-envio no CI; publicar dashboard sem endereço da API → passo que recusa sem
  `VITE_API_URL` em push na main; promover etiqueta móvel ou injeção pelas entradas → regex
  `^sha-[0-9a-f]{12}$` + entradas só por env; limpeza com lista errada → sentinela `producao`
  obrigatória para apagar.
- **Efeito de deploy:** nenhum na produção — as aplicações do Dokploy seguem com build do Git até o
  passo d. No merge, o push na main cria os dois pacotes no GHCR.
- **Reconciliação documental (diff × R3):** deploy-dokploy.md (§6 nova; nota final), DECISOES
  (D-052), PENDENCIAS (B-008, P-109), ADOCAO (R15, retenção, A5), ROTEIRO (E29), ESTADO, SESSOES,
  CHANGELOG. `Docs-n/a`: INTEGRACAO/contracts (sem mudança de API), env examples (nenhuma env do app),
  ARQUITETURA (sem módulo tocado).
- **Pendências:** P-109 (agendamento da limpeza, retry de banco, shutdown, tag 0.2.0, ensaio de volta,
  expand/contract formal).
- **BLOQUEADO EM VOCÊ (B-008):** (1) criar a variável `VITE_API_URL` antes do merge; (2) depois do
  merge: papel Admin do repositório nos 2 pacotes, limpeza simulada conferida, 1ª promoção; (3) passo
  d no Dokploy (Source Docker `:producao`, gateway com volume + stop-first/B-004).
- **DOCS TOCADAS PELO DIFF:** `CHANGELOG.md`, `docs/ESTADO.md`, `docs/SESSOES.md`,
  `docs/SESSOES_ARQUIVO.md`, `docs/PENDENCIAS.md`, `docs/DECISOES.md`, `docs/ADOCAO.md`, `docs/deploy-dokploy.md`,
  `docs/ROTEIRO-ONDAS-2026-09.md` e este DONE.
- **Para continuar:** a fila volta para E21/P-022; P-109(1) assim que o dono conferir a lista simulada.
