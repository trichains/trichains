/**
 * Calendário de contribuições no tema Halloween do GitHub.
 * Células vazias escuras; escala marrom → laranja → amarelo.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COLORS = {
  0: '#161b22',
  1: '#631c03',
  2: '#bd561d',
  3: '#fa7a18',
  4: '#fddf68',
};

function level(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

async function token() {
  const fromEnv = process.env.GH_PAT || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) return fromEnv;
  const { execSync } = await import('node:child_process');
  const out = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  const line = out.split('\n').find((l) => l.startsWith('password='));
  return line ? line.slice(9) : '';
}

const gh = await token();
if (!gh) {
  console.error('Missing GitHub token (GH_PAT, GH_TOKEN, GITHUB_TOKEN, or git credential).');
  process.exit(1);
}

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${gh}`,
    'Content-Type': 'application/json',
    'User-Agent': 'trichains-halloween-graph',
  },
  body: JSON.stringify({
    query: `query {
      user(login: "trichains") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount date weekday } }
          }
        }
      }
    }`,
  }),
});

const json = await res.json();
const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
if (!cal?.weeks) {
  console.error('GraphQL failed:', JSON.stringify(json.errors || json, null, 2));
  process.exit(1);
}

const weeks = cal.weeks;
const cell = 11;
const gap = 3;
const left = 36;
const top = 22;
const width = left + weeks.length * (cell + gap) + 8;
const height = top + 7 * (cell + gap) + 18;

const months = [];
let lastMonth = '';
weeks.forEach((week, wi) => {
  const d = new Date(`${week.contributionDays[0].date}T00:00:00Z`);
  const label = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  if (label !== lastMonth) {
    months.push({ label, x: left + wi * (cell + gap) });
    lastMonth = label;
  }
});

const font =
  '-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif';

const monthSvg = months
  .map(
    (m) =>
      `<text x="${m.x}" y="14" fill="#8b949e" font-size="11" font-family="${font}">${m.label}</text>`,
  )
  .join('');

const dayLabels = [
  { t: 'Mon', row: 1 },
  { t: 'Wed', row: 3 },
  { t: 'Fri', row: 5 },
]
  .map(
    (d) =>
      `<text x="0" y="${top + d.row * (cell + gap) + 9}" fill="#8b949e" font-size="11" font-family="${font}">${d.t}</text>`,
  )
  .join('');

const rects = weeks
  .flatMap((week, wi) =>
    week.contributionDays.map((day) => {
      const lv = level(day.contributionCount);
      const x = left + wi * (cell + gap);
      const y = top + day.weekday * (cell + gap);
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${COLORS[lv]}"><title>${day.date}: ${day.contributionCount} contributions</title></rect>`;
    }),
  )
  .join('');

const legendX = width - 108;
const legend = [0, 1, 2, 3, 4]
  .map((lv, i) => `<rect x="${legendX + i * 14}" y="${height - 14}" width="11" height="11" rx="2" fill="${COLORS[lv]}"/>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contributions">
  <rect width="${width}" height="${height}" fill="#0d1117"/>
  ${monthSvg}
  ${dayLabels}
  ${rects}
  <text x="${legendX - 28}" y="${height - 4}" fill="#8b949e" font-size="11" font-family="${font}">Less</text>
  ${legend}
  <text x="${legendX + 72}" y="${height - 4}" fill="#8b949e" font-size="11" font-family="${font}">More</text>
</svg>
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.CONTRIBUTIONS_SVG || join(root, 'assets', 'contributions.svg');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log('wrote', out, cal.totalContributions, 'contributions');
