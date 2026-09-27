import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { ConnectLinkDto, SessionDto } from '@contracts';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useBranding } from '../../lib/branding';
import {
  DEFAULT_TTL_MINUTES,
  TTL_OPTIONS,
  buildConnectUrl,
  buildShareText,
  createLinkError,
  defaultExpectedPhone,
  describeLink,
  expectedPhoneError,
} from '../../lib/connect-link';
import {
  forgetLinkUrl,
  recallLinkUrl,
  rememberLinkUrl,
} from '../../lib/connect-link-memory';
import { formatPhone } from '../../lib/jid';

// E27/P-086 (D-037) — "Link para conectar de outro lugar": o operador gera um link temporário e o
// envia; a pessoa abre em OUTRA tela e lê o QR (página pública /conectar). Só Baileys nesta versão
// (P-092). O token aparece só na resposta da criação: a URL fica em memória, só para quem a gerou
// (lib/connect-link-memory.ts; limpa no logout), até recarregar a página. O estado do último link
// se atualiza a cada 5 s.

export const CONNECT_LINK_WWEBJS_REASON =
  'Disponível só para sessões Baileys nesta versão';

const POLL_MS = 5_000;

const INPUT =
  'block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';
const BTN =
  'rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50';
const BTN_PRIMARY =
  'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50';

const TONE: Record<'active' | 'success' | 'muted', string> = {
  active: 'text-emerald-300',
  success: 'text-emerald-300',
  muted: 'text-zinc-300',
};

