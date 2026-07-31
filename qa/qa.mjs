/* The 12 Tónar QA harness. One browser, every check.
 *
 *   node qa/qa.mjs            (server must be running; URL=… to override)
 *
 * Checks that exist because the same bug shipped before:
 *  - upscale ratio per image, because the whole design rests on "never bigger than its
 *    own pixels" and a CSS change can quietly break that
 *  - scrub REVERSIBILITY, because a one-shot reveal also shows intermediate values and
 *    "it animates" proves nothing
 *  - the crate's scroll ratio, because content that trails the finger is the single
 *    loudest complaint this build's predecessor drew
 *  - a no-JS render, because `body{overflow:hidden}` behind a dead loader has shipped
 *  - focus reachability under scrubbed opacity, invisible to every other check
 */
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.URL || 'http://localhost:8843/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const ok = (n, pass, detail = '') => { results.push({ n, pass, detail }); };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: '/private/tmp/claude-501/t12-qa-profile',
  args: ['--hide-scrollbars', '--force-device-scale-factor=1',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const newPage = async ({ w = 1440, h = 900, dpr = 1, rm = false, js = true } = {}) => {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, hasTouch: w < 760, isMobile: w < 760 });
  if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (!js) await p.setJavaScriptEnabled(false);
  /* window.scrollTo animates when the page sets smooth scrolling, so every probe would
     sample a mid-flight position. Fix the harness, never the page. */
  await p.evaluateOnNewDocument(() => {
    const kill = () => { if (document.documentElement) document.documentElement.style.scrollBehavior = 'auto'; };
    kill(); document.addEventListener('DOMContentLoaded', kill);
  });
  await p.goto(URL_, { waitUntil: 'load' });
  if (js) { await p.evaluate(() => document.fonts.ready); }
  await new Promise((r) => setTimeout(r, 700));
  return p;
};

const walkPage = async (p) => {
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = p.viewport().height;
  for (let y = 0; y < total; y += Math.round(vh * 0.7)) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await new Promise((r) => setTimeout(r, 90));
  }
  await new Promise((r) => setTimeout(r, 500));
};

