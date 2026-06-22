import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { sha512 } from '../../../shared-kernel/crypto';
import { newId } from '../../../shared-kernel/ulid';
import {
  API_KEY_REPOSITORY,
  type ApiKeyRecord,
  type ApiKeyRepository,
} from '../domain/api-key.repository';

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string; // texto pleno — retornado UMA ÚNICA VEZ (não é guardado)
}

@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly repo: ApiKeyRepository,
  ) {}

  // Gera uma chave nova (prefixo "cz_" + aleatório), guarda só o SHA-512 e devolve o texto uma vez.
  async create(name: string, scopes: string[] = []): Promise<CreatedApiKey> {
    const key = `cz_${randomBytes(24).toString('base64url')}`;
    const id = newId();
    const prefix = key.slice(0, 11);
    await this.repo.create({ id, name, prefix, hash: sha512(key), scopes });
    return { id, name, prefix, key };
  }

  list(): Promise<ApiKeyRecord[]> {
    return this.repo.list();
  }

  revoke(id: string): Promise<void> {
    return this.repo.revoke(id);
  }

  // Valida uma chave recebida no header X-Api-Key. Retorna o registro se válida e não revogada.
  async validate(rawKey: string): Promise<ApiKeyRecord | null> {
    const record = await this.repo.findByHash(sha512(rawKey));
    if (!record || record.revokedAt) return null;
    void this.repo.touch(record.id);
    return record;
  }
}
