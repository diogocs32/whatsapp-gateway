<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `health`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/health/health-memory.spec.ts` | 189 |
| `modules/health/health-probes.spec.ts` | 346 |
| `modules/health/health.controller.ts` | 19 |
| `modules/health/health.module.ts` | 10 |
| `modules/health/health.service.ts` | 98 |
| `modules/health/with-deadline.spec.ts` | 175 |

## `modules/health/health-memory.spec.ts`

189 linhas · caminho: `apps/gateway/src/modules/health/health-memory.spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `modules/health/health.service.ts`

- describe “HealthService — pressão cgroup com memoryStats real” · L65
  - it “mantém saúde pelo working set do container mesmo com heap acima de 90%” · L83
  - it “degrada pelo container mesmo com heap abaixo de 90%” · L100
  - it “mantém pressão current quando stat não fornece desconto reconhecido” · L165
  - it “sem limite de container compara heap ao teto V8, sem usar heapTotal ou ler arquivos” · L175

## `modules/health/health-probes.spec.ts`

346 linhas · caminho: `apps/gateway/src/modules/health/health-probes.spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `modules/health/health.controller.ts`, `modules/health/health.service.ts`

- describe “HealthService/HealthController — probes e prazos reais” · L53
  - it “considera DB saudável quando SELECT 1 resolve, sem depender das linhas retornadas” · L176
  - it “inicia os três probes juntos e limita DB/Redis a 3000ms e storage a 5000ms” · L188
  - it “storage pendurado responde ok/200 com storage=false exatamente em 5000ms” · L260
  - it “aceita resoluções um ms antes dos prazos e remove cada timer antecipadamente” · L284
  - it “mantém falhas já vencidas mesmo quando DB/Redis resolvem enquanto storage ainda aguarda” · L318

## `modules/health/health.controller.ts`

19 linhas · caminho: `apps/gateway/src/modules/health/health.controller.ts`
- importa (interno): `modules/health/health.service.ts`
- importado por: `modules/health/health-probes.spec.ts`, `modules/health/health.module.ts`

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
- importado por: `modules/health/health-memory.spec.ts`, `modules/health/health-probes.spec.ts`, `modules/health/health.controller.ts`, `modules/health/health.module.ts`, `modules/health/with-deadline.spec.ts`

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

## `modules/health/with-deadline.spec.ts`

175 linhas · caminho: `apps/gateway/src/modules/health/with-deadline.spec.ts`
- importa (interno): `modules/health/health.service.ts`

- describe “withDeadline — prazo dos probes” · L14
  - it “entrega o objeto original quando resolve 1ms antes do prazo” · L40
  - it “entrega fallback por identidade quando rejeita antes do prazo e limpa o timer” · L60
  - it “encerra a espera exatamente no prazo e não antecipa o fallback” · L72
  - it “prazo zero devolve fallback ao executar o timer sem esperar a operação” · L91
  - it “não cancela a operação que resolve depois do fallback” · L101
  - it “consome rejeição tardia sem mudar o fallback já entregue” · L126
  - it “isola timers e resultados de operações simultâneas com prazos diferentes” · L150
