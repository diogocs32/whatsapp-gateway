import { candidateJids } from './chat-jids';
import { sendFingerprint } from './send-intent.decision';

// P-068 (etapa E24) — regras PURAS do encaminhar (testadas sem banco): destino canônico, limites,
// chaves de idempotência e o status HTTP do lote. O laço com efeito mora no ForwardService.

// Tipos GRAVADOS que dá para encaminhar (camada A — antes de reservar qualquer intenção, para um
// tipo proibido responder 400 e não 423). A engine confere de novo o tipo VIVO (camada B:
// visualização única, localização em tempo real, resposta de botão gravada como `text`…).
// Fora: enquete e evento (o `forward` do Baileys não leva o `<meta>` do stanza — a cópia não
// funcionaria como enquete/evento), convite de grupo, voto e `other` (produto, pedido, pagamento).
export const FORWARDABLE_TYPES: ReadonlySet<string> = new Set([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contact',
]);

const TYPE_LABEL: Record<string, string> = {
  poll: 'enquete',
  event: 'evento',
  group_invite: 'convite de grupo',
  poll_vote: 'voto em enquete',
  other: 'tipo sem cartão no gateway (produto, pedido, pagamento…)',
};

export function unsupportedTypeLabel(type: string): string {
  return Object.hasOwn(TYPE_LABEL, type) ? TYPE_LABEL[type] : `tipo ${type}`;
}

// Destino de um encaminhar. `key` = identidade canônica (repetidos, chave derivada e
// fingerprint); `transport` = o que vai para a engine (dígitos: cada engine põe o próprio sufixo —
// `@s.whatsapp.net` no Baileys, `@c.us` no wwebjs, o que mantém o fallback de LID do wwebjs);
// `candidates` = as grafias possíveis do MESMO pedido (9º dígito × sufixos) — só para barrar
// repetidos; `exact` = os jids do número EXATO (os dois sufixos) — onde se procura a conversa. O 9º
// dígito NÃO entra na procura da conversa: o "gêmeo" (11 9 4123-4567 × fixo 11 4123-4567) pode ser
// OUTRA pessoa — casar com a conversa dele trataria o destino como quente e mandaria para o número
// errado (achado da revisão da E24). Sem conversa no número exato = cold (conservador).
export interface ForwardDestination {
  input: string;
  kind: 'phone' | 'group' | 'lid';
  key: string;
  transport: string;
  candidates: string[];
  exact: string[];
}

// Canal (@newsletter), lista/status (@broadcast), bots da Meta e contas hospedadas usam outro
// caminho de envio no WhatsApp — fora do encaminhar.
export function canonicalDestination(
  raw: string,
): ForwardDestination | { error: string } {
  // `input` volta em results[i].target EXATAMENTE como veio em to[i]; o parse usa a forma aparada.
  const input = raw;
  const t = raw.trim();
  const at = t.lastIndexOf('@');
  if (at < 0) {
    const digits = t.replace(/[\s()+\-.]/g, '');
    if (!/^\d{10,15}$/.test(digits)) {
      return { error: 'número inválido (use DDI+DDD+número, 10 a 15 dígitos)' };
    }
    return phone(input, digits);
  }
  // "user[:aparelho]@servidor" — o aparelho não muda o destino (jidNormalizedUser da lib).
  const user = t.slice(0, at).split(':')[0];
  const server = t.slice(at + 1).toLowerCase();
  if (server === 's.whatsapp.net' || server === 'c.us') {
    if (!/^\d{10,15}$/.test(user)) return { error: 'número inválido no jid' };
    return phone(input, user);
  }
  if (server === 'g.us') {
    if (!/^\d+(-\d+)?$/.test(user)) return { error: 'jid de grupo inválido' };
    const jid = `${user}@g.us`;
    return {
      input,
      kind: 'group',
      key: jid,
      transport: jid,
      candidates: [jid],
      exact: [jid],
    };
  }
  if (server === 'lid') {
    if (!/^\d+$/.test(user)) return { error: 'jid @lid inválido' };
    const jid = `${user}@lid`;
    return {
      input,
      kind: 'lid',
      key: jid,
      transport: jid,
      candidates: [jid],
      exact: [jid],
    };
  }
  return { error: `destino não suportado no encaminhar (@${server})` };
}

function phone(input: string, digits: string): ForwardDestination {
  return {
    input,
    kind: 'phone',
    key: digits,
    transport: digits,
    candidates: candidateJids(digits),
    exact: [`${digits}@s.whatsapp.net`, `${digits}@c.us`],
  };
}

// Destinos repetidos no mesmo pedido (inclusive o mesmo número com e sem o 9º dígito): 400 — cada
// posição de `results[]` corresponde a uma de `to[]`, e a mesma chave derivada duas vezes faria o
// 2º eco sumir no unique de wa_messages. Devolve o par em conflito (entradas como vieram).
export function findDuplicate(
  dests: ForwardDestination[],
): [string, string] | null {
  for (let i = 0; i < dests.length; i++) {
    for (let j = i + 1; j < dests.length; j++) {
      const a = dests[i];
      const b = dests[j];
      if (
        a.key === b.key ||
        a.candidates.some((c) => b.candidates.includes(c))
      ) {
        return [a.input, b.input];
      }
    }
  }
  return null;
}

// Limite do dono: original já "encaminhada com frequência" (score ≥ 5) → 1 destino por vez.
export function exceedsFrequentLimit(
  score: number | null | undefined,
  targets: number,
  frequentMin: number,
): boolean {
  return (score ?? 0) >= frequentMin && targets > 1;
}

// idempotencyKey POR DESTINO (vai no eco/webhook): `<chave do cliente>:<destino canônico>`. O `:` é
// seguro — a chave de intenção nunca vira jobId de BullMQ (só `${env.id}-${webhook.id}` e os da
// campanha viram).
export function derivedKey(base: string, dest: ForwardDestination): string {
  return `${base}:${dest.key}`;
}

// Fingerprints PLANOS (o sendFingerprint filtra chaves em todos os níveis — objeto aninhado vira
// `{}`) e com o keyId já resolvido (nunca o `msgId` da URL, que pode ser o ULID ou o keyId).
// Lote: a mesma chave com outra original ou outro CONJUNTO de destinos → 409 (INTEGRACAO §2).
export function batchFingerprint(
  keyId: string,
  dests: ForwardDestination[],
): string {
  return sendFingerprint({
    kind: 'forward-batch',
    keyId,
    to: dests
      .map((d) => d.key)
      .sort()
      .join(','),
  });
}

export function destinationFingerprint(
  keyId: string,
  dest: ForwardDestination,
): string {
  return sendFingerprint({ kind: 'forward', keyId, to: dest.key });
}

// Status HTTP do lote: algum destino ok (enviado ou replay) → 201; nenhum → o status comum dos
// itens (todos 409 → 409; todos 400 → 400) ou 400 quando misturados.
export function batchStatus(
  items: Array<{ ok: boolean; status?: number }>,
): number {
  if (items.some((i) => i.ok)) return 201;
  const statuses = new Set(items.map((i) => i.status ?? 400));
  return statuses.size === 1 ? [...statuses][0] : 400;
}

// Intervalo entre dois envios efetivos do encaminhar (anti-ban, pedido do dono): 1–3 s.
export function forwardGapMs(random: number = Math.random()): number {
  return 1000 + Math.floor(random * 2001);
}
