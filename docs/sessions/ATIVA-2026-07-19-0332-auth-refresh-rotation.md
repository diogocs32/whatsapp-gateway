# Sessão: auth-refresh-rotation

- **Status:** 🟢 ATIVA
- **Início:** 19/07/2026 03:32 (06:32 UTC)
- **Objetivo:** Corrigir de forma definitiva o 401 em `GET /api/auth/me` que derruba o usuário no meio
  do trabalho. Causa raiz: sessão de token ÚNICO com vida fixa de 12h, sem refresh, sem renovação
  deslizante e sem tratamento gracioso de 401 no front. Solução aprovada (melhor padrão OWASP/RFC 9700):
  **refresh-token rotation** — access JWT curto (15min) + refresh opaco longo (30d) com rotação a cada
  uso e detecção de reuso (revoga a família), + silent-refresh no dashboard. Parâmetros aprovados pelo
  usuário: access **15min**, refresh **30 dias**, escopo **solução completa**.
- **Escopo (pode tocar):**
  - `apps/gateway/src/modules/iam/**` (novo `TokenService`, endpoint `POST /auth/refresh`, login/logout
    emitindo/limpando 2 cookies, guard inalterado), `iam.module.ts` (providers/exports)
  - `apps/gateway/prisma/schema.prisma` (**ponto de contato global** — novo model `RefreshToken` +
    back-relation em `User`) + migration forward-only
  - `apps/gateway/src/bootstrap/config.ts` (envs `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`)
  - `apps/gateway/env.production.example` (novas envs + corrigir `CORS_ORIGIN` real = conexozenvo.com)
  - `apps/gateway/test/auth.e2e-spec.ts` + `test/setup-app.ts` (helper de cookie) — e2e de efeito (R6)
  - `apps/dashboard/src/lib/api.ts` + `lib/auth.tsx` (interceptor 401 + silent refresh + redirect gracioso)
  - `packages/contracts` (**ponto de contato global** — se o payload de `/auth/*` mudar)
  - `docs/**` (este arquivo, design doc, DECISOES, SESSOES, ESTADO no encerramento)
- **Fora do escopo (não tocar):** módulos não-iam do gateway, engines, guard-rail (M2), `docker-compose.yml`,
  `ci.yml`. **NÃO renomear o cookie de access `token`** (SSE-auth.guard + JwtAuthGuard dependem — R0).
- **Branch:** feature/auth-refresh-rotation (a partir de origin/main)
- **Coexistência:** sessão M2 (`feature/m2-guardrail-ativo`) segue ativa em paralelo; escopos DISJUNTOS
  (M2 = docs + coletor; esta = auth/dashboard + schema). Sem conflito previsto em SESSOES.md/ESTADO.md.

## Critérios de aceite

1. `POST /api/auth/login` seta 2 cookies httpOnly: `token` (access, path `/`, ~15min) e `refresh_token`
   (path `/api/auth/refresh`, ~30d). Body ainda devolve `{token, user}` (compat R0).
2. `POST /api/auth/refresh` rotaciona: novo refresh ≠ antigo; o antigo deixa de valer.
3. Reuso de um refresh já rotacionado → **revoga a família inteira** (o token "de boa fé" também cai) → 401.
4. Access expirado + refresh válido → `/auth/refresh` renova e `/me` volta 200 (silent refresh).
5. Front: 401 em qualquer request → 1 chamada de refresh (anti-corrida) → refaz a ação; refresh falhou →
   redirect limpo p/ `/login` com aviso. Sem console cheio de 401.
6. Suíte e2e completa VERDE (R6: efeito crítico coberto). `tsc --noEmit` limpo nas 2 apps.
7. Contrato `/api` público e fluxo `X-Api-Key` (node n8n) INTOCADOS. Cookie de access continua `token`.
8. Docs: design formalizado, `env.production.example` corrigido, checklist de deploy (novas envs).

## Progresso

