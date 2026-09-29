import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../infra/prisma/prisma.service';
import { SessionAccountInventoryService } from './session-account-inventory.service';

describe('E20 — inventário da aplicação com evidência local', () => {
  it('classifica os quatro marcadores de app e deixa ios/ausência em UNKNOWN', async () => {
    const $queryRaw = vi.fn(async () => [
      { id: 'b-a', name: 'fixture-a', engine: 'BAILEYS', platform: 'smba' },
      { id: 'b-i', name: 'fixture-i', engine: 'BAILEYS', platform: 'smbi' },
      {
        id: 'android',
        name: 'fixture-os',
        engine: 'BAILEYS',
        platform: 'android',
      },
      {
        id: 'iphone',
        name: 'fixture-phone',
        engine: 'BAILEYS',
        platform: 'iphone',
      },
      { id: 'ios', name: 'fixture-ios', engine: 'BAILEYS', platform: 'ios' },
      { id: 'none', name: 'fixture-none', engine: 'BAILEYS', platform: null },
      { id: 'web', name: 'fixture-web', engine: 'WWEBJS', platform: 'smba' },
    ]);
    const service = new SessionAccountInventoryService({
      $queryRaw,
    } as unknown as PrismaService);
    const snapshot = await service.snapshot();

    expect(snapshot.totals).toEqual({ PERSONAL: 2, BUSINESS: 2, UNKNOWN: 3 });
    expect(snapshot.sessions.map((row) => row.accountType)).toEqual([
      'BUSINESS',
      'BUSINESS',
      'PERSONAL',
      'PERSONAL',
      'UNKNOWN',
      'UNKNOWN',
      'UNKNOWN',
    ]);
    expect(snapshot.sessions[0]).toEqual({
      sessionId: 'b-a',
      name: 'fixture-a',
      engine: 'BAILEYS',
      accountType: 'BUSINESS',
      platform: 'smba',
      source: 'baileys.creds.platform',
    });
    expect(snapshot.sessions.at(-1)).toMatchObject({
      platform: null,
      source: 'unavailable',
      accountType: 'UNKNOWN',
    });
    expect($queryRaw).toHaveBeenCalledOnce();
  });

  it('não transforma plataforma desconhecida ou casing inventado em conta pessoal', async () => {
    const service = new SessionAccountInventoryService({
      $queryRaw: vi.fn(async () => [
        { id: 'other', name: 'fixture', engine: 'BAILEYS', platform: 'SMBA' },
        {
          id: 'future',
          name: 'fixture2',
          engine: 'BAILEYS',
          platform: 'future',
        },
      ]),
    } as unknown as PrismaService);
    const snapshot = await service.snapshot();
    expect(snapshot.totals).toEqual({ PERSONAL: 0, BUSINESS: 0, UNKNOWN: 2 });
    expect(
      snapshot.sessions.every((row) => row.accountType === 'UNKNOWN'),
    ).toBe(true);
  });
});
