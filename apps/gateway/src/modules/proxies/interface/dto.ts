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

export const setAssignmentSchema = z
  .object({
    mode: z.enum(['NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_ROBIN']),
    rangeStart: z.number().int().min(1).nullish(),
    rangeEnd: z.number().int().min(1).nullish(),
    strategy: z
      .enum(['STICKY', 'ROUND_ROBIN', 'LEAST_LATENCY', 'RANDOM'])
      .default('STICKY'),
    proxyId: z.string().min(1).nullish(),
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
