import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canRetryViaLid,
  isNoLidForUserError,
  pageResolvePnToLid,
  withLidFallback,
  type LidFallbackDeps,
} from './wwebjs.lid-outbound';

type PageRequire = (m: string) => Record<string, unknown>;
const g = globalThis as { require?: PageRequire };
const originalRequire = g.require;

// Monta o window.require da página com os módulos que a função injetada consulta.
function mockPageRequire(mods: Record<string, Record<string, unknown>>): void {
  g.require = (m: string) => {
    const mod = mods[m];
    if (!mod) throw new Error(`module not found: ${m}`);
    return mod;
  };
}

afterEach(() => {
  if (originalRequire === undefined) delete g.require;
  else g.require = originalRequire;
});

describe('isNoLidForUserError', () => {
  it('reconhece o erro cru da página e o embrulhado pelo evaluate', () => {
    expect(isNoLidForUserError(new Error('No LID for user'))).toBe(true);
    expect(
      isNoLidForUserError(
        new Error('Evaluation failed: Error: No LID for user 5511999999999'),
      ),
    ).toBe(true);
    expect(isNoLidForUserError('no lid for user')).toBe(true);
  });

  it('NÃO casa com outros erros do caminho de envio (senão reroteava tudo)', () => {
    expect(
      isNoLidForUserError(new Error('Protocol error: Target crashed')),
    ).toBe(false);
    expect(
      isNoLidForUserError(new Error('WhatsApp Web ainda sincronizando')),
    ).toBe(false);
    expect(isNoLidForUserError(null)).toBe(false);
    expect(isNoLidForUserError(undefined)).toBe(false);
    expect(isNoLidForUserError(42)).toBe(false);
  });
});

describe('canRetryViaLid', () => {
  it('só o jid individual clássico é elegível', () => {
    expect(canRetryViaLid('5511999999999@c.us')).toBe(true);
    expect(canRetryViaLid('120363000000000000@g.us')).toBe(false);
    expect(canRetryViaLid('987654321@lid')).toBe(false);
    expect(canRetryViaLid('status@broadcast')).toBe(false);
  });
});

describe('pageResolvePnToLid (rodada aqui com require mockado — na página é o window.require)', () => {
  it('devolve o LID quando getCurrentLid conhece o mapeamento', () => {
    mockPageRequire({
      WAWebWidFactory: { createWid: (s: string) => ({ _serialized: s }) },
      WAWebApiContact: {
        getCurrentLid: () => ({ _serialized: '111222333@lid' }),
      },
    });
    expect(pageResolvePnToLid('5511999999999@c.us')).toBe('111222333@lid');
  });

  it('cai para getAlternateUserWid quando getCurrentLid não sabe ou devolve não-LID', () => {
    mockPageRequire({
      WAWebWidFactory: { createWid: (s: string) => ({ _serialized: s }) },
      WAWebApiContact: {
        getCurrentLid: () => ({ _serialized: '5511999999999@c.us' }),
        getAlternateUserWid: () => ({ _serialized: '444555666@lid' }),
      },
    });
    expect(pageResolvePnToLid('5511999999999@c.us')).toBe('444555666@lid');
  });

  it('devolve null quando o Store local não conhece o par (nunca inventa)', () => {
    mockPageRequire({
      WAWebWidFactory: { createWid: (s: string) => ({ _serialized: s }) },
      WAWebApiContact: {
        getCurrentLid: () => undefined,
        getAlternateUserWid: () => undefined,
      },
    });
    expect(pageResolvePnToLid('5511999999999@c.us')).toBeNull();
  });

  it('recusa @hosted.lid (reroteio só para LID clássico)', () => {
    mockPageRequire({
      WAWebWidFactory: { createWid: (s: string) => ({ _serialized: s }) },
      WAWebApiContact: {
        getCurrentLid: () => ({ _serialized: '777@hosted.lid' }),
      },
    });
    expect(pageResolvePnToLid('5511999999999@c.us')).toBeNull();
  });

  it('é à prova de página quebrada: módulo ausente, API que lança, require inexistente', () => {
    mockPageRequire({
      WAWebWidFactory: { createWid: (s: string) => ({ _serialized: s }) },
      WAWebApiContact: {
        getCurrentLid: () => {
          throw new Error('store not ready');
        },
      },
    });
    expect(pageResolvePnToLid('5511999999999@c.us')).toBeNull();

    mockPageRequire({}); // nenhum módulo resolve
    expect(pageResolvePnToLid('5511999999999@c.us')).toBeNull();

    delete g.require; // página sem window.require
    expect(pageResolvePnToLid('5511999999999@c.us')).toBeNull();
  });
});

