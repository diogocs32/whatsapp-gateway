// Branding white-label (F9.6) — configurável pelo OWNER, aplicado no dashboard e no login.
export interface BrandingSettings {
  productName: string;
  logoUrl: string | null;
  primaryColor: string; // hex (#rrggbb) — cor primária do tema
  faviconUrl: string | null;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  productName: 'WhatsApp Gateway',
  logoUrl: null,
  primaryColor: '#10b981', // emerald-500 (padrão atual)
  faviconUrl: null,
};
