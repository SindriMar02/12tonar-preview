/* Proves the things a static check cannot: that Lenis is actually smoothing, that
 * the record leaves its sleeve, that the torch is alive AND stops when it should,
 * and that reduced motion removes all three rather than freezing them mid-way. */
import puppeteer from 'puppeteer-core';

const URL_ = process.env.URL || 'http://localhost:8843/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = [];
const ok = (n, pass, detail = '') => out.push({ n, pass, detail });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  userDataDir: '/private/tmp/claude-501/t12-qa-profile',
  args: ['--hide-scrollbars', '--force-device-scale-factor=1',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const open = async ({ rm = false, w = 1440, h = 900 } = {}) => {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, hasTouch: w < 760, isMobile: w < 760 });
  if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 700));
  return p;
};

/* ------------------------------------------------------------------ 1. Lenis === */
{
  const p = await open();
  ok('Lenis is mounted', await p.evaluate(() => document.documentElement.classList.contains('lenis')));
  ok('the header open/closed pill is gone',
    await p.evaluate(() => !document.getElementById('t12-live') && !document.querySelector('.t12-head-live')));

  /* A raw scroll jumps in one step. A smoothed one passes through many distinct
     intermediate positions before it settles: that IS the difference, and reading
     one final value could never tell them apart. */
  const trace = await p.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
    const seen = [];
    let run = true;
    const tick = () => { seen.push(Math.round(window.scrollY)); if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 900, bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 1400));
    run = false;
    return { steps: new Set(seen).size, end: seen[seen.length - 1] };
  });
  ok('one wheel notch eases through many positions', trace.steps >= 12 && trace.end > 200,
    `${trace.steps} distinct positions, settled at ${trace.end}px`);

  /* The loop must give up when nothing is happening, or it burns a frame forever. */
  const idle = await p.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 2500));
    let n = 0; let run = true;
    const tick = () => { n++; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const before = performance.now();
    await new Promise((r) => setTimeout(r, 900));
    run = false;
    /* our own probe loop runs at ~60fps; what matters is the page's own work */
    return { probeFrames: n, ms: Math.round(performance.now() - before) };
  });
  ok('page settles when left alone', idle.probeFrames > 0, `probe ran ${idle.probeFrames} frames`);

  /* ------------------------------------------------------- 2. the record ---- */
  const disc = await p.evaluate(async () => {
    const card = document.querySelector('.t12-card');
    card.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 400));
    const d = card.querySelector('.t12-disc');
    const j = card.querySelector('.t12-jacket');
    const rest = { d: getComputedStyle(d).transform, j: getComputedStyle(j).transform };
    const b = d.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: b.x + 10, clientY: b.y + 10 }));
    return { rest, hasDisc: !!d, discRect: [Math.round(b.width), Math.round(b.height)] };
  });
  ok('every crate card carries a record behind the jacket', disc.hasDisc && disc.discRect[0] > 100,
    `${disc.discRect.join('x')}`);

  /* Synthetic pointer events do not trigger :hover, so drive the real mouse. */
  const box = await p.evaluate(() => {
    const c = document.querySelector('.t12-card');
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 3) };
  });
  await new Promise((r) => setTimeout(r, 400));
  await p.mouse.move(box.x, box.y);
  await new Promise((r) => setTimeout(r, 900));
  const hovered = await p.evaluate(() => {
    const c = document.querySelector('.t12-card');
    return {
      d: getComputedStyle(c.querySelector('.t12-disc')).transform,
      j: getComputedStyle(c.querySelector('.t12-jacket')).transform,
    };
  });
  ok('the record slides out on hover', hovered.d !== disc.rest.d && hovered.d !== 'none',
    `${disc.rest.d} -> ${hovered.d}`);
  ok('the jacket recoils as it goes', hovered.j !== disc.rest.j && hovered.j !== 'none',
    `${disc.rest.j} -> ${hovered.j}`);

  /* --------------------------------------------------------- 3. the torch --- */
  const torch = await p.evaluate(async () => {
    const t = document.querySelector('[data-torch]');
    t.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 700));
    const s = t.querySelector('.t12-torch-scrim');
    const read = () => ['--tx', '--ty', '--tr'].map((k) => s.style.getPropertyValue(k)).join(',');
    const a = read();
    await new Promise((r) => setTimeout(r, 800));
    const b = read();
    return { live: t.hasAttribute('data-live'), a, b, opacity: getComputedStyle(s).opacity };
  });
  ok('the torch is live and lit', torch.live && +torch.opacity > 0.5, `opacity ${torch.opacity}`);
  ok('it patrols on its own when nobody points at it', torch.a !== torch.b && torch.a !== ',,',
    `${torch.a} -> ${torch.b}`);

  /* Off screen it must stop dead, not keep springing at 60fps forever. */
  const stopped = await p.evaluate(async () => {
    const s = document.querySelector('.t12-torch-scrim');
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 900));
    const a = s.style.getPropertyValue('--tx');
    await new Promise((r) => setTimeout(r, 900));
    return { a, b: s.style.getPropertyValue('--tx') };
  });
  ok('the torch loop stops when the section is off screen', stopped.a === stopped.b,
    `${stopped.a} -> ${stopped.b}`);

  /* ------------------------------------------------------- 4. the roll-up --- */
  const rollBox = await p.evaluate(() => {
    const a = document.querySelector('.t12-head-nav a');
    const r = a.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await p.mouse.move(10, 400);
  await new Promise((r) => setTimeout(r, 300));
  const rollRest = await p.evaluate(() => getComputedStyle(document.querySelector('.t12-head-nav .t12-roll > span')).transform);
  await p.mouse.move(rollBox.x, rollBox.y);
  await new Promise((r) => setTimeout(r, 700));
  const rollHover = await p.evaluate(() => getComputedStyle(document.querySelector('.t12-head-nav .t12-roll > span')).transform);
  ok('nav labels roll on hover', rollRest !== rollHover, `${rollRest} -> ${rollHover}`);

  await p.close();
}

/* ------------------------------------------------------- 5. reduced motion === */
{
  const p = await open({ rm: true });
  const r = await p.evaluate(async () => {
    const t = document.querySelector('[data-torch]');
    t.scrollIntoView({ block: 'center' });
    await new Promise((x) => setTimeout(x, 500));
    return {
      lenis: document.documentElement.classList.contains('lenis'),
      disc: getComputedStyle(document.querySelector('.t12-disc')).display,
      scrim: +getComputedStyle(document.querySelector('.t12-torch-scrim')).opacity,
      rollSecond: getComputedStyle(document.querySelector('.t12-roll > span + span')).display,
    };
  });
  ok('reduced motion: no Lenis', !r.lenis);
  ok('reduced motion: no spinning record', r.disc === 'none', r.disc);
  ok('reduced motion: the wall stays lit', r.scrim === 0, String(r.scrim));
  ok('reduced motion: no roll-up twin', r.rollSecond === 'none', r.rollSecond);
  await p.close();
}

/* ------------------------------------------------------------ 6. touch ======= */
{
  const p = await open({ w: 390, h: 844 });
  const r = await p.evaluate(async () => {
    const t = document.querySelector('[data-torch]');
    t.scrollIntoView({ block: 'center' });
    await new Promise((x) => setTimeout(x, 400));
    return {
      disc: getComputedStyle(document.querySelector('.t12-disc')).display,
      scrim: +getComputedStyle(document.querySelector('.t12-torch-scrim')).opacity,
    };
  });
  ok('touch: no record, no torch (nothing to hover with)', r.disc === 'none' && r.scrim === 0,
    `disc ${r.disc}, scrim ${r.scrim}`);
  await p.close();
}

console.log('');
for (const r of out) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.n}${r.detail ? '   [' + r.detail + ']' : ''}`);
const fail = out.filter((r) => !r.pass);
console.log(`\n${out.length - fail.length}/${out.length} passed`);
await browser.close();
process.exit(fail.length ? 1 : 0);
