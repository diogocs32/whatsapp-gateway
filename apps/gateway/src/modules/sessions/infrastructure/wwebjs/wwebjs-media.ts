import type { Readable } from 'node:stream';

// Uma fila por engine/sessão. O trabalho permanece na fila mesmo quando o chamador desiste de
// esperar: uma chamada CDP atrasada não pode abrir uma segunda operação de mídia em paralelo.
export class SessionMediaQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;

  constructor(private readonly maxPending = 32) {}

  run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.pending >= this.maxPending) {
      return Promise.reject(new Error('Fila de mídia wwebjs cheia'));
    }
    this.pending += 1;
    const work = this.tail.then(() => {
      if (signal?.aborted) throw new Error('Mídia expirada na fila wwebjs');
      return task();
    });
    this.tail = work.then(
      () => undefined,
      () => undefined,
    );
    void work
      .finally(() => {
        this.pending -= 1;
      })
      .catch(() => undefined);
    return work;
  }
}

export class MediaDeadlineError extends Error {
  constructor(ms: number) {
    super(`Operação de mídia wwebjs sem confirmação após ${ms} ms`);
  }
}

export async function collectMediaStream(
  stream: Readable,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) throw new Error('Mídia excedeu teto de download');
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, size);
  } catch (err) {
    stream.destroy();
    throw err;
  }
}

export async function mediaDeadline<T>(
  work: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new MediaDeadlineError(ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
