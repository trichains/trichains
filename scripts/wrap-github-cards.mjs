/**
 * Envolve os cards de stats numa faixa larga #0F0F0F, conteúdo centralizado.
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
    file: 'github-stats.svg',
    url: 'https://github-readme-stats.shion.dev/api?username=trichains&show_icons=true&hide_border=true&bg_color=0F0F0F&title_color=f2884b&icon_color=f2884b&text_color=EDEDED&include_all_commits=true&count_private=true',
  },
  {
    file: 'github-streak.svg',
    url: 'https://streak-stats.demolab.com?user=trichains&background=0F0F0F&ring=F2884B&fire=F2884B&currStreakNum=F2884B&sideNums=EDEDED&currStreakLabel=F2884B&sideLabels=888888&dates=888888&hide_border=true',
  },
  {
    file: 'github-langs.svg',
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

function wrap(svgText) {
  const { body, w, h } = parseSvg(svgText);
  const x = ((BANNER_W - w) / 2).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${BANNER_W}" height="${h}" viewBox="0 0 ${BANNER_W} ${h}" role="img">
  <rect width="${BANNER_W}" height="${h}" fill="${BG}"/>
  <svg x="${x}" y="0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${body}
  </svg>
</svg>
`;
}

const outDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });

for (const card of CARDS) {
  const res = await fetch(card.url, { headers: { 'User-Agent': 'trichains-readme' } });
  if (!res.ok) throw new Error(`${card.file}: HTTP ${res.status}`);
  const svg = await res.text();
  const wrapped = wrap(svg);
  const dest = join(outDir, card.file);
  writeFileSync(dest, wrapped);
  console.log('wrote', dest);
}
