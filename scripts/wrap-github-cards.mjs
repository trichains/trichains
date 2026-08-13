/**
 * Junta stats, streak e langs numa faixa #0F0F0F, conteúdo centralizado, sem gap.
 * Roda: node scripts/wrap-github-cards.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BANNER_W = 1200;
const BG = '#0F0F0F';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CARDS = [
  {
    prefix: 'st',
    url: 'https://github-readme-stats.shion.dev/api?username=trichains&show_icons=true&hide_border=true&bg_color=0F0F0F&title_color=f2884b&icon_color=f2884b&text_color=EDEDED&include_all_commits=true&count_private=true',
  },
  {
    prefix: 'sk',
    url: 'https://streak-stats.demolab.com?user=trichains&background=0F0F0F&ring=F2884B&fire=F2884B&currStreakNum=F2884B&sideNums=EDEDED&currStreakLabel=F2884B&sideLabels=888888&dates=888888&hide_border=true',
  },
  {
    prefix: 'lg',
    url: 'https://github-readme-stats.shion.dev/api/top-langs/?username=trichains&layout=compact&hide_border=true&bg_color=0F0F0F&title_color=f2884b&text_color=EDEDED&langs_count=6',
  },
];

function parseSvg(svg) {
  const s = svg.replace(/^\uFEFF/, '').replace(/<\?xml[^?]*\?>/i, '').trim();
  const m = s.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  if (!m) throw new Error('Resposta não é SVG');
  const attrs = m[1];
  const body = m[2];
  const wm = attrs.match(/\bwidth=["']([\d.]+)/);
  const hm = attrs.match(/\bheight=["']([\d.]+)/);
  const vb = attrs.match(/viewBox=["']([^"']+)["']/);
  let w;
  let h;
  if (wm && hm) {
    w = Number(wm[1]);
    h = Number(hm[1]);
  } else if (vb) {
    const p = vb[1].trim().split(/[\s,]+/).map(Number);
    w = p[2];
    h = p[3];
  } else {
    w = 495;
    h = 195;
  }
  return { body, w, h };
}

function prefixIds(body, prefix) {
  return body
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/\bhref="#([^"]+)"/g, `href="#${prefix}$1"`)
    .replace(/\bxlink:href="#([^"]+)"/g, `xlink:href="#${prefix}$1"`);
}

const parts = [];
let y = 0;

for (const card of CARDS) {
  const res = await fetch(card.url, { headers: { 'User-Agent': 'trichains-readme' } });
  if (!res.ok) throw new Error(`${card.prefix}: HTTP ${res.status}`);
  const { body, w, h } = parseSvg(await res.text());
  const x = ((BANNER_W - w) / 2).toFixed(1);
  parts.push(
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${prefixIds(body, card.prefix)}\n</svg>`,
  );
  y += h;
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${BANNER_W}" height="${y}" viewBox="0 0 ${BANNER_W} ${y}" role="img" aria-label="GitHub stats">
  <rect width="${BANNER_W}" height="${y}" fill="${BG}"/>
  ${parts.join('\n')}
</svg>
`;

const outDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, 'github-cards.svg');
writeFileSync(dest, out);
console.log('wrote', dest, y, 'px');
