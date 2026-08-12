import { describe, expect, it } from 'vitest';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WWebJSEngine,
  mapInboundMediaType,
  authDirOf,
} from '../src/modules/sessions/infrastructure/wwebjs/wwebjs.engine';
import type { BaileysEngineDeps } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';

// Primeiro teste que instancia a engine WWEBJS real (antes desta W1, a cobertura do caminho wwebjs
// era ZERO — os e2e trocam o SessionManager inteiro por um fake e nenhum tocava a engine). Aqui
// exercitamos SÓ o guard anti-vazamento (WA_REQUIRE_PROXY), que retorna ANTES de `new Client(...)`
// — logo NÃO sobe Chromium e roda no CI sem browser.

type StatusEvent = { status: string; error?: string | null };

function makeDeps(over: Partial<BaileysEngineDeps>): {
  deps: BaileysEngineDeps;
  events: StatusEvent[];
} {
  const events: StatusEvent[] = [];
  const noop = () => undefined;
  const logger = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    fatal: noop,
    trace: noop,
  } as unknown as BaileysEngineDeps['logger'];
  const deps = {
    sessionId: 'test-wwebjs-guard',
    deviceName: 'test',
    prisma: {} as unknown as BaileysEngineDeps['prisma'],
    logger,
    onEvent: (name, payload) => {
      if (name === 'session.status') events.push(payload as StatusEvent);
    },
    ...over,
  } as BaileysEngineDeps;
  return { deps, events };
}

describe('WWebJSEngine — guard WA_REQUIRE_PROXY (P0-2)', () => {
  it('recusa conectar sem proxy quando requireProxy=true (não vaza IP, não sobe Chromium)', async () => {
    const { deps, events } = makeDeps({
      requireProxy: true,
      resolveProxyConfig: async () => null,
    });
    const engine = new WWebJSEngine(deps);

    await engine.start();

    expect(engine.getStatus()).toBe('FAILED');
    // Mensagem específica do guard — distingue de um FAILED por falha de launch do Chromium.
    const failed = events.find((e) => e.status === 'FAILED');
    expect(failed?.error).toMatch(/WA_REQUIRE_PROXY/);
    // Prova por mutação: se o guard for removido, o start alcança `setStatus('STARTING')`
    // (logo após `new Client`) e tenta subir o Chromium. Guard ativo NUNCA emite STARTING.
    expect(events.some((e) => e.status === 'STARTING')).toBe(false);
  });

  it('não bloqueia por engano quando requireProxy é ausente (default seguro reverso)', async () => {
    // Sem requireProxy e sem proxy, o guard NÃO deve marcar FAILED por conta dele. Aqui só
    // garantimos que o guard em si não dispara — o restante do start (webVersion/Chromium) exige
    // browser e não é exercitado neste teste unitário.
    const { deps, events } = makeDeps({ resolveProxyConfig: async () => null });
    const engine = new WWebJSEngine(deps);
    // Não aguardamos o start completo (ele tentaria subir o Chromium); checamos só que o guard
    // não produziu o FAILED específico dele de forma síncrona na fase de resolução de proxy.
    void engine.start();
    await new Promise((r) => setImmediate(r));
    const guardFail = events.find(
      (e) => e.status === 'FAILED' && /WA_REQUIRE_PROXY/.test(e.error ?? ''),
    );
    expect(guardFail).toBeUndefined();
    await engine.stop().catch(() => undefined);
  });
});

describe('WWebJSEngine — rótulo da engine (P1-1)', () => {
  it('expõe engineName "wwebjs" (fonte do rótulo do envelope de webhook)', () => {
    const { deps } = makeDeps({});
    expect(new WWebJSEngine(deps).engineName).toBe('wwebjs');
  });
});

