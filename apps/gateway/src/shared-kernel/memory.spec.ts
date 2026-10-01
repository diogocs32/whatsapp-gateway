import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStats } from './memory';

const probes = vi.hoisted(() => ({
  read: vi.fn(),
  limit: vi.fn(),
  usage: vi.fn(),
  heap: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  readFileSync: probes.read,
}));
vi.mock('node:process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:process')>()),
  constrainedMemory: probes.limit,
  memoryUsage: probes.usage,
}));
vi.mock('node:v8', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:v8')>()),
  getHeapStatistics: probes.heap,
}));

const CURRENT = '/sys/fs/cgroup/memory.current';
const STAT = '/sys/fs/cgroup/memory.stat';
let files: Record<string, string | Error>;

// Somente as duas leituras sintéticas são permitidas. Nunca delegar fs ao host:
// os resultados devem ser idênticos no macOS e no Linux do CI, com ou sem cgroup.
beforeEach(() => {
  vi.resetAllMocks();
  files = {
    [CURRENT]: '900\n',
    [STAT]: 'anon 100\ninactive_file 300\nactive_file 50\n',
  };
  probes.read.mockImplementation((path: string) => {
    const content = files[path];
    if (content === undefined) throw new Error(`Leitura não prevista: ${path}`);
    if (content instanceof Error) throw content;
    return content;
  });
  probes.limit.mockReturnValue(1000);
  probes.usage.mockReturnValue({
    rss: 9999,
    heapTotal: 950,
    heapUsed: 930,
    external: 10,
    arrayBuffers: 5,
  });
  probes.heap.mockReturnValue({ used_heap_size: 920, heap_size_limit: 2000 });
});

describe('memoryStats — working set cgroup v2 pela API pública real', () => {
  it('subtrai somente inactive_file em bytes e usa o limite do container', () => {
    expect(memoryStats()).toEqual({
      rssBytes: 9999,
      heapUsedBytes: 920,
      heapLimitBytes: 2000,
      heapUsedPct: 0.46,
      containerUsedBytes: 600,
      containerLimitBytes: 1000,
      memoryUsedPct: 0.6,
    });
    expect(probes.read.mock.calls).toEqual([
      [CURRENT, 'utf8'],
      [STAT, 'utf8'],
    ]);
  });

  it.each([
    ['primeira', 'inactive_file 300\nanon 100\n'],
    ['intermediária', 'anon 100\ninactive_file 300\nactive_file 50\n'],
    ['última', 'anon 100\nactive_file 50\ninactive_file 300'],
  ])(
    'localiza a chave na linha %s, independente das demais chaves',
    (_, stat) => {
      files[STAT] = stat;
      expect(memoryStats().containerUsedBytes).toBe(600);
    },
  );

  it.each([
    ['arquivo vazio', ''],
    ['só active_file', 'active_file 300\n'],
    ['nome diferente', 'inactive_file_bytes 300\n'],
    ['chave fora do início da linha', 'x inactive_file 300\n'],
    ['indentação', ' inactive_file 300\n'],
    ['tab em vez de espaço', 'inactive_file\t300\n'],
    ['valor negativo', 'inactive_file -300\n'],
    ['valor não numérico', 'inactive_file inválido\n'],
    ['valor zero', 'inactive_file 0\n'],
  ])('usa current quando inactive_file não desconta: %s', (_, stat) => {
    files[STAT] = stat;
    expect(memoryStats()).toMatchObject({
      containerUsedBytes: 900,
      memoryUsedPct: 0.9,
    });
  });

  // Caracterização da gramática existente, não validação de formato do kernel:
  // Number(trim) e o prefixo numérico da regex não são parsers inteiros estritos.
  it.each([' 900\n', '9e2', '0x384'])(
    'preserva Number(trim) para current %j',
    (value) => {
      files[CURRENT] = value;
      expect(memoryStats().containerUsedBytes).toBe(600);
    },
  );

  it('preserva o prefixo numérico da chave, sem endurecer a gramática', () => {
    files[STAT] = 'inactive_file 300sufixo\n';
    expect(memoryStats().containerUsedBytes).toBe(600);
  });

  it.each([900, 1200])(
    'retorna current se o desconto %i anula/excede o consumo',
    (inactive) => {
      files[STAT] = `inactive_file ${inactive}\n`;
      expect(memoryStats()).toMatchObject({
        containerUsedBytes: 900,
        memoryUsedPct: 0.9,
      });
    },
  );

  it('não limita a 100% um consumo maior que o limite', () => {
    files[CURRENT] = '1500';
    files[STAT] = 'inactive_file 100\n';
    expect(memoryStats()).toMatchObject({
      containerUsedBytes: 1400,
      memoryUsedPct: 1.4,
    });
  });

  it('arredonda os ratios a duas casas, mantendo os bytes exatos', () => {
    files[CURRENT] = '999';
    files[STAT] = 'inactive_file 333\n';
    probes.heap.mockReturnValue({ used_heap_size: 667, heap_size_limit: 2000 });
    expect(memoryStats()).toMatchObject({
      heapUsedBytes: 667,
      heapUsedPct: 0.33,
      containerUsedBytes: 666,
      memoryUsedPct: 0.67,
    });
  });

  it('relê current/stat em cada coleta, sem manter um resultado antigo', () => {
    expect(memoryStats().memoryUsedPct).toBe(0.6);
    files[CURRENT] = '800';
    files[STAT] = 'inactive_file 100\n';
    expect(memoryStats().memoryUsedPct).toBe(0.7);
    expect(probes.read).toHaveBeenCalledTimes(4);
  });
});

