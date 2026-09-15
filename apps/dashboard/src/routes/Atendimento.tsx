import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  InboxConversationDto,
  InboxCounts,
  InboxFeedItemDto,
  InboxTriageStatus,
  MessageDto,
  SessionDto,
} from '@contracts';
import { api, BASE } from '../lib/api';
import { useAuth } from '../lib/auth';

// Caixa única de triagem — tudo que chega de TODOS os aparelhos numa tela só, sem escolher sessão.
// Semáforo por conversa (derivado das mensagens, o gateway é o juiz):
//   🔴 pending   a última mensagem é do contato → precisa de resposta HUMANA
//   🟢 answered  a última mensagem é minha — inclusive respondida no CELULAR (source=phone)
//   🟡 ignored   marquei à mão "não preciso responder" (o "ok, obrigado" de fim de conversa)
// Regra de ouro: mensagem NOVA de entrada devolve a conversa para 🔴, estivesse 🟡 ou 🟢.
// Nada aqui responde sozinho: a caixa de resposta é opcional e só dispara no clique.

type StatusFilter = InboxTriageStatus | 'all';

const DOT: Record<InboxTriageStatus, string> = {
  pending: 'bg-red-500',
  answered: 'bg-emerald-500',
  ignored: 'bg-amber-400',
};

const STATUS_LABEL: Record<InboxTriageStatus, string> = {
  pending: 'Precisa responder',
  answered: 'Respondido',
  ignored: 'Não preciso responder',
};

const FEED_MAX = 200;

// Chave estável de uma conversa (a mesma conversa em dois aparelhos são DUAS linhas).
const convKey = (c: { sessionId: string; chatJid: string }) =>
  `${c.sessionId}|${c.chatJid}`;

function numberFromJid(jid: string): string {
  return jid.split('@')[0] || jid;
}

// Para enviar, o gateway aceita o número quando o JID é de telefone; lid vai como veio.
function sendTarget(chatJid: string): string {
  return chatJid.endsWith('@s.whatsapp.net') || chatJid.endsWith('@c.us')
    ? numberFromJid(chatJid)
    : chatJid;
}

function mediaLabel(type: string): string {
  switch (type) {
    case 'image':
      return '📷 Imagem';
    case 'video':
      return '🎥 Vídeo';
    case 'audio':
      return '🎵 Áudio';
    case 'document':
      return '📄 Documento';
    case 'sticker':
      return '🩷 Figurinha';
    default:
      return '';
  }
}

function displayName(c: { name: string | null; chatJid: string }): string {
  return c.name?.trim() || numberFromJid(c.chatJid);
}

function preview(c: InboxConversationDto): string {
  const body = c.lastText?.trim() || mediaLabel(c.lastType) || '…';
  return c.lastFromMe ? `Você: ${body}` : body;
}

