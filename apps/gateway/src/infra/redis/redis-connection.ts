import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';

// Opções de conexão Redis (host/porta/credenciais) usadas tanto pelo RedisService quanto pelas
// filas BullMQ (webhooks/campanhas). Resolve a partir de REDIS_URL OU das partes (REDIS_HOST etc.),
// sempre incluindo a senha — evita o `NOAUTH` quando o Redis exige autenticação.
export interface RedisConnection {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  maxRetriesPerRequest: null; // recomendado quando o mesmo Redis serve filas (BullMQ)
}

export function redisConnection(config: ConfigService<Env, true>): RedisConnection {
  const url = config.get('REDIS_URL', { infer: true });
  if (url) {
    const u = new URL(url);
    const pass = u.password ? decodeURIComponent(u.password) : undefined;
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      username: pass && u.username ? decodeURIComponent(u.username) : undefined,
      password: pass,
      db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) || 0 : 0,
      maxRetriesPerRequest: null,
    };
  }
  const password = config.get('REDIS_PASSWORD', { infer: true });
  return {
    host: config.get('REDIS_HOST', { infer: true }) ?? 'localhost',
    port: config.get('REDIS_PORT', { infer: true }),
    // username só com senha (ACL Redis 6+); sem senha = sem AUTH.
    username: password ? config.get('REDIS_USERNAME', { infer: true }) : undefined,
    password: password || undefined,
    db: config.get('REDIS_DB', { infer: true }),
    maxRetriesPerRequest: null,
  };
}
