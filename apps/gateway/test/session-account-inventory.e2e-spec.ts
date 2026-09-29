import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { SessionAccountInventoryDto } from '@whatsapp-gateway/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Prisma, PrismaService } from '../src/infra/prisma/prisma.service';
import { newId } from '../src/shared-kernel/ulid';
import { createTestApp, fakeSessionManager, inject } from './setup-app';

// AppModule/auth/rota/SQL reais; SessionManager falso impede reidratação/WhatsApp.
// JSON de credenciais é sintético. Limpeza só pelos IDs criados neste spec.
describe('E20 — inventário seguro de contas por HTTP/Postgres', () => {
  const prefix = `e20-inventory-${newId()}`;
  const sentinel = 'E20-AUTH-FIXTURE-MUST-NOT-LEAK';
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let unsupportedRole: string;
  let namedSessionId: string;
  const ids: string[] = [];
  const start = vi.fn(fakeSessionManager.start);
  const checkNumbers = vi.fn(fakeSessionManager.checkNumbers);
  const sendText = vi.fn(fakeSessionManager.sendText);
  const manager = { ...fakeSessionManager, start, checkNumbers, sendText };
  const fixtures: {
    label: string;
    platform: Prisma.InputJsonValue | null;
    engine?: 'BAILEYS' | 'WWEBJS';
  }[] = [
    { label: 'business-android', platform: 'smba' },
    { label: 'business-iphone', platform: 'smbi' },
    { label: 'personal-android', platform: 'android' },
    { label: 'personal-iphone', platform: 'iphone' },
    { label: 'ios-ambiguous', platform: 'ios' },
    { label: 'future', platform: 'future-platform' },
    { label: 'missing', platform: null },
    { label: 'object', platform: { private: sentinel } },
    { label: 'number', platform: 12 },
    { label: 'empty', platform: '' },
    { label: 'oversize', platform: 'x'.repeat(65) },
    { label: 'wwebjs-old-auth', platform: 'smba', engine: 'WWEBJS' },
  ];

  const id = (label: string) => `${prefix}-${label}`;
  const auth = () => ({ authorization: `Bearer ${token}` });
  const inventory = () =>
    inject(app, {
      method: 'GET',
      url: '/api/sessions/account-inventory/snapshot',
      headers: auth(),
    });
  const ownRows = (dto: SessionAccountInventoryDto) =>
    dto.sessions.filter((row) => ids.includes(row.sessionId));

  beforeAll(async () => {
    app = await createTestApp(manager);
    prisma = app.get(PrismaService);
    token = await app.get(JwtService).signAsync({
      sub: `${prefix}-viewer`,
      username: `${prefix}-viewer`,
      role: 'VIEWER',
    });
    unsupportedRole = await app.get(JwtService).signAsync({
      sub: `${prefix}-invalid-role`,
      username: `${prefix}-invalid-role`,
      role: 'INVALID',
    });
    for (const fixture of fixtures) {
      const fixtureId = id(fixture.label);
      await prisma.waSession.create({
        data: {
          id: fixtureId,
          name: fixtureId,
          engine: fixture.engine ?? 'BAILEYS',
          autostart: false,
          creds: {
            ...(fixture.platform === null
              ? {}
              : { platform: fixture.platform }),
            noiseKey: { private: sentinel },
            advSecretKey: sentinel,
          },
          // Fingerprint do navegador é um SO e não participa da classificação.
          metadata: { device: { platform: 'android' } },
        },
      });
      ids.push(fixtureId);
    }
    // Nome permitido no contrato anterior. Preserva eventual linha de dev já existente.
    const namedSession = await prisma.waSession.findUnique({
      where: { name: 'account-inventory' },
      select: { id: true },
    });
    namedSessionId = namedSession?.id ?? id('reserved-name-regression');
    if (!namedSession) {
      await prisma.waSession.create({
        data: {
          id: namedSessionId,
          name: 'account-inventory',
          autostart: false,
        },
      });
      ids.push(namedSessionId);
    }
  });

  afterAll(async () => {
    if (prisma && ids.length)
      await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    await app?.close();
  });

  it('exige autenticação e respeita VIEWER sem iniciar ou consultar engine', async () => {
    const unauthorized = await inject(app, {
      method: 'GET',
      url: '/api/sessions/account-inventory/snapshot',
    });
    expect(unauthorized.statusCode).toBe(401);
    const forbidden = await inject(app, {
      method: 'GET',
      url: '/api/sessions/account-inventory/snapshot',
      headers: { authorization: `Bearer ${unsupportedRole}` },
    });
    expect(forbidden.statusCode).toBe(403);
    expect((await inventory()).statusCode).toBe(200);
    expect(start).not.toHaveBeenCalled();
    expect(checkNumbers).not.toHaveBeenCalled();
    expect(sendText).not.toHaveBeenCalled();
  });

  it('resolve a rota estática sem perder GET /sessions/:id existente', async () => {
    const detail = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${id('personal-android')}`,
      headers: auth(),
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ id: id('personal-android') });
    const response = await inventory();
    expect(response.statusCode).toBe(200);
    expect(ownRows(response.json())).toHaveLength(ids.length);
    const namedDetail = await inject(app, {
      method: 'GET',
      url: '/api/sessions/account-inventory',
      headers: auth(),
    });
    expect(namedDetail.statusCode).toBe(200);
    expect(namedDetail.json()).toMatchObject({
      id: namedSessionId,
      name: 'account-inventory',
    });
  });

  it('classifica marcadores de pareamento pessoal/Business sem supor ios ou WWEBJS', async () => {
    const response = await inventory();
    expect(response.statusCode).toBe(200);
    const dto = response.json() as SessionAccountInventoryDto;
    const rows = ownRows(dto);
    const byLabel = (label: string) =>
      rows.find((row) => row.sessionId === id(label));
    for (const label of ['business-android', 'business-iphone'])
      expect(byLabel(label)).toMatchObject({
        accountType: 'BUSINESS',
        source: 'baileys.creds.platform',
      });
    for (const label of ['personal-android', 'personal-iphone'])
      expect(byLabel(label)).toMatchObject({
        accountType: 'PERSONAL',
        source: 'baileys.creds.platform',
      });
    expect(byLabel('ios-ambiguous')).toMatchObject({
      accountType: 'UNKNOWN',
      platform: 'ios',
    });
    expect(byLabel('future')).toMatchObject({ accountType: 'UNKNOWN' });
    expect(byLabel('wwebjs-old-auth')).toMatchObject({
      accountType: 'UNKNOWN',
      platform: null,
      source: 'unavailable',
    });
    for (const kind of ['PERSONAL', 'BUSINESS', 'UNKNOWN'] as const)
      expect(dto.totals[kind]).toBe(
        dto.sessions.filter((row) => row.accountType === kind).length,
      );
  });

  it('projeta somente escalar seguro e nunca devolve o JSON das credenciais', async () => {
    const response = await inventory();
    expect(response.statusCode).toBe(200);
    expect(response.body.includes(sentinel)).toBe(false);
    expect(response.body.includes('noiseKey')).toBe(false);
    expect(response.body.includes('advSecretKey')).toBe(false);
    const rows = ownRows(response.json());
    for (const label of ['missing', 'object', 'number', 'empty', 'oversize'])
      expect(rows.find((row) => row.sessionId === id(label))).toMatchObject({
        accountType: 'UNKNOWN',
        platform: null,
        source: 'unavailable',
      });
    for (const row of rows)
      expect(Object.keys(row).sort()).toEqual([
        'accountType',
        'engine',
        'name',
        'platform',
        'sessionId',
        'source',
      ]);
    expect(start).not.toHaveBeenCalled();
    expect(checkNumbers).not.toHaveBeenCalled();
    expect(sendText).not.toHaveBeenCalled();
  });
});
