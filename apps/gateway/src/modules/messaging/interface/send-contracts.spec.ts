import type {
  SendReactionRequest,
  SendTextRequest,
} from '@whatsapp-gateway/contracts';
import { describe, expect, expectTypeOf, it } from 'vitest';

// O tsc do gateway inclui este spec: Vitest/SWC sozinho não verifica expectTypeOf/satisfies.
// Os limites continuam nos schemas reais da rota, exercitados por send-contracts.e2e-spec.ts.
describe('P-013 — tipos aditivos dos pedidos W5', () => {
  it('mantém texto legado e permite mentions omitido, vazio ou com números/JIDs', () => {
    expectTypeOf<SendTextRequest>().toEqualTypeOf<{
      to: string;
      text: string;
      mentions?: string[];
    }>();
    const legacy = {
      to: '5511999999999',
      text: 'fixture',
    } satisfies SendTextRequest;
    const empty = { ...legacy, mentions: [] } satisfies SendTextRequest;
    const mentioned = {
      ...legacy,
      mentions: ['5511888888888', '12345@lid'],
    } satisfies SendTextRequest;
    expect(legacy).not.toHaveProperty('mentions');
    expect(empty.mentions).toEqual([]);
    expect(mentioned.mentions).toHaveLength(2);
  });

  it('exige emoji string e preserva a remoção com string vazia', () => {
    expectTypeOf<SendReactionRequest>().toEqualTypeOf<{ emoji: string }>();
    const add = { emoji: '👍' } satisfies SendReactionRequest;
    const remove = { emoji: '' } satisfies SendReactionRequest;
    expect(add.emoji).toBe('👍');
    expect(remove.emoji).toBe('');
  });
});
