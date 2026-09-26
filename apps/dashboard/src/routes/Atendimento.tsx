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
import { ChatThread } from '../components/chat/ChatThread';
import { ForwardedTag } from '../components/chat/ForwardedTag';
import { Ticks } from '../components/chat/Ticks';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  displayName,
  isTriageExcludedChat,
  numberFromJid,
  sendTarget,
} from '../lib/jid';
import {
  applyAck,
  applyReaction,
  feedItemFromEvent,
  mergeFeed,
  overlayAcks,
  rememberFeedItem,
  rememberAck,
  rememberReaction,
  replayReactions,
  stabilize,
  upsertFeedItem,
  type AckMemory,
  type FeedMemory,
  type LiveEvent,
  type ReactionMemory,
} from '../lib/live-events';
import { conversationPreview, messagePreview } from '../lib/message-format';
import { clock, since } from '../lib/time-format';
import { deviceBlockReason, sendErrorMessage } from '../lib/send-feedback';
import { useLiveStream } from '../lib/use-live-stream';

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
  // Erro do ENVIO: aparece junto da caixa de resposta (no topo da página passava despercebido).
  const [sendError, setSendError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // O SSE não pode reabrir a cada clique na lista: o handler lê a conversa aberta e o filtro por ref.
  const selectedRef = useRef<InboxConversationDto | null>(null);
  selectedRef.current = selected;
  const deviceRef = useRef(deviceFilter);
  deviceRef.current = deviceFilter;
  // Tiques e reações vistos ao vivo (E23): reaplicados sobre cada recarga do servidor — um GET que
  // saiu antes do evento não pode desfazê-lo, e o ACK que chegou antes do INSERT nunca volta no GET.
  const ackMem = useRef<AckMemory>(new Map());
  const rxMem = useRef<ReactionMemory>([]);
  // Itens do "Fluxo ao vivo" vindos do SSE: um GET do fluxo que leu o banco ANTES do INSERT (o
  // evento sai antes da gravação) não pode apagá-los ao voltar — mergeFeed.
  const feedMem = useRef<FeedMemory>([]);
  const timers = useRef<{ list?: number; open?: number }>({});
  const [stickKey, setStickKey] = useState(0);
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
  // Resposta de um filtro de aparelho que já não é o da tela (GET em voo na troca, ou o debounce
  // que dispara depois dela) é descartada — senão lista e contadores voltam ao filtro antigo.
  const loadConversations = useCallback(async () => {
    const body = await api.inbox.conversations({
      limit: 300,
      sessions: sessionsParam,
    });
    if (deviceRef.current !== deviceFilter) return;
    setConversations(body.conversations);
    setCounts(body.counts);
  }, [sessionsParam, deviceFilter]);

  const loadFeed = useCallback(async () => {
    const requestedAt = Date.now();
    const rows = await api.inbox.feed({ limit: 100, sessions: sessionsParam });
    if (deviceRef.current !== deviceFilter) return;
    setFeed(
      overlayAcks(
        mergeFeed(rows, feedMem.current, requestedAt, FEED_MAX),
        ackMem.current,
      ),
    );
  }, [sessionsParam, deviceFilter]);

  // Trocou o filtro: os itens ao vivo guardados eram do filtro anterior.
  useEffect(() => {
    feedMem.current = [];
  }, [deviceFilter]);

  // Histórico da conversa aberta (a tela é de monitoramento; responder é opcional).
  const loadOpen = useCallback(async () => {
    const open = selectedRef.current;
    if (!open) return;
    const requestedAt = Date.now();
    const list = await api.sessions.messages(open.sessionId, open.chatJid);
    const cur = selectedRef.current;
    if (
      !cur ||
      cur.sessionId !== open.sessionId ||
      cur.chatJid !== open.chatJid
    )
      return; // trocou de conversa enquanto o GET voltava
    const merged = replayReactions(
      overlayAcks(list, ackMem.current),
      rxMem.current,
      requestedAt,
    );
    setMessages((prev) => stabilize(prev, merged));
  }, []);

  const resync = useCallback(() => {
    Promise.all([loadConversations(), loadFeed(), loadOpen()]).catch(() => {});
  }, [loadConversations, loadFeed, loadOpen]);

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    const tick = () => {
      if (inFlight || !alive) return; // uma leitura pendente por recurso
      inFlight = true;
      Promise.all([loadConversations(), loadFeed(), loadOpen()])
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
  }, [loadConversations, loadFeed, loadOpen]);

  // Rajada de mensagens não vira rajada de requisições (800 ms). A conversa aberta também espera:
  // o evento sai antes de a linha ser gravada no banco.
  const debounce = (k: 'list' | 'open', fn: () => Promise<unknown>) => {
    if (timers.current[k] !== undefined) return;
    timers.current[k] = window.setTimeout(() => {
      timers.current[k] = undefined;
      fn().catch(() => {});
    }, 800);
  };
  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.list);
      window.clearTimeout(t.open);
    };
  }, []);

  // Tempo real: o SSE /api/events/stream entrega os eventos de TODAS as sessões (inclusive de
  // outra réplica, via fan-out Redis). Casamento SEMPRE por (sessionId, keyId) — nunca por chatJid.
  const onLiveEvent = (ev: LiveEvent) => {
    if (ev.kind === 'ack') {
      rememberAck(ackMem.current, ev);
      setFeed((prev) => applyAck(prev, ev));
      setMessages((prev) => applyAck(prev, ev));
      return;
    }
    if (ev.kind === 'reaction') {
      // Reação não mexe no semáforo (D-028): só o balão da conversa aberta.
      rememberReaction(rxMem.current, ev, Date.now());
      setMessages((prev) => applyReaction(prev, ev));
      return;
    }
    // Grupo/transmissão/canal não entram nesta tela (mesma regra do gateway).
    if (isTriageExcludedChat(ev.chatJid)) return;
    if (deviceRef.current && ev.sessionId !== deviceRef.current) return;
    const item = overlayAcks([feedItemFromEvent(ev)], ackMem.current)[0];
    rememberFeedItem(feedMem.current, item, Date.now());
    setFeed((prev) => upsertFeedItem(prev, item, FEED_MAX));
    debounce('list', loadConversations);
    const open = selectedRef.current;
    if (
      open &&
      open.sessionId === ev.sessionId &&
      open.chatJid === ev.chatJid
    ) {
      debounce('open', loadOpen);
    }
  };
  const connected = useLiveStream(onLiveEvent, resync);

  // Stream fora do ar: a conversa aberta passa a ser relida a cada 5 s (sem ela, tique e reação
  // congelariam em silêncio).
  useEffect(() => {
    if (connected || !selected) return;
    const id = setInterval(() => {
      loadOpen().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [connected, selected, loadOpen]);

  useEffect(() => {
    setMessages([]);
    setSendError(null);
    if (selected) loadOpen().catch(() => {});
  }, [selected?.sessionId, selected?.chatJid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aparelho da conversa aberta desconectado → não adianta tentar enviar por aqui.
  const blocked = selected
    ? deviceBlockReason(sessions.find((s) => s.id === selected.sessionId))
    : null;

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
    setSendError(null);
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
      // Só limpa se o campo ainda tem o texto enviado (o operador pode ter começado outra mensagem).
      setText((t) => (t.trim() === body ? '' : t));
      const open = selectedRef.current;
      if (
        open &&
        open.sessionId === selected.sessionId &&
        open.chatJid === selected.chatJid
      )
        setStickKey((k) => k + 1);
      loadOpen().catch(() => {});
      await loadConversations();
    } catch (err) {
      setSendError(
        sendErrorMessage(
          err as { status?: number; message?: string },
          selected.sessionName,
        ),
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
    // Altura da janela (E23): a conversa aberta e as listas rolam por DENTRO do painel — o ChatThread
    // só consegue manter o fim à vista (e carregar imagem ao aparecer) se ele for o contêiner que rola.
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
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

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-4 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-1">
        {/* Lista de conversas — a superfície de trabalho */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800">
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
                // A LINHA inteira abre a conversa (o fundo acende nela toda — antes só o nome/prévia
                // era clicável e o clique na faixa de baixo ou na margem se perdia). O <button> fica
                // para o teclado: Enter/Espaço disparam click, que sobe até aqui.
                <div
                  key={key}
                  onClick={() => {
                    setSelected(c);
                    setTab('conversa');
                  }}
                  className={`cursor-pointer px-4 py-3 ${active ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}
                >
                  <button
                    type="button"
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
                        {conversationPreview(c)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-zinc-500">
                      {clock(c.lastTimestamp)}
                      <span className="block">{since(c.lastTimestamp)}</span>
                    </span>
                  </button>
                  <div className="mt-2 flex gap-2 pl-6">
                    {c.status === 'pending' && (
                      <button
                        disabled={busyKey === key}
                        onClick={(e) => {
                          e.stopPropagation(); // marcar a cor não abre a conversa
                          void setTriage(c, 'ignored');
                        }}
                        title="Não vou responder esta (fim de conversa) — fica amarela"
                        className="rounded-md border border-amber-500/40 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        🟡 não preciso responder
                      </button>
                    )}
                    {c.status === 'ignored' && (
                      <button
                        disabled={busyKey === key}
                        onClick={(e) => {
                          e.stopPropagation();
                          void setTriage(c, 'pending');
                        }}
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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800">
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
                    <span>{clock(m.timestamp)}</span>
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
                    <ForwardedTag
                      isForwarded={m.isForwarded}
                      forwardingScore={m.forwardingScore}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate">
                        {messagePreview(m)}
                      </span>
                      <Ticks
                        fromMe={m.fromMe}
                        chatJid={m.chatJid}
                        status={m.status}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {!selected && (
                <p className="flex-1 py-10 text-center text-sm text-zinc-500">
                  Escolha uma conversa à esquerda para ler o histórico (e
                  responder, se quiser).
                </p>
              )}
              {selected && (
                <ChatThread
                  key={convKey(selected)}
                  messages={messages}
                  chatJid={selected.chatJid}
                  stickKey={stickKey}
                  empty={
                    <p className="py-10 text-center text-sm text-zinc-500">
                      Sem histórico guardado desta conversa ainda.
                    </p>
                  }
                  // E25: ⌄ Encaminhar / atalho ↪ — conversas do MESMO aparelho (contatos e grupos,
                  // inclusive os que esta caixa não lista); o modo seleção troca a resposta pela barra.
                  forward={{
                    sessionId: selected.sessionId,
                    deviceName: selected.sessionName,
                    blockedReason: deviceBlockReason(
                      sessions.find((s) => s.id === selected.sessionId),
                      'encaminhe',
                    ),
                  }}
                  footer={
                    <div className="border-t border-zinc-800 p-3">
                      {(blocked || sendError) && (
                        <p
                          role="alert"
                          className={`mb-2 rounded-md px-3 py-2 text-sm ${
                            blocked
                              ? 'bg-zinc-800 text-zinc-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {blocked ?? sendError}
                        </p>
                      )}
                      <form onSubmit={reply} className="flex gap-2">
                        <input
                          value={text}
                          disabled={!!blocked}
                          onChange={(e) => setText(e.target.value)}
                          placeholder={`Responder ${displayName(selected)} por ${selected.sessionName} (opcional — o normal é responder no aparelho)`}
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={!text.trim() || sending || !!blocked}
                          aria-busy={sending}
                          title={
                            blocked
                              ? 'Aparelho desconectado'
                              : !text.trim()
                                ? 'Escreva a mensagem para enviar'
                                : undefined
                          }
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                        >
                          {sending ? 'Enviando…' : 'Enviar'}
                        </button>
                      </form>
                    </div>
                  }
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
