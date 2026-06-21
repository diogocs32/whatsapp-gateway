import type { Webhook } from './webhook.entity';

export interface CreateWebhookInput {
  id: string;
  sessionId: string | null;
  url: string;
  events: string[];
  secret: string | null;
  headers: Record<string, string> | null;
  enabled: boolean;
  maxAttempts: number;
}

export interface WebhookRepository {
  create(input: CreateWebhookInput): Promise<Webhook>;
  list(): Promise<Webhook[]>;
  listEnabled(): Promise<Webhook[]>;
  findById(id: string): Promise<Webhook | null>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export const WEBHOOK_REPOSITORY = Symbol('WEBHOOK_REPOSITORY');
