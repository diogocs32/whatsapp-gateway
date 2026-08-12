import { z } from 'zod';

export const createSessionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use apenas letras, números, _ ou -'),
  engine: z.enum(['BAILEYS', 'WWEBJS']).default('BAILEYS'),
  mode: z.enum(['qr', 'pairing']).default('qr'),
  phoneNumber: z.string().min(8).max(20).optional(),
  autostart: z.boolean().default(true),
  // D-008 — opcional/ADITIVO: id de um proxy LIVRE (GET /proxies/available) p/ a sessão já
  // nascer com atribuição SINGLE/STICKY. Ausente = sem proxy (comportamento de sempre).
  proxyId: z.string().min(1).optional(),
});

export const pairingSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
});

// G8 — config de envio por sessão (PATCH /sessions/:id/config). Todos opcionais (patch parcial).
export const sessionConfigSchema = z
  .object({
    capBase: z.number().int().min(0).max(10000),
    warmupCurve: z.array(z.number().int().min(0)).max(30),
    regiaoDdd: z.string().max(3).nullable(),
    modo: z.enum(['cold_ok', 'inbound_only', 'manual_first']),
    janelaInicio: z.number().int().min(0).max(23),
    janelaFim: z.number().int().min(0).max(23),
    timezone: z.string().min(1).max(64),
    device: z.record(z.string(), z.unknown()),
  })
  .partial();

// G8 — presença ("digitando…"). available/unavailable = presença global; demais = por chat.
export const presenceSchema = z.object({
  to: z.string().min(5).max(40),
  type: z.enum([
    'composing',
    'paused',
    'available',
    'unavailable',
    'recording',
  ]),
});

// W8 — perfil da conta. status ("recado") até 139 chars; nome de exibição até 25 (limites do WhatsApp).
export const profileStatusSchema = z.object({ status: z.string().max(139) });
export const profileNameSchema = z.object({ name: z.string().min(1).max(25) });
// W8b — foto de perfil por URL (o gateway baixa e envia).
export const profilePhotoSchema = z.object({ url: z.string().url() });
