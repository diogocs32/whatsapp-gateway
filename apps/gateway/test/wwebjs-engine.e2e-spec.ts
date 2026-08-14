import { describe, expect, it } from 'vitest';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WWebJSEngine,
  mapInboundMediaType,
  authDirOf,
  buildAuthProxyUrl,
  groupFlags,
  raceStoreOp,
  userAgentFor,
  CLEAN_SHUTDOWN_MARKER,
} from '../src/modules/sessions/infrastructure/wwebjs/wwebjs.engine';
import type { GroupChat } from 'whatsapp-web.js';
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

describe('groupFlags — announce/restrict reais do grupo (P-012)', () => {
  const asGroup = (md: unknown) =>
    ({ groupMetadata: md }) as unknown as GroupChat;

  it('lê os valores reais de groupMetadata', () => {
    expect(groupFlags(asGroup({ announce: true, restrict: false }))).toEqual({
      announce: true,
      restrict: false,
    });
    expect(groupFlags(asGroup({ announce: false, restrict: true }))).toEqual({
      announce: false,
      restrict: true,
    });
  });

  it('metadata ausente → false (fallback sem regressão)', () => {
    expect(groupFlags(asGroup(undefined))).toEqual({
      announce: false,
      restrict: false,
    });
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
    await expect(
      engine.setProfilePhoto(Buffer.from('x'), 'image/jpeg'),
    ).rejects.toThrow(/Sessão não conectada/);
  });
});

describe('WWebJSEngine — W8 grupos avançados (membership/settings/foto)', () => {
  it('groupMembershipRequests/Action e setGroupSetting/Photo vão à lib (sem client)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.groupMembershipRequests('123@g.us')).rejects.toThrow(
      /Sessão não conectada/,
    );
    await expect(
      engine.groupMembershipAction('123@g.us', 'approve'),
    ).rejects.toThrow(/Sessão não conectada/);
    await expect(
      engine.setGroupSetting('123@g.us', 'announce', true),
    ).rejects.toThrow(/Sessão não conectada/);
    await expect(
      engine.setGroupPhoto('123@g.us', Buffer.from('x'), 'image/jpeg'),
    ).rejects.toThrow(/Sessão não conectada/);
  });
});

describe('WWebJSEngine — W7 inbox/histórico (listChats/fetchChatHistory)', () => {
  it('vão à lib (sem client → "Sessão não conectada", não são no-op)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.listChats(50)).rejects.toThrow(/Sessão não conectada/);
    await expect(
      engine.fetchChatHistory('5511999999999@c.us', 50),
    ).rejects.toThrow(/Sessão não conectada/);
  });
});

describe('WWebJSEngine — W7 gestão de chat (setChatFlag)', () => {
  it('todos os flags vão à lib (sem client → "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    for (const flag of ['archive', 'pin', 'mute', 'unread'] as const) {
      await expect(
        engine.setChatFlag('5511999999999@c.us', flag, true),
      ).rejects.toThrow(/Sessão não conectada/);
    }
  });
});

describe('buildAuthProxyUrl — upstream do forwarder local (proxy autenticado)', () => {
  it('injeta as credenciais na URL do proxy', () => {
    const url = buildAuthProxyUrl('http://104.165.153.111:5744', 'usr', 'pwd');
    const u = new URL(url);
    expect(u.username).toBe('usr');
    expect(u.password).toBe('pwd');
    expect(u.hostname).toBe('104.165.153.111');
    expect(u.port).toBe('5744');
    expect(u.protocol).toBe('http:');
  });

  it('percent-encoda credenciais com caracteres especiais (@ : /) sem quebrar a URL', () => {
    const url = buildAuthProxyUrl('http://1.2.3.4:8080', 'u@ser', 'p:a@s/s');
    const u = new URL(url); // não lança = URL válida
    expect(decodeURIComponent(u.username)).toBe('u@ser');
    expect(decodeURIComponent(u.password)).toBe('p:a@s/s');
  });
});

