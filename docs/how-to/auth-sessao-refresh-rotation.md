# Sessão do painel — refresh-token rotation (fim do 401 no meio do trabalho)

> Substitui o modelo antigo de **JWT único de 12h**. Referência de arquitetura, operação e rollback.
> Implementado na sessão R9 `2026-07-19-0332-auth-refresh-rotation`. Decisão: [D-009](../DECISOES.md).

## O problema que isto resolve

O painel usava um único JWT em cookie httpOnly com vida FIXA de 12h, **sem refresh e sem tratamento
gracioso de 401**. A cada 12h a sessão morria no meio do trabalho: `GET /api/auth/me` respondia 401,
o console enchia de erros e o usuário era efetivamente deslogado sem aviso (o sintoma reportado em
18/07 ao "conectar sessão parada"). Não era bug de CORS/cookie — foi confirmado em produção que a
entrega do cookie cross-subdomínio está correta (`Access-Control-Allow-Origin: https://conexozenvo.com`

- `credentials: true`). Era **design de ciclo de vida de sessão**.

## Arquitetura (OWASP Session/JWT Cheat Sheets + RFC 9700 §4.14)

Dois tokens, ambos em cookies httpOnly emitidos pela própria API:

| Token       | Formato                     | Vida (env)                  | Cookie                                                                      | Onde vive                                          |
| ----------- | --------------------------- | --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| **Access**  | JWT (secret `JWT_SECRET`)   | `JWT_ACCESS_TTL` (15 min)   | `token` · `Path=/` · HttpOnly · SameSite=Lax · Secure(prod)                 | só no cookie                                       |
| **Refresh** | opaco `rt_<base64url(32B)>` | `JWT_REFRESH_TTL` (30 dias) | `refresh_token` · `Path=/api/auth` · HttpOnly · SameSite=Lax · Secure(prod) | cookie + linha em `refresh_tokens` (só o `sha512`) |

- **O cookie de access continua chamado `token`** — o `JwtAuthGuard` e o `SseAuthGuard` leem
  `req.cookies.token`. **NÃO renomear** (quebra o SSE — R0).
- **Refresh opaco** (não-JWT): casa com o padrão `WaApiKey` (guarda só `sha512(raw)`); a validação
  forte é o hash no banco, não uma assinatura. Dispensa um 2º secret.
- **SameSite=Lax basta** cross-subdomínio: `conexozenvo.com` e `api.conexozenvo.com` são o mesmo
  site registrável (same-site). NÃO precisa de `SameSite=None`.

### Rotação com detecção de reuso

Cada `POST /api/auth/refresh` roda numa transação Postgres (`prisma-refresh-token.repository.ts`):

1. Acha a linha pelo `sha512` do refresh apresentado. Não achou → 401.
2. Linha **já revogada** (rotacionada antes) reapresentada = **reuso** (token roubado) → revoga a
   **família inteira** (`sessionId`) → 401 + exige novo login. Atacante e vítima caem juntos.
3. Vencida (`expiresAt` no passado) → 401.
4. Válida → revoga a atual (atômico: `updateMany WHERE revokedAt IS NULL` + `count===1`) e cria a
   próxima com o **mesmo `sessionId`**. Emite novo access + novo refresh.
5. Corrida legítima de abas (duas rotam junto): a 2ª perde o `count===1` → `raced` → 401 **sem**
   revogar a família (a outra aba já entregou o par novo).

### Silent refresh no dashboard (`apps/dashboard/src/lib/api.ts`)

`coreFetch` intercepta **todo** 401: chama `POST /api/auth/refresh` **uma vez** (flag
`refreshInFlight` compartilhada = anti-corrida), refaz o request original (`allowRefresh=false` =
anti-loop). Se o refresh falhar, chama `onUnauthorized()` → o `AuthProvider` limpa o usuário → o
`<Protected>` redireciona pro `/login` (aviso limpo, sem console cheio de 401).

## Endpoints

- `POST /api/auth/login` → valida credenciais, seta os 2 cookies, body `{ token, user }` (compat).
- `POST /api/auth/refresh` → rotaciona; seta os 2 cookies; body `{ token, user }`. 401 limpa cookies.
- `POST /api/auth/logout` → revoga a família do refresh apresentado + limpa os 2 cookies.
- `GET /api/auth/me` → inalterado (valida o access; com silent refresh, se auto-renova).

**Contrato `/api` intocado** (R0): `X-Api-Key` (node n8n) e `Authorization: Bearer` seguem valendo;
`LoginResponse { token, user }` mantém o shape (agora `token` = access curto).

## Config (envs) — Dokploy

| Env               | Default          | Papel                                                     |
| ----------------- | ---------------- | --------------------------------------------------------- |
| `JWT_SECRET`      | (obrigatória)    | assina o access JWT                                       |
| `JWT_ACCESS_TTL`  | `900` (15 min)   | vida do access                                            |
| `JWT_REFRESH_TTL` | `2592000` (30 d) | vida do refresh / "ficar logado"                          |
| `JWT_EXPIRES_IN`  | —                | **DEPRECATED**, ignorado; pode remover                    |
| `CORS_ORIGIN`     | —                | Origin EXATO do painel (prod = `https://conexozenvo.com`) |

## Checklist de deploy (Dokploy)

1. **Migration**: a imagem roda `prisma migrate deploy` no boot (forward-only). A migration
   `20260719063643_refresh_tokens` cria a tabela `refresh_tokens`. Zero-downtime (tabela nova, aditiva).
2. **Envs**: as novas (`JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`) têm default seguro — **não precisam** ser
   setadas para o boot funcionar. Setar só se quiser valores diferentes de 15min/30d.
3. **`CORS_ORIGIN`**: confirmar que é `https://conexozenvo.com` (já é em prod). Se o painel migrar de
   domínio, atualizar ANTES.
4. **Redeploy** único (sessão WhatsApp real conectada — nunca em rajada, R0).
5. **Validar**: login no painel → deve setar 2 cookies (DevTools → Application → Cookies:
   `token` Path=/ e `refresh_token` Path=/api/auth). Deixar a aba aberta > 15 min e agir → **não**
   desloga (o refresh renova sozinho; olhar a chamada `POST /api/auth/refresh` na aba Network).
6. **Sessões antigas**: cookies `token` de 12h ainda válidos seguem até expirar; ninguém é deslogado
   em massa. Na 1ª expiração o front cai pro login uma vez e daí em diante usa refresh.

## Rollback

O código é aditivo e o contrato compatível — o rollback padrão é **redeploy da imagem anterior**
(a tabela `refresh_tokens` pode ficar; é inofensiva). NÃO há env de feature-flag para desligar só
isto. Se precisar invalidar todas as sessões (ex.: suspeita de vazamento): `DELETE FROM refresh_tokens`

- os usuários refazem login.

## Segurança (checklist OWASP atendido)

- [x] Cookies `HttpOnly` + `Secure`(prod) + `SameSite=Lax`; sem `Domain` (host-only); `Path` restrito.
- [x] Access TTL curto + `exp` (backend rejeita expirado no guard).
- [x] Rotação de refresh + detecção de reuso (revoga família) — RFC 9700 §4.14.
- [x] Refresh nunca em `localStorage` (cookie httpOnly); texto do refresh nunca persistido (só `sha512`).
- [x] CORS com origem explícita + `Allow-Credentials: true` + `credentials:'include'`.
- [ ] Purge de `refresh_tokens` expirados (job de limpeza) — backlog (não urgente; índice em `expiresAt` pronto).
