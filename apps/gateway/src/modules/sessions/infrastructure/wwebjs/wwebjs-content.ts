import type { ReactionPayload } from '../../application/engine.port';
import {
  clean,
  content,
  forwarding,
  formatContacts,
  formatEvent,
  formatLocation,
  formatPoll,
  ignore,
  type DescribedMessage,
} from '../message-content';

// P-066 (E22) — o que o gateway lê de uma `Message` do whatsapp-web.js 1.34.7 (campos preenchidos
// por `Message._patch`, node_modules/whatsapp-web.js/src/structures/Message.js). Estrutural de
// propósito: a função é pura e testada com objetos falsos, sem Chromium.
export interface WwebjsMessageLike {
  type?: string;
  body?: string;
  hasMedia?: boolean;
  isForwarded?: boolean;
  forwardingScore?: number;
  // Message.js:174-188 → Location.js:21-59 (name/address só quando o WhatsApp manda `loc`).
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  } | null;
  vCards?: string[]; // vcard: [body] · multi_vcard: vcardList[].vcard (Message.js:195-198)
  pollName?: string;
  pollOptions?: Array<string | { name?: string }>; // [{name, localId}] em runtime (PollVote.js:41-42)
  inviteV4?: { groupName?: string } | null;
  title?: string;
  description?: string;
  selectedButtonId?: string;
  selectedRowId?: string;
  rawData?: Record<string, unknown>;
}

// Tipos que NÃO são mensagem visível no chat: sistema/protocolo, reação (chega por
// `message_reaction`), apagada (P-069), ligação e contêiner de álbum. `ciphertext` e `gp2` nunca
// chegam ao message_create (Client.js:647-703, :1189-1219) — ficam por defesa.
const IGNORED = new Set([
  'revoked',
  'reaction',
  'protocol',
  'ciphertext',
  'gp2',
  'e2e_notification',
  'notification',
  'notification_template',
  'broadcast_notification',
  'group_notification',
  'call_log',
  'debug',
  'album',
]);

// msg.type → mediaType público. `ptv` (vídeo redondo) não existe no Constants.js da 1.34.7 — fica
// por defesa, como vídeo (sem isso cairia em documento).
const MEDIA: Record<string, string> = {
  image: 'image',
  video: 'video',
  ptv: 'video',
  audio: 'audio',
  ptt: 'audio',
  document: 'document',
  sticker: 'sticker',
};

function str(v: unknown): string | null {
  return typeof v === 'string' ? clean(v) : null;
}

// Pura. Decide pelo `type` da mensagem (não por `hasMedia`: mídia sem `directPath` vinha como
// texto com o `body` cru). Nunca usa o `body` de localização (não é o endereço).
export function describeWwebjsMessage(
  msg: WwebjsMessageLike,
): DescribedMessage {
  const t = msg.type ?? 'chat';
  if (IGNORED.has(t)) return ignore(t);
  const fwd = forwarding(msg.isForwarded, msg.forwardingScore);
  const raw = msg.rawData ?? {};

  const mediaType = MEDIA[t];
  if (mediaType) {
    // Legenda: `body` só quando hasMedia (Message.js:56-57); sem mídia, o caption cru.
    const caption = msg.hasMedia ? str(msg.body) : str(raw.caption);
    return content(mediaType, caption, fwd, {
      mediaType,
      mimetype: null,
      fileName: null,
      caption,
      fileSize: null,
    });
  }

  switch (t) {
    case 'chat':
      return content('text', str(msg.body), fwd);
    case 'location': {
      const l = msg.location;
      return content(
        'location',
        formatLocation({
          latitude: l?.latitude,
          longitude: l?.longitude,
          name: l?.name,
          address: l?.address,
        }),
        fwd,
      );
    }
    case 'vcard':
    case 'multi_vcard':
      return content(
        'contact',
        formatContacts((msg.vCards ?? []).map((vcard) => ({ vcard }))) ??
          str(raw.vcardFormattedName),
        fwd,
      );
    case 'poll_creation':
      return content(
        'poll',
        formatPoll(
          str(msg.pollName) ?? str(msg.body),
          (msg.pollOptions ?? []).map((o) =>
            typeof o === 'string' ? o : (o?.name ?? null),
          ),
        ),
        fwd,
      );
    case 'scheduled_event_creation':
    case 'event_creation':
      // eventDescription não é copiado pelo _patch (d.ts promete, runtime não): lê do rawData.
      return content(
        'event',
        formatEvent(
          str(raw.eventName) ?? str(msg.body),
          str(raw.eventDescription),
        ),
        fwd,
      );
    case 'groups_v4_invite':
      return content(
        'group_invite',
        formatEvent(str(msg.inviteV4?.groupName), str(raw.caption)) ??
          str(msg.body),
        fwd,
      );
    case 'buttons_response':
    case 'list_response':
    case 'template_button_reply':
      // Resposta de botão/lista = o que o contato tocou (o texto do botão).
      return content(
        'text',
        str(msg.body) ?? str(msg.selectedButtonId) ?? str(msg.selectedRowId),
        fwd,
      );
    case 'list':
    case 'interactive':
    case 'native_flow':
    case 'hsm': {
      const text =
        str(msg.body) ?? str(msg.title) ?? str(msg.description) ?? null;
      return content(text ? 'text' : 'other', text, fwd);
    }
    // Cartões que o gateway ainda não desenha: `other`, com o resumo legível quando houver.
    case 'product':
      return content(
        'other',
        str(msg.title) ?? str(msg.description) ?? str(msg.body),
        fwd,
      );
    case 'order':
      return content('other', str(msg.body), fwd);
    default:
      // payment, oversized, unknown e tipo novo: não some — `other` (o painel mostra o aviso).
      return content('other', str(msg.body), fwd);
  }
}

