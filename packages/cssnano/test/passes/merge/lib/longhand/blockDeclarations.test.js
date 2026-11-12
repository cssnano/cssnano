import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '#utils';
import {
  BlockDeclarations,
  RUN_END,
} from '../../../../../src/passes/merge/lib/longhand/blockDeclarations.js';
import { requiredSupport } from '../../../../../src/passes/merge/lib/longhand/isFallback.js';

/**
 * An authored declaration item, as the adapter builds one from a node.
 *
 * @param {string} prop
 * @param {string} value
 * @param {object} [fields]
 * @return {import('../../../../../src/passes/merge/lib/longhand/blockDeclarations.js').DeclarationItem}
 */
function item(prop, value, fields = {}) {
  return {
    prop,
    value,
    tokens: cssnanoUtils.tokens(value),
    important: false,
    before: '\n  ',
    between: ': ',
    importantSpelling: undefined,
    inheritedSupport: null,
    kept: false,
    removed: false,
    rewritten: false,
    source: -1,
    ...fields,
  };
}

test('a rewrite of the value sets the new text and tokens of that text, and marks the item rewritten', () => {
  const list = new BlockDeclarations([item('margin', '0 0 0 0')], [0]);
  list.rewrite(0, 'margin', '0');
  const rewritten = list.at(0);
  assert.equal(rewritten.value, '0');
  assert.deepEqual(rewritten.tokens, cssnanoUtils.tokens('0'));
  assert.equal(rewritten.rewritten, true);
});

test('a rewrite of the property alone keeps the tokens of the value', () => {
  const list = new BlockDeclarations([item('border-top', '1px solid')], [0]);
  const before = list.at(0).tokens;
  list.rewrite(0, 'border', '1px solid', before);
  assert.equal(list.at(0).prop, 'border');
  assert.equal(list.at(0).tokens, before);
});

test('a removal marks the item removed without moving it from its position', () => {
  const list = new BlockDeclarations(
    [item('color', 'red'), item('margin', '0')],
    [0, 1]
  );
  list.remove(0);
  assert.equal(list.at(0).removed, true);
  assert.equal(list.at(1).removed, false);
  assert.deepEqual(list.chain, [0, 1]);
});

test('a clone takes the raws and the important spelling of its source, and is pushed after the items', () => {
  const list = new BlockDeclarations(
    [item('margin', '0', { between: ':', importantSpelling: '!important' })],
    [0]
  );
  const position = list.insertClone(0, {
    prop: 'margin-top',
    value: '1px',
    important: true,
  });
  const clone = list.at(position);
  assert.equal(position, 1);
  assert.equal(clone.source, 0);
  assert.equal(clone.before, '\n  ');
  assert.equal(clone.between, ':');
  assert.equal(clone.importantSpelling, '!important');
  assert.equal(clone.important, true);
  assert.equal(clone.prop, 'margin-top');
  assert.equal(clone.value, '1px');
  assert.deepEqual(list.chain, [0]);
});

test('a clone records the support its source required, as the source has it at the time', () => {
  const source = item('display', 'grid');
  const list = new BlockDeclarations([source], [0]);
  const position = list.insertClone(0, {
    prop: 'display',
    value: 'grid',
    important: false,
  });
  assert.deepEqual(
    list.at(position).inheritedSupport,
    requiredSupport(list.at(0))
  );
  assert.equal(list.at(0).inheritedSupport, null);
});

test('a clone of a clone unites the support its ancestors required', () => {
  const source = item('margin', '0', {
    inheritedSupport: new Set(['unit:dvh']),
  });
  const list = new BlockDeclarations([source], [0]);
  const first = list.insertClone(0, {
    prop: 'margin-top',
    value: '1px',
    important: false,
  });
  const second = list.insertClone(first, {
    prop: 'margin-left',
    value: '1px',
    important: false,
  });
  assert.ok(list.at(second).inheritedSupport.has('unit:dvh'));
});

test('the chain keeps the run ends between declarations, in source order', () => {
  const list = new BlockDeclarations(
    [item('color', 'red'), item('margin', '0'), item('top', '1px')],
    [0, RUN_END, 1, 2]
  );
  assert.deepEqual(list.chain, [0, RUN_END, 1, 2]);
});
