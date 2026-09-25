#!/usr/bin/env node
/**
 * Mapa do código — inventário DETERMINÍSTICO gerado pelo compilador do TypeScript
 * (type-checker resolve cada chamada; nada é inferido por heurística de texto livre).
 *
 * Gera docs/reference/mapa-codigo/*.md com: arquivos, classes, métodos e funções (com linha),
 * injeção de dependência (construtor), chamadas resolvidas ("chama" / "chamado por"),
 * implementações de interface (ex.: IEngine → BaileysEngine/WwebjsEngine), rotas HTTP,
 * filas BullMQ (+ expressão do jobId), eventos do EventBus, variáveis de ambiente,
 * acesso Prisma por modelo, wiring dos @Module e títulos de testes (unit/e2e).
 *
 * Uso:
 *   node scripts/mapa-codigo.mjs          → regrava docs/reference/mapa-codigo/
 *   node scripts/mapa-codigo.mjs --check  → sai 1 se o mapa commitado estiver desatualizado
 *
 * A saída não contém data nem SHA: é função pura do código-fonte (o --check depende disso).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const ts = require('typescript');

const OUT_DIR = path.join(ROOT, 'docs/reference/mapa-codigo');
const CHECK = process.argv.includes('--check');

const PROJECTS = [
  {
    id: 'gateway',
    tsconfig: 'apps/gateway/tsconfig.json',
    roots: ['apps/gateway/src', 'apps/gateway/test'],
    extraGlobs: ['apps/gateway/test'],
    exclude: [/\/src\/generated\//],
  },
  {
    id: 'contracts',
    tsconfig: 'packages/contracts/tsconfig.json',
    roots: ['packages/contracts/src'],
    extraGlobs: [],
    exclude: [],
  },
  {
    id: 'dashboard',
    tsconfig: 'apps/dashboard/tsconfig.json',
    roots: ['apps/dashboard/src'],
    extraGlobs: [],
    exclude: [],
  },
];

const PRISMA_OPS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'findFirstOrThrow',
  'findUniqueOrThrow',
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);
const PRISMA_WRITE = /^(create|update|upsert|delete)/;
const RAW_SQL = new Set([
  '$queryRaw',
  '$executeRaw',
  '$queryRawUnsafe',
  '$executeRawUnsafe',
]);
const HTTP_DECORATORS = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'All',
  'Sse',
]);
const TEST_FNS = new Set(['describe', 'it', 'test']);
const DASH_HTTP = new Set([
  'get',
  'post',
  'put',
  'patch',
  'del',
  'delete',
  'request',
  'requestForm',
  'coreFetch',
  'fetch',
  'upload',
]);

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const clip = (s, n = 90) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
};
const lineOf = (node) =>
  node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      walkFiles(p, acc);
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}

// ---------------------------------------------------------------- coleta
/** Todos os arquivos mapeados (chave = caminho relativo à raiz). */
const FILES = new Map();
/** Símbolos (unidades) por id `arquivo#nome`. */
const UNITS = new Map();
/** Arestas de chamada: id → Set(id). */
const CALLS = new Map();
const CALLERS = new Map();
/** Implementações: id do membro da interface → Set(id do membro da classe). */
const IMPLEMENTED_BY = new Map();
const IMPLEMENTS = new Map();
const ROUTES = [];
const QUEUES = [];
const EVENTS = { publish: [], subscribe: [] };
const ENV = new Map(); // VAR → Set(id)
const PRISMA = new Map(); // model → Map(op → Set(id))
const DASH_CALLS = []; // { path, unit }
const JOBID_SITES = []; // chamadas a funções com parâmetro jobId (regra: jobId SEM ':')

function addEdge(map, a, b) {
  if (!map.has(a)) map.set(a, new Set());
  map.get(a).add(b);
}

function unitId(fileRel, name) {
  return `${fileRel}#${name}`;
}

function declName(decl) {
  const parent = decl.parent;
  if (
    parent &&
    (ts.isClassLike(parent) || ts.isInterfaceDeclaration(parent)) &&
    (ts.isMethodDeclaration(decl) ||
      ts.isMethodSignature(decl) ||
      ts.isPropertyDeclaration(decl) ||
      ts.isPropertySignature(decl) ||
      ts.isConstructorDeclaration(decl) ||
      ts.isGetAccessorDeclaration(decl) ||
      ts.isSetAccessorDeclaration(decl))
  ) {
    const cname = parent.name ? parent.name.text : '(anônima)';
    const mname = ts.isConstructorDeclaration(decl)
      ? 'constructor'
      : decl.name
        ? decl.name.getText()
        : '?';
    return `${cname}.${mname}`;
  }
  if (
    (ts.isFunctionDeclaration(decl) || ts.isClassDeclaration(decl)) &&
    decl.name
  )
    return decl.name.text;
  if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name))
    return decl.name.text;
  // membro de objeto literal atribuído a uma const de topo: `const api = { get() {} }`
  if (
    (ts.isMethodDeclaration(decl) || ts.isPropertyAssignment(decl)) &&
    ts.isObjectLiteralExpression(parent)
  ) {
    let p = parent.parent;
    while (p && !ts.isVariableDeclaration(p) && !ts.isSourceFile(p))
      p = p.parent;
    if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name))
      return `${p.name.text}.${decl.name.getText()}`;
  }
  return null;
}

