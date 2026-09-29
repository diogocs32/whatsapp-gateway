<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `contacts`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/contacts/application/contact-check-quota.service.spec.ts` | 128 |
| `modules/contacts/application/contact-check-quota.service.ts` | 141 |
| `modules/contacts/contacts.module.ts` | 13 |
| `modules/contacts/interface/contacts.controller.ts` | 191 |

## `modules/contacts/application/contact-check-quota.service.spec.ts`

128 linhas · caminho: `apps/gateway/src/modules/contacts/application/contact-check-quota.service.spec.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis.service.ts`, `modules/contacts/application/contact-check-quota.service.ts`

- describe “ContactCheckQuotaService — observação compatível E20” · L26
  - it “default desligado não depende do Redis nem conta tentativas” · L27
  - it “cobra só números distintos normalizados dentro do lote, sem enviar PII ao Redis” · L40
  - it “snapshot só lê e converte TTL/saldo/excesso sem consumir” · L54
  - it “acima do limite ainda permite a consulta e não lança 429” · L68
  - it “erro de EVAL não interrompe a consulta” · L99
  - it “resposta Redis inválida publica indisponível, nunca números fabricados” · L108
  - it “EVAL pendente tem teto local sem close/retry e sem bloquear a consulta” · L114

## `modules/contacts/application/contact-check-quota.service.ts`

141 linhas · caminho: `apps/gateway/src/modules/contacts/application/contact-check-quota.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis.service.ts`
- importado por: `modules/contacts/application/contact-check-quota.service.spec.ts`, `modules/contacts/contacts.module.ts`, `modules/contacts/interface/contacts.controller.ts`

**class `ContactCheckQuotaService`** L30 · @Injectable
- injeta (construtor): `config: ConfigService<Env, true>` · `redis: RedisService`
- `logger` · L32 · private · campo
- `constructor(config, redis)` · L34
- `settings()` · L39 · private
  - chamado por: `observe` L61, `snapshot` L77
- `observe(sessionId, numbers)` · L61 · async
  - chama: `contactCheckCost` L9, `readOrIncrement` L84, `settings` L39
  - chamado por: `ContactsController.check` (contacts.controller.ts:96)
- `snapshot(sessionId)` · L77 · async
  - chama: `readOrIncrement` L84, `settings` L39
  - chamado por: `ContactsController.checkQuotaSnapshot` (contacts.controller.ts:90)
- `readOrIncrement(sessionId, amount, settings)` · L84 · private · async
  - chamado por: `observe` L61, `snapshot` L77

**Funções e constantes de topo**
- `contactCheckCost(numbers)` · L9
  - chamado por: `observe` L61
- `QUOTA_SCRIPT` = `` local used = tonumber(redis.call('GET', KEYS[1]) or '0') local amou…` · L16

## `modules/contacts/contacts.module.ts`

13 linhas · caminho: `apps/gateway/src/modules/contacts/contacts.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/contacts/application/contact-check-quota.service.ts`
- importado por: `app.module.ts`

**@Module `ContactsModule`** L7
- imports: `[IamModule, SessionsModule]`
- controllers: `[ContactsController]`
- providers: `[ContactCheckQuotaService]`

**class `ContactsModule`** L7 · @Module({ imports: [IamModule, SessionsModule], controllers: [Conta…)

## `modules/contacts/interface/contacts.controller.ts`

191 linhas · caminho: `apps/gateway/src/modules/contacts/interface/contacts.controller.ts`
- importa (interno): `infra/directory/contact-directory.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `shared-kernel/query-int.ts`, `modules/contacts/application/contact-check-quota.service.ts`
- importado por: `modules/contacts/contacts.module.ts`

**class `ContactsController`** L50 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/contacts')
- injeta (construtor): `manager: SessionManager` · `directory: ContactDirectory` · `checkQuota: ContactCheckQuotaService`
- `constructor(manager, directory, checkQuota)` · L53
- `listDirectory(id, search, limit, offset)` · L60 · async · @Get('directory')
  - chama: `ContactDirectory.list` (contact-directory.service.ts:202), `clampInt` (query-int.ts:4)
- `checkQuotaSnapshot(id)` · L90 · @Get('check-quota')
  - chama: `ContactCheckQuotaService.snapshot` (contact-check-quota.service.ts:77)
- `check(id, body)` · L96 · async · @Post('check')
  - chama: `ContactCheckQuotaService.observe` (contact-check-quota.service.ts:61), `SessionManager.checkNumbers` (session-manager.service.ts:1555)
- `profilePicture(id, jid)` · L114 · async · @Get(':jid/profile-picture')
  - chama: `SessionManager.profilePicture` (session-manager.service.ts:1561)
- `block(id, body)` · L129 · async · @Post('block')
  - chama: `SessionManager.setBlock` (session-manager.service.ts:1564)
- `save(id, body)` · L148 · async · @Post('save')
  - chama: `SessionManager.saveContact` (session-manager.service.ts:1571)
- `remove(id, body)` · L172 · async · @Post('remove')
  - chama: `SessionManager.removeContact` (session-manager.service.ts:1578)

**Funções e constantes de topo**
- `checkSchema` = `z.object({ numbers: z.array(z.string().min(5).max(40)).min(1).max(50)…` · L22
- `blockSchema` = `z.object({ jid: z.string().min(5), action: z.enum(['block', 'unblock'…` · L25
- `saveContactSchema` = `z .object({ jid: z.string().min(5).optional(), number: z.string().min…` · L30
- `removeContactSchema` = `z .object({ jid: z.string().min(5).optional(), number: z.string().min…` · L41
