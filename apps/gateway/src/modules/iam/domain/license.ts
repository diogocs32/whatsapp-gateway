import { createPublicKey, verify } from 'node:crypto';
import { LICENSE_PUBLIC_KEY_PEM } from './license-key';

// Token de licença: "CZL1.<base64url(claims)>.<base64url(assinatura Ed25519)>".
export const LICENSE_PREFIX = 'CZL1';

export interface LicenseClaims {
  licenseId: string;
  customer: string; // nome do cliente/empresa (base p/ white-label — F9.6)
  maxSeats: number; // limite de usuários do painel
  maxSessions: number; // limite de sessões WhatsApp simultâneas
  features: string[]; // módulos habilitados
  iat: number; // emitida em (epoch ms)
  exp: number | null; // expira em (epoch ms) ou null = perpétua
}

// Licença efetiva exposta ao app: claims + metadados de validação.
export interface EffectiveLicense extends LicenseClaims {
  valid: boolean; // true = licença assinada e válida; false = modo comunidade
  community: boolean; // true quando é o fallback de comunidade
  reason?: string; // motivo quando inválida (ausente/expirada/assinatura)
}

// Modo comunidade: fallback quando não há licença válida. Limites mínimos.
export const COMMUNITY_LICENSE: EffectiveLicense = {
  licenseId: 'community',
  customer: 'Community',
  maxSeats: 1,
  maxSessions: 1,
  features: [],
  iat: 0,
  exp: null,
  valid: false,
  community: true,
};

// KeyObject criado uma vez e reutilizado (recomendação da doc do Node).
const publicKey = createPublicKey(LICENSE_PUBLIC_KEY_PEM);

function community(reason: string): EffectiveLicense {
  return { ...COMMUNITY_LICENSE, reason };
}

// Valida o token (formato + assinatura Ed25519 + expiração). NUNCA lança — a entrada é
// não-confiável; em qualquer falha cai no modo comunidade com o motivo.
export function verifyLicense(
  token: string | null | undefined,
  nowMs: number,
): EffectiveLicense {
  if (!token || !token.trim()) return community('sem licença');
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) {
      return community('formato inválido');
    }
    const [, payloadB64, sigB64] = parts;
    const ok = verify(
      null,
      Buffer.from(payloadB64),
      publicKey,
      Buffer.from(sigB64, 'base64url'),
    );
    if (!ok) return community('assinatura inválida');

    const claims = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as LicenseClaims;
    if (claims.exp !== null && nowMs > claims.exp) {
      return community('licença expirada');
    }
    return { ...claims, valid: true, community: false };
  } catch {
    return community('falha ao validar');
  }
}
