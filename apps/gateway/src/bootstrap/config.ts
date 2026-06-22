import { z } from 'zod';

// Validação de ambiente com zod. A opção `validate` do ConfigModule.forRoot
// aceita qualquer função (config) => configValidado (ver doc oficial @nestjs/config).
//
// Conexões: aceitam URL única OU variáveis separadas (host/porta/usuário/senha).
//  - Postgres: DATABASE_URL  OU  DB_HOST + DB_PORT + DB_USER + DB_PASSWORD + DB_NAME (+ DB_SSL)
//  - Redis:    REDIS_URL     OU  REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (+ REDIS_USERNAME/REDIS_DB)
// Se a URL estiver presente, ela tem prioridade; senão monta-se a partir das partes (evita ter de
// fazer URL-encode de senhas com caracteres especiais).
const base = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ---- PostgreSQL ----
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_SSL: z.coerce.boolean().default(false),

  // ---- Redis ----
  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_USERNAME: z.string().default('default'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(43200), // segundos (12h)
  API_KEY: z.string().min(8).optional(),
  DASHBOARD_USERNAME: z.string().min(1).default('admin'),
  DASHBOARD_PASSWORD: z.string().min(6),
  MAX_SEATS: z.coerce.number().int().positive().default(1), // assentos no MODO COMUNIDADE (sem licença); a licença F9.5 sobrepõe
  MAX_SESSIONS: z.coerce.number().int().positive().default(1), // sessões no modo comunidade; a licença sobrepõe
  LICENSE_KEY: z.string().optional(), // licença Ed25519 (CZL1...) — bootstrap; o normal é instalar pelo painel
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WA_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('error'),
  WEBSHARE_API_KEY: z.string().optional(),
  PROXY_TEST_ECHO_URL: z.string().default('https://api.ipify.org?format=json'),
  // Storage de mídia (S3-compatível). Defaults = MinIO do docker-compose; em prod aponte p/ R2/B2.
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('wa-media'),
  S3_ACCESS_KEY: z.string().default('minio'),
  S3_SECRET_KEY: z.string().default('minio12345'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true), // true p/ MinIO; false p/ AWS S3
  MEDIA_URL_TTL: z.coerce.number().int().positive().default(3600), // validade do URL pré-assinado (s)
  MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(67108864), // 64 MB
});

export const envSchema = base.superRefine((env, ctx) => {
  const hasDbParts = !!(env.DB_HOST && env.DB_USER && env.DB_NAME);
  if (!env.DATABASE_URL && !hasDbParts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'defina DATABASE_URL ou DB_HOST + DB_USER + DB_NAME (+ DB_PASSWORD)',
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
