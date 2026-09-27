<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `channels`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/channels/channels.module.ts` | 11 |
| `modules/channels/interface/channels.controller.ts` | 76 |

## `modules/channels/channels.module.ts`

11 linhas · caminho: `apps/gateway/src/modules/channels/channels.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/channels/interface/channels.controller.ts`
- importado por: `app.module.ts`

**@Module `ChannelsModule`** L6
- imports: `[IamModule, SessionsModule]`
- controllers: `[ChannelsController]`

**class `ChannelsModule`** L6 · @Module({ imports: [IamModule, SessionsModule], controllers: [Chann…)

## `modules/channels/interface/channels.controller.ts`

76 linhas · caminho: `apps/gateway/src/modules/channels/interface/channels.controller.ts`
- importa (interno): `modules/sessions/application/engine.port.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/session-ref.pipe.ts`
- importado por: `modules/channels/channels.module.ts`

**class `ChannelsController`** L24 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('sessions/:id/channels')
- injeta (construtor): `manager: SessionManager`
- `constructor(manager)` · L27
- `create(id, body)` · L29 · async · @Post
  - chama: `run` L65, `SessionManager.createChannel` (session-manager.service.ts:822)
- `info(id, jid)` · L42 · @Get(':jid')
  - chama: `run` L65, `SessionManager.channelInfo` (session-manager.service.ts:829)
- `follow(id, jid)` · L47 · async · @Post(':jid/follow')
  - chama: `run` L65, `SessionManager.followChannel` (session-manager.service.ts:832)
- `unfollow(id, jid)` · L56 · async · @Post(':jid/unfollow')
  - chama: `run` L65, `SessionManager.unfollowChannel` (session-manager.service.ts:835)
- `run(fn)` · L65 · private · async
  - chamado por: `create` L29, `follow` L47, `info` L42, `unfollow` L56

**Funções e constantes de topo**
- `createChannelSchema` = `z.object({ name: z.string().min(1).max(100), description: z.string().…` · L18
