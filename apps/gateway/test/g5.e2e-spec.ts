import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// G5 — guard-rail. Foco: em MODO OBSERVAÇÃO (GUARDRAIL_ENFORCE=false, default) o automático NÃO
// bloqueia ("não liga"); o hard-gate 423 só atua sobre estado aplicado por OVERRIDE manual; e a
// transição é idempotente (C10). enforce=true (quarentena automática) não é exercido aqui pois é
// flag global de ambiente — a lógica de aplicação fica coberta pelo override + C10.
describe('G5 guard-rail (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let guardrail: GuardrailService;
  const sessionId = 'g5';

  beforeAll(async () => {
    app = await createTestApp();
    guardrail = app.get(GuardrailService);
    token = await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);
  });
  afterAll(async () => {
    await removeSession(app, sessionId);
    await app.close();
  });

  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });
  const postText = (payload: Record<string, unknown>) =>
    inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/text`,
      headers: auth(),
      payload,
    });

  it('observação: cold passa numa sessão nova (estado ativa) → 201', async () => {
    const res = await postText({ to: '5511999999999', text: 'oi', cold: true });
    expect(res.statusCode).toBe(201);
  });

  it('observação: evaluate calcula mas NÃO aplica (enforce=false, applied=false)', async () => {
    const ev = await guardrail.evaluate(sessionId);
    expect(ev.enforce).toBe(false);
    expect(ev.applied).toBe(false);
  });

  it('override manual quarentena bloqueia cold → 423 SESSION_QUARANTINED', async () => {
    await guardrail.setManualState(sessionId, 'quarantine');
    const res = await postText({ to: '5511999999999', text: 'oi', cold: true });
    expect(res.statusCode).toBe(423);
    expect(res.json().code).toBe('SESSION_QUARANTINED');
  });

  it('cold=false (chat aberto) passa mesmo em quarentena → 201', async () => {
    const res = await postText({ to: '5511999999999', text: 'resposta' });
    expect(res.statusCode).toBe(201);
  });

  it('apply é idempotente (C10): evento antigo não sobrescreve', async () => {
    const cur = await guardrail.setManualState(sessionId, 'activate'); // eventTs = agora
    await guardrail.apply(
      cur.sessionId,
      'quarentena',
      'evento antigo',
      new Date(Date.now() - 60_000), // passado → deve ser ignorado
    );
    const gate = await guardrail.canSendCold(cur.sessionId);
    expect(gate.state).toBe('ativa');
    expect(gate.allowed).toBe(true);
  });
});
