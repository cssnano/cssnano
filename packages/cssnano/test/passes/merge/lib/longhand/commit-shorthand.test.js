import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commitShorthand } from '../../../../../src/passes/merge/lib/longhand/decl/slotVector.js';
import { blockOf } from './helpers/declarationItems.js';

/**
 * Commits a shorthand over the declarations at `contributing` positions of
 * the block written as `css`.
 *
 * @param {string} css a rule, such as `a{color:red}`
 * @param {number[]} contributing
 * @param {string} prop
 * @param {string} value
 */
function commit(css, contributing, prop, value) {
  const list = blockOf(css);
  const written = commitShorthand(
    list,
    contributing.map((position) => ({
      value: list.at(position).value,
      decl: position,
    })),
    new Set(contributing),
    new Set(),
    { prop, value, important: false }
  );
  return { list, written };
}

test('commitShorthand returns the lone same-property declaration it rewrote in place', () => {
  const { list, written } = commit(
    'a{border-radius:1px 1px 1px 1px}',
    [0],
    'border-radius',
    '1px'
  );
  assert.equal(written, 0);
  assert.equal(list.at(0).value, '1px');
});

test('commitShorthand returns the declaration it inserted for a profitable cover', () => {
  const { list, written } = commit(
    'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}',
    [0, 1, 2, 3],
    'border-radius',
    '1px'
  );
  assert.equal(list.at(written).prop, 'border-radius');
  assert.deepEqual(
    [0, 1, 2, 3].map((position) => list.at(position).removed),
    [true, true, true, true]
  );
});

test('commitShorthand returns undefined when no declaration is removable, so nothing is written', () => {
  const { written } = commit(
    'a{border-radius:1px}',
    [],
    'border-radius',
    '1px'
  );
  assert.equal(written, undefined);
});

test('commitShorthand returns undefined when the cover costs more than the declarations it removes', () => {
  const { list, written } = commit(
    'a{border-top-left-radius:1px;color:red}',
    [0],
    'border-radius',
    '1px 2px 3px 4px / 5px'
  );
  assert.equal(written, undefined);
  assert.equal(list.at(0).prop, 'border-top-left-radius');
  assert.equal(list.at(0).removed, false);
});
