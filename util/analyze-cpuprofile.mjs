// Summarize a V8 .cpuprofile by hottest self-time and hottest inclusive (total)
// time, plus a roll-up by package (postcss-* / postcss / node internals).
//
// Usage:
//   node util/analyze-cpuprofile.mjs <path/to/profile.cpuprofile> [topN]

import { readFileSync } from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node util/analyze-cpuprofile.mjs <profile> [topN]');
  process.exit(1);
}
const topN = Number(process.argv[3]) || 25;

const prof = JSON.parse(readFileSync(file, 'utf8'));
const { nodes, samples, timeDeltas } = prof;

// Index by id.
const byId = new Map(nodes.map((n) => [n.id, n]));

// Build child->parent map (nodes only store children, not parents).
const parentOf = new Map();
for (const n of nodes) {
  if (n.children) for (const c of n.children) parentOf.set(c, n.id);
}

function frameLabel(n) {
  const cf = n.callFrame;
  let name = cf.functionName || '(anonymous)';
  let url = cf.url || '';
  // Strip the long absolute path; show just the last two segments.
  const m = url.match(/([^/]+\/[^/]+)$/);
  if (m) url = m[1];
  if (!url && cf.scriptId === '0') url = '<gc/internals>';
  return `${name} @ ${url || '<?>'}`;
}

function packageOf(n) {
  const url = n.callFrame.url || '';
  if (!url) {
    const fn = n.callFrame.functionName;
    if (fn === '(garbage collector)') return '<gc>';
    if (fn === '(program)' || fn === '(root)' || fn === '(idle)') return fn;
    return '<internal>';
  }
  if (url.startsWith('node:')) return url;
  const m = url.match(/packages\/([^/]+)\//);
  if (m) return m[1];
  // pnpm layout: node_modules/.pnpm/<name>@<ver>/node_modules/<name>/...
  const mpnpm = url.match(/node_modules\/\.pnpm\/([^/]+)\//);
  if (mpnpm) return mpnpm[1].replace(/@[\d.][^@]*$/, '');
  const m2 = url.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
  if (m2) return m2[1];
  return url.replace(/^.*\//, '');
}

// Self time per node id.
const selfUs = new Map();
for (let i = 0; i < samples.length; i++) {
  const id = samples[i];
  const dt = timeDeltas[i] || 0;
  selfUs.set(id, (selfUs.get(id) || 0) + dt);
}

const totalUs = samples.length
  ? prof.endTime - prof.startTime
  : timeDeltas.reduce((a, b) => a + b, 0);

// Inclusive time: walk from each sample leaf up to the root, adding the delta.
const inclUs = new Map();
for (let i = 0; i < samples.length; i++) {
  const dt = timeDeltas[i] || 0;
  let id = samples[i];
  // Avoid double-counting if recursion creates cycles (shouldn't happen for trees).
  const seen = new Set();
  while (id != null && !seen.has(id)) {
    seen.add(id);
    inclUs.set(id, (inclUs.get(id) || 0) + dt);
    id = parentOf.get(id);
  }
}

const us = (n) => (n / 1000).toFixed(1).padStart(9) + ' ms';
const pct = (n) => ((n / totalUs) * 100).toFixed(2).padStart(6) + '%';

console.log(`profile: ${file}`);
console.log(
  `samples: ${samples.length}, wall: ${(totalUs / 1000).toFixed(0)} ms`
);
console.log();

// Self-time leaderboard.
console.log(`top ${topN} self time`);
console.log('-'.repeat(110));
const selfSorted = [...selfUs.entries()]
  .map(([id, t]) => ({ id, self: t, node: byId.get(id) }))
  .sort((a, b) => b.self - a.self)
  .slice(0, topN);
for (const r of selfSorted) {
  console.log(`${us(r.self)}  ${pct(r.self)}  ${frameLabel(r.node)}`);
}

// Inclusive leaderboard, filtered to functions that aren't (root)/(program).
console.log();
console.log(`top ${topN} inclusive time (excluding root/program/idle)`);
console.log('-'.repeat(110));
const inclSorted = [...inclUs.entries()]
  .map(([id, t]) => ({ id, incl: t, node: byId.get(id) }))
  .filter(({ node }) => {
    const fn = node.callFrame.functionName;
    return !['(root)', '(program)', '(idle)', '(garbage collector)'].includes(
      fn
    );
  })
  .sort((a, b) => b.incl - a.incl)
  .slice(0, topN);
for (const r of inclSorted) {
  console.log(`${us(r.incl)}  ${pct(r.incl)}  ${frameLabel(r.node)}`);
}

// Roll-up by package.
console.log();
console.log('self-time roll-up by package');
console.log('-'.repeat(110));
const byPkg = new Map();
for (const [id, t] of selfUs) {
  const p = packageOf(byId.get(id));
  byPkg.set(p, (byPkg.get(p) || 0) + t);
}
const pkgSorted = [...byPkg.entries()].sort((a, b) => b[1] - a[1]);
for (const [p, t] of pkgSorted) {
  if (t / totalUs < 0.001) continue;
  console.log(`${us(t)}  ${pct(t)}  ${p}`);
}
