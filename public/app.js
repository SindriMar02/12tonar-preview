/* =============================================================================
   12 TÓNAR — one motion engine, zero dependencies.

   The rules this file exists to obey, all of them paid for on an earlier build:

   1. NEVER write a custom property to the root element. An unregistered custom
      property inherits, so a per-frame write on <html> dirties the inherited style
      of every element in the document. Every channel here is written on the element
      that reads it.
   2. Never call getBoundingClientRect() inside a loop that also writes transforms.
      A rect read inside a transform feedback loop reports the element's own moved
      position. Layout is cached as an offsetTop chain and only recomputed on
      resize / fonts / image load, so the loop performs ZERO layout reads.
   3. Batch every read before every write.
   4. Guard every per-frame write on the value it is about to write.
   5. Primary content moves at exactly 1.00x. The crate is a native scroller; the
      only things moving at another rate are the hero wall and one photograph, and
      neither is something you are reading.
   6. No damping on touch. Damping turns discrete wheel notches into motion. On a
      finger it is just content refusing to be where you put it.
   ============================================================================= */
(() => {
  'use strict';

  const doc = document;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE = matchMedia('(pointer: coarse)');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* --------------------------------------------------------- the twelve rule
     One rule per section rather than one fixed overlay: a fixed layer either sits
     under every opaque section ground and is invisible, or over the content and
     draws lines across the photographs. */
  doc.querySelectorAll('main > section, .t12-foot').forEach((sec) => {
    const g = doc.createElement('div');
    g.className = 't12-grid';
    g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<i></i>'.repeat(12);
    sec.insertBefore(g, sec.firstChild);
  });

  /* ------------------------------------------------------------ split lines --
     Lines are MEASURED, never guessed: every word gets a probe span and words are
     grouped by their real offsetTop. The mask box is padded (and pulled back by an
     equal negative margin) because Icelandic acutes sit above the cap height and a
     bare overflow:hidden shears Í Á Ó Ú Ý. A collapsing space text node is kept
     BETWEEN lines, as a sibling of each clipped box, so textContent and the
     accessible name stay correctly spaced.                                      */
  const splits = [...doc.querySelectorAll('[data-split]')];
  splits.forEach((el) => { el.dataset.text = el.textContent.trim(); });

  function buildSplits() {
    splits.forEach((el) => {
      const text = el.dataset.text;
      const words = text.split(/\s+/);
      el.textContent = '';
      const probes = words.map((w, i) => {
        const s = doc.createElement('span');
        s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(doc.createTextNode(' '));
        return s;
      });
      const lines = [];
      let top = null;
      probes.forEach((p) => {
        const t = p.offsetTop;
        if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
        lines[lines.length - 1].push(p.textContent);
      });
      el.textContent = '';
      lines.forEach((words2, i) => {
        const box = doc.createElement('span');
        box.className = 't12-ln';
        const inner = doc.createElement('span');
        inner.className = 't12-ln-i';
        inner.style.setProperty('--i', i);
        inner.textContent = words2.join(' ');
        box.appendChild(inner);
        el.appendChild(box);
        if (i < lines.length - 1) el.appendChild(doc.createTextNode(' '));
      });
    });
  }

  /* -------------------------------------------------------------- geometry --
     offsetTop chain, not getBoundingClientRect: see rule 2 at the top.          */
  function absTop(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  const items = [...doc.querySelectorAll('[data-rv]')].map((el) => ({
    el, cur: 0, tgt: 0, last: -1, top: 0, h: 0,
  }));
  const sections = [...doc.querySelectorAll('main > section, .t12-foot')].map((el) => ({
    el, theme: el.dataset.theme || 'sign', top: 0, h: 0,
  }));

  const markFill = doc.querySelector('.t12-mark-fill');
  const shopImg = doc.querySelector('.t12-shop-f img');
  const shopFig = doc.querySelector('.t12-shop-f');
  const head = doc.querySelector('.t12-head');

  const geo = { vh: 0, headH: 0, shopTop: 0, shopH: 0 };

  function measure() {
    geo.vh = innerHeight;
    geo.headH = head ? head.offsetHeight : 0;
    for (const it of items) { it.top = absTop(it.el); it.h = it.el.offsetHeight; }
    for (const s of sections) { s.top = absTop(s.el); s.h = s.el.offsetHeight; }
    if (shopFig) { geo.shopTop = absTop(shopFig); geo.shopH = shopFig.offsetHeight; }
  }

  /* ---------------------------------------------------------------- engine -- */
  let running = false;
  let last = 0;
  let theme = '';
  let lastDrift = -1e9;
  let lastPar = -1e9;
  const TAU = 0.085;

  function targets(y) {
    const vh = geo.vh;
    for (const it of items) {
      const top = it.top - y;
      const span = Math.min(vh * 0.42, it.h * 0.55 + vh * 0.16) || 1;
      it.tgt = clamp((vh * 0.94 - top) / span, 0, 1);
    }
  }

  function paint(y, damped) {
    let moving = false;
    for (const it of items) {
      const v = damped ? it.cur : it.tgt;
      /* Guard on the value being written. Safe because the comparison IS the value. */
      if (Math.abs(v - it.last) > 0.002 || (v === 1 && it.last !== 1) || (v === 0 && it.last !== 0)) {
        it.el.style.setProperty('--rv', v.toFixed(3));
        it.last = v;
      }
      if (damped && Math.abs(it.tgt - it.cur) > 0.0008) moving = true;
    }

    /* Decoration only: the wall behind the wordmark, at 0.06x. */
    if (markFill) {
      const d = Math.round(-y * 0.06 * 10) / 10;
      if (Math.abs(d - lastDrift) >= 0.4) { markFill.style.setProperty('--drift', d); lastDrift = d; }
    }
    /* Decoration only: the shopfront photograph, at 0.055x inside its own frame. */
    if (shopImg) {
      const p = clamp((y + geo.vh - geo.shopTop) / (geo.shopH + geo.vh), 0, 1);
      const px = Math.round((p - 0.5) * 46 * 10) / 10;
      if (Math.abs(px - lastPar) >= 0.4) { shopImg.style.setProperty('--par', px + 'px'); lastPar = px; }
    }

    const probe = y + geo.headH + 4;
    for (const s of sections) {
      if (probe >= s.top && probe < s.top + s.h) {
        if (s.theme !== theme) {
          theme = s.theme;
          head.dataset.theme = theme;
          doc.body.dataset.theme = theme;
        }
        break;
      }
    }
    return moving;
  }

  function frame(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;
    const y = scrollY;
    targets(y);

    const damped = !COARSE.matches && !RM.matches;
    if (damped) {
      const k = 1 - Math.exp(-dt / TAU);
      for (const it of items) {
        it.cur += (it.tgt - it.cur) * k;
        if (Math.abs(it.tgt - it.cur) < 0.001) it.cur = it.tgt; /* or it never settles */
      }
    }
    const moving = paint(y, damped);

    if (moving) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }

  function kick() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  function relayout() { measure(); kick(); }

  /* ------------------------------------------------- keyboard reachability --
     A scrubbed reveal holds focusable controls at opacity 0 ahead of the scroll,
     so a keyboard user can Tab onto something invisible. */
  doc.addEventListener('focusin', (e) => {
    const a = e.target.closest('[data-rv]');
    if (a) a.classList.add('has-focus');
  });
  doc.addEventListener('focusout', (e) => {
    const a = e.target.closest('[data-rv]');
    if (a) a.classList.remove('has-focus');
  });

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', relayout, { passive: true });
  addEventListener('orientationchange', relayout);
  RM.addEventListener('change', relayout);

  /* ---------------------------------------------------------- the crate ----
     Native scrolling does all the work. Drag inertia is added on fine pointers
     only; touch already moves at 1.00x with nothing in the path.               */
  const crate = doc.querySelector('.t12-crate');
  const rail = doc.querySelector('.t12-rail-in');

  if (crate) {
    let railLast = -1;
    let railTick = false;
    const drawRail = () => {
      railTick = false;
      const max = crate.scrollWidth - crate.clientWidth;
      const p = max > 0 ? clamp(crate.scrollLeft / max, 0, 1) : 0;
      if (Math.abs(p - railLast) > 0.004 && rail) { rail.style.setProperty('--p', p.toFixed(3)); railLast = p; }
    };
    crate.addEventListener('scroll', () => {
      if (!railTick) { railTick = true; requestAnimationFrame(drawRail); }
    }, { passive: true });
    drawRail();

    if (!COARSE.matches) {
      let down = false, moved = 0, x0 = 0, s0 = 0, vx = 0, px = 0, pt = 0, glide = 0;
      const stop = () => { if (glide) { cancelAnimationFrame(glide); glide = 0; } };

      crate.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        stop();
        down = true; moved = 0;
        x0 = e.clientX; s0 = crate.scrollLeft;
        px = e.clientX; pt = performance.now(); vx = 0;
        crate.setPointerCapture(e.pointerId);
      });
      crate.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 4 && !crate.classList.contains('is-drag')) crate.classList.add('is-drag');
        moved = Math.abs(dx);
        crate.scrollLeft = s0 - dx;
        const now = performance.now();
        const dt = now - pt;
        if (dt > 8) { vx = (e.clientX - px) / dt; px = e.clientX; pt = now; }
      });
      const up = (e) => {
        if (!down) return;
        down = false;
        crate.classList.remove('is-drag');
        try { crate.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        if (RM.matches || Math.abs(vx) < 0.12) return;
        let v = clamp(vx, -4.5, 4.5) * 16;
        const step = () => {
          crate.scrollLeft -= v;
          v *= 0.94;
          glide = Math.abs(v) > 0.4 ? requestAnimationFrame(step) : 0;
        };
        glide = requestAnimationFrame(step);
      };
      crate.addEventListener('pointerup', up);
      crate.addEventListener('pointercancel', up);
      crate.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);
      crate.addEventListener('wheel', stop, { passive: true });
    }

    crate.addEventListener('keydown', (e) => {
      const card = crate.querySelector('.t12-card');
      const step = card ? card.offsetWidth + 22 : 220;
      const go = { ArrowRight: step, ArrowLeft: -step, PageDown: step * 3, PageUp: -step * 3 }[e.key];
      if (go !== undefined) {
        e.preventDefault();
        crate.scrollBy({ left: go, behavior: RM.matches ? 'auto' : 'smooth' });
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        crate.scrollTo({ left: e.key === 'Home' ? 0 : crate.scrollWidth, behavior: RM.matches ? 'auto' : 'smooth' });
      }
    });
  }

  /* ----------------------------------------------------------- the menu ---- */
  const burger = doc.querySelector('.t12-burger');
  const menu = doc.getElementById('t12-menu');
  if (burger && menu) {
    let open = false;
    const set = (v) => {
      open = v;
      burger.setAttribute('aria-expanded', String(v));
      doc.body.classList.toggle('t12-lock', v);
      if (v) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-on')); }
      else {
        menu.classList.remove('is-on');
        setTimeout(() => { if (!open) menu.hidden = true; }, 340);
      }
    };
    burger.addEventListener('click', () => set(!open));
    menu.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        set(false);
        burger.focus({ preventScroll: true });
      });
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { set(false); burger.focus(); }
    });
    matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches && open) set(false); });
  }

  /* ------------------------------------------------------- open right now --
     Iceland stays on UTC all year, so Reykjavík local time is the UTC clock and
     no timezone data is needed. Their own site publishes no hours at all, which
     is what this answers.                                                       */
  const HOURS = { 0: [720, 1080], 1: [600, 1080], 2: [600, 1080], 3: [600, 1080], 4: [600, 1080], 5: [600, 1080], 6: [600, 1080] };
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

  function liveStatus() {
    const el = doc.getElementById('t12-live');
    const t = doc.getElementById('t12-live-t');
    if (!el || !t) return;
    const now = new Date();
    const day = now.getUTCDay();
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const [o, c] = HOURS[day];
    const isOpen = mins >= o && mins < c;
    el.dataset.state = isOpen ? 'open' : 'closed';
    if (isOpen) {
      t.textContent = `Opið núna til ${hhmm(c)}`;
    } else {
      let d = day, hop = 0;
      if (mins >= c) { d = (d + 1) % 7; hop = 1; }
      const next = HOURS[d];
      const names = ['á sunnudag', 'á mánudag', 'á þriðjudag', 'á miðvikudag', 'á fimmtudag', 'á föstudag', 'á laugardag'];
      t.textContent = hop ? `Lokað · opnar ${names[d]} kl. ${hhmm(next[0])}` : `Lokað · opnar kl. ${hhmm(next[0])}`;
    }
    doc.querySelectorAll('.t12-hours tr[data-day]').forEach((tr) => {
      tr.toggleAttribute('data-today', Number(tr.dataset.day) === day);
    });
  }

  /* ------------------------------------------------------------ the form --- */
  const form = doc.querySelector('.t12-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = form.querySelector('.t12-form-msg');
      if (form.querySelector('#f-vefur').value) return; /* honeypot */
      const name = form.querySelector('#f-nafn');
      const mail = form.querySelector('#f-netfang');
      if (!name.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.value)) {
        msg.removeAttribute('data-ok');
        msg.textContent = 'Fylltu út nafn og gilt netfang.';
        (!name.value.trim() ? name : mail).focus();
        return;
      }
      msg.setAttribute('data-ok', '');
      msg.textContent = 'Takk. Þetta er sýnishorn, svo skilaboðin fara ekki neitt enn þá.';
      form.reset();
    });
  }

  /* ----------------------------------------------------------------- boot -- */
  liveStatus();
  setInterval(liveStatus, 30000);

  buildSplits();
  measure();
  kick();

  /* Late layout shifts: webfonts swapping and lazy images decoding both change every
     cached offsetTop, and a stale chain reveals the wrong things at the wrong scroll. */
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(() => { buildSplits(); relayout(); });
  }
  addEventListener('load', relayout);
  let ro;
  if ('ResizeObserver' in window) {
    let w = innerWidth;
    ro = new ResizeObserver(() => {
      if (innerWidth !== w) { w = innerWidth; buildSplits(); }
      relayout();
    });
    ro.observe(doc.body);
  }
  doc.querySelectorAll('img[loading=lazy]').forEach((img) => {
    img.addEventListener('load', relayout, { once: true });
  });
})();
