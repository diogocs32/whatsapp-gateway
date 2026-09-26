// Encaminhar no painel (E25 · P-068 parte interface) — regras PURAS do fluxo "⌄ → Encaminhar →
// seleção → Encaminhar mensagem para → ➤": o que pode ser encaminhado, quais conversas viram destino,
// busca, limites, a chave de idempotência por clique e a leitura de `results[]`/erros em linguagem
// de operador. Nada de React/DOM → vitest `environment: 'node'`. Só `import type` do contrato.
//
// Fonte das regras: o gateway (apps/gateway/src/modules/messaging/application/forward.decision.ts e
// sessions/application/engine.port.ts — INTEGRACAO §2 "Encaminhar", D-030). O spec confere as cópias
// daqui contra os arquivos reais (mudou lá → o teste quebra aqui).
import type { ConversationDto, ForwardResultDto, MessageDto } from '@contracts';
import { displayName, formatPhone, stripDevice } from './jid';
import { FREQUENTLY_FORWARDED_MIN, bubbleContent } from './message-format';

// Limites do dono (D-030): até 5 conversas por encaminhamento; só 1 quando a ORIGINAL já é
// "encaminhada com frequência" (forwardingScore ≥ 5).
export const MAX_FORWARD_TARGETS = 5;

// Tipos GRAVADOS que o gateway encaminha (FORWARDABLE_TYPES do forward.decision.ts). Fora: enquete,
// evento, convite de grupo, voto e `other` — o gateway responde 400 FORWARD_UNSUPPORTED.
export const FORWARDABLE_TYPES: readonly string[] = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contact',
];

type Forwardable = Pick<MessageDto, 'type' | 'text'> &
  Partial<Pick<MessageDto, 'mediaType'>>;

// A ação "Encaminhar" aparece? Pelo `type` gravado (a regra do gateway) E pelo que o balão desenha:
// um `text` sem texto ou com a miniatura legada do wwebjs vira "Mensagem não suportada" — sem ação.
// Apagada/editada/visualização única/original indisponível não vêm no DTO: o gateway recusa com 400
// e o painel explica (forwardFailure).
export function canForward(m: Forwardable): boolean {
  if (!FORWARDABLE_TYPES.includes(m.type)) return false;
  return bubbleContent(m).kind !== 'unsupported';
}

// Atalho ↪ "Encaminhar mídia" ao lado do balão. No WhatsApp Web (`canQuickForwardMsg`, lido no código
// do web.whatsapp.com em 26/09) ele aparece em foto, vídeo, documento, arquivo de áudio, localização
// e contato — nunca em mensagem de voz, figurinha nem "encaminhada com frequência". O banco não
// distingue voz de arquivo de áudio, e quase todo áudio do WhatsApp é voz: áudio fica sem atalho
// (o menu ⌄ continua encaminhando).
const QUICK_KINDS: ReadonlySet<string> = new Set([
  'image',
  'video',
  'document',
  'location',
  'contact',
]);

export function canQuickForward(
  m: Forwardable & { forwardingScore?: number | null },
): boolean {
  if (!canForward(m) || maxTargetsFor(m) === 1) return false;
  const c = bubbleContent(m);
  return c.kind === 'media'
    ? QUICK_KINDS.has(c.mediaType)
    : QUICK_KINDS.has(c.kind);
}

// Quantas conversas este encaminhamento aceita.
export function maxTargetsFor(m: { forwardingScore?: number | null }): number {
  return (m.forwardingScore ?? 0) >= FREQUENTLY_FORWARDED_MIN
    ? 1
    : MAX_FORWARD_TARGETS;
}

// Mensagem que já veio encaminhada: até 5 conversas, "incluindo apenas um grupo" (FAQ oficial
// faq.whatsapp.com/887468535575482, pt_BR, web — acessada em 26/09/2026; o WhatsApp Web aplica o
// mesmo). O gateway (E24) não tem essa regra — o painel segue o WhatsApp; a API fica na P-085.
export function maxGroupsFor(m: {
  isForwarded?: boolean | null;
  forwardingScore?: number | null;
}): number {
  return m.isForwarded || (m.forwardingScore ?? 0) > 0
    ? 1
    : MAX_FORWARD_TARGETS;
}

