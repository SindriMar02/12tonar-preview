"""Build every image the Alda-structured build needs, from 12 Tónar's own catalogue.

Emits into the SAME paths the engine already expects, so app.js never has to change:

    public/img/artists/<slug>.webp   the roll plates   (one cover per artist)
    public/img/shop/<slug>.webp      the rail sleeves  (the records, with prices)

Two rules carried over from the first build, because both are honesty rules:

  1. A picture is never emitted larger than its own source. 12 Tónar's catalogue is
     345 covers of which only 29 are >=1000px and 138 are 225x225, so the tier a
     record lands in is decided HERE, from its true dimensions.
  2. Caption and file come out of the SAME record, so a title can never drift onto
     the wrong picture.

The roll's full-bleed threshold is raised from Alda's 800 to 1440. Alda's plates are
PORTRAITS, taller than wide, so on a 1440x900 viewport the 900px height governs and
800px is honest. A SQUARE sleeve on the same viewport is governed by the 1440px width,
so anything under that would be a blow-up. Everything below the threshold renders as
Alda's contained "archive" plate over an out-of-focus wash of itself, which for a
record sleeve reads as the object it is rather than as a stretched photograph.
"""
import json, os, shutil, unicodedata
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(ROOT, 'research/covers')
OUT_ROLL = os.path.join(ROOT, 'public/img/artists')
OUT_SHOP = os.path.join(ROOT, 'public/img/shop')

FULLBLEED = 1440        # at or above this a square cover may cover a 1440 viewport
ROLL_MIN = 480          # below this a sleeve is too small to carry a section at all
ROLL_COUNT = 60
SHOP_MAX = 760          # matches the rail's own render size
SHOP_MIN = 540
SHOP_COUNT = 18

IS_ORDER = 'aábcdðeéfghiíjklmnoópqrstuúvwxyýzþæö'
RANK = {c: i for i, c in enumerate(IS_ORDER)}

def is_key(s):
    out = []
    for ch in s.lower():
        if ch in RANK: out.append((0, RANK[ch]))
        elif ch.isdigit(): out.append((-1, int(ch)))
        else:
            base = unicodedata.normalize('NFD', ch)[0]
            out.append((0, RANK[base]) if base in RANK else (1, ord(ch)))
    return out

SEPS = (' – ', ' - ', ' — ')
def split_title(t):
    """Artist / title from ONE separator, so the two halves can never disagree."""
    t = t.strip()
    for s in SEPS:
        if s in t:
            a, rest = t.split(s, 1)
            return a.strip(), rest.strip()
    return None, t

MERCH = {'Tote Bag', 'T-Shirt'}
FMT = {'Vinyl Record': 'LP', 'CD': 'CD'}

def load():
    ps = []
    for f in ('research/p1.json', 'research/p2.json'):
        ps += json.load(open(os.path.join(ROOT, f)))['products']
    rows = []
    for p in ps:
        if not p['images'] or p['product_type'] in MERCH:
            continue
        im = p['images'][0]
        ext = os.path.splitext(im['src'].split('?')[0])[1] or '.jpg'
        path = os.path.join(COVERS, p['handle'] + ext)
        if not os.path.exists(path):
            continue
        artist, title = split_title(p['title'])
        if not artist or artist.lower().startswith('12 tónar'):
            continue
        v = p['variants'][0] if p['variants'] else None
        rows.append(dict(
            slug=p['handle'], artist=artist, title=title,
            fmt=FMT.get(p['product_type'], p['product_type'] or 'LP'),
            src=path, w=im['width'], h=im['height'],
            price=int(float(v['price'])) if v else 0,
            url='https://12tonar.myshopify.com/products/' + p['handle'],
        ))
    return rows

def webp(src, dst, longest, q):
    with Image.open(src) as im:
        im = im.convert('RGB')
        w, h = im.size
        if max(w, h) > longest:
            s = longest / max(w, h)
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=q, method=6)
        return im.size

