import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { MediaStorage } from '../src/infra/storage/media-storage.service';
import {
  createTestApp,
  fakeSessionManager,
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

  // P-054: com limits.files=1 (fastify-adapter.ts) a @fastify/multipart 10.1.1 destruía o 1º
  // arquivo ao estourar o limite e o toBuffer() lançava "Premature close" → 500. A 10.1.2 entrega
  // o FST_FILES_LIMIT ao iterador; o sendMedia lê o corpo até o fim e responde 413 sem enviar. Erro
  // do cliente: o Nest NÃO pode logar `ERROR [ExceptionsHandler]` (clientErrorAsHttpException).
  it('upload multipart com 2 arquivos → 413 e nada é enviado (limits.files=1)', async () => {
    const boundary = '----vitestdoisarquivos';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="to"',
      '',
      '5511999999999',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="a.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA-A',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="b.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA-B',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const spy = vi.spyOn(fakeSessionManager, 'sendMedia');
    const nestLogger = (BaseExceptionFilter as unknown as { logger: Logger })
      .logger;
    const erroNest = vi.spyOn(nestLogger, 'error');
    try {
      const res = await inject(app, {
        method: 'POST',
        url: '/api/sessions/s1/messages/media',
        headers: {
          ...auth(),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });
      expect(res.statusCode).toBe(413);
      expect(res.json()).toEqual({
        statusCode: 413,
        message: 'reach files limit',
      });
      expect(spy).not.toHaveBeenCalled();
      expect(erroNest).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      erroNest.mockRestore();
    }
  });

  // O `to` chega num pedaço POSTERIOR ao fim do arquivo (caso real em HTTP): com o req.file() antigo
  // o handler lia os campos antes de o busboy vê-lo e respondia 400; lendo o corpo até o fim, 201.
  it('upload multipart com "to" DEPOIS do arquivo, em pedaço atrasado → 201 (corpo lido até o fim)', async () => {
    const boundary = '----vitesttodepois';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA',
      `--${boundary}`,
      'Content-Disposition: form-data; name="to"',
      '',
      '5511999999999',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    // 1º pedaço: arquivo + o boundary que o fecha (o arquivo TERMINA aqui); 2º: a parte do `to`.
    const corte = payload.indexOf('Content-Disposition: form-data; name="to"');
    const corpo = Readable.from(
      (async function* () {
        yield Buffer.from(payload.slice(0, corte));
        await new Promise((r) => setTimeout(r, 50));
        yield Buffer.from(payload.slice(corte));
      })(),
    );
    const spy = vi.spyOn(fakeSessionManager, 'sendMedia');
    try {
      const res = await inject(app, {
        method: 'POST',
        url: '/api/sessions/s1/messages/media',
        headers: {
          ...auth(),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: corpo,
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBe('fake-media');
      expect(spy.mock.calls[0]?.[1]).toBe('5511999999999');
    } finally {
      spy.mockRestore();
    }
  });

  it('upload multipart com campo de nome reservado → 400 e nada é enviado', async () => {
    const boundary = '----vitestproto';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="to"',
      '',
      '5511999999999',
      `--${boundary}`,
      'Content-Disposition: form-data; name="toString"',
      '',
      'x',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const spy = vi.spyOn(fakeSessionManager, 'sendMedia');
    try {
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
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
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