function decoratorsOf(node) {
  if (!ts.canHaveDecorators(node)) return [];
  return (ts.getDecorators(node) ?? []).map((d) => {
    const e = d.expression;
    if (ts.isCallExpression(e))
      return {
        name: e.expression.getText(),
        args: e.arguments.map((a) => a.getText()),
        node: e,
      };
    return { name: e.getText(), args: [], node: e };
  });
}

function stringValue(node, checker) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
    const sym = checker.getSymbolAtLocation(node);
    const d = sym?.valueDeclaration;
    if (
      d &&
      (ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d)) &&
      d.initializer &&
      ts.isStringLiteralLike(d.initializer)
    )
      return d.initializer.text;
  }
  return null;
}

function paramsText(fn) {
  if (!fn || !fn.parameters) return '';
  return fn.parameters
    .map((p) => (p.dotDotDotToken ? '...' : '') + p.name.getText())
    .join(', ');
}

function fnOfUnit(node) {
  if (
    ts.isMethodDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isMethodSignature(node)
  )
    return node;
  const init = node.initializer;
  if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)))
    return init;
  return null;
}

function modifiersText(node) {
  const mods = (ts.canHaveModifiers(node) ? ts.getModifiers(node) : []) ?? [];
  const keep = mods
    .map((m) => ts.tokenToString(m.kind))
    .filter((m) =>
      ['private', 'protected', 'static', 'async', 'abstract'].includes(m),
    );
  const fn = fnOfUnit(node);
  if (fn && fn !== node) {
    const inner = (ts.getModifiers(fn) ?? []).map((m) =>
      ts.tokenToString(m.kind),
    );
    if (inner.includes('async') && !keep.includes('async')) keep.push('async');
  }
  return keep;
}

