// O que o painel desenha para cada mensagem (E23 · P-067) — rótulo por `type`, prévia de uma linha
// SEM "…", partes de cada cartão (localização, contato, enquete, evento, convite), selo
// "Encaminhada" e o tipo seguro do blob de mídia. Puro: nada de React/DOM → vitest `environment:
// 'node'`. Só `import type` do contrato.
//
// Fonte única do domínio de `type` e do texto de cada cartão: o gateway
// (apps/gateway/src/modules/sessions/infrastructure/message-content.ts — INTEGRACAO §3.2). Os
// parsers daqui são o inverso daqueles formatadores (o spec confere ida e volta com o arquivo real).
import type { MessageDto } from '@contracts';

export const MEDIA_KINDS = [
  'image',
  'video',
  'audio',
  'document',
  'sticker',
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const isMediaKind = (v: unknown): v is MediaKind =>
  typeof v === 'string' && (MEDIA_KINDS as readonly string[]).includes(v);

export const UNSUPPORTED_TEXT = 'Mensagem não suportada — veja no celular';
export const MEDIA_MISSING_TEXT = 'Arquivo indisponível — veja no celular';

export interface TypeLabel {
  icon: string;
  label: string;
}

// Vocabulário dos títulos da Central de Ajuda em pt-BR (fotos, vídeos, áudios, documentos,
// figurinhas, localização, contatos, enquetes, eventos, convite para grupo). O texto EXATO da
// prévia do WhatsApp Web não tem fonte oficial — não verificado. O banco não distingue nota de voz
// de arquivo de áudio nem figurinha animada (sem coluna), então o rótulo é o genérico.
export const TYPE_LABELS: Readonly<Record<string, TypeLabel>> = {
  image: { icon: '📷', label: 'Foto' },
  video: { icon: '🎥', label: 'Vídeo' },
  audio: { icon: '🎤', label: 'Áudio' },
  document: { icon: '📄', label: 'Documento' },
  sticker: { icon: '💟', label: 'Figurinha' },
  location: { icon: '📍', label: 'Localização' },
  contact: { icon: '👤', label: 'Contato' },
  poll: { icon: '📊', label: 'Enquete' },
  event: { icon: '📅', label: 'Evento' },
  group_invite: { icon: '👥', label: 'Convite para grupo' },
  poll_vote: { icon: '🗳️', label: 'Voto em enquete' },
};

// `type` manda; `mediaType` só entra quando o type não tem rótulo (o wwebjs grava type
// 'other'/'text' com mediaType 'document' quando um tipo sem cartão traz arquivo).
export function typeLabel(
  type: string,
  mediaType?: string | null,
): TypeLabel | null {
  return (
    TYPE_LABELS[type] ??
    (isMediaKind(mediaType) ? TYPE_LABELS[mediaType] : null) ??
    null
  );
}

export function labelText(type: string, mediaType?: string | null): string {
  const l = typeLabel(type, mediaType);
  return l ? `${l.icon} ${l.label}` : UNSUPPORTED_TEXT;
}

// --- Legado (antes da E22): o wwebjs gravava tudo sem mídia como type 'text' com o `body` cru —
// vCard cru e base64 da miniatura (localização, mídia sem arquivo). Fica até a retenção (90 dias).

// Base64 de JPEG (/9j/) ou PNG (iVBORw0KGgo) sem espaços — nunca é texto humano.
export function isLegacyThumbnail(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.length >= 64 && /^(\/9j\/|iVBORw0KGgo)[A-Za-z0-9+/=\r\n]+$/.test(t);
}

export function isRawVcard(text: string | null | undefined): boolean {
  return !!text && /^\s*BEGIN:VCARD/i.test(text);
}

// Mesmas regex do formatContacts do gateway (message-content.ts).
function vcardToLine(vcard: string): string | null {
  const fn = /^FN(?:;[^:\r\n]*)?:(.*)$/im.exec(vcard)?.[1]?.trim() || null;
  const tels = [...vcard.matchAll(/^(?:item\d+\.)?TEL[^:\r\n]*:(.+)$/gim)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  const line = [fn, ...tels].filter(Boolean).join(' — ');
  return line || null;
}

// --- Prévia de uma linha (lista de conversas, fluxo ao vivo) — NUNCA "…" nem vazio.

export function firstLine(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const raw of text.split('\n')) {
    const l = raw.replace(/\s+/g, ' ').trim();
    if (l) return l;
  }
  return null;
}

export function messagePreview(m: {
  type: string;
  text: string | null;
  mediaType?: string | null;
}): string {
  const { type } = m;
  if (type === 'text' && isRawVcard(m.text)) {
    const c = parseContactsText(vcardToLine(m.text!));
    return `${TYPE_LABELS.contact.icon} ${c[0]?.name ?? c[0]?.phones[0] ?? TYPE_LABELS.contact.label}`;
  }
  if (type === 'text' && isLegacyThumbnail(m.text)) return UNSUPPORTED_TEXT;

  const body = firstLine(m.text);
  const own = TYPE_LABELS[type];
  switch (type) {
    case 'location': {
      const loc = parseLocationText(m.text);
      return `${own.icon} ${firstLine(loc.label) ?? own.label}`;
    }
    case 'contact': {
      const cards = parseContactsText(m.text);
      const first = cards[0]?.name ?? cards[0]?.phones[0] ?? own.label;
      const more = cards.length > 1 ? ` e mais ${cards.length - 1}` : '';
      return `${own.icon} ${first}${more}`;
    }
    case 'poll':
    case 'event':
    case 'group_invite':
      return `${own.icon} ${body ?? own.label}`;
    case 'poll_vote':
      return `${own.icon} ${own.label}`;
  }
  // Mídia: "📷 legenda" quando há legenda; senão "📷 Foto".
  if (isMediaKind(type)) return `${own.icon} ${body ?? own.label}`;
  // text / other / desconhecido: o texto (ou o resumo do `other`) ganha.
  if (body) return body;
  if (isMediaKind(m.mediaType)) return labelText(m.mediaType);
  return UNSUPPORTED_TEXT;
}

export function conversationPreview(c: {
  lastType: string;
  lastText: string | null;
  lastFromMe: boolean;
}): string {
  const body = messagePreview({ type: c.lastType, text: c.lastText });
  return c.lastFromMe ? `Você: ${body}` : body;
}

// --- Localização: rótulo + link do mapa. Só a forma EXATA gerada pelo gateway
// (`https://maps.google.com/?q=${lat},${lng}` com números JS — inclusive notação exponencial). A
// URL é RECONSTRUÍDA dos números validados: o texto cru nunca vira href.

const NUM = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
export const MAP_URL_RE = new RegExp(
  String.raw`^https://maps\.google\.com/\?q=(${NUM}),(${NUM})$`,
);

export interface LocationParts {
  label: string | null; // "Nome — Endereço" (várias linhas quando há legenda)
  mapUrl: string | null;
}

export function parseLocationText(
  text: string | null | undefined,
): LocationParts {
  if (!text || !text.trim()) return { label: null, mapUrl: null };
  const lines = text.split('\n');
  const last = lines[lines.length - 1].trim();
  const m = MAP_URL_RE.exec(last);
  if (!m) return { label: text.trim(), mapUrl: null };
  const label = lines.slice(0, -1).join('\n').trim() || null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  const ok =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0);
  // Coordenada fora da faixa: sem link (e a linha da URL também não aparece como texto solto).
  return {
    label,
    mapUrl: ok ? `https://maps.google.com/?q=${lat},${lng}` : null,
  };
}

