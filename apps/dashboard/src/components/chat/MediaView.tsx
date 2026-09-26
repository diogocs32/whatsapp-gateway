import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MessageDto } from '@contracts';
import type { MediaSnapshot } from '../../lib/media-cache';
import { mediaKey, mediaLoader } from '../../lib/media';
import {
  MEDIA_MISSING_TEXT,
  canPlay,
  downloadName,
  formatBytes,
  isRenderableImage,
  type MediaKind,
} from '../../lib/message-format';
import { DownloadIcon, PlayIcon } from './icons';
import { useThread } from './thread-context';
import { useInView, useMedia } from './use-media';

// Mídia do balão (E23 · P-067) — sempre baixada PELO GATEWAY como blob (lib/media-cache.ts), nunca
// pela `mediaUrl` pré-assinada (muda a cada leitura; o <img> de outra origem é barrado pelo CORP do
// helmet). Imagem/figurinha carregam ao aparecer na tela; áudio, vídeo e documento só no clique.
// Nada toca sozinho: o play() só roda depois do clique do operador.

type Media = MediaSnapshot & { request: () => void };

// Vídeo acima disto não toca no balão (o blob inteiro fica na memória) — só "Baixar".
const INLINE_VIDEO_MAX = 64 * 1024 * 1024;

export function MediaView({
  m,
  mediaType,
  label,
}: {
  m: MessageDto;
  mediaType: MediaKind;
  label: string;
}) {
  // `mediaUrl` só vem quando a mensagem TEM arquivo guardado (mediaKey) — é a única flag no DTO.
  // Sem arquivo (backfill do wwebjs, download falho no Baileys): nem pede ao gateway.
  if (m.mediaUrl == null) return <Unavailable label={label} />;
  return <MediaFile m={m} mediaType={mediaType} label={label} />;
}

function MediaFile({
  m,
  mediaType,
  label,
}: {
  m: MessageDto;
  mediaType: MediaKind;
  label: string;
}) {
  const media = useMedia(mediaKey(m.sessionId, m.id), () =>
    mediaLoader({
      sessionId: m.sessionId,
      id: m.id,
      mediaType,
      mimetype: m.mimetype,
    }),
  );
  const name = downloadName({ ...m, mediaType });
  switch (mediaType) {
    case 'image':
    case 'sticker':
      return (
        <ImageMedia
          media={media}
          sticker={mediaType === 'sticker'}
          label={label}
          name={name}
          alt={m.fileName ?? label}
        />
      );
    case 'audio':
      return <AudioMedia media={media} m={m} label={label} name={name} />;
    case 'video':
      return <VideoMedia media={media} m={m} label={label} name={name} />;
    default:
      return <DocumentMedia media={media} m={m} label={label} name={name} />;
  }
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs text-zinc-300">
      <span>{label}</span>
      <span className="italic text-zinc-300">{MEDIA_MISSING_TEXT}</span>
    </div>
  );
}

function Failed({ media, label }: { media: Media; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs">
      <span>{label}</span>
      <span className="text-amber-300">
        Não foi possível baixar{media.message ? ` (${media.message})` : ''}.
      </span>
      <button
        type="button"
        onClick={media.request}
        className="rounded border border-zinc-600 px-2 py-0.5 hover:bg-zinc-700"
      >
        Tentar de novo
      </button>
    </div>
  );
}

// "Baixar": o 1º clique baixa pelo gateway e, pronto, salva com o nome do DTO (o header
// Content-Disposition não é legível cross-origin). Depois vira um <a download> comum.
function DownloadButton({ media, name }: { media: Media; name: string }) {
  const pending = useRef(false);
  useEffect(() => {
    if (media.status === 'ready' && media.url && pending.current) {
      pending.current = false;
      const a = document.createElement('a');
      a.href = media.url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [media.status, media.url, name]);

  const cls =
    'inline-flex items-center gap-1 rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-700';
  if (media.status === 'ready' && media.url) {
    return (
      <a href={media.url} download={name} className={cls}>
        <DownloadIcon className="h-3.5 w-3.5" /> Baixar
      </a>
    );
  }
  if (media.status === 'missing')
    return (
      <span className="text-xs italic text-zinc-300">{MEDIA_MISSING_TEXT}</span>
    );
  const busy = media.status === 'queued' || media.status === 'loading';
  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        pending.current = true;
        media.request();
      }}
      className={`${cls} disabled:opacity-60`}
    >
      <DownloadIcon className="h-3.5 w-3.5" />
      {busy
        ? 'Baixando…'
        : media.status === 'error'
          ? 'Tentar de novo'
          : 'Baixar'}
    </button>
  );
}

