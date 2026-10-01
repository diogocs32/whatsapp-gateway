<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `iam`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/iam/application/api-key.service.ts` | 49 |
| `modules/iam/application/audit.service.ts` | 23 |
| `modules/iam/application/auth-session.service.ts` | 160 |
| `modules/iam/application/branding.service.ts` | 23 |
| `modules/iam/application/license.service.spec.ts` | 238 |
| `modules/iam/application/license.service.ts` | 83 |
| `modules/iam/application/refresh-token-purge.service.spec.ts` | 226 |
| `modules/iam/application/refresh-token-purge.service.ts` | 86 |
| `modules/iam/application/token.service.ts` | 37 |
| `modules/iam/application/user.service.spec.ts` | 63 |
| `modules/iam/application/user.service.ts` | 112 |
| `modules/iam/domain/api-key.repository.ts` | 31 |
| `modules/iam/domain/audit.repository.ts` | 20 |
| `modules/iam/domain/branding.repository.ts` | 10 |
| `modules/iam/domain/branding.ts` | 15 |
| `modules/iam/domain/license-key.ts` | 8 |
| `modules/iam/domain/license.repository.ts` | 9 |
| `modules/iam/domain/license.spec.ts` | 180 |
| `modules/iam/domain/license.ts` | 76 |
| `modules/iam/domain/refresh-token.repository.ts` | 52 |
| `modules/iam/domain/role.ts` | 18 |
| `modules/iam/domain/user.entity.ts` | 14 |
| `modules/iam/domain/user.repository.ts` | 31 |
| `modules/iam/iam.module.ts` | 93 |
| `modules/iam/infrastructure/admin-seeder.ts` | 43 |
| `modules/iam/infrastructure/prisma-api-key.repository.ts` | 77 |
| `modules/iam/infrastructure/prisma-audit.repository.ts` | 44 |
| `modules/iam/infrastructure/prisma-branding.repository.ts` | 42 |
| `modules/iam/infrastructure/prisma-license.repository.ts` | 28 |
| `modules/iam/infrastructure/prisma-refresh-token.repository.ts` | 163 |
| `modules/iam/infrastructure/prisma-user.repository.ts` | 89 |
| `modules/iam/interface/api-key-auth.guard.ts` | 67 |
| `modules/iam/interface/api-keys.controller.ts` | 56 |
| `modules/iam/interface/audit.controller.ts` | 31 |
| `modules/iam/interface/audit.interceptor.spec.ts` | 315 |
| `modules/iam/interface/audit.interceptor.ts` | 102 |
| `modules/iam/interface/auth.controller.ts` | 152 |
| `modules/iam/interface/auth.guard.ts` | 84 |
| `modules/iam/interface/branding.controller.ts` | 53 |
| `modules/iam/interface/csrf.spec.ts` | 160 |
| `modules/iam/interface/csrf.ts` | 88 |
| `modules/iam/interface/license.controller.ts` | 57 |
| `modules/iam/interface/roles.decorator.ts` | 9 |
| `modules/iam/interface/roles.guard.ts` | 62 |
| `modules/iam/interface/users.controller.ts` | 114 |

## `modules/iam/application/api-key.service.ts`

49 linhas · caminho: `apps/gateway/src/modules/iam/application/api-key.service.ts`
- importa (interno): `shared-kernel/crypto.ts`, `shared-kernel/ulid.ts`, `modules/iam/domain/api-key.repository.ts`
- importado por: `modules/iam/iam.module.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/api-keys.controller.ts`

**class `ApiKeyService`** L18 · @Injectable
- injeta (construtor): `repo: @Inject(API_KEY_REPOSITORY) ApiKeyRepository`
- `constructor(repo)` · L20
- `create(name, scopes)` · L25 · async
  - chama: `ApiKeyRepository.create` (api-key.repository.ts:23), `sha512` (crypto.ts:154), `newId` (ulid.ts:4)
  - chamado por: `ApiKeysController.create` (api-keys.controller.ts:26)
- `list()` · L33
  - chama: `ApiKeyRepository.list` (api-key.repository.ts:25)
  - chamado por: `ApiKeysController.list` (api-keys.controller.ts:37)
- `revoke(id)` · L37
  - chama: `ApiKeyRepository.revoke` (api-key.repository.ts:26)
  - chamado por: `ApiKeysController.revoke` (api-keys.controller.ts:50)
- `validate(rawKey)` · L42 · async
  - chama: `ApiKeyRepository.findByHash` (api-key.repository.ts:24), `ApiKeyRepository.touch` (api-key.repository.ts:27), `sha512` (crypto.ts:154)
  - chamado por: `ApiKeyAuthGuard.canActivate` (api-key-auth.guard.ts:28)

**Tipos**
- interface `CreatedApiKey` L11 · 4 propriedade(s)

## `modules/iam/application/audit.service.ts`

23 linhas · caminho: `apps/gateway/src/modules/iam/application/audit.service.ts`
- importa (interno): `modules/iam/domain/audit.repository.ts`
- importado por: `modules/iam/iam.module.ts`, `modules/iam/interface/audit.controller.ts`, `modules/iam/interface/audit.interceptor.spec.ts`, `modules/iam/interface/audit.interceptor.ts`

**class `AuditService`** L9 · @Injectable
- injeta (construtor): `repo: @Inject(AUDIT_REPOSITORY) AuditRepository`
- `constructor(repo)` · L11
- `log(entry)` · L15 · async
  - chama: `AuditRepository.create` (audit.repository.ts:15)
  - chamado por: `AuditInterceptor.record` (audit.interceptor.ts:71)
- `list(limit, offset)` · L19
  - chama: `AuditRepository.list` (audit.repository.ts:16)
  - chamado por: `AuditController.list` (audit.controller.ts:15)

## `modules/iam/application/auth-session.service.ts`

160 linhas · caminho: `apps/gateway/src/modules/iam/application/auth-session.service.ts`
- importa (interno): `bootstrap/config.ts`, `shared-kernel/crypto.ts`, `shared-kernel/ulid.ts`, `modules/iam/domain/user.entity.ts`, `modules/iam/domain/refresh-token.repository.ts`, `modules/iam/domain/user.repository.ts`, `modules/iam/application/token.service.ts`
- importado por: `modules/iam/iam.module.ts`, `modules/iam/interface/auth.controller.ts`

**class `AuthSessionService`** L46 · @Injectable
- injeta (construtor): `users: @Inject(USER_REPOSITORY) UserRepository` · `refreshTokens: @Inject(REFRESH_TOKEN_REPOSITORY) RefreshTokenRepository` · `tokens: TokenService` · `config: ConfigService<Env, true>`
- `logger` · L48 · private · campo
- `constructor(users, refreshTokens, tokens, config)` · L49
- `login(username, password, ctx)` · L57 · async
  - chama: `issue` L123, `UserRepository.findByUsername` (user.repository.ts:19), `UserRepository.updatePassword` (user.repository.ts:25), `hashPassword` (crypto.ts:59), `passwordNeedsRehash` (crypto.ts:125), `verifyPassword` (crypto.ts:111), `verifyPasswordDummy` (crypto.ts:142), `newId` (ulid.ts:4)
  - chamado por: `AuthController.signIn` (auth.controller.ts:50)
- `refresh(rawRefresh, ctx)` · L85 · async
  - chama: `toUserDto` L151, `TokenService.hashRefresh` (token.service.ts:33), `TokenService.newRefresh` (token.service.ts:28), `TokenService.signAccess` (token.service.ts:21), `RefreshTokenRepository.rotate` (refresh-token.repository.ts:40), `UserRepository.findById` (user.repository.ts:20), `newId` (ulid.ts:4)
  - chamado por: `AuthController.refresh` (auth.controller.ts:75)
- `logout(rawRefresh)` · L116 · async
  - chama: `TokenService.hashRefresh` (token.service.ts:33), `RefreshTokenRepository.revokeFamilyByToken` (refresh-token.repository.ts:42)
  - chamado por: `AuthController.logout` (auth.controller.ts:96)
- `issue(user, sessionId, ctx)` · L123 · private · async
  - chama: `toUserDto` L151, `TokenService.newRefresh` (token.service.ts:28), `TokenService.signAccess` (token.service.ts:21), `RefreshTokenRepository.create` (refresh-token.repository.ts:39), `newId` (ulid.ts:4)
  - chamado por: `login` L57
- `toUserDto(user)` · L151 · private
  - chamado por: `issue` L123, `refresh` L85

**Tipos**
- interface `AuthUserDto` L22 · 4 propriedade(s)
- interface `IssuedSession` L29 · 3 propriedade(s)
- type `RefreshError` L37
- interface `RequestCtx` L39 · 2 propriedade(s)

## `modules/iam/application/branding.service.ts`

23 linhas · caminho: `apps/gateway/src/modules/iam/application/branding.service.ts`
- importa (interno): `modules/iam/domain/branding.ts`, `modules/iam/domain/branding.repository.ts`
- importado por: `modules/iam/iam.module.ts`, `modules/iam/interface/branding.controller.ts`

**class `BrandingService`** L8 · @Injectable
- injeta (construtor): `repo: @Inject(BRANDING_REPOSITORY) BrandingRepository`
- `constructor(repo)` · L10
- `get()` · L14 · async
  - chama: `BrandingRepository.get` (branding.repository.ts:5)
  - chamado por: `BrandingController.get` (branding.controller.ts:29)
- `set(branding)` · L18 · async
  - chama: `BrandingRepository.set` (branding.repository.ts:6)
  - chamado por: `BrandingController.update` (branding.controller.ts:35)

## `modules/iam/application/license.service.spec.ts`

238 linhas · caminho: `apps/gateway/src/modules/iam/application/license.service.spec.ts`
- importa (interno): `bootstrap/config.ts`, `modules/iam/domain/license.ts`, `modules/iam/application/license.service.ts`

- describe “LicenseService — licença assinada e efeitos locais” · L63
  - it “carrega os claims assinados do repositório antes do bootstrap do env” · L75
  - it “usa LICENSE_KEY quando não há token persistido, sem gravar o bootstrap” · L92
  - it “instala token com espaços, persiste o token limpo e troca o cache” · L136
  - it “não substitui o cache se a persistência da instalação falhar” · L173
  - it “observa expiração no reload; effective mantém o cache entre recargas” · L185
  - it “falha ao limpar não substitui o cache nem recarrega outra licença” · L226

## `modules/iam/application/license.service.ts`

83 linhas · caminho: `apps/gateway/src/modules/iam/application/license.service.ts`
- importa (interno): `bootstrap/config.ts`, `modules/iam/domain/license.ts`, `modules/iam/domain/license.repository.ts`
- importado por: `modules/iam/application/license.service.spec.ts`, `modules/iam/application/user.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/interface/license.controller.ts`, `modules/sessions/interface/sessions.controller.ts`

**class `LicenseService`** L20 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `repo: @Inject(LICENSE_REPOSITORY) LicenseRepository` · `config: ConfigService<Env, true>`
- `logger` · L22 · private · campo
- `cached` · L23 · private · campo
- `constructor(repo, config)` · L25
- `onModuleInit()` · L30 · async
  - chama: `reload` L40
- `effective()` · L35
  - chamado por: `UserService.create` (user.service.ts:50), `UserService.seats` (user.service.ts:43), `LicenseController.status` (license.controller.ts:40), `SessionsController.create` (sessions.controller.ts:102)
- `reload()` · L40 · async
  - chama: `resolve` L71, `LicenseRepository.get` (license.repository.ts:3)
  - chamado por: `onModuleInit` L30, `remove` L66
- `install(token)` · L55 · async
  - chama: `resolve` L71, `LicenseRepository.set` (license.repository.ts:4)
  - chamado por: `LicenseController.install` (license.controller.ts:45)
- `remove()` · L66 · async
  - chama: `reload` L40, `LicenseRepository.clear` (license.repository.ts:5)
  - chamado por: `LicenseController.remove` (license.controller.ts:52)
- `resolve(token)` · L71 · private
  - chama: `verifyLicense` (license.ts:46)
  - chamado por: `install` L55, `reload` L40

## `modules/iam/application/refresh-token-purge.service.spec.ts`

226 linhas · caminho: `apps/gateway/src/modules/iam/application/refresh-token-purge.service.spec.ts`
- importa (interno): `modules/iam/application/refresh-token-purge.service.ts`

- describe “RefreshTokenPurgeService — P-005” · L28
  - it “não agenda timers nos testes; sweep explícito continua disponível” · L46
  - it “agenda a primeira varredura após 2 min e as seguintes a cada 6 h” · L58
  - it “usa carência padrão de 7 dias e lote de 500” · L90
  - it “usa carência configurada e mantém o mesmo cutoff durante todos os lotes” · L100
  - it “limita cada varredura a 20 lotes completos (10 mil linhas)” · L127
  - it “encerra no lote parcial e registra somente o total removido” · L138
  - it “encerra no lote vazio sem registrar remoções” · L149
  - it “chamadas simultâneas compartilham uma execução e liberam a próxima varredura” · L157
  - it “destroy cancela timers pendentes e impede varreduras posteriores” · L173
  - it “destroy aguarda o lote em curso e impede o próximo, mesmo com lote completo” · L186
  - it “registra erro sem rejeitar a execução e recupera na próxima varredura” · L208

## `modules/iam/application/refresh-token-purge.service.ts`

86 linhas · caminho: `apps/gateway/src/modules/iam/application/refresh-token-purge.service.ts`
- importa (interno): `modules/iam/domain/refresh-token.repository.ts`
- importado por: `modules/iam/application/refresh-token-purge.service.spec.ts`, `modules/iam/iam.module.ts`

**class `RefreshTokenPurgeService`** L19 · @Injectable · `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `tokens: @Inject(REFRESH_TOKEN_REPOSITORY) RefreshTokenRepository`
- `logger` · L23 · private · campo
- `stopped` · L27 · private · campo
- `constructor(tokens)` · L29
- `onApplicationBootstrap()` · L34
  - chama: `sweep` L51
  - env: `NODE_ENV`, `RETENTION_SWEEP_HOURS`
