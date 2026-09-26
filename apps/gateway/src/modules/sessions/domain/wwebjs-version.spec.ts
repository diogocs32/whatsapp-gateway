import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isWwebjsVersionMode } from './wwebjs-version';

const require = createRequire(__filename);
const LocalWebCache =
  require('whatsapp-web.js/src/webCache/LocalWebCache.js') as new (options: {
    path: string;
  }) => {
    resolve(version: string): Promise<string | null>;
    persist(html: string, version: string): Promise<void>;
  };

describe('versão WA Web da sessão e cache da lib patchada', () => {
  it('aceita modos explícitos e a build alpha; rejeita separadores e traversal', () => {
    expect(isWwebjsVersionMode('auto')).toBe(true);
    expect(isWwebjsVersionMode('live')).toBe(true);
    expect(isWwebjsVersionMode('2.3000.1046934385-alpha')).toBe(true);
    for (const invalid of [
      '../secret',
      '2.3000/../../secret',
      '2.3000\\foo',
      '',
      'x',
    ]) {
      expect(isWwebjsVersionMode(invalid)).toBe(false);
    }
  });

  it('o cache instalado lê e grava a build alpha dentro da pasta e recusa traversal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wwebjs-version-'));
    try {
      const cache = new LocalWebCache({ path: dir });
      await cache.persist('<html>ok</html>', '2.3000.1046934385-alpha');
      await expect(cache.resolve('2.3000.1046934385-alpha')).resolves.toBe(
        '<html>ok</html>',
      );
      await expect(cache.resolve('../../secret')).rejects.toThrow();
      await expect(cache.persist('bad', '../../secret')).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
