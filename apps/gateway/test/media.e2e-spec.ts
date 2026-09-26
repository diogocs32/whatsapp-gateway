import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { MediaStorage } from '../src/infra/storage/media-storage.service';
import { PendingMediaSendError } from '../src/modules/sessions/application/engine.port';
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

  it('envio WWEBJS sem confirmação mantém intenção pendente até resultado tardio, sem duplicar', async () => {
    const boundary = '----vitestpendingmedia';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="to"',
      '',
      '5511999999999',
      `--${boundary}`,
      'Content-Disposition: form-data; name="idempotencyKey"',
      '',
      'e6-pending-media',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.png"',
      'Content-Type: image/png',
      '',
      'PNGFAKEDATA',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const send = () =>
      inject(app, {
        method: 'POST',
        url: '/api/sessions/s1/messages/media',
        headers: {
          ...auth(),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });
    let finish!: (value: { keyId: string; jid: string }) => void;
    const completion = new Promise<{ keyId: string; jid: string }>(
      (resolve) => {
        finish = resolve;
      },
    );
    const spy = vi
      .spyOn(fakeSessionManager, 'sendMedia')
      .mockRejectedValueOnce(new PendingMediaSendError(completion));
    const prisma = app.get(PrismaService);
    try {
      const first = await send();
      expect(first.statusCode).toBe(400);
      expect(first.json().message).toMatch(/sem confirmação/);
      const intent = () =>
        prisma.sendIntent.findUnique({
          where: {
            sessionId_idempotencyKey: {
              sessionId: 's1',
              idempotencyKey: 'e6-pending-media',
            },
          },
        });
      expect((await intent())?.status).toBe('pending');
      expect((await send()).statusCode).toBe(409);
      expect(spy).toHaveBeenCalledTimes(1);
      finish({ keyId: 'e6-late-key', jid: '5511999999999@c.us' });
      for (let n = 0; n < 20 && (await intent())?.status !== 'sent'; n++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect((await intent())?.status).toBe('sent');
      const replay = await send();
      expect(replay.statusCode).toBe(201);
      expect(replay.json()).toMatchObject({ id: 'e6-late-key', deduped: true });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
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

    // E23: fileName fora do Latin-1 (–, aspas curvas, …, emoji) derrubava a rota com 500
    // ERR_INVALID_CHAR (o Node recusa o header). Agora: fallback ASCII + filename* (RFC 5987);
    // nome Latin-1 segue com EXATAMENTE o header de antes.
    describe('Content-Disposition com nome não-Latin-1 (E23)', () => {
      const docs = [
        ['e2e-msg-doc-dash', 'E2EDOCDASH', 'relatório – março.pdf'],
        ['e2e-msg-doc-emoji', 'E2EDOCEMOJI', 'foto 😀.png'],
        ['e2e-msg-doc-latin1', 'E2EDOCLATIN1', 'relatório março.pdf'],
        // Revisão E23 (CD-1): Latin-1 que o n8n lia errado (decodeURIComponent + split por ;/=)
        ['e2e-msg-doc-pct', 'E2EDOCPCT', '100% pago.pdf'],
        ['e2e-msg-doc-semi', 'E2EDOCSEMI', 'a;b.pdf'],
        ['e2e-msg-doc-eq', 'E2EDOCEQ', 'a=b.pdf'],
        ['e2e-msg-doc-bsl', 'E2EDOCBSL', 'c:\\x\\y.pdf'],
      ] as const;
      const disposition = (res: { headers: Record<string, unknown> }) =>
        res.headers['content-disposition'];

      beforeAll(async () => {
        const prisma = app.get(PrismaService);
        await prisma.waMessage.deleteMany({
          where: { id: { in: docs.map((d) => d[0]) } },
        });
        for (const [id, key, fileName] of docs) {
          await prisma.waMessage.create({
            data: {
              id,
              sessionId: 's1',
              keyId: key,
              chatJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              type: 'document',
              mediaType: 'document',
              mimetype: 'application/pdf',
              fileName,
              mediaKey,
              fileSize: bytes.length,
              timestamp: new Date(),
            },
          });
        }
      });
      afterAll(async () => {
        await app.get(PrismaService).waMessage.deleteMany({
          where: { id: { in: docs.map((d) => d[0]) } },
        });
      });

      it('nome com travessão → 200 + filename* UTF-8 (antes: 500 ERR_INVALID_CHAR)', async () => {
        const res = await inject(app, {
          method: 'GET',
          url: '/api/sessions/s1/messages/E2EDOCDASH/media',
          headers: auth(),
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toBe(bytes);
        expect(disposition(res)).toBe(
          `inline; filename="relat_rio _ mar_o.pdf"; filename*=UTF-8''relat%C3%B3rio%20%E2%80%93%20mar%C3%A7o.pdf`,
        );
      });

      it('nome com emoji → 200 + filename*', async () => {
        const res = await inject(app, {
          method: 'GET',
          url: '/api/sessions/s1/messages/E2EDOCEMOJI/media',
          headers: auth(),
        });
        expect(res.statusCode).toBe(200);
        expect(disposition(res)).toBe(
          `inline; filename="foto _.png"; filename*=UTF-8''foto%20%F0%9F%98%80.png`,
        );
      });

      it('nome Latin-1 e ASCII → header idêntico ao de antes (sem filename*)', async () => {
        const latin = await inject(app, {
          method: 'GET',
          url: '/api/sessions/s1/messages/E2EDOCLATIN1/media',
          headers: auth(),
        });
        expect(latin.statusCode).toBe(200);
        expect(disposition(latin)).toBe(
          'inline; filename="relatório março.pdf"',
        );
        const ascii = await inject(app, {
          method: 'GET',
          url: `/api/sessions/s1/messages/${keyId}/media`,
          headers: auth(),
        });
        expect(disposition(ascii)).toBe('inline; filename="foto.png"');
      });

      // Revisão E23 (CD-1): esses nomes cabem no header, mas iam INALTERADOS e o n8n lançava "URI
      // malformed" (%), renomeava ou cortava o nome (; = \). Agora: fallback com _ + filename*.
      it('Latin-1 com % ; = \\ → 200 + fallback com _ e filename* (antes: header cru)', async () => {
        const esperado: Record<string, string> = {
          E2EDOCPCT: `inline; filename="100_ pago.pdf"; filename*=UTF-8''100%25%20pago.pdf`,
          E2EDOCSEMI: `inline; filename="a_b.pdf"; filename*=UTF-8''a%3Bb.pdf`,
          E2EDOCEQ: `inline; filename="a_b.pdf"; filename*=UTF-8''a%3Db.pdf`,
          E2EDOCBSL: `inline; filename="c:_x_y.pdf"; filename*=UTF-8''c%3A%5Cx%5Cy.pdf`,
        };
        for (const [key, header] of Object.entries(esperado)) {
          const res = await inject(app, {
            method: 'GET',
            url: `/api/sessions/s1/messages/${key}/media`,
            headers: auth(),
          });
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe(bytes);
          expect(disposition(res)).toBe(header);
        }
      });
    });

    // E23: o mimetype vem do remetente; fora do que cabe num header o Node recusava o Content-Type
    // (500 ERR_INVALID_CHAR). Agora cai no tipo do objeto no S3 (image/png, gravado no upload).
    describe('Content-Type com mimetype inválido (E23)', () => {
      const bad = [
        ['e2e-msg-ct-crlf', 'E2ECTCRLF', 'image/png\r\nX-Evil: 1'],
        ['e2e-msg-ct-utf8', 'E2ECTUTF8', 'imagem/jpég'],
      ] as const;
      beforeAll(async () => {
        const prisma = app.get(PrismaService);
        await prisma.waMessage.deleteMany({
          where: { id: { in: bad.map((d) => d[0]) } },
        });
        for (const [id, key, mimetype] of bad) {
          await prisma.waMessage.create({
            data: {
              id,
              sessionId: 's1',
              keyId: key,
              chatJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              type: 'image',
              mediaType: 'image',
              mimetype,
              mediaKey,
              fileSize: bytes.length,
              timestamp: new Date(),
            },
          });
        }
      });
      afterAll(async () => {
        await app.get(PrismaService).waMessage.deleteMany({
          where: { id: { in: bad.map((d) => d[0]) } },
        });
      });

      it('mimetype com CR/LF ou não-Latin-1 → 200 com o tipo do S3 (antes: 500), sem header injetado', async () => {
        for (const [, key] of bad) {
          const res = await inject(app, {
            method: 'GET',
            url: `/api/sessions/s1/messages/${key}/media`,
            headers: auth(),
          });
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe(bytes);
          expect(res.headers['content-type']).toBe('image/png');
          expect(res.headers['x-evil']).toBeUndefined();
        }
      });
    });
  });
});
