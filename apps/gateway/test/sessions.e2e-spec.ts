import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { BaileysCacheObserver } from '../src/modules/sessions/infrastructure/baileys/baileys-cache-observer';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

describe('Sessions (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
  });
  afterAll(async () => {
    await prisma.waSession.deleteMany({
      where: { name: { startsWith: 'e2e-' } },
    });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('GET /api/sessions sem auth → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/sessions' });
    expect(res.statusCode).toBe(401);
  });

  // Regressão do bug FST_ERR_CTP_EMPTY_JSON_BODY (botões davam 400):
  // POST sem body + Content-Type application/json deve seguir para o handler.
  it('POST /start com body vazio + content-type json NÃO retorna 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/nao-existe/start',
      headers: { ...auth(), 'content-type': 'application/json' },
    });
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).toBe(404); // ensure() → sessão não encontrada
  });

  it('cria sessão (201) e ela aparece na listagem', async () => {
    const name = 'e2e-' + Math.random().toString(36).slice(2, 8);
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name, engine: 'BAILEYS' },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().name).toBe(name);

    const list = await inject(app, {
      method: 'GET',
      url: '/api/sessions',
      headers: auth(),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((s: { name: string }) => s.name === name)).toBe(
      true,
    );
  });

  // Rota de recuperação com credencial nova (P0 estabilidade): contrato básico —
  // exige auth, 404 para sessão inexistente, 200 {ok:true} para sessão existente.
  it('POST /new-qr sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/qualquer/new-qr',
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /new-qr de sessão inexistente → 404', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/nao-existe/new-qr',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /new-qr de sessão existente → 200 {ok:true}', async () => {
    const name = 'e2e-' + Math.random().toString(36).slice(2, 8);
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name, engine: 'BAILEYS' },
    });
    expect(create.statusCode).toBe(201);
    const res = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${name}/new-qr`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('POST /pairing-code de sessão WORKING → 409 sem código (socket sintético)', async () => {
    const name = 'e2e-' + Math.random().toString(36).slice(2, 8);
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name, engine: 'BAILEYS' },
    });
    expect(create.statusCode).toBe(201);
    await prisma.waSession.update({
      where: { id: create.json().id as string },
      data: { status: 'WORKING' },
    });
    const pairing = vi
      .spyOn(fakeSessionManager, 'requestPairingCode')
      .mockRejectedValueOnce(
        new Error('Sessão já pareada; código de pareamento indisponível'),
      );
    try {
      const res = await inject(app, {
        method: 'POST',
        url: `/api/sessions/${name}/pairing-code`,
        headers: { ...auth(), 'content-type': 'application/json' },
        payload: { phoneNumber: '5511999999999' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().message).toContain('já pareada');
      expect(pairing).toHaveBeenCalledOnce();
    } finally {
      pairing.mockRestore();
    }
  });

  it('conta pre-keys só da sessão escolhida, sem incluir outros tipos ou sessões', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const name = 'e2e-' + Math.random().toString(36).slice(2, 8);
      const created = await inject(app, {
        method: 'POST',
        url: '/api/sessions',
        headers: { ...auth(), 'content-type': 'application/json' },
        payload: { name, engine: 'BAILEYS' },
      });
      expect(created.statusCode).toBe(201);
      ids.push(created.json().id as string);
    }
    await prisma.waAuthKey.createMany({
      data: [
        { sessionId: ids[0], type: 'pre-key', keyId: '1', data: {} },
        { sessionId: ids[0], type: 'pre-key', keyId: '2', data: {} },
        { sessionId: ids[0], type: 'lid-mapping', keyId: '3', data: {} },
        { sessionId: ids[1], type: 'pre-key', keyId: '4', data: {} },
      ],
    });
    const info = vi.fn();
    const observer = new BaileysCacheObserver(ids[0], prisma, {
      info,
      warn: vi.fn(),
    } as never);
    await observer.snapshot('open');
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: ids[0], preKeys: 2 }),
      'Baileys: caches e pre-keys da sessão',
    );
    observer.close('close');
  });

  it('nome inválido → 400 (validação zod)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name: 'nome com espaço!' },
    });
    expect(res.statusCode).toBe(400);
  });

  // E30 (P-110, D-053) — renomear sem excluir/recriar: PATCH /api/sessions/:id { name }.
  describe('PATCH /api/sessions/:id — renomear (E30)', () => {
    const OPERATOR = 'e2e-op-' + Math.random().toString(36).slice(2, 8);
    let operatorToken: string;
    const json = () => ({ ...auth(), 'content-type': 'application/json' });
    // Direto no banco (como `seedSession`), com id DIFERENTE do nome: prova que o nome antigo deixa
    // de resolver (se id = nome, o SessionRefPipe acharia a sessão pelo id). Prefixo `e2e-` para a
    // limpeza do afterAll externo; bypass do limite de licença do POST.
    const seed = async () => {
      const rnd = Math.random().toString(36).slice(2, 8);
      const s = await prisma.waSession.create({
        data: { id: `e2e-id-${rnd}`, name: `e2e-${rnd}` },
      });
      return { id: s.id, name: s.name };
    };
    const getSession = (ref: string) =>
      inject(app, {
        method: 'GET',
        url: `/api/sessions/${ref}`,
        headers: auth(),
      });

    beforeAll(async () => {
      const user = await inject(app, {
        method: 'POST',
        url: '/api/users',
        headers: json(),
        payload: {
          username: OPERATOR,
          name: 'Operator E30',
          password: 'senha-operator-123',
          role: 'OPERATOR',
        },
      });
      expect(user.statusCode).toBe(201);
      const opLogin = await inject(app, {
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: { username: OPERATOR, password: 'senha-operator-123' },
      });
      operatorToken = opLogin.json().token as string;
      expect(operatorToken).toBeTruthy();
    });
    afterAll(async () => {
      await prisma.user.deleteMany({ where: { username: OPERATOR } });
    });

    it('sem auth → 401', async () => {
      const res = await inject(app, {
        method: 'PATCH',
        url: '/api/sessions/qualquer',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'e2e-novo' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('OPERATOR → 403 (renomear é ADMIN, como criar e excluir) e nada muda', async () => {
      const s = await seed();
      const res = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${s.id}`,
        headers: {
          authorization: `Bearer ${operatorToken}`,
          'content-type': 'application/json',
        },
        payload: { name: `${s.name}-x` },
      });
      expect(res.statusCode).toBe(403);
      expect((await getSession(s.name)).statusCode).toBe(200);
    });

    it('sessão inexistente → 404', async () => {
      const res = await inject(app, {
        method: 'PATCH',
        url: '/api/sessions/nao-existe',
        headers: json(),
        payload: { name: 'e2e-novo' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('nome inválido → 400 e o nome fica', async () => {
      const s = await seed();
      for (const name of ['', 'com espaço', 'acentuação', 'x'.repeat(65)]) {
        const res = await inject(app, {
          method: 'PATCH',
          url: `/api/sessions/${s.id}`,
          headers: json(),
          payload: { name },
        });
        expect(res.statusCode).toBe(400);
      }
      const bodyless = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${s.id}`,
        headers: json(),
        payload: {},
      });
      expect(bodyless.statusCode).toBe(400);
      expect((await getSession(s.id)).json().name).toBe(s.name);
    });

    it('renomeia pelo nome antigo: id igual, nome novo resolve, o antigo some', async () => {
      const s = await seed();
      const novo = `${s.name}-novo`;
      const res = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${s.name}`,
        headers: json(),
        payload: { name: novo },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: s.id, name: novo });

      const byNew = await getSession(novo);
      expect(byNew.statusCode).toBe(200);
      expect(byNew.json().id).toBe(s.id);
      expect((await getSession(s.name)).statusCode).toBe(404);
      expect((await getSession(s.id)).json().name).toBe(novo);
    });

    it('mesmo nome → 200 sem mudança', async () => {
      const s = await seed();
      const res = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${s.id}`,
        headers: json(),
        payload: { name: s.name },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: s.id, name: s.name });
    });

    it('nome igual ao ID de outra sessão → 409 (o pipe resolveria a outra sessão)', async () => {
      const a = await seed();
      const b = await seed();
      const res = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${a.id}`,
        headers: json(),
        payload: { name: b.id },
      });
      expect(res.statusCode).toBe(409);
      expect((await getSession(a.id)).json().name).toBe(a.name);
      // O id de B continua levando a B (e não a uma A renomeada).
      expect((await getSession(b.id)).json().name).toBe(b.name);
    });

    it('POST /api/sessions com nome igual ao id de uma sessão existente → 409', async () => {
      const b = await seed();
      const res = await inject(app, {
        method: 'POST',
        url: '/api/sessions',
        headers: json(),
        payload: { name: b.id, engine: 'BAILEYS' },
      });
      expect(res.statusCode).toBe(409);
      expect((await getSession(b.id)).json().name).toBe(b.name);
    });

    it('nome de outra sessão → 409 e as duas ficam como estavam', async () => {
      const a = await seed();
      const b = await seed();
      const res = await inject(app, {
        method: 'PATCH',
        url: `/api/sessions/${a.id}`,
        headers: json(),
        payload: { name: b.name },
      });
      expect(res.statusCode).toBe(409);
      expect((await getSession(a.id)).json().name).toBe(a.name);
      expect((await getSession(b.id)).json().name).toBe(b.name);
    });
  });
});
