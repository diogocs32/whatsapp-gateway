// API keys (blueprint §15): autenticação programática via header X-Api-Key. Guardamos só o SHA-512
// da chave (o texto é mostrado uma única vez na criação).

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  scopes?: string[];
}

export interface ApiKeyRepository {
  create(input: CreateApiKeyInput): Promise<void>;
  findByHash(hash: string): Promise<ApiKeyRecord | null>;
  list(): Promise<ApiKeyRecord[]>;
  revoke(id: string): Promise<void>;
  touch(id: string): Promise<void>; // atualiza lastUsedAt (fire-and-forget)
}

export const API_KEY_REPOSITORY = Symbol('API_KEY_REPOSITORY');
