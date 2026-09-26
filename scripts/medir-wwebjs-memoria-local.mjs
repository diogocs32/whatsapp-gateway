// Comparação reproduzível das flags da E6 em Chromium isolado, sem WA, login ou perfil real.
// node scripts/medir-wwebjs-memoria-local.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const common = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-accelerated-2d-canvas',
  '--disable-extensions',
  '--disable-component-update',
  '--disable-sync',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
];

function rssTree(root) {
  try {
    const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/).map(Number));
    const descendants = new Set([root]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [pid, ppid] of rows) {
        if (descendants.has(ppid) && !descendants.has(pid)) {
          descendants.add(pid);
          changed = true;
        }
      }
    }
    return rows
      .filter(([pid]) => descendants.has(pid))
      .reduce((sum, [, , rssKb]) => sum + rssKb * 1024, 0);
  } catch {
    return null;
  }
}

function pssTree(root) {
  try {
    const seen = new Set();
    const visit = (pid) => {
      if (seen.has(pid)) return;
      seen.add(pid);
      const children = readFileSync(
        `/proc/${pid}/task/${pid}/children`,
        'utf8',
      ).trim();
      for (const child of children.split(/\s+/).filter(Boolean))
        visit(Number(child));
    };
    visit(root);
    let kb = 0;
    for (const pid of seen) {
      const match = /^Pss:\s+(\d+) kB/m.exec(
        readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'),
      );
      kb += Number(match?.[1] ?? 0);
    }
    return kb * 1024;
  } catch {
    return null;
  }
}

async function measure(name, extraArgs) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.WWEBJS_CHROME_PATH || puppeteer.executablePath(),
    args: [...common, ...extraArgs],
  });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const cdp = await page.createCDPSession();
    let indexedDbBytes = null;
    try {
      const usage = await cdp.send('Storage.getUsageAndQuota', {
        origin: 'https://web.whatsapp.com',
      });
      indexedDbBytes =
        usage.usageBreakdown.find((entry) => entry.storageType === 'indexeddb')
          ?.usage ?? 0;
    } catch {
      /* origem sem login pode não ter storage */
    }
    await cdp.detach();
    const pid = browser.process()?.pid;
    const metrics = await page.metrics();
    return {
      name,
      chromiumVersion: await browser.version(),
      pid,
      jsHeapUsedBytes: metrics.JSHeapUsedSize ?? null,
      chromiumPssBytes: pid ? pssTree(pid) : null,
      chromiumRssSumBytes: pid ? rssTree(pid) : null,
      indexedDbBytes,
    };
  } finally {
    await browser.close();
  }
}

const before = await measure('antes', [
  '--disable-software-rasterizer',
  '--js-flags=--max-old-space-size=512,--max-semi-space-size=64',
  '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints,AcceptCHFrame,CalculateNativeWinOcclusion',
]);
const after = await measure('depois', [
  '--js-flags=--max-old-space-size=512',
  '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints,AcceptCHFrame,CalculateNativeWinOcclusion,SpareRendererForSitePerProcess',
]);
process.stdout.write(
  `${JSON.stringify({ date: new Date().toISOString(), page: 'about:blank', before, after }, null, 2)}\n`,
);