// --- Contato / enquete / evento / convite — o inverso dos formatadores do gateway.

export interface ContactCard {
  name: string | null;
  phones: string[];
}
const PHONE_RE = /^\+?[\d\s().-]{3,}$/;

// "Nome — +55 11 9… — +55 11 8…" por linha. Sem nome, a 1ª parte já é telefone.
export function parseContactsText(
  text: string | null | undefined,
): ContactCard[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line
        .split(' — ')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length && !PHONE_RE.test(parts[0])) {
        return { name: parts[0], phones: parts.slice(1) };
      }
      return { name: null, phones: parts };
    });
}

// "Pergunta\n• a\n• b"; o snapshot do Baileys traz a contagem ("• opção: 3").
export function parsePollText(text: string | null | undefined): {
  question: string | null;
  options: string[];
} {
  if (!text) return { question: null, options: [] };
  const options: string[] = [];
  const q: string[] = [];
  for (const l of text.split('\n')) {
    if (l.startsWith('• ')) options.push(l.slice(2));
    else if (!options.length) q.push(l);
    else options[options.length - 1] += `\n${l}`; // opção com quebra de linha (raro)
  }
  return { question: q.join('\n').trim() || null, options };
}

// Evento "Nome\nDescrição" e convite "Grupo\nLegenda".
export function splitTitleBody(text: string | null | undefined): {
  title: string | null;
  body: string | null;
} {
  if (!text || !text.trim()) return { title: null, body: null };
  const i = text.indexOf('\n');
  if (i < 0) return { title: text.trim(), body: null };
  return {
    title: text.slice(0, i).trim() || null,
    body: text.slice(i + 1).trim() || null,
  };
}

