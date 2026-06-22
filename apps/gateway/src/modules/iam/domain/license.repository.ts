// Porta de persistência da licença (singleton — o token instalado).
export interface LicenseRepository {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export const LICENSE_REPOSITORY = Symbol('LICENSE_REPOSITORY');
