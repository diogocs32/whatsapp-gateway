import { z } from 'zod';
import { isWwebjsVersionMode } from '../domain/wwebjs-version';

// Nome da sessão — a MESMA regra no create e no rename (E30): é a referência estável das
// integrações em `/api/sessions/{nome}`, por isso só caracteres seguros em URL.
export const sessionNameSchema = z
  .string()
  .min(1, 'Informe o nome da sessão')
  .max(64, 'Nome com até 64 caracteres')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Use apenas letras, números, _ ou -');

export const createSessionSchema = z.object({
  name: sessionNameSchema,
  engine: z.enum(['BAILEYS', 'WWEBJS']).default('BAILEYS'),
  mode: z.enum(['qr', 'pairing']).default('qr'),
  phoneNumber: z.string().min(8).max(20).optional(),
  autostart: z.boolean().default(true),
  // D-008 — opcional/ADITIVO: id de um proxy LIVRE (GET /proxies/available) p/ a sessão já
  // nascer com atribuição SINGLE/STICKY. Ausente = sem proxy (comportamento de sempre).
  proxyId: z.string().min(1).optional(),
  // E28 (D-051) — ADITIVO: true aceita `proxyId` já usado por outra sessão (compartilhado).
  // Ausente/false = só proxy livre (400 "em uso", como sempre).
  allowSharedProxy: z.boolean().optional(),
});

// E30 (P-110, D-053) — PATCH /sessions/:id: o que pode mudar depois de criada. Hoje só o nome.
export const updateSessionSchema = z.object({ name: sessionNameSchema });

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
    wwebjsWebVersion: z
      .string()
      .refine(
        isWwebjsVersionMode,
        'Use auto, live ou uma versão do catálogo WA Web',
      )
      .nullable(),
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
