import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Branding } from '@contracts';
import { api } from './api';

const DEFAULT: Branding = {
  productName: 'WhatsApp Gateway',
  logoUrl: null,
  primaryColor: '#10b981',
  faviconUrl: null,
};

function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [160, 84, 39]; // emerald fallback
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Tema dinâmico: sobrescreve as CSS vars da paleta emerald do Tailwind 4 (--color-emerald-*),
// derivando tons da cor primária. Assim botões/badges/bordas (que usam emerald-*) viram a marca,
// sem refatorar as classes. Não aplica se for a cor padrão (mantém o emerald original).
function applyPrimaryColor(hex: string): void {
  if (hex.toLowerCase() === DEFAULT.primaryColor) return;
  const [h, s, l] = hexToHsl(hex);
  const root = document.documentElement.style;
  root.setProperty('--color-emerald-400', hslToHex(h, s, Math.min(l + 14, 92)));
  root.setProperty('--color-emerald-500', hslToHex(h, s, Math.min(l + 7, 88)));
  root.setProperty('--color-emerald-600', hex);
  root.setProperty('--color-emerald-700', hslToHex(h, s, Math.max(l - 8, 12)));
}

function applyBranding(b: Branding): void {
  document.title = b.productName;
  applyPrimaryColor(b.primaryColor);
  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
}

interface BrandingState {
  branding: Branding;
  refresh: () => void;
}

const BrandingContext = createContext<BrandingState>({
  branding: DEFAULT,
  refresh: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT);

  const load = useCallback(() => {
    api.branding
      .get()
      .then((b) => {
        setBranding(b);
        applyBranding(b);
      })
      .catch(() => {
        /* mantém o default se a API não responder */
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <BrandingContext.Provider value={{ branding, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingState {
  return useContext(BrandingContext);
}