- `sweep()` · L51
  - chama: `runSweep` L67
  - chamado por: `onApplicationBootstrap` L34
- `onModuleDestroy()` · L60 · async
- `runSweep()` · L67 · private · async
  - chama: `RefreshTokenRepository.purgeExpired` (refresh-token.repository.ts:48)
  - chamado por: `sweep` L51
  - env: `RETENTION_REFRESH_TOKENS_GRACE_DAYS`

## `modules/iam/application/token.service.ts`

37 linhas · caminho: `apps/gateway/src/modules/iam/application/token.service.ts`
- importa (interno): `bootstrap/config.ts`, `shared-kernel/crypto.ts`, `modules/iam/interface/auth.guard.ts`
- importado por: `modules/iam/application/auth-session.service.ts`, `modules/iam/iam.module.ts`

**class `TokenService`** L14 · @Injectable
- injeta (construtor): `jwt: JwtService` · `config: ConfigService<Env, true>`
- `constructor(jwt, config)` · L16
- `signAccess(payload)` · L21
  - chamado por: `AuthSessionService.issue` (auth-session.service.ts:123), `AuthSessionService.refresh` (auth-session.service.ts:85)
- `newRefresh()` · L28
  - chama: `sha512` (crypto.ts:154)
  - chamado por: `AuthSessionService.issue` (auth-session.service.ts:123), `AuthSessionService.refresh` (auth-session.service.ts:85)
- `hashRefresh(raw)` · L33
  - chama: `sha512` (crypto.ts:154)
  - chamado por: `AuthSessionService.logout` (auth-session.service.ts:116), `AuthSessionService.refresh` (auth-session.service.ts:85)

