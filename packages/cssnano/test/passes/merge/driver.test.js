import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../src/passes/ir/consistencyChecks.js';
import { mergePass, transformPlugin } from '../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

/**
 * Runs the merge pass, with rule merging on unless `rules` is false.
 *
 * @param {string} css
 * @param {{ rules?: boolean }} [options]
 * @return {string}
 */
function runMergePass(css, options) {
  const root = postcss.parse(css);
  mergePass(root, resolveTargets({}, undefined), options);
  return root.toString();
}

/**
 * Runs the named transforms in order, each as its own plugin, as the hooks of
 * the merge plugin are tested.
 *
 * @param {string} css
 * @param {('mergeLonghand' | 'discardDuplicates' | 'mergeRules')[]} names
 * @return {string}
 */
function runTransforms(css, names) {
  return postcss(names.map((name) => transformPlugin(name)({}))).process(css, {
    from: undefined,
  }).css;
}

test('the discardDuplicates transform removes the repeated declaration', () => {
  assert.equal(
    runTransforms('a{color:red;color:red}', ['discardDuplicates']),
    'a{color:red}'
  );
});

// A repeated declaration within one block is also dropped by merge-longhand's
// own canonicalization, so the repeated rule isolates discardDuplicates.
test('without discardDuplicates, the mergeLonghand transform keeps the repeated rule', () => {
  assert.equal(
    runTransforms('a{color:red}a{color:red}', ['mergeLonghand']),
    'a{color:red}a{color:red}'
  );
});

test('the mergeRules transform merges adjacent rules with the same declarations', () => {
  assert.equal(
    runTransforms('a{color:red}b{color:red}', ['mergeRules']),
    'a,b{color:red}'
  );
});

test('the merge pass with rules off keeps adjacent rules with the same declarations apart', () => {
  assert.equal(
    runMergePass('a{color:red}b{color:red}', { rules: false }),
    'a{color:red}b{color:red}'
  );
});

test('the mergeLonghand transform folds four longhand margins into one shorthand', () => {
  assert.equal(
    runTransforms(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      ['mergeLonghand']
    ),
    'a{margin:1px}'
  );
});

test('without mergeLonghand, discardDuplicates and mergeRules keep four longhand margins as they are', () => {
  assert.equal(
    runTransforms(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      ['discardDuplicates', 'mergeRules']
    ),
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}'
  );
});

// Removing duplicates keeps the last copy. Run first, it would delete the
// margin:0 before the nested @media, and the later one cannot reach back
// past that block to override margin-inline-start.
test('mergePass canonicalizes before removing duplicates, so the earlier margin:0 still overrides margin-inline-start across a nested @media', () => {
  assert.equal(
    runMergePass(
      '.c{margin-inline-start:inherit;margin:0;@media (w0){color:red}margin:0}'
    ),
    '.c{@media (w0){color:red}margin:0}'
  );
});

// Sharing justify-items with a places the b declarations in a new rule, which
// did not exist during the first round and must still get the second one.
test('mergePass drops the overridden border-radius:1px from the rule that a partial merge creates', () => {
  assert.equal(
    runMergePass(
      'b{border-radius:1px}b{border-radius:0;justify-items:1px}a{justify-items:1px}'
    ),
    'b{border-radius:0}b,a{justify-items:1px}'
  );
});

// The nested @media splits the margins into two runs, which the first round
// cannot fold together. Removing its earlier copy joins the runs, and only
// the second round sees all four margins in one run.
test('mergePass with mergeLonghand and discardDuplicates folds the margins that a removed duplicate @media had separated', () => {
  assert.equal(
    runMergePass(
      '.a{margin-top:0;margin-right:0;@media (x){color:red}margin-bottom:0;margin-left:0;@media (x){color:red}}',
      { rules: false }
    ),
    '.a{margin:0;@media (x){color:red}}'
  );
});

// border-image blocks the border reduction in the first round. The later a
// rule repeats it, so removing duplicates drops it from the first a rule,
// and only the second round can reduce that rule's borders.
test('mergePass with mergeLonghand and discardDuplicates reduces the borders once the duplicate border-image is removed', () => {
  assert.equal(
    runMergePass(
      'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-image:none}b{color:blue}a{border-image:none}',
      { rules: false }
    ),
    'a{border-color:red;border-style:solid;border-width:1px}b{color:blue}a{border-image:none}'
  );
});

