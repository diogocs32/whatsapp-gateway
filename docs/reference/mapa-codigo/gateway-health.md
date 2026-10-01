<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `health`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/health/health-memory.spec.ts` | 189 |
| `modules/health/health.controller.ts` | 19 |
| `modules/health/health.module.ts` | 10 |
| `modules/health/health.service.ts` | 98 |

## `modules/health/health-memory.spec.ts`

189 linhas · caminho: `apps/gateway/src/modules/health/health-memory.spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `modules/health/health.service.ts`

- describe “HealthService — pressão cgroup com memoryStats real” · L65
  - it “mantém saúde pelo working set do container mesmo com heap acima de 90%” · L83
  - it “degrada pelo container mesmo com heap abaixo de 90%” · L100
  - it “mantém pressão current quando stat não fornece desconto reconhecido” · L165
  - it “sem limite de container compara heap ao teto V8, sem usar heapTotal ou ler arquivos” · L175

## `modules/health/health.controller.ts`

19 linhas · caminho: `apps/gateway/src/modules/health/health.controller.ts`
- importa (interno): `modules/health/health.service.ts`
- importado por: `modules/health/health.module.ts`

**class `HealthController`** L5 · @Controller('health')
- injeta (construtor): `health: HealthService`
- `constructor(health)` · L7
- `check(reply)` · L10 · async · @Get
  - chama: `HealthService.check` (health.service.ts:53)

## `modules/health/health.module.ts`

10 linhas · caminho: `apps/gateway/src/modules/health/health.module.ts`
- importa (interno): `modules/health/health.controller.ts`, `modules/health/health.service.ts`
- importado por: `app.module.ts`

**@Module `HealthModule`** L5
- controllers: `[HealthController]`
- providers: `[HealthService]`

**class `HealthModule`** L5 · @Module({ controllers: [HealthController], providers: [HealthServic…)

## `modules/health/health.service.ts`

98 linhas · caminho: `apps/gateway/src/modules/health/health.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `shared-kernel/memory.ts`
- importado por: `modules/health/health-memory.spec.ts`, `modules/health/health.controller.ts`, `modules/health/health.module.ts`

**class `HealthService`** L45 · @Injectable
- injeta (construtor): `prisma: PrismaService` · `redis: RedisService` · `media: MediaStorage`
- `constructor(prisma, redis, media)` · L47
- `check()` · L53 · async
  - chama: `RedisService.ping` (redis.service.ts:18), `MediaStorage.probeWrite` (media-storage.service.ts:80), `checkDatabase` L89, `withDeadline` L31, `memoryStats` (memory.ts:93)
  - chamado por: `HealthController.check` (health.controller.ts:10)
  - env: `npm_package_version`
- `checkDatabase()` · L89 · private · async
  - chamado por: `check` L53

**Funções e constantes de topo**
- `withDeadline(op, ms, fallback)` · L31
  - chamado por: `check` L53

**Tipos**
- interface `HealthReport` L7 · 5 propriedade(s)
