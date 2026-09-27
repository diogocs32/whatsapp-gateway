<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `contacts`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/contacts/contacts.module.ts` | 11 |
| `modules/contacts/interface/contacts.controller.ts` | 183 |

## `modules/contacts/contacts.module.ts`

11 linhas · caminho: `apps/gateway/src/modules/contacts/contacts.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/contacts/interface/contacts.controller.ts`
- importado por: `app.module.ts`

**@Module `ContactsModule`** L6
- imports: `[IamModule, SessionsModule]`
- controllers: `[ContactsController]`

**class `ContactsModule`** L6 · @Module({ imports: [IamModule, SessionsModule], controllers: [Conta…)

## `modules/contacts/interface/contacts.controller.ts`

183 linhas · caminho: `apps/gateway/src/modules/contacts/interface/contacts.controller.ts`
- importa (interno): `infra/directory/contact-directory.service.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/interface/session-ref.pipe.ts`, `shared-kernel/query-int.ts`
- importado por: `modules/contacts/contacts.module.ts`

**class `ContactsController`** L49 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/contacts')
- injeta (construtor): `manager: SessionManager` · `directory: ContactDirectory`
- `constructor(manager, directory)` · L52
- `listDirectory(id, search, limit, offset)` · L58 · async · @Get('directory')
  - chama: `ContactDirectory.list` (contact-directory.service.ts:202), `clampInt` (query-int.ts:4)
- `check(id, body)` · L89 · async · @Post('check')
  - chama: `SessionManager.checkNumbers` (session-manager.service.ts:990)
- `profilePicture(id, jid)` · L106 · async · @Get(':jid/profile-picture')
  - chama: `SessionManager.profilePicture` (session-manager.service.ts:993)
- `block(id, body)` · L121 · async · @Post('block')
  - chama: `SessionManager.setBlock` (session-manager.service.ts:996)
- `save(id, body)` · L140 · async · @Post('save')
  - chama: `SessionManager.saveContact` (session-manager.service.ts:1003)
- `remove(id, body)` · L164 · async · @Post('remove')
  - chama: `SessionManager.removeContact` (session-manager.service.ts:1010)

**Funções e constantes de topo**
- `checkSchema` = `z.object({ numbers: z.array(z.string().min(5).max(40)).min(1).max(50)…` · L21
- `blockSchema` = `z.object({ jid: z.string().min(5), action: z.enum(['block', 'unblock'…` · L24
- `saveContactSchema` = `z .object({ jid: z.string().min(5).optional(), number: z.string().min…` · L29
- `removeContactSchema` = `z .object({ jid: z.string().min(5).optional(), number: z.string().min…` · L40
