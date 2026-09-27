// E27/P-086 — URL do link de conexão (com o token) só existe na resposta da criação: o banco guarda
// o hash. Fica em memória do módulo — some ao recarregar; NUNCA em localStorage/sessionStorage —
// para o operador reabrir o diálogo e copiar de novo enquanto o link for o mesmo e estiver ativo.
// Módulo mínimo de propósito: o AuthProvider (bundle principal) limpa isto no logout.
import type { ConnectLinkDto } from '@contracts';

const remembered = new Map<
  string,
  { linkId: string; url: string; userId: string }
>();

// `userId` = quem gerou: outro login na mesma aba (inclusive VIEWER) não vê a URL.
export function rememberLinkUrl(
  sessionId: string,
  linkId: string,
  url: string,
  userId: string,
): void {
  remembered.set(sessionId, { linkId, url, userId });
}

// Puro (chamado no render): outro usuário, outro link, link encerrado ou nenhum → null. A entrada
// velha é sobrescrita na próxima criação ou apagada ao revogar/sair.
export function recallLinkUrl(
  sessionId: string,
  link: Pick<ConnectLinkDto, 'id' | 'state'> | null,
  userId: string,
): string | null {
  const m = remembered.get(sessionId);
  return m &&
    m.userId === userId &&
    link?.id === m.linkId &&
    link.state === 'ACTIVE'
    ? m.url
    : null;
}

export function forgetLinkUrl(sessionId: string): void {
  remembered.delete(sessionId);
}

// Logout (AuthProvider, junto do mediaCache.clear()).
export function clearRememberedLinkUrls(): void {
  remembered.clear();
}