describe('withLidFallback (invariantes da máquina de decisão)', () => {
  const PN = '5511999999999@c.us';
  const LID = '111222333@lid';
  const noLidErr = () => new Error('Evaluation failed: Error: No LID for user');
  const deps = (over: Partial<LidFallbackDeps> = {}): LidFallbackDeps => ({
    getMapped: () => undefined,
    forget: vi.fn(),
    resolve: async () => null,
    remember: vi.fn(),
    ...over,
  });

  it('caminho feliz: op roda com o PN, nada é resolvido nem memorizado', async () => {
    const d = deps({
      resolve: vi.fn(async () => LID),
    });
    const out = await withLidFallback(PN, async (jid) => ({ jid }), d);
    expect(out).toEqual({ jid: PN });
    expect(d.resolve).not.toHaveBeenCalled();
    expect(d.remember).not.toHaveBeenCalled();
  });

  it('erro que NÃO é "No LID" sobe INTACTO (mesma instância), sem resolver', async () => {
    const err = new Error('Protocol error: Target crashed');
    const d = deps({ resolve: vi.fn(async () => LID) });
    await expect(
      withLidFallback(PN, () => Promise.reject(err), d),
    ).rejects.toBe(err);
    expect(d.resolve).not.toHaveBeenCalled();
  });

  it('Store local sem o LID → o ERRO ORIGINAL sobe (mesma instância, falha honesta)', async () => {
    const err = noLidErr();
    const d = deps({ resolve: async () => null });
    await expect(
      withLidFallback(PN, () => Promise.reject(err), d),
    ).rejects.toBe(err);
    expect(d.remember).not.toHaveBeenCalled();
  });

  it('retry via LID com sucesso → devolve o resultado e memoriza o par', async () => {
    const d = deps({ resolve: async () => LID });
    const out = await withLidFallback(
      PN,
      (jid) =>
        jid === PN ? Promise.reject(noLidErr()) : Promise.resolve({ jid }),
      d,
    );
    expect(out).toEqual({ jid: LID });
    expect(d.remember).toHaveBeenCalledWith(PN, LID);
  });

  it('retry resolve null sem lançar (lib não obteve o chat) → erro ORIGINAL, nada memorizado', async () => {
    const err = noLidErr();
    const d = deps({ resolve: async () => LID });
    await expect(
      withLidFallback(
        PN,
        (jid) => (jid === PN ? Promise.reject(err) : Promise.resolve(null)),
        d,
      ),
    ).rejects.toBe(err);
    expect(d.remember).not.toHaveBeenCalled();
  });

  it('retry que lança OUTRO erro → sobe o erro do retry e avisa onRetryError com o original', async () => {
    const original = noLidErr();
    const retryErr = new Error('página caiu no meio');
    const onRetryError = vi.fn();
    const d = deps({ resolve: async () => LID, onRetryError });
    await expect(
      withLidFallback(
        PN,
        (jid) => Promise.reject(jid === PN ? original : retryErr),
        d,
      ),
    ).rejects.toBe(retryErr);
    expect(onRetryError).toHaveBeenCalledWith(PN, LID, original, retryErr);
    expect(d.remember).not.toHaveBeenCalled();
  });

  it('mapeado: vai direto ao LID; em throw esquece e relança; em null esquece e refaz pelo PN', async () => {
    // throw no mapeado
    const errLid = new Error('qualquer coisa');
    const d1 = deps({ getMapped: () => LID });
    await expect(
      withLidFallback(PN, () => Promise.reject(errLid), d1),
    ).rejects.toBe(errLid);
    expect(d1.forget).toHaveBeenCalledWith(PN);

    // null no mapeado → mesma chamada refaz pelo PN (nada foi enviado)
    const d2 = deps({ getMapped: () => LID });
    const calls: string[] = [];
    const out = await withLidFallback(
      PN,
      async (jid) => {
        calls.push(jid);
        return jid === LID ? null : { jid };
      },
      d2,
    );
    expect(calls).toEqual([LID, PN]);
    expect(out).toEqual({ jid: PN });
    expect(d2.forget).toHaveBeenCalledWith(PN);
  });

  it('grupo (@g.us) nunca reroteia, mesmo com o texto do erro parecido', async () => {
    const err = noLidErr();
    const d = deps({ resolve: vi.fn(async () => LID) });
    await expect(
      withLidFallback('120363000@g.us', () => Promise.reject(err), d),
    ).rejects.toBe(err);
    expect(d.resolve).not.toHaveBeenCalled();
  });
});

describe('guarda anti-contact-check (política do dono, 31/08: envio nunca consulta existência)', () => {
  it('o código injetado não referencia nenhuma via de rede/checagem de existência', () => {
    const src = pageResolvePnToLid.toString();
    // Cada um destes é (ou cai em) WAWebQueryExistsJob.queryWidExists — o padrão que gera ban.
    expect(src).not.toMatch(
      /queryWidExists|WAWebQueryExistsJob|enforceLidAndPnRetrieval|getNumberId|onWhatsApp|USync/i,
    );
    // E a via LOCAL declarada é a que está de fato em uso.
    expect(src).toMatch(/getCurrentLid/);
    expect(src).toMatch(/getAlternateUserWid/);
  });

  it('o engine só toca getNumberId no checkNumbers (endpoint à parte) — nunca no caminho de envio', () => {
    // Se este teste quebrar com uma 2ª ocorrência, a mudança precisa de decisão consciente:
    // getNumberId = WAWebQueryExistsJob.queryWidExists = contact-check de rede (padrão de ban).
    const src = readFileSync(join(__dirname, 'wwebjs.engine.ts'), 'utf8');
    expect(src.match(/\.getNumberId\(/g)?.length ?? 0).toBe(1); // só a chamada do checkNumbers
    expect(src).not.toMatch(/queryWidExists|isRegisteredUser/);
  });
});
