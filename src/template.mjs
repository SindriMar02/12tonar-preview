import {
  META, NAV, HERO, SHOP, ROSTER, HISTORY, LABEL, CTA, FOOTER,
  ARTISTS, RELEASES,
} from './content.mjs';
import { LOCKUP_PATH, LOCKUP_VIEWBOX, LOCKUP_TRANSFORM } from './brand.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isk = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr`;

/* Their own wordmark, traced from the logo file their storefront serves. The keyline
   plate is dropped and only the letters kept, so the lockup takes currentColor. The
   group transform is potrace's y-flip, kept rather than baked so the path stays exactly
   what the tracer produced. */
const brandLockup = (id, cls = 'al-lock') => `
<svg class="${cls}" viewBox="${LOCKUP_VIEWBOX}" role="img" aria-labelledby="${id}" focusable="false">
  <title id="${id}">12 Tónar</title>
  <g transform="${LOCKUP_TRANSFORM}"><path fill="currentColor" fill-rule="evenodd" d="${LOCKUP_PATH}"/></g>
</svg>`;

/* A tall thin waveform glyph used as the section rule. Drawn, not an image, so it inherits
   the band's ink and costs nothing. */
const waveRule = () => `
<svg class="al-rule" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path d="M0 12h84l10-7 9 14 10-19 9 24 10-14 9 9 11-5h96l10-9 9 18 10-24 9 30 10-18 9 11 11-8h96l10-6 9 12 10-16 9 20 10-12 9 8 11-6h96l10-11 9 22 10-28 9 34 10-20 9 13 11-10h96l10-5 9 10 10-14 9 18 10-10 9 7 11-6h96l10-8 9 16 10-20 9 24 10-14 9 9 11-7h96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

const sleeve = (r, i) => `
<article class="al-rel" data-rel="${i}" style="--n:${i % 8}">
  <a class="al-rel-link" href="${esc(r.url)}" target="_blank" rel="noopener">
    <span class="al-rel-frame">
      <span class="al-rel-disc" aria-hidden="true"><span class="al-rel-disc-i"></span></span>
      <img class="al-rel-img" src="img/shop/${esc(r.slug)}.webp" width="${r.w}" height="${r.h}"
           alt="Umslag: ${esc(r.artist)}, ${esc(r.title)}" loading="lazy" decoding="async">
    </span>
    <span class="al-rel-meta">
      <span class="al-rel-fmt">${esc(r.format)}</span>
      <span class="al-rel-artist">${esc(r.artist)}</span>
      <span class="al-rel-title">${esc(r.title)}</span>
      <span class="al-rel-price">${esc(isk(r.price))}</span>
    </span>
  </a>
</article>`;

/* A browse index shows the primary credit. Three-way collaboration credits come out of
   the product titles at up to 59 characters ("Stereo Hypnosis / Hans-Joachim Roedelius /
   Eraldo Bernocchi"), which no amount of scaling fits on a roll row without making that
   one name a third the size of its neighbours. The row shows the credit before the first
   slash; the complete credit stays on the plate's alt text, where it is read out in full. */
const rollName = (n) => (n.length > 30 && n.includes(' / ') ? n.split(' / ')[0].trim() : n);

/* The row carries the record's title so the now-block can name the sleeve on screen.
   A plate here is an album cover, not a portrait, so naming only the artist would leave
   the picture uncaptioned. */
const rosterRow = (a, i) => `
<li class="al-name" data-i="${i}" data-title="${esc(a.title)}">
  <button type="button" class="al-name-b" data-goto="${i}" aria-label="Sýna ${esc(a.name)}">
    <span class="al-name-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <span class="al-name-t">${esc(rollName(a.name))}</span>
  </button>
</li>`;

/* Alda's plates are PORTRAITS, taller than wide, so on a 1440x900 viewport the height
   governs and an 800px source covers honestly. A SQUARE sleeve on the same viewport is
   governed by the 1440px width, so the threshold is raised and most sleeves render as
   Alda's contained archive plate over an out-of-focus wash of themselves. For a record
   cover that is the better reading anyway: it stays the square object it is instead of
   being cropped into a backdrop. `full` is computed at build time in tools/assets.py. */
const plate = (a, i) => {
  const archive = !a.full;
  return `
