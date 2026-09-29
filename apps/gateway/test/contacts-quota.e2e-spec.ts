import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { RedisService } from '../src/infra/redis/redis.service';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// Redis/Postgres reais, dois containers lógicos Nest, engines falsas. Telefones
// sintéticos nunca saem pela rede; limpeza restrita às sessões/chaves deste spec.
describe('E20 contacts/check — cota observada multi-réplica (e2e)', () => {
  const session = 'e20-quota-observe';
  const otherSession = 'e20-quota-other';
  const key = (id: string) => `wa:contacts-check:quota:${id}`;
  let app: NestFastifyApplication;
  let replica: NestFastifyApplication;
  let token: string;
  let replicaToken: string;
  let redis: RedisService;
  const originalSettings: Array<{
    config: ConfigService;
    limit: number;
    windowSeconds: number;
  }> = [];
  const originalLimit = process.env.CONTACT_CHECK_MAX_PER_WINDOW;
  const originalWindow = process.env.CONTACT_CHECK_WINDOW_SECONDS;
  const checkNumbers = vi.fn(fakeSessionManager.checkNumbers);
  const sendText = vi.fn(fakeSessionManager.sendText);
  const manager = { ...fakeSessionManager, checkNumbers, sendText };

  beforeAll(async () => {
    app = await createTestApp(manager);
    replica = await createTestApp(manager);
    for (const target of [app, replica]) {
      // AppModule valida env ao ser importado, antes do beforeAll. Override via
      // API pública do ConfigService, sem reimportar/reescrever a config global.
      const config = target.get(ConfigService);
      originalSettings.push({
        config,
        limit: config.get('CONTACT_CHECK_MAX_PER_WINDOW'),
        windowSeconds: config.get('CONTACT_CHECK_WINDOW_SECONDS'),
      });
      config.set('CONTACT_CHECK_MAX_PER_WINDOW', 3);
      config.set('CONTACT_CHECK_WINDOW_SECONDS', 60);
    }
    redis = app.get(RedisService);
    token = await login(app);
    replicaToken = await login(replica);
    await seedSession(app, session);
    await seedSession(app, otherSession);
  });

  beforeEach(async () => {
    await redis.client.del(key(session), key(otherSession));
    checkNumbers.mockClear();
    sendText.mockClear();
  });

  afterAll(async () => {
    await redis?.client.del(key(session), key(otherSession));
    if (app) {
      await removeSession(app, session);
      await removeSession(app, otherSession);
    }
    await replica?.close();
    await app?.close();
    for (const { config, limit, windowSeconds } of originalSettings.reverse()) {
      config.set('CONTACT_CHECK_MAX_PER_WINDOW', limit);
      config.set('CONTACT_CHECK_WINDOW_SECONDS', windowSeconds);
    }
    if (originalLimit === undefined)
      delete process.env.CONTACT_CHECK_MAX_PER_WINDOW;
    else process.env.CONTACT_CHECK_MAX_PER_WINDOW = originalLimit;
    if (originalWindow === undefined)
      delete process.env.CONTACT_CHECK_WINDOW_SECONDS;
    else process.env.CONTACT_CHECK_WINDOW_SECONDS = originalWindow;
  });

  const auth = (jwt = token) => ({
    authorization: `Bearer ${jwt}`,
    'content-type': 'application/json',
  });
  const check = (numbers: string[], target = app, id = session, jwt = token) =>
    inject(target, {
      method: 'POST',
      url: `/api/sessions/${id}/contacts/check`,
      headers: auth(jwt),
      payload: { numbers },
    });
  const snapshot = async (id = session) => {
    const response = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${id}/contacts/check-quota`,
      headers: auth(),
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  };

  it('GET aditivo requer auth e lê sem abrir janela', async () => {
    const denied = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${session}/contacts/check-quota`,
    });
    expect(denied.statusCode).toBe(401);
    expect(await snapshot()).toMatchObject({
      enabled: true,
      mode: 'observe',
      available: true,
      used: 0,
      remaining: 3,
      exceeded: false,
      retryAfterSeconds: 0,
    });
    expect(await redis.client.exists(key(session))).toBe(0);
  });

  it('default desligado preserva 201 e não cria contador Redis', async () => {
    const config = app.get(ConfigService);
    config.set('CONTACT_CHECK_MAX_PER_WINDOW', 0);
    try {
      const response = await check(['000000001']);
      expect(response.statusCode).toBe(201);
      expect(response.json()[0]).toMatchObject({
        number: '000000001',
        exists: true,
      });
      expect(await snapshot()).toMatchObject({
        enabled: false,
        mode: 'observe',
        available: true,
        used: null,
      });
      expect(await redis.client.exists(key(session))).toBe(0);
      expect(checkNumbers).toHaveBeenCalledTimes(1);
    } finally {
      config.set('CONTACT_CHECK_MAX_PER_WINDOW', 3);
    }
  });

  it('lote original/ordem/duplicados preservados; custo só normalizados distintos', async () => {
    const numbers = ['000000001', '+00 (000) 000-1', '000000002'];
    const response = await check(numbers);
    expect(response.statusCode).toBe(201);
    expect(
      response.json().map((row: { number: string }) => row.number),
    ).toEqual(numbers);
    expect(checkNumbers).toHaveBeenCalledWith(session, numbers);
    expect(await snapshot()).toMatchObject({ used: 2, remaining: 1 });
    expect(await redis.client.get(key(session))).toBe('2');
  });

  it('duas réplicas contam atomicamente e excesso mantém 201 sem restringir', async () => {
    const responses = await Promise.all([
      check(['000000001', '000000002']),
      check(['000000003', '000000004'], replica, session, replicaToken),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([
      201, 201,
    ]);
    expect(checkNumbers).toHaveBeenCalledTimes(2);
    expect(await snapshot()).toMatchObject({
      used: 4,
      remaining: 0,
      exceeded: true,
    });
    expect(await redis.client.get(key(session))).toBe('4');
    expect((await check(['000000001'])).statusCode).toBe(201);
    expect((await snapshot()).used).toBe(5);
  });

  it('cota é por id de sessão, sem contaminar outra sessão', async () => {
    await check(['000000001', '000000002']);
    await check(['000000001'], app, otherSession);
    expect((await snapshot()).used).toBe(2);
    expect((await snapshot(otherSession)).used).toBe(1);
  });

  it('requests sem auth/inválidos/sessão inexistente não contam', async () => {
    const unauthenticated = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${session}/contacts/check`,
      payload: { numbers: ['000000001'] },
    });
    expect(unauthenticated.statusCode).toBe(401);
    expect((await check([])).statusCode).toBe(400);
    expect(
      (await check(['000000001'], app, 'e20-quota-missing')).statusCode,
    ).toBe(404);
    expect(checkNumbers).not.toHaveBeenCalled();
    expect((await snapshot()).used).toBe(0);
  });

  it('snapshot/novos lotes não renovam TTL; expiração permite nova janela', async () => {
    await check(['000000001']);
    const initialTtl = await redis.client.pttl(key(session));
    await snapshot();
    await check(['000000002']);
    expect(await redis.client.pttl(key(session))).toBeLessThanOrEqual(
      initialTtl,
    );
    await redis.client.pexpire(key(session), 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await snapshot()).used).toBe(0);
    await check(['000000003']);
    expect((await snapshot()).used).toBe(1);
    expect(await redis.client.pttl(key(session))).toBeGreaterThan(59_000);
  });

  it('cota acima do limite não entra no envio explícito de mensagem', async () => {
    await check(['000000001', '000000002', '000000003', '000000004']);
    const response = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${session}/messages/text`,
      headers: auth(),
      payload: { to: '000000005', text: 'fixture sem rede' },
    });
    expect(response.statusCode).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);
    expect(checkNumbers).toHaveBeenCalledTimes(1);
    expect((await snapshot()).used).toBe(4);
  });

  it('falha do Redis publica indisponível e mantém consulta com engine falsa', async () => {
    const failure = vi
      .spyOn(redis.client, 'eval')
      .mockRejectedValue(new Error('Falha Redis sintética'));
    try {
      expect((await check(['000000001'])).statusCode).toBe(201);
      expect(checkNumbers).toHaveBeenCalledTimes(1);
      expect(await snapshot()).toMatchObject({
        enabled: true,
        available: false,
        used: null,
        exceeded: null,
      });
    } finally {
      failure.mockRestore();
    }
  });
});
