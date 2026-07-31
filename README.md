# 12 Tónar — spec redesign

A concept redesign for **12 Tónar**, the record shop and label at Skólavörðustígur 15 in
Reykjavík. Built by [SNDR Studio](https://sndr-studio.pages.dev) as an unsolicited
proposal. **It is not affiliated with, endorsed by, or owned by 12 tónar ehf.**

All artwork, photographs, prices and marks are the property of 12 tónar ehf. and were
taken from their own public storefront. The published page carries
`noindex, nofollow` and a `Disallow: /` robots.txt so it can never compete with their
own site in search.

**Live:** https://sindrimar02.github.io/12tonar-preview/

---

## The idea in one sentence

12 Tónar's identity is a sign — a yellow plate with a blue keyline and blue type, in
their window twice — so the page is built out of that sign, and the sign is a window:
`12 TÓNAR` is knocked through the plate, and behind the letters is every record in the
shop.

Full rationale, tokens and motion rules: [`DESIGN.md`](DESIGN.md).
Every claim on the page and its source: [`FACTS.md`](FACTS.md).

## Build

No bundler, no framework, one vendored dependency (Lenis 1.3.25, self-hosted).
Vanilla HTML/CSS/JS emitted by a Node script.

```bash
python3 tools/fetch.py     # re-download the 345 sleeves (not committed, ~25 MB)
python3 tools/assets.py    # grade + resize every image, emit src/catalogue.json
node src/build.mjs         # emit dist/
npm run serve              # http://localhost:8843
```

`tools/assets.py` decides which tier each record lands in from its **true pixel
dimensions** — only 29 of their 345 covers are ≥1000px and 138 are 225×225, so nothing
is ever displayed larger than its own resolution. The QA suite asserts it against the
rendered DOM.

## QA

```bash
node qa/qa.mjs      # 25 assertions: a11y, contrast, overflow, scrub reversibility,
                    # the crate's 1.00x scroll ratio, no-JS render, reduced motion
node qa/motion.mjs  # 16 assertions: Lenis really eases, the record leaves its sleeve,
                    # the torch patrols then stops off screen, reduced motion kills it
node qa/walk.mjs    # viewport-by-viewport screenshots (a full-page shot is useless
                    # on a page built from scrubbed, reversible reveals)
node qa/perf.mjs    # frame budget: p95 and >32ms frame count, never the median
node qa/weight.mjs  # bytes and load timings
```

Current: **25/25 + 16/16 passing on the live URL**. 60 fps with p95 18 ms and zero long
tasks on a 390×844 @3× profile at CPU ×4. 344 KB to first paint, 1,014 KB for the whole
9,734 px page.

## Deploy

```bash
./deploy.sh
```

Builds with `PREVIEW_ORIGIN` set (which switches on noindex, the canonical, and the
robots disallow), stages `dist/` in an isolated git worktree, runs the favicon guard
against the staged tree, pushes `gh-pages`, then verifies the icon on the live URL.