function ImageMedia({
  media,
  sticker,
  label,
  name,
  alt,
}: {
  media: Media;
  sticker: boolean;
  label: string;
  name: string;
  alt: string;
}) {
  const thread = useThread();
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useInView(boxRef, thread?.scrollRef);
  const { status, request } = media;
  useEffect(() => {
    if (visible && status === 'idle') request();
  }, [visible, status, request]);
  const [broken, setBroken] = useState(false);
  const [zoom, setZoom] = useState(false);

  const box = sticker ? 'h-32 w-32' : 'h-48 w-64 max-w-full';
  if (status === 'missing') return <Unavailable label={label} />;
  if (status === 'error') return <Failed media={media} label={label} />;
  if (status === 'ready' && media.url) {
    // Figurinha animada (lottie) e imagem de tipo que o <img> não desenha: rótulo + Baixar.
    if (broken || !isRenderableImage(media.type ?? '')) {
      return (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs">
          <span>{label}</span>
          <span className="italic text-zinc-300">
            {sticker
              ? 'Figurinha animada — veja no celular'
              : 'Formato sem prévia'}
          </span>
          <DownloadButton media={media} name={name} />
        </div>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setZoom(true)}
          title="Ampliar"
          className="block cursor-zoom-in"
        >
          <img
            src={media.url}
            alt={alt}
            onLoad={thread?.keepBottom}
            onError={() => setBroken(true)}
            className={
              sticker
                ? 'h-32 w-32 object-contain'
                : 'max-h-72 max-w-full rounded-md object-contain'
            }
          />
        </button>
        {zoom && (
          <Lightbox url={media.url} alt={alt} onClose={() => setZoom(false)} />
        )}
      </>
    );
  }
  return (
    <div
      ref={boxRef}
      aria-busy={status !== 'idle'}
      className={`${box} flex items-center justify-center rounded-md bg-black/20 text-xs text-zinc-300`}
    >
      {status === 'idle' ? label : `${label} · carregando…`}
    </div>
  );
}

// Imagem ampliada num <dialog> NATIVO aberto com showModal(): o resto da página fica inerte (nada de
// digitar no compositor escondido atrás), o foco entra no diálogo, Escape fecha e, ao fechar, o foco
// volta a quem abriu (HTML §4.11.4 — dialog). Clique fora da imagem também fecha.
function Lightbox({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Layout effect: o cleanup roda ANTES de o React tirar o <dialog> do DOM — close() com o nó ainda
  // no documento devolve o foco a quem abriu (com useEffect o nó já saiu e o foco se perde).
  useLayoutEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={alt}
      // Fechar = desmontar pelo estado, na hora: Escape chega como `cancel` (síncrono), e o botão e o
      // clique fora chamam onClose direto. O evento `close` é entregue depois, como tarefa (e pode
      // atrasar com a aba em segundo plano — visto no Chrome 153); fica só de reserva, e no StrictMode
      // (cleanup fecha, setup reabre) só vale se o diálogo continua fechado.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[95vh] max-w-[95vw] overflow-visible bg-transparent p-0 backdrop:bg-black/85"
    >
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="rounded border border-zinc-500 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-800"
        >
          Fechar
        </button>
        <img
          src={url}
          alt={alt}
          className="max-h-[85vh] max-w-[95vw] object-contain"
        />
      </div>
    </dialog>
  );
}

