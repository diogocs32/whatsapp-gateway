// Tempo real do painel (E23 · P-072 parte painel + reações) — lógica PURA: parse do envelope do SSE,
// ACK sem regredir, tique a mostrar, reações ao vivo e o item do "Fluxo ao vivo". Sem React/DOM →
// vitest `environment: 'node'`.
//
// Casar SEMPRE por (sessionId, keyId): nunca por chatJid (o @lid vira telefone depois, o ACK do
// wwebjs vem com o jid cru e o GET casa variantes @c.us/@s.whatsapp.net) e nunca SÓ por keyId (no
// Baileys o id da stanza é o mesmo nas duas pontas — duas sessões do gateway conversando entre si
// teriam o mesmo keyId).
import type { InboxFeedItemDto, MessageReactionDto } from '@contracts';

export type AckStatus = 'sent' | 'delivered' | 'read';

// Espelho de ACK_RANK do gateway (prisma-message.repository.ts). 0 = null/desconhecido.
const ACK_RANK: Readonly<Record<string, number>> = {
  sent: 1,
  delivered: 2,
  read: 3,
};

export function ackRank(status: string | null | undefined): number {
  return (status && Object.hasOwn(ACK_RANK, status) && ACK_RANK[status]) || 0;
}

// --- 1) Envelope do SSE GET /api/events/stream → evento tipado (ou null = ignorar).
// O stream manda `{ data: envelope }` sem `event:` → tudo chega no onmessage; o nome do evento
// está em `envelope.event` (session-manager.service.ts monta { id, timestamp(ms), event,
// sessionId, session, payload, engine }).

export interface LiveAck {
  kind: 'ack';
  sessionId: string;
  keyId: string;
  status: AckStatus;
}

export interface LiveReaction {
  kind: 'reaction';
  sessionId: string;
  keyId: string; // mensagem-ALVO
  chatJid: string;
  senderJid: string | null;
  emoji: string; // '' = removida
  fromMe: boolean;
  timestamp: number; // unix s
}

export interface LiveMessage {
  kind: 'message';
  sessionId: string;
  session: string;
  keyId: string;
  chatJid: string;
  fromMe: boolean;
  source: string | null;
  type: string;
  text: string | null;
  timestamp: number; // unix s
  isForwarded: boolean;
  forwardingScore: number | null;
}

export type LiveEvent = LiveAck | LiveReaction | LiveMessage;

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export function parseLiveEvent(
  data: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): LiveEvent | null {
  let env: unknown;
  try {
    env = JSON.parse(data);
  } catch {
    return null;
  }
  if (!env || typeof env !== 'object') return null;
  const e = env as {
    event?: unknown;
    sessionId?: unknown;
    session?: unknown;
    payload?: unknown;
  };
  const sessionId = str(e.sessionId);
  const p = (e.payload ?? null) as Record<string, unknown> | null;
  if (!sessionId || !p || typeof p !== 'object') return null;
  const keyId = str(p.keyId);
  if (!keyId) return null;
  const chatJid = typeof p.chatJid === 'string' ? p.chatJid : '';
  switch (e.event) {
    case 'message.ack': {
      const status = typeof p.status === 'string' ? p.status : '';
      if (!ackRank(status)) return null;
      return { kind: 'ack', sessionId, keyId, status: status as AckStatus };
    }
    case 'message.reaction':
      if (typeof p.emoji !== 'string') return null;
      return {
        kind: 'reaction',
        sessionId,
        keyId,
        chatJid,
        senderJid: str(p.senderJid),
        emoji: p.emoji,
        fromMe: p.fromMe === true,
        timestamp: num(p.timestamp) ?? nowSec,
      };
    case 'message':
      if (!chatJid) return null;
      return {
        kind: 'message',
        sessionId,
        session: str(e.session) ?? sessionId,
        keyId,
        chatJid,
        fromMe: p.fromMe === true,
        source: str(p.source),
        type: str(p.type) ?? 'text',
        text: typeof p.text === 'string' ? p.text : null,
        timestamp: num(p.timestamp) ?? nowSec,
        isForwarded: p.isForwarded === true,
        forwardingScore: num(p.forwardingScore),
      };
    default:
      return null; // session.status, guard-rail, webhook.test… não interessam aqui
  }
}

