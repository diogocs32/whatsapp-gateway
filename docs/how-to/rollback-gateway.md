---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-25
validade: 2026-12-25
status: ativo
origem: P-055 (guardas de build — pré-requisito do stop-first B-004)
---

# ⏪ Rollback manual do gateway (Dokploy)

> **Quando usar:** um deploy do gateway subiu e está quebrado — `/health` não responde 200, o
> container reinicia em loop, ou uma função crítica (envio, webhook) parou. **Por que importa agora:**
> com o **stop-first** do B-004 o container antigo é parado ANTES do novo subir; se o novo falhar, não
> há ninguém segurando a API (no start-first de hoje o antigo segurava — foi o que salvou o deploy de
> 16/08 com `Cannot find module 'zod'`).

## 0. Antes de precisar (prevenção — já no código desde a P-055)

O build agora **falha** em vez de gerar imagem quebrada. Estas situações param no `docker build`
(no CI e no Dokploy), sem chegar à produção:

| Situação                                                          | Quem pega                                                                  | Prova (25/09/2026, build local)                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| Patch do whatsapp-web.js não aplica                               | `postinstall: patch-package --error-on-fail` (package.json)                | `**ERROR** Failed to apply patch` → build exit 1 |
| `patches/` ausente/vazio (patch nunca roda)                       | `sh scripts/guardas-build.sh patches` (Dockerfile e CI)                    | `FALHA: patch do whatsapp-web.js NÃO aplicado`   |
| Build sem `apps/gateway/dist/main.js` (entrypoint do container)   | `sh scripts/guardas-build.sh dist`                                         | `FALHA: apps/gateway/dist/main.js não existe`    |
| Dependência faltando na imagem final (caso `zod` de 16/08)        | `sh scripts/guardas-build.sh deps apps/gateway/dist` no estágio de runtime | `FALHA: 16 require(s) sem resolução … 'zod'`     |
| Dependência transitiva faltando (ex.: `sonic-boom` do pino)       | mesma guarda `deps` (carrega cada pacote, não só resolve)                  | `FALHA: … carregar 'pino' → Cannot find module`  |
| Prisma CLI/`prisma.config.ts` quebrado (1º comando do entrypoint) | `sh scripts/guardas-build.sh prisma` (`prisma validate`, sem banco)        | `FALHA: prisma validate falhou` (sem `dotenv`)   |
| Imagem do dashboard que não constrói no Dokploy                   | job `imagens` do CI: `docker build -f apps/dashboard/Dockerfile .`         | local: build ok                                  |
| Imagem do gateway que não sobe (entrypoint, migrate, Nest)        | job `imagens` do CI: boot real + `/health` com banco, Redis e storage ok   | local: `/health` ok ~2 s após o `docker run`     |

Regra: **não mergear na `main` sem o CI verde no PR**. 📎 25/09 (D-027): o auto-deploy do Dokploy
está desligado nos dois apps — o merge não publica nada; cada app sobe no Deploy manual.

## 1. Diagnóstico rápido (2 min)

1. Dokploy → projeto `conexozenvo` → app `gateway` → **Deployments**: o último deploy terminou
   `Done` ou `Error`? Abrir o log do build (se o build falhou, **a produção não mudou** — nada a
   reverter; corrigir e fazer novo deploy).
2. Dokploy → **Logs** do app: procurar `[entrypoint]`, `Nest application successfully started`,
   `Error`, `Cannot find module`, `P1001` (banco), `ECONNREFUSED` (Redis).
3. `https://api.conexozenvo.cloud/health` no navegador: 200 com `database/redis/storage: true` = no ar.

Se o container novo está no ar e o problema é funcional (não de boot), avaliar se dá para esperar
um fix rápido; se não, seguir para o rollback.

## 2. Rollback — opção A (recomendada): rollback por registry do Dokploy

