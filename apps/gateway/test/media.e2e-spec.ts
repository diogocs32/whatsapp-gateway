import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { MediaStorage } from '../src/infra/storage/media-storage.service';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

describe('Mídia (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
    await seedSession(app, 's1');
  });
  afterAll(async () => {
    await removeSession(app, 's1');
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('POST media sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/messages/media',
    });
    expect(res.statusCode).toBe(401);
  });

  it('upload multipart → 201 (SessionManager mockado)', async () => {
    const boundary = '----vitestboundary';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="to"',
      '',
      '5511999999999',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/messages/media',
      headers: {
        ...auth(),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('fake-media');
  });

  it('upload multipart sem o campo "to" → 400', async () => {
    const boundary = '----vitestnoto';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/messages/media',
      headers: {
        ...auth(),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it('media-url sem url → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/messages/media-url',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999' },
    });
    expect(res.statusCode).toBe(400);
  });

  // GAP 2 (contrato CP-149): download dos bytes da mídia pelo gateway, por keyId OU ULID interno.
  describe('GET /messages/:msgId/media (GAP 2)', () => {
    const msgId = 'e2e-msg-media-1';
    const keyId = 'E2EMEDIAKEY1';
    const mediaKey = 'media/s1/e2emedia-download.png';
    const bytes = 'PNGFAKEDATA-DOWNLOAD';

    beforeAll(async () => {
      await app
        .get(MediaStorage)
        .put(mediaKey, Buffer.from(bytes), 'image/png');
      const prisma = app.get(PrismaService);
      await prisma.waMessage.deleteMany({ where: { id: msgId } });
      await prisma.waMessage.create({
        data: {
          id: msgId,
          sessionId: 's1',
          keyId,
          chatJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          type: 'image',
          mediaType: 'image',
          mimetype: 'image/png',
          fileName: 'foto.png',
          mediaKey,
          fileSize: bytes.length,
          timestamp: new Date(),
        },
      });
    });
    afterAll(async () => {
      await app
        .get(PrismaService)
        .waMessage.deleteMany({ where: { id: msgId } });
    });

    it('baixa os bytes pelo keyId do WhatsApp (o mesmo do webhook)', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: `/api/sessions/s1/messages/${keyId}/media`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(
        (res as unknown as { headers: Record<string, string> }).headers[
          'content-type'
        ],
      ).toContain('image/png');
      expect(res.body).toBe(bytes);
    });

    it('baixa os bytes pelo ULID interno (id do GET /messages)', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: `/api/sessions/s1/messages/${msgId}/media`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe(bytes);
    });

    it('mensagem sem mídia → 404 com motivo claro', async () => {
      const prisma = app.get(PrismaService);
      await prisma.waMessage.create({
        data: {
          id: 'e2e-msg-semmidia',
          sessionId: 's1',
          keyId: 'E2ESEMMIDIA',
          chatJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          type: 'text',
          text: 'oi',
          timestamp: new Date(),
        },
      });
      const res = await inject(app, {
        method: 'GET',
        url: '/api/sessions/s1/messages/E2ESEMMIDIA/media',
        headers: auth(),
      });
      expect(res.statusCode).toBe(404);
      expect(res.body).toContain('não tem mídia');
      await prisma.waMessage.deleteMany({ where: { id: 'e2e-msg-semmidia' } });
    });
  });
});