/* ======================================================= 1. structure + assets ==== */
{
  const p = await newPage();
  await walkPage(p);
  const r = await p.evaluate(() => {
    const imgs = [...document.images];
    const dpr = devicePixelRatio;
    const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.currentSrc.split('/').pop());
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc);
    const up = imgs
      .filter((i) => i.naturalWidth > 0 && i.getBoundingClientRect().width > 0)
      .map((i) => ({
        f: i.currentSrc.split('/').pop(),
        r: +((i.getBoundingClientRect().width * dpr) / i.naturalWidth).toFixed(3),
      }))
      .sort((a, b) => b.r - a.r);
    const dashes = (document.body.innerText.match(/[—–]/g) || []).length;
    const h1 = document.querySelector('h1');
    return {
      sections: document.querySelectorAll('main > section').length,
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length,
      h1Name: h1 && h1.getAttribute('aria-label'),
      imgs: imgs.length, noAlt, broken, dashes,
      worstUp: up.slice(0, 3),
      headings: [...document.querySelectorAll('.t12-h2')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()),
      grids: document.querySelectorAll('.t12-grid').length,
      lang: document.documentElement.lang,
      title: document.title,
    };
  });
  ok('sections 9 + h1 1 + h2 8', r.sections === 9 && r.h1 === 1 && r.h2 === 8, `${r.sections}/${r.h1}/${r.h2}`);
  ok('h1 accessible name', r.h1Name === '12 Tónar', r.h1Name);
  ok('every image has alt', r.noAlt.length === 0, r.noAlt.join(', '));
  ok('no broken images', r.broken.length === 0, r.broken.join(', '));
  ok('no em/en dashes in copy', r.dashes === 0, String(r.dashes));
  ok('no image upscaled past 1.05x', r.worstUp.every((x) => x.r <= 1.05), JSON.stringify(r.worstUp));
  ok('split headings keep word spacing', r.headings.every((h) => !/[a-záðéíóúýþæö][A-ZÁÐÉÍÓÚÝÞÆÖ]/.test(h)), r.headings.find((h) => /[a-záðéíóúýþæö][A-ZÁÐÉÍÓÚÝÞÆÖ]/.test(h)) || '');
  ok('lang=is', r.lang === 'is', r.lang);
  ok('one grid rule per section + footer', r.grids === 10, String(r.grids));

  /* ---- scrub reversibility: settle, sample, move away, return, compare ---- */
  const sel = '.t12-numgrid li';
  const read = async () => p.evaluate((s) => {
    const el = document.querySelector(s);
    return +(getComputedStyle(el).getPropertyValue('--rv') || 1);
  }, sel);
  const anchor = await p.evaluate((s) => {
    const el = document.querySelector(s);
    let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return Math.round(y - innerHeight * 0.75);
  }, sel);
  await p.evaluate((v) => window.scrollTo(0, v), anchor);
  await new Promise((r) => setTimeout(r, 900)); /* >= 6 tau before recording a baseline */
  const a1 = await read();
  await p.evaluate((v) => window.scrollTo(0, v), anchor + 900);
  await new Promise((r) => setTimeout(r, 900));
  const b = await read();
  await p.evaluate((v) => window.scrollTo(0, v), anchor);
  await new Promise((r) => setTimeout(r, 900));
  const a2 = await read();
  ok('reveals are scrubbed and reversible', b > a1 + 0.15 && Math.abs(a2 - a1) < 0.05,
    `${a1.toFixed(3)} -> ${b.toFixed(3)} -> ${a2.toFixed(3)}`);

  /* ---- the crate moves at exactly 1.00x a pointer drag ---- */
  const ratio = await p.evaluate(async () => {
    const c = document.querySelector('.t12-crate');
    c.scrollLeft = 0;
    const box = c.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const x0 = box.left + box.width / 2;
    const fire = (t, x) => c.dispatchEvent(new PointerEvent(t, {
      bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, button: 0, buttons: 1,
    }));
    c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
    fire('pointerdown', x0);
    fire('pointermove', x0 - 200);
    const moved = c.scrollLeft;
    fire('pointerup', x0 - 200);
    return +(moved / 200).toFixed(3);
  });
  ok('crate drag ratio is 1.00x', Math.abs(ratio - 1) < 0.01, String(ratio));

  /* ---- no per-frame custom property on the root element ---- */
  const rootProps = await p.evaluate(async () => {
    const seen = new Set();
    const mo = new MutationObserver((m) => m.forEach((x) => {
      if (x.target === document.documentElement || x.target === document.body) seen.add(x.attributeName);
    }));
    mo.observe(document.documentElement, { attributes: true });
    mo.observe(document.body, { attributes: true });
    for (let i = 0; i < 24; i++) { window.scrollBy(0, 40); await new Promise((r) => requestAnimationFrame(r)); }
    mo.disconnect();
    return { attrs: [...seen], inline: document.documentElement.getAttribute('style') || '' };
  });
  ok('no custom property written to <html>', !/--/.test(rootProps.inline), rootProps.inline.slice(0, 80));

  /* ---- the wordmark is painted by an image, so measure it from real pixels ----
     A computed-style checker scores color:transparent as 1:1 and calls a perfectly
     legible headline a failure. What actually matters is the worst (lightest) pixel
     inside the glyphs against the plate it sits on. */
  await p.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  const clip = await p.evaluate(() => {
    const b = document.querySelector('.t12-mark-fill').getBoundingClientRect();
    return { x: Math.round(b.x + 6), y: Math.round(b.y + 6), width: Math.round(b.width - 12), height: Math.round(b.height - 12) };
  });
  const shot = join(here, '_mark.png');
  await p.screenshot({ path: shot, clip });
  const txt = execFileSync('magick', [shot, '-colors', '48', '-format', '%c', 'histogram:info:'], { encoding: 'utf8' });
  const px = txt.trim().split('\n').map((l) => {
    const m = l.match(/^\s*(\d+):.*#([0-9A-F]{6})/);
    return m ? { n: +m[1], hex: m[2] } : null;
  }).filter(Boolean);
  const lum = (hex) => {
    const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const cr = (a, b2) => { const [x, y] = [a, b2].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const plate = lum('F9F500');
  /* Glyph pixels are everything that is not the yellow plate. */
  const glyph = px.filter((q) => cr(lum(q.hex), plate) > 1.35);
  const total = glyph.reduce((s, q) => s + q.n, 0);
  /* Ignore the lightest 3% (antialiased glyph edges and the odd white sleeve corner). */
  let acc = 0;
  const sorted = glyph.sort((a, b2) => lum(b2.hex) - lum(a.hex));
  let worst = 21;
  for (const q of sorted) { acc += q.n; if (acc / total > 0.03) { worst = cr(lum(q.hex), plate); break; } }
  ok('hero wordmark contrast on the plate >= 3:1', worst >= 3, `${worst.toFixed(2)}:1 over ${total} glyph px`);

  /* ---- keyboard: nothing focusable is left invisible by a scrubbed reveal ---- */
  await p.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
  const faint = [];
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press('Tab');
    const v = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      let o = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= +getComputedStyle(n).opacity;
      return { tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''), o: +o.toFixed(2) };
    });
    if (v && v.o < 0.9) faint.push(v);
  }
  ok('no focusable element left faint', faint.length === 0, JSON.stringify(faint.slice(0, 4)));
  await p.close();
}

