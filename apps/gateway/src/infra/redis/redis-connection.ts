import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';

// Opções de conexão Redis (host/porta/credenciais) usadas tanto pelo RedisService quanto pelas
// filas BullMQ (webhooks/campanhas). Resolve a partir de REDIS_URL OU das partes (REDIS_HOST etc.),
// sempre incluindo a senha — evita o `NOAUTH` quando o Redis exige autenticação.
//
// TLS (auditoria 09/2026, ABE-15): `rediss://` na URL ou REDIS_TLS=true nas partes liga TLS com
// verificação de certificado (servername = host). Antes, o `rediss:` era silenciosamente
// rebaixado para conexão em claro porque só host/porta/senha eram copiados da URL.
export interface RedisConnection {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls?: { servername: string };
  maxRetriesPerRequest: null; // recomendado quando o mesmo Redis serve filas (BullMQ)
}

export function redisConnection(
  config: ConfigService<Env, true>,
): RedisConnection {
  const url = config.get('REDIS_URL', { infer: true });
  if (url) {
    const u = new URL(url);
    if (u.protocol !== 'redis:' && u.protocol !== 'rediss:') {
      throw new Error(
        `REDIS_URL inválida: protocolo "${u.protocol}" (use redis:// ou rediss://)`,
      );
    }
    const pass = u.password ? decodeURIComponent(u.password) : undefined;
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      username: pass && u.username ? decodeURIComponent(u.username) : undefined,
      password: pass,
      db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) || 0 : 0,
      ...(u.protocol === 'rediss:' ? { tls: { servername: u.hostname } } : {}),
      maxRetriesPerRequest: null,
    };
  }
  const password = config.get('REDIS_PASSWORD', { infer: true });
  const host = config.get('REDIS_HOST', { infer: true }) ?? 'localhost';
  return {
    host,
    port: config.get('REDIS_PORT', { infer: true }),
    // username só com senha (ACL Redis 6+); sem senha = sem AUTH.
    username: password
      ? config.get('REDIS_USERNAME', { infer: true })
      : undefined,
    password: password || undefined,
    db: config.get('REDIS_DB', { infer: true }),
    ...(config.get('REDIS_TLS', { infer: true })
      ? { tls: { servername: host } }
      : {}),
    maxRetriesPerRequest: null,
  };
}