function analyzeProgram(project) {
  const configPath = path.join(ROOT, project.tsconfig);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      },
    },
  );
  const rootNames = new Set(parsed.fileNames);
  for (const g of project.extraGlobs)
    for (const f of walkFiles(path.join(ROOT, g))) rootNames.add(f);
  const options = { ...parsed.options, noEmit: true, incremental: false };
  delete options.tsBuildInfoFile;
  const program = ts.createProgram({ rootNames: [...rootNames], options });
  const checker = program.getTypeChecker();

  const inProject = (fileName) => {
    const r = rel(fileName);
    return (
      project.roots.some((root) => r.startsWith(`${root}/`)) &&
      !project.exclude.some((re) => re.test(`/${r}`)) &&
      !r.endsWith('.d.ts')
    );
  };
  const sources = program
    .getSourceFiles()
    .filter((sf) => inProject(sf.fileName))
    .sort((a, b) => rel(a.fileName).localeCompare(rel(b.fileName)));

  let globalPrefix = '';
  for (const sf of sources) {
    const m = /setGlobalPrefix\(\s*['"]([^'"]+)['"]/.exec(sf.text);
    if (m) globalPrefix = m[1];
  }

  // --- 1ª passada: declarações (unidades) de cada arquivo
  const pendingImpl = [];
  for (const sf of sources) {
    const fileRel = rel(sf.fileName);
    const isTest = /\.(e2e-)?spec\.tsx?$/.test(fileRel);
    const info = {
      rel: fileRel,
      project: project.id,
      lines: sf.getLineAndCharacterOfPosition(sf.end).line + 1,
      isTest,
      imports: [],
      importedBy: new Set(),
      classes: [],
      functions: [],
      types: [],
      tests: [],
      modules: [],
      unitsTop: [],
    };
    FILES.set(fileRel, info);

    for (const st of sf.statements) {
      if (
        ts.isImportDeclaration(st) &&
        ts.isStringLiteral(st.moduleSpecifier)
      ) {
        const spec = st.moduleSpecifier.text;
        const res = ts.resolveModuleName(
          spec,
          sf.fileName,
          options,
          ts.sys,
        ).resolvedModule;
        if (
          res &&
          !res.isExternalLibraryImport &&
          !rel(res.resolvedFileName).includes('node_modules')
        )
          info.imports.push(rel(res.resolvedFileName));
      }
    }

    if (isTest) {
      const visit = (node, depth) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) === false &&
          ts.isPropertyAccessExpression(node.expression) &&
          TEST_FNS.has(node.expression.expression.getText()) &&
          node.arguments[0] &&
          ts.isStringLiteralLike(node.arguments[0])
        ) {
          // describe.skip / it.each etc.
          info.tests.push({
            depth,
            kind: node.expression.getText(),
            title: node.arguments[0].text,
            line: lineOf(node),
          });
          ts.forEachChild(node, (c) => visit(c, depth + 1));
          return;
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          TEST_FNS.has(node.expression.text) &&
          node.arguments[0] &&
          ts.isStringLiteralLike(node.arguments[0])
        ) {
          info.tests.push({
            depth,
            kind: node.expression.text,
            title: node.arguments[0].text,
            line: lineOf(node),
          });
          ts.forEachChild(node, (c) => visit(c, depth + 1));
          return;
        }
        ts.forEachChild(node, (c) => visit(c, depth));
      };
      visit(sf, 0);
      continue;
    }

    const registerUnit = (node, name, extra = {}) => {
      const id = unitId(fileRel, name);
      const fn = fnOfUnit(node);
      const u = {
        id,
        file: fileRel,
        name,
        line: lineOf(node),
        node,
        params: fn ? paramsText(fn) : null,
        mods: modifiersText(node),
        decorators: decoratorsOf(node),
        env: new Set(),
        prisma: new Set(),
        publishes: new Set(),
        subscribes: new Set(),
        queueAdds: [],
        dashHttp: new Set(),
        ...extra,
      };
      UNITS.set(id, u);
      return u;
    };

    for (const st of sf.statements) {
      if (ts.isClassDeclaration(st) && st.name) {
        const cname = st.name.text;
        const cls = {
          name: cname,
          line: lineOf(st),
          decorators: decoratorsOf(st),
          heritage: [],
          di: [],
          members: [],
        };
        for (const h of st.heritageClauses ?? []) {
          const kw =
            h.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
          for (const t of h.types) {
            cls.heritage.push(`${kw} ${t.expression.getText()}`);
            if (kw === 'implements') {
              const sym = checker.getSymbolAtLocation(t.expression);
              const target =
                sym && sym.flags & ts.SymbolFlags.Alias
                  ? checker.getAliasedSymbol(sym)
                  : sym;
              const idecl = target?.declarations?.find((d) =>
                ts.isInterfaceDeclaration(d),
              );
              if (idecl && inProject(idecl.getSourceFile().fileName))
                cls.implementsDecl = [...(cls.implementsDecl ?? []), idecl];
            }
          }
        }
        const ctrl = cls.decorators.find((d) => d.name === 'Controller');
        const mod = cls.decorators.find((d) => d.name === 'Module');
        if (
          mod &&
          mod.node.arguments[0] &&
          ts.isObjectLiteralExpression(mod.node.arguments[0])
        ) {
          const wiring = {};
          for (const p of mod.node.arguments[0].properties)
            if (ts.isPropertyAssignment(p))
              wiring[p.name.getText()] = clip(p.initializer.getText(), 400);
          info.modules.push({ name: cname, line: lineOf(st), wiring });
        }
        for (const m of st.members) {
          let name;
          if (ts.isConstructorDeclaration(m)) {
            name = `${cname}.constructor`;
            for (const p of m.parameters) {
              const isProp = (ts.getModifiers(p) ?? []).length > 0;
              const inject = decoratorsOf(p).find((d) => d.name === 'Inject');
              const type = p.type ? p.type.getText() : '?';
              cls.di.push(
                `${p.name.getText()}: ${inject ? `@Inject(${inject.args.join(', ')}) ` : ''}${clip(type, 60)}${isProp ? '' : ' (param)'}`,
              );
            }
          } else if (
            ts.isMethodDeclaration(m) ||
            ts.isGetAccessorDeclaration(m) ||
            ts.isSetAccessorDeclaration(m) ||
            (ts.isPropertyDeclaration(m) && m.initializer)
          ) {
            name = `${cname}.${m.name.getText()}`;
          } else continue;
          const u = registerUnit(m, name, {
            kind: ts.isPropertyDeclaration(m)
              ? fnOfUnit(m)
                ? 'prop-fn'
                : 'prop'
              : ts.isGetAccessorDeclaration(m)
                ? 'get'
                : ts.isSetAccessorDeclaration(m)
                  ? 'set'
                  : 'method',
            className: cname,
          });
          cls.members.push(u.id);
          if (ctrl) {
            const http = u.decorators.find((d) => HTTP_DECORATORS.has(d.name));
            if (http) {
              const cpath = ctrl.args[0]
                ? (stringValue(ctrl.node.arguments[0], checker) ??
                  clip(ctrl.args[0], 40))
                : '';
              const mpath = http.args[0]
                ? (stringValue(http.node.arguments[0], checker) ??
                  clip(http.args[0], 40))
                : '';
              const full = `/${[globalPrefix, cpath, mpath]
                .filter(Boolean)
                .join('/')
                .replace(/\/+/g, '/')}`;
              ROUTES.push({
                verb:
                  http.name === 'Sse' ? 'GET(SSE)' : http.name.toUpperCase(),
                path: full,
                unit: u.id,
                guards: [...cls.decorators, ...u.decorators]
                  .filter(
                    (d) =>
                      !HTTP_DECORATORS.has(d.name) && d.name !== 'Controller',
                  )
                  .map((d) =>
                    d.args.length
                      ? `@${d.name}(${clip(d.args.join(', '), 50)})`
                      : `@${d.name}`,
                  ),
              });
            }
          }
        }
        info.classes.push(cls);
        if (cls.implementsDecl) pendingImpl.push({ cls, fileRel });
      } else if (ts.isFunctionDeclaration(st) && st.name) {
        const u = registerUnit(st, st.name.text, { kind: 'function' });
        info.functions.push(u.id);
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (!ts.isIdentifier(d.name)) continue;
          const isFn = !!fnOfUnit(d);
          const exported = (ts.getModifiers(st) ?? []).some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          );
          if (
            !isFn &&
            !exported &&
            !(d.initializer && /\(/.test(d.initializer.getText()))
          )
            continue;
          const u = registerUnit(d, d.name.text, {
            kind: isFn ? 'function' : 'const',
            exported,
            constValue:
              !isFn && d.initializer ? clip(d.initializer.getText(), 70) : null,
          });
          info.functions.push(u.id);
        }
      } else if (ts.isInterfaceDeclaration(st)) {
        const members = [];
        for (const m of st.members) {
          if (!m.name) continue;
          const mname = `${st.name.text}.${m.name.getText()}`;
          if (ts.isMethodSignature(m)) {
            const u = registerUnit(m, mname, { kind: 'signature' });
            members.push(u.id);
          }
        }
        info.types.push({
          kind: 'interface',
          name: st.name.text,
          line: lineOf(st),
          members,
          props: st.members.filter((m) => ts.isPropertySignature(m)).length,
        });
      } else if (ts.isTypeAliasDeclaration(st)) {
        info.types.push({ kind: 'type', name: st.name.text, line: lineOf(st) });
      } else if (ts.isEnumDeclaration(st)) {
        info.types.push({
          kind: 'enum',
          name: st.name.text,
          line: lineOf(st),
          values: st.members.map((m) => m.name.getText()),
        });
      } else if (ts.isExpressionStatement(st)) {
        const u = registerUnit(st, `(módulo:L${lineOf(st)})`, {
          kind: 'toplevel',
        });
        info.unitsTop.push(u.id);
      }
    }
  }

  // implementações de interface (depois da 1ª passada: a interface pode estar em arquivo posterior)
  for (const { cls, fileRel } of pendingImpl)
    for (const idecl of cls.implementsDecl) {
      const iname = idecl.name.text;
      const ifile = rel(idecl.getSourceFile().fileName);
      for (const im of idecl.members) {
        if (!im.name) continue;
        const mname = im.name.getText();
        const own = unitId(fileRel, `${cls.name}.${mname}`);
        if (!UNITS.has(own)) continue;
        const iid = unitId(ifile, `${iname}.${mname}`);
        addEdge(IMPLEMENTED_BY, iid, own);
        addEdge(IMPLEMENTS, own, iid);
      }
    }

  // --- 2ª passada: corpo de cada unidade (chamadas, env, prisma, eventos, filas)
  for (const u of UNITS.values()) {
    if (!u.node || u.node.getSourceFile() === undefined) continue;
    if (!sources.includes(u.node.getSourceFile())) continue;
    const isConfig = u.file.endsWith('bootstrap/config.ts');
    const visit = (node) => {
      // variáveis de ambiente
      if (
        ts.isPropertyAccessExpression(node) &&
        node.expression.getText() === 'process.env'
      )
        u.env.add(node.name.text);
      if (
        ts.isElementAccessExpression(node) &&
        node.expression.getText() === 'process.env' &&
        ts.isStringLiteralLike(node.argumentExpression)
      )
        u.env.add(node.argumentExpression.text);
      if (
        isConfig &&
        ts.isPropertyAssignment(node) &&
        /^[A-Z][A-Z0-9_]{2,}$/.test(node.name.getText())
      )
        u.env.add(node.name.getText());
      if (
        ts.isPropertyAccessExpression(node) &&
        /^import\.meta\.env$/.test(node.expression.getText())
      )
        u.env.add(node.name.text);

      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        let e = node.expression;
        while (
          ts.isParenthesizedExpression(e) ||
          ts.isNonNullExpression(e) ||
          ts.isAsExpression(e)
        )
          e = e.expression;
        // Prisma: <x>.<model>.<op>(
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(e) &&
          PRISMA_OPS.has(e.name.text) &&
          ts.isPropertyAccessExpression(e.expression) &&
          /(prisma|tx|db|client|trx)$/i.test(e.expression.expression.getText())
        )
          u.prisma.add(`${e.expression.name.text}.${e.name.text}`);
        const rawName = ts.isPropertyAccessExpression(e) ? e.name.text : null;
        if (rawName && RAW_SQL.has(rawName)) {
          const sql = node.arguments.map((a) => a.getText()).join(' ');
          for (const m of sql.matchAll(
            /\b(?:FROM|INTO|UPDATE|JOIN)\s+"?([a-z_][a-z0-9_]*)"?/gi,
          ))
            u.prisma.add(`SQL:${m[1]}.${rawName}`);
        }
        // EventBus
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(e) &&
          /bus/i.test(e.expression.getText())
        ) {
          if (e.name.text === 'publish' && node.arguments[0]) {
            const a = node.arguments[0];
            let nm = null;
            if (ts.isObjectLiteralExpression(a)) {
              const p = a.properties.find(
                (pp) =>
                  ts.isPropertyAssignment(pp) && pp.name.getText() === 'name',
              );
              nm = p ? p.initializer.getText() : '(sem name literal)';
            } else nm = `(${clip(a.getText(), 40)})`;
            u.publishes.add(nm);
            EVENTS.publish.push({ name: nm, unit: u.id, line: lineOf(node) });
          }
          if (
            ['subscribe', 'subscribeAll', 'unsubscribe'].includes(e.name.text)
          ) {
            const nm =
              e.name.text === 'subscribeAll'
                ? '*'
                : node.arguments[0]
                  ? node.arguments[0].getText()
                  : '?';
            if (e.name.text !== 'unsubscribe') {
              u.subscribes.add(nm);
              EVENTS.subscribe.push({
                name: nm,
                unit: u.id,
                line: lineOf(node),
              });
            }
          }
        }
        // BullMQ
        if (
          ts.isNewExpression(node) &&
          ['Queue', 'Worker', 'QueueEvents'].includes(e.getText())
        ) {
          const qn =
            stringValue(node.arguments?.[0], checker) ??
            clip(node.arguments?.[0]?.getText() ?? '?', 40);
          QUEUES.push({
            kind: e.getText(),
            queue: qn,
            unit: u.id,
            line: lineOf(node),
          });
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(e) &&
          ['add', 'addBulk'].includes(e.name.text) &&
          /queue/i.test(e.expression.getText())
        ) {
          let jobId = null;
          const opts = node.arguments[2];
          if (opts && ts.isObjectLiteralExpression(opts)) {
            const p = opts.properties.find(
              (pp) =>
                (ts.isPropertyAssignment(pp) ||
                  ts.isShorthandPropertyAssignment(pp)) &&
                pp.name.getText() === 'jobId',
            );
            if (p)
              jobId = ts.isShorthandPropertyAssignment(p)
                ? 'jobId (variável)'
                : clip(p.initializer.getText(), 80);
            else if (
              opts.properties.some(
                (pp) => ts.isSpreadAssignment(pp) && /jobId/.test(pp.getText()),
              )
            )
              jobId =
                'parâmetro jobId (montado pelos chamadores — ver tabela abaixo)';
          }
          const add = {
            unit: u.id,
            line: lineOf(node),
            call: `${clip(e.expression.getText(), 30)}.${e.name.text}(${clip(node.arguments[0]?.getText() ?? '', 30)})`,
            jobId,
          };
          u.queueAdds.push(add);
          QUEUES.push({
            kind: 'add',
            queue: add.call,
            unit: u.id,
            line: add.line,
            jobId,
          });
        }
        // dashboard → gateway (paths literais)
        if (u.file.startsWith('apps/dashboard/') && ts.isCallExpression(node)) {
          const nm = ts.isPropertyAccessExpression(e)
            ? e.name.text
            : ts.isIdentifier(e)
              ? e.text
              : null;
          const a0 = node.arguments[0];
          if (nm && DASH_HTTP.has(nm) && a0) {
            let p = null;
            if (ts.isStringLiteralLike(a0)) p = a0.text;
            else if (ts.isTemplateExpression(a0)) p = a0.getText().slice(1, -1);
            if (p && p.startsWith('/')) {
              u.dashHttp.add(`${nm} ${p}`);
              DASH_CALLS.push({ path: p, verb: nm, unit: u.id });
            }
          }
        }
        // chamada resolvida pelo type-checker
        const nameNode = ts.isPropertyAccessExpression(e)
          ? e.name
          : ts.isElementAccessExpression(e)
            ? e.argumentExpression
            : e;
        let sym = nameNode ? checker.getSymbolAtLocation(nameNode) : undefined;
        if (sym && sym.flags & ts.SymbolFlags.Alias)
          sym = checker.getAliasedSymbol(sym);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (decl) {
          const df = decl.getSourceFile();
          if (df && inProject(df.fileName)) {
            const nm = declName(decl);
            if (nm) {
              const tid = unitId(rel(df.fileName), nm);
              if (tid !== u.id && UNITS.has(tid)) {
                addEdge(CALLS, u.id, tid);
                addEdge(CALLERS, tid, u.id);
                const tfn = fnOfUnit(UNITS.get(tid).node);
                const ji = tfn?.parameters?.findIndex((pp) =>
                  /jobId/i.test(pp.name.getText()),
                );
                if (ji !== undefined && ji >= 0 && ts.isCallExpression(node))
                  JOBID_SITES.push({
                    caller: u.id,
                    target: tid,
                    line: lineOf(node),
                    arg: node.arguments[ji]
                      ? clip(node.arguments[ji].getText(), 90)
                      : '(omitido)',
                  });
              } else if (
                ts.isNewExpression(node) &&
                ts.isClassDeclaration(decl)
              ) {
                const cid = unitId(rel(df.fileName), `${nm}.constructor`);
                const target = UNITS.has(cid)
                  ? cid
                  : `${rel(df.fileName)}#new ${nm}`;
                addEdge(CALLS, u.id, target);
                addEdge(CALLERS, target, u.id);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    if (u.node) ts.forEachChild(u.node, visit);
    for (const v of u.env) {
      if (!ENV.has(v)) ENV.set(v, new Set());
      ENV.get(v).add(u.id);
    }
    for (const p of u.prisma) {
      const [model, op] = p.split(/\.(?=[^.]+$)/);
      if (!PRISMA.has(model)) PRISMA.set(model, new Map());
      const byOp = PRISMA.get(model);
      if (!byOp.has(op)) byOp.set(op, new Set());
      byOp.get(op).add(u.id);
    }
  }

  // imports reversos
  for (const f of FILES.values())
    for (const imp of f.imports) FILES.get(imp)?.importedBy.add(f.rel);
}

// ---------------------------------------------------------------- saída
function areaOf(fileRel) {
  let m;
  if ((m = /^apps\/gateway\/src\/modules\/([^/]+)\//.exec(fileRel)))
    return `gateway-${m[1]}`;
  if ((m = /^apps\/gateway\/src\/([^/]+)\//.exec(fileRel)))
    return `gateway-${m[1]}`;
  if (fileRel.startsWith('apps/gateway/src/')) return 'gateway-raiz';
  if (fileRel.startsWith('apps/gateway/test/')) return 'gateway-e2e';
  if (fileRel.startsWith('packages/contracts/')) return 'contracts';
  if (fileRel.startsWith('apps/dashboard/')) return 'dashboard';
  return 'outros';
}

function shortPath(fileRel) {
  return fileRel
    .replace(/^apps\/gateway\/src\//, '')
    .replace(/^apps\/gateway\//, 'gateway/')
    .replace(/^apps\/dashboard\/src\//, 'dashboard/')
    .replace(/^packages\/contracts\/src\//, 'contracts/');
}

function ref(id, fromFile) {
  const [file, name] = id.split('#');
  const u = UNITS.get(id);
  const line = u ? `:${u.line}` : '';
  if (file === fromFile) {
    const short = u?.className ? name.slice(u.className.length + 1) : name;
    return `\`${short}\`${line ? ` L${u.line}` : ''}`;
  }
  return `\`${name}\` (${path.posix.basename(file)}${line})`;
}

function refs(set, fromFile) {
  return [...(set ?? [])]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ref(id, fromFile))
    .join(', ');
}

function unitBlock(u, fromFile, indent = '') {
  const out = [];
  const shortName = u.className ? u.name.slice(u.className.length + 1) : u.name;
  const sig =
    u.kind === 'const'
      ? `\`${shortName}\` = \`${u.constValue ?? ''}\``
      : `\`${shortName}${u.params !== null ? `(${clip(u.params, 60)})` : ''}\``;
  const tags = [
    `L${u.line}`,
    ...u.mods,
    ...(u.kind === 'get' ? ['getter'] : []),
    ...(u.kind === 'prop' ? ['campo'] : []),
    ...u.decorators.map((d) =>
      d.args.length
        ? `@${d.name}(${clip(d.args.join(', '), 50)})`
        : `@${d.name}`,
    ),
  ];
  out.push(`${indent}- ${sig} · ${tags.join(' · ')}`);
  const sub = `${indent}  `;
  if (IMPLEMENTS.has(u.id))
    out.push(`${sub}- implementa: ${refs(IMPLEMENTS.get(u.id), fromFile)}`);
  if (IMPLEMENTED_BY.has(u.id))
    out.push(
      `${sub}- implementado por: ${refs(IMPLEMENTED_BY.get(u.id), fromFile)}`,
    );
  if (CALLS.has(u.id))
    out.push(`${sub}- chama: ${refs(CALLS.get(u.id), fromFile)}`);
  if (CALLERS.has(u.id))
    out.push(`${sub}- chamado por: ${refs(CALLERS.get(u.id), fromFile)}`);
  if (u.prisma.size)
    out.push(
      `${sub}- banco: ${[...u.prisma]
        .sort()
        .map((p) => `\`${p}\``)
        .join(', ')}`,
    );
  if (u.env.size)
    out.push(
      `${sub}- env: ${[...u.env]
        .sort()
        .map((p) => `\`${p}\``)
        .join(', ')}`,
    );
  if (u.publishes.size)
    out.push(
      `${sub}- publica evento: ${[...u.publishes].map((p) => `\`${clip(p, 60)}\``).join(', ')}`,
    );
  if (u.subscribes.size)
    out.push(
      `${sub}- assina evento: ${[...u.subscribes].map((p) => `\`${clip(p, 60)}\``).join(', ')}`,
    );
  for (const q of u.queueAdds)
    out.push(
      `${sub}- enfileira: \`${q.call}\` L${q.line}${q.jobId ? ` · jobId = \`${q.jobId}\`` : ' · sem jobId explícito'}`,
    );
  if (u.dashHttp.size)
    out.push(
      `${sub}- HTTP: ${[...u.dashHttp]
        .sort()
        .map((p) => `\`${clip(p, 70)}\``)
        .join(', ')}`,
    );
  return out;
}

function fileBlock(f) {
  const out = [];
  out.push(`## \`${shortPath(f.rel)}\``);
  out.push('');
  out.push(`${f.lines} linhas · caminho: \`${f.rel}\``);
  if (f.imports.length)
    out.push(
      `- importa (interno): ${f.imports.map((i) => `\`${shortPath(i)}\``).join(', ')}`,
    );
  if (f.importedBy.size)
    out.push(
      `- importado por: ${[...f.importedBy]
        .sort()
        .map((i) => `\`${shortPath(i)}\``)
        .join(', ')}`,
    );
  out.push('');
  if (f.isTest) {
    if (!f.tests.length) out.push('_(sem títulos de teste literais)_');
    for (const t of f.tests)
      out.push(
        `${'  '.repeat(t.depth)}- ${t.kind} “${clip(t.title, 110)}” · L${t.line}`,
      );
    out.push('');
    return out;
  }
  for (const m of f.modules) {
    out.push(`**@Module \`${m.name}\`** L${m.line}`);
    for (const [k, v] of Object.entries(m.wiring)) out.push(`- ${k}: \`${v}\``);
    out.push('');
  }
  for (const c of f.classes) {
    const decos = c.decorators.map((d) =>
      d.args.length
        ? `@${d.name}(${clip(d.args.join(', '), 60)})`
        : `@${d.name}`,
    );
    out.push(
      `**class \`${c.name}\`** L${c.line}${decos.length ? ` · ${decos.join(' · ')}` : ''}${c.heritage.length ? ` · ${c.heritage.map((h) => `\`${h}\``).join(', ')}` : ''}`,
    );
    if (c.di.length)
      out.push(
        `- injeta (construtor): ${c.di.map((d) => `\`${d}\``).join(' · ')}`,
      );
    for (const id of c.members) out.push(...unitBlock(UNITS.get(id), f.rel));
    out.push('');
  }
  if (f.functions.length) {
    out.push('**Funções e constantes de topo**');
    for (const id of f.functions) out.push(...unitBlock(UNITS.get(id), f.rel));
    out.push('');
  }
  for (const id of f.unitsTop) {
    const u = UNITS.get(id);
    if (CALLS.has(id) || u.env.size) {
      out.push('**Código de topo**');
      out.push(...unitBlock(u, f.rel));
      out.push('');
    }
  }
  if (f.types.length) {
    out.push('**Tipos**');
    for (const t of f.types) {
      if (t.kind === 'interface') {
        out.push(
          `- interface \`${t.name}\` L${t.line}${t.props ? ` · ${t.props} propriedade(s)` : ''}`,
        );
        for (const id of t.members)
          out.push(...unitBlock(UNITS.get(id), f.rel, '  '));
      } else if (t.kind === 'enum')
        out.push(
          `- enum \`${t.name}\` L${t.line}: ${t.values.map((v) => `\`${v}\``).join(', ')}`,
        );
      else out.push(`- type \`${t.name}\` L${t.line}`);
    }
    out.push('');
  }
  return out;
}