<figure class="al-plate" data-plate="${i}" ${i === 0 ? 'data-on="1"' : ''}${archive ? ' data-archive="1"' : ''}
        ${archive ? `style="--al-bg:url('img/artists/${esc(a.slug)}-w.webp')"` : ''}>
  <img src="img/artists/${esc(a.slug)}.webp"
       srcset="img/artists/${esc(a.slug)}-m.webp ${a.mw}w, img/artists/${esc(a.slug)}.webp ${a.w}w"
       sizes="(max-width: 900px) 100vw, ${archive ? '52vw' : '100vw'}"
       width="${a.w}" height="${a.h}"
       alt="Plötuumslag: ${esc(a.name)}, ${esc(a.title)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
       style="--al-natw:${a.w}px">
</figure>`;
};

const era = (h, i) => `
<article class="al-era" data-era="${i}">
  <span class="al-era-y">${esc(h.year)}</span>
  <span class="al-era-tag">${esc(h.tag)}</span>
  <h3 class="al-era-h">${esc(h.head)}</h3>
  <p class="al-era-b">${esc(h.body)}</p>
</article>`;

export function render({ noindex = false, previewOrigin = '' } = {}) {
  const canonical = previewOrigin || `https://${META.domain}/`;
  const ticker = RELEASES.slice(0, 8)
    .map((r) => `<span class="al-tk-i"><em>${esc(r.artist)}</em> ${esc(r.title)}<i aria-hidden="true">/</i></span>`)
    .join('');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicStore',
    name: META.name,
    description: META.description,
    url: canonical,
    telephone: META.phone,
    email: META.email,
    foundingDate: '1998',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Skólavörðustígur 15',
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
<html lang="is">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(META.title)}</title>
<meta name="description" content="${esc(META.description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">\n<meta name="googlebot" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(META.title)}">
<meta property="og:description" content="${esc(META.description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="is_IS">
<meta name="theme-color" content="#0A0A0B">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-48.png" type="image/png" sizes="48x48">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="fonts/humane.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/archivo-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body class="al">

<!-- The loader paints their own wordmark in block by block, then flies it to the header
     where the identical artwork is waiting. -->
<div class="al-load" data-load>
  <div class="al-load-in">
    <div class="al-load-lock" data-load-lock>
      ${brandLockup('load-mark', 'al-lock al-lock--load')}
      <div class="al-load-grid" data-load-grid aria-hidden="true"></div>
    </div>
    <div class="al-load-bar" aria-hidden="true"><i data-load-bar></i></div>
  </div>
</div>

<div class="al-grain" aria-hidden="true"></div>
<a class="al-skip" href="#plotur">Fara í innihald</a>

<header class="al-hd" data-hd>
  <a class="al-hd-logo" href="#top" aria-label="12 Tónar, efst á síðu" data-hd-lock>
    ${brandLockup('hd-mark')}
  </a>
  <nav class="al-hd-nav" aria-label="Aðalvalmynd">
    ${NAV.map(([t, h]) => `<a class="al-hd-l" href="${esc(h)}"${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}</a>`).join('')}
  </nav>
  <button type="button" class="al-burger" data-burger aria-expanded="false" aria-controls="al-menu">
    <span class="al-burger-l" aria-hidden="true"></span>
    <span class="al-burger-l" aria-hidden="true"></span>
    <span class="al-sr">Valmynd</span>
  </button>
</header>

<div class="al-menu" id="al-menu" data-menu hidden>
  <nav class="al-menu-nav" aria-label="Valmynd">
    ${NAV.map(([t, h], i) => `<a class="al-menu-l" style="--i:${i}" href="${esc(h)}"${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}</a>`).join('')}
  </nav>
  <div class="al-menu-foot">
    <a href="tel:${esc(META.phoneHref)}">${esc(META.phone)}</a>
    <span>${esc(META.address)}</span>
  </div>
</div>

