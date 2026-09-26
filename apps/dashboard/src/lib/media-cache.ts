// Cache de mídia do painel (E23 · P-067): a mídia é baixada PELO GATEWAY (GET
// /api/sessions/:id/messages/:msgId/media com o cookie + refresh de login) como blob e vira um
// object URL, em cache por mensagem. Resolve: o helmet (CORP same-origin barra <img src> de outra
// origem, mas não o fetch com CORS), a falta de Range no /media (o blob: atende Range sozinho) e a
// URL pré-assinada que muda a cada leitura (o Inbox relê a cada 2,5 s — a chave aqui é a mensagem,
// nunca a URL).
//
// Regras:
// - um download por mensagem, compartilhado por quem pedir (StrictMode, dois balões);
// - contagem de referências: `retain` no mount, a função devolvida no unmount. Quando ninguém mais
//   usa, espera `releaseDelayMs` (o StrictMode faz setup→cleanup→setup; voltar à conversa logo em
//   seguida reaproveita) e então aborta o download em voo ou revoga o object URL;
// - teto de memória: passou de `maxBytes`, revoga primeiro o que ninguém usa (mais antigo antes);
// - no máximo `maxConcurrent` downloads ao mesmo tempo (o rate-limit é 600/min por IP e divide com
//   o polling e o SSE);
// - 404/410 = "não tem arquivo" permanente (não re-tenta a cada abertura); 429 = pausa global
//   (o Retry-After não é legível cross-origin); o resto = erro com "tentar de novo".
//
// Puro com dependências injetadas → testável em vitest `environment: 'node'`.

export type MediaStatus =
  'idle' | 'queued' | 'loading' | 'ready' | 'missing' | 'error';

export interface MediaSnapshot {
  status: MediaStatus;
  url: string | null; // object URL (blob:) quando `ready`
  type: string | null; // tipo do blob quando `ready`
  message: string | null; // motivo quando `missing`/`error`
}

export type MediaLoader = (signal: AbortSignal) => Promise<Blob>;

export interface MediaCacheDeps {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  now: () => number;
  maxBytes?: number;
  maxConcurrent?: number;
  releaseDelayMs?: number;
  rateLimitPauseMs?: number;
  maxMissing?: number;
}

export interface MediaCache {
  snapshot(key: string): MediaSnapshot;
  subscribe(key: string, cb: () => void): () => void;
  retain(key: string): () => void;
  request(key: string, load: MediaLoader): void;
  clear(): void;
  stats(): { entries: number; bytes: number; active: number };
}

const IDLE: MediaSnapshot = Object.freeze({
  status: 'idle',
  url: null,
  type: null,
  message: null,
}) as MediaSnapshot;

interface Entry {
  key: string;
  refs: number;
  snap: MediaSnapshot;
  bytes: number;
  lastUsed: number;
  load: MediaLoader | null;
  controller: AbortController | null;
  releaseTimer: unknown;
}