const AREA_TITLES = {
  'gateway-raiz': 'Gateway — raiz (main.ts, app.module.ts)',
  'gateway-bootstrap': 'Gateway — bootstrap (config, logs, adapter)',
  'gateway-infra': 'Gateway — infra (prisma, redis, storage, directory)',
  'gateway-shared-kernel': 'Gateway — shared-kernel',
  'gateway-types': 'Gateway — types',
  'gateway-e2e': 'Gateway — testes e2e (apps/gateway/test)',
  contracts: 'packages/contracts',
  dashboard: 'Dashboard (React)',
};

function render() {
  const files = new Map();
  const byArea = new Map();
  for (const f of FILES.values()) {
    const a = areaOf(f.rel);
    if (!byArea.has(a)) byArea.set(a, []);
    byArea.get(a).push(f);
  }
  const areas = [...byArea.keys()].sort();
  const HEAD =
    '<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->';
  for (const a of areas) {
    const list = byArea.get(a).sort((x, y) => x.rel.localeCompare(y.rel));
    const title =
      AREA_TITLES[a] ?? `Gateway — módulo \`${a.replace(/^gateway-/, '')}\``;
    const out = [HEAD, '', `# Mapa do código — ${title}`, ''];
    out.push(
      'Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker ' +
        '(chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma ' +
        '(`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.',
    );
    out.push('');
    out.push('| Arquivo | Linhas |');
    out.push('| --- | --- |');
    for (const f of list) out.push(`| \`${shortPath(f.rel)}\` | ${f.lines} |`);
    out.push('');
    for (const f of list) out.push(...fileBlock(f));
    files.set(
      `${a}.md`,
      `${out
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd()}\n`,
    );
  }

  // índice
  const idx = [HEAD, '', '# Mapa do código — índice', ''];
  idx.push(
    'Inventário determinístico gerado pelo compilador do TypeScript (type-checker). ' +
      'Relações de alto nível, fluxos e “onde mexer” por pendência: [MAPA-CODIGO.md](../../MAPA-CODIGO.md).',
  );
  idx.push('');
  idx.push(
    '- Regenerar: `node scripts/mapa-codigo.mjs` · conferir se está em dia: `node scripts/mapa-codigo.mjs --check`',
  );
  const nUnits = [...UNITS.values()].filter(
    (u) => u.kind !== 'toplevel',
  ).length;
  const nTests = [...FILES.values()].reduce(
    (s, f) =>
      s +
      f.tests.filter(
        (t) => t.kind.startsWith('it') || t.kind.startsWith('test'),
      ).length,
    0,
  );
  idx.push(
    `- ${FILES.size} arquivos · ${nUnits} símbolos (métodos/funções/assinaturas/constantes) · ${[...CALLS.values()].reduce((s, v) => s + v.size, 0)} chamadas resolvidas · ${nTests} testes (it/test)`,
  );
  idx.push('');
  idx.push('## Áreas');
  idx.push('');
  idx.push('| Área | Arquivos | Linhas | Mapa |');
  idx.push('| --- | --- | --- | --- |');
  for (const a of areas) {
    const list = byArea.get(a);
    idx.push(
      `| ${AREA_TITLES[a] ?? `módulo \`${a.replace(/^gateway-/, '')}\``} | ${list.length} | ${list.reduce((s, f) => s + f.lines, 0)} | [${a}.md](${a}.md) |`,
    );
  }
  idx.push('');
  idx.push('## Rotas HTTP (gateway)');
  idx.push('');
  idx.push('| Verbo | Rota | Handler | Decorators (guards/roles/etc.) |');
  idx.push('| --- | --- | --- | --- |');
  for (const r of ROUTES.sort(
    (a, b) => a.path.localeCompare(b.path) || a.verb.localeCompare(b.verb),
  )) {
    const u = UNITS.get(r.unit);
    idx.push(
      `| ${r.verb} | \`${r.path}\` | \`${u.name}\` (${path.posix.basename(u.file)}:${u.line}) | ${r.guards.map((g) => `\`${g.replace(/\|/g, '\\|')}\``).join(' ')} |`,
    );
  }
  idx.push('');
  idx.push('## Filas BullMQ');
  idx.push('');
  idx.push('| Tipo | Fila / chamada | Onde | jobId |');
  idx.push('| --- | --- | --- | --- |');
  for (const q of QUEUES.sort(
    (a, b) => a.unit.localeCompare(b.unit) || a.line - b.line,
  )) {
    const u = UNITS.get(q.unit);
    idx.push(
      `| ${q.kind} | \`${q.queue}\` | \`${u.name}\` (${path.posix.basename(u.file)}:${q.line}) | ${q.kind === 'add' ? (q.jobId ? `\`${q.jobId.replace(/\|/g, '\\|')}\`` : '—') : ''} |`,
    );
  }
  idx.push('');
  idx.push(
    '### jobId montado nos chamadores (regra do projeto: jobId do BullMQ NUNCA contém `:`)',
  );
  idx.push('');
  idx.push('| Chamador | Chama | Expressão do jobId |');
  idx.push('| --- | --- | --- |');
  for (const j of JOBID_SITES.sort(
    (a, b) => a.caller.localeCompare(b.caller) || a.line - b.line,
  )) {
    const cu = UNITS.get(j.caller);
    idx.push(
      `| \`${cu.name}\` (${path.posix.basename(cu.file)}:${j.line}) | \`${UNITS.get(j.target).name}\` | \`${j.arg.replace(/\|/g, '\\|')}\` |`,
    );
  }
  idx.push('');
  idx.push('## Eventos do EventBus');
  idx.push('');
  idx.push('| Evento (`name`) | Publicado por | Assinado por |');
  idx.push('| --- | --- | --- |');
  const evNames = new Set([
    ...EVENTS.publish.map((e) => e.name),
    ...EVENTS.subscribe.map((e) => e.name),
  ]);
  for (const n of [...evNames].sort()) {
    const pubs = EVENTS.publish
      .filter((e) => e.name === n)
      .map(
        (e) =>
          `\`${UNITS.get(e.unit).name}\` (${path.posix.basename(UNITS.get(e.unit).file)}:${e.line})`,
      );
    const subs = EVENTS.subscribe
      .filter((e) => e.name === n)
      .map(
        (e) =>
          `\`${UNITS.get(e.unit).name}\` (${path.posix.basename(UNITS.get(e.unit).file)}:${e.line})`,
      );
    idx.push(
      `| \`${clip(n, 60).replace(/\|/g, '\\|')}\` | ${[...new Set(pubs)].join(', ') || '—'} | ${[...new Set(subs)].join(', ') || '—'} |`,
    );
  }
  idx.push('');
  idx.push('## Banco (Prisma) — quem lê e quem escreve');
  idx.push('');
  idx.push('| Modelo / tabela | Escrita | Leitura |');
  idx.push('| --- | --- | --- |');
  for (const model of [...PRISMA.keys()].sort()) {
    const byOp = PRISMA.get(model);
    const w = new Set();
    const r = new Set();
    for (const [op, ids] of byOp)
      for (const id of ids)
        (PRISMA_WRITE.test(op) || /execute/i.test(op) ? w : r).add(
          `\`${UNITS.get(id).name}\``,
        );
    idx.push(
      `| \`${model}\` | ${[...w].sort().join(', ') || '—'} | ${[...r].sort().join(', ') || '—'} |`,
    );
  }
  idx.push('');
  idx.push('## Variáveis de ambiente — onde são lidas');
  idx.push('');
  idx.push('| Variável | Lida em |');
  idx.push('| --- | --- |');
  for (const v of [...ENV.keys()].sort())
    idx.push(
      `| \`${v}\` | ${[...ENV.get(v)]
        .sort()
        .map(
          (id) =>
            `\`${UNITS.get(id).name}\` (${path.posix.basename(UNITS.get(id).file)})`,
        )
        .join(', ')} |`,
    );
  idx.push('');
  idx.push('## Dashboard → gateway (caminhos literais chamados pelo painel)');
  idx.push('');
  idx.push('| Chamada | Componente/função |');
  idx.push('| --- | --- |');
  for (const c of DASH_CALLS.sort(
    (a, b) => a.path.localeCompare(b.path) || a.unit.localeCompare(b.unit),
  ))
    idx.push(
      `| \`${c.verb} ${clip(c.path, 70).replace(/\|/g, '\\|')}\` | \`${UNITS.get(c.unit).name}\` (${path.posix.basename(UNITS.get(c.unit).file)}:${UNITS.get(c.unit).line}) |`,
    );
  idx.push('');
  files.set(
    'README.md',
    `${idx
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd()}\n`,
  );
  return files;
}

for (const p of PROJECTS) analyzeProgram(p);
const outputs = render();

if (CHECK) {
  const stale = [];
  const existing = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : [];
  for (const [name, content] of outputs) {
    const p = path.join(OUT_DIR, name);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content)
      stale.push(name);
  }
  for (const name of existing)
    if (!outputs.has(name)) stale.push(`${name} (sobrando)`);
  if (stale.length) {
    console.error(
      `mapa-codigo DESATUALIZADO: ${stale.join(', ')}\nRode: node scripts/mapa-codigo.mjs`,
    );
    process.exit(1);
  }
  console.log(`mapa-codigo em dia (${outputs.size} arquivos).`);
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const name of fs.readdirSync(OUT_DIR))
    if (name.endsWith('.md') && !outputs.has(name))
      fs.rmSync(path.join(OUT_DIR, name));
  for (const [name, content] of outputs)
    fs.writeFileSync(path.join(OUT_DIR, name), content);
  console.log(
    `mapa-codigo: ${outputs.size} arquivos em ${rel(OUT_DIR)} · ${FILES.size} fontes · ${UNITS.size} símbolos · ${ROUTES.length} rotas`,
  );
}
