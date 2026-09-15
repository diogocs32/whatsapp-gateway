import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// Caixa única de triagem (página Atendimento). O que este spec prova de PONTA A PONTA — porque o
// semáforo é o produto, não um detalhe de UI:
//   1. conversas de TODAS as sessões numa lista, sem escolher aparelho;
//   2. 🔴 pending quando a última mensagem é do contato;
//   3. 🟢 answered quando a última é minha — inclusive respondida NO CELULAR (source='phone');
//   4. 🟡 ignored só por marcação manual;
//   5. REGRA DE OURO: entrada nova devolve a conversa para 🔴, estivesse 🟡 ou 🟢;
//   6. grupo/transmissão/canal NUNCA entram.
describe('Caixa única de triagem (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;

  const A = 'inbox-tri-a'; // aparelho 1
  const B = 'inbox-tri-b'; // aparelho 2
  const CHAT_A = '5511900000001@s.whatsapp.net'; // Baileys
  const CHAT_B = '5511900000002@c.us'; // wwebjs
  const CHAT_GRUPO = '123456789-987654321@g.us';

  // Base de tempo fixa e no passado recente: a ordem das inserções é determinística.
  const t0 = Date.parse('2026-09-15T12:00:00Z');
  const at = (minutes: number) => new Date(t0 + minutes * 60_000);

  let seq = 0;
  async function addMessage(opts: {
    session: string;
    chatJid: string;
    fromMe: boolean;
    at: Date;
    keyId?: string;
    source?: string | null;
    text?: string;
  }): Promise<string> {
    const n = ++seq;
    const keyId = opts.keyId ?? `INBOX-TRI-KEY-${n}`;
    await prisma.waMessage.create({
      data: {
        id: `inbox-tri-msg-${n}`,
        sessionId: opts.session,
        keyId,
        chatJid: opts.chatJid,
        senderJid: opts.fromMe ? null : opts.chatJid,
        fromMe: opts.fromMe,
        source: opts.source ?? (opts.fromMe ? 'phone' : null),
        type: 'text',
        text: opts.text ?? (opts.fromMe ? 'resposta' : 'mensagem do contato'),
        timestamp: opts.at,
      },
    });
    return keyId;
  }

  // Atalho: uma entrada avulsa numa sessão arbitrária (usada pela sessão C, id ≠ name).
  const addMessageTo = (sessionId: string, chatJid: string) =>
    addMessage({ session: sessionId, chatJid, fromMe: false, at: at(3) });

  const auth = () => ({ authorization: `Bearer ${token}` });
  const jsonAuth = () => ({ ...auth(), 'content-type': 'application/json' });

  // Sempre filtrando pelos 2 aparelhos do teste — o banco de dev/CI pode ter outras sessões.
  async function listConversations(query = '') {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/inbox/conversations?sessions=${A},${B}${query}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    return res.json() as {
      counts: {
        pending: number;
        answered: number;
        ignored: number;
        total: number;
      };
      conversations: {
        sessionId: string;
        sessionName: string;
        chatJid: string;
        status: string;
        lastFromMe: boolean;
        lastSource: string | null;
        pendingInbound: number;
        lastInboundKeyId: string | null;
      }[];
    };
  }

  const find = (
    body: Awaited<ReturnType<typeof listConversations>>,
    chatJid: string,
  ) => body.conversations.find((c) => c.chatJid === chatJid);

  function triage(
    session: string,
    payload: Record<string, unknown>,
  ): Promise<{ statusCode: number; json: () => any }> {
    return inject(app, {
      method: 'POST',
      url: `/api/inbox/sessions/${session}/triage`,
      headers: jsonAuth(),
      payload,
    });
  }

  let ultimaEntradaA = '';

  // Sessão com id ≠ name (como em produção, onde o id é ULID): prova que o filtro `?sessions=`
  // aceita o NOME, não só o id (o seedSession cria id==name e mascararia essa regressão).
  const C_ID = 'inbox-tri-c-01JXULIDFAKE';
  const C_NAME = 'inbox-tri-c';
  const CHAT_C = '5511900000003@s.whatsapp.net';

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
    prisma = app.get(PrismaService);
    await seedSession(app, A);
    await seedSession(app, B);
    await prisma.waSession.deleteMany({
      where: { OR: [{ id: C_ID }, { name: C_NAME }] },
    });
    await prisma.waSession.create({ data: { id: C_ID, name: C_NAME } });
    await addMessageTo(C_ID, CHAT_C);

    // Aparelho A · conversa que ESPERA resposta (última mensagem é do contato).
    await addMessage({ session: A, chatJid: CHAT_A, fromMe: true, at: at(0) });
    ultimaEntradaA = await addMessage({
      session: A,
      chatJid: CHAT_A,
      fromMe: false,
      at: at(5),
    });

    // Aparelho B · conversa JÁ respondida — e respondida NO CELULAR (source='phone').
    await addMessage({ session: B, chatJid: CHAT_B, fromMe: false, at: at(1) });
    await addMessage({
      session: B,
      chatJid: CHAT_B,
      fromMe: true,
      at: at(2),
      source: 'phone',
    });

    // Grupo no aparelho A — fora da caixa única.
    await addMessage({
      session: A,
      chatJid: CHAT_GRUPO,
      fromMe: false,
      at: at(6),
    });
  });

  afterAll(async () => {
    await removeSession(app, A);
    await removeSession(app, B);
    await prisma.waSession.deleteMany({ where: { id: C_ID } });
    await app.close();
  });

  it('lista as conversas dos DOIS aparelhos numa tacada, sem escolher sessão', async () => {
    const body = await listConversations();
    expect(find(body, CHAT_A)?.sessionName).toBe(A);
    expect(find(body, CHAT_B)?.sessionName).toBe(B);
    expect(body.counts.total).toBeGreaterThanOrEqual(2);
  });

  it('🔴 última mensagem do contato → pending, com a contagem de entradas esperando', async () => {
    const conv = find(await listConversations(), CHAT_A);
    expect(conv?.status).toBe('pending');
    expect(conv?.pendingInbound).toBe(1);
    expect(conv?.lastInboundKeyId).toBe(ultimaEntradaA);
  });

  it('🟢 respondido NO CELULAR (source=phone) → answered sem tocar no painel', async () => {
    const conv = find(await listConversations(), CHAT_B);
    expect(conv?.status).toBe('answered');
    expect(conv?.lastFromMe).toBe(true);
    expect(conv?.lastSource).toBe('phone');
    expect(conv?.pendingInbound).toBe(0);
  });

  it('grupo não aparece na caixa única (nem na lista, nem no fluxo)', async () => {
    expect(find(await listConversations(), CHAT_GRUPO)).toBeUndefined();
    const feed = await inject(app, {
      method: 'GET',
      url: `/api/inbox/messages?sessions=${A},${B}&limit=100`,
      headers: auth(),
    });
    expect(feed.statusCode).toBe(200);
    expect(
      (feed.json() as { chatJid: string }[]).some(
        (m) => m.chatJid === CHAT_GRUPO,
      ),
    ).toBe(false);
  });

  it('🟡 marcação manual ancorada na entrada da tela → ignored', async () => {
    const res = await triage(A, {
      chatJid: CHAT_A,
      state: 'ignored',
      keyId: ultimaEntradaA,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('ignored');
    expect(find(await listConversations(), CHAT_A)?.status).toBe('ignored');
  });

  it('filtro por status devolve só as conversas daquela cor (contadores seguem inteiros)', async () => {
    const body = await listConversations('&status=ignored');
    expect(body.conversations.every((c) => c.status === 'ignored')).toBe(true);
    expect(find(body, CHAT_A)?.status).toBe('ignored');
    expect(find(body, CHAT_B)).toBeUndefined(); // answered não entra no filtro
    expect(body.counts.total).toBeGreaterThanOrEqual(2); // contagem é do conjunto inteiro
  });

  it('REGRA DE OURO: entrada nova depois do amarelo → volta a pending (🔴)', async () => {
    ultimaEntradaA = await addMessage({
      session: A,
      chatJid: CHAT_A,
      fromMe: false,
      at: at(10),
      text: 'mais uma pergunta',
    });
    const conv = find(await listConversations(), CHAT_A);
    expect(conv?.status).toBe('pending');
    expect(conv?.pendingInbound).toBe(2);
  });

  it('anti-atropelo: marcar com keyId VELHO não grava nada — a conversa fica pending', async () => {
    const res = await triage(A, {
      chatJid: CHAT_A,
      state: 'ignored',
      keyId: 'KEY-INEXISTENTE-OU-VELHA',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('pending');
    expect(find(await listConversations(), CHAT_A)?.status).toBe('pending');
  });

  it('marcar sem keyId ancora na entrada atual → ignored; desmarcar volta a pending', async () => {
    expect(
      (await triage(A, { chatJid: CHAT_A, state: 'ignored' })).json().status,
    ).toBe('ignored');
    expect(find(await listConversations(), CHAT_A)?.status).toBe('ignored');

    const undo = await triage(A, { chatJid: CHAT_A, state: 'pending' });
    expect(undo.json().status).toBe('pending');
    expect(find(await listConversations(), CHAT_A)?.status).toBe('pending');
  });

  it('REGRA DE OURO: entrada nova depois de respondido (🟢) → pending', async () => {
    await addMessage({
      session: B,
      chatJid: CHAT_B,
      fromMe: false,
      at: at(15),
    });
    expect(find(await listConversations(), CHAT_B)?.status).toBe('pending');
  });

  it('respondido vence a marca amarela: entrada nova + resposta → answered', async () => {
    await triage(B, { chatJid: CHAT_B, state: 'ignored' });
    expect(find(await listConversations(), CHAT_B)?.status).toBe('ignored');
    await addMessage({
      session: B,
      chatJid: CHAT_B,
      fromMe: true,
      at: at(20),
      source: 'phone',
    });
    expect(find(await listConversations(), CHAT_B)?.status).toBe('answered');
  });

  it('filtro por aparelho devolve só as conversas daquele aparelho', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/inbox/conversations?sessions=${A}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      conversations: { sessionName: string; chatJid: string }[];
    };
    expect(body.conversations.every((c) => c.sessionName === A)).toBe(true);
    expect(body.conversations.some((c) => c.chatJid === CHAT_B)).toBe(false);
  });

  it('filtro por NOME funciona com sessão cujo id ≠ name (cenário real de produção)', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/inbox/conversations?sessions=${C_NAME}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      conversations: {
        sessionId: string;
        sessionName: string;
        chatJid: string;
      }[];
    };
    expect(body.conversations).toHaveLength(1);
    expect(body.conversations[0].sessionId).toBe(C_ID);
    expect(body.conversations[0].sessionName).toBe(C_NAME);
    expect(body.conversations[0].chatJid).toBe(CHAT_C);
    // …e pelo ID também (as duas formas, como no resto da API).
    const byId = await inject(app, {
      method: 'GET',
      url: `/api/inbox/conversations?sessions=${C_ID}`,
      headers: auth(),
    });
    expect(
      (byId.json() as { conversations: { sessionId: string }[] }).conversations,
    ).toHaveLength(1);
  });

  it('triagem de grupo → 400 · status inválido → 400 · sessão inexistente → 404', async () => {
    expect(
      (await triage(A, { chatJid: CHAT_GRUPO, state: 'ignored' })).statusCode,
    ).toBe(400);
    expect(
      (await triage(A, { chatJid: CHAT_A, state: 'verde' })).statusCode,
    ).toBe(400);
    expect(
      (
        await triage('sessao-que-nao-existe', {
          chatJid: CHAT_A,
          state: 'ignored',
        })
      ).statusCode,
    ).toBe(404);

    const res = await inject(app, {
      method: 'GET',
      url: '/api/inbox/conversations?status=roxo',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('sem autenticação → 401 (tela de triagem não é pública)', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/inbox/conversations',
    });
    expect(res.statusCode).toBe(401);
  });

  it('fluxo cronológico traz as mensagens em sequência, da mais recente para a mais antiga', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/inbox/messages?sessions=${A},${B}&limit=50`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as { sessionName: string; timestamp: string }[];
    expect(rows.length).toBeGreaterThanOrEqual(6);
    const times = rows.map((r) => Date.parse(r.timestamp));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    // Os dois aparelhos aparecem no MESMO fluxo (é o ponto da tela).
    expect(new Set(rows.map((r) => r.sessionName))).toEqual(new Set([A, B]));
  });
});
