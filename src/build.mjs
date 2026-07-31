import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from './template.mjs';

/* A spec redesign published under a real business's brand sits on a URL that is not
   theirs. Without noindex + a canonical pointing at the preview itself, a full-fidelity
   mockup can be indexed as duplicate content and damage the prospect's own search
   presence, which is the opposite of the pitch. */
const PREVIEW_ORIGIN = process.env.PREVIEW_ORIGIN || '';
const isPreview = Boolean(PREVIEW_ORIGIN);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });

/* Their own sign: the yellow plate, their black type. A RELATIVE href, so the client's
   tab can never inherit another origin's icon. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" fill="#0A0A0B"/>
<rect x="4" y="16" width="56" height="32" fill="#F9F500"/>
<text x="32" y="41" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-weight="700"
 font-size="22" letter-spacing="-1" text-anchor="middle" fill="#0A0A0B">12</text>
</svg>`;
await writeFile(join(dist, 'favicon.svg'), favicon);

await writeFile(join(dist, 'index.html'), render({ noindex: isPreview, previewOrigin: PREVIEW_ORIGIN }));
if (isPreview) await writeFile(join(dist, '.nojekyll'), '');

await writeFile(
  join(dist, 'robots.txt'),
  isPreview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
);

console.log(`built dist/index.html${isPreview ? ` [preview: noindex, ${PREVIEW_ORIGIN}]` : ''}`);