function AudioMedia({
  media,
  m,
  label,
  name,
}: {
  media: Media;
  m: MessageDto;
  label: string;
  name: string;
}) {
  // Safari ≥ 18.4 toca Ogg/Opus (webkit.org/blog/16574); quem não tocar o formato fica com "Baixar".
  const playable = useMemo(
    () =>
      canPlay(m.mimetype, (t) =>
        document.createElement('audio').canPlayType(t),
      ),
    [m.mimetype],
  );
  const [failed, setFailed] = useState(false);
  const autoPlay = useRef(false);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (media.status === 'ready' && autoPlay.current && ref.current) {
      autoPlay.current = false;
      // Autoplay depois de um download longo pode ser recusado (NotAllowedError): os controles
      // ficam à mostra e o operador aperta o play.
      ref.current.play().catch(() => undefined);
    }
  }, [media.status]);

  const size = formatBytes(m.fileSize);
  if (media.status === 'missing') return <Unavailable label={label} />;
  if (!playable || failed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs">
        <span>
          {label}
          {size ? ` · ${size}` : ''}
        </span>
        <span className="italic text-zinc-300">
          Este navegador não toca este áudio
        </span>
        <DownloadButton media={media} name={name} />
      </div>
    );
  }
  if (media.status === 'error') return <Failed media={media} label={label} />;
  if (media.status === 'ready' && media.url) {
    return (
      <audio
        ref={ref}
        controls
        preload="metadata"
        src={media.url}
        onError={() => setFailed(true)}
        className="w-64 max-w-full"
      />
    );
  }
  const busy = media.status !== 'idle';
  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        autoPlay.current = true;
        media.request();
      }}
      className="flex w-64 max-w-full items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-left text-xs hover:bg-black/30 disabled:opacity-70"
    >
      <PlayIcon className="h-3.5 w-3 shrink-0" />
      <span>
        {busy ? 'Baixando áudio…' : 'Ouvir áudio'}
        {size ? ` · ${size}` : ''}
      </span>
    </button>
  );
}

function VideoMedia({
  media,
  m,
  label,
  name,
}: {
  media: Media;
  m: MessageDto;
  label: string;
  name: string;
}) {
  const thread = useThread();
  const [failed, setFailed] = useState(false);
  const autoPlay = useRef(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (media.status === 'ready' && autoPlay.current && ref.current) {
      autoPlay.current = false;
      ref.current.play().catch(() => undefined);
    }
  }, [media.status]);

  const size = formatBytes(m.fileSize);
  const tooBig = (m.fileSize ?? 0) > INLINE_VIDEO_MAX;
  if (media.status === 'missing') return <Unavailable label={label} />;
  if (tooBig || failed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs">
        <span>
          {label}
          {size ? ` · ${size}` : ''}
        </span>
        {failed && (
          <span className="italic text-zinc-300">
            Este navegador não toca este vídeo
          </span>
        )}
        <DownloadButton media={media} name={name} />
      </div>
    );
  }
  if (media.status === 'error') return <Failed media={media} label={label} />;
  if (media.status === 'ready' && media.url) {
    return (
      <video
        ref={ref}
        controls
        playsInline
        preload="metadata"
        src={media.url}
        onLoadedMetadata={thread?.keepBottom}
        onError={() => setFailed(true)}
        className="max-h-72 max-w-full rounded-md"
      />
    );
  }
  const busy = media.status !== 'idle';
  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        autoPlay.current = true;
        media.request();
      }}
      className="flex h-40 w-64 max-w-full flex-col items-center justify-center gap-2 rounded-md bg-black/30 text-xs text-zinc-300 hover:bg-black/40 disabled:opacity-70"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
        <PlayIcon className="ml-0.5 h-4 w-3.5" />
      </span>
      <span>
        {busy ? 'Baixando vídeo…' : label}
        {size ? ` · ${size}` : ''}
      </span>
    </button>
  );
}

function DocumentMedia({
  media,
  m,
  label,
  name,
}: {
  media: Media;
  m: MessageDto;
  label: string;
  name: string;
}) {
  const size = formatBytes(m.fileSize);
  const ext = name.includes('.') ? name.split('.').pop()!.toUpperCase() : null;
  return (
    <div className="flex w-72 max-w-full items-center gap-3 rounded-md bg-black/20 px-3 py-2">
      <span aria-hidden="true" className="text-2xl">
        📄
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm" title={m.fileName ?? label}>
          {m.fileName ?? label}
        </div>
        <div className="text-[11px] text-zinc-300">
          {[ext, size].filter(Boolean).join(' · ')}
        </div>
      </div>
      <DownloadButton media={media} name={name} />
    </div>
  );
}
