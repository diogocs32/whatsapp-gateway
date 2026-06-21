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
});

export const pairingSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
});
