// Helpers de JID do painel (E23) — antes duplicados em Inbox.tsx e Atendimento.tsx. Puros (sem
// React/DOM) → testáveis em vitest `environment: 'node'`.

// Sufixo de aparelho (`5511999:12@s.whatsapp.net`) fora — mesmo recorte do `stripDevice` do gateway
// (apps/gateway/src/modules/messaging/application/reaction-key.ts).
export function stripDevice(jid: string): string {
  return jid.replace(/:\d+(?=@)/, '');
}

// Parte antes do @, sem o sufixo de aparelho: o número exibível (ou o id do lid/grupo).
export function numberFromJid(jid: string): string {
  const user = jid.split('@')[0] || jid;
  return user.replace(/:\d+$/, '');
}

export const isPhoneJid = (jid: string): boolean =>
  jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us');
export const isGroupJid = (jid: string): boolean => jid.endsWith('@g.us');
export const isLidJid = (jid: string): boolean => jid.endsWith('@lid');

// Para enviar, o gateway aceita o número quando o JID é de telefone; lid/grupo vão como vieram.
export function sendTarget(chatJid: string): string {
  return isPhoneJid(chatJid) ? numberFromJid(chatJid) : chatJid;
}

// Nome da conversa: o do contato ou o número.
export function displayName(c: {
  name: string | null;
  chatJid: string;
}): string {
  return c.name?.trim() || numberFromJid(c.chatJid);
}

// Fora da caixa única (mesma lista do gateway: inbox.controller.ts / prisma-inbox.repository.ts).
const TRIAGE_EXCLUDED = ['@g.us', '@broadcast', '@newsletter'];
export function isTriageExcludedChat(jid: string): boolean {
  return TRIAGE_EXCLUDED.some((s) => jid.endsWith(s));
}

// Número de telefone legível: `5511988887777` → `+55 11 98888-7777` (Brasil); outros países ficam
// com `+` e os dígitos. Só para JID de TELEFONE — dígitos de @lid NÃO são telefone.
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  const br = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  if (br) return `+55 ${br[1]} ${br[2]}-${br[3]}`;
  return d ? `+${d}` : digits;
}

// P-074 (E23) — rótulo "Fulano" no topo do balão de GRUPO. Só em mensagem RECEBIDA de grupo.
// Linha antiga (senderJid = jid do grupo, gravada antes da correção) ou sem remetente → null (sem
// rótulo, em vez de mostrar o id do grupo). Prioridade: nome (agenda > pushName, `senderName` do
// GET /messages) → telefone formatado → "Participante" para @lid (os dígitos do LID não são
// telefone e não devem aparecer como se fossem).
export function groupSenderLabel(m: {
  chatJid: string;
  senderJid: string | null;
  senderName?: string | null;
  fromMe: boolean;
}): { text: string; key: string } | null {
  if (m.fromMe || !isGroupJid(m.chatJid) || !m.senderJid) return null;
  const s = stripDevice(m.senderJid);
  if (s === m.chatJid || isGroupJid(s)) return null;
  const name = m.senderName?.trim();
  if (name) return { text: name, key: s };
  if (isPhoneJid(s)) return { text: formatPhone(numberFromJid(s)), key: s };
  return { text: 'Participante', key: s };
}

// Cor estável por participante (8 tons "300" do Tailwind, contraste ≥ 7:1 sobre zinc-800).
const SENDER_COLORS = [
  'text-sky-300',
  'text-amber-300',
  'text-violet-300',
  'text-rose-300',
  'text-lime-300',
  'text-cyan-300',
  'text-orange-300',
  'text-fuchsia-300',
] as const;

export function senderColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}