// A cópia vai sair "encaminhada com frequência"? Mensagem de terceiro soma 1 ao contador ao ser
// encaminhada (a nossa, não — D-030); chegando a 5, o WhatsApp Web avisa antes de enviar.
export function willBecomeFrequent(m: {
  fromMe: boolean;
  forwardingScore?: number | null;
}): boolean {
  const score = m.forwardingScore ?? 0;
  return (
    !m.fromMe &&
    score < FREQUENTLY_FORWARDED_MIN &&
    score + 1 >= FREQUENTLY_FORWARDED_MIN
  );
}

// --- Destinos: conversas da MESMA sessão (contatos e grupos — decisão do dono na E25).

export type TargetKind = 'phone' | 'group' | 'lid';

export interface ForwardTarget {
  jid: string; // o que vai em `to` (o chatJid sem o sufixo de aparelho)
  key: string; // identidade canônica — a mesma do gateway (dígitos, jid do grupo, jid @lid)
  candidates: string[]; // grafias do MESMO destino (9º dígito × sufixos) — só para barrar repetidos
  kind: TargetKind;
  name: string;
  detail: string | null; // telefone formatado (quando há nome) ou "Grupo"
  imgUrl: string | null;
  folded: string; // nome + número dobrados para a busca
  digits: string; // dígitos do telefone (vazio em grupo/@lid — dígitos de LID não são telefone)
}

// Espelho do `canonicalDestination` do gateway (só as grafias que chegam como chatJid). null =
// destino que o gateway recusa (canal @newsletter, lista/status @broadcast, bots, contas hospedadas…).
export function destinationOf(
  jid: string,
): { kind: TargetKind; key: string; candidates: string[] } | null {
  const t = jid.trim();
  const at = t.lastIndexOf('@');
  if (at < 0) return null;
  const user = t.slice(0, at).split(':')[0];
  const server = t.slice(at + 1).toLowerCase();
  if (server === 's.whatsapp.net' || server === 'c.us') {
    if (!/^\d{10,15}$/.test(user)) return null;
    return { kind: 'phone', key: user, candidates: phoneCandidates(user) };
  }
  if (server === 'g.us') {
    if (!/^\d+(-\d+)?$/.test(user)) return null;
    const g = `${user}@g.us`;
    return { kind: 'group', key: g, candidates: [g] };
  }
  if (server === 'lid') {
    if (!/^\d+$/.test(user)) return null;
    const l = `${user}@lid`;
    return { kind: 'lid', key: l, candidates: [l] };
  }
  return null;
}

// Espelho do `candidateJids` do gateway (chat-jids.ts): o número com e sem o 9º dígito (Brasil) nos
// dois sufixos. O gateway recusa (400) dois destinos que se cruzam aqui — o painel nem deixa marcar.
export function phoneCandidates(digits: string): string[] {
  const numbers = new Set<string>([digits]);
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num.length === 9 && num.startsWith('9')) {
      numbers.add(`55${ddd}${num.slice(1)}`);
    } else if (num.length === 8) {
      numbers.add(`55${ddd}9${num}`);
    }
  }
  const jids: string[] = [];
  for (const n of numbers) jids.push(`${n}@s.whatsapp.net`, `${n}@c.us`);
  return jids;
}

// Mesmo destino para o gateway (mesma chave ou o "gêmeo" do 9º dígito)?
export function sameDestination(
  a: Pick<ForwardTarget, 'key' | 'candidates'>,
  b: Pick<ForwardTarget, 'key' | 'candidates'>,
): boolean {
  return a.key === b.key || a.candidates.some((c) => b.candidates.includes(c));
}

// Busca sem acento e sem caixa ("joao" acha "João").
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// Conversas → destinos, na ordem recebida (a mais recente primeiro, como "Conversas recentes").
// Descarta o que o gateway recusaria e a mesma conversa repetida (mesma chave).
export function forwardTargets(convs: ConversationDto[]): ForwardTarget[] {
  const out: ForwardTarget[] = [];
  const seen = new Set<string>();
  for (const c of convs) {
    const jid = stripDevice(c.chatJid.trim());
    const dest = destinationOf(jid);
    if (!dest || seen.has(dest.key)) continue;
    seen.add(dest.key);
    const name = displayName({ name: c.name, chatJid: jid });
    const hasName = !!c.name?.trim();
    const phone = dest.kind === 'phone' ? formatPhone(dest.key) : null;
    out.push({
      jid,
      key: dest.key,
      candidates: dest.candidates,
      kind: dest.kind,
      name: dest.kind === 'phone' && !hasName ? phone! : name,
      detail: dest.kind === 'group' ? 'Grupo' : hasName && phone ? phone : null,
      imgUrl: c.imgUrl,
      folded: foldText(
        [name, phone ?? '', dest.kind === 'phone' ? dest.key : ''].join(' '),
      ),
      digits: dest.kind === 'phone' ? dest.key : '',
    });
  }
  return out;
}