// Without mergeRules no block changes after the first round, so the
// overridden border-radius:1px is still there.
test('the mergeLonghand transform keeps the overridden border-radius:1px, since no merge runs', () => {
  assert.equal(
    runTransforms(
      'b{border-radius:1px}b{border-radius:0;justify-items:1px}a{justify-items:1px}',
      ['mergeLonghand']
    ),
    'b{border-radius:1px}b{border-radius:0;justify-items:1px}a{justify-items:1px}'
  );
});

// The merged rule keeps the margin-inline-start:0 from the first rule, which the
// later margin:0 overrides. Only the second round, which canonicalizes the
// receiving rule, drops it.
test('mergePass drops the margin-inline-start that the receiving rule of a merge overrides with margin', () => {
  assert.equal(
    runMergePass(
      'c{margin-inline-start:0}c{margin:0}.x{margin-inline-start:0}.x{margin:0;border-right:1px solid red}'
    ),
    'c,.x{margin:0}.x{border-right:1px solid red}'
  );
});

// The rest of the second rule, after the merge claims its shared declarations,
// keeps the overridden border-radius:1px from the first rule. Only the second
// round, which canonicalizes that remainder, drops it.
test('mergePass drops the border-radius:1px that a remainder of a merged rule overrides', () => {
  assert.equal(
    runMergePass(
      '.y{border-radius:0;margin-bottom:1px;border-color:red}a:hover{border-radius:1px}a:hover{border-radius:0;padding-left:0;margin-bottom:1px}'
    ),
    '.y{border-radius:0;border-color:red}.y,a:hover{margin-bottom:1px}a:hover{border-radius:0;padding-left:0}'
  );
});

// The merge replaces each follower rule with a clone that keeps the declarations
// it did not claim. Only the second round, which canonicalizes that clone, drops
// the border-radius:0 that the later border-radius:1px overrides.
test('mergePass drops the border-radius:0 that a rule left behind by a merge overrides', () => {
  assert.equal(
    runMergePass(
      'a:hover{margin:0;color:blue}.y{margin:0;color:red}.x{margin:0;border-radius:0}.x{border-radius:1px}'
    ),
    'a:hover{color:blue}a:hover,.y,.x{margin:0}.y{color:red}.x{border-radius:1px}'
  );
});

/**
 * Counts the calls to the root's `walk` method while `run` works on the root.
 *
 * @param {string} css
 * @param {(root: import('postcss').Root) => void} run
 * @return {number}
 */
function rootWalkCount(css, run) {
  const root = postcss.parse(css);
  const walk = root.walk;
  let count = 0;
  root.walk = (...args) => {
    count++;
    return walk.apply(root, args);
  };
  run(root);
  return count;
}

const targets = resolveTargets({}, undefined);

/**
 * Runs one transform hook over a stylesheet that is already parsed.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @param {import('postcss').Root} root
 */
function runHook(name, root) {
  return postcss([transformPlugin(name)({})]).process(root, { from: undefined })
    .css;
}

// One build walk records the blocks, and both canonicalize rounds iterate that
// list. Turning rules off still walks the root once, for the first round.
test('mergePass with rules off walks the root once, to record the blocks for both rounds', () => {
  assert.equal(
    rootWalkCount(
      'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-image:none}b{color:blue}a{border-image:none}',
      (root) => mergePass(root, targets, { rules: false })
    ),
    1
  );
});

test('the mergeLonghand transform walks the root once, for the first round', () => {
  assert.equal(
    rootWalkCount('a{color:red}', (root) => runHook('mergeLonghand', root)),
    1
  );
});

// Dedupe recurses through the tree itself and reads no block table, so it walks nothing.
test('the discardDuplicates transform does not walk the root', () => {
  assert.equal(
    rootWalkCount('a{color:red}', (root) => runHook('discardDuplicates', root)),
    0
  );
});