describe('proxy-chain — forwarder local p/ proxy autenticado (ERR_TUNNEL_CONNECTION_FAILED)', () => {
  // O Chromium não aceita credencial no --proxy-server e a auth por desafio (page.authenticate)
  // falha com proxies que fecham a conexão no 407 do CONNECT (Webshare em produção, 13/08). O
  // doStart anonimiza o proxy num forwarder local; aqui provamos o contrato da dep no NOSSO
  // runtime: URL local SEM credencial (o Chromium aceita) e porta liberada no close (teardown).
  it('anonymizeProxy devolve URL local sem credencial e closeAnonymizedProxy libera a porta', async () => {
    const { anonymizeProxy, closeAnonymizedProxy } =
      await import('proxy-chain');
    const local = await anonymizeProxy('http://usr:pwd@127.0.0.1:9'); // upstream morto: só conecta on-demand
    expect(local).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/); // sem user:pass → utilizável no --proxy-server
    await expect(closeAnonymizedProxy(local, true)).resolves.toBe(true);
    // Segundo close = false (já fechado) — prova que o close é idempotente p/ o closeAnonProxy.
    await expect(closeAnonymizedProxy(local, true)).resolves.toBe(false);
  });
});

describe('userAgentFor — UA anti-flag estável por sessão (P-012)', () => {
  const clean = (fn: () => void) => {
    const prev = process.env.WWEBJS_USER_AGENT;
    delete process.env.WWEBJS_USER_AGENT;
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.WWEBJS_USER_AGENT;
      else process.env.WWEBJS_USER_AGENT = prev;
    }
  };

  it('é DETERMINÍSTICO por sessão (mesmo id → mesmo UA entre reconexões)', () => {
    clean(() => {
      expect(userAgentFor('sessao-A')).toBe(userAgentFor('sessao-A'));
    });
  });

  it('é um UA de Chrome/Linux plausível e recente (não o Chrome/101 default do wwebjs)', () => {
    clean(() => {
      const ua = userAgentFor('qualquer');
      expect(ua).toMatch(
        /^Mozilla\/5\.0 \(X11; Linux x86_64\).*Chrome\/14[456]\.0\.0\.0 Safari\/537\.36$/,
      );
      expect(ua).not.toMatch(/Chrome\/101/);
    });
  });

  it('varia entre sessões diferentes (frota não usa UA idêntico)', () => {
    clean(() => {
      const uas = new Set(
        ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map(userAgentFor),
      );
      expect(uas.size).toBeGreaterThan(1);
    });
  });

  it('WWEBJS_USER_AGENT força um override global explícito', () => {
    const prev = process.env.WWEBJS_USER_AGENT;
    process.env.WWEBJS_USER_AGENT = 'UA-CUSTOM/1.0';
    try {
      expect(userAgentFor('a')).toBe('UA-CUSTOM/1.0');
      expect(userAgentFor('b')).toBe('UA-CUSTOM/1.0');
    } finally {
      if (prev === undefined) delete process.env.WWEBJS_USER_AGENT;
      else process.env.WWEBJS_USER_AGENT = prev;
    }
  });
});