// Filtro da caixa "Pesquisar nome ou número". Consulta só com dígitos/separadores → procura no
// número (sem formatação); senão, no nome/número dobrados.
export function searchTargets(
  targets: ForwardTarget[],
  query: string,
): ForwardTarget[] {
  const q = foldText(query);
  if (!q) return targets;
  const numeric = /^[\d\s()+\-.]+$/.test(q);
  const digits = q.replace(/\D/g, '');
  return targets.filter((t) =>
    // Consulta só com dígitos também procura no nome ("Turma 2024" acha o grupo, como no WhatsApp).
    numeric && digits
      ? t.digits.includes(digits) || t.folded.includes(q)
      : t.folded.includes(q),
  );
}

// --- Seleção dos destinos (por `key`, na ordem em que o operador marcou).

export type ToggleRefusal =
  | { reason: 'limit'; max: number }
  | { reason: 'groups' }
  | { reason: 'duplicate'; other: ForwardTarget };

export function toggleTarget(
  selected: ForwardTarget[],
  target: ForwardTarget,
  max: number,
  maxGroups: number = max,
): { selected: ForwardTarget[]; refused: ToggleRefusal | null } {
  if (selected.some((s) => s.key === target.key)) {
    return {
      selected: selected.filter((s) => s.key !== target.key),
      refused: null,
    };
  }
  const twin = selected.find((s) => sameDestination(s, target));
  if (twin) return { selected, refused: { reason: 'duplicate', other: twin } };
  if (selected.length >= max) {
    return { selected, refused: { reason: 'limit', max } };
  }
  if (
    target.kind === 'group' &&
    selected.filter((s) => s.kind === 'group').length >= maxGroups
  ) {
    return { selected, refused: { reason: 'groups' } };
  }
  return { selected: [...selected, target], refused: null };
}

// Textos do WhatsApp Web (pt_BR, lidos no código do web.whatsapp.com em 26/09/2026); o do gêmeo do 9º
// dígito é nosso (o WhatsApp não tem esse caso).
export const FREQUENT_LIMIT_TEXT =
  'As mensagens encaminhadas com frequência podem ser compartilhadas com apenas 1 conversa por vez.';

export function refusalText(r: ToggleRefusal): string {
  if (r.reason === 'duplicate') {
    return `${r.other.name} já está marcado — é o mesmo número (com e sem o 9º dígito).`;
  }
  if (r.reason === 'groups') {
    return 'Você pode enviar mensagens encaminhadas para apenas uma conversa em grupo por vez.';
  }
  return r.max === 1
    ? FREQUENT_LIMIT_TEXT
    : `Você só pode compartilhar com até ${r.max} conversas.`;
}

// --- Idempotência: uma chave por clique no ➤. Tentar de novo o MESMO pedido (mesma mensagem, mesmo
// conjunto de destinos) reaproveita a chave → o gateway não reenvia o que já saiu (replay) e retoma
// só o que falhou. Conjunto diferente → chave nova (a mesma chave com outro conjunto daria 409).

export interface ForwardAttempt {
  key: string;
  msgId: string;
  to: string[]; // jids, na ordem de `results[]`
  keys: string[]; // chaves canônicas, para comparar conjuntos
}

export function planAttempt(
  prev: ForwardAttempt | null,
  msgId: string,
  targets: ForwardTarget[],
  newKey: () => string,
): ForwardAttempt {
  const keys = targets.map((t) => t.key);
  const same =
    !!prev &&
    prev.msgId === msgId &&
    prev.keys.length === keys.length &&
    [...prev.keys].sort().join('\n') === [...keys].sort().join('\n');
  return {
    key: same ? prev!.key : newKey(),
    msgId,
    to: targets.map((t) => t.jid),
    keys,
  };
}

