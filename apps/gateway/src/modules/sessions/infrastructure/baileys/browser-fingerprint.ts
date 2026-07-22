// Fingerprint de dispositivo REALISTA e ESTÁVEL por sessão para o Baileys.
//
// Motivo (anti-flag): o valor antigo `['WhatsApp Gateway', 'Chrome', '1.0.0']` aparecia
// literalmente como "WhatsApp Gateway" em Aparelhos Conectados do celular — nome não-padrão,
// idêntico em TODA sessão, que denuncia automação. Um WhatsApp Web real mostra algo como
// "Chrome (Mac OS)". Aqui a escolha é DETERMINÍSTICA pelo sessionId: estável entre reconexões
// (mudar o fingerprint a cada conexão também é suspeito) e distinta entre sessões diferentes.
//
// Formato = WABrowserDescription do Baileys: [plataforma, navegador, versão]. Os valores
// espelham o helper `Browsers` do Baileys instalado (Utils/browser-utils.js — macOS 14.4.1,
// Windows 10.0.22631, Ubuntu 22.04.4), então são plausíveis para o WhatsApp Web.

export type BrowserFingerprint = [
  platform: string,
  browser: string,
  version: string,
];

// Conjunto de fingerprints de desktop reais e comuns. Só combinações que existem de verdade
// (nada de "Safari no Windows"). Ampliar aqui dilui a chance de duas sessões colidirem.
const FINGERPRINTS: readonly BrowserFingerprint[] = [
  ['Mac OS', 'Chrome', '14.4.1'],
  ['Windows', 'Chrome', '10.0.22631'],
  ['Ubuntu', 'Chrome', '22.04.4'],
  ['Mac OS', 'Safari', '17.4.1'],
  ['Windows', 'Edge', '10.0.22631'],
  ['Mac OS', 'Firefox', '14.4.1'],
];

// Hash determinístico (FNV-1a 32-bit) — sem Date/random, para o mesmo sessionId cair SEMPRE no
// mesmo fingerprint. Espelha o hashString do ProxyResolver (STICKY).
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function browserFingerprint(sessionId: string): BrowserFingerprint {
  return FINGERPRINTS[hashString(sessionId) % FINGERPRINTS.length]!;
}
