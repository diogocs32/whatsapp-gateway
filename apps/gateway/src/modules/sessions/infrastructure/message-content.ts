// P-066 (etapa E22) — descrição de uma mensagem RECEBIDA (ou digitada no celular), comum às duas
// engines: o que é mensagem visível no WhatsApp Web e com que tipo/texto ela entra no gateway.
// Antes, tudo o que não era texto/mídia virava `type:'other', text:null` (Baileys) ou `text: body`
// (wwebjs) e o painel mostrava "…". Os formatadores daqui são os ÚNICOS que montam o texto legível
// de localização/contato/enquete/evento — as duas engines produzem exatamente o mesmo texto.
//
// Domínio de `type` (contrato: MessageDto.type / webhook `message`):
//   text | image | video | audio | document | sticker          (já existiam)
//   location | contact | poll | event | group_invite | poll_vote (E22; poll_vote só no Baileys)
//   other = mensagem visível sem cartão próprio no gateway (produto, pedido, pagamento…): `text`
//           traz um resumo legível quando houver, senão null
// Reação NÃO é mensagem: sai só como `message.reaction` (D-028).

export interface ContentMedia {
  mediaType: string; // image | video | audio | document | sticker
  mimetype: string | null;
  fileName: string | null;
  caption: string | null;
  fileSize: number | null;
}

export type DescribedMessage =
  | { kind: 'ignore'; reason: string }
  | {
      kind: 'content';
      type: string;
      text: string | null;
      media: ContentMedia | null;
      isForwarded: boolean;
      forwardingScore: number | null;
    };

export function ignore(reason: string): DescribedMessage {
  return { kind: 'ignore', reason };
}

export function content(
  type: string,
  text: string | null,
  fwd: { isForwarded: boolean; forwardingScore: number | null },
  media: ContentMedia | null = null,
): DescribedMessage {
  return {
    kind: 'content',
    type,
    text: clean(text),
    media,
    ...fwd,
  };
}

// Selo "Encaminhada": score só quando é encaminhada de fato (score > 0); senão null. O proto do
// Baileys é uint32 sem teto (127 → 128 ao encaminhar de novo); a coluna é `integer` — limita.
const INT_MAX = 2_147_483_647;
export function forwarding(
  isForwarded: unknown,
  score: unknown,
): { isForwarded: boolean; forwardingScore: number | null } {
  const n =
    typeof score === 'number' && Number.isFinite(score)
      ? Math.min(Math.max(score, 0), INT_MAX)
      : 0;
  const fwd = isForwarded === true || n > 0;
  return {
    isForwarded: fwd,
    forwardingScore: fwd && n > 0 ? Math.trunc(n) : null,
  };
}

// '' e só-espaços → null (o painel decide o rótulo pelo `type`).
export function clean(text: string | null | undefined): string | null {
  if (text == null) return null;
  return text.trim() ? text : null;
}

function coord(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Localização: "Nome — Endereço" (o que o WhatsApp mostra no cartão) + link do mapa com as
// coordenadas, para o painel/n8n abrirem. Sem coordenadas válidas, só o rótulo.
export function formatLocation(loc: {
  latitude?: unknown;
  longitude?: unknown;
  name?: string | null;
  address?: string | null;
  live?: boolean;
  caption?: string | null;
}): string | null {
  const lat = coord(loc.latitude);
  const lng = coord(loc.longitude);
  const label = [
    loc.live ? 'Localização em tempo real' : null,
    clean(loc.name),
    clean(loc.address),
    clean(loc.caption),
  ]
    .filter(Boolean)
    .join(' — ');
  const hasCoords = lat != null && lng != null && !(lat === 0 && lng === 0);
  const url = hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : null;
  return clean([label, url].filter(Boolean).join('\n'));
}

// vCard → "Nome — +55 11 99999-9999" (um contato por linha). Nome: o exibido pela engine; na falta,
// o FN do vCard. Telefones: as linhas TEL (valor depois do último ':').
export function formatContacts(
  cards: { displayName?: string | null; vcard?: string | null }[],
): string | null {
  const lines = cards.map((c) => {
    const vcard = c.vcard ?? '';
    const fn = /^FN(?:;[^:\r\n]*)?:(.*)$/im.exec(vcard)?.[1]?.trim();
    const name = clean(c.displayName)?.trim() || fn || null;
    const tels = [...vcard.matchAll(/^(?:item\d+\.)?TEL[^:\r\n]*:(.+)$/gim)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    return [name, ...tels].filter(Boolean).join(' — ');
  });
  return clean(lines.filter(Boolean).join('\n'));
}

// Enquete: pergunta + uma opção por linha ("• opção"), como no cartão do WhatsApp.
export function formatPoll(
  name: string | null | undefined,
  options: (string | null | undefined)[],
): string | null {
  const opts = options.map((o) => clean(o)).filter(Boolean) as string[];
  return clean(
    [clean(name), ...opts.map((o) => `• ${o}`)].filter(Boolean).join('\n'),
  );
}

// Evento: nome + descrição (o cartão do WhatsApp mostra os dois; data/local ficam para a P-069).
export function formatEvent(
  name: string | null | undefined,
  description?: string | null,
): string | null {
  return clean([clean(name), clean(description)].filter(Boolean).join('\n'));
}
