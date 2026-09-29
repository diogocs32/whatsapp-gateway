import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupsController } from '../src/modules/groups/interface/groups.controller';
import type { GroupInfo } from '../src/modules/sessions/application/engine.port';
import type { SessionManager } from '../src/modules/sessions/application/session-manager.service';
import {
  BaileysEngine,
  type BaileysEngineDeps,
} from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { WWebJSEngine } from '../src/modules/sessions/infrastructure/wwebjs/wwebjs.engine';

// P-061/E20: A/B informativo do MESMO roster sintético no código real das engines e /leads.
// Nunca start: socket, Client/Store, agenda e mapping são fixtures locais em memória.
// Os resultados não demonstram completude de roster/permissões de um grupo real.
const GROUP = 'e20-grupo-fixture@g.us';
const SUBJECT = 'E20 — grupo sintético';
const MEMBER = '19990000001';
const ADMIN = '19990000002';
const LOCAL = '19990000003';
const ADMIN_LID = '800000001@lid';
const LOCAL_LID = '800000002@lid';
const UNKNOWN_LID = '800000003@lid';

function wid(id: string) {
  const [user, server] = id.split('@');
  return { _serialized: id, user, server };
}

function harness(mode: 'pn' | 'lid', richerWwebjs = false) {
  const names = new Map([
    [MEMBER, { name: 'Membro sintético', pushName: null }],
    [ADMIN, { name: 'Admin sintético', pushName: null }],
    [LOCAL, { name: null, pushName: 'Nome de fixture local' }],
    [UNKNOWN_LID, { name: null, pushName: 'LID sem telefone' }],
  ]);
  const contacts = {
    record: vi.fn(),
    recordMany: vi.fn(),
    resolveNames: vi.fn(async () => names),
  };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
  const deps = (sessionId: string) =>
    ({
      sessionId,
      deviceName: 'fixture',
      logger,
      onEvent: vi.fn(),
      contacts,
      prisma: {},
    }) as unknown as BaileysEngineDeps;

  const baileys = new BaileysEngine(deps('e20-baileys-fixture'));
  const wwebjs = new WWebJSEngine(deps('e20-wwebjs-fixture'));
  // Torna qualquer tentativa acidental de iniciar conta explícita antes de abrir transporte.
  const startBaileys = vi
    .spyOn(baileys, 'start')
    .mockRejectedValue(new Error('Este A/B usa somente fixtures'));
  const startWwebjs = vi
    .spyOn(wwebjs, 'start')
    .mockRejectedValue(new Error('Este A/B usa somente fixtures'));

  const metadata = {
    id: GROUP,
    subject: SUBJECT,
    addressingMode: mode,
    owner: `${ADMIN}@s.whatsapp.net`,
    participants: [
      { id: `${MEMBER}@s.whatsapp.net`, admin: null },
      mode === 'lid'
        ? {
            id: ADMIN_LID,
            phoneNumber: `${ADMIN}@s.whatsapp.net`,
            admin: 'admin',
          }
        : { id: `${ADMIN}@s.whatsapp.net`, admin: 'admin' },
      mode === 'lid' ? { id: LOCAL_LID } : { id: `${LOCAL}@s.whatsapp.net` },
      { id: UNKNOWN_LID },
    ],
  };
  const groupMetadata = vi.fn(async () => metadata);
  const localMappings = vi.fn(async () =>
    mode === 'lid' && !richerWwebjs
      ? [{ lid: LOCAL_LID, pn: `${LOCAL}@s.whatsapp.net` }]
      : null,
  );
  const socket = {
    user: { id: `${MEMBER}@s.whatsapp.net` },
    groupMetadata,
    signalRepository: { lidMapping: { getPNsForLIDs: localMappings } },
  };
  (baileys as unknown as { sock: unknown }).sock = socket;

  const chat = {
    id: wid(GROUP),
    name: SUBJECT,
    isGroup: true,
    owner: wid(`${ADMIN}@c.us`),
    participants: metadata.participants.map((participant) => ({
      id: wid(participant.id.replace('@s.whatsapp.net', '@c.us')),
      isAdmin: participant.admin === 'admin',
      isSuperAdmin: false,
    })),
  };
  const getContactLidAndPhone = vi.fn(async (lids: string[]) =>
    lids.map((lid) => ({
      lid,
      pn:
        lid === ADMIN_LID
          ? `${ADMIN}@c.us`
          : lid === LOCAL_LID
            ? `${LOCAL}@c.us`
            : undefined,
    })),
  );
  const getChatById = vi.fn(async () => chat);
  const client = {
    info: { wid: wid(`${MEMBER}@c.us`) },
    getState: vi.fn(async () => 'CONNECTED'),
    getChatById,
    getContactLidAndPhone,
  };
  (wwebjs as unknown as { client: unknown }).client = client;

  const leadsFor = (engine: { groupInfo(jid: string): Promise<GroupInfo> }) =>
    new GroupsController({
      groupInfo: async (_id: string, jid: string) => engine.groupInfo(jid),
    } as unknown as SessionManager);
  return {
    a: leadsFor(baileys),
    b: leadsFor(wwebjs),
    metadata,
    contacts,
    localMappings,
    groupMetadata,
    getChatById,
    getContactLidAndPhone,
    startBaileys,
    startWwebjs,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('P-061/E20 — A/B de leads exclusivamente com fixtures', () => {
  it.each(['pn', 'lid'] as const)(
    'compara o mesmo grupo %s com conta membro, preservando filtro e contrato',
    async (mode) => {
      const h = harness(mode);
      const a = await h.a.leads('a', GROUP);
      const b = await h.b.leads('b', GROUP);

      expect(h.metadata.participants[0]?.admin).toBeNull();
      expect(h.metadata.addressingMode).toBe(mode);
      expect(a).toEqual(b);
      expect(a).toEqual({
        groupId: GROUP,
        subject: SUBJECT,
        total: 4,
        withNumber: 3,
        withoutNumber: 1,
        leads: [
          { phone: MEMBER, name: 'Membro sintético', role: 'member' },
          { phone: ADMIN, name: 'Admin sintético', role: 'admin' },
          { phone: LOCAL, name: 'Nome de fixture local', role: 'member' },
        ],
      });
      expect(h.groupMetadata).toHaveBeenCalledWith(GROUP);
      expect(h.getChatById).toHaveBeenCalledWith(GROUP);
      expect(h.startBaileys).not.toHaveBeenCalled();
      expect(h.startWwebjs).not.toHaveBeenCalled();
    },
  );

  it('all=true/1 conserva LID sem telefone e nunca inventa seu número', async () => {
    const h = harness('lid');
    const a = await h.a.leads('a', GROUP, 'true');
    const b = await h.b.leads('b', GROUP, '1');
    expect(a).toEqual(b);
    expect(a.leads).toHaveLength(4);
    expect(a.leads.at(-1)).toEqual({
      phone: null,
      name: 'LID sem telefone',
      role: 'member',
    });
    expect(h.localMappings).toHaveBeenCalledWith([LOCAL_LID, UNKNOWN_LID]);
    expect(h.getContactLidAndPhone).toHaveBeenCalledWith([
      ADMIN_LID,
      LOCAL_LID,
      UNKNOWN_LID,
    ]);
    expect(h.startBaileys).not.toHaveBeenCalled();
    expect(h.startWwebjs).not.toHaveBeenCalled();
  });

  it('mostra diferença de cobertura quando só o Store fixture conhece um par LID', async () => {
    const h = harness('lid', true);
    const a = await h.a.leads('a', GROUP);
    const b = await h.b.leads('b', GROUP);
    expect(a).toMatchObject({ total: 4, withNumber: 2, withoutNumber: 2 });
    expect(b).toMatchObject({ total: 4, withNumber: 3, withoutNumber: 1 });
    expect(a.leads.map((lead) => lead.phone)).toEqual([MEMBER, ADMIN]);
    expect(b.leads.map((lead) => lead.phone)).toEqual([MEMBER, ADMIN, LOCAL]);
    expect(h.startBaileys).not.toHaveBeenCalled();
    expect(h.startWwebjs).not.toHaveBeenCalled();
  });
});
