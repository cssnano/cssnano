// Summarize a V8 .cpuprofile by hottest self-time and hottest inclusive (total)
// time, plus a roll-up by package (postcss-* / postcss / node internals).
//
// Usage:
//   node util/analyze-cpuprofile.mjs <path/to/profile.cpuprofile> [topN]

import { readFileSync } from 'fs';

const profilePath = process.argv[2];
if (!profilePath) {
  console.error('usage: node util/analyze-cpuprofile.mjs <profile> [topN]');
  process.exit(1);
}
// topN: number of rows to print in each leaderboard.
const topN = Number(process.argv[3]) || 25;

const prof = JSON.parse(readFileSync(profilePath, 'utf8'));
const { nodes, samples, timeDeltas } = prof;

// Index by id.
const byId = new Map(nodes.map((n) => [n.id, n]));

// Build child->parent map (nodes only store children, not parents).
const parentOf = new Map();
for (const n of nodes) {
  if (n.children) for (const c of n.children) parentOf.set(c, n.id);
}

function frameLabel(node) {
  const callFrame = node.callFrame;
  const name = callFrame.functionName || '(anonymous)';
  let url = callFrame.url || '';
  if (!url && callFrame.scriptId === '0') {
    return `${name} @ <gc/internals>`;
  }
  // Prepend the package name so plugin OnceExit's are distinguishable, then
  // show the in-package path (lib/foo.js or src/index.js).
  const pkg = packageOf(node);
  const inPkg = url.match(/\/(src|lib|dist|types)\/(.+)$/);
  const tail = inPkg ? `${inPkg[1]}/${inPkg[2]}` : url.replace(/^.*\//, '');
  return `${name} @ ${pkg}/${tail || '<?>'}`;
}

function packageOf(node) {
  const url = node.callFrame.url || '';
  if (!url) {
    const fn = node.callFrame.functionName;
    if (fn === '(garbage collector)') return '<gc>';
    if (fn === '(program)' || fn === '(root)' || fn === '(idle)') return fn;
    return '<internal>';
  }
  if (url.startsWith('node:')) return url;
  const m = url.match(/packages\/([^/]+)\//);
  if (m) return m[1];
  // Name after the last node_modules/: independent of store layout (pnpm's
  // .pnpm key, npm/yarn flat, nesting), so pnpm upgrades can't break it.
  const lastNodeModules = url.lastIndexOf('node_modules/');
  if (lastNodeModules !== -1) {
    const after = url.slice(lastNodeModules + 'node_modules/'.length);
    const m2 = after.match(/^(@[^/]+\/[^/]+|[^/]+)/);
    if (m2 && m2[1] !== '.pnpm') return m2[1];
  }
  return url.replace(/^.*\//, '');
}

// Self time per node id.
const selfTimePerNodeId = new Map();
for (let i = 0; i < samples.length; i++) {
  const id = samples[i];
  const dt = timeDeltas[i] || 0;
  selfTimePerNodeId.set(id, (selfTimePerNodeId.get(id) || 0) + dt);
}

const totalUs = samples.length
  ? prof.endTime - prof.startTime
  : timeDeltas.reduce((a, b) => a + b, 0);

// Inclusive time: walk from each sample leaf up to the root, adding the delta.
const inclusiveTimePerNodeId = new Map();
for (let i = 0; i < samples.length; i++) {
  const dt = timeDeltas[i] || 0;
  let id = samples[i];
  // Avoid double-counting if recursion creates cycles (shouldn't happen for trees).
  const seen = new Set();
  while (id != null && !seen.has(id)) {
    seen.add(id);
    inclusiveTimePerNodeId.set(id, (inclusiveTimePerNodeId.get(id) || 0) + dt);
    id = parentOf.get(id);
  }
}

const us = (n) => (n / 1000).toFixed(1).padStart(9) + ' ms';
const pct = (n) => ((n / totalUs) * 100).toFixed(2).padStart(6) + '%';

console.log(`profile: ${profilePath}`);
console.log(
  `samples: ${samples.length}, wall: ${(totalUs / 1000).toFixed(0)} ms`
);
console.log();

// Self-time leaderboard.
console.log(`top ${topN} self time`);
console.log('-'.repeat(110));
const selfSorted = [...selfTimePerNodeId.entries()]
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
const inclSorted = [...inclusiveTimePerNodeId.entries()]
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
for (const [id, t] of selfTimePerNodeId) {
  const p = packageOf(byId.get(id));
  byPkg.set(p, (byPkg.get(p) || 0) + t);
}
const pkgSorted = [...byPkg.entries()].sort((a, b) => b[1] - a[1]);
for (const [p, t] of pkgSorted) {
  if (t / totalUs < 0.001) continue;
  console.log(`${us(t)}  ${pct(t)}  ${p}`);
}