function httpStatus(err: unknown): number | null {
  const s = (err as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : null;
}

export function createMediaCache(deps: MediaCacheDeps): MediaCache {
  const maxBytes = deps.maxBytes ?? 200 * 1024 * 1024;
  const maxConcurrent = deps.maxConcurrent ?? 3;
  const releaseDelayMs = deps.releaseDelayMs ?? 30_000;
  const rateLimitPauseMs = deps.rateLimitPauseMs ?? 60_000;
  const maxMissing = deps.maxMissing ?? 500;

  const entries = new Map<string, Entry>();
  const listeners = new Map<string, Set<() => void>>();
  const queue: Entry[] = [];
  let active = 0;
  let totalBytes = 0;
  let pausedUntil = 0;
  let pumpTimer: unknown = null;

  const notify = (key: string) => {
    listeners.get(key)?.forEach((cb) => cb());
  };

  const setSnap = (e: Entry, snap: MediaSnapshot) => {
    e.snap = snap;
    notify(e.key);
  };

  const entry = (key: string): Entry => {
    let e = entries.get(key);
    if (!e) {
      e = {
        key,
        refs: 0,
        snap: IDLE,
        bytes: 0,
        lastUsed: deps.now(),
        load: null,
        controller: null,
        releaseTimer: null,
      };
      entries.set(key, e);
    }
    return e;
  };

  // Tira a entrada do cache (revoga o URL, aborta o download). Mantém quem estiver ouvindo.
  const drop = (e: Entry) => {
    if (e.releaseTimer !== null) deps.clearTimeout(e.releaseTimer);
    e.releaseTimer = null;
    if (e.controller) e.controller.abort();
    e.controller = null;
    if (e.snap.url) deps.revokeObjectURL(e.snap.url);
    totalBytes -= e.bytes;
    e.bytes = 0;
    entries.delete(e.key);
    if (e.snap !== IDLE) {
      e.snap = IDLE;
      notify(e.key);
    }
  };

  // Teto de memória: revoga o que ninguém usa, do mais antigo para o mais novo.
  const evict = () => {
    if (totalBytes <= maxBytes) return;
    const idle = [...entries.values()]
      .filter((e) => e.refs === 0 && e.snap.status === 'ready')
      .sort((a, b) => a.lastUsed - b.lastUsed);
    for (const e of idle) {
      if (totalBytes <= maxBytes) break;
      drop(e);
    }
  };

  const pruneMissing = () => {
    const missing = [...entries.values()].filter(
      (e) => e.refs === 0 && e.snap.status === 'missing',
    );
    if (missing.length <= maxMissing) return;
    missing
      .sort((a, b) => a.lastUsed - b.lastUsed)
      .slice(0, missing.length - maxMissing)
      .forEach(drop);
  };

  const start = (e: Entry) => {
    const load = e.load;
    if (!load) return;
    const controller = new AbortController();
    e.controller = controller;
    active++;
    setSnap(e, { status: 'loading', url: null, type: null, message: null });
    load(controller.signal).then(
      (blob) => {
        active--;
        if (controller.signal.aborted || entries.get(e.key) !== e) {
          pump();
          return;
        }
        e.controller = null;
        e.bytes = blob.size;
        totalBytes += blob.size;
        e.lastUsed = deps.now();
        setSnap(e, {
          status: 'ready',
          url: deps.createObjectURL(blob),
          type: blob.type || null,
          message: null,
        });
        evict();
        pump();
      },
      (err: unknown) => {
        active--;
        if (controller.signal.aborted || entries.get(e.key) !== e) {
          pump();
          return;
        }
        e.controller = null;
        const status = httpStatus(err);
        const msg =
          err instanceof Error && err.message ? err.message : 'falha de rede';
        if (status === 404 || status === 410) {
          setSnap(e, {
            status: 'missing',
            url: null,
            type: null,
            message: msg,
          });
          pruneMissing();
        } else {
          if (status === 429) pausedUntil = deps.now() + rateLimitPauseMs;
          setSnap(e, {
            status: 'error',
            url: null,
            type: null,
            message:
              status === 429
                ? 'Muitas requisições agora — tente de novo em 1 minuto.'
                : msg,
          });
        }
        pump();
      },
    );
  };

  function pump(): void {
    const wait = pausedUntil - deps.now();
    if (wait > 0) {
      if (pumpTimer === null) {
        pumpTimer = deps.setTimeout(() => {
          pumpTimer = null;
          pump();
        }, wait);
      }
      return;
    }
    while (active < maxConcurrent && queue.length) {
      const e = queue.shift()!;
      if (e.snap.status !== 'queued' || entries.get(e.key) !== e) continue;
      start(e);
    }
  }

  return {
    snapshot: (key) => entries.get(key)?.snap ?? IDLE,

    subscribe(key, cb) {
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(cb);
      return () => {
        set!.delete(cb);
        if (set!.size === 0) listeners.delete(key);
      };
    },

    retain(key) {
      const e = entry(key);
      e.refs++;
      e.lastUsed = deps.now();
      if (e.releaseTimer !== null) {
        deps.clearTimeout(e.releaseTimer);
        e.releaseTimer = null;
      }
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const cur = entries.get(key);
        if (cur !== e) return;
        e.refs = Math.max(0, e.refs - 1);
        e.lastUsed = deps.now();
        if (e.refs > 0 || e.releaseTimer !== null) return;
        e.releaseTimer = deps.setTimeout(() => {
          e.releaseTimer = null;
          if (e.refs > 0 || entries.get(key) !== e) return;
          // "Não tem arquivo" fica (é pequeno e evita pedir de novo a cada abertura).
          if (e.snap.status === 'missing') return;
          drop(e);
        }, releaseDelayMs);
      };
    },

    request(key, load) {
      const e = entry(key);
      const s = e.snap.status;
      if (s === 'queued' || s === 'loading' || s === 'ready' || s === 'missing')
        return;
      e.load = load;
      e.lastUsed = deps.now();
      setSnap(e, { status: 'queued', url: null, type: null, message: null });
      queue.push(e);
      pump();
    },

    clear() {
      if (pumpTimer !== null) deps.clearTimeout(pumpTimer);
      pumpTimer = null;
      queue.length = 0;
      [...entries.values()].forEach(drop);
      pausedUntil = 0;
    },

    stats: () => ({ entries: entries.size, bytes: totalBytes, active }),
  };
}