// --- Corpo do balão — o que o MessageBubble desenha (sem JSX aqui).

export type BubbleContent =
  | { kind: 'text'; text: string }
  | {
      kind: 'media';
      mediaType: MediaKind;
      caption: string | null;
      label: string; // "📷 Foto" — enquanto carrega / sem arquivo
    }
  | ({ kind: 'location' } & LocationParts)
  | { kind: 'contact'; contacts: ContactCard[] }
  | { kind: 'poll'; question: string | null; options: string[] }
  | { kind: 'event'; name: string | null; description: string | null }
  | { kind: 'group_invite'; groupName: string | null; caption: string | null }
  | { kind: 'poll_vote'; label: string }
  | { kind: 'unsupported'; summary: string | null };

export function bubbleContent(
  m: Pick<MessageDto, 'type' | 'text'> & Partial<Pick<MessageDto, 'mediaType'>>,
): BubbleContent {
  const text = m.text && m.text.trim() ? m.text : null;
  // Mídia decide por mediaType primeiro (wwebjs: type 'other'/'text' + mediaType 'document').
  const mk = isMediaKind(m.mediaType)
    ? m.mediaType
    : isMediaKind(m.type)
      ? m.type
      : null;
  if (mk) {
    // Legenda legada do wwebjs pode ser o base64 da miniatura — nunca mostrar.
    const caption = text && !isLegacyThumbnail(text) ? text : null;
    return { kind: 'media', mediaType: mk, caption, label: labelText(mk) };
  }
  switch (m.type) {
    case 'text':
      if (isRawVcard(text)) {
        return {
          kind: 'contact',
          contacts: parseContactsText(vcardToLine(text!)),
        };
      }
      if (!text || isLegacyThumbnail(text)) {
        return { kind: 'unsupported', summary: null };
      }
      return { kind: 'text', text };
    case 'location':
      return { kind: 'location', ...parseLocationText(text) };
    case 'contact':
      return { kind: 'contact', contacts: parseContactsText(text) };
    case 'poll':
      return { kind: 'poll', ...parsePollText(text) };
    case 'event': {
      const t = splitTitleBody(text);
      return { kind: 'event', name: t.title, description: t.body };
    }
    case 'group_invite': {
      const t = splitTitleBody(text);
      return { kind: 'group_invite', groupName: t.title, caption: t.body };
    }
    case 'poll_vote':
      return { kind: 'poll_vote', label: labelText('poll_vote') };
    default:
      // 'other' (com resumo ou não) e type desconhecido: o resumo + o aviso.
      return { kind: 'unsupported', summary: text };
  }
}

// --- Selo "Encaminhada". "Com frequência" = cadeia de 5+ conversas (FAQ oficial do WhatsApp;
// o limiar em forwardingScore é inferência registrada na D-028).