// Chave de mensagem do WhatsApp Web: `_serialized`, ou `$1` nas builds ≥ 2.3000.104x (rename do WA
// Web que o patch `$1` só corrige em `msg.id` — patches/whatsapp-web.js+1.34.7.patch).
function serializedOf(k: unknown): string | null {
  if (!k || typeof k !== 'object') return null;
  const o = k as { _serialized?: unknown; $1?: unknown };
  if (typeof o._serialized === 'string' && o._serialized) return o._serialized;
  if (typeof o.$1 === 'string' && o.$1) return o.$1;
  return null;
}

// jid em string ou Wid ({_serialized}).
function jidOf(v: unknown): string | null {
  if (typeof v === 'string') return v || null;
  return serializedOf(v);
}

// P-074 (E23) — remetente de mensagem RECEBIDA em grupo = `msg.author` ("If the message was sent to
// a group, this field will contain the user that sent the message" — Message.js:94-100, Wid já
// convertido em `_serialized`; index.d.ts:1185-1186 `author?: string`), sem aparelho (`:NN@`).
// @lid → telefone SÓ pelo cache em memória da engine: resolver na hora seria page.evaluate +
// enforceLidAndPnRetrieval → queryWidExists (Injected/Utils.js:1795-1823) — uma consulta de rede
// por autor desconhecido, e o fracasso não é cacheado (padrão contact-check, proibido). Fora de
// grupo ou sem author → null (o chamador mantém o chatJid). Pura.
export function wwebjsGroupSender(
  chatRaw: string,
  author: unknown,
  lidToPn: ReadonlyMap<string, string>,
): string | null {
  if (!chatRaw.endsWith('@g.us')) return null;
  const a = jidOf(author);
  if (!a) return null;
  const jid = a.replace(/:\d+(?=@)/, '');
  return jid.endsWith('@lid') ? (lidToPn.get(jid) ?? jid) : jid;
}

// P-066 (E22) — `message_reaction` (Reaction.js:16-63) → payload bruto do evento `message.reaction`
// (o chat ainda passa pelo resolveNumberJid da engine). Pura. Defensiva: com a chave-alvo em `$1`
// ou `remote` como Wid, o handler antigo descartava a reação em silêncio ou lançava. Timestamp
// arredondado para segundos (o WA Web manda ms/1000 com fração — Client.js:1235).
export function mapWwebjsReaction(r: {
  id?: { fromMe?: boolean } | null;
  msgId?: unknown;
  reaction?: unknown;
  senderId?: unknown;
  timestamp?: unknown;
}): ReactionPayload | null {
  const keyId = serializedOf(r.msgId);
  const chatJid = jidOf((r.msgId as { remote?: unknown } | null)?.remote);
  if (!keyId || !chatJid || chatJid === 'status@broadcast') return null;
  const ts =
    typeof r.timestamp === 'number' && Number.isFinite(r.timestamp)
      ? Math.floor(r.timestamp)
      : Math.floor(Date.now() / 1000);
  return {
    keyId,
    chatJid,
    senderJid: jidOf(r.senderId),
    emoji: typeof r.reaction === 'string' ? r.reaction : '',
    fromMe: !!r.id?.fromMe,
    timestamp: ts,
  };
}
