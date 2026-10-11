import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import type {
  ProxyListItemDto,
  ProxySuggestionDto,
  SessionDto,
  SessionStatus,
} from '@contracts';
import {
  ProxyPicker,
  type ProxyPickerOption,
} from '../components/proxies/ProxyPicker';
import {
  CONNECT_LINK_WWEBJS_REASON,
  ConnectLinkDialog,
} from '../components/sessions/ConnectLinkDialog';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { numberFromJid } from '../lib/jid';
import {
  consentFromPick,
  hasUsageInfo,
  inUseErrorText,
  isSelectableProxy,
  proxyOptionLabel,
  proxyUsageView,
  shareFromConsent,
  sharedNote,
  type ShareConsent,
} from '../lib/proxy-usage';
import {
  decideAfterHold,
  isValidSessionName,
  mustHoldCreate,
  suggestionView,
  type SuggestionState,
  type SuggestionTone,
} from '../lib/proxy-suggestion';
import {
  EMPTY_SESSION_FILTER,
  SESSION_STATUSES,
  filterSessions,
  isSessionFilterActive,
  parseSessionFilter,
  sessionFilterToParams,
  type SessionFilter,
} from '../lib/session-filter';

const STATUS_META: Record<SessionStatus, { label: string; cls: string }> = {
  WORKING: { label: 'Conectado', cls: 'bg-emerald-500/15 text-emerald-400' },
  SCAN_QR_CODE: {
    label: 'Aguardando QR',
    cls: 'bg-amber-500/15 text-amber-400',
  },
  PAIRING_CODE: {
    label: 'Código de pareamento',
    cls: 'bg-amber-500/15 text-amber-400',
  },
  STARTING: { label: 'Iniciando', cls: 'bg-sky-500/15 text-sky-400' },
  STOPPED: { label: 'Parado', cls: 'bg-zinc-600/30 text-zinc-300' },
  FAILED: { label: 'Falhou', cls: 'bg-red-500/15 text-red-400' },
  DEGRADED: { label: 'Degradado', cls: 'bg-orange-500/15 text-orange-400' },
};

// E26/P-084 — cor do aviso da sugestão de proxy (o texto já leva o prefixo "Sugestão:"/"Atenção:").
const NOTE_CLS: Record<SuggestionTone, string> = {
  suggest: 'text-emerald-300',
  warn: 'text-amber-300',
  info: 'text-zinc-300',
};

// E26/P-084 — teto da consulta feita no "Criar" quando a sugestão do nome ainda não chegou.
const HOLD_CAP_MS = 1_500;

