import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RetentionService } from './retention.service';

// E26 (D-038): as atribuições órfãs de `session_proxy_assignments` carimbadas com o nome da sessão
// apagada são a memória da sugestão de proxy — registro intencional. A retenção NÃO pode tocá-las;
// este teste quebra se alguém acrescentar uma faxina dessa tabela à varredura.
describe('RetentionService.sweep — invariante D-038', () => {
  afterEach(() => vi.restoreAllMocks());

  it('não acessa session_proxy_assignments (modelo nem SQL cru)', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const models = new Set<string>();
    const rawSql: string[] = [];
    const model = { deleteMany: vi.fn(async () => ({ count: 0 })) };
    const prisma = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === '$executeRaw') {
            return (strings: TemplateStringsArray) => {
              rawSql.push(strings.join('?'));
              return Promise.resolve(0);
            };
          }
          models.add(prop);
          return model;
        },
      },
    );
    await new RetentionService(prisma as never).sweep();

    expect(models.size).toBeGreaterThan(0); // a varredura rodou de fato
    expect([...models]).not.toContain('sessionProxyAssignment');
    expect(rawSql.join('\n')).not.toMatch(/session_proxy_assignments/i);
  });
});
