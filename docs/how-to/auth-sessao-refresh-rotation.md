# Sessão do painel — refresh-token rotation (fim do 401 no meio do trabalho)

> Substitui o modelo antigo de **JWT único de 12h**. Referência de arquitetura, operação e rollback.
> Dono: equipe gateway · revisado em 30/09/2026 (P-005/E21).
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

### Retenção segura (P-005/E21 · D-050)

`RefreshTokenPurgeService`, interno ao IAM, varre 2 minutos após o boot e depois
cada `RETENTION_SWEEP_HOURS` (default6). `RETENTION_REFRESH_TOKENS_GRACE_DAYS`
(default7; 0 desliga só este purge) define cutoff = agora − margem. Valores
não finitos/negativos não executam limpeza. Não muda os TTLs nem os cookies.

Cada chamada remove até500 linhas com `expiresAt < cutoff`. Uma família que
possua qualquer token **não revogado com `expiresAt >= cutoff`** conserva todos
os ancestrais, inclusive expirados/revogados. Isso também conserva a trilha
quando o terminal expirou recentemente, dentro da margem. O registro de A
continua disponível: A→B válido, expirar A, purge, reapresentar A → revogar B.
Quando nenhuma linha não revogada estiver dentro da margem, só as expiradas
antes do cutoff ficam elegíveis; revogadas ainda dentro do prazo não são apagadas.
Famílias ativas por tempo indefinido podem conservar uma trilha longa; não se
limita a cadeia porque isso enfraqueceria a detecção de reuso aprovada em D-009.

Candidatos usam o índice existente `expiresAt` e excluem famílias protegidas
antes do LIMIT. `create`, `rotate`, logout e `revokeAllForUser` compartilham
advisory **transaction** lock por usuário (`iam-refresh-user:`). Purge tenta
esse lock sem esperar: usuário ocupado fica para outra varredura. Depois do
lock, um DELETE em comando separado revalida a família com snapshot atualizado
READ COMMITTED. Evita apagar ancestral se uma rotação criou descendente depois
da seleção. A leitura inicial/CAS da rotação permanece: duas requests que leram
a linha válida retornam ok/raced; reuso observado depois da revogação revoga a
família, mesmo com ancestral expirado. O lock coordena reset/rebaixamento com
rotação; não muda a verificação de senha que ocorre antes de abrir novo login.

Cada sweep tem até20 lotes500 (máximo10mil linhas); lote parcial/ocupado encerra
esta passagem, e a próxima retoma. Transação curta por usuário, single-flight
local, timers unref e erro registrado com retry na próxima varredura. Desligado
no boot de testes; shutdown cancela timers, aguarda lote em voo e não inicia outro.
Não exporta novo provider/porta para outros módulos. Sem migration/dependência nova.

**Publicação e rollback:** primeira troca manual exige **stop-first**, pois N-1
não participa do novo protocolo de lock. Não há limpeza em produção nesta etapa.
Para desativar purge, usar margem0; para rollback, desativar purge e fazer troca
stop-first na janela do dono. Registros legitimamente purgados não são recriados;
famílias protegidas permanecem. Gates anteriores C/D/E/F/B-004/B-005/B-007,
migration/stop-first D-049 e snapshots7d recalculados ou24h E21 continuam válidos.

Provas locais: `npm run test:e2e -w apps/gateway -- refresh-token-purge.e2e-spec.ts`
(PostgreSQL real/fixtures/HTTP, transporte falso) e
`npm run test:unit -w apps/gateway -- refresh-token-purge.service.spec.ts`.
Esses testes não demonstram publicação nem comportamento de conta WhatsApp real.

Fontes conferidas para Prisma7.10.0/PostgreSQL18/Nest12.1.1/Node26:
[Prisma7 SQL parametrizado](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries),
[transações](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions),
[advisory locks PostgreSQL18](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS),
[snapshots READ COMMITTED](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED),
[lifecycle Nest](https://docs.nestjs.com/fundamentals/lifecycle-events).
Context7 ficou indisponível por transporte HTTP; docs oficiais e tipos/código
instalados foram o fallback. A decisão de conservar a família deriva do fluxo
D-009 existente e das fixtures; não é uma API de retenção oferecida pelo framework.

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
- [x] Purge de expirados no IAM preservando ancestrais de famílias protegidas (P-005/E21); código/CI/merge separados da publicação manual.