// Sugestão com teto: AbortController + setTimeout, sem AbortSignal.timeout/any (Safari antigo —
// mesmo motivo de lib/public-connect.ts). O abort cobre também a leitura do corpo. undefined =
// erro ou estouro (403 do OPERATOR incluso): quem chama cria normalmente.
async function suggestionWithCap(
  sessionName: string,
): Promise<ProxySuggestionDto | null | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HOLD_CAP_MS);
  try {
    const r = await api.proxies.suggestion(sessionName, {
      signal: ctrl.signal,
    });
    return r.suggestion;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ConnectModal({
  session,
  onClose,
  onOpenLink,
}: {
  session: SessionDto;
  onClose: () => void;
  onOpenLink: () => void; // E27/P-086 — troca este modal pelo diálogo do link
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [phone, setPhone] = useState(session.phoneNumber ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  // UP-05 (auditoria 09/2026): o botão "Gerar novo QR" só volta quando a operação REAL
  // terminou (um QR diferente chegou) — não por timer fixo. `qrBeforeRegen` guarda o QR
  // anterior para detectar a troca; teto de 20s evita botão preso se a engine falhou.
  const qrBeforeRegen = useRef<string | null>(null);
  const [openedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const closedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closedRef.current = false;
    const tick = async () => {
      try {
        const r = await api.sessions.qr(session.id);
        if (closedRef.current) return;
        setQr(r.qr);
        setStatus(r.status);
        setPairingCode(r.pairingCode ?? null);
        setElapsed(Math.round((Date.now() - openedAt) / 1000));
      } catch {
        /* ignora durante o boot do socket */
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      closedRef.current = true;
      clearInterval(id);
    };
  }, [session.id, openedAt]);

  // UP-05: libera o botão quando o QR mudou de verdade (ou após o teto).
  useEffect(() => {
    if (!regenerating) return;
    if (qr && qr !== qrBeforeRegen.current) setRegenerating(false);
  }, [qr, regenerating]);

  // UP-07: diálogo acessível — foco entra no modal ao abrir, Escape fecha.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setCode(null);
    try {
      const r = await api.sessions.pairingCode(session.id, phone);
      setCode(r.code);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  // Credencial nova + socket novo → QR novo. Restart puro não serve aqui: se a sessão foi
  // desconectada pelo celular, ele reconecta com as credenciais mortas e nunca gera QR.
  async function regenerate() {
    if (regenerating) return;
    qrBeforeRegen.current = qr;
    setRegenerating(true);
    setErr(null);
    setCode(null);
    try {
      await api.sessions.newQr(session.id);
      // Libera quando um QR novo chegar (efeito acima) ou após 20s (engine falhou/lenta).
      setTimeout(() => setRegenerating(false), 20_000);
    } catch (e) {
      setErr((e as Error).message);
      setRegenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="connect-dialog-title" className="font-semibold">
            Conectar <span className="text-zinc-400">{session.name}</span>
          </h2>
          <StatusBadge status={status} />
        </div>
        {status === 'STARTING' && elapsed > 60 && (
          <p className="mb-3 text-xs text-amber-400">
            Iniciando há {elapsed}s — carregamento lento (proxy/rede) ou build
            do WhatsApp Web; se passar de 4 min a engine encerra a tentativa
            sozinha.
          </p>
        )}
        {status === 'PAIRING_CODE' && pairingCode && (
          <p className="mb-3 text-center font-mono text-2xl tracking-widest text-emerald-300">
            {pairingCode}
          </p>
        )}

        {status === 'WORKING' ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-2xl text-emerald-400">
              ✓
            </div>
            <p className="text-emerald-400">Conectado com sucesso!</p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Concluir
            </button>
          </div>
        ) : (
          <>
            <div className="grid place-items-center rounded-xl bg-white p-3">
              {qr ? (
                <img src={qr} alt="QR Code" className="h-64 w-64" />
              ) : (
                <div className="grid h-64 w-64 place-items-center text-sm text-zinc-500">
                  Gerando QR…
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e
              escaneie.
            </p>

            <details className="mt-4 rounded-lg border border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm text-zinc-300">
                Ou parear por número (código de 8 dígitos)
              </summary>
              <form onSubmit={requestCode} className="mt-3 flex gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600">
                  Gerar
                </button>
              </form>
              {code && (
                <p className="mt-3 text-center font-mono text-2xl tracking-widest text-emerald-400">
                  {code}
                </p>
              )}
              {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            </details>

            <div className="mt-4 flex gap-2">
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="flex-1 rounded-lg bg-zinc-700 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50"
              >
                {regenerating ? 'Gerando…' : 'Gerar novo QR'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
            {/* E27/P-086 — a pessoa do número não está aqui: link para ela ler o QR de outra tela. */}
            <button
              type="button"
              onClick={onOpenLink}
              disabled={session.engine !== 'BAILEYS'}
              title={
                session.engine !== 'BAILEYS'
                  ? CONNECT_LINK_WWEBJS_REASON
                  : undefined
              }
              className="mt-2 w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Link para conectar de outro lugar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Sessions() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<'BAILEYS' | 'WWEBJS'>('BAILEYS');
  // D-008 — proxy opcional na criação. E26/P-084: `proxyChoice` null = automático (aceita a
  // sugestão), '' = o dono escolheu "Sem proxy", id = escolha manual. O valor do seletor é DERIVADO
  // (`view.selectValue`): o que se vê é o que se envia. E28/P-107: a lista traz o pool com o uso —
  // verde = livre, vermelho = já em uso (com quantas sessões), escolher vermelho compartilha.
  const [proxyChoice, setProxyChoice] = useState<string | null>(null);
  const [proxyList, setProxyList] = useState<ProxyListItemDto[]>([]);
  const selectableProxies = proxyList.filter(isSelectableProxy);
  // E28/D-051 — consentimento de compartilhar registrado NA ESCOLHA (o dono pegou um vermelho na
  // lista). Pré-seleção da sugestão e "Usar este proxy" nunca contam.
  const [shareConsent, setShareConsent] = useState<ShareConsent | null>(null);
  // Nomes de quem usa cada proxy segundo a lista (gateway anterior à E28: ninguém conhecido).
  const inUseBy = (id: string): string[] => {
    const p = proxyList.find((x) => x.id === id);
    return p && hasUsageInfo(p) ? p.sessions.map((x) => x.name) : [];
  };
  // E26/P-084 — resposta da sugestão junto do nome consultado (só vale se o campo tiver esse nome)
  // e do conjunto de sessões da consulta (`key`): entrou/saiu sessão → o "Criar" confere de novo.
  const [suggestion, setSuggestion] = useState<
    (SuggestionState & { key: string }) | null
  >(null);
  // 'hold' = conferindo a sugestão antes de criar; 'create' = POST em andamento.
  const [submitting, setSubmitting] = useState<'hold' | 'create' | null>(null);
  // Nome cujo "Criar" foi segurado para mostrar a sugestão (texto "confira e clique em Criar").
  const [heldFor, setHeldFor] = useState<string | null>(null);
  // Sobe quando o create falha (ex.: "Proxy já está em uso") e ao abrir o seletor (E28: contagem
  // fresca no clique): recarrega a lista do pool.
  const [reloadTick, setReloadTick] = useState(0);
  const proxySelectRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  // Muda ao fechar o formulário ou sair da tela: um "Criar" segurado não cria mais.
  const formGen = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [connect, setConnect] = useState<SessionDto | null>(null);
  // E27/P-086 — diálogo do link; guarda o id para o diálogo receber a versão viva da lista.
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const linkSession = linkFor
    ? (sessions.find((s) => s.id === linkFor) ?? null)
    : null;
  // P-089 — filtro por nome, status e número. Estado LOCAL síncrono (é ele que controla os
  // inputs) e a URL (?nome=&status=&numero=) só como espelho, para sobreviver ao recarregar e poder
  // ser compartilhada. Input controlado direto pela URL quebra a digitação: o BrowserRouter aplica
  // cada navegação em React.startTransition (react-router 7.18.3, chunk-BV7QT456.mjs:10504-10510) e
  // o React devolve ao DOM o valor antigo até a transição entrar — cursor pula para o fim, IME
  // (Gboard) e tecla morta (acento no macOS/iOS) geram lixo. `replace`: digitar não empilha
  // histórico. O setSearchParams fica FORA do updater do setState (StrictMode chama o updater 2×).
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<SessionFilter>(() =>
    parseSessionFilter(searchParams),
  );
  const filtering = isSessionFilterActive(filter);
  const visible = filterSessions(sessions, filter);
  const setFilter = (patch: Partial<SessionFilter>) => {
    // O onChange re-renderiza de forma síncrona: `filter` aqui é sempre o atual.
    const next = { ...filter, ...patch };
    setFilterState(next);
    setSearchParams((prev) => sessionFilterToParams(next, prev), {
      replace: true,
    });
  };
  const clearFilter = () => setFilter(EMPTY_SESSION_FILTER);

  async function refresh() {
    try {
      setSessions(await api.sessions.list());
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  // E26/P-084 — derivados do formulário "Nova sessão".
  const trimmed = name.trim();
  const nameValid = isValidSessionName(trimmed);
  // Igual ao @unique de wa_sessions.name (o 409 do create): exato, na lista COMPLETA (nunca a
  // filtrada do P-089). Quando o dono apaga a sessão, vira false e a consulta sai sozinha.
  const nameTaken = sessions.some((s) => s.name === trimmed);
  // Muda só quando entra/sai sessão (o polling de 3 s traz um array novo a cada volta).
  const sessionsKey = sessions
    .map((s) => s.id)
    .sort()
    .join(',');
  const view = suggestionView({
    trimmedName: trimmed,
    suggestion: nameTaken ? null : suggestion,
    selectableProxies,
    choice: proxyChoice,
    now: Date.now(),
    held: heldFor === trimmed,
    inUseBy,
  });
  const suggestedId = view.suggestedId;
  // E28 — opções do seletor: "Sem proxy" + os selecionáveis em verde/vermelho. O sugerido que a
  // lista ainda não trazia (lista velha) chega sem uso: o servidor acabou de dizer que está livre.
  const proxyOptions: ProxyPickerOption[] = [
    { value: '', label: 'Sem proxy (padrão)', tone: 'none' },
    ...view.options.map((p): ProxyPickerOption => {
      const u = proxyUsageView(
        proxyList.find((x) => x.id === p.id) ?? { sessions: [] },
      );
      return {
        value: p.id,
        label: proxyOptionLabel(p),
        tone: u.tone === 'unknown' ? 'none' : u.tone,
        badge: u.text,
        title: u.title,
        tags: p.id === suggestedId ? ['sugerido'] : undefined,
      };
    }),
  ];
  const chosenProxy = proxyList.find((p) => p.id === view.selectValue);
  const shareNote = chosenProxy ? sharedNote(chosenProxy) : null;
  // Estado atual para o "Criar" segurado reler depois do await (o dono pode mexer na espera).
  const latest = useRef({
    trimmed,
    engine,
    proxyChoice,
    selectableProxies,
    inUseBy,
    shareConsent,
    sessionsKey,
    selectValue: view.selectValue,
  });
  useLayoutEffect(() => {
    latest.current = {
      trimmed,
      engine,
      proxyChoice,
      selectableProxies,
      inUseBy,
      shareConsent,
      sessionsKey,
      selectValue: view.selectValue,
    };
  });
  useEffect(
    () => () => {
      formGen.current += 1; // saiu da tela: "Criar" segurado não cria
    },
    [],
  );

  // Pool com o uso de cada proxy (E28; antes só os livres, D-008). E26: recarrega também quando
  // entra/sai sessão (apagar a antiga libera o proxy dela), depois de um create que falhou e ao
  // abrir o seletor (`reloadTick`). Falha em silêncio MANTENDO a última lista boa (um 502
  // momentâneo não derruba a escolha manual; o POST revalida no gateway); na 1ª carga depois de
  // abrir a lista já é [] (estado inicial / closeForm).
  useEffect(() => {
    if (!creating) return;
    let cancelled = false;
    api.proxies
      .list()
      .then(async (list) => {
        if (list.every(hasUsageInfo)) return list;
        // Gateway anterior à E28 (sem o uso no item): volta à lista de livres (D-008) — tudo nela
        // é livre de fato, então o verde não mente e escolher não cai em 400 "em uso".
        const free = await api.proxies.listAvailable();
        return free.map((p) => ({ ...p, sessionCount: 0, sessions: [] }));
      })
      .then((list) => {
        if (!cancelled) setProxyList(list);
      })
      .catch(() => {
        /* mantém a última lista boa */
      });
    return () => {
      cancelled = true;
    };
  }, [creating, sessionsKey, reloadTick]);

  // E26/P-084 — sugestão 300 ms depois da última tecla, só com o formulário aberto e nome válido e
  // livre; refaz quando entra/sai sessão. O cleanup aborta a consulta e descarta a resposta velha
  // (nome mudou, formulário fechou, execução dupla do StrictMode). Erro (403 do OPERATOR, rede) =
  // "sem sugestão" em silêncio: nunca o aviso vermelho da página.
  useEffect(() => {
    if (!creating || !nameValid || nameTaken) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api.proxies
        .suggestion(trimmed, { signal: ctrl.signal })
        .then((r) => {
          if (!cancelled)
            setSuggestion({
              forName: trimmed,
              data: r.suggestion,
              key: sessionsKey,
            });
        })
        .catch(() => {
          if (!cancelled)
            setSuggestion({ forName: trimmed, data: null, key: sessionsKey });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [creating, trimmed, nameValid, nameTaken, sessionsKey]);

  function openForm() {
    setCreating(true);
  }

  // E26: fechar (e criar com sucesso) zera nome, escolha de proxy e sugestão; o cleanup dos efeitos
  // cancela a consulta em andamento e `formGen` invalida um "Criar" segurado.
  function closeForm() {
    formGen.current += 1;
    setCreating(false);
    setName('');
    setProxyChoice(null);
    setSuggestion(null);
    setHeldFor(null);
    setProxyList([]);
    setShareConsent(null);
  }

  async function createSession(
    sessionName: string,
    sessionEngine: 'BAILEYS' | 'WWEBJS',
    proxyId: string,
    share: boolean,
  ) {
    setSubmitting('create');
    try {
      const s = await api.sessions.create({
        name: sessionName,
        engine: sessionEngine,
        ...(proxyId ? { proxyId } : {}),
        // E28/D-051: só quando o dono ESCOLHEU um proxy que estava vermelho naquela hora.
        ...(proxyId && share ? { allowSharedProxy: true } : {}),
      });
      closeForm();
      await refresh();
      setConnect(s);
    } catch (e) {
      setError(inUseErrorText((e as Error).message));
      // Ex.: 400 "Proxy já está em uso" (outra sessão pegou o proxy): recarrega os livres e as
      // sessões — se entrou sessão, o `sessionsKey` muda, a sugestão é refeita e o próximo "Criar"
      // volta a conferir (sem repetir o POST com o proxy ocupado).
      setReloadTick((n) => n + 1);
      void refresh();
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    const gen = formGen.current;
    const t = trimmed;
    const shown = view.selectValue; // o que o dono via no seletor ao clicar
    try {
      // E26/P-084 — Enter logo depois de digitar: a sugestão desse nome ainda não chegou. Consulta
      // na hora (teto 1,5 s); se houver proxy para pré-selecionar, mostra em vez de criar.
      if (
        mustHoldCreate({
          trimmedName: t,
          choice: proxyChoice,
          // Resposta de antes de entrar/sair sessão (ex.: IN_USE e o dono apagou quem usava o
          // proxy) não conta como resolvida: a nova consulta pode estar no debounce.
          resolvedFor:
            suggestion?.key === sessionsKey ? suggestion.forName : null,
          nameTaken,
        })
      ) {
        setSubmitting('hold');
        const data = await suggestionWithCap(t);
        if (gen !== formGen.current) return; // fechou o formulário (ou saiu da tela) na espera
        const cur = latest.current;
        // undefined = erro (403 do OPERATOR, rede) ou teto: não mexe na sugestão guardada (a do
        // debounce pode ter chegado na espera e já estar na tela).
        const fresh =
          data === undefined
            ? null
            : { forName: t, data, key: cur.sessionsKey };
        const decision = decideAfterHold({
          shown,
          trimmed: t,
          currentTrimmed: cur.trimmed,
          data,
          cur,
          view: fresh
            ? suggestionView({
                trimmedName: t,
                suggestion: fresh,
                selectableProxies: cur.selectableProxies,
                choice: cur.proxyChoice,
                now: Date.now(),
                inUseBy: cur.inUseBy,
              })
            : null,
        });
        if (decision.action === 'abort') return; // mudou o nome na espera
        if (decision.action === 'hold') {
          // NÃO cria: a view derivada mostra o novo valor, o aviso pede "confira e clique em Criar
          // de novo" e o foco vai ao seletor. flushSync: DOM (valor + aviso) já atualizado antes
          // do focus() (react.dev/reference/react-dom/flushSync). O próximo "Criar" cria direto
          // (a sugestão deste nome já resolveu).
          flushSync(() => {
            if (fresh) setSuggestion(fresh);
            setHeldFor(t);
          });
          proxySelectRef.current?.focus();
          return;
        }
        if (fresh) setSuggestion(fresh);
        // Compartilha só se o proxy enviado foi ESCOLHIDO vermelho pelo dono (a escolha pode ter
        // mudado na espera — vale a registrada agora em `cur`).
        await createSession(
          t,
          cur.engine,
          decision.proxyId,
          shareFromConsent(decision.proxyId, cur.shareConsent),
        );
        return;
      }
      await createSession(
        t,
        engine,
        view.selectValue,
        shareFromConsent(view.selectValue, shareConsent),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(null);
    }
  }

  async function doAction(fn: () => Promise<unknown>) {
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Sessões <span className="text-zinc-500">· WhatsApp</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-400" aria-live="polite">
            {filtering
              ? `${visible.length} de ${sessions.length} sessão(ões)`
              : `${sessions.length} sessão(ões)`}
          </p>
          <button
            type="button"
            onClick={creating ? closeForm : openForm}
            aria-expanded={creating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Nova sessão
          </button>
        </div>

        {creating && (
          <form
            onSubmit={onCreate}
            className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">
                  Nome (letras, números, _ ou -)
                </span>
                {/* E26: sem maiúscula/correção automática do teclado do celular ("vendas" ≠ "Vendas"). */}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vendas-01"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={64}
                  aria-invalid={nameTaken || undefined}
                  aria-describedby="nome-sessao-aviso"
                  className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Engine</span>
                <select
                  value={engine}
                  onChange={(e) =>
                    setEngine(e.target.value as 'BAILEYS' | 'WWEBJS')
                  }
                  className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="BAILEYS">Baileys (recomendado)</option>
                  <option value="WWEBJS">WhatsApp Web.js</option>
                </select>
              </label>
              {/* E28: fora de <label> — clicar numa opção da lista dentro do <label> reabriria o
                  seletor. Abrir recarrega o pool (contagem de uso fresca no clique). */}
              <div className="w-104 max-w-full space-y-1">
                {/* Clicar no rótulo foca o campo, como num <label>. */}
                <span
                  id="proxy-rotulo"
                  onClick={() => proxySelectRef.current?.focus()}
                  className="block text-xs text-zinc-400"
                >
                  Proxy · <span className="text-emerald-400">verde</span> livre
                  · <span className="text-red-400">vermelho</span> já em uso
                </span>
                <ProxyPicker
                  ref={proxySelectRef}
                  value={view.selectValue}
                  options={proxyOptions}
                  // '' (Sem proxy) também é escolha explícita do dono: não volta a pré-selecionar.
                  // E28: a escolha registra se o proxy estava vermelho (consentimento de compartilhar).
                  onChange={(id, option) => {
                    setProxyChoice(id);
                    setShareConsent(consentFromPick(id, option.tone));
                  }}
                  labelledBy="proxy-rotulo"
                  describedBy="proxy-sugestao proxy-compartilhado"
                  onOpen={() => setReloadTick((n) => n + 1)}
                  className="w-full"
                />
              </div>
              <button
                type="submit"
                disabled={submitting !== null}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting === 'hold'
                  ? 'Conferindo proxy…'
                  : submitting === 'create'
                    ? 'Criando…'
                    : 'Criar e conectar'}
              </button>
            </div>
            {/* E26/P-084 — regiões vivas SEMPRE montadas com o formulário aberto (vazias sem aviso;
                a região precisa existir antes do texto para ser anunciada), fora dos <label>. */}
            <p
              id="nome-sessao-aviso"
              role="status"
              aria-live="polite"
              className="mt-3 text-xs text-amber-300 empty:mt-0"
            >
              {nameTaken
                ? 'Já existe uma sessão com esse nome — apague-a ou escolha outro.'
                : null}
            </p>
            <p
              id="proxy-sugestao"
              role="status"
              aria-live="polite"
              className={`mt-3 text-xs empty:mt-0 ${NOTE_CLS[view.note?.tone ?? 'info']}`}
            >
              {view.note ? view.note.text : null}
            </p>
            {/* E28/P-107 — escolheu um proxy vermelho: avisa com quem vai dividir o IP. */}
            <p
              id="proxy-compartilhado"
              role="status"
              aria-live="polite"
              className="mt-3 text-xs text-amber-300 empty:mt-0"
            >
              {shareNote}
            </p>
            {view.canApplySuggestion && suggestedId && (
              <button
                type="button"
                // O sugerido aqui está livre (verde): não é consentimento de compartilhar.
                onClick={() => {
                  setProxyChoice(suggestedId);
                  setShareConsent(null);
                }}
                className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800"
              >
                Usar este proxy
              </button>
            )}
          </form>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div
          role="search"
          aria-label="Filtrar sessões"
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Nome</span>
            <input
              type="search"
              value={filter.name}
              onChange={(e) => setFilter({ name: e.target.value })}
              placeholder="Buscar por nome"
              className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Status</span>
            <select
              value={filter.status}
              onChange={(e) =>
                setFilter({
                  status: e.target.value as SessionFilter['status'],
                })
              }
              className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              <option value="DISCONNECTED">
                Desconectadas (tudo menos Conectado)
              </option>
              {SESSION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_META[st].label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Número</span>
            <input
              type="search"
              inputMode="tel"
              value={filter.number}
              onChange={(e) => setFilter({ number: e.target.value })}
              placeholder="Ex.: 11 98888-7777"
              className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          {filtering && (
            <button
              type="button"
              onClick={clearFilter}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Engine</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhuma sessão ainda. Crie a primeira.
                  </td>
                </tr>
              )}
              {sessions.length > 0 && visible.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhuma sessão com esses filtros.{' '}
                    <button
                      type="button"
                      onClick={clearFilter}
                      className="text-emerald-400 underline hover:text-emerald-300"
                    >
                      Limpar filtros
                    </button>
                  </td>
                </tr>
              )}
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                    {s.lastError && s.status !== 'WORKING' && (
                      <span className="ml-2 text-xs text-zinc-500">
                        {s.lastError}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {s.mePushName ? `${s.mePushName} · ` : ''}
                    {s.meJid ? (
                      s.meJid.split(':')[0].split('@')[0]
                    ) : s.lastMeJid ? (
                      // E27: caiu (meJid zera no 401) — o último número ajuda a achar e reconectar.
                      <span className="text-zinc-400">
                        último: {numberFromJid(s.lastMeJid)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.engine}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {s.status !== 'WORKING' && (
                        <button
                          onClick={() =>
                            doAction(() => api.sessions.start(s.id)).then(() =>
                              setConnect(s),
                            )
                          }
                          className="rounded-md bg-emerald-600/90 px-2.5 py-1 text-xs text-white hover:bg-emerald-500"
                        >
                          Conectar
                        </button>
                      )}
                      {s.status === 'WORKING' && (
                        <button
                          onClick={() =>
                            doAction(() => api.sessions.stop(s.id))
                          }
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                        >
                          Parar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLinkFor(s.id)}
                        disabled={s.engine !== 'BAILEYS'}
                        title={
                          s.engine !== 'BAILEYS'
                            ? CONNECT_LINK_WWEBJS_REASON
                            : s.status === 'WORKING'
                              ? 'Ver o último link de conexão'
                              : 'Link para a pessoa conectar de outro lugar'
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Link
                      </button>
                      <button
                        onClick={() =>
                          doAction(() => api.sessions.restart(s.id))
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        Reiniciar
                      </button>
                      <button
                        onClick={() =>
                          doAction(() => api.sessions.logout(s.id))
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        Logout
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir a sessão "${s.name}"?`))
                            doAction(() => api.sessions.remove(s.id));
                        }}
                        className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {connect && (
        <ConnectModal
          session={connect}
          onClose={() => {
            setConnect(null);
            refresh();
          }}
          onOpenLink={() => {
            setConnect(null);
            setLinkFor(connect.id);
          }}
        />
      )}

      {linkSession && (
        <ConnectLinkDialog
          session={linkSession}
          onClose={() => setLinkFor(null)}
          onChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
