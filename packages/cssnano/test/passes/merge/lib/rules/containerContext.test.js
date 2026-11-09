import {
  blocks,
  containers,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { test } from 'node:test';
import { buildTestRecords } from './liveRecords.js';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import cssnanoUtils from '../../../../../src/utils/index.js';
import { sameContainer } from '../../../../../src/passes/merge/lib/rules/sameContainer.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertContextsCurrent } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { random } from '../../../../../../../util/fuzzRng.js';

/** @import {AnyNode, AtRule, Rule} from 'postcss' */
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {BlockRecord} from '../../../../../src/passes/merge/lib/rules/blockRecord.js' */
/** @import {RuleRecord} from '../../../../../src/passes/merge/lib/rules/ruleRecord.js' */
/** @import {TextTable} from '../../../../../src/values/textTable.js' */

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/**
 * The definition of one container: equal at-rule names under ASCII case
 * folding and equal preludes, except that an anonymous layer equals only
 * itself; equal selectors for rules; equal types otherwise.
 *
 * @param {AnyNode} a
 * @param {AnyNode} b
 * @param {TextTable} textTable
 * @return {boolean}
 */
function sameBlock(a, b, textTable) {
  if (a.type === 'atrule' && b.type === 'atrule') {
    const name = asciiLowerCase(a.name);
    if (name !== asciiLowerCase(b.name)) return false;
    if (name === 'layer') {
      const anonA = isAnonymousLayer(/** @type {AtRule} */ (a), textTable);
      const anonB = isAnonymousLayer(/** @type {AtRule} */ (b), textTable);
      if (anonA || anonB) return a === b;
    }
    return a.params === b.params;
  }
  if (a.type === 'rule' && b.type === 'rule') {
    return (
      /** @type {Rule} */ (a).selector === /** @type {Rule} */ (b).selector
    );
  }
  return a.type === b.type;
}

/**
 * The oracle: two blocks are one container when they and every pair of
 * enclosing blocks up to the stylesheet are equal blocks.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord | RuleRecord | undefined} a
 * @param {BlockRecord | RuleRecord | undefined} b
 * @param {TextTable} textTable
 * @return {boolean}
 */
function sameChain(records, a, b, textTable) {
  if (!a || !b) return !a && !b;
  return (
    sameBlock(a.node, b.node, textTable) &&
    sameChain(
      records,
      records.enclosingContainer(a.index),
      records.enclosingContainer(b.index),
      textTable
    )
  );
}

/**
 * @param {string} css
 * @return {MergeState}
 */
function stateOf(css) {
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(
    postcss.parse(css),
    state,
    new TextTable(),
    true
  );
  return state;
}

const preludes = /** @type {const} */ ([
  ['media', 'screen'],
  ['MEDIA', 'screen'],
  ['media', 'Screen'],
  ['media', 'print'],
  ['supports', '(x:y)'],
  ['layer', ''],
  ['layer', 'a'],
  ['layer', '/* c */'],
  ['scope', '(.a)'],
]);
const selectors = ['a', '.b', 'A'];

/**
 * A stylesheet of nested rules and at-rules with few distinct preludes, so
 * equal and unequal chains both occur often.
 *
 * @param {ReturnType<typeof random>} rng
 * @param {number} depth
 * @return {string}
 */
function generateBlocks(rng, depth) {
  let css = '';
  const count = 1 + rng.int(3);
  for (let i = 0; i < count; i++) {
    const inner =
      depth > 0 && rng.chance(0.6) ? generateBlocks(rng, depth - 1) : '';
    if (rng.chance(0.6)) {
      const [name, params] = rng.pick(preludes);
      css += `@${name} ${params}{${inner}x{y:z}}`;
    } else {
      css += `${rng.pick(selectors)}{p:q;${inner}}`;
    }
  }
  return css;
}

test('sameContainer agrees with the definition of one container on every pair of blocks of random stylesheets', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const css = generateBlocks(random(seed), 3);
    const state = stateOf(css);
    const holders = [...containers(state.records)];
    for (const a of holders) {
      for (const b of holders) {
        assert.strictEqual(
          sameContainer(a, b),
          sameChain(state.records, a, b, state.textTable),
          `${css}: ${a.index} and ${b.index}`
        );
      }
    }
  }
});

test('assertContextsCurrent accepts the contexts the build assigns', () => {
  const state = stateOf('@media screen{.a{@layer{b{c:d}}}}@layer x{e{f:g}}');
  assert.doesNotThrow(() => assertContextsCurrent(state));
});

test('assertContextsCurrent throws when a block keeps the context of another place', () => {
  const state = stateOf('@media screen{a{b:c}}@media print{d{e:f}}');
  const [, screen, print] = blocks(state.records);
  screen.context = print.context;
  assert.throws(() => assertContextsCurrent(state), /context/v);
});
