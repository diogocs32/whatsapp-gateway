import { useEffect, useRef, useState } from 'react';
import { api, BASE } from './api';
import { parseLiveEvent, type LiveEvent } from './live-events';

// SSE /api/events/stream resiliente (E23). O EventSource reconecta sozinho em erro de REDE, mas
// resposta ≠ 200 (401 depois dos 15 min do access, 429, 502 no deploy) "falha a conexão" e ele não
// tenta mais (WHATWG HTML §9.2). Aqui: fechou de vez → espera (1 s → 30 s), força a renovação do
// cookie com um GET /api/auth/me (passa pelo silent refresh; só um 401 de verdade desloga) e abre
// outro. O stream não tem replay (nem Last-Event-ID): depois de qualquer queda, `onResync` relê o
// que está na tela.
export function useLiveStream(
  onEvent: (ev: LiveEvent) => void,
  onResync: () => void,
): boolean {
  const [connected, setConnected] = useState(false);
  const eventRef = useRef(onEvent);
  const resyncRef = useRef(onResync);
  useEffect(() => {
    eventRef.current = onEvent;
    resyncRef.current = onResync;
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;
    let retryTimer: number | undefined;
    let attempt = 0;
    let lost = false;

    const open = () => {
      if (stopped) return;
      es = new EventSource(`${BASE}/api/events/stream`, {
        withCredentials: true,
      });
      es.onopen = () => {
        setConnected(true);
        attempt = 0;
        if (lost) {
          lost = false;
          resyncRef.current();
        }
      };
      es.onerror = () => {
        setConnected(false);
        lost = true;
        if (es?.readyState !== EventSource.CLOSED) return; // o navegador reconecta sozinho
        es.close();
        const delay = Math.min(30_000, 1000 * 2 ** attempt++);
        retryTimer = window.setTimeout(() => {
          if (stopped) return;
          api
            .me()
            .catch(() => undefined)
            .finally(open);
        }, delay);
      };
      es.onmessage = (msg) => {
        const ev = parseLiveEvent(msg.data);
        if (ev) eventRef.current(ev);
      };
    };

    open();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      es?.close();
    };
  }, []);

  return connected;
}
