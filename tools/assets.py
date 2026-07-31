"""Build every image asset and the catalogue data file from the harvested Shopify export.

Two rules this script enforces, because both are honesty rules and not just craft:
  1. A sleeve is NEVER emitted larger than its own source pixels. 138 of their 345
     covers are 225x225 thumbnails; the design shows a picture at the size its
     resolution can carry, and the tier a record lands in is decided HERE, from the
     true dimensions, not by eye later.
  2. Caption and file come out of the SAME record, so a title can never drift off a
     picture (redesign-craft-ledger #43).
"""
import json, os, re, unicodedata, subprocess, shutil
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(ROOT, 'research/covers')
OUT_SLEEVE = os.path.join(ROOT, 'public/img/sleeves')
OUT_TILE = os.path.join(ROOT, 'public/img/tiles')
OUT_IMG = os.path.join(ROOT, 'public/img')

CRATE_MIN = 540          # a crate card renders at 260 CSS px; dpr2 wants 520
CRATE_MAX = 560
TILE_MAX = 240           # a basement tile renders at <=104 CSS px; dpr2 wants 208
CRATE_COUNT = 44
TILE_COUNT = 78
CELL = 88                # wall montage cell

IS_ORDER = 'aábcdðeéfghiíjklmnoópqrstuúvwxyýzþæö'
RANK = {c: i for i, c in enumerate(IS_ORDER)}

def is_key(s):
    out = []
    for ch in s.lower():
        if ch in RANK: out.append((0, RANK[ch]))
        elif ch.isdigit(): out.append((-1, int(ch)))
        else:
            base = unicodedata.normalize('NFD', ch)[0]
            out.append((0, RANK.get(base, 99)) if base in RANK else (1, ord(ch)))
    return out

SEPS = (' – ', ' - ', ' — ')
def split_title(t):
    """Artist / title, using ONE separator for both halves so they can never disagree."""
    t = t.strip()
    for s in SEPS:
        if s in t:
            a, rest = t.split(s, 1)
            return a.strip(), rest.strip()
    return None, t

MERCH = {'Tote Bag', 'T-Shirt'}