describe('raceStoreOp + withStoreReady com teto (P-014 — página do Store travada)', () => {
  // Acesso ao método privado com timeouts injetados (defaults de produção são 10s/45s).
  type StoreReady = {
    withStoreReady<T>(
      fn: () => Promise<T>,
      attempts?: number,
      delayMs?: number,
      opTimeoutMs?: number,
      probeTimeoutMs?: number,
    ): Promise<T>;
    client: unknown;
    lastLoadingPct: number | null;
  };
  const asStore = (e: WWebJSEngine) => e as unknown as StoreReady;
  const hang = () => new Promise<never>(() => undefined);

  it('raceStoreOp: operação rápida passa; pendurada estoura com mensagem acionável + teto', async () => {
    await expect(raceStoreOp(Promise.resolve(42), 50, 'x')).resolves.toBe(42);
    await expect(
      raceStoreOp(hang(), 20, 'Operação X não respondeu'),
    ).rejects.toThrow(/Operação X não respondeu \(teto de \d+s\)/);
  });

  it('raceStoreOp: rejeição TARDIA da promise órfã é engolida (sem unhandled rejection)', async () => {
    let rejectLate!: (e: Error) => void;
    const op = new Promise<never>((_, rej) => (rejectLate = rej));
    await expect(raceStoreOp(op, 10, 'y')).rejects.toThrow(/teto/);
    rejectLate(new Error('tarde demais'));
    // Se a rejeição tardia NÃO fosse engolida, o vitest derrubaria o arquivo com unhandled rejection.
    await new Promise((r) => setTimeout(r, 20));
  });

  it('probe detecta página que não responde ANTES da operação pesada (fn nem é chamado)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    asStore(engine).client = { getState: () => hang() };
    let fnCalled = false;
    await expect(
      asStore(engine).withStoreReady(
        async () => {
          fnCalled = true;
          return 1;
        },
        1,
        1,
        100,
        20,
      ),
    ).rejects.toThrow(
      /Página do WhatsApp Web não responde.*P-014.*Recuperação automática disparada/,
    );
    expect(fnCalled).toBe(false);
  });

  it('operação pendurada estoura o teto próprio (não os 240s do CDP) SEM retry', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    asStore(engine).client = { getState: async () => 'CONNECTED' };
    let calls = 0;
    await expect(
      asStore(engine).withStoreReady(
        () => {
          calls++;
          return hang();
        },
        8,
        1,
        20,
        100,
      ),
    ).rejects.toThrow(/Operação no WhatsApp Web não respondeu/);
    expect(calls).toBe(1); // teto estourado NÃO reintenta — evita empilhar chamadas CDP órfãs
  });

  it('retry do Store-ainda-injetando continua funcionando (regressão do fluxo original)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    asStore(engine).client = { getState: async () => 'CONNECTED' };
    let calls = 0;
    const result = await asStore(engine).withStoreReady(
      async () => {
        calls++;
        if (calls === 1)
          throw new Error(
            "Evaluation failed: Cannot read properties of undefined (reading 'getChats')",
          );
        return 42;
      },
      3,
      1,
      100,
      100,
    );
    expect(result).toBe(42);
    expect(calls).toBe(2);
  });

  it('mensagem de erro inclui o percent do loading_screen quando houve progresso (diagnóstico)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    asStore(engine).client = { getState: () => hang() };
    asStore(engine).lastLoadingPct = 37;
    await expect(
      asStore(engine).withStoreReady(async () => 1, 1, 1, 100, 20),
    ).rejects.toThrow(/sincronização vista em 37%/);
  });

  it('sem client: comportamento antigo preservado (probe não roda, erro "Sessão não conectada")', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    await expect(engine.listChats(5)).rejects.toThrow('Sessão não conectada');
  });
});