export const FREQUENTLY_FORWARDED_MIN = 5;

export function forwardBadge(m: {
  isForwarded?: boolean | null;
  forwardingScore?: number | null;
}): { frequent: boolean; label: string } | null {
  const score = typeof m.forwardingScore === 'number' ? m.forwardingScore : 0;
  if (!m.isForwarded && score <= 0) return null;
  return score >= FREQUENTLY_FORWARDED_MIN
    ? { frequent: true, label: 'Encaminhada com frequência' }
    : { frequent: false, label: 'Encaminhada' };
}

// --- Mídia: tamanho, tipo seguro do blob e se o navegador toca.

export function formatBytes(n: number | null | undefined): string | null {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

// Imagens que o <img> desenha. SVG fica de fora de propósito: um blob SVG aberto numa aba rodaria
// script na origem do painel.
const SAFE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const baseMime = (t: string | null | undefined): string =>
  (t ?? '').split(';')[0].trim().toLowerCase();

// Tipo com que o blob vira object URL. O blob mora na ORIGEM DO PAINEL: um documento HTML/SVG de
// um contato aberto numa aba executaria com o cookie da sessão → documento (e tudo que não for
// imagem/áudio/vídeo de tipo conhecido) vira `application/octet-stream` (só baixa). Quando o
// gateway manda tipo genérico, vale o mimetype do DTO.
export function safeBlobType(
  mediaType: string,
  dtoMime: string | null | undefined,
  blobType: string | null | undefined,
): string {
  const generic = (t: string) => !t || t === 'application/octet-stream';
  const fromDto = (dtoMime ?? '').trim();
  const fromBlob = (blobType ?? '').trim();
  const candidate = !generic(baseMime(fromDto)) ? fromDto : fromBlob;
  const base = baseMime(candidate);
  if (mediaType === 'image' || mediaType === 'sticker') {
    return SAFE_IMAGE_TYPES.includes(base) ? base : 'application/octet-stream';
  }
  // Tipo ESTRITO (`tipo/subtipo`, sem parâmetros): o mimetype vem do remetente (proto do WhatsApp) e
  // `video/mp4,text/html` passaria num startsWith — o navegador resolve esse blob como text/html.
  if (mediaType === 'audio' && /^audio\/[a-z0-9][a-z0-9.+-]*$/.test(base))
    return base;
  if (mediaType === 'video' && /^video\/[a-z0-9][a-z0-9.+-]*$/.test(base))
    return base;
  return 'application/octet-stream';
}

export function isRenderableImage(blobType: string): boolean {
  return SAFE_IMAGE_TYPES.includes(baseMime(blobType));
}

// `probe` = HTMLMediaElement.canPlayType (injetado — no node não existe). '' = não toca.
export function canPlay(
  mimetype: string | null | undefined,
  probe: (type: string) => string,
): boolean {
  if (!mimetype) return true; // sem tipo: deixa o <audio> tentar (onError cai no "Baixar")
  try {
    return probe(mimetype) !== '';
  } catch {
    return false;
  }
}

const EXT_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'application/pdf': 'pdf',
};

// Nome do arquivo no "Baixar": o do DTO (UTF-8, o header Content-Disposition não é legível
// cross-origin) ou um nome derivado do tipo. Sem barras (o navegador as troca, mas deixamos limpo).
export function downloadName(m: {
  fileName?: string | null;
  mimetype?: string | null;
  mediaType?: string | null;
  keyId?: string;
  id: string;
}): string {
  const clean = (s: string) => s.replace(/[\\/]+/g, '_').trim();
  if (m.fileName && clean(m.fileName)) return clean(m.fileName);
  const ext = EXT_BY_MIME[baseMime(m.mimetype)] ?? 'bin';
  const kind = isMediaKind(m.mediaType) ? m.mediaType : 'arquivo';
  const ref = (m.keyId || m.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(-16);
  return `${kind}-${ref}.${ext}`;
}
