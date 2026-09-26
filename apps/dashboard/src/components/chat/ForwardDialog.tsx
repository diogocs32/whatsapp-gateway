import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MessageDto } from '@contracts';
import { ApiError, api } from '../../lib/api';
import {
  allClean,
  attemptSummary,
  forwardFailure,
  summarizeOutcomes,
  forwardTargets,
  maxGroupsFor,
  maxTargetsFor,
  mergeOutcomes,
  newForwardKey,
  planAttempt,
  refusalText,
  resultsVerdict,
  searchTargets,
  toggleTarget,
  FREQUENT_LIMIT_TEXT,
  willBecomeFrequent,
  type ForwardAttempt,
  type ForwardTarget,
  type TargetOutcome,
} from '../../lib/forward';
import {
  forwardMemory,
  memoryKey,
  type ForwardBanner as Banner,
} from '../../lib/forward-memory';
import { labelText, messagePreview } from '../../lib/message-format';
import { CheckIcon, CloseIcon, SendIcon, SpinnerIcon } from './icons';

// Diálogo "Encaminhar mensagem para" (E25 · P-068), como o do WhatsApp Web: "Pesquisar nome ou
// número", "Conversas recentes" da MESMA sessão (contatos e grupos), até 5 marcadas (1 quando a
// original é "encaminhada com frequência"; só 1 grupo quando ela já veio encaminhada) e o botão verde
// ➤ "Enviar". O gateway manda um destino por vez (1–3 s entre eles): o pedido leva segundos e a
// resposta traz `results[]` — cada conversa mostra o que aconteceu com ela. Tudo certo → fecha e a
// conversa avisa "Você encaminhou 1 item" (como o WhatsApp Web); senão, fica aberto com o resultado.
//
// Idempotência (lib/forward.ts planAttempt): a chave nasce no clique do ➤; repetir o MESMO conjunto
// (ex.: sem resposta do servidor) reaproveita a chave — o gateway não reenvia o que já saiu. O que
// saiu, saiu sem confirmação (`confirmed:false`, WWEBJS) ou pode ter saído (tempo esgotado) fica
// travado e nunca entra noutro pedido.

type Phase = 'choosing' | 'sending' | 'done';
const CONVERSATIONS_LIMIT = 500; // teto do GET …/messages/conversations

const FROZEN_TEXT =
  'O pedido anterior ficou sem resposta — tente de novo o MESMO pedido (o que o servidor já confirmou não é reenviado) antes de mudar as conversas.';