// "agora", "há 3 min", "há 2 h" — o operador precisa saber HÁ QUANTO TEMPO está esperando.
function since(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function Atendimento() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>(''); // '' = todos
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [conversations, setConversations] = useState<InboxConversationDto[]>(
    [],
  );
  const [counts, setCounts] = useState<InboxCounts>({
    pending: 0,
    answered: 0,
    ignored: 0,
    total: 0,
  });
  const [feed, setFeed] = useState<InboxFeedItemDto[]>([]);
  const [tab, setTab] = useState<'conversa' | 'fluxo'>('conversa');
  const [selected, setSelected] = useState<InboxConversationDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  // O SSE não pode reabrir a cada clique na lista: o handler lê a conversa aberta por ref.
  const selectedRef = useRef<InboxConversationDto | null>(null);
  selectedRef.current = selected;
  const intentRef = useRef<{ key: string; chat: string; text: string } | null>(
    null,
  );
  const sessionsParam = useMemo(
    () => (deviceFilter ? [deviceFilter] : undefined),
    [deviceFilter],
  );

  // Aparelhos (para a etiqueta e o filtro).
  useEffect(() => {
    const tick = () =>
      api.sessions
        .list()
        .then(setSessions)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // A lista SEMPRE vem inteira do gateway (todas as cores) e o filtro de cor é aplicado aqui:
  // assim os contadores não piscam e uma conversa que muda de cor não desaparece da tela sem
  // explicação. Os contadores vêm do gateway (conjunto inteiro).
  const loadConversations = useCallback(async () => {
    const body = await api.inbox.conversations({
      limit: 300,
      sessions: sessionsParam,
    });
    setConversations(body.conversations);
    setCounts(body.counts);
  }, [sessionsParam]);

  const loadFeed = useCallback(async () => {
    const rows = await api.inbox.feed({ limit: 100, sessions: sessionsParam });
    setFeed(rows);
  }, [sessionsParam]);

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    const tick = () => {
      if (inFlight || !alive) return; // uma leitura pendente por recurso
      inFlight = true;
      Promise.all([loadConversations(), loadFeed()])
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    };
    tick();
    // Rede de segurança: o tempo real vem do SSE, mas se o stream cair a tela não congela.
    const id = setInterval(tick, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loadConversations, loadFeed]);

  // Tempo real: o SSE /api/events/stream já entrega os eventos de TODAS as sessões (inclusive de
  // outra réplica, via fan-out Redis). Mensagem nova → entra no fluxo na hora e a lista é relida
  // (debounce de 800 ms para rajada de mensagens não virar rajada de requisições).
  useEffect(() => {
    const es = new EventSource(`${BASE}/api/events/stream`, {
      withCredentials: true,
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        loadConversations().catch(() => {});
      }, 800);
    };

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      let env: {
        event?: string;
        sessionId?: string;
        session?: string;
        payload?: {
          keyId?: string;
          chatJid?: string;
          fromMe?: boolean;
          source?: string | null;
          type?: string;
          text?: string | null;
          timestamp?: number;
        };
      };
      try {
        env = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (env.event !== 'message' || !env.payload?.chatJid) return;
      const p = env.payload;
      const chatJid = p.chatJid!;
      // Grupo/transmissão/canal não entram nesta tela (mesma regra do gateway).
      if (/@(g\.us|broadcast|newsletter)$/.test(chatJid)) return;
      if (deviceFilter && env.sessionId !== deviceFilter) return;

      setFeed((prev) =>
        [
          {
            id: `sse-${env.sessionId}-${p.keyId ?? p.timestamp}`,
            keyId: p.keyId ?? '',
            sessionId: env.sessionId ?? '',
            sessionName: env.session ?? '',
            chatJid,
            name: null,
            fromMe: p.fromMe ?? false,
            source: p.source ?? null,
            type: p.type ?? 'text',
            text: p.text ?? null,
            timestamp: new Date((p.timestamp ?? 0) * 1000).toISOString(),
          },
          ...prev.filter((m) => m.keyId !== p.keyId),
        ].slice(0, FEED_MAX),
      );
      scheduleReload();
      // Conversa aberta na tela → recarrega o histórico dela também.
      const open = selectedRef.current;
      if (
        open &&
        open.sessionId === env.sessionId &&
        open.chatJid === chatJid
      ) {
        api.sessions
          .messages(open.sessionId, open.chatJid)
          .then(setMessages)
          .catch(() => {});
      }
    };
    return () => {
      if (timer) clearTimeout(timer);
      es.close();
    };
  }, [deviceFilter, loadConversations]);

  // Histórico da conversa aberta (a tela é de monitoramento; responder é opcional).
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    let alive = true;
    api.sessions
      .messages(selected.sessionId, selected.chatJid)
      .then((list) => {
        if (alive) setMessages(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selected?.sessionId, selected?.chatJid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visible = useMemo(
    () =>
      statusFilter === 'all'
        ? conversations
        : conversations.filter((c) => c.status === statusFilter),
    [conversations, statusFilter],
  );

  // Marca 🟡 / volta para 🔴. Manda o keyId da entrada que está na tela: se chegou mensagem nova
  // nesse meio-tempo, o gateway devolve 'pending' e nada é marcado.
  async function setTriage(
    conv: InboxConversationDto,
    state: 'ignored' | 'pending',
  ) {
    setBusyKey(convKey(conv));
    setError(null);
    try {
      const res = await api.inbox.triage(conv.sessionId, {
        chatJid: conv.chatJid,
        state,
        ...(state === 'ignored' && conv.lastInboundKeyId
          ? { keyId: conv.lastInboundKeyId }
          : {}),
      });
      if (state === 'ignored' && res.status === 'pending') {
        setError(
          `${displayName(conv)} recebeu mensagem nova antes da marcação — segue em vermelho (leia antes de marcar).`,
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          convKey(c) === convKey(conv) ? { ...c, status: res.status } : c,
        ),
      );
      await loadConversations();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function reply(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selected || sending) return;
    setError(null);
    setSending(true);
    const target = sendTarget(selected.chatJid);
    // Retry da MESMA intenção reusa a chave — o gateway dedupa (não manda duas vezes).
    const cur = intentRef.current;
    const key =
      cur && cur.chat === selected.chatJid && cur.text === body
        ? cur.key
        : `painel-${crypto.randomUUID()}`;
    intentRef.current = { key, chat: selected.chatJid, text: body };
    try {
      await api.sessions.sendText(selected.sessionId, target, body, {
        idempotencyKey: key,
      });
      intentRef.current = null;
      setText('');
      api.sessions
        .messages(selected.sessionId, selected.chatJid)
        .then(setMessages)
        .catch(() => {});
      await loadConversations();
    } catch (err) {
      setError(
        `${(err as Error).message} — o texto foi mantido; tentar de novo reaproveita a mesma intenção (sem duplicar).`,
      );
    } finally {
      setSending(false);
    }
  }

  const chip = (
    value: StatusFilter,
    label: string,
    n: number,
    dot?: string,
  ) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
        statusFilter === value
          ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
          : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
      }`}
    >
      {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
      {label}
      <span className="font-mono text-xs text-zinc-500">{n}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Atendimento{' '}
            <span className="text-zinc-500">· todos os aparelhos</span>
          </h1>
          <span
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
              connected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            {connected ? 'ao vivo' : 'reconectando…'}
          </span>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-6 py-3">
        {chip('all', 'Todas', counts.total)}
        {chip('pending', 'Precisa responder', counts.pending, DOT.pending)}
        {chip('ignored', 'Não preciso', counts.ignored, DOT.ignored)}
        {chip('answered', 'Respondidas', counts.answered, DOT.answered)}
        <select
          value={deviceFilter}
          onChange={(e) => {
            setDeviceFilter(e.target.value);
            setSelected(null);
          }}
          className="ml-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Todos os aparelhos</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="px-6 pt-3 text-sm text-amber-400">
          {error}
        </p>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Lista de conversas — a superfície de trabalho */}
        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
            <span>Conversas (mais recente primeiro)</span>
            <span>{visible.length} exibida(s)</span>
          </div>
          <div className="flex-1 divide-y divide-zinc-800 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-zinc-500">
                Nada aqui. Mensagens novas aparecem sozinhas (a tela é ao vivo).
              </p>
            )}
            {visible.map((c) => {
              const key = convKey(c);
              const active = selected && convKey(selected) === key;
              return (
                <div
                  key={key}
                  className={`px-4 py-3 ${active ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}
                >
                  <button
                    onClick={() => {
                      setSelected(c);
                      setTab('conversa');
                    }}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      title={STATUS_LABEL[c.status]}
                      aria-label={STATUS_LABEL[c.status]}
                      className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${DOT[c.status]}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {displayName(c)}
                        </span>
                        <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300">
                          {c.sessionName}
                        </span>
                        {c.pendingInbound > 1 && (
                          <span className="shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">
                            {c.pendingInbound} novas
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-400">
                        {preview(c)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-zinc-500">
                      {hhmm(c.lastTimestamp)}
                      <span className="block">{since(c.lastTimestamp)}</span>
                    </span>
                  </button>
                  <div className="mt-2 flex gap-2 pl-6">
                    {c.status === 'pending' && (
                      <button
                        disabled={busyKey === key}
                        onClick={() => setTriage(c, 'ignored')}
                        title="Não vou responder esta (fim de conversa) — fica amarela"
                        className="rounded-md border border-amber-500/40 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        🟡 não preciso responder
                      </button>
                    )}
                    {c.status === 'ignored' && (
                      <button
                        disabled={busyKey === key}
                        onClick={() => setTriage(c, 'pending')}
                        title="Voltar para a fila de resposta"
                        className="rounded-md border border-red-500/40 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        🔴 preciso responder
                      </button>
                    )}
                    {c.status === 'answered' && (
                      <span className="text-[11px] text-zinc-500">
                        respondido{' '}
                        {c.lastSource === 'phone'
                          ? 'no aparelho'
                          : 'pelo gateway'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Painel direito: conversa aberta OU fluxo cronológico de todos os aparelhos */}
        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
            {(['conversa', 'fluxo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  tab === t
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                {t === 'conversa' ? 'Conversa' : 'Fluxo ao vivo'}
              </button>
            ))}
            {tab === 'conversa' && selected && (
              <span className="ml-auto truncate text-xs text-zinc-500">
                {displayName(selected)} · {selected.sessionName}
                {selected.phone ? ` · ${selected.phone}` : ''}
              </span>
            )}
          </div>

          {tab === 'fluxo' ? (
            <div className="flex-1 divide-y divide-zinc-800 overflow-y-auto">
              {feed.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-zinc-500">
                  Aguardando mensagens…
                </p>
              )}
              {feed.map((m) => (
                <div
                  key={`${m.sessionId}-${m.keyId}-${m.id}`}
                  className="px-4 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>{hhmm(m.timestamp)}</span>
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                      {m.sessionName}
                    </span>
                    <span className="truncate">
                      {m.name?.trim() || numberFromJid(m.chatJid)}
                    </span>
                    <span
                      className={m.fromMe ? 'text-emerald-400' : 'text-red-400'}
                    >
                      {m.fromMe
                        ? `saiu${m.source === 'phone' ? ' (aparelho)' : ''}`
                        : 'chegou'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-zinc-200">
                    {m.text?.trim() || mediaLabel(m.type) || '…'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {!selected && (
                  <p className="py-10 text-center text-sm text-zinc-500">
                    Escolha uma conversa à esquerda para ler o histórico (e
                    responder, se quiser).
                  </p>
                )}
                {selected &&
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          m.fromMe
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-zinc-800 text-zinc-100'
                        }`}
                      >
                        {m.text?.trim() || mediaLabel(m.type) || '…'}
                        <div className="mt-1 text-right text-[10px] opacity-60">
                          {hhmm(m.timestamp)}
                          {m.fromMe && m.source === 'phone' && ' · aparelho'}
                        </div>
                      </div>
                    </div>
                  ))}
                {selected && messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-zinc-500">
                    Sem histórico guardado desta conversa ainda.
                  </p>
                )}
                <div ref={endRef} />
              </div>
              {selected && (
                <form
                  onSubmit={reply}
                  className="flex gap-2 border-t border-zinc-800 p-3"
                >
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Responder ${displayName(selected)} por ${selected.sessionName} (opcional — o normal é responder no aparelho)`}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    disabled={!text.trim() || sending}
                    aria-busy={sending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
