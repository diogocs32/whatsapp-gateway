import {
  extractMessageContent,
  getContentType,
  type proto,
} from '@whiskeysockets/baileys';
import {
  clean,
  content,
  forwarding,
  formatContacts,
  formatEvent,
  formatLocation,
  formatPoll,
  ignore,
  type ContentMedia,
  type DescribedMessage,
} from '../message-content';

// P-066 (E22) — o que é uma mensagem recebida no Baileys 7.0.0-rc14 e com que tipo/texto ela entra
// no gateway. Pura (só usa extractMessageContent/getContentType da lib DENTRO da função — o
// baileys.shutdown.spec.ts mocka o pacote com `proto: {}`). Catálogo e fixtures dos 95 campos de
// `proto.Message` conferidos contra a lib instalada (Utils/messages.js:625-701).
//
// `mediaMessage`: o conteúdo desembrulhado que o downloadMediaMessage precisa quando a mídia vem
// num invólucro que a lib NÃO desembrulha (figurinha lottie: sem isso o download lança
// "lottieStickerMessage message is not a media message" — Utils/messages.js:854-856).
export type BaileysDescribed = DescribedMessage & {
  mediaMessage?: proto.IMessage;
};

// Invólucros FutureProofMessage que o normalizeMessageContent da rc14 NÃO abre (ele só trata
// ephemeral/viewOnce*/documentWithCaption/edited/associatedChild/groupStatus* — :651-661).
const EXTRA_WRAPPERS = new Set([
  'lottieStickerMessage',
  'groupMentionedMessage',
  'botInvokeMessage',
  'botForwardedMessage',
  'pollCreationMessageV4',
  'questionMessage',
  'questionReplyMessage',
]);

// Não são mensagem visível no chat do WhatsApp Web (ou chegam por outro evento): protocolo e chaves,
// reação (evento `message.reaction` — D-028), resposta a evento, fixar/manter, álbum-mãe (cada foto
// chega como mensagem própria — Types/Message.d.ts:152-153), menções de status, etc. Editadas e
// apagadas (protocolMessage) ficam para a P-069.
const IGNORED = new Set([
  'protocolMessage',
  'senderKeyDistributionMessage',
  'fastRatchetKeySenderKeyDistributionMessage',
  'reactionMessage',
  'encReactionMessage',
  'encEventResponseMessage',
  'keepInChatMessage',
  'pinInChatMessage',
  'albumMessage',
  'placeholderMessage',
  'secretEncryptedMessage',
  'encCommentMessage',
  'stickerSyncRmrMessage',
  'statusNotificationMessage',
  'statusStickerInteractionMessage',
  'statusMentionMessage',
  'groupStatusMentionMessage',
  'limitSharingMessage',
  'pollCreationOptionImageMessage',
  'scheduledCallEditMessage',
  'declinePaymentRequestMessage',
  'cancelPaymentRequestMessage',
  'requestPhoneNumberMessage',
]);

const POLLS = new Set([
  'pollCreationMessage',
  'pollCreationMessageV2',
  'pollCreationMessageV3',
  'pollCreationMessageV5',
]);

