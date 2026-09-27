import { useEffect, useRef, useState } from 'react';
import { useBranding } from '../lib/branding';
import {
  CONNECT_PATH,
  STEPS_ANDROID,
  STEPS_IPHONE,
  TOKEN_STORAGE_KEY,
  applyNewQr,
  applyPoll,
  buildConnectUrl,
  connectView,
  expiryInfo,
  initialConnectState,
  isDefaultProductName,
  isLikelyPhone,
  pickToken,
  uaSaysMobile,
  type ConnectPageState,
} from '../lib/connect-link';
import { fetchConnectState, requestConnectNewQr } from '../lib/public-connect';

// E27/P-086 (D-037) — página PÚBLICA do link de conexão: quem recebeu o link abre em OUTRA tela
// (computador, outro celular, tablet) e lê o QR com o celular do WhatsApp. Sem login. O estado e os
// textos vêm do view model puro (lib/connect-link.ts connectView); aqui só o polling e o desenho.

// sessionStorage pode lançar (aba privada, site data bloqueado) — MDN Window.sessionStorage.
function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* sem storage: só não sobrevive a recarregar */
  }
}

// `navigator.userAgentData` é experimental (só Chromium; fora do lib.dom do TS) — MDN
// NavigatorUAData.mobile. `(pointer: coarse)` = toque como entrada principal (MDN @media pointer).
function detectPhone(): boolean {
  const nav = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return isLikelyPhone({
    uaMobile: uaSaysMobile(nav.userAgentData?.mobile, navigator.userAgent),
    coarse,
    width: window.innerWidth,
  });
}

// Branco sobre emerald-700 = 5,37:1 (WCAG 1.4.3 pede 4,5:1; o emerald-600 dá 3,67:1).
const PRIMARY =
  'min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50';
const SECONDARY =
  'min-h-11 w-full rounded-lg border border-zinc-600 px-4 py-2 text-zinc-100 hover:bg-zinc-800 disabled:opacity-50';