describe('resolveParticipantsBatch SEM getContacts + auto-heal (P-014, 14/08)', () => {
  type EngineInternals = {
    client: unknown;
    lastHealAt: number;
    withStoreReady<T>(
      fn: () => Promise<T>,
      attempts?: number,
      delayMs?: number,
      opTimeoutMs?: number,
      probeTimeoutMs?: number,
    ): Promise<T>;
    resolveParticipantsBatch(
      list: unknown[],
    ): Promise<
      { id: string; role: string; phone: string | null; name: string | null }[]
    >;
  };
  const internals = (e: WWebJSEngine) => e as unknown as EngineInternals;
  const participant = (id: string, server: string) => ({
    id: { _serialized: id, server, user: id.split('@')[0] },
    isAdmin: false,
    isSuperAdmin: false,
  });

  it('participantes resolvem phone/nome SEM chamar getContacts (getContacts ausente no client não explode)', async () => {
    const { deps } = makeDeps({
      contacts: {
        record: () => undefined,
        recordMany: () => undefined,
        loadLidMap: async () => [],
        resolveNames: async (keys: string[]) =>
          new Map(
            keys
              .filter((k) => k === '5511888@c.us')
              .map((k) => [k, { name: 'Fulano Agenda', pushName: null }]),
          ),
      },
    } as never);
    const engine = new WWebJSEngine(deps);
    // client SEM getContacts/getContactById: se o caminho antigo existisse, TypeError na hora.
    internals(engine).client = {
      getContactLidAndPhone: async (lids: string[]) =>
        lids.map((lid) => ({ lid, pn: '5511777000111@c.us' })),
    };
    const out = await internals(engine).resolveParticipantsBatch([
      participant('5511888@c.us', 'c.us'),
      participant('9999000111222@lid', 'lid'),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ phone: '5511888', name: 'Fulano Agenda' });
    expect(out[1]).toMatchObject({ phone: '5511777000111' }); // @lid resolvido pelo LOTE oficial
  });

  it('probe de página morta dispara o auto-heal (pupPage.reload) com cooldown single-flight', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    let reloads = 0;
    internals(engine).client = {
      getState: () => new Promise(() => undefined), // página presa
      pupPage: {
        reload: async () => {
          reloads++;
        },
      },
    };
    await expect(
      internals(engine).withStoreReady(async () => 1, 1, 1, 100, 20),
    ).rejects.toThrow(/Recuperação automática disparada/);
    await new Promise((r) => setTimeout(r, 20)); // o heal roda em background
    expect(reloads).toBe(1);
    // Dentro do cooldown: novo probe-timeout NÃO re-dispara o reload.
    await expect(
      internals(engine).withStoreReady(async () => 1, 1, 1, 100, 20),
    ).rejects.toThrow(/não responde/);
    await new Promise((r) => setTimeout(r, 20));
    expect(reloads).toBe(1);
    // Cooldown vencido: dispara de novo.
    internals(engine).lastHealAt = Date.now() - 300_000;
    await expect(
      internals(engine).withStoreReady(async () => 1, 1, 1, 100, 20),
    ).rejects.toThrow(/não responde/);
    await new Promise((r) => setTimeout(r, 20));
    expect(reloads).toBe(2);
  });
});