<main id="top">

  <section class="al-hero" data-hero data-theme="dark" aria-labelledby="al-h1">
    <div class="al-hero-frame">
      <!-- the film: a generated overhead shot of a record turning, monochrome, looped.
           The one asset here that is not the client's own, and it is the thing the shop
           is: a record going round. -->
      <div class="al-hero-film" aria-hidden="true">
        <video class="al-hero-video" muted loop playsinline autoplay
               poster="img/brand/record-poster.webp" preload="metadata">
          <source src="img/brand/record-loop.mp4" type="video/mp4">
        </video>
      </div>

      <p class="al-hero-eye">${esc(HERO.eyebrow)}</p>

      <!-- Alda's hero carried a "mechanical waves through a membrane" lattice here.
           It is gone. Its concept was the word ALDA, which means wave; on a record shop
           it is decoration with nothing behind it, and it was measurably the entire
           reason this hero stuttered: removing it took the section from 11 fps with 38
           long tasks to 24 fps with ZERO. The record film behind the letters is this
           page's texture. -->

      <!-- The name is a window: the film plays INSIDE the letters and nowhere else.
           Canvas rather than mix-blend-mode, because a blend over a hardware composited
           <video> is silently ignored on WebKit. -->
      <div class="al-hero-stage">
        <h1 class="al-sr" id="al-h1">${esc(META.name)}</h1>
        <canvas class="al-markc" data-markc aria-hidden="true"></canvas>
      </div>

      <div class="al-hero-bot">
        <p class="al-hero-lead">${esc(HERO.lead)}</p>
      </div>

      <a class="al-hero-scroll" href="#plotur">
        <span class="al-hero-scroll-t">${esc(HERO.scroll)}</span>
        <span class="al-hero-scroll-r" aria-hidden="true"></span>
      </a>

      <div class="al-tk">
        <span class="al-tk-lab">${esc(HERO.tickerLabel)}</span>
        <div class="al-tk-win">
          <div class="al-tk-track" aria-hidden="true">${ticker}${ticker}</div>
        </div>
      </div>
    </div>
  </section>

  <section class="al-shop" id="plotur" data-theme="light" aria-labelledby="al-shop-h">
    <div class="al-shop-head">
      <p class="al-eye">${esc(SHOP.eyebrow)}</p>
      <h2 class="al-h2" id="al-shop-h" data-split data-split-rails>${esc(SHOP.title)}</h2>
      <p class="al-lead" data-split>${esc(SHOP.lead)}</p>
    </div>

    <div class="al-rail" data-rail role="group" aria-label="Plötur í netverslun, dragðu til hliðar"
         tabindex="0">
      <div class="al-rail-track" data-rail-track>
        ${RELEASES.map(sleeve).join('')}
        <div class="al-rail-clone" aria-hidden="true">${RELEASES.map(sleeve).join('')}</div>
      </div>
      <p class="al-rail-hint" aria-hidden="true"><span>${esc(SHOP.drag)}</span></p>
    </div>

    <div class="al-shop-foot">
      <a class="al-btn" href="${esc(META.shop)}" target="_blank" rel="noopener">
        ${esc(SHOP.cta)}<span class="al-btn-a" aria-hidden="true"></span>
      </a>
      <p class="al-note">${esc(SHOP.priceNote)}</p>
    </div>
    ${waveRule()}
  </section>

  <section class="al-roll" id="rekkarnir" data-theme="dark" aria-labelledby="al-roll-h" data-roll>
    <div class="al-roll-spacer" data-roll-spacer>
      <div class="al-roll-vp">
        <div class="al-roll-stage" aria-hidden="true">
          ${ARTISTS.map(plate).join('')}
          <div class="al-roll-scrim"></div>
        </div>

        <div class="al-roll-in">
          <div class="al-roll-left">
            <p class="al-eye al-eye--dark">${esc(ROSTER.eyebrow)}</p>
            <h2 class="al-h2 al-h2--dark" id="al-roll-h" data-split>${esc(ROSTER.title)}</h2>

            <p class="al-roll-now" aria-live="polite">
              <span class="al-roll-now-n" data-roll-num>01</span>
              <span class="al-roll-now-l">${esc(ROSTER.countLabel)}</span>
              <span class="al-roll-now-t" data-roll-name>${esc(rollName(ARTISTS[0].name))}</span>
              <span class="al-roll-now-r" data-roll-title>${esc(ARTISTS[0].title)}</span>
            </p>
            <canvas class="al-wave al-wave--roll" data-wave="roll" aria-hidden="true"></canvas>
            <p class="al-roll-note">${esc(ROSTER.note)}</p>
          </div>

          <div class="al-roll-right">
            <div class="al-roll-mark" aria-hidden="true"></div>
            <ol class="al-roll-list" data-roll-list>
              ${ARTISTS.map(rosterRow).join('')}
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="al-hist" id="sagan" data-theme="light" aria-labelledby="al-hist-h">
    <div class="al-hist-head">
      <p class="al-eye">${esc(HISTORY.eyebrow)}</p>
      <h2 class="al-h2" id="al-hist-h" data-split data-split-rails>${esc(HISTORY.title)}</h2>
      <p class="al-lead" data-split>${esc(HISTORY.lead)}</p>
    </div>

    <div class="al-odo" data-odo aria-hidden="true">
      <div class="al-odo-strip" data-odo-strip>
        ${HISTORY.items.map((h, i) => `<span class="al-odo-i" data-odo-item ${i === 0 ? 'data-on="1"' : ''}>${esc(h.year)}</span>`).join('')}
      </div>
    </div>

    <div class="al-tl" data-tl role="group" aria-label="Tímalína, dragðu til hliðar" tabindex="0">
      <div class="al-tl-line" aria-hidden="true"><span data-tl-fill></span></div>
      <div class="al-tl-track" data-tl-track>
        ${HISTORY.items.map(era).join('')}
        <div class="al-rail-clone" aria-hidden="true">${HISTORY.items.map(era).join('')}</div>
      </div>
      <p class="al-rail-hint" aria-hidden="true"><span>${esc(HISTORY.drag)}</span></p>
    </div>
  </section>

  <!-- Structurally Alda's parent-company band; here it is the label, and it carries no
       artwork at all, so no sleeve can sit beside the word „útgáfan" and imply a signing. -->
  <section class="al-parent" id="utgafan" data-theme="dark" aria-labelledby="al-parent-h">
    <p class="al-eye al-eye--dark">${esc(LABEL.eyebrow)}</p>
    <h2 class="al-parent-h" id="al-parent-h" data-split>${esc(LABEL.title)}</h2>
    <p class="al-parent-b" data-split>${esc(LABEL.body)}</p>
    <p class="al-parent-guard">${esc(LABEL.guard)}</p>
    <a class="al-parent-l" href="${esc(LABEL.link[1])}" target="_blank" rel="noopener">${esc(LABEL.link[0])}</a>
  </section>

  <section class="al-cta" data-theme="red" aria-labelledby="al-cta-h">
    <h2 class="al-cta-h" id="al-cta-h" data-split>${esc(CTA.head)}</h2>
    <p class="al-cta-b">${esc(CTA.body)}</p>
    <div class="al-cta-row">
      <a class="al-btn al-btn--ink" href="mailto:${esc(META.email)}?subject=${encodeURIComponent(CTA.subject)}">
        ${esc(CTA.action)}<span class="al-btn-a" aria-hidden="true"></span>
      </a>
      <a class="al-btn al-btn--ghost" href="#footer">${esc(CTA.secondary)}</a>
    </div>
  </section>