describe('memoryStats — fallback para pressão do heap V8', () => {
  it.each([0, undefined, -1])(
    'limite %j não consulta cgroup e usa heap_size_limit',
    (limit) => {
      probes.limit.mockReturnValue(limit);
      expect(memoryStats()).toMatchObject({
        containerLimitBytes: null,
        containerUsedBytes: null,
        heapUsedPct: 0.46,
        memoryUsedPct: 0.46,
      });
      expect(probes.read).not.toHaveBeenCalled();
    },
  );

  it.each(['', ' \n', '0', '-100', 'NaN', 'Infinity', '1e309', '900inválido'])(
    'current %j indisponível/inválido usa heap e não lê stat',
    (current) => {
      files[CURRENT] = current;
      expect(memoryStats()).toMatchObject({
        containerLimitBytes: 1000,
        containerUsedBytes: null,
        memoryUsedPct: 0.46,
      });
      expect(probes.read.mock.calls).toEqual([[CURRENT, 'utf8']]);
    },
  );

  it.each([
    [CURRENT, 'ENOENT', 1],
    [CURRENT, 'EACCES', 1],
    [STAT, 'ENOENT', 2],
    [STAT, 'EACCES', 2],
  ])(
    'falha %s/%s devolve null e usa heap, sem confundir stat ausente com vazio',
    (path, code, calls) => {
      files[path] = Object.assign(new Error(code), { code });
      expect(memoryStats()).toMatchObject({
        containerLimitBytes: 1000,
        containerUsedBytes: null,
        memoryUsedPct: 0.46,
      });
      expect(probes.read).toHaveBeenCalledTimes(calls);
    },
  );

  it.each([0, -1])(
    'heap sem limite positivo (%i) retorna ratio zero no fallback',
    (limit) => {
      probes.limit.mockReturnValue(0);
      probes.heap.mockReturnValue({
        used_heap_size: 920,
        heap_size_limit: limit,
      });
      expect(memoryStats()).toMatchObject({ heapUsedPct: 0, memoryUsedPct: 0 });
      expect(probes.read).not.toHaveBeenCalled();
    },
  );
});