export function ForwardDialog({
  msg,
  sessionId,
  deviceName,
  blockedReason,
  onClose,
}: {
  msg: MessageDto;
  sessionId: string;
  deviceName: string;
  blockedReason: string | null;
  // `names` = conversas que receberam (tudo certo, sem pendência) → a conversa mostra o aviso.
  onClose: (done?: { names: string[] }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const listId = useId();
  const max = maxTargetsFor(msg);
  const maxGroups = maxGroupsFor(msg);
  const frequentSoon = willBecomeFrequent(msg);
  // Clique fora fecha (o `closedby="any"` não existe no Safari estável — MDN/BCD 26/09): só quando o
  // clique COMEÇOU e terminou no fundo (arrastar uma seleção de texto para fora não fecha).
  const downOnBackdrop = useRef(false);

  // O que um diálogo anterior desta mensagem deixou por terminar (lib/forward-memory.ts — por aba,
  // sobrevive a troca de conversa/tela, recarga e login expirado).
  const memKey = memoryKey(sessionId, msg.id);
  const [saved] = useState(() => forwardMemory.get(memKey));
  const [targets, setTargets] = useState<ForwardTarget[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ForwardTarget[]>(
    saved?.selected ?? [],
  );
  const [hint, setHint] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(saved ? 'done' : 'choosing');
  const [outcomes, setOutcomes] = useState<Map<string, TargetOutcome>>(
    () => saved?.outcomes ?? new Map(),
  );
  const [banner, setBanner] = useState<Banner | null>(saved?.banner ?? null);
  const [attempt, setAttempt] = useState<ForwardAttempt | null>(
    saved?.attempt ?? null,
  );
  // O que a última resposta ensinou: a mensagem foi recusada (o ➤ trava — nenhum destino muda
  // isso), o contador vivo limita a 1 conversa, vale tentar de novo, ou o desfecho foi INCERTO
  // (sem resposta, 5xx, 409 "em andamento") — aí o pedido congela: só dá para repeti-lo igual.
  const [refused, setRefused] = useState(saved?.refused ?? false);
  const [maxLive, setMaxLive] = useState(saved?.maxLive ?? max);
  const [canRetry, setCanRetry] = useState(saved?.canRetry ?? false);
  const [frozen, setFrozen] = useState(saved?.frozen ?? false);
  const sendingRef = useRef(false);
  const aliveRef = useRef(true);

  // Abre como modal (o resto da página fica inerte) e põe o foco na busca. Layout effect: o cleanup
  // fecha com o nó ainda no documento — o foco volta a quem abriu (mesmo padrão do lightbox).
  useLayoutEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    searchRef.current?.focus();
    return () => d?.close();
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Guarda o que não pode se perder ao fechar (ver ForwardSnapshot). Diálogo sem nenhum pedido feito
  // não guarda nada.
  useEffect(() => {
    if (phase === 'sending') return;
    if (!attempt && outcomes.size === 0) return;
    // Tudo certo: nada a retomar — o próximo diálogo desta mensagem é um encaminhamento novo. (O
    // efeito roda DEPOIS do send(); sem esta guarda ele regravaria o que o sucesso acabou de apagar.)
    if (
      !frozen &&
      allClean(
        selected.map((t) => t.key),
        outcomes,
      )
    ) {
      forwardMemory.delete(memKey);
      return;
    }
    forwardMemory.set(memKey, {
      selected,
      outcomes,
      attempt,
      frozen,
      refused,
      maxLive,
      canRetry,
      banner,
    });
  }, [
    memKey,
    phase,
    selected,
    outcomes,
    attempt,
    frozen,
    refused,
    maxLive,
    canRetry,
    banner,
  ]);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    api.sessions
      .conversations(sessionId, CONVERSATIONS_LIMIT)
      .then((list) => {
        if (alive) setTargets(forwardTargets(list));
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [sessionId, reload]);

  const visible = useMemo(
    () => (targets ? searchTargets(targets, query) : []),
    [targets, query],
  );
  const isSelected = (t: ForwardTarget) =>
    selected.some((s) => s.key === t.key);
  const locked = (t: ForwardTarget) => !!outcomes.get(t.key)?.locked;
  const pendingTargets = selected.filter((t) => !locked(t));
  const sending = phase === 'sending';

  function toggle(t: ForwardTarget) {
    // `sendingRef`: o ➤ já disparou mas o "enviando…" ainda não foi desenhado.
    if (sending || sendingRef.current || locked(t)) return;
    if (frozen) {
      setHint(FROZEN_TEXT);
      return;
    }
    const r = toggleTarget(selected, t, maxLive, maxGroups);
    setSelected(r.selected);
    setHint(r.refused ? refusalText(r.refused) : null);
  }

  // A faixa resume TODAS as conversas marcadas (pedidos anteriores inclusive), não só o último.
  const summarizeSelected = (m: Map<string, TargetOutcome>): Banner =>
    summarizeOutcomes(
      selected.map((t) => m.get(t.key)).filter((o): o is TargetOutcome => !!o),
    );

  async function send() {
    if (sendingRef.current || blockedReason || !targets) return;
    const toSend = selected.filter((t) => !locked(t));
    if (!toSend.length && !frozen) return;
    // Congelado: repete EXATAMENTE o pedido anterior (mesma chave, mesmo conjunto — inclusive quem já
    // saiu, que volta como `deduped`), até uma resposta com results[] resolver cada destino.
    const att =
      frozen && attempt
        ? attempt
        : planAttempt(attempt, msg.id, toSend, newForwardKey);
    // Fotografia do diálogo no momento do clique (as variáveis de estado deste render).
    const base = { selected, outcomes, refused, maxLive };
    // Grava o pedido ANTES da resposta, como congelado: se o diálogo sair da tela no meio (Voltar do
    // navegador, troca de conversa, recarga), o próximo diálogo desta mensagem só pode repeti-lo igual.
    forwardMemory.set(memKey, {
      ...base,
      attempt: att,
      frozen: true,
      canRetry: true,
      banner: {
        tone: 'error',
        text: 'O encaminhamento anterior ainda não tinha terminado quando a tela foi fechada — tente de novo o MESMO pedido (o que o servidor já confirmou não é reenviado).',
      },
    });
    setAttempt(att);
    sendingRef.current = true;
    setPhase('sending');
    setBanner(null);
    setHint(null);
    // Nada mais muda `outcomes` com o pedido em voo (a lista trava) — o fechamento abaixo é o atual.
    let next: Map<string, TargetOutcome> | null = null;
    let summary: Banner | null = null;
    let verdict = {
      final: false,
      limitOne: false,
      retry: false,
      uncertain: false,
    };
    let hadResults = false;
    let nextAttempt: ForwardAttempt | null = att;
    try {
      const { results } = await api.sessions.forward(sessionId, msg.id, {
        to: att.to,
        idempotencyKey: att.key,
      });
      next = mergeOutcomes(outcomes, results, att);
      summary = summarizeSelected(next);
      verdict = { ...resultsVerdict(results), uncertain: false };
      hadResults = true;
    } catch (e) {
      const err =
        e instanceof ApiError
          ? e
          : { message: (e as Error | undefined)?.message };
      const f = forwardFailure(err, deviceName);
      if (f.results) next = mergeOutcomes(outcomes, f.results, att);
      if (f.resetKey) nextAttempt = null;
      summary =
        f.summary && next
          ? summarizeSelected(next)
          : {
              tone: f.results ? attemptSummary(f.results).tone : 'error',
              text: f.text,
            };
      const fromItems = f.results ? resultsVerdict(f.results) : null;
      verdict = {
        final: !!f.final || !!fromItems?.final,
        limitOne: !!f.limitOne || !!fromItems?.limitOne,
        retry: f.retry,
        uncertain: !!f.uncertain,
      };
      hadResults = !!f.results;
    } finally {
      sendingRef.current = false;
    }
    const merged = next ?? outcomes;
    // Congelado só descongela com `results[]` (cada destino com desfecho). Qualquer outra resposta
    // (429, 401/403, 5xx, rede…) não diz o que o pedido anterior fez — segue congelado. Se o gateway
    // passou a recusar a mensagem (ou limitar a 1), repetir não adianta: vira recusa (não trava o
    // diálogo para sempre) e o operador confere no celular.
    let stillFrozen = verdict.uncertain;
    let refuse = verdict.final;
    if (frozen && !hadResults) {
      if (verdict.final || verdict.limitOne) {
        stillFrozen = false;
        refuse = true;
        summary = {
          tone: 'error',
          text: `${summary?.text ?? 'Não dá para repetir o pedido anterior.'} O pedido anterior ficou sem resposta — confira no celular quem recebeu.`,
        };
      } else {
        stillFrozen = true;
      }
    }
    const keys = selected.map((t) => t.key);
    const clean = !stillFrozen && allClean(keys, merged);
    // O desfecho vai para a memória mesmo que o diálogo já tenha saído da tela durante o envio. Tudo
    // certo COM o diálogo na tela: apaga (o operador vê "Você encaminhou…"). Tudo certo com a tela
    // já fechada: guarda — o próximo diálogo desta mensagem mostra quem recebeu (travado), senão o
    // operador, sem ter visto a confirmação, encaminharia de novo.
    if (clean && aliveRef.current) {
      forwardMemory.delete(memKey);
    } else {
      forwardMemory.set(memKey, {
        ...base,
        outcomes: merged,
        attempt: nextAttempt,
        frozen: stillFrozen,
        refused: refuse,
        maxLive: verdict.limitOne ? 1 : maxLive,
        canRetry: verdict.retry || stillFrozen,
        banner: summary,
      });
    }
    if (!aliveRef.current) return;
    setOutcomes(merged);
    setPhase('done');
    setAttempt(nextAttempt);
    setRefused(refuse);
    setCanRetry(verdict.retry || stillFrozen);
    setFrozen(stillFrozen);
    if (verdict.limitOne) {
      setMaxLive(1);
      // A faixa já diz o limite quando a recusa veio antes de enviar (400 sem results).
      if (summary?.text !== FREQUENT_LIMIT_TEXT) setHint(FREQUENT_LIMIT_TEXT);
    }
    if (clean) {
      // Tudo certo → fecha e a conversa avisa (o WhatsApp Web volta para o chat). Um novo diálogo
      // desta mensagem é um novo encaminhamento (chave nova), como no WhatsApp.
      ref.current?.close();
      onClose({ names: selected.map((t) => t.name) });
      return;
    }
    setBanner(summary);
    // Fechado à força durante o envio: o resultado por destino precisa aparecer.
    if (ref.current && !ref.current.open) ref.current.showModal();
  }

  const close = () => {
    if (sendingRef.current) return;
    const keys = selected.map((t) => t.key);
    const clean = !frozen && allClean(keys, outcomes);
    if (clean) forwardMemory.delete(memKey);
    const done = clean ? { names: selected.map((t) => t.name) } : undefined;
    ref.current?.close();
    onClose(done);
  };

  // Depois de uma falha que vale repetir, o ➤ vira "Tentar de novo" (a chave só é reaproveitada se o
  // conjunto for o mesmo — lib/forward.ts planAttempt).
  const retryLabel =
    phase === 'done' &&
    canRetry &&
    !refused &&
    (frozen || pendingTargets.length > 0);
  const canSend =
    !sending &&
    !refused &&
    !!targets &&
    (frozen ? !!attempt : pendingTargets.length > 0) &&
    selected.length <= maxLive &&
    !blockedReason;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={sending}
      // Escape chega como `cancel`: com o pedido em voo, não fecha (o resultado por destino precisa
      // aparecer). O `close` é entregue depois, como tarefa — só reserva, como no lightbox.
      // Os eventos de <dialog> borbulham na árvore do React (react.dev, "common components"): só os do
      // próprio diálogo contam.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        close();
      }}
      onClose={(e) => {
        if (e.target !== e.currentTarget || ref.current?.open) return;
        // Com o pedido em voo o Esc é barrado (onCancel), mas o navegador fecha à força num Esc
        // repetido (visto no Chrome, 26/09). O componente segue montado e o pedido termina: tudo
        // certo → a conversa avisa; algo falhou → send() reabre o diálogo com o resultado.
        if (sendingRef.current) return;
        onClose();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) close();
        downOnBackdrop.current = false;
      }}
      className="m-auto h-[min(40rem,calc(100dvh-2rem))] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-zinc-900 p-0 text-zinc-100 shadow-2xl ring-1 ring-zinc-700 backdrop:bg-black/70 open:flex"
    >
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <button
          type="button"
          onClick={close}
          disabled={sending}
          aria-label="Fechar"
          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <h2 id={titleId} className="text-base font-medium">
          Encaminhar mensagem para
        </h2>
      </header>

      <div className="space-y-2 border-b border-zinc-800 px-4 py-3">
        <p
          className="truncate text-xs text-zinc-400"
          title={msg.text ?? undefined}
        >
          <span className="text-zinc-500">Mensagem: </span>
          {messagePreview(msg) || labelText(msg.type, msg.mediaType)}
        </p>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar nome ou número"
          aria-label="Pesquisar nome ou número"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <p className="text-xs text-zinc-500">
          {maxLive === 1
            ? 'Encaminhada com frequência: só 1 conversa por vez.'
            : `Até ${maxLive} conversas${maxGroups === 1 ? ' (só 1 grupo: a mensagem já veio encaminhada)' : ''}. Envia uma por vez, com alguns segundos entre elas.`}
        </p>
        {frequentSoon && (
          <p className="text-xs text-amber-300">
            Esta mensagem será marcada como encaminhada com frequência.
          </p>
        )}
      </div>

      {(blockedReason || banner) && (
        <div className="space-y-2 px-4 pt-3">
          {blockedReason && (
            <p
              role="alert"
              className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
            >
              {blockedReason}
            </p>
          )}
          {banner && (
            <p
              role={banner.tone === 'ok' ? 'status' : 'alert'}
              className={`rounded-md px-3 py-2 text-sm ${
                banner.tone === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : banner.tone === 'partial'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-red-500/10 text-red-300'
              }`}
            >
              {banner.text}
            </p>
          )}
        </div>
      )}
      {/* Região viva sempre montada: o leitor de tela só anuncia com segurança texto que MUDA dentro
          dela (região criada já com o texto pode passar em silêncio). */}
      <p
        role="status"
        className={hint ? 'px-4 pt-2 text-xs text-amber-300' : 'sr-only'}
      >
        {hint ?? ''}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto py-2" aria-busy={sending}>
        {!targets && !loadError && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Carregando conversas…
          </p>
        )}
        {loadError && (
          <p
            role="alert"
            className="px-4 py-6 text-center text-sm text-amber-300"
          >
            Não foi possível carregar as conversas.{' '}
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="underline hover:text-amber-200"
            >
              Tentar de novo
            </button>
          </p>
        )}
        {targets && targets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma conversa nesta sessão ainda.
          </p>
        )}
        {targets && targets.length > 0 && visible.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma conversa encontrada.
          </p>
        )}
        {visible.length > 0 && (
          <>
            <h3
              id={listId}
              className="px-4 pt-1 pb-2 text-xs font-medium tracking-wide text-emerald-400 uppercase"
            >
              Conversas recentes
            </h3>
            <ul role="group" aria-labelledby={listId}>
              {visible.map((t) => (
                <TargetRow
                  key={t.key}
                  t={t}
                  checked={isSelected(t)}
                  outcome={outcomes.get(t.key) ?? null}
                  sending={sending && isSelected(t) && !locked(t)}
                  disabled={sending || locked(t)}
                  onToggle={() => toggle(t)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-zinc-200">
            {selected.length
              ? selected.map((t) => t.name).join(', ')
              : 'Nenhuma conversa marcada'}
          </p>
          <p className="text-xs text-zinc-500">
            {sending
              ? `Encaminhando para ${pendingTargets.length} conversa${pendingTargets.length === 1 ? '' : 's'}, uma por vez…`
              : refused
                ? 'Esta mensagem não pode ser encaminhada pelo painel.'
                : `${selected.length}/${maxLive} marcada${selected.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {phase === 'done' && !sending && (
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Fechar
          </button>
        )}
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          aria-label={retryLabel ? 'Tentar de novo' : 'Enviar'}
          title={
            blockedReason
              ? 'Aparelho desconectado'
              : refused
                ? 'Esta mensagem não pode ser encaminhada pelo painel — encaminhe pelo celular'
                : selected.length > maxLive
                  ? FREQUENT_LIMIT_TEXT
                  : !pendingTargets.length
                    ? 'Marque ao menos uma conversa'
                    : retryLabel
                      ? 'Tentar de novo (o que já saiu não é reenviado)'
                      : 'Enviar'
          }
          className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {sending ? (
            <SpinnerIcon className="h-5 w-5" />
          ) : (
            <>
              {retryLabel && <span>Tentar de novo</span>}
              <SendIcon className="h-5 w-5" />
            </>
          )}
        </button>
      </footer>
    </dialog>
  );
}

function TargetRow({
  t,
  checked,
  outcome,
  sending,
  disabled,
  onToggle,
}: {
  t: ForwardTarget;
  checked: boolean;
  outcome: TargetOutcome | null;
  sending: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const ok = outcome?.kind === 'sent' || outcome?.kind === 'already';
  const tone = ok
    ? 'text-emerald-300'
    : outcome?.kind === 'failed'
      ? 'text-red-300'
      : 'text-amber-300';
  return (
    <li>
      <label
        className={`flex items-center gap-3 px-4 py-2 ${
          disabled ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-800/70'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-emerald-600"
        />
        <Avatar t={t} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{t.name}</span>
          {t.detail && (
            <span className="block truncate text-xs text-zinc-500">
              {t.detail}
            </span>
          )}
          {sending && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <SpinnerIcon className="h-3 w-3" /> enviando…
            </span>
          )}
          {outcome && !sending && (
            <span className={`flex items-start gap-1 text-xs ${tone}`}>
              {ok && <CheckIcon className="mt-0.5 h-2.5 w-3.5 shrink-0" />}
              <span>{outcome.text}</span>
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

function Avatar({ t }: { t: ForwardTarget }) {
  if (t.imgUrl) {
    return (
      <img
        src={t.imgUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial =
    t.kind === 'group'
      ? '👥'
      : t.name.replace(/^\+/, '').charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-200"
    >
      {initial || '?'}
    </span>
  );
}
