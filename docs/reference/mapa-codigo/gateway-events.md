<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `events`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/events/events.module.ts` | 12 |
| `modules/events/interface/events.controller.ts` | 47 |
| `modules/events/interface/sse-auth.guard.ts` | 33 |

## `modules/events/events.module.ts`

12 linhas · caminho: `apps/gateway/src/modules/events/events.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/events/interface/events.controller.ts`, `modules/events/interface/sse-auth.guard.ts`
- importado por: `app.module.ts`

**@Module `EventsModule`** L6
- imports: `[IamModule]`
- controllers: `[EventsController]`
- providers: `[SseAuthGuard]`

**class `EventsModule`** L6 · @Module({ imports: [IamModule], controllers: [EventsController], pr…)

## `modules/events/interface/events.controller.ts`

47 linhas · caminho: `apps/gateway/src/modules/events/interface/events.controller.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `modules/events/interface/sse-auth.guard.ts`
- importado por: `modules/events/events.module.ts`

**class `EventsController`** L9 · @Controller('events')
- injeta (construtor): `eventBus: EventBus`
- `constructor(eventBus)` · L11
- `stream(req)` · L14 · @UseGuards(SseAuthGuard) · @Sse('stream')
  - chama: `EventBus.subscribe` (event-bus.ts:26), `EventBus.unsubscribe` (event-bus.ts:30)
  - assina evento: `'wa.event'`, `'wa.event.remote'`

## `modules/events/interface/sse-auth.guard.ts`

33 linhas · caminho: `apps/gateway/src/modules/events/interface/sse-auth.guard.ts`
- importado por: `modules/events/events.module.ts`, `modules/events/interface/events.controller.ts`

**class `SseAuthGuard`** L12 · @Injectable · `implements CanActivate`
- injeta (construtor): `jwt: JwtService`
- `constructor(jwt)` · L14
- `canActivate(context)` · L16 · async
