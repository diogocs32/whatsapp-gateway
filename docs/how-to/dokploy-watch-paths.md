---
tipo: runbook
dono: Diogo
revisado_em: 2026-08-13
validade: 2026-11-13
status: ativo
---

# ⚙️ Dokploy — Watch Paths (não redeployar em commit só de `docs/`)

> **Problema:** todo push na `main` dispara rebuild/redeploy dos apps no Dokploy —
> inclusive commits que tocam SÓ `docs/` (documentation-first gera muitos desses).
> Cada deploy reinicia o gateway (R0: derruba sessão WhatsApp real conectada) sem nenhum
> efeito de runtime. **Objetivo:** commit que mexe só em `docs/` NÃO dispara deploy;
> qualquer mudança de código continua disparando.
>
> **Solução:** configurar o **Watch Paths** de cada app. Fonte: doc oficial do Dokploy
> (`docs/core/watch-paths.mdx` do mirror; https://docs.dokploy.com/docs/core/watch-paths),
> auditada em 13/08/2026.

> **📎 25/09/2026 (D-027):** o **auto-deploy do GATEWAY foi desligado pelo dono** — os Watch Paths do
> gateway ficam sem efeito enquanto o toggle estiver desligado (o gateway só sobe no Deploy manual).
> O **dashboard** segue com auto-deploy + Watch Paths como descrito aqui.

## Fato-chave (semântica)

Watch Paths é **filtro de INCLUSÃO**: com padrões preenchidos, o auto-deploy dispara
**somente** quando o diff do push bate com algum padrão. `docs/` fica de fora simplesmente
por **não constar** em nenhum padrão. (A negação `!docs/**` existe na lista de features da
lib, mas a doc **não comprova** a composição "incluir tudo + excluir docs" numa mesma
lista — por isso usamos inclusão explícita, que é a forma literalmente documentada.)

⚠️ **Risco:** incluir de MENOS = mudança de código deixa de deployar **em silêncio**. Por
isso o teste dos dois sentidos (§3) é obrigatório após configurar.

## 1. Onde configurar

São **2 apps** no Dokploy (cada um com seu Dockerfile, ambos auto-deployam no mesmo push):

- **gateway** → `api.conexozenvo.com` (`apps/gateway/Dockerfile`)
- **dashboard/painel** → `conexozenvo.com` (`apps/dashboard/Dockerfile`)

Configure o Watch Paths **nos dois** (o que não configurar continua redeployando em doc).

**Aba:** **General** do app, perto do toggle "Auto Deploy". _(A doc confirma que o Auto
Deploy fica na General e descarta a aba Advanced; não afirma com todas as letras que o
campo Watch Paths está na General — confirmar visualmente. Se não estiver lá, procurar em
Deployments.)_

## 2. Valores (lista de inclusão, um padrão por linha/entrada)

Derivados do que cada `Dockerfile` realmente usa no build (`COPY package.json
package-lock.json` + `apps/<app>/` + `packages/contracts/`).

**App gateway:**

```
apps/gateway/**
packages/contracts/**
package.json
package-lock.json
```

**App dashboard:**

```
apps/dashboard/**
packages/contracts/**
package.json
package-lock.json
```

- `apps/<app>/**` cobre fonte, `Dockerfile`, `prisma/`, `nginx.conf`, `tsconfig`, entrypoint.
- `packages/contracts/**` porque os dois apps dependem do workspace de contratos.
- `package.json` + `package-lock.json` (raiz) porque o `npm ci` do build depende deles.
- **Bônus:** separar por app faz uma mudança só-do-painel **não** rebuildar o gateway (e
  vice-versa) — menos deploy à toa.
- **Opcional** (raro): `.dockerignore` na raiz afeta o contexto de build; se quiser que uma
  edição nele redeploye, acrescente `.dockerignore` na lista dos dois apps.

## 3. Teste obrigatório (pega o "deploy parado sem avisar")

Logo após salvar, valide nos DOIS sentidos:

1. **Doc-only NÃO deploya:** push de um commit que toca só `docs/` → em ~5 min **nenhum**
   build novo nos dois apps do Dokploy. ✅ objetivo atingido.
2. **Código DEPLOYA:** commit bobo em `apps/gateway/` (ex.: um comentário) → o **gateway**
   builda e o dashboard não. Repita em `apps/dashboard/` para o painel. Se não disparar, a
   lista está **incompleta** — adicione o path que você mexeu.

## 4. Pegadinhas (o que a doc confirma / não confirma)

- **GitHub funciona out-of-the-box** — não precisa reconectar/reconfigurar o webhook
  (provider da produção é GitHub). ✅ (`watch-paths.mdx:57-59`)
- **Botão "Deploy" manual × Watch Paths:** _não documentado_ se o deploy manual respeita ou
  ignora os padrões → tratar o botão manual como "sempre deploya" (é o escape para forçar).
- Padrões são **relativos à raiz do repo** (sem prefixo do nome do repo). (`watch-paths.mdx:41-53`)
- Engine de glob e case-sensitivity: **não documentados**. Features confirmadas: `**`
  recursivo, `*.js`, negação `!`, extglob `+(x|y)`, brace `{a,b}`, POSIX classes.
- Formato do campo (uma linha por padrão × vírgula): não documentado — ver no widget ao editar.

## Reverter

Esvaziar o campo Watch Paths volta ao comportamento atual (deploya em qualquer push).
Config não-destrutiva e reversível a qualquer momento.

## Aplicado em

### 2026-08-13 — configurado nos 2 apps + teste 1 OK

- Painel Dokploy (`http://187.77.248.160:3000`, projeto **campanha / production**),
  aba **General → Provider → Watch Paths** (fica logo abaixo de Branch/Trigger Type).
  O campo é de "chips": digita o padrão + botão **[+]** cria a etiqueta; **Save** persiste
  (toast "Service Provider Saved"). Dokploy v0.29.13.
- **gateway** (`conexozenvo`, `campanha-conexozenvo-z9ldgl`): `apps/gateway/**` ·
  `packages/contracts/**` · `package.json` · `package-lock.json`.
- **dashboard** (`conexozenvo dashboard`, `campanha-dashboard-5rxpk8`): `apps/dashboard/**` ·
  `packages/contracts/**` · `package.json` · `package-lock.json`.
- **Teste 1 (doc-only NÃO deploya) — PASSOU:** push do commit `cca541a` (só `docs/`) →
  em ambos os apps o último deployment permaneceu `dca6f26` (nenhuma build nova). ✅
- **Teste 2 (código DEPLOYA):** não forçado de propósito (rebuild = restart do gateway,
  R0). Será confirmado no **próximo push de código real** — deve aparecer uma deployment
  nova no app correspondente. Se NÃO aparecer, a lista está incompleta: adicione o path
  que você mexeu.

## ⚠️ Comportamento observado em produção (14/08/2026)

O filtro avalia **o commit de TOPO do push** (não o diff acumulado): um push com vários commits
onde o topo é doc-only **NÃO dispara deploy, mesmo com commits de código abaixo** (evidência:
push `ccc17b1..62470d1` levou o código `25cad0c` e não buildou — uptime do container atravessou o
push). Corolários: (a) nunca "esconder" código sob um commit de docs achando que deploya;
(b) para segurar um deploy, garanta que o commit de topo seja doc-only — mas o código fica
pendente e o PRÓXIMO deploy (manual ou push com topo de código) o ativa junto.
