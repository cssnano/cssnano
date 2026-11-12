import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { resolveTargets } from '../../../../../src/utils/browserTargets.js';
import { targetSupportOf } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  canonicalizeRecords,
  longhandContext,
} from '../../../../../src/passes/merge/lib/longhand/canonicalize.js';
import { discardDuplicates } from '../../../../../src/passes/merge/lib/duplicates/discardDuplicates.js';
import runMerge from '../../../../../src/passes/merge/lib/rules/selectorMerger.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import { fillSummaries } from '../../../../../src/passes/merge/lib/rules/selectorList.js';
import { childEntriesOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  AT_RULE_BLOCK,
  DECLARATION,
  RULE,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {DeclarationRecord} from '../../../../../src/passes/ir/declarationRecord.js' */

const browsers = resolveTargets({}, undefined);

// Four equal sides, which the first longhand round turns into derived
// `border-color`, `border-style` and `border-width` declarations.
const SIDES =
  'border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red';

/**
 * Runs the merge transforms of the default preset on the records of `css`, in
 * the order of the pass, and stops before write-back.
 *
 * @param {string} css
 * @return {BlockRecords}
 */
function mergedRecords(css) {
  const support = targetSupportOf(browsers);
  const context = createRunContext(undefined, true, support.features);
  const { records } = buildRecords(postcss.parse(css), context);
  fillSummaries(records, context.tokenLists, browsers);
  const first = longhandContext(
    support.placeShorthands,
    support.boxSupport,
    support.pairShorthands,
    context,
    records
  );
  canonicalizeRecords(records, first);
  discardDuplicates(records, browsers, context);
  runMerge(records, browsers, context);
  const second = longhandContext(
    support.placeShorthands,
    support.boxSupport,
    support.pairShorthands,
    context,
    records
  );
  second.setsOtherColumn = first.setsOtherColumn;
  canonicalizeRecords(records, second);
  return records;
}

/**
 * The declaration records of the live tree that a clone made, which carry a
 * template.
 *
 * @param {BlockRecords} records
 * @param {number} index the block or rule to walk
 * @param {DeclarationRecord[]} [found]
 * @return {DeclarationRecord[]}
 */
function clonesIn(records, index, found = []) {
  for (const entry of childEntriesOf(records, index)) {
    if (entry.kind === DECLARATION) {
      const declaration = /** @type {DeclarationRecord} */ (entry);
      if (declaration.template !== -1) found.push(declaration);
    } else if (entry.kind === RULE || entry.kind === AT_RULE_BLOCK) {
      clonesIn(records, /** @type {number} */ (entry.index), found);
    }
  }
  return found;
}

/**
 * Asserts that the clones of the merged records are derived and that at least
 * one clone exists, so the check cannot pass on an empty set.
 *
 * @param {string} css
 * @return {void}
 */
function assertClonesDerived(css) {
  const records = mergedRecords(css);
  const clones = clonesIn(records, records.root.index);
  assert.ok(clones.length > 0, 'the merge leaves a derived declaration');
  for (const clone of clones) {
    assert.notEqual(clone.inheritedSupport, null, clone.prop);
  }
}

test('a merged rule keeps the support of the derived declarations the first round made', () => {
  assertClonesDerived(`a{${SIDES}}b{${SIDES}}`);
});

test('the leftover of an earlier merged rule keeps the support of its derived declarations', () => {
  assertClonesDerived(`a{${SIDES};color:green}b{color:green;margin:0}`);
});

test('the leftover of a later merged rule keeps the support of its derived declarations', () => {
  assertClonesDerived(`a{color:green;margin:0}b{color:green;${SIDES}}`);
});

test('the leftover of a follower keeps the support of its derived declarations', () => {
  assertClonesDerived(
    `a{color:green;margin:0}b{color:green;margin:1px}c{color:green;${SIDES}}`
  );
});
