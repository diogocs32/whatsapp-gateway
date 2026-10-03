// P-106: executar em apps/gateway, também após prune na imagem final.
// Somente padrões pequenos e ZIP gerado em memória; nenhum Client/rede/extração.
const assert = require('node:assert/strict');
const { mkdir, mkdtemp, rm, writeFile } = require('node:fs/promises');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

async function zipBuffer(archiver, configure) {
  const archive = archiver('zip');
  const chunks = [];
  const completed = new Promise((accept, reject) => {
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.once('end', accept);
    archive.once('error', reject);
    archive.once('warning', reject);
  });
  // A conclusão pode rejeitar antes de finalize; manter sempre um observador.
  completed.catch(() => {});
  try {
    configure(archive);
    await Promise.all([archive.finalize(), completed]);
    return Buffer.concat(chunks);
  } catch (error) {
    archive.abort();
    archive.destroy();
    throw error;
  }
}

async function checkZip(unzipper, buffer, files, directories = []) {
  const opened = await unzipper.Open.buffer(buffer);
  assert.deepEqual(
    opened.files.map((entry) => entry.path).sort(),
    [...files, ...directories].sort(),
    'nomes ZIP incorretos',
  );
  for (const entry of opened.files) {
    if (directories.includes(entry.path)) {
      assert.equal(entry.type, 'Directory');
    } else {
      assert.equal(entry.type, 'File');
      assert.equal(
        (await entry.buffer()).toString(),
        `content:${entry.path}`,
        'conteúdo ZIP incorreto',
      );
    }
  }
}

async function main() {
  const gatewayRequire = createRequire(resolve('package.json'));
  const wwebjsRequire = createRequire(
    gatewayRequire.resolve('whatsapp-web.js'),
  );
  const archiverRequire = createRequire(wwebjsRequire.resolve('archiver'));
  const utilsRequire = createRequire(archiverRequire.resolve('archiver-utils'));
  const readdirRequire = createRequire(archiverRequire.resolve('readdir-glob'));
  const globRequire = createRequire(utilsRequire.resolve('glob'));
  const parents = [globRequire, readdirRequire];
  const paths = [];
  const versions = [];
  const pattern = '{alpha,{beta,gamma}}-{1..2}.txt';
  const expanded = [
    'alpha-1.txt',
    'alpha-2.txt',
    'beta-1.txt',
    'beta-2.txt',
    'gamma-1.txt',
    'gamma-2.txt',
  ];
  for (const [index, parent] of parents.entries()) {
    const minimatchRequire = createRequire(parent.resolve('minimatch'));
    const version = minimatchRequire('brace-expansion/package.json').version;
    assert.match(version, /^2\.\d+\.\d+$/, 'brace-expansion fora da linha 2');
    const [, minor, patch] = version.split('.').map(Number);
    assert.ok(
      minor > 1 || (minor === 1 && patch >= 7),
      'brace-expansion anterior ao fix P-106',
    );
    const parentVersion = parent('minimatch/package.json').version;
    assert.match(parentVersion, index === 0 ? /^9\./ : /^5\./);
    paths.push(minimatchRequire.resolve('brace-expansion'));
    versions.push({ minimatch: parentVersion, braceExpansion: version });
    const minimatch = parent('minimatch');
    const match = minimatch.minimatch ?? minimatch;
    assert.deepEqual(minimatch.braceExpand(pattern), expanded);
    assert.deepEqual(minimatch.braceExpand('x{03..01}.txt'), [
      'x03.txt',
      'x02.txt',
      'x01.txt',
    ]);
    assert.deepEqual(minimatch.braceExpand('literal\\{a,b\\}.txt'), [
      'literal{a,b}.txt',
    ]);
    assert.deepEqual(minimatch.braceExpand('{alpha,beta'), ['{alpha,beta']);
    for (const name of expanded) assert.equal(match(name, pattern), true);
    for (const name of ['delta-1.txt', 'alpha-3.txt', 'alpha-1.csv']) {
      assert.equal(match(name, pattern), false);
    }
    assert.equal(match('literal{a,b}.txt', 'literal\\{a,b\\}.txt'), true);
  }
  assert.notEqual(paths[0], paths[1], 'as duas cópias devem ser distintas');

  const archiver = wwebjsRequire('archiver');
  const utils = archiverRequire('archiver-utils');
  const readdirGlob = archiverRequire('readdir-glob');
  const unzipper = wwebjsRequire('unzipper');
  const dir = await mkdtemp(join(tmpdir(), 'conexozenvo-brace-'));
  try {
    const files = [
      ...expanded,
      'skip.txt',
      'literal{a,b}.txt',
      '.hidden',
      'nested/deep.txt',
    ];
    await mkdir(join(dir, 'nested'));
    await Promise.all(
      files.map((name) => writeFile(join(dir, name), `content:${name}`)),
    );
    const expected = expanded.filter((name) => name !== 'beta-2.txt');
    assert.deepEqual(
      utils.file
        .expand({ cwd: dir, nodir: true }, [pattern, '!beta-2.txt'])
        .sort(),
      expected,
      'seleção archiver-utils/glob/minimatch9 incorreta',
    );
    const matches = await new Promise((accept, reject) => {
      readdirGlob(
        dir,
        { pattern, ignore: 'beta-2.txt', nodir: true },
        (error, names) => {
          if (error) reject(error);
          else accept(names);
        },
      );
    });
    assert.deepEqual(
      matches.sort(),
      expected,
      'seleção readdir-glob/minimatch5 incorreta',
    );
    await checkZip(
      unzipper,
      await zipBuffer(archiver, (archive) =>
        archive.glob(pattern, { cwd: dir, ignore: 'beta-2.txt' }),
      ),
      expected,
    );
    await checkZip(
      unzipper,
      await zipBuffer(archiver, (archive) => archive.directory(dir, false)),
      files,
      ['nested/'],
    );
    console.log(
      JSON.stringify({
        smoke:
          'brace-expansion: duas cadeias, seleção e ZIP/conteúdo/directory OK',
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch,
        versions,
        filesSelected: expected.length,
        directoryFiles: files.length,
      }),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
