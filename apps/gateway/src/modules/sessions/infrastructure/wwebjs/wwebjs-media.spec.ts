import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { collectMediaStream, SessionMediaQueue } from './wwebjs-media';

describe('fila e stream de mídia WWEBJS (P-060)', () => {
  it('serializa operações e recusa fila cheia sem iniciar o terceiro download', async () => {
    const queue = new SessionMediaQueue(2);
    const order: string[] = [];
    let release!: () => void;
    const first = queue.run(async () => {
      order.push('primeiro');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const second = queue.run(async () => {
      order.push('segundo');
    });
    await expect(
      queue.run(async () => {
        order.push('terceiro');
      }),
    ).rejects.toThrow('cheia');
    await Promise.resolve();
    expect(order).toEqual(['primeiro']);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['primeiro', 'segundo']);
  });

  it('recompõe blocos e destrói stream que ultrapassa o teto real', async () => {
    await expect(
      collectMediaStream(
        Readable.from([Buffer.from('ab'), Buffer.from('cd')]),
        4,
      ),
    ).resolves.toEqual(Buffer.from('abcd'));
    const tooLarge = Readable.from([Buffer.from('abc'), Buffer.from('def')]);
    await expect(collectMediaStream(tooLarge, 5)).rejects.toThrow('teto');
    expect(tooLarge.destroyed).toBe(true);
  });
});
