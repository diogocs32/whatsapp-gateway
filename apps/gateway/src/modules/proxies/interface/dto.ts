import { z } from 'zod';

const protocolSchema = z.enum(['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5']);

export const createProxySchema = z
  .object({
    label: z.string().max(120).optional(),
    protocol: protocolSchema.default('HTTP'),
    host: z.string().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
  })
  // Item 11 — username sem password conecta SEM auth e dá 407 "inexplicável" em uso real.
  .refine((d) => !d.username || !!d.password, {
    message: 'Proxy autenticado exige username E password',
    path: ['password'],
  });

export const bulkImportSchema = z.object({
  text: z.string().min(1),
  protocol: protocolSchema.default('HTTP'),
});

// E28 (P-107) — exclusão em lote. Teto folgado para o pool (hoje ~20 proxies) sem abrir a porta
// para um corpo gigante; ids são ULIDs (26 caracteres), 64 sobra. O formato barra também o byte
// NUL, que o Postgres recusa (viraria 500).
export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().regex(/^[0-9A-Za-z_-]{1,64}$/, 'id de proxy inválido'), {
      message: 'ids deve ser uma lista de ids de proxy',
    })
    .min(1, 'Selecione ao menos 1 proxy')
    .max(1000, 'No máximo 1000 proxies por vez'),
});

export const setAssignmentSchema = z
  .object({
    mode: z.enum(['NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_ROBIN']),
    rangeStart: z.number().int().min(1).nullish(),
    rangeEnd: z.number().int().min(1).nullish(),
    strategy: z
      .enum(['STICKY', 'ROUND_ROBIN', 'LEAST_LATENCY', 'RANDOM'])
      .default('STICKY'),
    proxyId: z.string().min(1).nullish(),
    // E28 (D-051) — ADITIVO: true aceita proxy SINGLE já usado por outra sessão (compartilhado).
    // Ausente/false = exclusividade de sempre (400 "em uso").
    allowSharedProxy: z.boolean().optional(),
  })
  .refine((d) => d.mode !== 'SINGLE' || !!d.proxyId, {
    message: 'mode SINGLE exige proxyId',
    path: ['proxyId'],
  })
  .refine(
    (d) =>
      d.mode !== 'RANGE' ||
      (d.rangeStart != null &&
        d.rangeEnd != null &&
        d.rangeStart <= d.rangeEnd),
    {
      message: 'mode RANGE exige rangeStart <= rangeEnd',
      path: ['rangeStart'],
    },
  );

// E26 (P-084): mesmo formato do nome na criação de sessão (sessions/interface/dto.ts).
export const proxySuggestionQuerySchema = z
  .string({ message: 'sessionName é obrigatório' })
  .trim()
  .min(1, 'sessionName é obrigatório')
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Use apenas letras, números, _ ou -');
