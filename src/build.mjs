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

/* Their own sign: yellow plate, blue keyline, blue type. A RELATIVE href in the page,
   so the client's tab can never inherit another origin's icon. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" fill="#F9F500"/>
<rect x="4.5" y="4.5" width="55" height="55" fill="none" stroke="#122476" stroke-width="5"/>
<text x="32" y="45" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-weight="700"
 font-size="34" letter-spacing="-1.5" text-anchor="middle" fill="#122476">12</text>
</svg>`;
await writeFile(join(dist, 'favicon.svg'), favicon);

await writeFile(join(dist, 'index.html'), render({ noindex: isPreview, previewOrigin: PREVIEW_ORIGIN }));
if (isPreview) await writeFile(join(dist, '.nojekyll'), '');

await writeFile(
  join(dist, 'robots.txt'),
  isPreview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n',
);

console.log(`built dist/index.html${isPreview ? ` [preview: noindex, ${PREVIEW_ORIGIN}]` : ''}`);
