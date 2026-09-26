#!/usr/bin/env node
// Observação do guard-rail: coleta o estado atual vs targetState em JSONL.
// ATENÇÃO: GET /api/guardrail/:id chama evaluate(); com GUARDRAIL_ENFORCE=true ele pode
// aplicar transição de estado e emitir evento. É uma ação operacional, não consulta inerte.
//
// Uso (em janela aprovada; indicar arquivo novo, nunca o M2 histórico):
//   GATEWAY_API_KEY=xxx [GATEWAY_URL=https://api.conexozenvo.com] \
//     node scripts/guardrail-observe.mjs docs/observacao/guardrail-AAAA-MM-DD.jsonl
import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outArg = process.argv[2];
if (!outArg) {
  console.error(
    'Informe um novo arquivo JSONL; o histórico M2 está arquivado.',
  );
  process.exit(1);
}
const out = resolve(outArg);
const archive = resolve('docs/observacao/guardrail-m2.jsonl');
if (existsSync(out)) {
  const archiveStat = statSync(archive);
  const outStat = statSync(out);
  if (archiveStat.dev === outStat.dev && archiveStat.ino === outStat.ino) {
    console.error('O histórico M2 é imutável. Informe outro arquivo JSONL.');
    process.exit(1);
  }
}

const url = process.env.GATEWAY_URL ?? 'https://api.conexozenvo.com';
const key = process.env.GATEWAY_API_KEY;
if (!key) {
  console.error('Defina GATEWAY_API_KEY (X-Api-Key do gateway).');
  process.exit(1);
}
const headers = { 'X-Api-Key': key };
const ts = new Date().toISOString();

async function getJson(path) {
  const res = await fetch(`${url}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}

const body = await getJson('/api/sessions');
const sessions = Array.isArray(body) ? body : (body.sessions ?? []);
const cfg = await getJson('/api/guardrail/config').catch((e) => ({
  error: String(e),
}));

mkdirSync(dirname(out), { recursive: true });
appendFileSync(out, JSON.stringify({ ts, tipo: 'config', config: cfg }) + '\n');

const resumo = [];
for (const s of sessions) {
  let g;
  try {
    g = await getJson(`/api/guardrail/${s.id}`);
  } catch (e) {
    g = { error: String(e) };
  }
  appendFileSync(
    out,
    JSON.stringify({
      ts,
      tipo: 'sessao',
      session: { id: s.id, name: s.name, status: s.status, engine: s.engine },
      guardrail: g,
    }) + '\n',
  );
  resumo.push({
    sessao: s.name,
    conexao: s.status,
    estado: g.currentState ?? '?',
    alvo: g.targetState ?? '?',
    divergente: g.currentState !== g.targetState ? '⚠️ SIM' : '',
    reply: g.replyRate,
    amostra: g.sample,
    confiavel: g.reliable,
    motivo: (g.reason ?? g.error ?? '').slice(0, 70),
  });
}

console.log(`Coleta ${ts} — ${sessions.length} sessão(ões) → ${out}`);
console.table(resumo);
console.log(
  'Config efetiva:',
  JSON.stringify({
    enforce: cfg.enforce,
    nmin: cfg.nmin,
    throttleMult: cfg.throttleMult,
    quarantineMult: cfg.quarantineMult,
    targetReplyRate: cfg.targetReplyRate,
    cooldownHours: cfg.cooldownHours,
  }),
);