export function Conectar() {
  const { branding } = useBranding();
  const product = branding.productName.trim();
  const defaultName = isDefaultProductName(product);
  // Lido no 1º render, antes do replaceState do efeito abaixo: `#<token>` ou, com o hash vazio
  // (recarregou a página), o guardado nesta aba.
  const [token] = useState(() =>
    pickToken(window.location.hash, readStoredToken()),
  );
  const [phone] = useState(detectPhone);
  const [state, setState] = useState<ConnectPageState>(() =>
    initialConnectState(Date.now()),
  );
  const stateRef = useRef(state);
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false); // toque duplo antes do re-render não manda 2 pedidos
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tickRef = useRef<() => void>(() => undefined);

  const view = connectView(state, token !== null);

  // Tira o token da barra de endereço (histórico, print, "copiar endereço"). Mantém o
  // `history.state` do React Router (key/idx — createBrowserHistory) e troca só a URL; MDN
  // History.replaceState. O token fica na sessionStorage da aba para sobreviver ao recarregar.
  useEffect(() => {
    if (token) storeToken(token);
    if (window.location.hash)
      window.history.replaceState(window.history.state, '', CONNECT_PATH);
  }, [token]);

  // Link novo colado nesta aba (`/conectar#B`): navegação só de fragmento, sem recarregar — o token
  // lido na montagem seria o antigo e o #B ficaria na barra. Recarrega: a montagem relê o #, grava na
  // sessionStorage e tira da barra (MDN Window: hashchange event).
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.replace(/^#/, '').trim())
        window.location.reload();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // O BrandingProvider troca o título pelo nome do produto quando carrega — este efeito roda depois.
  useEffect(() => {
    document.title = defaultName
      ? 'Conectar WhatsApp'
      : `Conectar WhatsApp · ${product}`;
  }, [defaultName, product]);

  // Polling conforme a fase (view.pollMs): QR 2 s, preparando 3 s, parado 5 s, falha com backoff.
  // A 1ª consulta sai mesmo com a aba oculta (link aberto em segundo plano não fica em
  // "Carregando…"); as seguintes pausam com a aba oculta e voltam na hora ao ficar visível ou
  // reconectar (MDN Page Visibility API, Window: online event). Estados terminais param.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    let inFlight = false;
    let first = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ctrl = new AbortController();

    async function tick() {
      clearTimeout(timer);
      if (!alive || inFlight) return;
      if (!first && document.visibilityState === 'hidden') return;
      if (connectView(stateRef.current, true).terminal) return;
      first = false;
      inFlight = true;
      const r = await fetchConnectState(token as string, ctrl.signal);
      inFlight = false;
      if (!alive) return;
      const next = applyPoll(stateRef.current, r, Date.now());
      stateRef.current = next;
      setState(next);
      const ms = connectView(next, true).pollMs;
      if (ms !== null) timer = setTimeout(() => void tick(), ms);
    }

    // Relógio atualizado ANTES da consulta: o QR de quando a aba saiu some na hora (vira
    // "Atualizando o código…") em vez de ficar na tela durante o tempo da resposta.
    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      const next = { ...stateRef.current, now: Date.now() };
      stateRef.current = next;
      setState(next);
      void tick();
    };
    tickRef.current = () => void tick();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl.abort();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      tickRef.current = () => undefined;
    };
  }, [token]);

  // A tela muda sem resposta nova (QR velho durante a falha, fim do "preparando", botão liberado
  // depois do intervalo): re-render no instante certo, sem outra consulta.
  useEffect(() => {
    if (view.refreshAt === null) return;
    const t = setTimeout(
      () => {
        const next = { ...stateRef.current, now: Date.now() };
        stateRef.current = next;
        setState(next);
      },
      Math.max(0, view.refreshAt - Date.now()) + 20,
    );
    return () => clearTimeout(t);
  }, [view.refreshAt]);

  // Terminal (sucesso, usado, cancelado…): o foco vai para o título — é o que o leitor de tela lê.
  useEffect(() => {
    if (view.terminal) titleRef.current?.focus();
  }, [view.terminal, view.kind]);

  // "Mostrar QR": um pedido por toque, sem retry automático (cada um gasta 1 das tentativas).
  async function showQr() {
    if (!token || postingRef.current) return;
    postingRef.current = true;
    setPosting(true);
    const r = await requestConnectNewQr(token);
    postingRef.current = false;
    setPosting(false);
    const next = applyNewQr(stateRef.current, r, Date.now());
    stateRef.current = next;
    setState(next);
    tickRef.current();
  }

  // Celular: manda o link (com o #token) para outra tela. Web Share quando existe (exige toque e
  // HTTPS — MDN Navigator.share; AbortError = a pessoa cancelou); senão copiar; sem clipboard
  // (http, permissão) mostra o link para copiar à mão — a barra de endereço já não tem o token.
  async function shareElsewhere() {
    if (!token) return;
    const url = buildConnectUrl(window.location.origin, token);
    setManualUrl(null);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copiado ✓ — cole no outro aparelho.');
      setTimeout(() => setShareMsg(null), 2000);
    } catch {
      setManualUrl(url);
    }
  }

  const expiry =
    view.expiresAt && !view.terminal
      ? expiryInfo(view.expiresAt, state.now)
      : null;
  const ongoing = view.active && !view.terminal;
  const titleTone =
    view.tone === 'success'
      ? 'text-emerald-400'
      : view.tone === 'error'
        ? 'text-red-300'
        : 'text-zinc-100';

  return (
    <div className="min-h-dvh bg-zinc-950 px-4 py-6 text-base text-zinc-100 sm:grid sm:place-items-center">
      <main
        className={`mx-auto w-full max-w-md space-y-4 ${view.qr ? 'sm:max-w-3xl' : ''}`}
      >
        <header className="flex items-center gap-3">
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-10 w-auto object-contain"
            />
          )}
          <div>
            {!defaultName && <p className="text-zinc-400">{product}</p>}
            <h1 className="text-xl font-semibold">Conectar WhatsApp</h1>
          </div>
        </header>

        {/* Só a transição de estado (+ aviso); nunca o QR nem contagem. */}
        <p role="status" aria-live="polite" className="sr-only">
          {view.status}
        </p>

        <section
          aria-labelledby="conectar-estado"
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl sm:p-6"
        >
          <div className="flex items-start gap-3">
            {view.tone === 'wait' && (
              <span
                aria-hidden="true"
                className="mt-1 inline-block size-5 shrink-0 rounded-full border-2 border-zinc-600 border-t-emerald-400 motion-safe:animate-spin"
              />
            )}
            {view.tone === 'success' && (
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"
              >
                ✓
              </span>
            )}
            <div className="min-w-0">
              <h2
                id="conectar-estado"
                ref={titleRef}
                tabIndex={-1}
                className={`text-lg font-semibold outline-none ${titleTone}`}
              >
                {view.title}
              </h2>
              {view.body && <p className="mt-1 text-zinc-300">{view.body}</p>}
            </div>
          </div>

          {view.notice && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-300">
              {view.notice}
            </p>
          )}

          {phone && ongoing && (
            <div className="space-y-3 rounded-xl border border-sky-800/60 bg-sky-950/30 p-4">
              <p className="text-zinc-100">
                Você está no celular: o QR precisa ser lido pela câmera do
                celular do WhatsApp, em outra tela.
              </p>
              <button
                type="button"
                onClick={() => void shareElsewhere()}
                className={PRIMARY}
              >
                Enviar para outro aparelho
              </button>
              {shareMsg && <p className="text-emerald-300">{shareMsg}</p>}
              {manualUrl && (
                <label className="block space-y-1">
                  <span className="text-zinc-300">
                    Copie este link e abra no outro aparelho:
                  </span>
                  <input
                    readOnly
                    value={manualUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 font-mono text-base text-zinc-100"
                  />
                </label>
              )}
              <p className="text-zinc-400">
                Só tem este celular? Avise quem te enviou o link.
              </p>
            </div>
          )}

          {/* Fase QR em tela sm+: texto de um lado, QR do outro (no notebook o QR não fica abaixo
              da dobra). No celular empilha na ordem do DOM: dica, consentimento, QR, passos. */}
          <div
            className={
              view.qr
                ? 'grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
                : 'space-y-4'
            }
          >
            {ongoing && (
              <div className="space-y-4 sm:col-start-1 sm:row-start-1">
                {view.expectedPhoneHint && (
                  <p className="text-zinc-100">
                    Use o WhatsApp do número terminado em{' '}
                    <strong className="font-mono">
                      <span aria-hidden="true">••</span>
                      {view.expectedPhoneHint}
                    </strong>
                  </p>
                )}
                <p className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 text-zinc-300">
                  Ao ler o QR, você conecta o SEU WhatsApp{' '}
                  {defaultName
                    ? 'a um sistema externo (esta página não é do WhatsApp)'
                    : `ao sistema ${product}`}
                  . Ele poderá enviar e receber mensagens pelo seu número. Só
                  continue se você combinou isso com quem te enviou este link.
                </p>
              </div>
            )}

            {view.qr && (
              <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-4 sm:col-start-2 sm:row-span-2 sm:row-start-1">
                <img
                  src={view.qr}
                  alt="Código QR para conectar o WhatsApp (muda a cada 20 segundos)"
                  className="block aspect-square h-auto w-[min(80vw,320px)] max-w-full"
                />
              </div>
            )}

            {view.qr && (
              <div className="space-y-2 text-zinc-300 sm:col-start-1 sm:row-start-2">
                <p>Aponte a câmera do celular do WhatsApp para o código:</p>
                <ul className="space-y-1">
                  <li>
                    <strong className="text-zinc-100">Android:</strong>{' '}
                    {STEPS_ANDROID}
                  </li>
                  <li>
                    <strong className="text-zinc-100">iPhone:</strong>{' '}
                    {STEPS_IPHONE}
                  </li>
                </ul>
                <p className="text-zinc-400">
                  O celular pode pedir sua digital ou senha — é normal.
                </p>
              </div>
            )}
          </div>

          {view.showNewQrButton && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void showQr()}
                disabled={posting || view.newQrWaitSeconds > 0}
                className={phone ? SECONDARY : PRIMARY}
              >
                {posting
                  ? 'Enviando…'
                  : phone
                    ? 'Mostrar o QR aqui (vou ler com outro celular)'
                    : 'Mostrar QR'}
              </button>
              {view.newQrWaitSeconds > 0 && (
                <p className="text-zinc-400">
                  Aguarde alguns segundos para pedir outro QR.
                </p>
              )}
              {view.remainingHint && (
                <p className="text-zinc-400">{view.remainingHint}</p>
              )}
            </div>
          )}

          {expiry && (
            <div>
              <p className="text-zinc-400">{expiry.text}</p>
              {expiry.soon && <p className="text-amber-300">{expiry.soon}</p>}
            </div>
          )}
        </section>

        {view.kind !== 'invalid' && (
          <footer className="space-y-1 text-zinc-400">
            <p>
              Para desconectar quando quiser: WhatsApp → Aparelhos conectados →
              toque no aparelho → Desconectar.
            </p>
            <p>Não encaminhe este link.</p>
          </footer>
        )}
      </main>
    </div>
  );
}