def main():
    for d in (OUT_ROLL, OUT_SHOP):
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d, exist_ok=True)
    rows = load()

    # one record per artist, that artist's highest-resolution sleeve
    best = {}
    for r in rows:
        k = r['artist']
        if k not in best or min(r['w'], r['h']) > min(best[k]['w'], best[k]['h']):
            best[k] = r

    roll_pool = [r for r in best.values() if min(r['w'], r['h']) >= ROLL_MIN]
    roll_pool.sort(key=lambda r: -min(r['w'], r['h']))
    roll = sorted(roll_pool[:ROLL_COUNT], key=lambda r: is_key(r['artist']))
    for r in roll:
        # 1440, not 1800. A full-bleed plate covers at most a 1440 viewport here, and an
        # 1800px WebP was the 177ms decode that showed up as a long task mid-roll. The
        # archive plates are smaller than this anyway.
        r['ow'], r['oh'] = webp(r['src'], os.path.join(OUT_ROLL, r['slug'] + '.webp'), 1440, 80)
        # A separate 40px WASH for the archive plates' backdrop. Alda's archive plate
        # paints its photograph twice: once as the contained <img> and once as a
        # blur(38px) background behind it. Alda had six of them; this build has 47,
        # and 47 full-size images decoded twice and run through a 38px blur is what
        # took the page to 7fps. A 40px source scaled to cover is already smooth, so
        # the second copy costs ~1KB and the CSS blur drops to a finishing pass.
        webp(r['src'], os.path.join(OUT_ROLL, r['slug'] + '-w.webp'), 40, 60)
        # A phone-sized plate. A 390px phone shows a full-bleed plate at 390 CSS px and
        # an archive plate at ~200, so at dpr3 it needs 1170 and 610 respectively, not
        # 1800. Decoding the desktop plate on a phone was the long task that survived
        # every other fix here.
        r['mw'], r['mh'] = webp(r['src'], os.path.join(OUT_ROLL, r['slug'] + '-m.webp'), 760, 78)

    # the rail: the best sleeves again, biggest first, then alphabetical
    shop_pool = [r for r in best.values() if min(r['w'], r['h']) >= SHOP_MIN]
    shop_pool.sort(key=lambda r: -min(r['w'], r['h']))
    shop = sorted(shop_pool[:SHOP_COUNT], key=lambda r: is_key(r['artist']))
    for r in shop:
        r['sw'], r['sh'] = webp(r['src'], os.path.join(OUT_SHOP, r['slug'] + '.webp'), SHOP_MAX, 82)

    def js(v):
        return json.dumps(v, ensure_ascii=False)

    lines = ['''/* Generated by tools/assets.py from 12 Tónar's own Shopify catalogue, harvested
   2026-07-31. Name, title, price and file are emitted from the SAME record, so a
   caption can never drift onto the wrong sleeve. Do not hand-edit.

   w/h are the emitted asset's true pixels; nothing is ever rendered larger.
   `full` marks the sleeves big enough to cover a 1440 viewport honestly; the rest
   render as contained archive plates over a wash of themselves. */
export const ARTISTS = [''']
    for r in roll:
        full = min(r['ow'], r['oh']) >= FULLBLEED
        lines.append(
            f"  {{ name: {js(r['artist'])}, slug: {js(r['slug'])}, "
            f"w: {r['ow']}, h: {r['oh']}, mw: {r['mw']}, title: {js(r['title'])}, "
            f"fmt: {js(r['fmt'])}, price: {r['price']}{', full: true' if full else ''} }},")
    lines.append('];\n')
    lines.append('''/* The rail: real stock in their own store, with the real ISK price and a link to the
   real product page. Prices read 2026-07-31. */
export const RELEASES = [''')
    for r in shop:
        lines.append(
            f"  {{ artist: {js(r['artist'])}, title: {js(r['title'])}, "
            f"format: {js(r['fmt'])}, price: {r['price']}, slug: {js(r['slug'])}, "
            f"w: {r['sw']}, h: {r['sh']}, url: {js(r['url'])} }},")
    lines.append('];')

    with open(os.path.join(ROOT, 'src/roster.mjs'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    full_n = sum(1 for r in roll if min(r['ow'], r['oh']) >= FULLBLEED)
    # compare like with like: emitted WIDTH against source WIDTH. Comparing against
    # min(w,h) is wrong the moment a sleeve is not square and reports a fake blow-up.
    up = max(max(r['ow'] / r['w'] for r in roll), max(r['sw'] / r['w'] for r in shop))
    print(f'roll {len(roll)} artists ({full_n} full-bleed, {len(roll) - full_n} archive plates)')
    print(f'rail {len(shop)} releases')
    print(f'max emitted/source ratio {up:.3f} (must be <= 1.0)')
    print('catalogue totals:', len(rows), 'records,', len({r["artist"] for r in rows}), 'artists')

main()
