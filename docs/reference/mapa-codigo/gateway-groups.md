<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `groups`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/groups/groups.module.ts` | 11 |
| `modules/groups/interface/groups.controller.ts` | 257 |

## `modules/groups/groups.module.ts`

11 linhas · caminho: `apps/gateway/src/modules/groups/groups.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/groups/interface/groups.controller.ts`
- importado por: `app.module.ts`

**@Module `GroupsModule`** L6
- imports: `[IamModule, SessionsModule]`
- controllers: `[GroupsController]`

**class `GroupsModule`** L6 · @Module({ imports: [IamModule, SessionsModule], // JwtAuthGuard + S…)

## `modules/groups/interface/groups.controller.ts`

257 linhas · caminho: `apps/gateway/src/modules/groups/interface/groups.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `modules/sessions/application/engine.port.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`
- importado por: `modules/groups/groups.module.ts`

**class `GroupsController`** L48 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/groups')
- injeta (construtor): `manager: SessionManager`
- `constructor(manager)` · L51
- `list(id)` · L53 · @Get
  - chama: `run` L235, `SessionManager.listGroups` (session-manager.service.ts:571)
- `create(id, body)` · L58 · async · @Post
  - chama: `run` L235, `parse` L248, `SessionManager.createGroup` (session-manager.service.ts:577)
- `info(id, groupId)` · L66 · @Get(':groupId')
  - chama: `run` L235, `SessionManager.groupInfo` (session-manager.service.ts:574)
- `leads(id, groupId, all)` · L76 · async · @Get(':groupId/leads')
  - chama: `run` L235, `SessionManager.groupInfo` (session-manager.service.ts:574)
- `participants(id, groupId, body)` · L100 · async · @Post(':groupId/participants')
  - chama: `run` L235, `parse` L248, `SessionManager.updateParticipants` (session-manager.service.ts:584)
- `leave(id, groupId)` · L113 · async · @Post(':groupId/leave')
  - chama: `run` L235, `SessionManager.leaveGroup` (session-manager.service.ts:596)
- `subject(id, groupId, body)` · L122 · async · @Post(':groupId/subject')
  - chama: `run` L235, `parse` L248, `SessionManager.setGroupSubject` (session-manager.service.ts:599)
- `description(id, groupId, body)` · L133 · async · @Post(':groupId/description')
  - chama: `run` L235, `parse` L248, `SessionManager.setGroupDescription` (session-manager.service.ts:606)
- `invite(id, groupId)` · L146 · async · @Get(':groupId/invite')
  - chama: `run` L235, `SessionManager.groupInviteCode` (session-manager.service.ts:613)
- `revoke(id, groupId)` · L157 · async · @Post(':groupId/invite/revoke')
  - chama: `run` L235, `SessionManager.groupRevokeInvite` (session-manager.service.ts:616)
- `membershipRequests(id, groupId)` · L169 · @Get(':groupId/membership-requests')
  - chama: `run` L235, `SessionManager.groupMembershipRequests` (session-manager.service.ts:619)
- `membership(id, groupId, body)` · L178 · async · @Post(':groupId/membership-requests')
  - chama: `run` L235, `parse` L248, `SessionManager.groupMembershipAction` (session-manager.service.ts:625)
- `settings(id, groupId, body)` · L192 · async · @Post(':groupId/settings')
  - chama: `run` L235, `parse` L248, `SessionManager.setGroupSetting` (session-manager.service.ts:637)
- `photo(id, groupId, body)` · L213 · async · @Post(':groupId/photo')
  - chama: `run` L235, `parse` L248, `SessionManager.setGroupPhoto` (session-manager.service.ts:645), `fetchImageByUrl` (safe-fetch.ts:204)
- `run(fn)` · L235 · private · async
  - chamado por: `create` L58, `description` L133, `info` L66, `invite` L146, `leads` L76, `leave` L113, `list` L53, `membership` L178, `membershipRequests` L169, `participants` L100, `photo` L213, `revoke` L157, `settings` L192, `subject` L122

**Funções e constantes de topo**
- `createGroupSchema` = `z.object({ subject: z.string().min(1).max(100), participants: z.array…` · L20
- `participantsSchema` = `z.object({ action: z.enum(['add', 'remove', 'promote', 'demote']), pa…` · L25
- `subjectSchema` = `z.object({ subject: z.string().min(1).max(100) })` · L30
- `descriptionSchema` = `z.object({ description: z.string().max(2000) })` · L31
- `membershipSchema` = `z.object({ action: z.enum(['approve', 'reject']), // ausente/vazio = …` · L33
- `settingsSchema` = `z .object({ announce: z.boolean().optional(), // true = só admins ENV…` · L38
- `photoSchema` = `z.object({ url: z.string().url() })` · L46
- `parse(schema, body)` · L248
  - chamado por: `create` L58, `description` L133, `membership` L178, `participants` L100, `photo` L213, `settings` L192, `subject` L122
