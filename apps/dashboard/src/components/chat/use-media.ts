import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import type { MediaLoader, MediaSnapshot } from '../../lib/media-cache';
import { mediaCache } from '../../lib/media';

// Estado da mídia de uma mensagem no cache (E23). `retain` no mount e libera no unmount — o cache
// adia a liberação, então o setup→cleanup→setup do StrictMode não revoga nem baixa de novo.
export function useMedia(
  key: string,
  makeLoader: () => MediaLoader,
): MediaSnapshot & { request: () => void } {
  const subscribe = useCallback(
    (cb: () => void) => mediaCache.subscribe(key, cb),
    [key],
  );
  const getSnapshot = useCallback(() => mediaCache.snapshot(key), [key]);
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => mediaCache.retain(key), [key]);

  const loaderRef = useRef(makeLoader);
  useEffect(() => {
    loaderRef.current = makeLoader;
  });
  const request = useCallback(
    () => mediaCache.request(key, loaderRef.current()),
    [key],
  );
  return { ...snap, request };
}

// true na 1ª vez que o elemento chega perto da área visível (e fica true). Sem IntersectionObserver
// no navegador → true (carrega direto).
export function useInView(
  target: RefObject<Element | null>,
  root: RefObject<Element | null> | undefined,
  rootMargin = '200px 0px',
): boolean {
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  useEffect(() => {
    if (seen) return;
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { root: root?.current ?? null, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, target, root, rootMargin]);
  return seen;
}
