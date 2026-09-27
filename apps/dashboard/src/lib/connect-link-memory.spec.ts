import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRememberedLinkUrls,
  forgetLinkUrl,
  recallLinkUrl,
  rememberLinkUrl,
} from './connect-link-memory';

// E27/P-086 — URL do link (com token) em memória: só o mesmo link ATIVO, só para quem gerou, e
// some no logout (AuthProvider chama clearRememberedLinkUrls).

const URL_A = 'https://p/conectar#tokenA';
const ACTIVE = { id: 'l1', state: 'ACTIVE' as const };

beforeEach(() => {
  clearRememberedLinkUrls();
});

describe('connect-link-memory', () => {
  it('devolve a URL só para o mesmo link, ativo, e o mesmo usuário', () => {
    rememberLinkUrl('s1', 'l1', URL_A, 'u-owner');
    expect(recallLinkUrl('s1', ACTIVE, 'u-owner')).toBe(URL_A);
    expect(recallLinkUrl('s1', ACTIVE, 'u-viewer')).toBeNull(); // outro login na mesma aba
    expect(
      recallLinkUrl('s1', { id: 'l2', state: 'ACTIVE' }, 'u-owner'),
    ).toBeNull();
    expect(
      recallLinkUrl('s1', { id: 'l1', state: 'REVOKED' }, 'u-owner'),
    ).toBeNull();
    expect(recallLinkUrl('s1', null, 'u-owner')).toBeNull();
    expect(recallLinkUrl('s2', ACTIVE, 'u-owner')).toBeNull();
  });

  it('revogar apaga a sessão; logout apaga tudo', () => {
    rememberLinkUrl('s1', 'l1', URL_A, 'u');
    rememberLinkUrl('s2', 'l1', URL_A, 'u');
    forgetLinkUrl('s1');
    expect(recallLinkUrl('s1', ACTIVE, 'u')).toBeNull();
    expect(recallLinkUrl('s2', ACTIVE, 'u')).toBe(URL_A);
    clearRememberedLinkUrls();
    expect(recallLinkUrl('s2', ACTIVE, 'u')).toBeNull();
  });

  it('criar outro link na mesma sessão substitui a URL guardada', () => {
    rememberLinkUrl('s1', 'l1', URL_A, 'u');
    rememberLinkUrl('s1', 'l2', 'https://p/conectar#tokenB', 'u');
    expect(recallLinkUrl('s1', ACTIVE, 'u')).toBeNull();
    expect(recallLinkUrl('s1', { id: 'l2', state: 'ACTIVE' }, 'u')).toBe(
      'https://p/conectar#tokenB',
    );
  });
});