// --- 2) ACK sem regredir — em messages[] (MessageDto) e feed[] (InboxFeedItemDto).

export interface Ackable {
  sessionId: string;
  keyId?: string;
  status?: string | null;
}

// Devolve a MESMA referência quando nada muda (o React pula o render). Aplica também em entrada
// (espelha o banco); quem decide se aparece tique é `tickFor`.
export function applyAck<T extends Ackable>(
  list: T[],
  ev: { sessionId: string; keyId: string; status: string },
): T[] {
  const r = ackRank(ev.status);
  if (!r) return list;
  let changed = false;
  const out = list.map((m) => {
    if (m.sessionId !== ev.sessionId || m.keyId !== ev.keyId) return m;
    if (ackRank(m.status) >= r) return m;
    changed = true;
    return { ...m, status: ev.status };
  });
  return changed ? out : list;
}

// ACKs vistos ao vivo. Cobrem (a) o ACK que chega ANTES do evento `message` (mídia: o eco só sai
// depois do upload + presign) e (b) o ACK que virou no-op no banco (UPDATE antes do INSERT) e por
// isso nunca volta no GET. Como o status só sobe, reaplicar é sempre correto. Mutar FORA do updater
// do setState (o StrictMode chama o updater 2× em dev). Teto por LRU simples.
export type AckMemory = Map<string, AckStatus>;

const memKey = (sessionId: string, keyId: string) => `${sessionId}|${keyId}`;

export function rememberAck(
  mem: AckMemory,
  ev: { sessionId: string; keyId: string; status: AckStatus },
  max = 1000,
): void {
  const k = memKey(ev.sessionId, ev.keyId);
  if (ackRank(mem.get(k)) >= ackRank(ev.status)) return;
  mem.delete(k); // reinsere no fim (ordem de inserção = LRU)
  mem.set(k, ev.status);
  while (mem.size > max) {
    const oldest = mem.keys().next().value;
    if (oldest === undefined) break;
    mem.delete(oldest);
  }
}

export function overlayAcks<T extends Ackable>(list: T[], mem: AckMemory): T[] {
  if (mem.size === 0) return list;
  let changed = false;
  const out = list.map((m) => {
    if (!m.keyId) return m;
    const seen = mem.get(memKey(m.sessionId, m.keyId));
    if (!seen || ackRank(seen) <= ackRank(m.status)) return m;
    changed = true;
    return { ...m, status: seen };
  });
  return changed ? out : list;
}

// --- 3) Tique a mostrar (só exibição — o painel NUNCA manda recibo de leitura).

export type Tick = 'none' | 'sent' | 'delivered' | 'read';

const NO_TICK_CHAT = /@(g\.us|broadcast|newsletter)$/;

export function tickFor(m: {
  fromMe: boolean;
  chatJid: string;
  status?: string | null;
}): Tick {
  // Entrada: `read` = lida no celular do operador — não é tique.
  if (!m.fromMe) return 'none';
  // Grupo/transmissão/canal: o Baileys nunca grava ACK ali e o "lida" de grupo do WhatsApp é
  // "todos leram" (FAQ) — o que o wwebjs grava em grupo não foi verificado. Sem tique nas 2 engines.
  if (NO_TICK_CHAT.test(m.chatJid)) return 'none';
  switch (m.status) {
    case 'sent':
    case 'delivered':
    case 'read':
      return m.status;
    default:
      return 'none'; // null = sem confirmação ainda; desconhecido = não adivinhar
  }
}

export const TICK_LABEL: Record<Exclude<Tick, 'none'>, string> = {
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
};

// --- 4) Reações ao vivo — upsert por pessoa; '' remove.

export interface Reactable {
  sessionId: string;
  keyId?: string;
  chatJid: string;
  reactions?: MessageReactionDto[];
}

// Espelho EXATO de apps/gateway/src/modules/messaging/application/reaction-key.ts — a chave do
// unique (sessionId, targetKeyId, senderKey). O spec confere contra o arquivo real do gateway.
export function reactionSenderKey(p: {
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
}): string {
  if (p.fromMe) return 'me';
  if (!p.chatJid.endsWith('@g.us')) return 'peer';
  return p.senderJid ? p.senderJid.replace(/:\d+(?=@)/, '') : 'unknown';
}

const tsMs = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