## `modules/iam/application/user.service.spec.ts`

63 linhas · caminho: `apps/gateway/src/modules/iam/application/user.service.spec.ts`
- importa (interno): `modules/iam/domain/user.repository.ts`, `modules/iam/application/user.service.ts`

- describe “UserService — limite de assentos da licença” · L29
  - it “cria usuário abaixo do limite efetivo” · L30
  - it “seats expõe ocupação e limite efetivo da licença” · L58

## `modules/iam/application/user.service.ts`

112 linhas · caminho: `apps/gateway/src/modules/iam/application/user.service.ts`
- importa (interno): `shared-kernel/crypto.ts`, `shared-kernel/ulid.ts`, `modules/iam/domain/refresh-token.repository.ts`, `modules/iam/domain/role.ts`, `modules/iam/domain/user.entity.ts`, `modules/iam/domain/user.repository.ts`, `modules/iam/application/license.service.ts`
- importado por: `modules/iam/application/user.service.spec.ts`, `modules/iam/iam.module.ts`, `modules/iam/interface/users.controller.ts`

**class `UserService`** L30 · @Injectable
- injeta (construtor): `users: @Inject(USER_REPOSITORY) UserRepository` · `refreshTokens: @Inject(REFRESH_TOKEN_REPOSITORY) RefreshTokenRepository` · `license: LicenseService`
- `constructor(users, refreshTokens, license)` · L32
- `list()` · L39
  - chama: `UserRepository.list` (user.repository.ts:23)
  - chamado por: `UsersController.list` (users.controller.ts:79)
- `seats()` · L43 · async
  - chama: `LicenseService.effective` (license.service.ts:35), `UserRepository.count` (user.repository.ts:22)
  - chamado por: `UsersController.list` (users.controller.ts:79)
- `create(data)` · L50 · async
  - chama: `LicenseService.effective` (license.service.ts:35), `UserRepository.count` (user.repository.ts:22), `UserRepository.create` (user.repository.ts:21), `UserRepository.findByUsername` (user.repository.ts:19), `hashPassword` (crypto.ts:59), `newId` (ulid.ts:4)
  - chamado por: `UsersController.create` (users.controller.ts:92)
- `update(id, patch)` · L69 · async
  - chama: `require` L106, `RefreshTokenRepository.revokeAllForUser` (refresh-token.repository.ts:45), `UserRepository.countByRole` (user.repository.ts:27), `UserRepository.update` (user.repository.ts:24)
  - chamado por: `UsersController.update` (users.controller.ts:97)
- `resetPassword(id, password)` · L89 · async
  - chama: `require` L106, `RefreshTokenRepository.revokeAllForUser` (refresh-token.repository.ts:45), `UserRepository.updatePassword` (user.repository.ts:25), `hashPassword` (crypto.ts:59)
  - chamado por: `UsersController.resetPassword` (users.controller.ts:102)
- `remove(id)` · L97 · async
  - chama: `require` L106, `RefreshTokenRepository.revokeAllForUser` (refresh-token.repository.ts:45), `UserRepository.countByRole` (user.repository.ts:27), `UserRepository.delete` (user.repository.ts:26)
  - chamado por: `UsersController.remove` (users.controller.ts:108)
- `require(id)` · L106 · private · async
  - chama: `UserRepository.findById` (user.repository.ts:20)
  - chamado por: `remove` L97, `resetPassword` L89, `update` L69

**Tipos**
- interface `CreateUserData` L23 · 4 propriedade(s)

## `modules/iam/domain/api-key.repository.ts`

31 linhas · caminho: `apps/gateway/src/modules/iam/domain/api-key.repository.ts`
- importado por: `modules/iam/application/api-key.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/prisma-api-key.repository.ts`

**Funções e constantes de topo**
- `API_KEY_REPOSITORY` = `Symbol('API_KEY_REPOSITORY')` · L30

**Tipos**
- interface `ApiKeyRecord` L4 · 7 propriedade(s)
- interface `CreateApiKeyInput` L14 · 5 propriedade(s)
- interface `ApiKeyRepository` L22
  - `ApiKeyRepository.create(input)` · L23
    - implementado por: `PrismaApiKeyRepository.create` (prisma-api-key.repository.ts:24)
    - chamado por: `ApiKeyService.create` (api-key.service.ts:25)
  - `ApiKeyRepository.findByHash(hash)` · L24
    - implementado por: `PrismaApiKeyRepository.findByHash` (prisma-api-key.repository.ts:36)
    - chamado por: `ApiKeyService.validate` (api-key.service.ts:42)
  - `ApiKeyRepository.list()` · L25
    - implementado por: `PrismaApiKeyRepository.list` (prisma-api-key.repository.ts:41)
    - chamado por: `ApiKeyService.list` (api-key.service.ts:33)
  - `ApiKeyRepository.revoke(id)` · L26
    - implementado por: `PrismaApiKeyRepository.revoke` (prisma-api-key.repository.ts:48)
    - chamado por: `ApiKeyService.revoke` (api-key.service.ts:37)
  - `ApiKeyRepository.touch(id)` · L27
    - implementado por: `PrismaApiKeyRepository.touch` (prisma-api-key.repository.ts:55)
    - chamado por: `ApiKeyService.validate` (api-key.service.ts:42)

## `modules/iam/domain/audit.repository.ts`

20 linhas · caminho: `apps/gateway/src/modules/iam/domain/audit.repository.ts`
- importado por: `modules/iam/application/audit.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/prisma-audit.repository.ts`, `modules/iam/interface/audit.interceptor.spec.ts`

**Funções e constantes de topo**
- `AUDIT_REPOSITORY` = `Symbol('AUDIT_REPOSITORY')` · L19

**Tipos**
- interface `AuditEntry` L1 · 5 propriedade(s)
- interface `AuditLogRecord` L9 · 2 propriedade(s)
- interface `AuditRepository` L14
  - `AuditRepository.create(entry)` · L15
    - implementado por: `PrismaAuditRepository.create` (prisma-audit.repository.ts:14)
    - chamado por: `AuditService.log` (audit.service.ts:15)
  - `AuditRepository.list(limit, offset)` · L16
    - implementado por: `PrismaAuditRepository.list` (prisma-audit.repository.ts:27)
    - chamado por: `AuditService.list` (audit.service.ts:19)

## `modules/iam/domain/branding.repository.ts`

10 linhas · caminho: `apps/gateway/src/modules/iam/domain/branding.repository.ts`
- importa (interno): `modules/iam/domain/branding.ts`
- importado por: `modules/iam/application/branding.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/prisma-branding.repository.ts`

**Funções e constantes de topo**
- `BRANDING_REPOSITORY` = `Symbol('BRANDING_REPOSITORY')` · L9

**Tipos**
- interface `BrandingRepository` L4
  - `BrandingRepository.get()` · L5
    - implementado por: `PrismaBrandingRepository.get` (prisma-branding.repository.ts:12)
    - chamado por: `BrandingService.get` (branding.service.ts:14)
  - `BrandingRepository.set(branding)` · L6
    - implementado por: `PrismaBrandingRepository.set` (prisma-branding.repository.ts:23)
    - chamado por: `BrandingService.set` (branding.service.ts:18)

## `modules/iam/domain/branding.ts`

15 linhas · caminho: `apps/gateway/src/modules/iam/domain/branding.ts`
- importado por: `modules/iam/application/branding.service.ts`, `modules/iam/domain/branding.repository.ts`, `modules/iam/infrastructure/prisma-branding.repository.ts`

**Funções e constantes de topo**
- `DEFAULT_BRANDING` = `{ productName: 'WhatsApp Gateway', logoUrl: null, primaryColor: '#10b…` · L9

**Tipos**
- interface `BrandingSettings` L2 · 4 propriedade(s)

