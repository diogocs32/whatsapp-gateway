import { RequestMethod } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { buildFastifyAdapter } from '../src/bootstrap/fastify-adapter';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { SessionManager } from '../src/modules/sessions/application/session-manager.service';

// Stub do SessionManager — evita conexão real com o WhatsApp (Baileys) nos testes
// e não tem onApplicationBootstrap, então não dispara reidratação.
export const fakeSessionManager = {
  start: async () => undefined,
  stop: async () => undefined,
  restart: async () => undefined,
  logout: async () => undefined,
  remove: async () => undefined,
  getQr: () => null,
  requestPairingCode: async () => '12345678',
  sendText: async () => ({
    keyId: 'fake-key',
    jid: '5511999999999@s.whatsapp.net',
  }),
  sendMedia: async () => ({
    keyId: 'fake-media',
    jid: '5511999999999@s.whatsapp.net',
  }),
  sendPresence: async () => undefined,
  // F5 — grupos / contatos / canais
  listGroups: async () => [],
  groupInfo: async () => fakeGroup,
  createGroup: async () => fakeGroup,
  updateParticipants: async () => undefined,
  leaveGroup: async () => undefined,
  setGroupSubject: async () => undefined,
  setGroupDescription: async () => undefined,
  groupInviteCode: async () => 'FAKEINVITE',
  groupRevokeInvite: async () => 'NEWINVITE',
  checkNumbers: async (_id: string, numbers: string[]) =>
    numbers.map((n) => ({
      number: n,
      exists: true,
      jid: `${n.replace(/[^0-9]/g, '')}@s.whatsapp.net`,
    })),
  profilePicture: async () => null,
  setBlock: async () => undefined,
  createChannel: async () => fakeChannel,
  channelInfo: async () => fakeChannel,
  followChannel: async () => undefined,
  unfollowChannel: async () => undefined,
};

const fakeGroup = {
  id: '123-456@g.us',
  subject: 'Grupo Fake',
  owner: null,
  desc: null,
  size: 0,
  announce: false,
  restrict: false,
  participants: [],
};
const fakeChannel = {
  id: '123@newsletter',
  name: 'Canal Fake',
  description: null,
  subscribers: 0,
};

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SessionManager)
    .useValue(fakeSessionManager)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    buildFastifyAdapter(),
    { bodyParser: false },
  );
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

interface InjectOpts {
  method: string;
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
}

interface InjectResponse {
  statusCode: number;
  body: string;
  json: () => any;
}

export function inject(
  app: NestFastifyApplication,
  opts: InjectOpts,
): Promise<InjectResponse> {
  const instance = app.getHttpAdapter().getInstance() as unknown as {
    inject: (o: InjectOpts) => Promise<InjectResponse>;
  };
  return instance.inject(opts);
}

export async function login(app: NestFastifyApplication): Promise<string> {
  const res = await inject(app, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-type': 'application/json' },
    payload: { username: 'admin', password: 'admin123' },
  });
  return res.json().token as string;
}

// Cria (idempotente) uma sessão de teste DIRETO no DB. Bypassa o limite de licença do POST
// /sessions — os specs que exercem rotas /sessions/:id/... com o SessionManager mockado precisam
// de uma sessão real existente (o SessionRefPipe resolve por id OU nome, senão 404).
export async function seedSession(
  app: NestFastifyApplication,
  name: string,
): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.waSession.deleteMany({ where: { name } });
  await prisma.waSession.create({ data: { id: name, name } });
}

export async function removeSession(
  app: NestFastifyApplication,
  name: string,
): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.waSession.deleteMany({ where: { name } });
}