describe('mapInboundMediaType — tipo de mídia recebida (P0-3)', () => {
  it('mapeia os tipos do wwebjs para o mediaType público', () => {
    expect(mapInboundMediaType('image')).toBe('image');
    expect(mapInboundMediaType('video')).toBe('video');
    expect(mapInboundMediaType('audio')).toBe('audio');
    expect(mapInboundMediaType('ptt')).toBe('audio'); // nota de voz conta como áudio
    expect(mapInboundMediaType('sticker')).toBe('sticker');
    expect(mapInboundMediaType('document')).toBe('document');
  });

  it('mídia desconhecida cai em document (recuperável no GET /media)', () => {
    expect(mapInboundMediaType('unknown')).toBe('document');
    expect(mapInboundMediaType(undefined)).toBe('document');
  });
});

describe('WWebJSEngine.purgeAuthDir — limpeza do LocalAuth em disco (P1-2/P1-3)', () => {
  it('remove o perfil do Chromium da sessão do disco', async () => {
    const id = `test-purge-${Math.random().toString(36).slice(2)}`;
    const dir = authDirOf(id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'creds.json'), '{}');
    await WWebJSEngine.purgeAuthDir(id);
    // O dir não existe mais → access rejeita (ENOENT). Sem a purga, new-qr/remove vazavam o perfil.
    await expect(access(dir)).rejects.toBeTruthy();
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('é no-op (não lança) para sessão sem perfil em disco', async () => {
    await expect(
      WWebJSEngine.purgeAuthDir(`inexistente-${Math.random()}`),
    ).resolves.toBeUndefined();
  });
});

describe('WWebJSEngine — grupos/contatos/canais implementados (W4/P-010)', () => {
  // Após a W4 nenhum destes lança "não suportado" (nope removido): vão à lib real. Sem um client
  // conectado, o caminho real falha com "Sessão não conectada" — o que PROVA que deixaram de ser
  // no-op de engine (antes lançavam UnsupportedEngineOperationError). O comportamento real (criar
  // grupo, checar número, seguir canal) depende de browser + WhatsApp — fora do CI.
  it('createGroup vai à lib (sem client → "Sessão não conectada", não mais "não suportado")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(
      engine.createGroup('grupo', ['5511999999999']),
    ).rejects.toThrow(/Sessão não conectada/);
  });

  it('checkNumbers e setBlock idem (implementados, não mais nope)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.checkNumbers(['5511999999999'])).rejects.toThrow(
      /Sessão não conectada/,
    );
    await expect(engine.setBlock('5511999999999', 'block')).rejects.toThrow(
      /Sessão não conectada/,
    );
  });

  it('followChannel idem (canais beta implementados)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.followChannel('123@newsletter')).rejects.toThrow(
      /Sessão não conectada/,
    );
  });
});

describe('WWebJSEngine — mensagens ricas (W5): reações e menções', () => {
  it('sendReaction vai à lib (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(
      engine.sendReaction('5511999999999@c.us', 'ABC', false, '👍'),
    ).rejects.toThrow(/Sessão não conectada/);
  });

  it('sendText com menções não quebra o caminho (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(
      engine.sendText('5511999999999', 'oi @fulano', {
        mentions: ['5511888888888'],
      }),
    ).rejects.toThrow(/Sessão não conectada/);
  });

  it('sendLocation vai à lib (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(
      engine.sendLocation('5511999999999', {
        latitude: -23.55,
        longitude: -46.63,
        name: 'SP',
      }),
    ).rejects.toThrow(/Sessão não conectada/);
  });

  it('sendPoll vai à lib (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(
      engine.sendPoll('5511999999999', {
        name: 'Prefere?',
        options: ['A', 'B'],
      }),
    ).rejects.toThrow(/Sessão não conectada/);
  });

  it('setProfileStatus/setProfileName vão à lib (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.setProfileStatus('Disponível')).rejects.toThrow(
      /Sessão não conectada/,
    );
    await expect(engine.setProfileName('Loja X')).rejects.toThrow(
      /Sessão não conectada/,
    );
  });
});
