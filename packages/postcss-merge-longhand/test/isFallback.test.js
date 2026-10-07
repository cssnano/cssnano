import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  isFallback,
  mergeBlockingSupport,
  requiredSupport,
} from '../src/lib/isFallback.js';

test('recognizes escaped support-dependent function names', () => {
  const declaration = postcss.decl({ value: 'v\\61r(--value)' });

  assert.deepEqual(requiredSupport(declaration), new Set(['var']));
});

const requires = (/** @type {string} */ value) =>
  requiredSupport(postcss.decl({ prop: 'width', value }));

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
  const earlier = postcss.decl({ prop: 'width', value: '1px' });
  assert.equal(
    isFallback(earlier, postcss.decl({ prop: 'width', value: '5dvh' })),
    true
  );
});

test('does not treat a later longstanding unit as needing a fallback', () => {
  const earlier = postcss.decl({ prop: 'width', value: '1px' });
  assert.equal(
    isFallback(earlier, postcss.decl({ prop: 'width', value: '2em' })),
    false
  );
});

test('does not block a merge for rgba(), which authors write without fallbacks', () => {
  assert.equal(
    mergeBlockingSupport(
      postcss.decl({ prop: 'color', value: 'rgba(0,0,0,.5)' })
    ).size,
    0
  );
});

test('blocks a merge for calc(), which Opera Mini drops', () => {
  assert.deepEqual(
    mergeBlockingSupport(postcss.decl({ prop: 'width', value: 'calc(1px)' })),
    new Set(['calc'])
  );
});

test('blocks a merge for a newer unit', () => {
  assert.deepEqual(
    mergeBlockingSupport(postcss.decl({ prop: 'width', value: '5dvh' })),
    new Set(['unit:dvh'])
  );
});