def load():
    ps = []
    for f in ('research/p1.json', 'research/p2.json'):
        ps += json.load(open(os.path.join(ROOT, f)))['products']
    rows = []
    for p in ps:
        if not p['images']: continue
        im = p['images'][0]
        ext = os.path.splitext(im['src'].split('?')[0])[1] or '.jpg'
        path = os.path.join(COVERS, p['handle'] + ext)
        if not os.path.exists(path): continue
        artist, title = split_title(p['title'])
        merch = p['product_type'] in MERCH or (artist is None and p['title'].startswith('12 Tónar'))
        v = p['variants'][0] if p['variants'] else None
        rows.append(dict(
            handle=p['handle'], artist=artist, title=title, merch=merch,
            fmt=p['product_type'] or '', src=path, w=im['width'], h=im['height'],
            price=int(float(v['price'])) if v else 0,
            avail=any(x['available'] for x in p['variants']),
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
    for d in (OUT_SLEEVE, OUT_TILE):
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d, exist_ok=True)
    rows = load()
    records = [r for r in rows if not r['merch'] and r['artist']]

    # ---- crate: one record per artist, the artist's highest-resolution sleeve ----
    best = {}
    for r in records:
        k = r['artist']
        if k not in best or min(r['w'], r['h']) > min(best[k]['w'], best[k]['h']):
            best[k] = r
    crate_pool = [r for r in best.values() if min(r['w'], r['h']) >= CRATE_MIN]
    crate_pool.sort(key=lambda r: -min(r['w'], r['h']))
    crate = sorted(crate_pool[:CRATE_COUNT], key=lambda r: is_key(r['artist']))
    for r in crate:
        dst = os.path.join(OUT_SLEEVE, r['handle'] + '.webp')
        r['ow'], r['oh'] = webp(r['src'], dst, CRATE_MAX, 80)
        r['file'] = 'img/sleeves/' + r['handle'] + '.webp'

    # ---- basement tiles: the small sleeves, shown small ----
    used = {r['handle'] for r in crate}
    tile_pool = [r for r in records if r['handle'] not in used and min(r['w'], r['h']) < CRATE_MIN]
    tile_pool.sort(key=lambda r: (-min(r['w'], r['h']), r['handle']))
    tiles = tile_pool[:TILE_COUNT]
    for r in tiles:
        dst = os.path.join(OUT_TILE, r['handle'] + '.webp')
        r['ow'], r['oh'] = webp(r['src'], dst, TILE_MAX, 78)
        r['file'] = 'img/tiles/' + r['handle'] + '.webp'

    # ---- the wall: every RECORD in the shop, one image ----
    # Merch is excluded: the claim the hero makes is "every record", and a wall of
    # tote bags would make that claim false. Order is deterministically interleaved
    # rather than alphabetical, because sorting by handle clusters an artist's whole
    # discography (and every t-shirt) into one corner of the field.
    wall_rows = sorted([r for r in rows if not r['merch']], key=lambda r: r['handle'])
    step = 97  # coprime with the count, so the walk visits every record exactly once
    wall_rows = [wall_rows[(i * step) % len(wall_rows)] for i in range(len(wall_rows))]
    cols = 18
    n = len(wall_rows)
    rws = (n + cols - 1) // cols
    sheet = Image.new('RGB', (cols * CELL, rws * CELL), (18, 36, 118))
    for i, r in enumerate(wall_rows):
        with Image.open(r['src']) as im:
            im = im.convert('RGB')
            w, h = im.size
            s = CELL / min(w, h)
            im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
            l = (im.size[0] - CELL) // 2; t = (im.size[1] - CELL) // 2
            im = im.crop((l, t, l + CELL, t + CELL))
        sheet.paste(im, ((i % cols) * CELL, (i // cols) * CELL))
    # The wall is seen through the letters of a sign on an acid-yellow plate, so its
    # BRIGHT end is what decides whether the wordmark is readable: measured, a raw
    # montage put the lightest 3% of glyph pixels at 1.69:1 against the plate, well
    # under the 3:1 large-text floor. Grading it here rather than tinting it in CSS
    # is both cheaper (no per-frame blend of a full-viewport layer) and better: a
    # brightness/colour map applied at the asset's own resolution is the same picture
    # as one applied after the upscale, and this way the tone curve is baked once.
    # Chroma is pushed back up after the darkening so the covers stay recognisable.
    graded = ImageEnhance.Brightness(sheet).enhance(0.62)
    graded = ImageEnhance.Color(graded).enhance(1.3)
    graded = Image.blend(graded, Image.new('RGB', graded.size, (18, 36, 118)), 0.28)
    graded.save(os.path.join(OUT_IMG, 'wall.webp'), 'WEBP', quality=56, method=6)
    graded.resize((graded.size[0] // 2, graded.size[1] // 2), Image.LANCZOS).save(
        os.path.join(OUT_IMG, 'wall-sm.webp'), 'WEBP', quality=64, method=6)
    print(f'wall {sheet.size[0]}x{sheet.size[1]} from {n} sleeves')

    # ---- the shop's own photographs ----
    A = '/tmp/12t-assets'
    photos = {}
    for key, srcname, longest, q in (
        ('shopfront', '12_Tonar.jpg', 1600, 82),
        ('racks', 'coll-isl_vinyll.jpg', 640, 84),
        ('cds', 'coll-isl_CD.jpg', 600, 84),
        ('totes', 'coll-Toskur.jpg', 600, 84),
        ('tees', 'coll-Bolir.jpg', 600, 84),
    ):
        s = os.path.join(A, srcname)
        if not os.path.exists(s): print('MISSING', s); continue
        w, h = webp(s, os.path.join(OUT_IMG, key + '.webp'), longest, q)
        photos[key] = dict(file=f'img/{key}.webp', w=w, h=h)
    shutil.copy(os.path.join(A, 'logo-orig.jpg'), '/tmp/12t-assets/_logo.jpg')
    lw, lh = webp(os.path.join(A, 'logo-orig.jpg'), os.path.join(OUT_IMG, 'logo.webp'), 1102, 88)
    photos['logo'] = dict(file='img/logo.webp', w=lw, h=lh)

    def clean(r, keys):
        return {k: r[k] for k in keys}
    data = dict(
        crate=[clean(r, ('artist', 'title', 'fmt', 'price', 'avail', 'file', 'ow', 'oh', 'w', 'h')) for r in crate],
        tiles=[clean(r, ('artist', 'title', 'fmt', 'price', 'file', 'ow', 'oh')) for r in tiles],
        photos=photos,
        stats=dict(
            products=len(rows), records=len(records), artists=len({r['artist'] for r in records}),
            merch=len([r for r in rows if r['merch']]),
            vinyl=len([r for r in rows if r['fmt'] == 'Vinyl Record']),
            cd=len([r for r in rows if r['fmt'] == 'CD']),
            available=len([r for r in rows if r['avail']]),
            wall_cols=cols, wall_rows=rws, wall_cell=CELL,
            price_min=min(r['price'] for r in records if r['price']),
            price_max=max(r['price'] for r in records if r['price']),
            price_med=sorted(r['price'] for r in records if r['price'])[len([r for r in records if r['price']]) // 2],
        ),
    )
    with open(os.path.join(ROOT, 'src/catalogue.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('crate', len(crate), 'tiles', len(tiles))
    print('stats', data['stats'])
    up = max((r['ow'] / min(r['w'], r['h']) for r in crate + tiles), default=0)
    print(f'max source->emitted ratio {up:.3f} (must be <= 1.0)')

main()
