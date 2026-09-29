#!/usr/bin/env node
/**
 * Guarda de build (P-055): todo pacote que o JS compilado usa precisa RESOLVER e CARREGAR a partir do
 * próprio arquivo, com o node_modules que a imagem de runtime realmente tem.
 *
 * Motivo: em 16/08/2026 a imagem nasceu sem o `zod` do gateway (hoisting parcial do npm + prune) e o
 * container novo morreu no boot com MODULE_NOT_FOUND — o start-first segurou o antigo. Com
 * stop-first (B-004) isso vira indisponibilidade; a guarda move a falha para o BUILD.
 *
 * Não sobe Nest, banco ou Redis: lê os arquivos .js, resolve cada
 * pacote com `require.resolve(spec, { paths: [dir do arquivo] })` — o mesmo algoritmo do `require`
 * em runtime (https://nodejs.org/api/modules.html#requireresolverequest-options) — e depois CARREGA
 * cada pacote uma vez com `createRequire(arquivo)(spec)`, o que pega também dependência TRANSITIVA
 * ausente e pacote ESM que não carrega via require (o `require.resolve` só prova o 1º nível).
 * Carregar um pacote executa só o código de topo dele (nenhum pacote do gateway conecta no import).
 * E17 também executa o wrapper puro newId compilado: prova o export CJS do ULID 3 e a geração
 * de IDs válidos no Node/node_modules final, depois do prune (não só no transform do Vitest).
 *
 * Vale para dist em CommonJS (tsconfig `module: commonjs`, o atual). Se o dist virar ESM ou
 * `module: node16/nodenext` preservar `import()`, a guarda precisa ser revista — por isso ela falha
 * quando não encontra nenhum pacote.
 *
 * Uso: node scripts/verificar-deps-runtime.cjs <diretório do dist>   (sai 1 se algo falhar)
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isBuiltin, createRequire } = require('node:module');

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error(
    `[verificar-deps-runtime] diretório inexistente: ${dir ?? '(vazio)'}`,
  );
  process.exit(2);
}

function* arquivosJs(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') yield* arquivosJs(p);
    } else if (e.name.endsWith('.js') || e.name.endsWith('.cjs')) yield p;
  }
}

// require("x") / require('x') / require(`x`) (crase sem interpolação — o tsc emite isso para
// import(`x`)) e import("x") preservado. O lookbehind ignora `algo.require(...)`: é o sistema de
// módulos da PÁGINA do WhatsApp Web, dentro de funções que o wwebjs serializa para o navegador
// (ex.: `g.require('WAWebWidFactory')` em wwebjs.lid-outbound.ts), e métodos como this.require(id).
const RE = /(?<![.\w$])(?:require|import)\(\s*(["'`])([^"'`$\n]+)\1\s*\)/g;

let arquivos = 0;
const pacotes = new Map(); // spec → 1º arquivo que o usa
const falhas = [];
const rel = (p) => path.relative(process.cwd(), p);

for (const arq of arquivosJs(path.resolve(dir))) {
  arquivos++;
  const src = fs.readFileSync(arq, 'utf8');
  for (const m of src.matchAll(RE)) {
    const spec = m[2];
    if (spec.startsWith('.') || spec.startsWith('/') || isBuiltin(spec))
      continue;
    try {
      require.resolve(spec, { paths: [path.dirname(arq)] });
      if (!pacotes.has(spec)) pacotes.set(spec, arq);
    } catch (e) {
      falhas.push(`${rel(arq)}: require('${spec}') → ${e.code ?? e.message}`);
    }
  }
}

// Carrega cada pacote uma vez, a partir do 1º arquivo que o usa (mesma resolução do runtime).
for (const [spec, arq] of pacotes) {
  try {
    createRequire(arq)(spec);
  } catch (e) {
    const msg = String(e && e.message).split('\n')[0];
    falhas.push(`${rel(arq)}: carregar '${spec}' → ${e.code ?? ''} ${msg}`);
  }
}

// Exercita o mesmo require emitido pelo Nest no runtime, inclusive a entropia do ULID 3.
try {
  const arq = path.resolve(dir, 'shared-kernel/ulid.js');
  const fromGateway = createRequire(arq);
  const { newId } = fromGateway(arq);
  const { decodeTime } = fromGateway('ulid');
  const started = Date.now();
  const ids = Array.from({ length: 128 }, () => newId());
  const ended = Date.now();
  if (
    new Set(ids).size !== ids.length ||
    !ids.every(
      (id) =>
        typeof id === 'string' &&
        /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(id) &&
        decodeTime(id) >= started &&
        decodeTime(id) <= ended,
    )
  ) {
    throw new Error(
      'newId não gerou ULIDs únicos, válidos e com horário atual',
    );
  }
  console.log('[verificar-deps-runtime] newId CommonJS OK (128 ULIDs únicos)');
} catch (e) {
  falhas.push(`newId compilado: ${String(e && e.message).split('\n')[0]}`);
}

if (arquivos === 0 || pacotes.size + falhas.length === 0) {
  console.error(
    `[verificar-deps-runtime] ${arquivos} .js e nenhum require de pacote em ${dir} — build vazio ou formato de módulo mudou (rever a guarda)`,
  );
  process.exit(1);
}
if (falhas.length) {
  console.error(
    `[verificar-deps-runtime] FALHA: ${falhas.length} pacote(s) sem resolução/carga:`,
  );
  for (const f of falhas) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `[verificar-deps-runtime] OK: ${arquivos} arquivos, ${pacotes.size} pacotes distintos resolvidos e carregados`,
);
// Algum pacote pode deixar timer/handle vivo ao carregar — sair explicitamente.
process.exit(0);
