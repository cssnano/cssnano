import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../src/presets/default.js';
import { resolveTargets } from '../../src/utils/browserTargets.js';
import { targetSupportOf } from '../../src/merge/longhand/targetSupport.js';
import { createRunContext } from '../../src/run/runContext.js';
import { buildRecords } from '../../src/ir/tree/buildRecords.js';
import { writeBack } from '../../src/ir/tree/writeBack.js';
import {
  canonicalizeRecords,
  LonghandRound,
} from '../../src/merge/longhand/canonicalize.js';
import { AT_RULE_BLOCK, RULE } from '../../src/ir/blockRecord.js';

const browsers = resolveTargets({}, undefined);

/**
 * Builds the records of `css` and the longhand round of its run.
 *
 * @param {string} css
 */
function setUp(css) {
  const support = targetSupportOf(browsers);
  const root = postcss.parse(css);
  const run = createRunContext(undefined, support.features);
  const { records, nodes } = buildRecords(root, run);
  const round = new LonghandRound(
    support.placeShorthands,
    support.boxSupport,
    support.pairShorthands,
    run
  );
  return { root, records, nodes, run, round };
}

/**
 * Writes the records back and returns the text.
 *
 * @param {ReturnType<typeof setUp>} setup
 * @return {string}
 */
function textOf({ root, records, nodes, run }) {
  writeBack(records, nodes, run.tokenLists);
  return root.toString();
}

/**
 * Visits the rule and at-rule blocks under `index` in document order, the order
 * the walks reach them.
 *
 * @param {import('../../src/ir/blockRecords.js').BlockRecords} records
 * @param {number} index
 * @param {(entry: number) => void} visit
 */
function eachBlock(records, index, visit) {
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const { kind } = records.entry(entry);
    if (kind !== RULE && kind !== AT_RULE_BLOCK) continue;
    visit(entry);
    eachBlock(records, entry, visit);
  }
}

test('a rule with only a nested rule is left byte-identical by its own round call', () => {
  const css = 'a{b{color:red}}';
  const setup = setUp(css);
  const outer = setup.records.links.firstChild(setup.records.root.index);
  setup.round.first(setup.records, outer);
  assert.equal(textOf(setup), css);
});

test('a round call on a rule with only a nested rule gathers no column rule', () => {
  const setup = setUp('a{b{column-width:10px;column-count:2}}');
  const outer = setup.records.links.firstChild(setup.records.root.index);
  setup.round.first(setup.records, outer);
  assert.equal(setup.round.columnRules.length, 0);
  assert.equal(setup.round.otherColumnBlocks.length, 0);
});

test('a column-width and column-count pair without a column-height set elsewhere is reduced by the two rounds', () => {
  const setup = setUp('a{column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  eachBlock(setup.records, setup.records.root.index, (entry) =>
    setup.round.second(setup.records, entry)
  );
  assert.equal(textOf(setup), 'a{columns:10px 2}');
});

test('a column-width and column-count pair with a column-height set elsewhere is left as written by the two rounds', () => {
  const setup = setUp('a{columns:10px/2}b{column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  eachBlock(setup.records, setup.records.root.index, (entry) =>
    setup.round.second(setup.records, entry)
  );
  assert.equal(
    textOf(setup),
    'a{columns:10px/2}b{column-width:10px;column-count:2}'
  );
});

test('the second round gathers no column rule or column block', () => {
  const setup = setUp('a{columns:10px/2;column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  eachBlock(setup.records, setup.records.root.index, (entry) =>
    setup.round.second(setup.records, entry)
  );
  assert.equal(setup.round.columnRules.length, 0);
  assert.equal(setup.round.otherColumnBlocks.length, 0);
});

test('after the first round, the round holds no column rule or column block', () => {
  const setup = setUp('a{columns:10px/2}b{column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  assert.equal(setup.round.columnRules.length, 0);
  assert.equal(setup.round.otherColumnBlocks.length, 0);
});

test('the first round keeps setsOtherColumn true when a column-height is set elsewhere', () => {
  const setup = setUp('a{columns:10px/2}b{column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  assert.equal(setup.round.setsOtherColumn, true);
});

test('the first round keeps setsOtherColumn false when no column-height is set', () => {
  const setup = setUp('a{column-width:10px;column-count:2}');
  canonicalizeRecords(setup.records, setup.round);
  assert.equal(setup.round.setsOtherColumn, false);
});

// The guards of the second round's skip condition. Each sheet's nested rule or
// at-rule ends a run, and the merge removes it, so the two runs of longhands
// join in the second round on a block whose own declarations the merge left
// alone. A skip that looks only at the block's declarations would keep them apart.

/**
 * @param {string} css
 * @param {{disable?: string[]}} [options]
 * @return {Promise<string>} the output of the default preset
 */
async function defaultPresetOutput(css, options) {
  const result = await postcss(preset(options)).process(css, {
    from: undefined,
  });
  return result.css;
}

test('a merge that removes a nested rule between two longhand runs joins them in the default preset', async () => {
  const css =
    'a{margin-top:0;margin-right:0;& b{color:red}margin-bottom:0;margin-left:0;& b{color:red}}';
  assert.equal(await defaultPresetOutput(css), 'a{margin:0;& b{color:red}}');
});

test('a merge that removes a nested rule between two longhand runs joins them with discardEmpty disabled', async () => {
  const css =
    'a{margin-top:0;margin-right:0;& b{color:red}margin-bottom:0;margin-left:0;& b{color:red}}';
  assert.equal(
    await defaultPresetOutput(css, { disable: ['discardEmpty'] }),
    'a{margin:0;& b{color:red}}'
  );
});

test('a merge that removes a keyframes at-rule between two longhand runs joins them in the default preset', async () => {
  const css =
    'a{margin-top:0;margin-right:0;@keyframes k{from{color:red}}margin-bottom:0;margin-left:0}@keyframes k{from{color:blue}}';
  assert.equal(
    await defaultPresetOutput(css),
    'a{margin:0}@keyframes k{0%{color:blue}}'
  );
});

test('a merge that removes a nested rule with a declaration joins the longhand runs in the default preset', async () => {
  const css =
    'a{margin-top:0;margin-right:0;& b{color:red;top:0}margin-bottom:0;margin-left:0;& b{top:0}& b{color:red}}';
  assert.equal(
    await defaultPresetOutput(css),
    'a{margin:0;& b{top:0;color:red}}'
  );
});

test('the second round leaves the stamp of each block that the first round and finishColumns left alone', () => {
  // The first round edits `a`; `b`, `c`, `d`, `e` and `f` are left alone, with
  // a column pair with and without a column-height set elsewhere.
  const setup = setUp(
    'a{margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;color:red}' +
      'b{column-width:10px;column-count:2}' +
      'c{columns:10px/2}' +
      'd{color:red}' +
      '@media (x){e{top:0}f{column-width:10px;column-count:2}}'
  );
  const stamps = setup.records.declarationStamps;
  const built = new Map();
  eachBlock(setup.records, setup.records.root.index, (entry) =>
    built.set(entry, stamps.stampOf(entry))
  );
  canonicalizeRecords(setup.records, setup.round);
  const left = [];
  eachBlock(setup.records, setup.records.root.index, (entry) => {
    if (stamps.stampOf(entry) === built.get(entry)) left.push(entry);
  });
  assert.ok(left.length > 0);
  const after = left.map((entry) => stamps.stampOf(entry));
  eachBlock(setup.records, setup.records.root.index, (entry) =>
    setup.round.second(setup.records, entry)
  );
  assert.deepEqual(
    left.map((entry) => stamps.stampOf(entry)),
    after
  );
});
