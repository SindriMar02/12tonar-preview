/* Viewport-by-viewport visual walk.
 *
 * This page is built on SCRUBBED reveals, so a full-page screenshot is worthless:
 * returning to the top correctly drives every reveal back to 0, which looks exactly
 * like a page of broken sections. The authoritative visual review eases to each depth
 * in several hops so the damped channels track a real read, settles, then captures.
 *
 *   node qa/walk.mjs                      1440x900, motion on
 *   W=390 H=844 OUT=walk-mob node qa/walk.mjs
 *   RM=1 OUT=walk-rm node qa/walk.mjs     completeness check
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.URL || 'http://localhost:8843/';
const W = Number(process.env.W) || 1440;
const H = Number(process.env.H) || 900;
const RM = process.env.RM === '1';
const OUT = join(here, process.env.OUT || 'walk');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  /* a dedicated profile: never touch the user's own, never kill their browser */
  userDataDir: '/private/tmp/claude-501/t12-qa-profile',
  args: [`--window-size=${W},${H}`, '--hide-scrollbars', '--force-device-scale-factor=1',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, hasTouch: W < 760, isMobile: W < 760 });
if (RM) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

/* window.scrollTo ANIMATES when the page sets smooth scrolling, so every probe would
   sample a mid-flight position. Fix the harness, never the page. */
await page.evaluateOnNewDocument(() => {
  const kill = () => { if (document.documentElement) document.documentElement.style.scrollBehavior = 'auto'; };
  kill();
  document.addEventListener('DOMContentLoaded', kill);
});

await page.goto(URL_, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 900));

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const steps = Math.ceil(total / (H * 0.92));
console.log(`page ${total}px · ${steps} frames · ${W}x${H}${RM ? ' · reduced-motion' : ''}`);

let prev = 0;
for (let i = 0; i < steps; i++) {
  const y = Math.min(Math.round(i * H * 0.92), total - H);
  for (let h = 1; h <= 6; h++) {
    const yy = Math.round(prev + ((y - prev) * h) / 6);
    await page.evaluate((v) => window.scrollTo(0, v), yy);
    await new Promise((r) => setTimeout(r, 70));
  }
  prev = y;
  await new Promise((r) => setTimeout(r, 700)); /* >= 6 tau */
  await page.screenshot({ path: join(OUT, `${String(i).padStart(2, '0')}-y${y}.jpg`), type: 'jpeg', quality: 84 });
  process.stdout.write(`  ${i} @${y}\n`);
}

await writeFile(join(OUT, 'meta.json'), JSON.stringify({ URL_, W, H, RM, total, steps }, null, 1));
await browser.close();
console.log(`wrote ${steps} frames to ${OUT}`);
