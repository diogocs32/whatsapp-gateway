<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `groups`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/groups/groups.module.ts` | 11 |
| `modules/groups/interface/groups.controller.ts` | 263 |

## `modules/groups/groups.module.ts`

11 linhas · caminho: `apps/gateway/src/modules/groups/groups.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/groups/interface/groups.controller.ts`
- importado por: `app.module.ts`

**@Module `GroupsModule`** L6
- imports: `[IamModule, SessionsModule]`
- controllers: `[GroupsController]`

**class `GroupsModule`** L6 · @Module({ imports: [IamModule, SessionsModule], // JwtAuthGuard + S…)

## `modules/groups/interface/groups.controller.ts`

263 linhas · caminho: `apps/gateway/src/modules/groups/interface/groups.controller.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`
- importado por: `modules/groups/groups.module.ts`

**class `GroupsController`** L47 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/groups')
- injeta (construtor): `manager: SessionManager`
- `constructor(manager)` · L50
- `list(id)` · L52 · @Get
  - chama: `run` L241, `SessionManager.listGroups` (session-manager.service.ts:571)
- `create(id, body)` · L57 · async · @Post
  - chama: `run` L241, `parse` L254, `SessionManager.createGroup` (session-manager.service.ts:577)
- `info(id, groupId)` · L65 · @Get(':groupId')
  - chama: `run` L241, `SessionManager.groupInfo` (session-manager.service.ts:574)
- `leads(id, groupId, all)` · L75 · async · @Get(':groupId/leads')
  - chama: `run` L241, `SessionManager.groupInfo` (session-manager.service.ts:574)
- `participants(id, groupId, body)` · L99 · async · @Post(':groupId/participants')
  - chama: `run` L241, `parse` L254, `SessionManager.updateParticipants` (session-manager.service.ts:584)
- `leave(id, groupId)` · L112 · async · @Post(':groupId/leave')
  - chama: `run` L241, `SessionManager.leaveGroup` (session-manager.service.ts:596)
- `subject(id, groupId, body)` · L121 · async · @Post(':groupId/subject')
  - chama: `run` L241, `parse` L254, `SessionManager.setGroupSubject` (session-manager.service.ts:599)
- `description(id, groupId, body)` · L132 · async · @Post(':groupId/description')
  - chama: `run` L241, `parse` L254, `SessionManager.setGroupDescription` (session-manager.service.ts:606)
- `invite(id, groupId)` · L145 · async · @Get(':groupId/invite')
  - chama: `run` L241, `SessionManager.groupInviteCode` (session-manager.service.ts:613)
- `revoke(id, groupId)` · L156 · async · @Post(':groupId/invite/revoke')
  - chama: `run` L241, `SessionManager.groupRevokeInvite` (session-manager.service.ts:616)
- `membershipRequests(id, groupId)` · L168 · @Get(':groupId/membership-requests')
  - chama: `run` L241, `SessionManager.groupMembershipRequests` (session-manager.service.ts:619)
- `membership(id, groupId, body)` · L177 · async · @Post(':groupId/membership-requests')
  - chama: `run` L241, `parse` L254, `SessionManager.groupMembershipAction` (session-manager.service.ts:625)
- `settings(id, groupId, body)` · L191 · async · @Post(':groupId/settings')
  - chama: `run` L241, `parse` L254, `SessionManager.setGroupSetting` (session-manager.service.ts:637)
- `photo(id, groupId, body)` · L212 · async · @Post(':groupId/photo')
  - chama: `run` L241, `parse` L254, `SessionManager.setGroupPhoto` (session-manager.service.ts:645)
- `run(fn)` · L241 · private · async
  - chamado por: `create` L57, `description` L132, `info` L65, `invite` L145, `leads` L75, `leave` L112, `list` L52, `membership` L177, `membershipRequests` L168, `participants` L99, `photo` L212, `revoke` L156, `settings` L191, `subject` L121

**Funções e constantes de topo**
- `createGroupSchema` = `z.object({ subject: z.string().min(1).max(100), participants: z.array…` · L19
- `participantsSchema` = `z.object({ action: z.enum(['add', 'remove', 'promote', 'demote']), pa…` · L24
- `subjectSchema` = `z.object({ subject: z.string().min(1).max(100) })` · L29
- `descriptionSchema` = `z.object({ description: z.string().max(2000) })` · L30
- `membershipSchema` = `z.object({ action: z.enum(['approve', 'reject']), // ausente/vazio = …` · L32
- `settingsSchema` = `z .object({ announce: z.boolean().optional(), // true = só admins ENV…` · L37
- `photoSchema` = `z.object({ url: z.string().url() })` · L45
- `parse(schema, body)` · L254
  - chamado por: `create` L57, `description` L132, `membership` L177, `participants` L99, `photo` L212, `settings` L191, `subject` L121
