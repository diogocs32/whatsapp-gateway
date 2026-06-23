import type { BrandingSettings } from './branding';

// Porta de persistência do branding (singleton).
export interface BrandingRepository {
  get(): Promise<BrandingSettings | null>;
  set(branding: BrandingSettings): Promise<void>;
}

export const BRANDING_REPOSITORY = Symbol('BRANDING_REPOSITORY');