export function ConnectLinkDialog({
  session,
  onClose,
  onChanged,
}: {
  session: SessionDto; // a versão viva da lista (meJid/status atualizados a cada 3 s)
  onClose: () => void;
  onChanged: () => void; // pede à lista para atualizar (sessão parada, link novo)
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { user } = useAuth();
  const { branding } = useBranding();
  const canManage = !!user && user.role !== 'VIEWER'; // criar/revogar = OPERATOR+
  const baileys = session.engine === 'BAILEYS';
  const working = session.status === 'WORKING';
  // WORKING: só leitura do histórico (não há o que conectar).
  const canCreate = canManage && baileys && !working;

  // undefined = carregando; null = a sessão nunca teve link.
  const [link, setLink] = useState<ConnectLinkDto | null | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ttl, setTtl] = useState<number>(DEFAULT_TTL_MINUTES);
  const [phone, setPhone] = useState(() => defaultExpectedPhone(session));
  const [anyNumber, setAnyNumber] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; paired: boolean } | null>(
    null,
  );
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);
  const [alsoStop, setAlsoStop] = useState(true);
  const [canShare] = useState(
    () =>
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  );
  // Cada leitura/mutação ganha um número: resposta de uma leitura mais velha que a última
  // criação/revogação é descartada (não desfaz o link recém-criado na tela).
  const seq = useRef(0);

  // <dialog> nativo em modal (mesmo padrão do ForwardDialog/Lightbox): o resto fica inerte, Esc
  // chega como `cancel`, e o cleanup fecha com o nó ainda no documento (o foco volta a quem abriu).
  useLayoutEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const r = await api.sessions.connectLink.get(session.id);
      if (mine !== seq.current) return;
      setLink(r.link);
      setLoadError(null);
      setNow(Date.now());
    } catch (e) {
      if (mine !== seq.current) return;
      setLoadError((e as Error).message);
    }
  }, [session.id]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    // Resposta que chegar depois de fechar só chama setState de componente desmontado (no-op).
    return () => clearInterval(id);
  }, [load]);

  // A URL (com token) só para quem gerou e pode gerenciar — nunca para outro login na mesma aba.
  const url =
    link && user && canManage ? recallLinkUrl(session.id, link, user.id) : null;
  const desc = link ? describeLink(link, session, now) : null;
  const active = link?.state === 'ACTIVE';
  const formOpen = canCreate && (showForm || (link !== undefined && !active));
  const digits = phone.replace(/\D/g, '');
  const phoneError = expectedPhoneError(digits);

  async function create(withNewQr: boolean) {
    if (busy || !user || phoneError) return;
    setBusy(true);
    setError(null);
    try {
      // 409 SESSION_PAIRED → o operador escolheu descartar o login salvo: QR novo e tenta de novo.
      if (withNewQr) await api.sessions.newQr(session.id);
      const res = await api.sessions.connectLink.create(session.id, {
        ttlMinutes: ttl,
        ...(digits ? { expectedPhone: digits } : {}),
      });
      rememberLinkUrl(
        session.id,
        res.link.id,
        buildConnectUrl(window.location.origin, res.token),
        user.id,
      );
      seq.current++;
      setLink(res.link);
      setNow(Date.now());
      setShowForm(false);
      setCopied(null);
      onChanged();
    } catch (e) {
      setError(
        createLinkError(
          e instanceof ApiError ? e.code : undefined,
          (e as Error).message,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Sem DDI o gateway conferiria "11988887777" contra "5511988887777" e desconectaria a pessoa
    // certa como número errado (o gateway também recusa com 400).
    if (phoneError) {
      setError({ text: phoneError, paired: false });
      return;
    }
    if (!digits && !anyNumber) {
      setError({
        text: 'Informe o número que vai conectar ou marque "Aceitar qualquer WhatsApp".',
        paired: false,
      });
      return;
    }
    if (active && !confirm('O link enviado antes vai parar de funcionar.'))
      return;
    void create(false);
  }

  async function revoke() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.sessions.connectLink.revoke(session.id);
      forgetLinkUrl(session.id);
    } catch (e) {
      setError({ text: (e as Error).message, paired: false });
      setBusy(false);
      return;
    }
    // Revogar só impede novos acessos à página; o QR que já está na tela da pessoa continua valendo
    // até a sessão parar.
    if (alsoStop && !working) {
      try {
        await api.sessions.stop(session.id);
      } catch (e) {
        setError({
          text: `Link revogado, mas não deu para parar a sessão: ${(e as Error).message}`,
          paired: false,
        });
      }
    }
    setBusy(false);
    onChanged();
    await load();
  }

  // Copiar só no clique (Safari recusa writeText fora do gesto) e em contexto seguro (MDN
  // Clipboard API) — mesmo padrão do ApiKeys; sem clipboard o operador copia do campo.
  async function copy(kind: 'link' | 'text', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    } catch {
      /* clipboard indisponível (http) — copia à mão do campo */
    }
  }

  async function share(text: string) {
    try {
      await navigator.share({ text });
    } catch {
      /* cancelado (AbortError) ou sem destino — nada a fazer */
    }
  }

  const shareText =
    url && link
      ? buildShareText({
          url,
          expiresAt: link.expiresAt,
          productName: branding.productName,
        })
      : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      // Os eventos de <dialog> borbulham na árvore do React: só os do próprio diálogo contam.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClose={(e) => {
        if (e.target !== e.currentTarget || ref.current?.open) return;
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-zinc-900 p-0 text-zinc-100 shadow-2xl ring-1 ring-zinc-700 backdrop:bg-black/70"
    >
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
        <h2 id={titleId} className="font-semibold">
          Link para conectar{' '}
          <span className="text-zinc-400">{session.name}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-full px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ✕
        </button>
      </header>

      <div className="space-y-4 px-5 py-4 text-sm">
        <section aria-label="Último link" className="space-y-1">
          {link === undefined && !loadError && (
            <p className="text-zinc-400">Carregando…</p>
          )}
          {link === null && (
            <p className="text-zinc-400">
              Nenhum link criado para esta sessão ainda.
            </p>
          )}
          {desc && (
            <>
              <p className={`font-medium ${TONE[desc.tone]}`}>{desc.title}</p>
              {desc.lines.map((l) => (
                <p key={l} className="text-zinc-400">
                  {l}
                </p>
              ))}
            </>
          )}
          {loadError && <p className="text-red-400">{loadError}</p>}
        </section>

        {url && shareText && (
          <section
            aria-label="Link gerado"
            className="space-y-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-3"
          >
            <input
              readOnly
              value={url}
              aria-label="Link para enviar"
              onFocus={(e) => e.currentTarget.select()}
              className={`${INPUT} font-mono`}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy('link', url)}
                className={BTN_PRIMARY}
              >
                {copied === 'link' ? 'Copiado ✓' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={() => void copy('text', shareText)}
                className={BTN}
              >
                {copied === 'text' ? 'Copiado ✓' : 'Copiar mensagem pronta'}
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={() => void share(shareText)}
                  className={BTN}
                >
                  Compartilhar…
                </button>
              )}
            </div>
            <p className="text-zinc-400">
              O link aparece só agora. Ele fica disponível aqui até você
              recarregar a página.
            </p>
          </section>
        )}
        {active && !url && (
          <p className="text-zinc-400">
            O endereço deste link só aparece para quem o gerou, até recarregar a
            página. Para enviar de novo, gere outro link.
          </p>
        )}

        {active && canManage && (
          <section aria-label="Revogar" className="space-y-2">
            {!working && (
              <label className="flex items-start gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={alsoStop}
                  onChange={(e) => setAlsoStop(e.target.checked)}
                  className="mt-0.5"
                />
                Também parar a sessão (invalida o QR que já está na tela)
              </label>
            )}
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={busy}
              className="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 disabled:opacity-50"
            >
              Revogar link
            </button>
          </section>
        )}

        {!baileys && (
          <p className="text-amber-400">{CONNECT_LINK_WWEBJS_REASON}.</p>
        )}
        {baileys && working && (
          <p className="text-zinc-400">
            A sessão está conectada: aqui só dá para ver o último link.
          </p>
        )}
        {baileys && !working && !canManage && (
          <p className="text-zinc-400">
            Seu papel só permite ver o link (criar e revogar pedem Operador).
          </p>
        )}

        {canCreate && active && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={BTN}
          >
            Gerar outro link
          </button>
        )}

        {formOpen && (
          <form
            onSubmit={onSubmit}
            className="space-y-3 rounded-lg border border-zinc-800 p-3"
          >
            <label className="block space-y-1">
              <span className="text-zinc-400">Validade</span>
              <select
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className={INPUT}
              >
                {TTL_OPTIONS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-zinc-400">Número que vai conectar</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                placeholder="5511988887777"
                className={INPUT}
              />
              {digits && (
                <span className="block text-zinc-300">
                  Será conferido: {formatPhone(digits)}
                </span>
              )}
              <span className="block text-zinc-400">
                Se outro WhatsApp ler o QR, a conexão é desfeita
                automaticamente.
              </span>
            </label>
            {!digits && (
              <label className="flex items-start gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={anyNumber}
                  onChange={(e) => setAnyNumber(e.target.checked)}
                  required
                  className="mt-0.5"
                />
                Aceitar qualquer WhatsApp (sem conferir o número)
              </label>
            )}
            <p className="text-zinc-400">
              Peça para a pessoa abrir o link no computador ou em outra tela: o
              QR precisa ser lido pela câmera do celular do WhatsApp.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={BTN_PRIMARY}>
                {busy ? 'Gerando…' : 'Gerar link'}
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className={BTN}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {error && (
          <div role="alert" className="space-y-2">
            <p className="text-red-400">{error.text}</p>
            {error.paired && canCreate && (
              <button
                type="button"
                onClick={() => void create(true)}
                disabled={busy}
                className={BTN}
              >
                Gerar novo QR agora e criar o link
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="flex justify-end border-t border-zinc-800 px-5 py-3">
        <button type="button" onClick={onClose} className={BTN}>
          Fechar
        </button>
      </footer>
    </dialog>
  );
}
