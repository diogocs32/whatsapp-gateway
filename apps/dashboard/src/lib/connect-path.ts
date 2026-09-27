// E27/P-086 — rota da página pública do link de conexão. Módulo mínimo de propósito: o AuthProvider
// (bundle principal) só precisa disto; o resto de lib/connect-link.ts fica no chunk da página.
export const CONNECT_PATH = '/conectar';

export function isPublicPath(pathname: string): boolean {
  return pathname === CONNECT_PATH || pathname.startsWith(`${CONNECT_PATH}/`);
}