describe('WWebJSEngine — shutdown limpo do processo (P-015)', () => {
  // QR a cada troca de container: o stop() serializado ficava atrás de uma operação pendurada no
  // mutex de ciclo de vida, o teto de 15s do onModuleDestroy estourava e o Chromium levava SIGKILL
  // no meio de escritas do perfil (LocalAuth sujo → WhatsApp exige QR). shutdown() fecha por fora
  // do mutex; o marcador "fechado limpo" torna a hipótese observável em prod.
  type Lifecycle = {
    client: unknown;
    serialize<T>(fn: () => Promise<T>): Promise<T>;
    logoutTimeoutMs: number;
    destroyTimeoutMs: number;
    consumeCleanShutdownMarker(): Promise<void>;
  };
  const internals = (e: WWebJSEngine) => e as unknown as Lifecycle;
  const captureLogger = () => {
    const warns: string[] = [];
    const infos: string[] = [];
    const push =
      (arr: string[]) =>
      (...args: unknown[]) => {
        arr.push(args.map(String).join(' '));
      };
    const noop = () => undefined;
    return {
      warns,
      infos,
      logger: {
        info: push(infos),
        warn: push(warns),
        error: noop,
        debug: noop,
        fatal: noop,
        trace: noop,
      } as unknown as BaileysEngineDeps['logger'],
    };
  };

  it('shutdown() fecha o Chromium POR FORA do mutex (fila de ciclo de vida presa não impede o destroy)', async () => {
    const { deps } = makeDeps({});
    const engine = new WWebJSEngine(deps);
    let destroyed = 0;
    internals(engine).client = {
      destroy: async () => {
        destroyed++;
      },
    };
    // Prende a fila (simula um logout pendurado numa página travada). Um stop() serializado
    // ficaria atrás disto para sempre — o shutdown() não pode.
    void internals(engine).serialize(() => new Promise(() => undefined));
    await engine.shutdown();
    expect(destroyed).toBe(1);
  });

  it('shutdown() com destroy pendurado estoura o teto próprio e RESOLVE (não pendura o grace period)', async () => {
    const { warns, logger } = captureLogger();
    const { deps } = makeDeps({ logger });
    const engine = new WWebJSEngine(deps);
    internals(engine).destroyTimeoutMs = 20;
    internals(engine).client = { destroy: () => new Promise(() => undefined) };
    await expect(engine.shutdown()).resolves.toBeUndefined();
    // Estouro é logado como warn citando a P-015 — o diagnóstico em prod depende disto.
    expect(warns.join('\n')).toMatch(/P-015/);
  });

  it('destroy limpo grava o marcador no perfil; o start seguinte o consome SEM warn de sujo', async () => {
    const id = `test-p015-${Math.random().toString(36).slice(2)}`;
    const dir = authDirOf(id);
    await mkdir(dir, { recursive: true });
    try {
      const { deps } = makeDeps({ sessionId: id });
      const engine = new WWebJSEngine(deps);
      internals(engine).client = { destroy: async () => undefined };
      await engine.shutdown();
      await expect(
        access(join(dir, CLEAN_SHUTDOWN_MARKER)),
      ).resolves.toBeUndefined();

      const { warns, logger } = captureLogger();
      const { deps: deps2 } = makeDeps({ sessionId: id, logger });
      const engine2 = new WWebJSEngine(deps2);
      await internals(engine2).consumeCleanShutdownMarker();
      expect(warns).toHaveLength(0); // fechado limpo → sem warn
      // Marcador é consumido (removido): se ESTA execução morrer suja, o próximo start detecta.
      await expect(
        access(join(dir, CLEAN_SHUTDOWN_MARKER)),
      ).rejects.toBeTruthy();

      // Perfil presente SEM marcador = encerramento sujo → warn com P-015.
      await internals(engine2).consumeCleanShutdownMarker();
      expect(warns.join('\n')).toMatch(/P-015/);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  it('shutdown() sem client aberto NÃO grava o marcador (não mascara um fechamento sujo anterior)', async () => {
    const id = `test-p015-noclient-${Math.random().toString(36).slice(2)}`;
    const dir = authDirOf(id);
    await mkdir(dir, { recursive: true });
    try {
      const { deps } = makeDeps({ sessionId: id });
      const engine = new WWebJSEngine(deps);
      await engine.shutdown();
      await expect(
        access(join(dir, CLEAN_SHUTDOWN_MARKER)),
      ).rejects.toBeTruthy();
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  it('logout() numa página travada estoura o teto do client.logout() e segue para destroy+purga', async () => {
    const { warns, logger } = captureLogger();
    const { deps, events } = makeDeps({ logger });
    const engine = new WWebJSEngine(deps);
    let destroyed = 0;
    internals(engine).logoutTimeoutMs = 20;
    internals(engine).client = {
      logout: () => new Promise(() => undefined), // evaluates pendurados na página travada
      destroy: async () => {
        destroyed++;
      },
    };
    await engine.logout(); // antes do teto, pendurava 240s segurando o mutex ("Logout/Parar presos")
    expect(destroyed).toBe(1);
    expect(warns.join('\n')).toMatch(/logout\(\) não completou/);
    expect(events.at(-1)?.status).toBe('STOPPED');
  });
});

describe('patch `$1` do WhatsApp Web aplicado na lib (B-002)', () => {
  // O WA Web ≥2.3000.104x renomeou `_serialized` → `$1` nas message keys; sem o patch
  // (patches/whatsapp-web.js+1.34.7.patch, aplicado pelo postinstall via patch-package) a lib
  // quebra em getChats/sendMessage/downloadMedia nas builds novas. Este teste falha ALTO se o
  // install rodou sem aplicar o patch (ex.: patches/ fora do COPY do Dockerfile).
  it('Utils.js instalado contém o helper getMsgKeyId e Puppeteer.js o guard de exposeFunction', async () => {
    const { createRequire } = await import('node:module');
    const { readFile } = await import('node:fs/promises');
    const { dirname, join: joinPath } = await import('node:path');
    const req = createRequire(import.meta.url);
    const libRoot = dirname(req.resolve('whatsapp-web.js/package.json'));
    const utils = await readFile(
      joinPath(libRoot, 'src/util/Injected/Utils.js'),
      'utf8',
    );
    expect(utils).toContain('window.WWebJS.getMsgKeyId');
    expect(utils).toContain('key?._serialized ?? key?.$1');
    const pup = await readFile(
      joinPath(libRoot, 'src/util/Puppeteer.js'),
      'utf8',
    );
    expect(pup).toMatch(/already exists/);
  });
});
