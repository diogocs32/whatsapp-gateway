// P-068 (E24) — correlação do eco de um ENCAMINHAR no whatsapp-web.js 1.34.7.
//
// `Message.forward(chat)` chama a função nativa do WhatsApp Web (WAWebChatForwardMessage
// .forwardMessages — src/util/Injected/Utils.js:113-129) e devolve `Promise<void>`
// (src/structures/Message.js:498-508; index.d.ts:1342): o id da cópia só aparece no eco
// `message_create` fromMe. Sem correlação esse eco virava `source:'phone'` depois da janela de 3 s
// do onMessageCreate → handoff falso da IA, `isCold` perdido no reply-rate e linha sem a
// idempotencyKey. Antes de encaminhar, a engine registra aqui o eco ESPERADO (destino + tipo); o
// onMessageCreate casa o 1º fromMe compatível (FIFO) ANTES da espera de 3 s.
//
// Critério = chat de destino (as formas usadas no transporte: <num>@c.us/@g.us, o @lid do
// reroteio e o @lid que o cache LOCAL da sessão liga ao telefone — o getChat pode cair no chat @lid)
// + tipo + (texto) o MESMO texto da original. O texto evita que o eco de um `sendText` no mesmo chat,
// ainda sem id (chega antes de o sendMessage resolver), seja tomado como o do encaminhar enquanto
// uma expectativa sem eco segue viva (achado do teste da E24). NÃO exige `isForwarded`: encaminhar
// uma mensagem NOSSA não soma contador (o Baileys, "like WA does", dá contextInfo {} —
// Utils/messages.js:247-259) e o eco pode vir sem selo. Resíduo aceito: o dono mandar pelo celular,
// no MESMO chat, a mesma mídia/o mesmo texto dentro da janela — sairia como `api`.

export interface ForwardEchoMedia {
  mediaType: string | null;
  mimetype: string | null;
  fileName: string | null;
  fileSize: number | null;
  mediaKey: string | null; // objeto S3 da ORIGINAL (a mídia é a mesma — sem novo download)
}

export interface ForwardEcho {
  chatIds: Set<string>;
  pnJid: string; // chatJid canônico do eco (o destino como o gateway o grava)
  type: string; // describeWwebjsMessage(original).type
  // Só em texto: o eco tem de trazer o MESMO texto (null = não compara — mídia, local, contato).
  text: string | null;
  expiresAt: number; // epoch ms
  meta: { isCold: boolean; idempotencyKey: string | null };
  media: ForwardEchoMedia | null;
  // Preenchidos quando o eco casa.
  keyId: string | null;
  isForwarded: boolean;
  forwardingScore: number | null;
}

interface Pending {
  echo: ForwardEcho;
  resolve: (keyId: string | null) => void;
}

export class ForwardEchoRegistry {
  private pending: Pending[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  get size(): number {
    return this.pending.length;
  }

  // Registra o eco esperado. `wait(ms)` devolve o keyId do eco ou null se não chegou a tempo — a
  // expectativa continua viva até `expiresAt` (um eco tardio ainda sai como `api`). `cancel()`
  // só quando o encaminhar comprovadamente NÃO saiu (erro antes do WhatsApp Web).
  expect(
    input: Omit<
      ForwardEcho,
      'keyId' | 'isForwarded' | 'forwardingScore' | 'expiresAt'
    >,
    ttlMs: number,
  ): {
    echo: ForwardEcho;
    wait: (ms: number) => Promise<string | null>;
    cancel: () => void;
  } {
    this.sweep();
    const echo: ForwardEcho = {
      ...input,
      expiresAt: this.now() + ttlMs,
      keyId: null,
      isForwarded: false,
      forwardingScore: null,
    };
    let settle: (keyId: string | null) => void = () => undefined;
    const done = new Promise<string | null>((r) => (settle = r));
    const entry: Pending = { echo, resolve: (k) => settle(k) };
    this.pending.push(entry);
    return {
      echo,
      wait: (ms) =>
        new Promise<string | null>((resolve) => {
          const t = setTimeout(() => resolve(null), ms);
          void done.then((k) => {
            clearTimeout(t);
            resolve(k);
          });
        }),
      cancel: () => {
        this.pending = this.pending.filter((p) => p !== entry);
        settle(null);
      },
    };
  }

  // Casa (e consome) o eco esperado mais antigo para um dos `tos` (o `to` cru e o telefone do @lid,
  // quando conhecido) + tipo (+ texto). null = não é eco de encaminhar nosso (segue o caminho
  // normal: celular = `phone`).
  match(
    tos: string[],
    type: string,
    text: string | null,
    keyId: string,
    fwd: { isForwarded: boolean; forwardingScore: number | null },
  ): ForwardEcho | null {
    this.sweep();
    const i = this.pending.findIndex(
      (p) =>
        p.echo.type === type &&
        (p.echo.text == null || p.echo.text === text) &&
        tos.some((t) => p.echo.chatIds.has(t)),
    );
    if (i < 0) return null;
    const [hit] = this.pending.splice(i, 1);
    hit.echo.keyId = keyId;
    hit.echo.isForwarded = fwd.isForwarded;
    hit.echo.forwardingScore = fwd.forwardingScore;
    hit.resolve(keyId);
    return hit.echo;
  }

  private sweep(): void {
    const now = this.now();
    const alive: Pending[] = [];
    for (const p of this.pending) {
      if (p.echo.expiresAt > now) alive.push(p);
      else p.resolve(null);
    }
    this.pending = alive;
  }
}
