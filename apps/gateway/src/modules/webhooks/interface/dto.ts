import { z } from 'zod';

export const createWebhookSchema = z.object({
  sessionId: z.string().min(1).nullish(),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  secret: z.string().min(8).max(128).optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(20).default(5),
});
