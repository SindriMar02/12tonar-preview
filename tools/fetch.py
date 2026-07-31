"""Re-download the 345 sleeve images referenced by the harvest.

The images themselves are not committed (25 MB of a client's artwork), but the harvest
that names them is, so this makes the repo reproducible:

    python3 tools/fetch.py && python3 tools/assets.py && node src/build.mjs
"""
import json, os, urllib.request, concurrent.futures, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'research/covers')
os.makedirs(OUT, exist_ok=True)

products = []
for f in ('research/p1.json', 'research/p2.json'):
    products += json.load(open(os.path.join(ROOT, f)))['products']

jobs = []
for p in products:
    if not p['images']:
        continue
    src = p['images'][0]['src']
    ext = os.path.splitext(src.split('?')[0])[1] or '.jpg'
    jobs.append((src, os.path.join(OUT, p['handle'] + ext)))

def get(job):
    url, out = job
    if os.path.exists(out) and os.path.getsize(out) > 500:
        return 'skip'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=25) as r, open(out, 'wb') as fh:
            fh.write(r.read())
        return 'ok'
    except Exception as e:
        return f'ERR {out}: {e}'

with concurrent.futures.ThreadPoolExecutor(12) as ex:
    res = list(ex.map(get, jobs))
print(collections.Counter(r if r in ('ok', 'skip') else 'error' for r in res))
for r in res:
    if r not in ('ok', 'skip'):
        print(r)