export const newForwardKey = (): string => `painel-fwd-${crypto.randomUUID()}`;

// --- Resultado por destino (results[] na ordem de `to`).

export type OutcomeKind =
  'sent' | 'already' | 'unconfirmed' | 'unknown' | 'failed';

export interface TargetOutcome {
  kind: OutcomeKind;
  text: string;
  // Saiu, já tinha saído, saiu sem confirmação ou PODE ter saído (tempo esgotado): o destino fica
  // travado no diálogo — nunca entra noutro pedido (duplicaria).
  locked: boolean;
  // Vale tentar de novo sem mudar nada (409 em andamento, falha de envio). 423/recusas: não.
  retry: boolean;
}

// O gateway (60 s por destino) e o wwebjs (30 s no forward) avisam assim quando o envio não
// respondeu a tempo — a cópia pode ter saído (forward.service.ts / wwebjs.engine.ts, E24).
const MAYBE_SENT_RE = /confira no celular antes de tentar de novo/i;

const PHONE_HINT = 'encaminhe pelo celular.';

export function outcomeOf(r: ForwardResultDto): TargetOutcome {
  if (r.ok && r.deduped) {
    return {
      kind: 'already',
      text: 'Já tinha sido encaminhada — não foi enviada de novo.',
      locked: true,
      retry: false,
    };
  }
  if (r.ok && r.confirmed === false) {
    return {
      kind: 'unconfirmed',
      text: 'Encaminhada, confirmação pendente — não reenvie; confira no celular.',
      locked: true,
      retry: false,
    };
  }
  if (r.ok) {
    return { kind: 'sent', text: 'Encaminhada', locked: true, retry: false };
  }
  const error = r.error?.trim() || null;
  if (error && MAYBE_SENT_RE.test(error)) {
    return {
      kind: 'unknown',
      text: 'Pode ter saído (o envio não respondeu a tempo) — confira no celular; não reenvie por aqui.',
      locked: true,
      retry: false,
    };
  }
  if (r.status === 423) {
    return {
      kind: 'failed',
      text: r.cold
        ? 'Nada enviado: nunca recebeu mensagem desse contato/grupo (conta como 1º contato) e o guard-rail bloqueou o aparelho.'
        : 'Nada enviado: o guard-rail bloqueou o encaminhamento inteiro (há destino de 1º contato).',
      locked: false,
      retry: false,
    };
  }
  if (r.status === 409) {
    // Conflito de chave num destino (outro conteúdo com a mesma chave derivada): nada saiu por ele.
    if (KEY_CONFLICT_RE.test(error ?? '')) {
      return {
        kind: 'failed',
        text: 'Não enviada: conflito com um encaminhamento anterior — encaminhe de novo num pedido novo.',
        locked: false,
        retry: false,
      };
    }
    // "Em andamento": a intenção desse destino está pendente (outro pedido/processo enviando agora) —
    // pode sair a qualquer momento. Travado como "pode ter saído": repetir, mesmo com a mesma chave,
    // retomaria outros destinos que estouraram o tempo (takeover no gateway) — nunca pelo painel.
    return {
      kind: 'unknown',
      text: 'Ainda em andamento no servidor — pode sair a qualquer momento; confira no celular antes de encaminhar de novo.',
      locked: true,
      retry: false,
    };
  }
  if (
    r.code === 'FORWARD_UNSUPPORTED' ||
    r.code === 'FORWARD_SOURCE_UNAVAILABLE'
  ) {
    // Recusa da MENSAGEM (vale para todo destino): a linha diz o motivo curto; o texto inteiro do
    // gateway vai uma vez só, na faixa do diálogo (forwardFailure).
    const reason =
      r.code === 'FORWARD_SOURCE_UNAVAILABLE'
        ? 'a original não está mais disponível'
        : (/\(([^()]+)\)\.?$/.exec(error ?? '')?.[1] ?? 'mensagem sem suporte');
    return {
      kind: 'failed',
      text: `Não enviada — ${reason}; ${PHONE_HINT}`,
      locked: false,
      retry: false,
    };
  }
  if (r.code === 'FORWARD_LIMIT') {
    return {
      kind: 'failed',
      text: FREQUENT_LIMIT_TEXT,
      locked: false,
      retry: false,
    };
  }
  return {
    kind: 'failed',
    text: `Não enviada: ${error ?? `erro ${r.status ?? 400}`}`,
    locked: false,
    retry: true,
  };
}

