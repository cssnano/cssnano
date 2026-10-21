// Counts the two fixpoint loops of the merge-rules transform, to give
// the worklist of 6.2b numbers to beat. A *round* is one `runScan` call in
// `runMerge`, so rounds equal `joinNonAdjacent` calls. A *sweep* is one pass
// of the `do … while (moved)` loop in `runScan`.
//
// The counters wrap `RuleSequence.prototype.moveIntoParent` and `.write`:
// `scan.js` calls `write` once per sweep, and a sweep ends a round when no
// `moveIntoParent` call since the previous `write` returned true. They patch a
// shared prototype, so they live in this file only; `node --test` runs each
// file in its own process.
//
// Join chain: a declaration join creates the selector list that the next
// pass's selector join needs, and that join creates the declaration list that
// the next declaration join needs. Rounds grow with it, but scan merges
// consume most of the chain, so they grow far slower than N.
//
// Motif: a sheet in which one move and one join are each paid for by an extra
// sweep or round, repeated with fresh names. The copies merge independently in
// the same round and sweep, so every count stays constant. No family was found
// whose extra sweeps grow with N: a hill-climb on 11-rule sheets reached 5
// rounds and 7 sweeps at most, and each unblocking step it found came from a
// join between rounds, not from a move in an earlier sweep of the same round.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';

const plugin = transformPlugin('mergeRules');

const stats = { rounds: 0, sweeps: 0, maxSweepsPerRound: 0 };
let sweepMoved = false;
let roundSweeps = 0;
const moveIntoParent = RuleSequence.prototype.moveIntoParent;
RuleSequence.prototype.moveIntoParent = function (...args) {
  const moved = moveIntoParent.apply(this, args);
  sweepMoved ||= moved;
  return moved;
};
const write = RuleSequence.prototype.write;
RuleSequence.prototype.write = function () {
  stats.sweeps++;
  roundSweeps++;
  if (!sweepMoved) {
    stats.rounds++;
    stats.maxSweepsPerRound = Math.max(stats.maxSweepsPerRound, roundSweeps);
    roundSweeps = 0;
  }
  sweepMoved = false;
  return write.call(this);
};

/**
 * @param {string} css
 * @return {{output: string, rounds: number, sweeps: number, maxSweepsPerRound: number}}
 */
function run(css) {
  Object.assign(stats, { rounds: 0, sweeps: 0, maxSweepsPerRound: 0 });
  sweepMoved = false;
  roundSweeps = 0;
  const output = postcss([plugin()]).process(css, { from: undefined }).css;
  return { output, ...stats };
}

/**
 * @param {string} css
 * @return {{nodes: number, declarations: number}} N and D of the bounds
 */
function size(css) {
  let nodes = 0;
  let declarations = 0;
  postcss.parse(css).walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') nodes++;
    if (node.type === 'decl') declarations++;
  });
  return { nodes, declarations };
}

/**
 * @param {number} k
 * @return {string}
 */
function joinChain(k) {
  const rules = [];
  let separators = 0;
  // A separator keeps neighbouring rules from sharing declarations.
  const add = (rule) => {
    rules.push(rule, `.z${separators}{--z${separators++}:1}`);
  };
  add('.p{--d:1}');
  add('.q{--d:1}');
  let selector = '.p,.q';
  let declarations = '--d:1';
  for (let i = 0; i < k; i++) {
    add(`${selector}{--e${i}:1}`);
    declarations += `;--e${i}:1`;
    add(`.r${i}{${declarations}}`);
    selector += `,.r${i}`;
  }
  return rules.join('');
}

/**
 * @param {number} k
 * @return {string}
 */
function motif(k) {
  let css = '';
  for (let i = 0; i < k; i++) {
    const p = (name) => `--${name}${i}`;
    const m = '@media (b)';
    css +=
      `.e${i}{${p('m')}:1px}` +
      `${m}{.b${i}{${p('t')}:0;${p('c')}:blue}}` +
      `${m}{.d${i}{${p('w')}:1px;${p('c')}:blue}}` +
      `.a${i}{${p('w')}:1px}.b${i}{${p('m')}:1px}` +
      `${m}{.c${i}{${p('t')}:0;${p('c')}:blue;${p('m')}:0}}` +
      `.a${i}{${p('m')}:1px;${p('c')}:red}`;
  }
  return css;
}

/**
 * Sibling `@media` blocks as in picnic: one run of `k` blocks that set
 * `display`, then a run that sets `margin-left` under the same conditions and
 * one more before them. Each block of the second run joins its
 * counterpart in the first only after the block after it has.
 *
 * @param {number} k
 * @return {string}
 */
function mediaRuns(k) {
  let css = '';
  for (let i = 1; i <= k; i++) {
    css += `@media (min-width:${i}px){.c${i}{display:none}}`;
  }
  for (let i = 0; i <= k; i++) {
    css += `@media (min-width:${i}px){.d${i}{margin-left:1px}}`;
  }
  return css;
}

// Nodes per unit of k, and the offset, of each family.
const families = [
  { name: 'join-chain', build: joinChain, perUnit: 4, offset: 4 },
  { name: 'motif', build: motif, perUnit: 10, offset: 0 },
  { name: 'media-runs', build: mediaRuns, perUnit: 2, offset: 1 },
];

for (const { name, build, perUnit, offset } of families) {
  test(`${name} counts the rounds and sweeps of the merge-rules loops`, (t) => {
    for (const target of [11, 22, 44, 88, 176]) {
      const css = build(Math.max(1, Math.round((target - offset) / perUnit)));
      const { nodes, declarations } = size(css);
      const result = run(css);
      t.diagnostic(
        `${name} N=${nodes} D=${declarations} rounds=${result.rounds} ` +
          `maxSweepsPerRound=${result.maxSweepsPerRound} ` +
          `totalSweeps=${result.sweeps} extraSweeps=${result.sweeps - result.rounds}`
      );
      // Proved in `selectorMerger.js`; the sweeps have no proved bound.
      assert.ok(result.rounds <= nodes + declarations + 1);
      if (name === 'media-runs') {
        // Joining blocks needs no round of its own per block.
        assert.ok(
          result.rounds <= 3,
          `${name} N=${nodes} took ${result.rounds} rounds`
        );
      }
      assert.equal(
        run(result.output).output,
        result.output,
        `${name} N=${nodes} is not stable under a second run`
      );
    }
  });
}