export function applyReaction<T extends Reactable>(
  list: T[],
  ev: Omit<LiveReaction, 'kind'>,
): T[] {
  const evMs = ev.timestamp * 1000;
  let changed = false;
  const out = list.map((m) => {
    if (m.sessionId !== ev.sessionId || m.keyId !== ev.keyId) return m;
    // Grupo decide pelo sufixo @g.us da mensagem OU do evento (concordam); o @lid × telefone só
    // existe em 1:1, que vira 'peer' dos dois lados.
    const chat =
      m.chatJid.endsWith('@g.us') || ev.chatJid.endsWith('@g.us')
        ? '@g.us'
        : m.chatJid;
    const keyOf = (r: { senderJid: string | null; fromMe: boolean }) =>
      reactionSenderKey({ chatJid: chat, ...r });
    const key = keyOf(ev);
    const cur = m.reactions ?? [];
    const existing = cur.find((r) => keyOf(r) === key);
    // Mesma guarda do banco: só aplica se a guardada for <= a nova.
    if (existing && tsMs(existing.timestamp) > evMs) return m;
    if (!existing && ev.emoji === '') return m;
    // Mesmo evento de novo (replay): nada muda — mantém a referência.
    if (
      existing &&
      existing.emoji === ev.emoji &&
      tsMs(existing.timestamp) === evMs
    )
      return m;
    const next = cur.filter((r) => keyOf(r) !== key);
    if (ev.emoji !== '') {
      next.push({
        emoji: ev.emoji,
        senderJid: ev.senderJid ?? existing?.senderJid ?? null, // COALESCE como no banco
        fromMe: ev.fromMe,
        timestamp: new Date(evMs).toISOString(),
      });
      // Mesma ordem do GET (timestamp asc); sort estável.
      next.sort((a, b) => tsMs(a.timestamp) - tsMs(b.timestamp));
    }
    changed = true;
    return { ...m, reactions: next };
  });
  return changed ? out : list;
}

// Reações vistas ao vivo, reaplicadas SÓ sobre um GET que saiu ANTES delas (o GET em voo que volta
// depois do evento não pode apagá-la). Evento recebido antes de o GET sair já está no banco — e
// reaplicá-lo poderia ressuscitar uma reação removida enquanto o SSE esteve fora (a remoção vira
// lápide, que o GET não devolve). Margem de 2 s para o persister assíncrono do gateway.
export interface ReactionMemoryItem {
  ev: Omit<LiveReaction, 'kind'>;
  receivedAt: number; // ms, relógio do painel
}
export type ReactionMemory = ReactionMemoryItem[];

export const REACTION_REPLAY_MARGIN_MS = 2000;

export function rememberReaction(
  mem: ReactionMemory,
  ev: Omit<LiveReaction, 'kind'>,
  receivedAt: number,
  max = 300,
): void {
  mem.push({ ev, receivedAt });
  if (mem.length > max) mem.splice(0, mem.length - max);
}

export function replayReactions<T extends Reactable>(
  list: T[],
  mem: ReactionMemory,
  requestedAt: number,
): T[] {
  let out = list;
  for (const { ev, receivedAt } of mem) {
    if (receivedAt >= requestedAt - REACTION_REPLAY_MARGIN_MS) {
      out = applyReaction(out, ev);
    }
  }
  return out;
}

