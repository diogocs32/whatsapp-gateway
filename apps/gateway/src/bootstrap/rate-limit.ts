import rateLimit from '@fastify/rate-limit';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Rate limit global por IP (item 14 da auditoria 07/2026): protege a API pública de abuso.
// RATE_LIMIT_MAX=0 desliga (inclusive o teto do login); default é folgado para o polling do painel.
export function rateLimitMaxFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const max = Number(env.RATE_LIMIT_MAX ?? 600);
  return Number.isFinite(max) && max > 0 ? max : 0;
}

// Teto do login (P-053, D-025): fica NA ROTA (`@RouteConfig({ rateLimit: LOGIN_RATE_LIMIT })` em
// AuthController.signIn) — o plugin prende o hook à rota casada, então forma absoluta
// (`POST http://host/api/auth/login`) e %-encoding (`/api/auth/%6Cogin`, `/%61pi/...`) contam no
// mesmo balde. Antes a decisão era `req.url.startsWith('/api/auth/login')` e essas variantes caíam
// no teto global (600/min). Store próprio: o login não divide o contador com o resto do tráfego
// do IP (polling do painel não bloqueia o login; tentativas de login não gastam os 600).
export const LOGIN_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;

// E27 (P-086, D-037): rotas públicas do link de conexão, por IP e com balde próprio. A página
// consulta a cada 2–3 s (~30/min por aparelho): 120 deixa folga para 4 aparelhos atrás do mesmo IP
// (NAT). O "gerar QR" tem teto de domínio no banco (5 por link, 30 s entre pedidos) — este teto é
// só a primeira barreira (store em memória por processo; RATE_LIMIT_MAX=0 desliga tudo).
export const PUBLIC_CONNECT_READ_RATE_LIMIT = {
  max: 120,
  timeWindow: '1 minute',
} as const;
export const PUBLIC_CONNECT_NEW_QR_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute',
} as const;

// Registrar SEMPRE antes do init/listen: o plugin instala o limitador em cada rota pelo onRoute —
// registrado depois das rotas, não dá erro e não limita nada. Usado pelo main.ts e pelo spec.
export async function registerRateLimit(
  app: NestFastifyApplication,
  max: number,
): Promise<void> {
  await app.register(rateLimit, {
    timeWindow: '1 minute',
    max,
    // /health fica de fora (healthcheck do Docker/Traefik bate com frequência). Pela rota
    // resolvida: /health?x, HEAD /health e a forma absoluta também ficam de fora.
    allowList: (req) => req.routeOptions.url === '/health',
  });
}