Fonte oficial: [docs.dokploy.com — Rollbacks](https://docs.dokploy.com/docs/core/applications/rollbacks)
(espelho local `~/dioggo-agents/agentes/docs/dokploy/latest/core/applications/rollbacks.mdx:90-150`).

- **Pré-requisito (uma vez, ação do dono):** um registry configurado no Dokploy (Docker Hub, GHCR ou
  próprio) → app `gateway` → **Deployments → Rollback Settings** → habilitar **Rollback**, escolher o
  registry → **Save**. A partir daí cada deploy empurra a imagem com tag única.
- **Na hora:** **Deployments** → no deploy anterior (o último que funcionava) → **Rollback** →
  confirmar. A doc avisa: esperar alguns segundos para o Dokploy baixar a imagem antes de olhar os
  logs.
- **Tempo:** download da imagem + boot. Boot medido (smoke local 25/09): ~2 s do `docker run` até o
  `/health` ok, com as migrations já aplicadas (migration pendente soma o tempo dela). A reidratação escalonada das sessões continua depois do `/health`
  (~3 min para 20 sessões, medido em 09/09).
- ⚠️ **Migrations são forward-only:** se o deploy quebrado aplicou migration nova, a imagem antiga
  roda sobre o schema novo. As migrations deste projeto são aditivas (colunas/tabelas novas), então a
  imagem antiga costuma funcionar; **nunca** reverter migration à mão (correção = migration nova).

## 3. Rollback — opção B (sem registry): `git revert` + deploy

1. No repositório: `git fetch && git checkout main && git pull`.
2. `git revert -m 1 <sha-do-merge>` (merge do PR) — ou `git revert <sha>` se foi fast-forward de um
   commit só; para vários commits: `git revert --no-commit <mais-antigo>^..<mais-novo>` e um commit.
3. `git push origin main` → **Deploy manual** do gateway no Dokploy (o auto-deploy está desligado nos dois
   apps desde 25/09 — D-027; se o revert tocar no dashboard, Deploy manual dele também).
4. **Tempo:** o build roda no servidor. Medido em 25/09 no CI (runner GitHub Linux amd64, sem cache —
   o mais parecido com o servidor): **96 s** para a imagem do gateway, 17 s a do dashboard, e `/health`
   ok **~6 s** após o start num banco vazio (aplicando todas as migrations) — run `36137525913`. No Mac
   (arm64): **122 s** para o
   `docker build` completo do `apps/gateway/Dockerfile` (npm ci, apt do Chromium, build, guardas) sem cache
   (48 s com cache das dependências) + boot de ~2 s até o `/health`. O tempo no servidor **não foi medido** — anotar aqui a duração que
   o Dokploy mostrar no próximo deploy (Deployments mostra início/fim).

## 4. O que NÃO usar como rollback

- **Rollback automático do Swarm** (`FailureAction: rollback`): segundo o código do Dokploy lido na
  análise de 23/09 (`analise-atualizacoes-2026-09.md` §8), a imagem é reconstruída com a **mesma tag**
  a cada deploy, então o "rollback" do Swarm volta a spec anterior apontando para a imagem nova — não
  confiar nele para voltar código. Ele continua útil como rede quando a task nem sobe.
- **Health Check do Swarm no Dokploy:** manter VAZIO enquanto a issue Dokploy #5171 estiver aberta
  (ver `deploy-dokploy.md` §2); o HEALTHCHECK do `apps/gateway/Dockerfile` segue valendo.
- **Reiniciar o gateway em rajada** tentando "destravar": com sessão WhatsApp real conectada isso
  derruba/loga a sessão (regra do projeto). Um rollback, uma verificação.

## 5. Depois do rollback

- Conferir `/health`, o painel (sessões voltando para WORKING) e um envio de teste num chip de teste.
- Registrar em `docs/PENDENCIAS.md` o que quebrou (P-xxx) e, se foi incidente de produção, o
  postmortem (R15).
