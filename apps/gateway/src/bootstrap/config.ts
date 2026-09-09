import { z } from 'zod';

// Validação de ambiente com zod. A opção `validate` do ConfigModule.forRoot
// aceita qualquer função (config) => configValidado (ver doc oficial @nestjs/config).
//
// Conexões: aceitam URL única OU variáveis separadas (host/porta/usuário/senha).
//  - Postgres: DATABASE_URL  OU  DB_HOST + DB_PORT + DB_USER + DB_PASSWORD + DB_NAME (+ DB_SSL)
//  - Redis:    REDIS_URL     OU  REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (+ REDIS_USERNAME/REDIS_DB)
// Se a URL estiver presente, ela tem prioridade; senão monta-se a partir das partes (evita ter de
// fazer URL-encode de senhas com caracteres especiais).
// Boolean de env com semântica explícita: ligado = true/1/yes/on · desligado = false/0/no/off
// (case-insensitive; ausente/vazio = default). NUNCA usar z.coerce.boolean() aqui: no zod 3 ele
// faz Boolean(input) e QUALQUER string não-vazia vira true — inclusive "false" e "0"
// (https://zod.dev/?id=coercion-for-primitives; quase ligou o GUARDRAIL_ENFORCE por engano — D-007).
// Valor não reconhecido derruba o boot com erro claro (fail-fast > default silencioso).
const TRUE_WORDS = new Set(['true', '1', 'yes', 'on']);
const FALSE_WORDS = new Set(['false', '0', 'no', 'off']);
const envBool = (def: boolean) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return def;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (TRUE_WORDS.has(s)) return true;
    if (FALSE_WORDS.has(s)) return false;
    return v; // inválido → z.boolean() acusa no validateEnv com o nome da variável
  }, z.boolean());

// String opcional de env com vazio = ausente (uma `VAR=` sobrando no compose se comporta como VAR
// não definida, em vez de virar string vazia que quebra downstream de forma críptica).
const envStr = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional());

