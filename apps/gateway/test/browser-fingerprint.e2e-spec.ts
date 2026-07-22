import { describe, expect, it } from 'vitest';
import { browserFingerprint } from '../src/modules/sessions/infrastructure/baileys/browser-fingerprint';

// Fingerprint anti-flag: precisa ser estável por sessão, distinto entre sessões e NUNCA o antigo
// rótulo "WhatsApp Gateway" (que denunciava automação em Aparelhos Conectados).
describe('browserFingerprint', () => {
  it('é determinístico por sessão (estável entre reconexões)', () => {
    const a = browserFingerprint('sessao-abc');
    const b = browserFingerprint('sessao-abc');
    expect(a).toEqual(b);
  });

  it('nunca contém o rótulo antigo "WhatsApp Gateway"', () => {
    for (const id of [
      'a',
      'sessao-1',
      '01KWJQGVSS9PTQE4WWTES6X8FD',
      'DIOGO_OWER',
    ]) {
      expect(browserFingerprint(id).join(' ')).not.toContain(
        'WhatsApp Gateway',
      );
    }
  });

  it('devolve [plataforma, navegador, versão] plausível', () => {
    const [platform, browser, version] = browserFingerprint('qualquer');
    expect(['Mac OS', 'Windows', 'Ubuntu']).toContain(platform);
    expect(['Chrome', 'Safari', 'Edge', 'Firefox']).toContain(browser);
    expect(version).toMatch(/^\d+\.\d+/);
  });

  it('distribui entre sessões diferentes (não é tudo o mesmo valor)', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `sessao-${i}`);
    const distintos = new Set(
      ids.map((id) => browserFingerprint(id).join('|')),
    );
    expect(distintos.size).toBeGreaterThan(1);
  });
});
