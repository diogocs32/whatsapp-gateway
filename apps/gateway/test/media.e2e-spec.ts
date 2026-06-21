import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, inject, login } from './setup-app';

describe('Mídia (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
  });
  afterAll(async () => {
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
});