</main>

<footer class="al-ft" id="footer" data-theme="dark">
  <div class="al-ft-top">
    <a class="al-ft-logo" href="#top" aria-label="12 Tónar, efst á síðu">
      ${brandLockup('ft-mark', 'al-lock al-lock--ft')}
    </a>
    ${waveRule()}
  </div>

  <div class="al-ft-cols">
    <div class="al-ft-col">
      <h3 class="al-ft-lab">${esc(FOOTER.shopLabel)}</h3>
      <p class="al-ft-addr">${esc(META.address)}</p>
      <a class="al-ft-big" href="${esc(META.shop)}" target="_blank" rel="noopener">Netverslun</a>
    </div>
    <div class="al-ft-col">
      <h3 class="al-ft-lab">${esc(FOOTER.hoursLabel)}</h3>
      <dl class="al-ft-hours">
        ${META.hours.map(([d, t]) => `<div><dt>${esc(d)}</dt><dd>${esc(t)}</dd></div>`).join('')}
      </dl>
      <p class="al-ft-hnote">${esc(FOOTER.hoursNote)}</p>
    </div>
    <div class="al-ft-col">
      <h3 class="al-ft-lab">${esc(FOOTER.contactLabel)}</h3>
      <a class="al-ft-big" href="tel:${esc(META.phoneHref)}">${esc(META.phone)}</a>
      <a class="al-ft-mail" href="mailto:${esc(META.email)}">${esc(META.email)}</a>
    </div>
    <div class="al-ft-col">
      <h3 class="al-ft-lab">${esc(FOOTER.socialLabel)}</h3>
      <ul class="al-ft-soc">
        ${META.social.map(([t, h]) => `<li><a href="${esc(h)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="al-ft-base">
    <p class="al-ft-kt">Kt. ${esc(META.kt)}</p>
    <p class="al-ft-credit">${esc(FOOTER.credit)}</p>
  </div>
</footer>

<script src="app.js" defer></script>
</body>
</html>
`;
}
