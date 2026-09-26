import { createCipheriv } from 'node:crypto';
import {
  Curve,
  downloadEncryptedContent,
  extractDeviceJids,
  getMediaKeys,
  WAJIDDomains,
} from '@whiskeysockets/baileys';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Executa a rc14 instalada pelo postinstall, sem mock da biblioteca, conta ou CDN.
describe('patch Baileys rc14 — assinatura e domínio de device', () => {
  it('aceita assinatura válida e rejeita assinatura de 64 bytes alterada', () => {
    const keyPair = Curve.generateKeyPair();
    const message = Buffer.from('e11: fixture de assinatura');
    const valid = Buffer.from(Curve.sign(keyPair.private, message));
    const invalid = Buffer.from(valid);
    invalid[0] ^= 0xff;

    expect(Curve.verify(keyPair.public, message, valid)).toBe(true);
    expect(Curve.verify(keyPair.public, message, invalid)).toBe(false);
    expect(
      Curve.verify(keyPair.public, Buffer.from('outra mensagem'), valid),
    ).toBe(false);
    expect(Curve.verify(keyPair.public, message, Buffer.alloc(63))).toBe(false);
  });

  it('não propaga o domínio hosted para o device seguinte', () => {
    const result = extractDeviceJids(
      [
        {
          id: '5511999999999@s.whatsapp.net',
          devices: {
            deviceList: [
              { id: 1, keyIndex: 1, isHosted: true },
              { id: 2, keyIndex: 1, isHosted: false },
            ],
          },
        },
      ] as never,
      '5511888888888@s.whatsapp.net',
      '',
      false,
    );

    expect(
      result.map(({ domainType, server }) => ({ domainType, server })),
    ).toEqual([
      { domainType: WAJIDDomains.HOSTED, server: 'hosted' },
      { domainType: WAJIDDomains.WHATSAPP, server: 's.whatsapp.net' },
    ]);
  });
});

describe('patch Baileys rc14 — stream cifrado sintético', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mediaKey = Buffer.alloc(32, 11);
  const url = 'https://mmg.whatsapp.net/e11-fixture';

  it('decifra a resposta íntegra', async () => {
    const { cipherKey, iv } = await getMediaKeys(mediaKey, 'image');
    const plain = Buffer.from('conteudo sintetico e11');
    const cipher = createCipheriv('aes-256-cbc', cipherKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(encrypted)),
    );

    const stream = await downloadEncryptedContent(url, { cipherKey, iv });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));

    expect(Buffer.concat(chunks)).toEqual(plain);
  });

  it('propaga erro do corpo HTTP após os headers ao consumidor', async () => {
    const { cipherKey, iv } = await getMediaKeys(mediaKey, 'image');
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(value) {
                controller = value;
                value.enqueue(Buffer.alloc(16));
              },
            }),
          ),
      ),
    );

    const stream = await downloadEncryptedContent(url, { cipherKey, iv });
    const consume = async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    };
    const pending = consume();
    controller?.error(new Error('fixture: conexão encerrada'));

    await expect(pending).rejects.toThrow('fixture: conexão encerrada');
  });

  it('encerra a fonte quando o consumidor cancela o stream', async () => {
    const { cipherKey, iv } = await getMediaKeys(mediaKey, 'image');
    const cancel = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              cancel,
            }),
          ),
      ),
    );

    const stream = await downloadEncryptedContent(url, { cipherKey, iv });
    stream.destroy();

    await vi.waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
  });
});
