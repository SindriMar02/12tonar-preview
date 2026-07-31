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

  /* ------------------------------------------------------------------ Lenis --
     Smooth scroll on the WHEEL only. `syncTouch` stays off on purpose: damping is
     what turns discrete wheel notches into motion, but on a finger it is just
     content refusing to be where you put it, so touch keeps the browser's own
     1.00x scrolling. Off entirely under reduced motion. */
  let lenis = null;
  if (!RM.matches && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)), /* expo-out, the page's curve */
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false, /* driven from the one loop below, so it idle-cancels with it */
      anchors: false,
    });
  }

  /* ---------------------------------------------------------------- engine -- */
  let running = false;
  let last = 0;
  let theme = '';
  let lastDrift = -1e9;
  let lastPar = -1e9;
  let wakeUntil = 0;
  let velRaw = 0;
  let velCur = 0;
  const TAU = 0.085;
  const VEL_TAU = 0.12;
  const VEL_NORM = 2600; /* px/s that counts as a hard flick */

  if (lenis) lenis.on('scroll', (e) => { velRaw = e.velocity || 0; kick(); });

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
    /* Decoration only: the shopfront photograph inside its own frame, plus a
       WEIGHT term. Position answers "where", velocity answers "how fast you are
       reading" — the frame hangs a few px behind a hard flick and the existing
       position damping settles it, which is what gives a photograph mass. */
    if (shopImg) {
      const p = clamp((y + geo.vh - geo.shopTop) / (geo.shopH + geo.vh), 0, 1);
      const weight = clamp(velCur / VEL_NORM, -1, 1) * 15;
      const px = Math.round(((p - 0.5) * 46 - weight) * 10) / 10;
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
    if (lenis) lenis.raf(t);
    const y = scrollY;
    targets(y);

    const damped = !COARSE.matches && !RM.matches;
    if (damped) {
      const k = 1 - Math.exp(-dt / TAU);
      for (const it of items) {
        it.cur += (it.tgt - it.cur) * k;
        if (Math.abs(it.tgt - it.cur) < 0.001) it.cur = it.tgt; /* or it never settles */
      }
      const kv = 1 - Math.exp(-dt / VEL_TAU);
      velCur += (velRaw - velCur) * kv;
      if (Math.abs(velCur) < 1) velCur = 0;
    }
    velRaw *= 0.86; /* Lenis only reports velocity while it is moving */
    const moving = paint(y, damped);

    /* Lenis owns the scroll position, so the loop has to outlive the channels: it
       stays alive while Lenis is still easing, and for a moment after any input,
       because Lenis cannot report a scroll until something calls its raf. */
    if (moving || (lenis && lenis.isScrolling) || t < wakeUntil) requestAnimationFrame(frame);
    else { running = false; last = 0; velCur = 0; velRaw = 0; }
  }

  function kick() {
    wakeUntil = performance.now() + 900;
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
  /* Wheel and touch have to wake the loop directly: with autoRaf off, Lenis cannot
     emit a scroll event until something calls its raf, so waiting for `scroll` here
     would deadlock on the very first notch. */
  for (const ev of ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown']) {
    addEventListener(ev, kick, { passive: true });
  }

  /* In-page anchors go through Lenis, or they would jump while it eases. */
  if (lenis) {
    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = id ? doc.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -(head ? head.offsetHeight : 0) - 8, duration: 1.15 });
      history.replaceState(null, '', '#' + id);
    });
  }

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

  /* ----------------------------------------------------------- the torch ----
     The lower floor sits under a scrim with a hole punched in it by a radial alpha
     mask. Three custom properties per frame on ONE element, so the loop never
     causes layout and the 78 sleeves underneath are decoded exactly once.

     Adopted from 21st.dev's Torch Reveal: the light SPRINGS after the pointer
     rather than being parented to it (which is what makes it read as hand-held),
     its radius breathes on two incommensurate sines rather than one, and when
     nobody is pointing at it, it patrols a Lissajous path so a visitor who never
     moves the mouse still sees what the section is. Fine pointers only, and the
     loop stops dead when the section is off screen or the tab is hidden. */
  const torch = doc.querySelector('[data-torch]');
  if (torch && !RM.matches && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const scrim = torch.querySelector('.t12-torch-scrim');
    const glow = torch.querySelector('.t12-torch-glow');
    const R = 232;
    const K = 260; const C = 24; /* spring: hand-held, not parented */
    let px = -600; let py = -600; let inside = false;
    let sx = -600; let sy = -600; let vx = 0; let vy = 0;
    let idle = 0; let t0 = 0; let raf = 0; let onScreen = false;
    let lx = -1e9; let ly = -1e9; let lr = -1e9;

    /* Semi-implicit Euler with substeps: stable at low or irregular frame rates. */
    const step = (pos, vel, target, dt) => {
      const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1;
      const h = dt / n;
      let p = pos; let v = vel;
      for (let i = 0; i < n; i++) { v += (-K * (p - target) - C * v) * h; p += v * h; }
      return [p, v];
    };

    let prev = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!t0) t0 = now;
      let dt = (now - prev) / 1000;
      prev = now;
      if (!(dt > 0) || dt > 0.05) dt = 0.016;
      idle += dt;
      const w = torch.clientWidth; const h = torch.clientHeight;
      let gx; let gy;
      if (inside) { gx = px; gy = py; } else {
        gx = w * (0.5 + 0.34 * Math.sin(idle * 0.3));
        gy = h * (0.5 + 0.28 * Math.sin(idle * 0.43 + 0.9));
      }
      [sx, vx] = step(sx, vx, gx, dt);
      [sy, vy] = step(sy, vy, gy, dt);
      const s = (now - t0) / 1000;
      const r = R + Math.sin(s * 9) * 5 + Math.sin(s * 23 + 1.3) * 2.5;
      if (Math.abs(sx - lx) > 0.3) { scrim.style.setProperty('--tx', sx.toFixed(1)); lx = sx; }
      if (Math.abs(sy - ly) > 0.3) { scrim.style.setProperty('--ty', sy.toFixed(1)); ly = sy; }
      if (Math.abs(r - lr) > 0.3) { scrim.style.setProperty('--tr', r.toFixed(1)); lr = r; }
      if (glow) {
        glow.style.setProperty('--tx', sx.toFixed(1));
        glow.style.setProperty('--ty', sy.toFixed(1));
        glow.style.setProperty('--tr', r.toFixed(1));
      }
    };

    const start = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    torch.addEventListener('pointermove', (e) => {
      const b = torch.getBoundingClientRect();
      px = e.clientX - b.left; py = e.clientY - b.top; inside = true;
    });
    torch.addEventListener('pointerleave', () => { inside = false; });
    torch.addEventListener('pointercancel', () => { inside = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        onScreen = es.some((x) => x.isIntersecting);
        if (onScreen && doc.visibilityState !== 'hidden') start(); else stop();
      }, { threshold: 0.04 }).observe(torch);
    } else { onScreen = true; start(); }
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'hidden') stop(); else if (onScreen) start();
    });
    torch.setAttribute('data-live', '');
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

  /* -------------------------------------------------------------- today ----
     The header no longer carries an open/closed pill. What survives is marking
     TODAY'S row in the opening-hours table, which is the useful half and does not
     need a header badge to say it. Iceland stays on UTC all year, so Reykjavík
     local time is the UTC clock and no timezone data is needed. */
  function markToday() {
    const day = new Date().getUTCDay();
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
  markToday();
  setInterval(markToday, 300000);

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
