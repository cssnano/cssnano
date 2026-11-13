import { test } from 'node:test';
import assert from 'node:assert/strict';
import { longstandingFeatures } from '../../../../../src/passes/ir/syntaxFeatures.js';
import {
  isFallback,
  mergeBlockingSupport,
  requiredSupport,
} from '../../../../../src/passes/merge/lib/longhand/isFallback.js';
import { itemOf } from './helpers/declarationItems.js';

test('recognizes escaped support-dependent function names', () => {
  const declaration = itemOf('width: v\\61r(--value)');

  assert.deepEqual(requiredSupport(declaration), new Set(['var']));
});

const requires = (/** @type {string} */ value) =>
  requiredSupport(itemOf(`width: ${value}`));

test('requires unit support for a newer length unit', () => {
  assert.deepEqual(requires('5DVH'), new Set(['unit:dvh']));
});

test('requires keyword support for revert-layer', () => {
  assert.deepEqual(requires('Revert-Layer'), new Set(['keyword:revert-layer']));
});

test('requires alpha hex support for a four-digit hex colour', () => {
  assert.deepEqual(requires('#ffff'), new Set(['hex-alpha']));
});

test('requires alpha hex support for an eight-digit hex colour', () => {
  assert.deepEqual(requires('#ff00ff80'), new Set(['hex-alpha']));
});

test('requires prefixed function support for a vendor-prefixed function', () => {
  assert.deepEqual(requires('-webkit-calc(2px)'), new Set(['-webkit-calc']));
});

// CSS Syntax 3 starts a dimension's unit with any ident code point.
test('requires unit support for a unit that starts with a non-ASCII letter', () => {
  assert.deepEqual(requires('1éx'), new Set(['unit:éx']));
});

test('requires unit support for a unit that starts with an underscore', () => {
  assert.deepEqual(requires('1_px'), new Set(['unit:_px']));
});

test('requires unit support for a unit that starts with a hyphen', () => {
  assert.deepEqual(requires('1-foo'), new Set(['unit:-foo']));
});

test('requires keyword support for revert in any letter case', () => {
  assert.deepEqual(requires('ReVeRt'), new Set(['keyword:revert']));
});

test('requires keyword support for initial in any letter case', () => {
  assert.deepEqual(requires('InItIaL'), new Set(['keyword:initial']));
});

test('requires keyword support for unset', () => {
  assert.deepEqual(requires('unset'), new Set(['keyword:unset']));
});

test('requires nothing for inherit, which every browser parses', () => {
  assert.deepEqual(requires('inherit'), new Set());
});

test('requires nothing for longstanding units and six-digit hex colours', () => {
  assert.deepEqual(requires('1px 2em #fff #ffffff'), new Set());
});

test('treats an earlier longstanding unit as a fallback for a later newer unit', () => {
  const earlier = itemOf('width: 1px');
  assert.equal(
    isFallback(earlier, itemOf('width: 5dvh'), longstandingFeatures),
    true
  );
});

test('does not treat a later longstanding unit as needing a fallback', () => {
  const earlier = itemOf('width: 1px');
  assert.equal(
    isFallback(earlier, itemOf('width: 2em'), longstandingFeatures),
    false
  );
});

test('does not block a merge for rgba(), which authors write without fallbacks', () => {
  assert.equal(
    mergeBlockingSupport(itemOf('color: rgba(0,0,0,.5)'), longstandingFeatures)
      .size,
    0
  );
});

test('blocks a merge for calc(), which Opera Mini drops', () => {
  assert.deepEqual(
    mergeBlockingSupport(itemOf('width: calc(1px)'), longstandingFeatures),
    new Set(['calc'])
  );
});

test('blocks a merge for a newer unit', () => {
  assert.deepEqual(
    mergeBlockingSupport(itemOf('width: 5dvh'), longstandingFeatures),
    new Set(['unit:dvh'])
  );
});