## `modules/iam/domain/license-key.ts`

8 linhas · caminho: `apps/gateway/src/modules/iam/domain/license-key.ts`
- importado por: `modules/iam/domain/license.ts`

**Funções e constantes de topo**
- `LICENSE_PUBLIC_KEY_PEM` = ``-----BEGIN PUBLIC KEY----- MCowBQYDK2VwAyEAfz36GVnIB+xo5b9bUojfLjV0d…` · L4

## `modules/iam/domain/license.repository.ts`

9 linhas · caminho: `apps/gateway/src/modules/iam/domain/license.repository.ts`
- importado por: `modules/iam/application/license.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/prisma-license.repository.ts`

**Funções e constantes de topo**
- `LICENSE_REPOSITORY` = `Symbol('LICENSE_REPOSITORY')` · L8

**Tipos**
- interface `LicenseRepository` L2
  - `LicenseRepository.get()` · L3
    - implementado por: `PrismaLicenseRepository.get` (prisma-license.repository.ts:11)
    - chamado por: `LicenseService.reload` (license.service.ts:40)
  - `LicenseRepository.set(token)` · L4
    - implementado por: `PrismaLicenseRepository.set` (prisma-license.repository.ts:16)
    - chamado por: `LicenseService.install` (license.service.ts:55)
  - `LicenseRepository.clear()` · L5
    - implementado por: `PrismaLicenseRepository.clear` (prisma-license.repository.ts:24)
    - chamado por: `LicenseService.remove` (license.service.ts:66)

## `modules/iam/domain/license.spec.ts`

180 linhas · caminho: `apps/gateway/src/modules/iam/domain/license.spec.ts`
- importa (interno): `modules/iam/domain/license.ts`

- describe “verifyLicense — Ed25519/P-022” · L63
  - it “confere a assinatura real do emissor e preserva todos os claims/limites” · L64
  - it “aceita espaços externos ao token emitido” · L73
  - it “mantém os limites mínimos do modo comunidade” · L81
  - it “rejeita assinatura com um byte adulterado” · L117
  - it “rejeita assinatura Ed25519 válida produzida por outra chave” · L126
  - it “confere os bytes base64url, sem aceitar assinatura sobre JSON decodificado” · L133
  - it “JSON inválido com assinatura correta cai no fallback sem lançar” · L149
  - it “expira um milissegundo após exp e retira todos os claims pagos” · L167
  - it “exp null permanece perpétua mesmo após a expiração do outro vetor” · L171

## `modules/iam/domain/license.ts`

76 linhas · caminho: `apps/gateway/src/modules/iam/domain/license.ts`
- importa (interno): `modules/iam/domain/license-key.ts`
- importado por: `modules/iam/application/license.service.spec.ts`, `modules/iam/application/license.service.ts`, `modules/iam/domain/license.spec.ts`, `modules/iam/interface/license.controller.ts`

**Funções e constantes de topo**
- `LICENSE_PREFIX` = `'CZL1'` · L5
- `COMMUNITY_LICENSE` = `{ licenseId: 'community', customer: 'Community', maxSeats: 1, maxSess…` · L25
- `publicKey` = `createPublicKey(LICENSE_PUBLIC_KEY_PEM)` · L38
- `community(reason)` · L40
  - chamado por: `verifyLicense` L46
- `verifyLicense(token, nowMs)` · L46
  - chama: `community` L40
  - chamado por: `LicenseService.resolve` (license.service.ts:71)

**Tipos**
- interface `LicenseClaims` L7 · 7 propriedade(s)
- interface `EffectiveLicense` L18 · 3 propriedade(s)

## `modules/iam/domain/refresh-token.repository.ts`

52 linhas · caminho: `apps/gateway/src/modules/iam/domain/refresh-token.repository.ts`
- importado por: `modules/iam/application/auth-session.service.ts`, `modules/iam/application/refresh-token-purge.service.ts`, `modules/iam/application/user.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/prisma-refresh-token.repository.ts`, `gateway/test/refresh-token-purge.e2e-spec.ts`

**Funções e constantes de topo**
- `REFRESH_TOKEN_REPOSITORY` = `Symbol('REFRESH_TOKEN_REPOSITORY')` · L51

**Tipos**
- interface `CreateRefreshTokenInput` L4 · 7 propriedade(s)
- interface `RotateInput` L14 · 6 propriedade(s)
- type `RotateResult` L31
- interface `RefreshTokenRepository` L38
  - `RefreshTokenRepository.create(input)` · L39
    - implementado por: `PrismaRefreshTokenRepository.create` (prisma-refresh-token.repository.ts:14)
    - chamado por: `AuthSessionService.issue` (auth-session.service.ts:123)
  - `RefreshTokenRepository.rotate(input)` · L40
    - implementado por: `PrismaRefreshTokenRepository.rotate` (prisma-refresh-token.repository.ts:35)
    - chamado por: `AuthSessionService.refresh` (auth-session.service.ts:85)
  - `RefreshTokenRepository.revokeFamilyByToken(tokenHash)` · L42
    - implementado por: `PrismaRefreshTokenRepository.revokeFamilyByToken` (prisma-refresh-token.repository.ts:77)
    - chamado por: `AuthSessionService.logout` (auth-session.service.ts:116)
  - `RefreshTokenRepository.revokeAllForUser(userId)` · L45
    - implementado por: `PrismaRefreshTokenRepository.revokeAllForUser` (prisma-refresh-token.repository.ts:91)
    - chamado por: `UserService.remove` (user.service.ts:97), `UserService.resetPassword` (user.service.ts:89), `UserService.update` (user.service.ts:69)
  - `RefreshTokenRepository.purgeExpired(cutoff, batchSize)` · L48
    - implementado por: `PrismaRefreshTokenRepository.purgeExpired` (prisma-refresh-token.repository.ts:102)
    - chamado por: `RefreshTokenPurgeService.runSweep` (refresh-token-purge.service.ts:67)

## `modules/iam/domain/role.ts`

18 linhas · caminho: `apps/gateway/src/modules/iam/domain/role.ts`
- importado por: `modules/iam/application/user.service.ts`, `modules/iam/domain/user.entity.ts`, `modules/iam/domain/user.repository.ts`, `modules/iam/infrastructure/prisma-user.repository.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/iam/interface/users.controller.ts`

**Funções e constantes de topo**
- `ROLES` = `['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as const` · L2
- `ROLE_RANK` = `{ VIEWER: 1, OPERATOR: 2, ADMIN: 3, OWNER: 4, }` · L7
- `roleMeets(role, min)` · L15
  - chamado por: `RolesGuard.canActivate` (roles.guard.ts:29)

**Tipos**
- type `Role` L3

## `modules/iam/domain/user.entity.ts`

14 linhas · caminho: `apps/gateway/src/modules/iam/domain/user.entity.ts`
- importa (interno): `modules/iam/domain/role.ts`
- importado por: `modules/iam/application/auth-session.service.ts`, `modules/iam/application/user.service.ts`, `modules/iam/domain/user.repository.ts`, `modules/iam/infrastructure/prisma-user.repository.ts`, `modules/iam/interface/users.controller.ts`

**class `User`** L4
- injeta (construtor): `id: string` · `username: string` · `name: string` · `passwordHash: string` · `role: Role` · `createdAt: Date`
- `constructor(id, username, name, passwordHash, role, createdAt)` · L5
  - chamado por: `PrismaUserRepository.toDomain` (prisma-user.repository.ts:78)

## `modules/iam/domain/user.repository.ts`

31 linhas · caminho: `apps/gateway/src/modules/iam/domain/user.repository.ts`
- importa (interno): `modules/iam/domain/role.ts`, `modules/iam/domain/user.entity.ts`
- importado por: `modules/iam/application/auth-session.service.ts`, `modules/iam/application/user.service.spec.ts`, `modules/iam/application/user.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `modules/iam/infrastructure/prisma-user.repository.ts`

**Funções e constantes de topo**
- `USER_REPOSITORY` = `Symbol('USER_REPOSITORY')` · L30

**Tipos**
- interface `CreateUserInput` L4 · 5 propriedade(s)
- interface `UpdateUserInput` L12 · 2 propriedade(s)
- interface `UserRepository` L18
  - `UserRepository.findByUsername(username)` · L19
    - implementado por: `PrismaUserRepository.findByUsername` (prisma-user.repository.ts:24)
    - chamado por: `AuthSessionService.login` (auth-session.service.ts:57), `UserService.create` (user.service.ts:50)
  - `UserRepository.findById(id)` · L20
    - implementado por: `PrismaUserRepository.findById` (prisma-user.repository.ts:29)
    - chamado por: `AuthSessionService.refresh` (auth-session.service.ts:85), `UserService.require` (user.service.ts:106)
  - `UserRepository.create(input)` · L21
    - implementado por: `PrismaUserRepository.create` (prisma-user.repository.ts:34)
    - chamado por: `UserService.create` (user.service.ts:50), `AdminSeeder.onApplicationBootstrap` (admin-seeder.ts:26)
  - `UserRepository.count()` · L22
    - implementado por: `PrismaUserRepository.count` (prisma-user.repository.ts:47)
    - chamado por: `UserService.create` (user.service.ts:50), `UserService.seats` (user.service.ts:43), `AdminSeeder.onApplicationBootstrap` (admin-seeder.ts:26)
  - `UserRepository.list()` · L23
    - implementado por: `PrismaUserRepository.list` (prisma-user.repository.ts:51)
    - chamado por: `UserService.list` (user.service.ts:39)
  - `UserRepository.update(id, patch)` · L24
    - implementado por: `PrismaUserRepository.update` (prisma-user.repository.ts:58)
    - chamado por: `UserService.update` (user.service.ts:69)
  - `UserRepository.updatePassword(id, passwordHash)` · L25
    - implementado por: `PrismaUserRepository.updatePassword` (prisma-user.repository.ts:66)
    - chamado por: `AuthSessionService.login` (auth-session.service.ts:57), `UserService.resetPassword` (user.service.ts:89)
  - `UserRepository.delete(id)` · L26
    - implementado por: `PrismaUserRepository.delete` (prisma-user.repository.ts:70)
    - chamado por: `UserService.remove` (user.service.ts:97)
  - `UserRepository.countByRole(role)` · L27
    - implementado por: `PrismaUserRepository.countByRole` (prisma-user.repository.ts:74)
    - chamado por: `UserService.remove` (user.service.ts:97), `UserService.update` (user.service.ts:69)

## `modules/iam/iam.module.ts`

93 linhas · caminho: `apps/gateway/src/modules/iam/iam.module.ts`
- importa (interno): `bootstrap/config.ts`, `modules/iam/application/api-key.service.ts`, `modules/iam/application/audit.service.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/application/branding.service.ts`, `modules/iam/application/license.service.ts`, `modules/iam/application/refresh-token-purge.service.ts`, `modules/iam/application/token.service.ts`, `modules/iam/application/user.service.ts`, `modules/iam/domain/api-key.repository.ts`, `modules/iam/domain/audit.repository.ts`, `modules/iam/domain/branding.repository.ts`, `modules/iam/domain/license.repository.ts`, `modules/iam/domain/refresh-token.repository.ts`, `modules/iam/domain/user.repository.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `modules/iam/infrastructure/prisma-api-key.repository.ts`, `modules/iam/infrastructure/prisma-audit.repository.ts`, `modules/iam/infrastructure/prisma-branding.repository.ts`, `modules/iam/infrastructure/prisma-license.repository.ts`, `modules/iam/infrastructure/prisma-refresh-token.repository.ts`, `modules/iam/infrastructure/prisma-user.repository.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/api-keys.controller.ts`, `modules/iam/interface/auth.controller.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/audit.controller.ts`, `modules/iam/interface/audit.interceptor.ts`, `modules/iam/interface/branding.controller.ts`, `modules/iam/interface/license.controller.ts`, `modules/iam/interface/roles.guard.ts`, `modules/iam/interface/users.controller.ts`
- importado por: `app.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/channels/channels.module.ts`, `modules/contacts/contacts.module.ts`, `modules/events/events.module.ts`, `modules/groups/groups.module.ts`, `modules/guardrail/guardrail.module.ts`, `modules/messaging/messaging.module.ts`, `modules/observability/observability.module.ts`, `modules/proxies/proxies.module.ts`, `modules/sessions/sessions.module.ts`, `modules/webhooks/webhooks.module.ts`

**@Module `IamModule`** L38
- imports: `[ JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService<Env, true>) => ({ secret: config.get('JWT_SECRET', { infer: true }), signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }), // número (segundos) }, }), }), ]`
- controllers: `[ AuthController, ApiKeysController, UsersController, LicenseController, BrandingController, AuditController, ]`
- providers: `[ AuthSessionService, RefreshTokenPurgeService, TokenService, UserService, LicenseService, BrandingService, AuditService, JwtAuthGuard, ApiKeyAuthGuard, RolesGuard, ApiKeyService, AdminSeeder, { provide: USER_REPOSITORY, useClass: PrismaUserRepository }, { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository, }, { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository …`
- exports: `[ JwtModule, JwtAuthGuard, ApiKeyAuthGuard, RolesGuard, ApiKeyService, LicenseService, ]`

**class `IamModule`** L38 · @Module({ imports: [ JwtModule.registerAsync({ inject: [ConfigServi…)

## `modules/iam/infrastructure/admin-seeder.ts`

43 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/admin-seeder.ts`
- importa (interno): `shared-kernel/crypto.ts`, `shared-kernel/ulid.ts`, `bootstrap/config.ts`, `modules/iam/domain/user.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `AdminSeeder`** L17 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `users: @Inject(USER_REPOSITORY) UserRepository` · `config: ConfigService<Env, true>`
- `logger` · L19 · private · campo
- `constructor(users, config)` · L21
- `onApplicationBootstrap()` · L26 · async
  - chama: `UserRepository.count` (user.repository.ts:22), `UserRepository.create` (user.repository.ts:21), `hashPassword` (crypto.ts:59), `newId` (ulid.ts:4)

## `modules/iam/infrastructure/prisma-api-key.repository.ts`

77 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-api-key.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/iam/domain/api-key.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `PrismaApiKeyRepository`** L19 · @Injectable · `implements ApiKeyRepository`
- injeta (construtor): `prisma: PrismaService`
- `logger` · L21 · private · campo
- `constructor(prisma)` · L22
- `create(input)` · L24 · async
  - implementa: `ApiKeyRepository.create` (api-key.repository.ts:23)
  - banco: `waApiKey.create`
- `findByHash(hash)` · L36 · async
  - implementa: `ApiKeyRepository.findByHash` (api-key.repository.ts:24)
  - chama: `toDomain` L65
  - banco: `waApiKey.findUnique`
- `list()` · L41 · async
  - implementa: `ApiKeyRepository.list` (api-key.repository.ts:25)
  - chama: `toDomain` L65
  - banco: `waApiKey.findMany`
- `revoke(id)` · L48 · async
  - implementa: `ApiKeyRepository.revoke` (api-key.repository.ts:26)
  - banco: `waApiKey.update`
- `touch(id)` · L55 · async
  - implementa: `ApiKeyRepository.touch` (api-key.repository.ts:27)
  - banco: `waApiKey.update`
- `toDomain(row)` · L65 · private
  - chamado por: `findByHash` L36, `list` L41

**Tipos**
- interface `ApiKeyRow` L9 · 7 propriedade(s)

## `modules/iam/infrastructure/prisma-audit.repository.ts`

44 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-audit.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`, `modules/iam/domain/audit.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `PrismaAuditRepository`** L10 · @Injectable · `implements AuditRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L12
- `create(e)` · L14 · async
  - implementa: `AuditRepository.create` (audit.repository.ts:15)
  - chama: `newId` (ulid.ts:4)
  - banco: `waAuditLog.create`
- `list(limit, offset)` · L27 · async
  - implementa: `AuditRepository.list` (audit.repository.ts:16)
  - banco: `waAuditLog.findMany`

## `modules/iam/infrastructure/prisma-branding.repository.ts`

42 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-branding.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/iam/domain/branding.ts`, `modules/iam/domain/branding.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `PrismaBrandingRepository`** L8 · @Injectable · `implements BrandingRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L10
- `get()` · L12 · async
  - implementa: `BrandingRepository.get` (branding.repository.ts:5)
  - banco: `waBranding.findUnique`
- `set(b)` · L23 · async
  - implementa: `BrandingRepository.set` (branding.repository.ts:6)
  - banco: `waBranding.upsert`

## `modules/iam/infrastructure/prisma-license.repository.ts`

28 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-license.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/iam/domain/license.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `PrismaLicenseRepository`** L7 · @Injectable · `implements LicenseRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L9
- `get()` · L11 · async
  - implementa: `LicenseRepository.get` (license.repository.ts:3)
  - banco: `waLicense.findUnique`
- `set(token)` · L16 · async
  - implementa: `LicenseRepository.set` (license.repository.ts:4)
  - banco: `waLicense.upsert`
- `clear()` · L24 · async
  - implementa: `LicenseRepository.clear` (license.repository.ts:5)
  - banco: `waLicense.deleteMany`

## `modules/iam/infrastructure/prisma-refresh-token.repository.ts`

163 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-refresh-token.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/iam/domain/refresh-token.repository.ts`
- importado por: `modules/iam/iam.module.ts`, `gateway/test/refresh-token-purge.e2e-spec.ts`

**class `PrismaRefreshTokenRepository`** L10 · @Injectable · `implements RefreshTokenRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L12
- `create(input)` · L14 · async
  - implementa: `RefreshTokenRepository.create` (refresh-token.repository.ts:39)
  - chama: `lockUser` L155
  - banco: `refreshToken.create`
- `rotate(input)` · L35 · async
  - implementa: `RefreshTokenRepository.rotate` (refresh-token.repository.ts:40)
  - chama: `lockUser` L155
  - banco: `refreshToken.create`, `refreshToken.findUnique`, `refreshToken.updateMany`
- `revokeFamilyByToken(tokenHash)` · L77 · async
  - implementa: `RefreshTokenRepository.revokeFamilyByToken` (refresh-token.repository.ts:42)
  - chama: `lockUser` L155
  - banco: `refreshToken.findUnique`, `refreshToken.updateMany`
- `revokeAllForUser(userId)` · L91 · async
  - implementa: `RefreshTokenRepository.revokeAllForUser` (refresh-token.repository.ts:45)
  - chama: `lockUser` L155
  - banco: `refreshToken.updateMany`
- `purgeExpired(cutoff, batchSize)` · L102 · async
  - implementa: `RefreshTokenRepository.purgeExpired` (refresh-token.repository.ts:48)
- `lockUser(tx, userId)` · L155 · private · async
  - chamado por: `create` L14, `revokeAllForUser` L91, `revokeFamilyByToken` L77, `rotate` L35

## `modules/iam/infrastructure/prisma-user.repository.ts`

89 linhas · caminho: `apps/gateway/src/modules/iam/infrastructure/prisma-user.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/iam/domain/role.ts`, `modules/iam/domain/user.entity.ts`, `modules/iam/domain/user.repository.ts`
- importado por: `modules/iam/iam.module.ts`

**class `PrismaUserRepository`** L20 · @Injectable · `implements UserRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L22
- `findByUsername(username)` · L24 · async
  - implementa: `UserRepository.findByUsername` (user.repository.ts:19)
  - chama: `toDomain` L78
  - banco: `user.findUnique`
- `findById(id)` · L29 · async
  - implementa: `UserRepository.findById` (user.repository.ts:20)
  - chama: `toDomain` L78
  - banco: `user.findUnique`
- `create(input)` · L34 · async
  - implementa: `UserRepository.create` (user.repository.ts:21)
  - chama: `toDomain` L78
  - banco: `user.create`
- `count()` · L47 · async
  - implementa: `UserRepository.count` (user.repository.ts:22)
  - banco: `user.count`
- `list()` · L51 · async
  - implementa: `UserRepository.list` (user.repository.ts:23)
  - chama: `toDomain` L78
  - banco: `user.findMany`
- `update(id, patch)` · L58 · async
  - implementa: `UserRepository.update` (user.repository.ts:24)
  - chama: `toDomain` L78
  - banco: `user.update`
- `updatePassword(id, passwordHash)` · L66 · async
  - implementa: `UserRepository.updatePassword` (user.repository.ts:25)
  - banco: `user.update`
- `delete(id)` · L70 · async
  - implementa: `UserRepository.delete` (user.repository.ts:26)
  - banco: `user.delete`
- `countByRole(role)` · L74 · async
  - implementa: `UserRepository.countByRole` (user.repository.ts:27)
  - banco: `user.count`
- `toDomain(row)` · L78 · private
  - chama: `User.constructor` (user.entity.ts:5)
  - chamado por: `create` L34, `findById` L29, `findByUsername` L24, `list` L51, `update` L58

**Tipos**
- interface `UserRow` L11 · 6 propriedade(s)

## `modules/iam/interface/api-key-auth.guard.ts`

67 linhas · caminho: `apps/gateway/src/modules/iam/interface/api-key-auth.guard.ts`
- importa (interno): `bootstrap/config.ts`, `modules/iam/application/api-key.service.ts`, `modules/iam/interface/auth.guard.ts`
- importado por: `modules/campaigns/interface/campaigns.controller.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/iam/iam.module.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/observability.controller.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/sessions/interface/session-account-inventory.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/webhooks/interface/webhooks.controller.ts`

**class `ApiKeyAuthGuard`** L20 · @Injectable · `implements CanActivate`
- injeta (construtor): `apiKeys: ApiKeyService` · `jwt: JwtService` · `config: ConfigService<Env, true>`
- `constructor(apiKeys, jwt, config)` · L22
- `canActivate(context)` · L28 · async
  - chama: `ApiKeyService.validate` (api-key.service.ts:42), `assertCookieAuthCsrfSafe` (auth.guard.ts:46), `extractToken` (auth.guard.ts:33)

## `modules/iam/interface/api-keys.controller.ts`

56 linhas · caminho: `apps/gateway/src/modules/iam/interface/api-keys.controller.ts`
- importa (interno): `modules/iam/application/api-key.service.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`
- importado por: `modules/iam/iam.module.ts`

**class `ApiKeysController`** L20 · @UseGuards(JwtAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller('api-keys')
- injeta (construtor): `apiKeys: ApiKeyService`
- `constructor(apiKeys)` · L24
- `create(body)` · L26 · async · @Post
  - chama: `ApiKeyService.create` (api-key.service.ts:25)
- `list()` · L37 · async · @Get
  - chama: `ApiKeyService.list` (api-key.service.ts:33)
- `revoke(id)` · L50 · async · @Delete(':id')
  - chama: `ApiKeyService.revoke` (api-key.service.ts:37)

**Funções e constantes de topo**
- `createSchema` = `z.object({ name: z.string().min(1).max(60) })` · L17

## `modules/iam/interface/audit.controller.ts`

31 linhas · caminho: `apps/gateway/src/modules/iam/interface/audit.controller.ts`
- importa (interno): `shared-kernel/query-int.ts`, `modules/iam/application/audit.service.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`
- importado por: `modules/iam/iam.module.ts`

**class `AuditController`** L9 · @UseGuards(JwtAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller('audit')
- injeta (construtor): `audit: AuditService`
- `constructor(audit)` · L13
- `list(limit, offset)` · L15 · async · @Get
  - chama: `AuditService.list` (audit.service.ts:19), `clampInt` (query-int.ts:4)

## `modules/iam/interface/audit.interceptor.spec.ts`

315 linhas · caminho: `apps/gateway/src/modules/iam/interface/audit.interceptor.spec.ts`
- importa (interno): `bootstrap/fastify-adapter.ts`, `modules/iam/application/audit.service.ts`, `modules/iam/domain/audit.repository.ts`, `modules/iam/interface/audit.interceptor.ts`

- describe “AuditInterceptor pela rota resolvida (P-053)” · L75
  - it “mutação em /api/* é auditada em qualquer grafia do alvo — o path gravado é o alvo cru” · L105
  - it “envio de mensagem (alto volume) continua fora — decidido pelo padrão da rota” · L129
  - it “sessão cujo NOME contém "messages" deixa de escapar da trilha; GET nunca é auditado” · L140
  - it “path gravado tem teto de 512 caracteres (host da forma absoluta é do cliente)” · L148
  - it “forma absoluta com ? ou # antes do caminho: 400 na borda, a mutação não roda” · L158
- describe “AuditInterceptor — ator da trilha (E27 · P-086)” · L212
  - it “sem usuário nem API key, o ator é o auditActor do guard (com teto de 200 caracteres)” · L258
  - it “usuário (JWT) e API key têm precedência sobre o auditActor” · L277
  - it “username no corpo fora da rota de login não forja ator: fica "anônimo"” · L291
  - it “username no corpo da rota /api/auth/login continua "login:<nome>" (inclusive %-encoding e falha 401)” · L301

## `modules/iam/interface/audit.interceptor.ts`

102 linhas · caminho: `apps/gateway/src/modules/iam/interface/audit.interceptor.ts`
- importa (interno): `shared-kernel/process-errors.ts`, `modules/iam/application/audit.service.ts`, `modules/iam/interface/auth.guard.ts`
- importado por: `modules/iam/iam.module.ts`, `modules/iam/interface/audit.interceptor.spec.ts`

**class `AuditInterceptor`** L43 · @Injectable · `implements NestInterceptor`
- injeta (construtor): `audit: AuditService`
- `logger` · L45 · private · campo
- `constructor(audit)` · L47
- `intercept(context, next)` · L49
  - chama: `record` L71, `shouldAudit` L63
- `shouldAudit(req)` · L63 · private
  - chamado por: `intercept` L49
- `record(req, statusCode)` · L71 · private
  - chama: `AuditService.log` (audit.service.ts:15), `recordProcessError` (process-errors.ts:9)
  - chamado por: `intercept` L49

**Funções e constantes de topo**
- `MUTATIONS` = `new Set(['POST', 'PUT', 'PATCH', 'DELETE'])` · L13

**Tipos**
- interface `AuditReq` L18 · 8 propriedade(s)

## `modules/iam/interface/auth.controller.ts`

152 linhas · caminho: `apps/gateway/src/modules/iam/interface/auth.controller.ts`
- importa (interno): `bootstrap/config.ts`, `bootstrap/rate-limit.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/csrf.ts`
- importado por: `bootstrap/rate-limit.spec.ts`, `modules/iam/iam.module.ts`

**class `AuthController`** L42 · @Controller('auth')
- injeta (construtor): `auth: AuthSessionService` · `config: ConfigService<Env, true>`
- `constructor(auth, config)` · L44
- `signIn(body, req, reply)` · L50 · async · @Post('login') · @RouteConfig({ rateLimit: LOGIN_RATE_LIMIT })
  - chama: `AuthSessionService.login` (auth-session.service.ts:57), `ctx` L118, `setAuthCookies` L129
- `refresh(req, reply)` · L75 · async · @Post('refresh')
  - chama: `AuthSessionService.refresh` (auth-session.service.ts:85), `allowedOrigins` L125, `clearAuthCookies` L147, `ctx` L118, `setAuthCookies` L129, `assertCsrfSafe` (csrf.ts:69)
- `logout(req, reply)` · L96 · async · @Post('logout')
  - chama: `AuthSessionService.logout` (auth-session.service.ts:116), `allowedOrigins` L125, `clearAuthCookies` L147, `assertCsrfSafe` (csrf.ts:69)
- `me(req)` · L107 · @UseGuards(JwtAuthGuard) · @Get('me')
- `ctx(req)` · L118 · private
  - chamado por: `refresh` L75, `signIn` L50
- `allowedOrigins()` · L125 · private
  - chama: `parseAllowedOrigins` (csrf.ts:27)
  - chamado por: `logout` L96, `refresh` L75
- `setAuthCookies(reply, session)` · L129 · private
  - chamado por: `refresh` L75, `signIn` L50
  - env: `NODE_ENV`
- `clearAuthCookies(reply)` · L147 · private
  - chamado por: `logout` L96, `refresh` L75

**Funções e constantes de topo**
- `loginSchema` = `z.object({ username: z.string().min(1).max(64), password: z.string().…` · L25

**Tipos**
- type `CookieReq` L38

## `modules/iam/interface/auth.guard.ts`

84 linhas · caminho: `apps/gateway/src/modules/iam/interface/auth.guard.ts`
- importa (interno): `bootstrap/config.ts`, `modules/iam/interface/csrf.ts`
- importado por: `modules/iam/application/token.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/api-keys.controller.ts`, `modules/iam/interface/audit.controller.ts`, `modules/iam/interface/audit.interceptor.ts`, `modules/iam/interface/auth.controller.ts`, `modules/iam/interface/branding.controller.ts`, `modules/iam/interface/license.controller.ts`, `modules/iam/interface/roles.guard.ts`, `modules/iam/interface/users.controller.ts`, `modules/sessions/interface/connect-links.controller.ts`

**class `JwtAuthGuard`** L56 · @Injectable · `implements CanActivate`
- injeta (construtor): `jwt: JwtService` · `config: ConfigService<Env, true>`
- `constructor(jwt, config)` · L58
- `canActivate(context)` · L63 · async
  - chama: `assertCookieAuthCsrfSafe` L46, `extractToken` L33

**Funções e constantes de topo**
- `extractToken(req)` · L33
  - chamado por: `ApiKeyAuthGuard.canActivate` (api-key-auth.guard.ts:28), `bearerOrCookieToken` L40, `canActivate` L63
- `bearerOrCookieToken(req)` · L40
  - chama: `extractToken` L33
- `assertCookieAuthCsrfSafe(req, config)` · L46
  - chama: `assertCsrfSafe` (csrf.ts:69), `parseAllowedOrigins` (csrf.ts:27)
  - chamado por: `ApiKeyAuthGuard.canActivate` (api-key-auth.guard.ts:28), `canActivate` L63

**Tipos**
- interface `JwtPayload` L13 · 3 propriedade(s)
- type `CookieReq` L19
- interface `ExtractedToken` L23 · 2 propriedade(s)

## `modules/iam/interface/branding.controller.ts`

53 linhas · caminho: `apps/gateway/src/modules/iam/interface/branding.controller.ts`
- importa (interno): `modules/iam/application/branding.service.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`
- importado por: `modules/iam/iam.module.ts`

**class `BrandingController`** L24 · @Controller('branding')
- injeta (construtor): `branding: BrandingService`
- `constructor(branding)` · L26
- `get()` · L29 · @Get
  - chama: `BrandingService.get` (branding.service.ts:14)
- `update(body)` · L35 · async · @Put · @UseGuards(JwtAuthGuard, RolesGuard) · @MinRole('OWNER')
  - chama: `BrandingService.set` (branding.service.ts:18), `MinRole` (roles.decorator.ts:8)

**Funções e constantes de topo**
- `updateSchema` = `z.object({ productName: z.string().min(1).max(60), primaryColor: z .s…` · L15

## `modules/iam/interface/csrf.spec.ts`

160 linhas · caminho: `apps/gateway/src/modules/iam/interface/csrf.spec.ts`
- importa (interno): `modules/iam/interface/csrf.ts`

- describe “parseAllowedOrigins” · L9
  - it “normaliza (trim, minúsculas, sem barra final) e ignora vazios” · L10
- describe “csrfVerdict” · L21
  - it “métodos seguros passam sempre, mesmo com Origin estranha” · L22
  - it “Origin na allowlist passa (case-insensitive, barra final tolerada)” · L37
  - it “Origin fora da allowlist (inclusive origem irmã same-site) é rejeitada” · L50
  - it “Origin "null" (sandbox/data:) é rejeitada” · L73
  - it “sem Origin: Sec-Fetch-Site decide — same-origin/none passam, cross-site/same-site não” · L82
  - it “cliente não-browser (sem Origin e sem Sec-Fetch-Site) passa — não existe CSRF sem browser” · L109
  - it “header em array (duplicado) usa o primeiro valor” · L124
- describe “assertCsrfSafe” · L138
  - it “lança 403 com mensagem distinta por motivo” · L139

## `modules/iam/interface/csrf.ts`

88 linhas · caminho: `apps/gateway/src/modules/iam/interface/csrf.ts`
- importado por: `modules/iam/interface/auth.controller.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/csrf.spec.ts`

**Funções e constantes de topo**
- `SAFE_METHODS` = `new Set(['GET', 'HEAD', 'OPTIONS'])` · L19
- `normalizeOrigin(origin)` · L23
  - chamado por: `csrfVerdict` L44, `parseAllowedOrigins` L27
- `parseAllowedOrigins(corsOrigin)` · L27
  - chama: `normalizeOrigin` L23
  - chamado por: `AuthController.allowedOrigins` (auth.controller.ts:125), `assertCookieAuthCsrfSafe` (auth.guard.ts:46)
- `first(v)` · L40
  - chamado por: `csrfVerdict` L44
- `csrfVerdict(input, allowedOrigins)` · L44
  - chama: `first` L40, `normalizeOrigin` L23
  - chamado por: `assertCsrfSafe` L69
- `assertCsrfSafe(req, allowedOrigins)` · L69
  - chama: `csrfVerdict` L44
  - chamado por: `AuthController.logout` (auth.controller.ts:96), `AuthController.refresh` (auth.controller.ts:75), `assertCookieAuthCsrfSafe` (auth.guard.ts:46)

**Tipos**
- type `CsrfVerdict` L21
- interface `CsrfInput` L34 · 3 propriedade(s)
- interface `HeaderCarrier` L63 · 2 propriedade(s)

## `modules/iam/interface/license.controller.ts`

57 linhas · caminho: `apps/gateway/src/modules/iam/interface/license.controller.ts`
- importa (interno): `modules/iam/application/license.service.ts`, `modules/iam/domain/license.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`
- importado por: `modules/iam/iam.module.ts`

**class `LicenseController`** L34 · @UseGuards(JwtAuthGuard, RolesGuard) · @MinRole('OWNER') · @Controller('license')
- injeta (construtor): `license: LicenseService`
- `constructor(license)` · L38
- `status()` · L40 · @Get
  - chama: `LicenseService.effective` (license.service.ts:35), `toDto` L19
- `install(body)` · L45 · async · @Post
  - chama: `LicenseService.install` (license.service.ts:55), `toDto` L19
- `remove()` · L52 · async · @Delete
  - chama: `LicenseService.remove` (license.service.ts:66), `toDto` L19

**Funções e constantes de topo**
- `installSchema` = `z.object({ token: z.string().min(10).max(4000) })` · L17
- `toDto(l)` · L19
  - chamado por: `install` L45, `remove` L52, `status` L40

## `modules/iam/interface/roles.decorator.ts`

9 linhas · caminho: `apps/gateway/src/modules/iam/interface/roles.decorator.ts`
- importa (interno): `modules/iam/domain/role.ts`
- importado por: `modules/guardrail/guardrail.controller.ts`, `modules/iam/interface/api-keys.controller.ts`, `modules/iam/interface/audit.controller.ts`, `modules/iam/interface/branding.controller.ts`, `modules/iam/interface/license.controller.ts`, `modules/iam/interface/roles.guard.ts`, `modules/iam/interface/users.controller.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/webhooks/interface/webhooks.controller.ts`

**Funções e constantes de topo**
- `MIN_ROLE_KEY` = `'minRole'` · L4
- `MinRole(role)` · L8
  - chamado por: `GuardrailController.updateConfig` (guardrail.controller.ts:37), `BrandingController.update` (branding.controller.ts:35), `SessionsController.create` (sessions.controller.ts:102), `SessionsController.remove` (sessions.controller.ts:358)

## `modules/iam/interface/roles.guard.ts`

62 linhas · caminho: `apps/gateway/src/modules/iam/interface/roles.guard.ts`
- importa (interno): `modules/iam/domain/role.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`
- importado por: `modules/campaigns/interface/campaigns.controller.ts`, `modules/channels/interface/channels.controller.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/groups/interface/groups.controller.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/iam/iam.module.ts`, `modules/iam/interface/api-keys.controller.ts`, `modules/iam/interface/audit.controller.ts`, `modules/iam/interface/branding.controller.ts`, `modules/iam/interface/license.controller.ts`, `modules/iam/interface/users.controller.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/observability.controller.ts`, `modules/proxies/interface/proxies.controller.ts`, `modules/sessions/interface/connect-links.controller.ts`, `modules/sessions/interface/session-account-inventory.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/webhooks/interface/webhooks.controller.ts`

**class `RolesGuard`** L25 · @Injectable · `implements CanActivate`
- injeta (construtor): `reflector: Reflector`
- `constructor(reflector)` · L27
- `canActivate(context)` · L29
  - chama: `roleMeets` (role.ts:15)

## `modules/iam/interface/users.controller.ts`

114 linhas · caminho: `apps/gateway/src/modules/iam/interface/users.controller.ts`
- importa (interno): `modules/iam/application/user.service.ts`, `modules/iam/domain/role.ts`, `modules/iam/domain/user.entity.ts`, `modules/iam/interface/auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`
- importado por: `modules/iam/iam.module.ts`

**class `UsersController`** L73 · @UseGuards(JwtAuthGuard, RolesGuard) · @MinRole('OWNER') · @Controller('users')
- injeta (construtor): `users: UserService`
- `constructor(users)` · L77
- `list()` · L79 · async · @Get
  - chama: `UserService.list` (user.service.ts:39), `UserService.seats` (user.service.ts:43)
- `create(body)` · L92 · async · @Post
  - chama: `UserService.create` (user.service.ts:50), `parse` L62, `toDto` L52
- `update(id, body)` · L97 · async · @Patch(':id')
  - chama: `UserService.update` (user.service.ts:69), `parse` L62, `toDto` L52
- `resetPassword(id, body)` · L102 · async · @Post(':id/password')
  - chama: `UserService.resetPassword` (user.service.ts:89), `parse` L62
- `remove(id)` · L108 · async · @Delete(':id')
  - chama: `UserService.remove` (user.service.ts:97)

**Funções e constantes de topo**
- `passwordField()` · L24
  - chamado por: `createSchema` L30, `passwordSchema` L50
- `createSchema` = `z.object({ username: z .string() .min(1) .max(64) .regex(/^[a-zA-Z0-9…` · L30
  - chama: `passwordField` L24
- `updateSchema` = `z .object({ name: z.string().min(1).max(120).optional(), role: z.enum…` · L41
- `passwordSchema` = `z.object({ password: passwordField() })` · L50
  - chama: `passwordField` L24
- `toDto(u)` · L52
  - chamado por: `create` L92, `update` L97
- `parse(schema, body)` · L62
  - chamado por: `create` L92, `resetPassword` L102, `update` L97