// Junta o resultado de um pedido ao que o diálogo já sabia. `results[]` vem na ordem de `to`; o
// `target` confirma a posição (o gateway devolve o destino exatamente como foi pedido).
export function mergeOutcomes(
  prev: ReadonlyMap<string, TargetOutcome>,
  results: ForwardResultDto[],
  att: ForwardAttempt,
): Map<string, TargetOutcome> {
  const next = new Map(prev);
  results.forEach((r, i) => {
    const idx = att.to.indexOf(r.target);
    const key = att.keys[idx >= 0 ? idx : i];
    if (key) next.set(key, outcomeOf(r));
  });
  return next;
}

// Todas as conversas marcadas receberam sem pendência (enviada ou repetição)? Então o diálogo fecha
// e a conversa mostra o aviso — como o WhatsApp Web, que volta para o chat.
export function allClean(
  keys: string[],
  outcomes: ReadonlyMap<string, TargetOutcome>,
): boolean {
  return (
    keys.length > 0 &&
    keys.every((k) => {
      const o = outcomes.get(k);
      return o?.kind === 'sent' || o?.kind === 'already';
    })
  );
}

function withPeriod(s: string): string {
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

// Resumo do pedido para a faixa do diálogo.
export function attemptSummary(results: ForwardResultDto[]): {
  tone: 'ok' | 'partial' | 'error';
  text: string;
} {
  return summarizeOutcomes(results.map(outcomeOf));
}

// Resumo de TODAS as conversas marcadas (o que o diálogo sabe de todos os pedidos): depois de um
// reenvio parcial, "nenhuma recebeu" seria falso para quem recebeu no pedido anterior.
export function summarizeOutcomes(outs: TargetOutcome[]): {
  tone: 'ok' | 'partial' | 'error';
  text: string;
} {
  const count = (...kinds: OutcomeKind[]) =>
    outs.filter((o) => kinds.includes(o.kind)).length;
  const sent = count('sent', 'already');
  const unconfirmed = count('unconfirmed');
  const unknown = count('unknown');
  const failed = count('failed');
  const convs = (n: number) => `${n} conversa${n === 1 ? '' : 's'}`;
  if (!unconfirmed && !unknown && !failed) {
    return { tone: 'ok', text: `Encaminhada para ${convs(sent)}.` };
  }
  if (!sent && !unconfirmed && !unknown) {
    return {
      tone: 'error',
      text:
        failed === 1
          ? 'Não foi encaminhada para essa conversa.'
          : `Não foi encaminhada para nenhuma das ${convs(failed)}.`,
    };
  }
  const parts: string[] = [];
  if (sent) parts.push(`encaminhada para ${convs(sent)}`);
  if (unconfirmed)
    parts.push(`${convs(unconfirmed)} sem confirmação do WhatsApp`);
  if (unknown)
    parts.push(`${convs(unknown)} sem desfecho confirmado (pode ter saído)`);
  if (failed)
    parts.push(
      `${convs(failed)} não ${failed === 1 ? 'recebeu' : 'receberam'}`,
    );
  const text = parts.join('; ');
  return {
    tone: 'partial',
    text: `${text.charAt(0).toUpperCase()}${text.slice(1)} — veja abaixo.${
      unconfirmed || unknown
        ? ' Confira no celular antes de encaminhar de novo.'
        : ''
    }`,
  };
}

// --- Erro do pedido inteiro (ApiError do lib/api.ts, ou falha de rede sem status).

export interface ForwardErrorLike {
  status?: number;
  code?: string;
  message?: string;
  body?: unknown;
}

// `results[]` do corpo de erro (423 e o 400/409 em que nenhum destino recebeu). Validado — o corpo
// vem da rede.
export function resultsFromError(
  err: ForwardErrorLike | null | undefined,
): ForwardResultDto[] | null {
  const body = err?.body as { results?: unknown } | null | undefined;
  const list = body && typeof body === 'object' ? body.results : undefined;
  if (!Array.isArray(list)) return null;
  const ok = list.every(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof (r as ForwardResultDto).target === 'string' &&
      typeof (r as ForwardResultDto).ok === 'boolean',
  );
  return ok ? (list as ForwardResultDto[]) : null;
}

export interface ForwardFailure {
  text: string;
  results: ForwardResultDto[] | null;
  // A MENSAGEM não pode ser encaminhada pelo painel (apagada, tipo, original indisponível, sumiu do
  // servidor): nenhum destino muda isso — o ➤ trava.
  final?: boolean;
  // "Encaminhada com frequência" pelo contador vivo: só 1 conversa por vez.
  limitOne?: boolean;
  // Desfecho INCERTO sem `results[]` (sem resposta, 5xx, 409 "em andamento" do pedido): parte pode
  // ter saído. O pedido fica congelado — o único próximo passo é repeti-lo igual (mesma chave, mesmo
  // conjunto; o gateway faz replay do que saiu). Mudar os destinos geraria chave nova e reenviaria
  // para quem já recebeu. Com `results[]` cada destino já tem desfecho (quem pode ter saído trava).
  uncertain?: boolean;
  // Tentar de novo o MESMO pedido faz sentido (rede, 409 em andamento, 429, 5xx). Recusas (400 com
  // code, 404, 423) só mudam mudando o pedido — ou pelo celular.
  retry: boolean;
  // A chave do pedido ficou presa a OUTRO conteúdo (409 de conflito — send-intent.service.ts): nada
  // deste pedido saiu; o próximo clique precisa de chave nova (a mesma daria 409 para sempre).
  resetKey?: boolean;
  // O texto é só o resumo destino a destino deste pedido — quem tem o histórico do diálogo (pedidos
  // anteriores) deve resumir tudo (`summarizeOutcomes`).
  summary?: boolean;
}

const KEY_CONFLICT_RE = /outro destinat[aá]rio|use uma chave nova/i;

export function forwardFailure(
  err: ForwardErrorLike | null | undefined,
  deviceName: string,
): ForwardFailure {
  const status = err?.status;
  const code = err?.code;
  const msg = (err?.message ?? '').trim();
  const results = resultsFromError(err);
  if (!status) {
    return {
      text: 'Sem resposta do servidor — o encaminhamento pode ter saído em parte. Tente de novo o MESMO pedido: o que o servidor já confirmou não é reenviado; na dúvida, confira no celular antes.',
      results: null,
      retry: true,
      uncertain: true,
    };
  }
  if (status === 423) {
    const cold = (results ?? []).filter((r) => !r.ok && r.cold).length;
    const state = (err?.body as { state?: unknown } | null | undefined)?.state;
    return {
      text: `Nada foi enviado: o aparelho ${deviceName} está ${GUARD_STATE[String(state)] ?? 'bloqueado'} (guard-rail) e ${
        cold === 1
          ? '1 destino nunca mandou mensagem para este aparelho (conta como 1º contato)'
          : cold > 1
            ? `${cold} destinos nunca mandaram mensagem para este aparelho (contam como 1º contato)`
            : 'há destino de 1º contato (que nunca mandou mensagem para este aparelho)'
      }. Tire esse${cold > 1 ? 's destinos' : ' destino'} para encaminhar só a quem já conversa com você, ou encaminhe pelo celular.`,
      results,
      retry: false,
    };
  }
  if (
    status === 400 &&
    /sess[aã]o n[aã]o (iniciada|est[aá] conectada|conectada)/i.test(msg)
  ) {
    return {
      text: `Não encaminhada: o aparelho ${deviceName} não está conectado a este servidor.`,
      results,
      retry: false,
    };
  }
  if (code === 'FORWARD_UNSUPPORTED' || code === 'FORWARD_SOURCE_UNAVAILABLE') {
    const text = withPeriod(
      msg || 'Esta mensagem não pode ser encaminhada pelo painel',
    );
    return {
      // O texto do gateway às vezes já manda encaminhar pelo celular (original indisponível).
      text: /celular/i.test(text) ? text : `${text} Se precisar, ${PHONE_HINT}`,
      results,
      retry: false,
      final: true,
    };
  }
  if (code === 'FORWARD_LIMIT') {
    return { text: FREQUENT_LIMIT_TEXT, results, retry: false, limitOne: true };
  }
  if (status === 404) {
    return /mensagem n[aã]o encontrada/i.test(msg)
      ? {
          text: `A mensagem não está mais no servidor (pode ter saído pela retenção) — ${PHONE_HINT}`,
          results: null,
          retry: false,
          final: true,
        }
      : /^cannot (post|get)\b/i.test(msg)
        ? // Rota ausente: o painel novo subiu antes do gateway novo (deploy G fora de ordem, ou
          // rollback só do gateway). Nada saiu; não é recusa da MENSAGEM — depois do deploy do
          // gateway o mesmo pedido funciona (não trava o ➤ nem fica gravado como recusa).
          {
            text: 'Este servidor ainda não tem o encaminhar — publique a versão nova do gateway e tente de novo.',
            results: null,
            retry: true,
          }
        : /sess[aã]o n[aã]o encontrada/i.test(msg)
          ? {
              text: `O aparelho ${deviceName} não existe mais neste servidor.`,
              results: null,
              retry: false,
              final: true,
            }
          : {
              text: `Não encaminhada: ${msg || 'erro 404'}`,
              results: null,
              retry: false,
              final: true,
            };
  }
  if (status === 409 && !results && KEY_CONFLICT_RE.test(msg)) {
    return {
      text: 'Este pedido conflitou com um encaminhamento anterior — nada foi enviado. Toque em Enviar de novo (vai com um pedido novo).',
      results: null,
      retry: true,
      resetKey: true,
    };
  }
  // Daqui para baixo, com `results[]` a faixa resume destino a destino (quem pode ter saído aparece
  // como tal — nunca "Não encaminhada" por cima de um "pode ter saído").
  if (results) {
    return {
      text: attemptSummary(results).text,
      results,
      retry: resultsVerdict(results).retry,
      summary: true,
    };
  }
  if (status === 409) {
    return {
      text: 'Este encaminhamento ainda está em andamento — espere alguns segundos e tente de novo (o mesmo pedido não duplica).',
      results: null,
      retry: true,
      uncertain: true,
    };
  }
  if (status === 429) {
    // O rate-limit barra antes da rota: nada rodou.
    return {
      text: 'Muitas requisições agora — espere um minuto e tente de novo (não duplica).',
      results: null,
      retry: true,
    };
  }
  if (status >= 500) {
    return {
      text: `Erro no servidor (${status}) — o encaminhamento pode ter saído em parte. Tente de novo o MESMO pedido: o que o servidor já confirmou não é reenviado; na dúvida, confira no celular antes.`,
      results: null,
      retry: true,
      uncertain: true,
    };
  }
  return {
    text: `Não encaminhada: ${msg || `erro ${status}`}`,
    results: null,
    retry: false,
  };
}

// Palavra do estado do guard-rail no 423 (`state` do corpo — guardrail.service.ts).
const GUARD_STATE: Record<string, string> = {
  quarentena: 'em quarentena',
  banida: 'banido',
  pausa_manual: 'em pausa manual',
};

// O que um `results[]` (201 parcial ou corpo de erro) diz sobre o pedido inteiro: a mensagem foi
// recusada (nenhum destino muda isso), o limite de 1 conversa veio do contador vivo, ou vale tentar
// de novo o que falhou.
export function resultsVerdict(results: ForwardResultDto[]): {
  final: boolean;
  limitOne: boolean;
  retry: boolean;
} {
  const failed = results.filter((r) => !r.ok);
  return {
    final: failed.some(
      (r) =>
        r.code === 'FORWARD_UNSUPPORTED' ||
        r.code === 'FORWARD_SOURCE_UNAVAILABLE',
    ),
    limitOne: failed.some((r) => r.code === 'FORWARD_LIMIT'),
    retry: failed.some((r) => outcomeOf(r).retry),
  };
}

// Aviso na conversa depois de um encaminhamento sem pendências — o do WhatsApp Web ("Você encaminhou
// 1 item.", por 4 s) com o destino, que no painel importa (o operador cuida de vários aparelhos).
export function forwardedNotice(names: string[]): string {
  if (names.length === 0) return 'Você encaminhou 1 item.';
  if (names.length === 1) return `Você encaminhou 1 item para ${names[0]}.`;
  if (names.length === 2)
    return `Você encaminhou 1 item para ${names[0]} e ${names[1]}.`;
  return `Você encaminhou 1 item para ${names[0]} e mais ${names.length - 1} conversas.`;
}
