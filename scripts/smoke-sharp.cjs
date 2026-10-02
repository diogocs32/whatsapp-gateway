// P-105: executar a partir de apps/gateway, inclusive após prune na imagem final.
// Só imagens sintéticas; nenhum socket, conta ou recurso externo.
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const gatewayRequire = createRequire(resolve('package.json'));
const sharp = gatewayRequire('sharp');

function atLeast(actual, minimum) {
  assert.match(
    actual ?? '',
    /^\d+\.\d+\.\d+$/,
    'versão nativa ausente/inválida',
  );
  const parts = actual.split('.').map(Number);
  for (let i = 0; i < minimum.length; i++) {
    if (parts[i] !== minimum[i]) return parts[i] > minimum[i];
  }
  return true;
}

async function checkJpeg(buffer, width, height) {
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  // A imagem vermelha precisa ser decodificada, além de ter cabeçalho JPEG válido.
  assert.ok(
    data[0] > 200 && data[1] < 40 && data[2] < 40,
    'pixels JPEG incorretos',
  );
}

async function main() {
  assert.ok(
    atLeast(sharp.versions.sharp, [0, 35, 5]),
    'sharp anterior ao fix P-105',
  );
  assert.ok(
    atLeast(sharp.versions.rsvg, [2, 63, 2]),
    'librsvg anterior ao fix P-105',
  );
  const { extractImageThumb, generateProfilePicture, generateThumbnail } =
    await import(gatewayRequire.resolve('@whiskeysockets/baileys'));
  const png = await sharp({
    create: { width: 96, height: 48, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">' +
      '<rect width="80" height="40" fill="#ff0000"/></svg>',
  );
  const dir = await mkdtemp(join(tmpdir(), 'conexozenvo-sharp-'));
  try {
    for (const [name, input, width, height] of [
      ['png', png, 96, 48],
      ['svg', svg, 80, 40],
    ]) {
      const thumbnail = await extractImageThumb(input);
      assert.deepEqual(thumbnail.original, { width, height });
      await checkJpeg(thumbnail.buffer, 32, 16);
      const profile = await generateProfilePicture(input, {
        width: 64,
        height: 64,
      });
      await checkJpeg(profile.img, 64, 64);
      const file = join(dir, `fixture.${name}`);
      await writeFile(file, input);
      const message = await generateThumbnail(file, 'image', {});
      assert.deepEqual(message.originalImageDimensions, { width, height });
      assert.ok(message.thumbnail, 'miniatura da mensagem ausente');
      await checkJpeg(Buffer.from(message.thumbnail, 'base64'), 32, 16);
    }
    console.log(
      JSON.stringify({
        smoke: 'sharp/Baileys PNG e SVG: 6 efeitos JPEG/dimensões/pixels OK',
        platform: process.platform,
        arch: process.arch,
        node: process.versions.node,
        glibc: process.report.getReport().header.glibcVersionRuntime ?? null,
        sharp: sharp.versions.sharp,
        rsvg: sharp.versions.rsvg,
        vips: sharp.versions.vips,
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
