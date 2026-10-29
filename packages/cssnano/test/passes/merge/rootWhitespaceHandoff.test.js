import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../src/passes/ir/consistencyChecks.js';
import { mergePass } from '../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

/** @import {Root} from 'postcss' */

// The leading whitespace of the stylesheet belongs to its first child. Each
// case below moves that child by a different edit, so the whitespace must be
// handed on, or the output loses or doubles it.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {string}
 */
function merge(css) {
  /** @type {Root} */
  const root = postcss.parse(css);
  mergePass(root, resolveTargets({}, undefined));
  return root.toString();
}

test('mergePass should hand the leading whitespace of the stylesheet to the next rule when a duplicate removes the first rule', () => {
  assert.equal(
    merge('\n\na{color:red}\n  b{width:1px}\n  a{color:red}'),
    '\n\nb{width:1px}\n  a{color:red}'
  );
});

test('mergePass should hand the leading whitespace of the stylesheet to the next at-rule when a duplicate removes the first at-rule', () => {
  assert.equal(
    merge(
      '\n\n@media print{a{color:red}}\n  b{width:1px}\n  @media print{a{color:red}}'
    ),
    '\n\nb{width:1px}\n  @media print{a{color:red}}'
  );
});

test('mergePass should keep the leading whitespace of the stylesheet on the first rule when a join rewrites it in place', () => {
  assert.equal(
    merge('\n\na{color:red}\n  b{width:1px}\n  a{margin:0}'),
    '\n\na{color:red;margin:0}\n  b{width:1px}'
  );
});

test('mergePass should hand the whitespace the joined at-rule took to the next at-rule when a join moves the first at-rule down', () => {
  assert.equal(
    merge(
      '\n\n@media print{a{color:red}}\n  @media screen{a{margin:0}}\n  @media print{a{margin:1px}}'
    ),
    '\n  @media screen{a{margin:0}}\n  @media print{a{color:red;margin:1px}}'
  );
});

test('mergePass should keep the leading whitespace of the stylesheet when a sweep rewrites the first rule in its slot', () => {
  assert.equal(
    merge('\n\na{color:red}\n  a{color:red}\n  a{margin:0}'),
    '\n\na{color:red;margin:0}'
  );
});

test('mergePass should keep the leading whitespace of the stylesheet on the first at-rule when a sweep drops an emptied later at-rule', () => {
  assert.equal(
    merge(
      '\n\n@media print{a{color:red}}\n  @media print{a{color:red}}\n  @media print{b{margin:0}}'
    ),
    '\n\n@media print{a{color:red}b{margin:0}}'
  );
});
