import { z } from 'zod';

// Validação de ambiente com zod. A opção `validate` do ConfigModule.forRoot
// aceita qualquer função (config) => configValidado (ver doc oficial @nestjs/config).
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(43200), // segundos (12h)
  API_KEY: z.string().min(8).optional(),
  DASHBOARD_USERNAME: z.string().min(1).default('admin'),
  DASHBOARD_PASSWORD: z.string().min(6),
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
