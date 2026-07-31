import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as C from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CAT = JSON.parse(readFileSync(join(here, 'catalogue.json'), 'utf8'));

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Icelandic groups thousands with a PERIOD. Chrome's ICU maps is-IS to a comma, so this
   is hand-rolled and never goes near toLocaleString (redesign-craft-ledger #27a). */
const isk = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const IS_ORDER = 'aábcdðeéfghiíjklmnoópqrstuúvwxyýzþæö';
const firstLetter = (s) => {
  const c = s.trim()[0].toLowerCase();
  return IS_ORDER.includes(c) ? c.toUpperCase() : '#';
};

const FMT = { 'Vinyl Record': 'Vínyll', CD: 'Geisladiskur', 'Tote Bag': 'Taska', 'T-Shirt': 'Bolur' };

/* ---------------------------------------------------------------- the crate ------- */
function crateCards() {
  let out = '';
  let letter = '';
  CAT.crate.forEach((r, i) => {
    const L = firstLetter(r.artist);
    if (L !== letter) {
      letter = L;
      out += `<li class="t12-div" aria-hidden="true"><span>${esc(L)}</span></li>`;
    }
    out += `<li class="t12-card">
        <figure>
          <div class="t12-sleeve">
            <img src="${esc(r.file)}" width="${r.ow}" height="${r.oh}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"
                 alt="Plötuumslag: ${esc(r.artist)}, ${esc(r.title)}">
          </div>
          <figcaption>
            <p class="t12-card-a">${esc(r.artist)}</p>
            <p class="t12-card-t">${esc(r.title)}</p>
            <p class="t12-card-m"><span>${esc(FMT[r.fmt] || r.fmt || 'Plata')}</span> <span class="t12-card-p">${isk(r.price)} kr.</span></p>
          </figcaption>
        </figure>
      </li>`;
  });
  return out;
}

function tileGrid() {
  return CAT.tiles.map((r) => `<li class="t12-tile">
      <img src="${esc(r.file)}" width="${r.ow}" height="${r.oh}" loading="lazy" decoding="async"
           alt="Plötuumslag: ${esc(r.artist || 'Ýmsir')}, ${esc(r.title)}">
      <span class="t12-tile-cap"><b>${esc(r.artist || 'Ýmsir')}</b> ${esc(r.title)}</span>
    </li>`).join('');
}

/* ------------------------------------------------------------------- pieces ------- */
const tone = (n, k) =>
  `<p class="t12-tone"><span class="t12-tone-n">${n}</span> <span class="t12-tone-k">${esc(k)}</span></p>`;

/* data-rv drives the per-line rise from the heading itself; the heading's own box is
   pinned by CSS so the motion lives only on the clipped lines inside it. */
const head = (t, cls = '') =>
  `<h2 class="t12-h2 ${cls}" data-split data-rv>${esc(t)}</h2>`;

const hoursRows = () => C.HOURS.map((h) => {
  const t = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `<tr data-day="${h.i}"><th scope="row">${esc(h.d)}</th><td>${t(h.o)} <span class="t12-dash">til</span> ${t(h.c)}</td></tr>`;
}).join('');

const S = CAT.stats;

/* --------------------------------------------------------------------- page ------- */
export function render({ noindex = false, previewOrigin = '' } = {}) {
  const canonical = previewOrigin ? previewOrigin.replace(/\/?$/, '/') : '';
  const title = '12 Tónar · Plötubúð og útgáfa á Skólavörðustíg 15';
  const desc =
    'Plötubúð og útgáfa á Skólavörðustíg 15 í Reykjavík síðan 1998. Tvær hæðir af plötum, '
    + 'plötuspilari og espresso í boði hússins. Opnunartími, staðsetning og lagerinn í búðinni.';

  /* A spec redesign published under a real business's brand must never be indexable: a
     full-fidelity mockup on a URL that is not theirs can be read as duplicate content
     and damage the prospect's own search presence, which is the opposite of the pitch. */
  const robots = noindex
    ? '<meta name="robots" content="noindex, nofollow">\n  <meta name="googlebot" content="noindex, nofollow">'
    : '<meta name="robots" content="index, follow">';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicStore',
    name: '12 Tónar',
    description: desc,
    ...(canonical ? { url: canonical } : {}),
    telephone: '+354 511 5656',
    email: C.SHOP.email,
    foundingDate: '1998',
    address: {
      '@type': 'PostalAddress',
      streetAddress: C.SHOP.street,
      addressLocality: 'Reykjavík',
      postalCode: '101',
      addressCountry: 'IS',
    },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '12:00', closes: '18:00' },
    ],
  };

  return `<!doctype html>
<html lang="is" class="t12-html">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  ${robots}
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="12 Tónar">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:locale" content="is_IS">
  ${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n  <meta property="og:image" content="${esc(canonical)}img/shopfront.webp">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#F9F500">
  <!-- Safari does not render SVG favicons at all, so an SVG-only page silently falls
       back to the ORIGIN's icon. Relative hrefs, and always a raster fallback. -->
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="favicon-48.png" sizes="48x48" type="image/png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="preload" as="font" type="font/woff2" href="fonts/OverusedGrotesk-Black.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="fonts/OverusedGrotesk-Medium.woff2" crossorigin>
  <link rel="preload" as="image" href="img/wall.webp" media="(min-width: 760px)">
  <link rel="preload" as="image" href="img/wall-sm.webp" media="(max-width: 759px)">
  <link rel="stylesheet" href="style.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body class="t12-body">
<a class="t12-skip" href="#rekkarnir">Fara beint í rekkana</a>

<header class="t12-head" data-theme="sign">
  <a class="t12-head-mark" href="#top" aria-label="12 Tónar, efst á síðu">
    <img src="img/logo.webp" width="${CAT.photos.logo.w}" height="${CAT.photos.logo.h}" alt="" decoding="async">
  </a>
  <p class="t12-head-live" id="t12-live" data-state="">
    <span class="t12-dot" aria-hidden="true"></span><span id="t12-live-t">${esc(C.SHOP.street)}</span>
  </p>
  <nav class="t12-head-nav" aria-label="Aðalvalmynd">
    ${C.NAV.map((n) => `<a href="#${n.id}">${esc(n.label)}</a>`).join('')}
  </nav>
  <a class="t12-head-tel" href="tel:${esc(C.SHOP.phoneHref)}">${esc(C.SHOP.phone)}</a>
  <button class="t12-burger" type="button" aria-expanded="false" aria-controls="t12-menu">
    <span class="t12-burger-b" aria-hidden="true"><i></i><i></i></span>
    <span class="t12-sr">Valmynd</span>
  </button>
</header>

<div class="t12-menu" id="t12-menu" hidden>
  <nav aria-label="Valmynd">
    ${C.NAV.map((n, i) => `<a href="#${n.id}" style="--i:${i}"><span>${esc(n.label)}</span></a>`).join('')}
  </nav>
  <div class="t12-menu-foot">
    <a href="tel:${esc(C.SHOP.phoneHref)}">${esc(C.SHOP.phone)}</a>
    <a href="mailto:${esc(C.SHOP.email)}">${esc(C.SHOP.email)}</a>
    <p>${esc(C.SHOP.street)}, ${esc(C.SHOP.postcode)}</p>
  </div>
</div>

<main id="top">

  <!-- 01 ============================================================ the sign -->
  <section class="t12-hero" id="skiltid" data-theme="sign">
    <div class="t12-plate" data-rv>
      <div class="t12-plate-rule" aria-hidden="true"></div>
      <div class="t12-plate-in">
        <p class="t12-eyebrow">${esc(C.HERO.eyebrow)}</p>
        <!-- The window is the PARENT's background, so it stays one continuous image
             across both words; the spans exist only so the mark can break to two
             lines on a phone, where one line would shrink it to nothing. -->
        <h1 class="t12-mark" aria-label="12 Tónar">
          <span class="t12-mark-fill" aria-hidden="true"><span>12</span> <span>TÓNAR</span></span>
        </h1>
        <p class="t12-hero-lead">${esc(C.HERO.lead)}</p>
        <p class="t12-hero-cta">
          ${C.HERO.cta.map((c) => `<a class="t12-btn${c.primary ? ' is-primary' : ''}" href="${esc(c.href)}">${esc(c.label)}</a>`).join('')}
        </p>
      </div>
    </div>
    <p class="t12-hero-foot">
      <span>${isk(S.vinyl + S.cd)} titlar í búðinni</span>
      <span aria-hidden="true">·</span>
      <span>${isk(S.artists)} flytjendur</span>
      <span aria-hidden="true">·</span>
      <span>Skrunaðu niður</span>
    </p>
  </section>

  <!-- 02 ============================================================ the claim -->
  <section class="t12-story" id="sagan" data-theme="paper">
    <div class="t12-wrap">
      ${tone(C.STORY.tone, C.STORY.kicker)}
      ${head(C.STORY.head, 't12-h2--big')}
      <div class="t12-cols">
        ${C.STORY.body.map((p) => `<p class="t12-p" data-rv>${esc(p)}</p>`).join('')}
      </div>
      <ul class="t12-marks">
        ${C.STORY.marks.map((m, i) => `<li data-rv style="--i:${i}"><b>${esc(m.n)}</b> <span>${esc(m.t)}</span></li>`).join('')}
      </ul>
    </div>
  </section>

  <!-- 03 ======================================================= the crate -->
  <section class="t12-crate-sec" id="rekkarnir" data-theme="sign">
    <div class="t12-wrap">
      ${tone(C.CRATE.tone, C.CRATE.kicker)}
      ${head(C.CRATE.head, 't12-h2--big')}
      <p class="t12-lead" data-rv>${esc(C.CRATE.lead)}</p>
    </div>
    <div class="t12-crate" tabindex="0" role="group"
         aria-label="Plötur í búðinni, ${CAT.crate.length} titlar. Notaðu örvatakkana til að fletta.">
      <ul class="t12-crate-track">${crateCards()}</ul>
    </div>
    <div class="t12-wrap t12-crate-foot">
      <p class="t12-rail" aria-hidden="true"><span class="t12-rail-in"></span></p>
      <p class="t12-hint" aria-hidden="true">${esc(C.CRATE.hint)}</p>
      <p class="t12-note" data-rv>${esc(C.CRATE.note)}</p>
    </div>
  </section>

  <!-- 04 ==================================================== the listening floor -->
  <section class="t12-listen" id="klefinn" data-theme="ink">
    <div class="t12-wrap t12-listen-grid">
      <div class="t12-listen-t">
        ${tone(C.LISTEN.tone, C.LISTEN.kicker)}
        ${head(C.LISTEN.head)}
        ${C.LISTEN.body.map((p) => `<p class="t12-p" data-rv>${esc(p)}</p>`).join('')}
        <dl class="t12-specs" data-rv>
          ${C.LISTEN.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt> <dd>${esc(v)}</dd></div>`).join('')}
        </dl>
      </div>
      <figure class="t12-listen-f" data-rv>
        <img src="${esc(CAT.photos.racks.file)}" width="${CAT.photos.racks.w}" height="${CAT.photos.racks.h}"
             loading="lazy" decoding="async" alt="Plöturekkar og veggur af tónleikaplakötum á efri hæðinni í 12 Tónum.">
        <figcaption>${esc(C.LISTEN.caption)}</figcaption>
      </figure>
    </div>
  </section>

  <!-- 05 ============================================================ the label -->
  <!-- Type only. A sleeve beside the word "útgáfan" would imply a signing, and most of
       the sleeves in the shop are other labels' records. -->
  <section class="t12-label" id="utgafan" data-theme="ink">
    <div class="t12-wrap">
      ${tone(C.LABEL.tone, C.LABEL.kicker)}
      ${head(C.LABEL.head, 't12-h2--big')}
      ${C.LABEL.body.map((p) => `<p class="t12-p t12-p--wide" data-rv>${esc(p)}</p>`).join('')}
      <ul class="t12-names">
        ${C.LABEL.names.map((n, i) => `<li data-rv style="--i:${i}">${esc(n)}</li>`).join('')}
      </ul>
      <p class="t12-guard" data-rv>${esc(C.LABEL.guard)}</p>
    </div>
  </section>

  <!-- 06 ======================================================= the lower floor -->
  <section class="t12-lower" id="nedri" data-theme="paper">
    <div class="t12-wrap">
      ${tone(C.LOWER.tone, C.LOWER.kicker)}
      ${head(C.LOWER.head, 't12-h2--big')}
      <p class="t12-lead" data-rv>${esc(C.LOWER.lead)}</p>
    </div>
    <ul class="t12-tiles">${tileGrid()}</ul>
  </section>

  <!-- 07 ========================================================== in numbers -->
  <section class="t12-nums" id="i-tolum" data-theme="sign">
    <div class="t12-wrap">
      ${tone(C.NUMBERS.tone, C.NUMBERS.kicker)}
      ${head(C.NUMBERS.head)}
      <ul class="t12-numgrid">
        <li data-rv style="--i:0"><b>${isk(S.vinyl)}</b> <span>plötur á vínyl</span></li>
        <li data-rv style="--i:1"><b>${isk(S.cd)}</b> <span>geisladiskar</span></li>
        <li data-rv style="--i:2"><b>${isk(S.artists)}</b> <span>flytjendur í rekkunum</span></li>
        <li data-rv style="--i:3"><b>${isk(S.available)}</b> <span>titlar til á lager</span></li>
        <li data-rv style="--i:4"><b>${isk(S.price_med)} kr.</b> <span>miðverð á plötu</span></li>
        <li class="t12-num--range" data-rv style="--i:5"><b>${isk(S.price_min)} <span class="t12-to">til</span> ${isk(S.price_max)}</b> <span>verðbil í krónum</span></li>
      </ul>
      <p class="t12-note" data-rv>${esc(C.NUMBERS.note)}</p>
    </div>
  </section>

  <!-- 08 ============================================================= the shop -->
  <section class="t12-shop" id="budin" data-theme="ink">
    <figure class="t12-shop-f">
      <img src="${esc(CAT.photos.shopfront.file)}" width="${CAT.photos.shopfront.w}" height="${CAT.photos.shopfront.h}"
           loading="lazy" decoding="async"
           alt="Húsið á Skólavörðustíg 15 að kvöldi, gulu 12 Tónar skiltin í upplýstum búðargluggunum og fólk fyrir utan.">
      <figcaption>${esc(C.SHOPSEC.caption)}</figcaption>
    </figure>
    <div class="t12-wrap t12-shop-grid">
      <div>
        ${tone(C.SHOPSEC.tone, C.SHOPSEC.kicker)}
        ${head(C.SHOPSEC.head, 't12-h2--big')}
        <p class="t12-p" data-rv>${esc(C.SHOPSEC.body)}</p>
        <p class="t12-shop-adr" data-rv>
          <a href="${esc(C.SHOP.maps)}" target="_blank" rel="noopener">
            ${esc(C.SHOP.street)}<br>${esc(C.SHOP.postcode)}
          </a>
        </p>
        <p class="t12-shop-tel" data-rv>
          <a href="tel:${esc(C.SHOP.phoneHref)}">${esc(C.SHOP.phone)}</a>
          <a href="mailto:${esc(C.SHOP.email)}">${esc(C.SHOP.email)}</a>
        </p>
      </div>
      <div class="t12-hours" data-rv>
        <table>
          <caption class="t12-sr">Opnunartími</caption>
          <tbody>${hoursRows()}</tbody>
        </table>
        <p class="t12-note">${esc(C.SHOPSEC.hoursNote)}</p>
      </div>
    </div>
  </section>

  <!-- 09 =========================================================== contact -->
  <section class="t12-contact" id="hafa-samband" data-theme="sign">
    <div class="t12-wrap t12-contact-grid">
      <div>
        ${tone(C.CONTACT.tone, C.CONTACT.kicker)}
        ${head(C.CONTACT.head, 't12-h2--big')}
        <p class="t12-p" data-rv>${esc(C.CONTACT.body)}</p>
      </div>
      <form class="t12-form" novalidate data-rv>
        ${C.CONTACT.fields.map((f) => `<p class="t12-field">
          <label for="f-${f.id}">${esc(f.label)}</label>
          ${f.type === 'textarea'
      ? `<textarea id="f-${f.id}" name="${f.id}" rows="4" autocomplete="${f.auto}"></textarea>`
      : `<input id="f-${f.id}" name="${f.id}" type="${f.type}" autocomplete="${f.auto}">`}
        </p>`).join('')}
        <p class="t12-field t12-hp" aria-hidden="true">
          <label for="f-vefur">Vefur</label>
          <input id="f-vefur" name="vefur" type="text" tabindex="-1" autocomplete="off">
        </p>
        <p><button class="t12-btn is-primary" type="submit">${esc(C.CONTACT.submit)}</button></p>
        <p class="t12-form-msg" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>

</main>

<footer class="t12-foot" data-theme="ink">
  <div class="t12-wrap">
    <p class="t12-foot-mark">12 TÓNAR</p>
    <div class="t12-foot-grid">
      <p>${esc(C.SHOP.street)}<br>${esc(C.SHOP.postcode)}</p>
      <p><a href="tel:${esc(C.SHOP.phoneHref)}">${esc(C.SHOP.phone)}</a><br><a href="mailto:${esc(C.SHOP.email)}">${esc(C.SHOP.email)}</a></p>
      <p>Kt. ${esc(C.SHOP.kt)}</p>
    </div>
    <p class="t12-disclose">${esc(C.DISCLOSURE)}</p>
    <p class="t12-by">Frumgerð: <a href="${esc(C.FOOTER.builtHref)}" target="_blank" rel="noopener">${esc(C.FOOTER.built)}</a></p>
  </div>
</footer>

<script src="app.js" defer></script>
</body>
</html>
`;
}