- [19/07 03:32] **Investigação forense concluída** (código + runtime prod). Causa raiz confirmada:
  JWT único 12h (`config.ts:52`, `JWT_EXPIRES_IN=43200`) sem refresh/sliding; front (`auth.tsx`) só checa
  `/me` no mount e não tem interceptor 401 (`api.ts`). Descartado CORS/cookie (curl prod: ACAO
  `https://conexozenvo.com` + credentials true; cookie host-only entregue certo) e rotação de secret.
  Achado colateral: `env.production.example` diz `CORS_ORIGIN=app.conexozenvo.com` mas o real é
  `conexozenvo.com`. Design embasado em OWASP Session/JWT Cheat Sheets + RFC 9700 §4.14 + doc versionada
  (@nestjs/jwt 11, @fastify/cookie 11). Aprovação do usuário: solução completa, 15min/30d.
- [19/07 03:32] Sessão R9 aberta; branch `feature/auth-refresh-rotation` criada de origin/main; registrada
  em SESSOES.md. (Progresso da M2 commitado antes na branch M2 — `6f2da26`, docs-only.)
- [19/07 03:36] **Ambiente Node corrigido** (pedido do usuário "deixar só node 26"): removidas versões
  antigas do nvm (só v26.5.0), default nvm=26. Descoberto que `wsl.exe bash -lc` NÃO sourceia
  `~/.profile` (embora seja login shell) e mangla aspas inline → builds passam a rodar via SCRIPT
  (`bash ~/script.sh`), com PATH do node 26 setado dentro do script. Shell INTERATIVO do usuário já
  pega node 26 (nvm no .bashrc). `/usr/bin/node` v18 do apt fica sombreado (remover exige sudo — não feito).
- [19/07 03:43] **Migration + schema** (task #10 ✅): model `RefreshToken` (ULID, tokenHash @unique
  sha512, sessionId=família, expiresAt, revokedAt, replacedBy, ua, ip) + back-relation em `User`.
  Migration `20260719063643_refresh_tokens` aplicada (dev), client Prisma 7.8.0 regenerado.
- [19/07 03:55] **Gateway** (task #11 ✅): `TokenService` (access JWT 15min via override + refresh opaco
  rt_+base64url/sha512), porta `RefreshTokenRepository` + `PrismaRefreshTokenRepository` (rotate atômico
  em $transaction + reuso→revoga família + raced), `AuthSessionService` (login/refresh/logout),
  `auth.controller` reescrito (2 cookies: `token` Path=/ + `refresh_token` Path=/api/auth; POST /refresh;
  logout revoga), config `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`, wiring no `iam.module`, `login.usecase`
  removido. `tsc --noEmit` gateway = 0 erros.
- [19/07 03:57] **Dashboard** (task #12 ✅): `lib/api.ts` ganhou silent-refresh (`coreFetch` intercepta
  401 → `POST /auth/refresh` 1x com flag anti-corrida → refaz request; anti-loop; falha → `onUnauthorized`);
  `lib/auth.tsx` registra o handler (limpa user → `<Protected>` redireciona pro /login). `tsc` dashboard = 0.
- [19/07 03:58] **e2e (R6) ✅**: 5 casos novos em `auth.e2e-spec.ts` (2 cookies · rotação · reuso revoga
  família · access-expirado+refresh renova /me · logout revoga) + helper `readSetCookie` no setup.
  **Suíte completa 84/84 verde** (16 arquivos), zero regressão. ESLint 0, Prettier OK nos arquivos tocados.
- [19/07 04:0x] **Docs**: how-to `auth-sessao-refresh-rotation.md` (arquitetura/endpoints/deploy/rollback/
  checklist OWASP), D-009 no DECISOES, `env.production.example` corrigido (CORS real = conexozenvo.com +
  novas envs + JWT_EXPIRES_IN deprecated). Falta: commit + encerramento + ESTADO.

## Encerramento (preencher ao concluir)

- **Fim:** — · **Entregue:** — · **Commits:** —
- **Efeito de deploy:** —
- **Pendências para próxima sessão:** —