// Pílula do balão: emojis distintos (mais usado primeiro; empate = o que apareceu antes), total e
// se um é nosso. A FAQ manda mostrar a contagem; a ordem exata do WhatsApp Web não foi verificada.
export function reactionChips(reactions: MessageReactionDto[] | undefined): {
  chips: { emoji: string; count: number; mine: boolean }[];
  total: number;
} {
  const live = (reactions ?? []).filter((r) => r.emoji !== '');
  const by = new Map<
    string,
    { emoji: string; count: number; mine: boolean; first: number }
  >();
  live.forEach((r, i) => {
    const c = by.get(r.emoji) ?? {
      emoji: r.emoji,
      count: 0,
      mine: false,
      first: i,
    };
    c.count += 1;
    c.mine ||= r.fromMe;
    by.set(r.emoji, c);
  });
  const chips = [...by.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .map(({ emoji, count, mine }) => ({ emoji, count, mine }));
  return { chips, total: live.length };
}

// --- 5) Evento `message` → item do "Fluxo ao vivo", dedup por (sessionId, keyId).

export function feedItemFromEvent(ev: LiveMessage): InboxFeedItemDto {
  return {
    id: `sse-${ev.sessionId}-${ev.keyId}`,
    keyId: ev.keyId,
    sessionId: ev.sessionId,
    sessionName: ev.session,
    chatJid: ev.chatJid,
    name: null,
    fromMe: ev.fromMe,
    source: ev.source,
    type: ev.type,
    text: ev.text,
    timestamp: new Date(ev.timestamp * 1000).toISOString(),
    status: null,
    isForwarded: ev.isForwarded,
    forwardingScore: ev.forwardingScore,
  };
}

export function upsertFeedItem<
  T extends { sessionId: string; keyId: string; status?: string | null },
>(feed: T[], item: T, max: number): T[] {
  const same = (m: T) =>
    m.sessionId === item.sessionId && m.keyId === item.keyId;
  const prev = feed.find(same);
  // Não regride um status que o item antigo já tinha (ex.: veio do GET com `delivered`).
  const merged =
    prev && ackRank(prev.status) > ackRank(item.status)
      ? { ...item, status: prev.status }
      : item;
  return [merged, ...feed.filter((m) => !same(m))].slice(0, max);
}

// Itens do fluxo vistos ao vivo. Um GET /api/inbox/messages que leu o banco ANTES do INSERT (o
// MessagePersister grava depois do publish do evento) volta sem o item — trocar o fluxo por ele
// apagaria a mensagem recém-chegada até o próximo tick. Mesma margem das reações.
export interface FeedMemoryItem {
  item: InboxFeedItemDto;
  receivedAt: number; // ms, relógio do painel
}
export type FeedMemory = FeedMemoryItem[];

export function rememberFeedItem(
  mem: FeedMemory,
  item: InboxFeedItemDto,
  receivedAt: number,
  max = 200,
): void {
  mem.push({ item, receivedAt });
  if (mem.length > max) mem.splice(0, mem.length - max);
}

// O que o servidor devolveu + os itens do SSE recebidos depois de o GET sair (que ele não viu),
// sem duplicar (sessionId, keyId); mais recente primeiro, cortado em `max`.
export function mergeFeed(
  rows: InboxFeedItemDto[],
  mem: FeedMemory,
  requestedAt: number,
  max: number,
): InboxFeedItemDto[] {
  const key = (m: InboxFeedItemDto) => `${m.sessionId}|${m.keyId}`;
  const seen = new Set(rows.map(key));
  const extra: InboxFeedItemDto[] = [];
  for (const { item, receivedAt } of mem) {
    if (receivedAt < requestedAt - REACTION_REPLAY_MARGIN_MS) continue;
    if (seen.has(key(item))) continue;
    seen.add(key(item));
    extra.push(item);
  }
  if (!extra.length) return rows.slice(0, max);
  return [...extra, ...rows]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, max);
}

// --- 6) Recarga do servidor sem re-render à toa: a `mediaUrl` pré-assinada muda a CADA leitura
// (o Inbox relê a cada 2,5 s), então comparar o objeto inteiro nunca daria "igual". Reaproveita o
// objeto anterior de cada mensagem que não mudou (ignorando a mediaUrl) e a lista inteira quando
// nada mudou — os balões memorizados não re-renderizam e a mídia não pisca.

type WithId = { id: string; mediaUrl?: string | null };

function sameIgnoringMediaUrl(a: WithId, b: WithId): boolean {
  const ka = Object.keys(a).filter((k) => k !== 'mediaUrl');
  const kb = Object.keys(b).filter((k) => k !== 'mediaUrl');
  if (ka.length !== kb.length) return false;
  // mediaUrl presente × ausente importa (flag de "tem arquivo").
  if ((a.mediaUrl == null) !== (b.mediaUrl == null)) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  return ka.every((k) => JSON.stringify(ra[k]) === JSON.stringify(rb[k]));
}

export function stabilize<T extends WithId>(prev: T[], next: T[]): T[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  let changed = prev.length !== next.length;
  const out = next.map((m, i) => {
    const old = byId.get(m.id);
    if (old && sameIgnoringMediaUrl(old, m)) {
      if (prev[i] !== old) changed = true;
      return old;
    }
    changed = true;
    return m;
  });
  return changed ? out : prev;
}