const base = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ---- PostgreSQL ----
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_SSL: envBool(false),
  // TLS verificado (ABE-15): CA em PEM (aceita "\n" escapado). Com CA, rejectUnauthorized=true.
  DB_SSL_CA: envStr(),
  // Sem CA: verificar o certificado do servidor? Default false = comportamento anterior (cifra
  // sem verificar) para não derrubar instalações que já usam DB_SSL com certificado próprio.
  DB_SSL_REJECT_UNAUTHORIZED: envBool(false),
  // ---- Pool do Postgres (Prisma 7 → driver adapter pg) ----
  // Doc oficial (Upgrade to v7 → Breaking changes → Driver adapters): o adapter herda os defaults
  // do node-postgres — connect timeout 0 (= espera INFINITA na aquisição com o pool saturado; o
  // Prisma 6 usava 5s) e idle infinito. Defaults abaixo reproduzem o Prisma 6 conforme a própria
  // doc (connection-pool: connectionTimeoutMillis 5s, idleTimeoutMillis 300s); DB_POOL_MAX mantém
  // o default 10 do pg — suba em prod se a frota de sessões + polling saturarem o pool.
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(0).default(5000),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().min(0).default(300000),

  // ---- Redis ----
  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_USERNAME: z.string().default('default'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  // TLS nas partes (com REDIS_URL, use o esquema rediss://) — ABE-15.
  REDIS_TLS: envBool(false),

  JWT_SECRET: z.string().min(16),
  // Custo do scrypt de senha como log2(N) (12..20). Default 14 = o mesmo do Node (2^14). Hash
  // guarda o custo (formato versionado) e re-hasheia no login quando o valor mudar — ABE-11.
  PASSWORD_SCRYPT_LOG2N: z.coerce.number().int().min(12).max(20).default(14),
  // DEPRECATED (mantido p/ compat com env de prod): antes era a vida do JWT único de 12h. O ciclo de
  // sessão agora é access curto (JWT_ACCESS_TTL) + refresh rotacionado (JWT_REFRESH_TTL). Não é mais
  // usado para assinar/expirar; fica só para não quebrar boot se ainda estiver setado no Dokploy.
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(43200),
  // Access token (JWT em cookie httpOnly `token`): vida curta — o refresh renova silenciosamente.
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900), // 15 min (segundos)
  // Refresh token (opaco, cookie httpOnly restrito a /api/auth/refresh + linha em refresh_tokens):
  // vida longa; rotacionado a cada uso com detecção de reuso (revoga a família).
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000), // 30 dias (segundos)
  API_KEY: z.string().min(8).optional(),
  DASHBOARD_USERNAME: z.string().min(1).default('admin'),
  DASHBOARD_PASSWORD: z.string().min(6),
  MAX_SEATS: z.coerce.number().int().positive().default(1), // assentos no MODO COMUNIDADE (sem licença); a licença F9.5 sobrepõe
  MAX_SESSIONS: z.coerce.number().int().positive().default(1), // sessões no modo comunidade; a licença sobrepõe
  LICENSE_KEY: z.string().optional(), // licença Ed25519 (CZL1...) — bootstrap; o normal é instalar pelo painel

  // ---- Guard-rail (G5) ----
  // enforce=false => modo OBSERVAÇÃO: mede/registra o estado mas NÃO bloqueia envios nem aplica
  // quarentena automática. Ligar (true) só depois de ter a mediana real da frota (trava do §G5).
  GUARDRAIL_ENFORCE: envBool(false),
  GUARDRAIL_NMIN: z.coerce.number().int().positive().default(20), // amostra mínima p/ veredito
  GUARDRAIL_THROTTLE_MULT: z.coerce.number().positive().default(0.75), // < mediana×0,75 => throttled
  GUARDRAIL_QUARANTINE_MULT: z.coerce.number().positive().default(0.6), // < mediana×0,6 => quarentena
  GUARDRAIL_TARGET_REPLY_RATE: z.coerce.number().positive().default(0.35), // alvo/fallback se frota pequena
  GUARDRAIL_COOLDOWN_HOURS: z.coerce.number().int().positive().default(48), // cooldown base da quarentena
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WA_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('error'),
  WEBSHARE_API_KEY: z.string().optional(),
  PROXY_TEST_ECHO_URL: z.string().default('https://api.ipify.org?format=json'),
  // Anti-flag: quando ligado, a engine Baileys RECUSA conectar uma sessão que não tenha proxy vivo
  // atribuído (em vez de vazar o IP do servidor/datacenter ao WhatsApp — gatilho de flag na conexão).
  // Default false para não quebrar sessões existentes; ligue depois de atribuir proxy a todas.
  WA_REQUIRE_PROXY: envBool(false),
  // ---- Engine wwebjs (motor browser) ----
  // O motor lê estas chaves direto de process.env (escopo de módulo, antes do Nest subir); declará-las
  // aqui documenta o catálogo e valida a forma. Valor VAZIO = ausente (não derruba o boot — R0: um
  // `WWEBJS_X=` sobrando no compose não pode virar outage de quem só usa Baileys); path inexistente é
  // diagnosticado no start da sessão (guard próprio no doStart, com mensagem acionável).
  WWEBJS_CHROME_PATH: envStr(),
  WWEBJS_DATA_PATH: envStr(),
  WWEBJS_WEB_VERSION: envStr(), // versão fixa | 'auto' | 'live'
  WWEBJS_USER_AGENT: envStr(), // override global do UA (sem ele: UA estável por sessão)
  // Teto do client.initialize() em ms (WA-08/P-025). Default 240000 (4 min). Lido pela engine.
  WWEBJS_INIT_TIMEOUT_MS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  // Storage de mídia (S3-compatível). Defaults = MinIO do docker-compose; em prod aponte p/ R2/B2.
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('wa-media'),
  S3_ACCESS_KEY: z.string().default('minio'),
  S3_SECRET_KEY: z.string().default('minio12345'),
  S3_FORCE_PATH_STYLE: envBool(true), // true p/ MinIO/R2/B2; false p/ AWS S3
  MEDIA_URL_TTL: z.coerce.number().int().positive().default(3600), // validade do URL pré-assinado (s)
  MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(67108864), // 64 MB
  // ---- Filas (BullMQ) ----
  // Entrega de webhook é I/O puro (fetch com teto de 10s). O default do Worker do BullMQ é 1 job
  // por vez (doc guide/workers/concurrency) — um endpoint lento segurava TODAS as entregas
  // (head-of-line blocking). A ordem de entrega nunca foi contratual (retries com backoff já
  // reordenam); consumidores ordenam pelo timestamp do envelope.
  WEBHOOK_CONCURRENCY: z.coerce.number().int().positive().default(8),
  // ---- Egress / SSRF (ABE-06/07, auditoria 09/2026) ----
  // URLs de webhook, mediaUrl de campanha e /messages/media-url NÃO podem apontar para rede
  // privada/loopback/metadata (default). Destino interno LEGÍTIMO (ex.: n8n na mesma rede
  // Docker) entra em EGRESS_ALLOW_HOSTS ("n8n,10.0.0.5"); EGRESS_ALLOW_PRIVATE=true desliga o
  // bloqueio inteiro (só para dev). Lidas pelo shared-kernel/safe-fetch direto do process.env.
  EGRESS_ALLOW_PRIVATE: envBool(false),
  EGRESS_ALLOW_HOSTS: envStr(),
});

export const envSchema = base.superRefine((env, ctx) => {
  const hasDbParts = !!(env.DB_HOST && env.DB_USER && env.DB_NAME);
  if (!env.DATABASE_URL && !hasDbParts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message:
        'defina DATABASE_URL ou DB_HOST + DB_USER + DB_NAME (+ DB_PASSWORD)',
    });
  }
  if (!env.REDIS_URL && !env.REDIS_HOST) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'defina REDIS_URL ou REDIS_HOST',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  return parsed.data;
}
