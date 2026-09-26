import { describe, expect, it } from 'vitest';
import {
  MEMORY_KEY,
  MEMORY_MAX,
  MEMORY_TTL_MS,
  createForwardMemory,
  memoryKey,
  type ForwardSnapshot,
} from './forward-memory';

// Memória dos diálogos de encaminhar (E25): sobrevive a troca de conversa/tela, recarga e login
// expirado (por aba). Storage e relógio injetados.

function fakeStorage(initial?: string) {
  const data = new Map<string, string>(
    initial !== undefined ? [[MEMORY_KEY, initial]] : [],
  );
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const snap = (over: Partial<ForwardSnapshot> = {}): ForwardSnapshot => ({
  selected: [
    {
      jid: '5511988887777@s.whatsapp.net',
      key: '5511988887777',
      candidates: ['5511988887777@s.whatsapp.net'],
      kind: 'phone',
      name: 'Ana',
      detail: null,
      imgUrl: null,
      folded: 'ana',
      digits: '5511988887777',
    },
  ],
  outcomes: new Map([
    [
      '5511988887777',
      { kind: 'sent', text: 'Encaminhada', locked: true, retry: false },
    ],
  ]),
  attempt: {
    key: 'painel-fwd-1',
    msgId: 'm1',
    to: ['5511988887777@s.whatsapp.net'],
    keys: ['5511988887777'],
  },
  frozen: true,
  refused: false,
  maxLive: 5,
  canRetry: true,
  banner: { tone: 'error', text: 'Sem resposta do servidor' },
  ...over,
});

describe('forward-memory', () => {
  it('ida e volta pelo storage (outra instância = recarga da página), com o Map de desfechos', () => {
    const st = fakeStorage();
    const t = 1_000;
    const a = createForwardMemory(st, () => t);
    a.set(memoryKey('s1', 'm1'), snap());
    const b = createForwardMemory(st, () => t);
    const got = b.get('s1|m1')!;
    expect(got.frozen).toBe(true);
    expect(got.attempt?.key).toBe('painel-fwd-1');
    expect(got.outcomes).toBeInstanceOf(Map);
    expect(got.outcomes.get('5511988887777')?.locked).toBe(true);
    expect(got.selected[0].name).toBe('Ana');
    expect(b.get('s1|m2')).toBeNull();
    expect(b.get('s2|m1')).toBeNull(); // mesma mensagem noutra sessão não se mistura
  });

  it('apaga no sucesso e vence em 24 h', () => {
    const st = fakeStorage();
    let t = 0;
    const m = createForwardMemory(st, () => t);
    m.set('k', snap());
    m.delete('k');
    expect(createForwardMemory(st, () => t).get('k')).toBeNull();
    m.set('k', snap());
    t = MEMORY_TTL_MS - 1;
    expect(m.get('k')).not.toBeNull();
    t = MEMORY_TTL_MS;
    expect(m.get('k')).toBeNull();
  });

  it(`guarda no máximo ${MEMORY_MAX} mensagens (sai a mais antiga)`, () => {
    const st = fakeStorage();
    let t = 0;
    const m = createForwardMemory(st, () => t);
    for (let i = 0; i <= MEMORY_MAX; i++) {
      t = i;
      m.set(`k${i}`, snap());
    }
    const fresh = createForwardMemory(st, () => t);
    expect(fresh.get('k0')).toBeNull();
    expect(fresh.get(`k${MEMORY_MAX}`)).not.toBeNull();
    expect(Object.keys(JSON.parse(st.data.get(MEMORY_KEY)!))).toHaveLength(
      MEMORY_MAX,
    );
  });

  it('storage corrompido, ausente ou que lança não quebra (fica só em memória)', () => {
    expect(createForwardMemory(fakeStorage('{nao é json')).get('k')).toBeNull();
    const semStorage = createForwardMemory(null);
    semStorage.set('k', snap());
    expect(semStorage.get('k')?.frozen).toBe(true);
    const cheio = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const m = createForwardMemory(cheio);
    expect(() => m.set('k', snap())).not.toThrow();
    expect(m.get('k')?.frozen).toBe(true);
  });
});
