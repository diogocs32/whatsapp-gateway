export type ProxyFailure = 'PROXY_AUTH' | 'PROXY_TUNNEL';

// DEAD afeta todas as sessões que usam o proxy. Só uma assinatura própria de
// autenticação/túnel o implica; timeout, DNS e resets genéricos podem ser do destino.
export function classifyProxyFailure(message: string): ProxyFailure | null {
  if (
    /\bERR_INVALID_AUTH_CREDENTIALS\b|\b407\s+Proxy Authentication Required\b|\b(?:status(?:Code)?|status code|response)[\s:=]+407\b|\bHTTP\/\d(?:\.\d)?\s+407\b/i.test(
      message,
    )
  )
    return 'PROXY_AUTH';
  if (
    /\bERR_(?:TUNNEL_CONNECTION_FAILED|PROXY_CONNECTION_FAILED|NO_SUPPORTED_PROXIES|SOCKS_CONNECTION_FAILED)\b|\btunneling socket could not be established\b/i.test(
      message,
    )
  )
    return 'PROXY_TUNNEL';
  return null;
}
