// JIDs candidatos para uma conversa. Cobre (a) as duas formas do 9º dígito BR (§23.11) — o
// WhatsApp pode armazenar com ou sem o 9 — e (b) os dois sufixos de servidor: `@s.whatsapp.net`
// (engine Baileys) e `@c.us` (engine whatsapp-web.js / WWEBJS). Sem o `@c.us`, o inbox de uma
// sessão WWEBJS aparece vazio (as mensagens são persistidas com `<num>@c.us`). Com `@`, o jid vai
// como veio (GET /messages e /search). Movida do controller na E24 (o encaminhar também usa).
export function candidateJids(chatId: string): string[] {
  if (chatId.includes('@')) return [chatId];
  const digits = chatId.replace(/[^0-9]/g, '');
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
  const jids = new Set<string>();
  for (const n of numbers) {
    jids.add(`${n}@s.whatsapp.net`);
    jids.add(`${n}@c.us`);
  }
  return [...jids];
}
