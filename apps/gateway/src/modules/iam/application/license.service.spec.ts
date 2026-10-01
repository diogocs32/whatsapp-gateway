import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type KeyObject, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../bootstrap/config';
import type { LicenseClaims } from '../domain/license';
import { LicenseService } from './license.service';

// Chave descartável: só a confiança pública é substituída; verifyLicense/Node crypto são reais.
const keys = vi.hoisted(() => ({ privateKey: null as KeyObject | null }));
vi.mock('../domain/license-key', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const generated = generateKeyPairSync('ed25519');
  keys.privateKey = generated.privateKey;
  return {
    LICENSE_PUBLIC_KEY_PEM: generated.publicKey.export({
      type: 'spki',
      format: 'pem',
    }),
  };
});

const NOW = new Date('2026-09-30T12:00:00.000Z');
const CLAIMS: LicenseClaims = {
  licenseId: 'synthetic-service-license',
  customer: 'Cliente sintético',
  maxSeats: 8,
  maxSessions: 12,
  features: ['synthetic-feature'],
  iat: NOW.getTime(),
  exp: null,
};

function token(claims: LicenseClaims = CLAIMS): string {
  if (!keys.privateKey) throw new Error('Chave sintética não inicializada');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `CZL1.${payload}.${sign(null, Buffer.from(payload), keys.privateKey).toString('base64url')}`;
}

function setup(stored: string | null = null, bootstrap?: string) {
  let persisted = stored;
  const repo = {
    get: vi.fn(async () => persisted),
    set: vi.fn(async (value: string) => {
      persisted = value;
    }),
    clear: vi.fn(async () => {
      persisted = null;
    }),
  };
  const config = new ConfigService<Env, true>({
    LICENSE_KEY: bootstrap,
    MAX_SEATS: 3,
    MAX_SESSIONS: 4,
  });
  return {
    repo,
    persisted: () => persisted,
    service: new LicenseService(repo, config),
  };
}

describe('LicenseService — licença assinada e efeitos locais', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('carrega os claims assinados do repositório antes do bootstrap do env', async () => {
    const signed = token();
    const { service, repo } = setup(
      signed,
      token({ ...CLAIMS, licenseId: 'bootstrap', maxSeats: 99 }),
    );
    await service.onModuleInit();

    expect(service.effective()).toEqual({
      ...CLAIMS,
      valid: true,
      community: false,
    });
    expect(repo.get).toHaveBeenCalledOnce();
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('usa LICENSE_KEY quando não há token persistido, sem gravar o bootstrap', async () => {
    const { service, repo } = setup(null, token());
    await expect(service.reload()).resolves.toEqual({
      ...CLAIMS,
      valid: true,
      community: false,
    });
    expect(repo.set).not.toHaveBeenCalled();
  });

  it.each([
    { stored: null, reason: 'sem licença' },
    { stored: 'inválido', reason: 'formato inválido' },
    { stored: '', reason: 'sem licença' },
  ])(
    'usa os limites configurados na comunidade: $reason ($stored)',
    async ({ stored, reason }) => {
      const { service } = setup(stored);
      await expect(service.reload()).resolves.toMatchObject({
        licenseId: 'community',
        valid: false,
        community: true,
        reason,
        maxSeats: 3,
        maxSessions: 4,
      });
    },
  );

  it.each([
    { stored: 'inválido', reason: 'formato inválido' },
    { stored: '', reason: 'sem licença' },
  ])(
    'token persistido $stored não é substituído por licença válida do env',
    async ({ stored, reason }) => {
      const { service } = setup(stored, token());
      await expect(service.reload()).resolves.toMatchObject({
        community: true,
        reason,
        maxSeats: 3,
      });
    },
  );

  it('instala token com espaços, persiste o token limpo e troca o cache', async () => {
    const { service, repo, persisted } = setup();
    await service.reload();
    const signed = token();
    const installed = await service.install(` \n${signed}\t `);

    expect(installed).toEqual({ ...CLAIMS, valid: true, community: false });
    expect(repo.set).toHaveBeenCalledExactlyOnceWith(signed);
    expect(persisted()).toBe(signed);
    expect(service.effective()).toBe(installed);
    expect(repo.get).toHaveBeenCalledOnce();
  });

  it.each([
    ['formato inválido', () => 'inválido'],
    [
      'assinatura inválida',
      () => `${token().split('.').slice(0, 2).join('.')}.AA`,
    ],
    ['licença expirada', () => token({ ...CLAIMS, exp: NOW.getTime() - 1 })],
  ])(
    'rejeita %s antes de persistir ou substituir a licença em cache',
    async (reason, rejected) => {
      const installed = token();
      const { service, repo, persisted } = setup(installed);
      const previous = await service.reload();

      const installation = service.install(rejected());
      await expect(installation).rejects.toThrow(BadRequestException);
      await expect(installation).rejects.toThrow(`Licença inválida: ${reason}`);
      expect(repo.set).not.toHaveBeenCalled();
      expect(repo.clear).not.toHaveBeenCalled();
      expect(persisted()).toBe(installed);
      expect(service.effective()).toBe(previous);
    },
  );

  it('não substitui o cache se a persistência da instalação falhar', async () => {
    const { service, repo, persisted } = setup();
    const previous = await service.reload();
    repo.set.mockRejectedValueOnce(new Error('persistência indisponível'));

    await expect(service.install(token())).rejects.toThrow(
      'persistência indisponível',
    );
    expect(persisted()).toBeNull();
    expect(service.effective()).toBe(previous);
  });

  it('observa expiração no reload; effective mantém o cache entre recargas', async () => {
    const { service, repo } = setup(
      token({ ...CLAIMS, exp: NOW.getTime() + 1 }),
    );
    const licensed = await service.reload();
    vi.setSystemTime(NOW.getTime() + 2);

    expect(service.effective()).toBe(licensed);
    expect(service.effective().valid).toBe(true);
    expect(repo.get).toHaveBeenCalledOnce();
    await expect(service.reload()).resolves.toMatchObject({
      community: true,
      reason: 'licença expirada',
      maxSeats: 3,
      maxSessions: 4,
    });
  });

  it.each([undefined, 'bootstrap'])(
    'remove o persistido e recarrega usando env=%s',
    async (bootstrap) => {
      const fromEnv = { ...CLAIMS, licenseId: 'bootstrap', maxSeats: 20 };
      const { service, repo, persisted } = setup(
        token(),
        bootstrap ? token(fromEnv) : undefined,
      );
      await service.reload();

      const removed = await service.remove();
      expect(repo.clear).toHaveBeenCalledOnce();
      expect(persisted()).toBeNull();
      expect(repo.get).toHaveBeenCalledTimes(2);
      expect(service.effective()).toBe(removed);
      expect(removed).toMatchObject(
        bootstrap
          ? { ...fromEnv, valid: true, community: false }
          : { community: true, maxSeats: 3, maxSessions: 4 },
      );
    },
  );

  it('falha ao limpar não substitui o cache nem recarrega outra licença', async () => {
    const stored = token();
    const { service, repo, persisted } = setup(stored);
    const previous = await service.reload();
    repo.clear.mockRejectedValueOnce(new Error('persistência indisponível'));

    await expect(service.remove()).rejects.toThrow('persistência indisponível');
    expect(persisted()).toBe(stored);
    expect(repo.get).toHaveBeenCalledOnce();
    expect(service.effective()).toBe(previous);
  });
});
