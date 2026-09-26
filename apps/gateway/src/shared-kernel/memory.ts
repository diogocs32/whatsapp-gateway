import { readFileSync } from 'node:fs';
import { constrainedMemory, memoryUsage } from 'node:process';
import { getHeapStatistics } from 'node:v8';

export interface MemoryStats {
  rssBytes: number;
  heapUsedBytes: number;
  heapLimitBytes: number;
  heapUsedPct: number; // used_heap_size / heap_size_limit — pressão REAL do heap V8
  containerUsedBytes: number | null; // cgroup memory.current (inclui os Chromium do wwebjs)
  containerLimitBytes: number | null; // limite do cgroup (process.constrainedMemory)
  memoryUsedPct: number; // RAM do container se houver limite; senão cai no heap V8
}

// /proc é a fonte de PSS da árvore Chromium no container Linux. No macOS local a métrica
// fica indisponível (null), sem confundir RSS somado com PSS.
export function chromiumProcessTree(rootPid: number): number[] {
  if (!Number.isInteger(rootPid) || rootPid <= 1 || rootPid === process.pid) {
    return [];
  }
  const seen = new Set<number>();
  const visit = (pid: number): void => {
    if (seen.has(pid)) return;
    seen.add(pid);
    try {
      const children = readFileSync(
        `/proc/${pid}/task/${pid}/children`,
        'utf8',
      );
      for (const value of children.trim().split(/\s+/)) {
        const child = Number(value);
        if (Number.isInteger(child) && child > 1 && child !== process.pid)
          visit(child);
      }
    } catch {
      // Processo encerrou durante a coleta ou /proc não existe neste SO.
    }
  };
  visit(rootPid);
  return [...seen];
}

export function chromiumTreePss(rootPid: number): {
  pssBytes: number;
  processCount: number;
} | null {
  let pssKb = 0;
  let processCount = 0;
  for (const pid of chromiumProcessTree(rootPid)) {
    try {
      const rollup = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      const match = /^Pss:\s+(\d+) kB/m.exec(rollup);
      if (!match) continue;
      pssKb += Number(match[1]);
      processCount += 1;
    } catch {
      // Um filho pode desaparecer entre a enumeração e a leitura.
    }
  }
  return processCount ? { pssBytes: pssKb * 1024, processCount } : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// cgroup v2: "working set" de memória do container = memory.current - inactive_file (page cache
// reclaimável) — o mesmo cálculo que docker stats / Kubernetes usam. Engloba TODOS os processos
// filhos (inclusive o Chromium de cada sessão whatsapp-web.js), ao contrário do rss/heap do Node.
function readCgroupWorkingSet(): number | null {
  try {
    const current = Number(
      readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim(),
    );
    if (!Number.isFinite(current) || current <= 0) return null;
    const stat = readFileSync('/sys/fs/cgroup/memory.stat', 'utf8');
    const m = /^inactive_file (\d+)/m.exec(stat);
    const inactiveFile = m ? Number(m[1]) : 0;
    const ws = current - inactiveFile;
    return ws > 0 ? ws : current;
  } catch {
    return null;
  }
}

// Métricas de memória para healthcheck/observability.
//
// heapUsed/heapTotal é DELIBERADAMENTE evitado: heapTotal é dinâmico (o V8 o mantém colado no
// heapUsed e expande sob demanda), o que produz falsos "94%" mesmo sem pressão real. O correto é
// comparar com os LIMITES — heap_size_limit (teto do V8, via --max-old-space-size) e, no container,
// o limite do cgroup, que ainda engloba os processos Chromium. (Node: v8.getHeapStatistics,
// process.constrainedMemory.)
export function memoryStats(): MemoryStats {
  const mem = memoryUsage();
  const heap = getHeapStatistics();
  const heapUsedPct =
    heap.heap_size_limit > 0 ? heap.used_heap_size / heap.heap_size_limit : 0;

  const limit = constrainedMemory() || 0; // 0 quando não há limite de cgroup
  const containerLimitBytes = limit > 0 ? limit : null;
  const containerUsedBytes = containerLimitBytes
    ? readCgroupWorkingSet()
    : null;
  const memoryUsedPct =
    containerLimitBytes && containerUsedBytes
      ? containerUsedBytes / containerLimitBytes
      : heapUsedPct;

  return {
    rssBytes: mem.rss,
    heapUsedBytes: heap.used_heap_size,
    heapLimitBytes: heap.heap_size_limit,
    heapUsedPct: round2(heapUsedPct),
    containerUsedBytes,
    containerLimitBytes,
    memoryUsedPct: round2(memoryUsedPct),
  };
}