test('the full merge pass walks the root once, for the first round', () => {
  assert.equal(
    rootWalkCount('a{color:red}', (root) => mergePass(root, targets)),
    1
  );
});

// The joins read each at-rule's declarations from the tree, so a nested join
// that gave a rule new declarations must be visible before the at-rule is joined
// again.
test('mergePass joins an at-rule by the declarations a nested join gave its rule', () => {
  assert.equal(
    runMergePass(
      '@media print{a{width:1px}}@media print{b{color:red}a{margin-top:1px}}@media screen{b{margin:0}}@media print{.x{margin-top:1px}}'
    ),
    '@media print{a{width:1px;margin-top:1px}b{color:red}}@media screen{b{margin:0}}@media print{.x{margin-top:1px}}'
  );
});

// The empty `c{}` is needed to reach the second join this test pins.
test('mergePass joins an at-rule into an earlier one, then reads the earlier one with the joined declarations', () => {
  assert.equal(
    runTransforms(
      '@media print{.x{color:blue}}.x{color:red}@media print{a{color:red}b{width:1px}}b{margin-top:1px}@media print{a{margin:0}}c{}@media print{b{margin-top:1px}}',
      ['mergeRules']
    ),
    '@media print{.x{color:blue}}.x{color:red}@media print{a{color:red;margin:0}b{width:1px}}b{margin-top:1px}c{}@media print{b{margin-top:1px}}'
  );
});

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

// Park-Miller generator: products stay below 2 ** 53, and the repository
// forbids bitwise operators.
/** @param {number} seed @return {() => number} */
function random(seed) {
  let state = seed * 7919 + 1;
  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  for (let i = 0; i < 8; i++) next();
  return next;
}

const DECLARATIONS = [
  'color:red',
  'color:blue',
  'margin:0',
  'margin-top:0',
  'margin-left:0',
  'width:1px',
  'justify-items:1px',
  'border-radius:1px',
];

/**
 * A nested stylesheet whose blocks repeat declarations, so every join and
 * move has something to act on, at any depth.
 *
 * @param {() => number} next
 * @param {number} depth
 * @return {string}
 */
function block(next, depth) {
  const items = 1 + Math.floor(next() * 5);
  let css = '';
  for (let i = 0; i < items; i++) {
    const roll = next();
    if (depth < 3 && roll < 0.4) {
      const query = next() < 0.5 ? '(x)' : '(y)';
      css += `@media ${query}{${block(next, depth + 1)}}`;
    } else if (depth < 3 && roll < 0.45) {
      css += `@layer q{${block(next, depth + 1)}}`;
    } else {
      const picks = 1 + Math.floor(next() * 3);
      const decls = [];
      for (let j = 0; j < picks; j++) {
        decls.push(DECLARATIONS[Math.floor(next() * DECLARATIONS.length)]);
      }
      const selector = next() < 0.5 ? 'a' : 'b';
      css += `${selector}{${decls.join(';')}}`;
    }
  }
  return css;
}

// Every test in this file reads summaries with the consistency checks on, so a
// stale summary throws.
test('mergePass finds no stale block summary on nested generated sheets, with rules on or off', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const css = block(random(seed), 0);
    runMergePass(css, { rules: true });
    runMergePass(css, { rules: false });
  }
});

test('the mergeRules transform finds no stale block summary on nested generated sheets', () => {
  for (let seed = 1; seed <= 300; seed++) {
    runTransforms(block(random(seed), 0), ['mergeRules']);
  }
});

// The first round leaves the border colours and widths unreduced, and neither
// removing duplicates nor merging rules changes the block. The second round
// still reduces it, as the second merge-longhand run of the default preset did.
test('the merge pass gives a block that no duplicate removal or rule merge changed the second longhand round', () => {
  assert.equal(
    runMergePass(
      'a{border-right:double color-mix(in srgb,red,blue);border-right-color:color-mix(in srgb,red,blue);border:medium solid rgba(0,0,0,.5);border-left-color:currentcolor;border-bottom-color:blue;border-width:2px}'
    ),
    'a{border-color:rgba(0,0,0,.5) rgba(0,0,0,.5) blue currentcolor;border-style:solid;border-width:2px}'
  );
});