/* ============================================== 2. reduced motion completeness ==== */
{
  const p = await newPage({ rm: true });
  const r = await p.evaluate(() => {
    const hidden = [...document.querySelectorAll('[data-rv]')]
      .filter((e) => +getComputedStyle(e).opacity < 0.9)
      .map((e) => e.className || e.tagName);
    const lines = [...document.querySelectorAll('.t12-ln-i')]
      .filter((e) => getComputedStyle(e).transform !== 'none')
      .length;
    return { hidden, lines };
  });
  ok('reduced motion renders everything', r.hidden.length === 0 && r.lines === 0,
    `${r.hidden.length} faint, ${r.lines} lines still transformed`);
  await p.close();
}

/* ================================================================ 3. no script ==== */
{
  const p = await newPage({ js: false });
  const r = await p.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    faint: [...document.querySelectorAll('[data-rv]')].filter((e) => +getComputedStyle(e).opacity < 0.9).length,
    text: document.body.innerText.length,
  }));
  ok('renders complete without JS', r.faint === 0 && r.text > 1500 && r.overflow !== 'hidden',
    `faint ${r.faint}, ${r.text} chars, overflow ${r.overflow}`);
  await p.close();
}

/* ================================================= 4. mobile layout + contrast ==== */
for (const [w, h, label] of [[390, 844, 'mobile'], [1440, 900, 'desktop']]) {
  const p = await newPage({ w, h, dpr: 2 });
  await walkPage(p);
  const floor = w < 760 ? 12 : 10.4;
  const r = await p.evaluate((minPx) => {
    const name = (e) => (e.className || e.tagName).toString().split(' ')[0];
    /* An element clipped by an overflow:hidden ancestor does not overflow the page,
       and a deliberately off-screen sr-only box is not an overflow either. Both were
       reported as failures by the naive box check. */
    const clipped = (e) => {
      for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const o = getComputedStyle(n);
        if (o.overflow !== 'visible' || o.overflowX !== 'visible') return true;
      }
      return false;
    };
    const over = [...document.querySelectorAll('body *')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        if (!b.width) return false;
        if (e.closest('.t12-crate, .t12-sr, .t12-skip, .t12-hp')) return false;
        if (b.right <= innerWidth + 1.5) return false;
        return !clipped(e);
      }).map(name);
    /* Opacity is not inherited as a computed value, so a child of an opacity:0 box
       still reports 1. Walk the chain: text nobody can see has no size problem. */
    const visible = (e) => {
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
        if (+getComputedStyle(n).opacity === 0) return false;
      }
      return true;
    };
    const small = [...document.querySelectorAll('body *')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() && visible(e)
        && parseFloat(getComputedStyle(e).fontSize) < minPx)
      .map((e) => name(e) + ':' + getComputedStyle(e).fontSize);
    /* getBoundingClientRect() cannot see a pseudo-element hit area, so walk
       elementFromPoint outward from the centre and count where the hit stops. */
    /* elementFromPoint returns the topmost element at the point, which for a link
       wrapping an <img> or a <span> is that CHILD, not the link. Counting only exact
       matches reported every such control as a 1px target. */
    const hit = (e) => {
      const b = e.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      if (cy < 0 || cy > innerHeight) return null;
      const inside = (n) => !!n && (n === e || e.contains(n));
      if (!inside(document.elementFromPoint(cx, cy))) return null; /* covered by chrome */
      let up = 0; let down = 0;
      while (up < 30 && inside(document.elementFromPoint(cx, cy - up - 1))) up++;
      while (down < 30 && inside(document.elementFromPoint(cx, cy + down + 1))) down++;
      return up + down + 1;
    };
    window.__hit = hit;
    window.__name = name;
    return {
      over: [...new Set(over)], small: [...new Set(small)],
      docW: document.documentElement.scrollWidth, winW: innerWidth,
      links: document.querySelectorAll('a[href], button, input, textarea').length,
    };
  }, floor);
  ok(`${label}: no horizontal overflow`, r.over.length === 0 && r.docW <= r.winW + 1,
    `${r.over.slice(0, 5).join(', ')} doc ${r.docW} win ${r.winW}`);
  ok(`${label}: nothing under ${floor}px`, r.small.length === 0, r.small.slice(0, 6).join(', '));

  /* Each control has to be scrolled into view before elementFromPoint can see it. */
  const taps = [];
  for (let i = 0; i < r.links; i++) {
    const res = await p.evaluate((idx) => {
      const e = document.querySelectorAll('a[href], button, input, textarea')[idx];
      if (!e || e.closest('.t12-hp, .t12-menu, .t12-skip')) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      const b = e.getBoundingClientRect();
      if (!b.width) return null;
      const h = window.__hit(e);
      return h !== null && h < 40 ? window.__name(e) + ':' + h : null;
    }, i);
    if (res) taps.push(res);
  }
  ok(`${label}: tap targets >= 40px`, taps.length === 0, [...new Set(taps)].slice(0, 6).join(', '));

  /* Contrast, with the two parsers that lie fixed: composite color(srgb r g b / a),
     and never trust an ancestor walk for something sitting over media. */
  const c = await p.evaluate(() => {
    const parse = (s) => {
      let m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
      if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]];
      m = s.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?\)/);
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4])];
      return null;
    };
    const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const lum = (c2) => {
      const s = c2.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const ground = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const c3 = parse(getComputedStyle(n).backgroundColor);
        if (c3 && c3[3] > 0.85) return c3.slice(0, 3);
      }
      return [255, 255, 255];
    };
    const out = [];
    for (const el of document.querySelectorAll('p,a,li,dt,dd,th,td,span,label,button,h1,h2,figcaption')) {
      if (!el.textContent.trim() || el.children.length) continue;
      if (el.closest('.t12-shop-f')) continue; /* over a photograph: measured separately */
      const cs = getComputedStyle(el);
      if (+cs.opacity === 0) continue;
      /* Text painted by a clipped background image has color:transparent, which a
         naive checker scores as 1:1. The wordmark is measured from real pixels below. */
      if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.color === 'rgba(0, 0, 0, 0)') continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = ground(el);
      const eff = [...over(fg, bg)];
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
      const need = large ? 3 : 4.5;
      const r2 = ratio(eff, bg);
      if (r2 < need) out.push({ c: (el.className || el.tagName).toString().split(' ')[0], r: +r2.toFixed(2), need, size });
    }
    return out;
  });
  const worst = c.sort((a, b) => a.r - b.r).slice(0, 6);
  ok(`${label}: text contrast AA`, c.length === 0, JSON.stringify(worst));
  await p.close();
}

/* ======================================================================= report === */
const fail = results.filter((r) => !r.pass);
console.log('');
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.n}${r.detail ? '   [' + r.detail + ']' : ''}`);
console.log(`\n${results.length - fail.length}/${results.length} passed`);
await writeFile(join(here, 'report.json'), JSON.stringify(results, null, 1));
await browser.close();
process.exit(fail.length ? 1 : 0);