// Long (protobufjs) | number | null → number | null.
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof (v as { toNumber?: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? clean(v) : null;
}

function join(parts: unknown[], sep = '\n'): string | null {
  return clean(
    parts
      .map((p) => str(p))
      .filter(Boolean)
      .join(sep),
  );
}

// Metadados de mídia (§ F4). Vídeo redondo (ptv) = vídeo — o download funciona com o tipo 'ptv'
// (HKDF "Video", Defaults/index.js:114).
export function mediaInfoOf(
  msg: proto.IMessage | null | undefined,
): ContentMedia | null {
  if (!msg) return null;
  const im = msg.imageMessage;
  if (im)
    return {
      mediaType: 'image',
      mimetype: im.mimetype ?? null,
      fileName: null,
      caption: str(im.caption),
      fileSize: toNum(im.fileLength),
    };
  const vm = msg.videoMessage ?? msg.ptvMessage;
  if (vm)
    return {
      mediaType: 'video',
      mimetype: vm.mimetype ?? null,
      fileName: null,
      caption: str(vm.caption),
      fileSize: toNum(vm.fileLength),
    };
  const am = msg.audioMessage;
  if (am)
    return {
      mediaType: 'audio',
      mimetype: am.mimetype ?? null,
      fileName: null,
      caption: null,
      fileSize: toNum(am.fileLength),
    };
  const dm =
    msg.documentMessage ??
    msg.documentWithCaptionMessage?.message?.documentMessage;
  if (dm)
    return {
      mediaType: 'document',
      mimetype: dm.mimetype ?? null,
      fileName: dm.fileName ?? dm.title ?? null,
      caption: str(dm.caption),
      fileSize: toNum(dm.fileLength),
    };
  const sm = msg.stickerMessage;
  if (sm)
    return {
      mediaType: 'sticker',
      mimetype: sm.mimetype ?? null,
      fileName: null,
      caption: null,
      fileSize: toNum(sm.fileLength),
    };
  return null;
}

// `fromMe`: o voto de enquete só vira mensagem quando é do CONTATO (resposta a uma enquete nossa —
// conta no reply-rate como antes). O nosso voto pelo celular é ignorado (não é handoff).
export function describeBaileysMessage(
  message: proto.IMessage | null | undefined,
  fromMe = false,
): BaileysDescribed {
  let c = extractMessageContent(message ?? undefined);
  // deviceSentMessage (enviada pelo próprio aparelho): no fio a lib já desembrulha
  // (decode-wa-message.js:267); fica por defesa e para fixtures montados com fromObject.
  if (c?.deviceSentMessage?.message) {
    c = extractMessageContent(c.deviceSentMessage.message);
  }
  let ctype = c ? getContentType(c) : undefined;
  let unwrapped = false;
  let lottie = false;
  for (let i = 0; i < 3 && c && ctype && EXTRA_WRAPPERS.has(ctype); i++) {
    if (ctype === 'lottieStickerMessage') lottie = true;
    const inner = (c[ctype] as proto.Message.IFutureProofMessage | null)
      ?.message;
    c = extractMessageContent(inner ?? undefined);
    ctype = c ? getContentType(c) : undefined;
    unwrapped = true;
  }
  if (!c || !ctype) return ignore('sem-conteudo');
  if (IGNORED.has(ctype)) return ignore(ctype);

  // Selo "Encaminhada": o contextInfo mora DENTRO do conteúdo (`<tipo>.contextInfo`) — nunca usar
  // Object.keys(c)[0]: no decode `messageContextInfo` vem antes de enquete/evento/ptv.
  const node = c[ctype] as
    { contextInfo?: proto.IContextInfo | null } | string | null | undefined;
  const ci = node && typeof node === 'object' ? node.contextInfo : null;
  const fwd = forwarding(ci?.isForwarded, toNum(ci?.forwardingScore));

  const media = mediaInfoOf(c);
  if (media) {
    const d = content(media.mediaType, media.caption, fwd, media);
    return unwrapped || lottie ? { ...d, mediaMessage: c } : d;
  }

  switch (ctype) {
    case 'conversation':
      return content('text', c.conversation ?? null, fwd);
    case 'extendedTextMessage':
      return content('text', c.extendedTextMessage?.text ?? null, fwd);
    case 'locationMessage': {
      const l = c.locationMessage!;
      return content(
        'location',
        formatLocation({
          latitude: l.degreesLatitude,
          longitude: l.degreesLongitude,
          name: l.name,
          address: l.address,
          caption: l.comment,
        }),
        fwd,
      );
    }
    case 'liveLocationMessage': {
      const l = c.liveLocationMessage!;
      return content(
        'location',
        formatLocation({
          latitude: l.degreesLatitude,
          longitude: l.degreesLongitude,
          caption: l.caption,
          live: true,
        }),
        fwd,
      );
    }
    case 'contactMessage':
      return content(
        'contact',
        formatContacts([
          {
            displayName: c.contactMessage?.displayName,
            vcard: c.contactMessage?.vcard,
          },
        ]),
        fwd,
      );
    case 'contactsArrayMessage':
      return content(
        'contact',
        formatContacts(
          (c.contactsArrayMessage?.contacts ?? []).map((x) => ({
            displayName: x.displayName,
            vcard: x.vcard,
          })),
        ) ?? str(c.contactsArrayMessage?.displayName),
        fwd,
      );
    case 'eventMessage':
      return content(
        'event',
        formatEvent(c.eventMessage?.name, c.eventMessage?.description),
        fwd,
      );
    case 'pollUpdateMessage':
      // Voto cifrado (a rc14 não decifra no processMessage — process-message.js:576-622 comentado).
      return fromMe ? ignore(ctype) : content('poll_vote', null, fwd);
    case 'groupInviteMessage':
      return content(
        'group_invite',
        join([c.groupInviteMessage?.groupName, c.groupInviteMessage?.caption]),
        fwd,
      );
    // Respostas de botão/lista/fluxo = o que o contato tocou → texto.
    case 'buttonsResponseMessage':
      return content(
        'text',
        str(c.buttonsResponseMessage?.selectedDisplayText) ??
          str(c.buttonsResponseMessage?.selectedButtonId),
        fwd,
      );
    case 'templateButtonReplyMessage':
      return content(
        'text',
        str(c.templateButtonReplyMessage?.selectedDisplayText) ??
          str(c.templateButtonReplyMessage?.selectedId),
        fwd,
      );
    case 'listResponseMessage':
      return content(
        'text',
        join([
          c.listResponseMessage?.title,
          c.listResponseMessage?.description,
        ]) ?? str(c.listResponseMessage?.singleSelectReply?.selectedRowId),
        fwd,
      );
    case 'interactiveResponseMessage':
      return content(
        'text',
        str(c.interactiveResponseMessage?.body?.text) ??
          str(c.interactiveResponseMessage?.nativeFlowResponseMessage?.name),
        fwd,
      );
    // Mensagens de empresa (lista/interativa/modelo) → o texto que aparece no balão.
    case 'listMessage':
      return textOrOther(
        join([c.listMessage?.title, c.listMessage?.description]),
        fwd,
      );
    case 'interactiveMessage':
      return textOrOther(
        join([
          c.interactiveMessage?.header?.title,
          c.interactiveMessage?.body?.text,
          c.interactiveMessage?.footer?.text,
        ]),
        fwd,
      );
    case 'templateMessage':
      return textOrOther(
        str(c.templateMessage?.interactiveMessageTemplate?.body?.text),
        fwd,
      );
    // Cartões que o gateway ainda não desenha: `other`, com o resumo legível quando houver.
    case 'productMessage':
      return content(
        'other',
        join([c.productMessage?.product?.title, c.productMessage?.body]),
        fwd,
      );
    case 'orderMessage':
      return content(
        'other',
        join([c.orderMessage?.orderTitle, c.orderMessage?.message]),
        fwd,
      );
    case 'requestPaymentMessage':
    case 'sendPaymentMessage': {
      const note = (
        ctype === 'requestPaymentMessage'
          ? c.requestPaymentMessage?.noteMessage
          : c.sendPaymentMessage?.noteMessage
      ) as proto.IMessage | null | undefined;
      return content(
        'other',
        str(note?.conversation) ?? str(note?.extendedTextMessage?.text),
        fwd,
      );
    }
    case 'scheduledCallCreationMessage':
      return content('other', str(c.scheduledCallCreationMessage?.title), fwd);
    case 'newsletterAdminInviteMessage':
      return content(
        'other',
        join([
          c.newsletterAdminInviteMessage?.newsletterName,
          c.newsletterAdminInviteMessage?.caption,
        ]),
        fwd,
      );
    case 'stickerPackMessage':
      return content('other', str(c.stickerPackMessage?.name), fwd);
    default:
      if (POLLS.has(ctype)) {
        const p = c[ctype] as proto.Message.IPollCreationMessage;
        return content(
          'poll',
          formatPoll(
            p?.name,
            (p?.options ?? []).map((o) => o.optionName),
          ),
          fwd,
        );
      }
      if (ctype.startsWith('pollResultSnapshotMessage')) {
        const p = c[ctype] as proto.Message.IPollResultSnapshotMessage;
        return content(
          'poll',
          join([
            p?.name,
            ...(p?.pollVotes ?? []).map(
              (v) =>
                `• ${v.optionName ?? ''}: ${toNum(v.optionVoteCount) ?? 0}`,
            ),
          ]),
          fwd,
        );
      }
      // Tipo visível que o gateway ainda não conhece: não some — `other` (o painel mostra o aviso).
      return content('other', null, fwd);
  }
}

function textOrOther(
  text: string | null,
  fwd: { isForwarded: boolean; forwardingScore: number | null },
): DescribedMessage {
  return content(text ? 'text' : 'other', text, fwd);
}
