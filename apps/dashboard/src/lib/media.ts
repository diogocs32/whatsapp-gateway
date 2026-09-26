// Instância do cache de mídia do painel (E23) — a lógica testável está em media-cache.ts; aqui só
// a ligação com o navegador (URL.createObjectURL, timers) e com o GET /media do gateway.
import { api } from './api';
import { createMediaCache, type MediaLoader } from './media-cache';
import { safeBlobType } from './message-format';

export const mediaCache = createMediaCache({
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (h) => window.clearTimeout(h as number),
  now: () => Date.now(),
});

export const mediaKey = (sessionId: string, messageId: string) =>
  `${sessionId}|${messageId}`;

// Baixa a mídia pelo gateway e re-tipa o blob com um tipo seguro (documento vira
// application/octet-stream — nunca executa na origem do painel; ver safeBlobType).
export function mediaLoader(m: {
  sessionId: string;
  id: string;
  mediaType: string;
  mimetype?: string | null;
}): MediaLoader {
  return async (signal) => {
    const blob = await api.sessions.media(m.sessionId, m.id, signal);
    const type = safeBlobType(m.mediaType, m.mimetype, blob.type);
    return blob.type === type ? blob : new Blob([blob], { type });
  };
}
