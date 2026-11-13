import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { runDriver } from '../../src/passes/ir/runDriver.js';
import { scopeKeyOf } from '../../src/pipeline/overridable.js';
import { walkDown } from '../../src/pipeline/walkDown.js';

/**
 * The scope key of each outermost overridable at-rule of `css`, in document
 * order, read from the records the build makes of it.
 *
 * @param {string} css
 * @return {number[]}
 */
function scopeKeysOf(css) {
  const context = createRunContext();
  const { records } = runDriver.build(postcss.parse(css), context);
  return walkDown(records).map((index) =>
    scopeKeyOf(records, context.declarations, index)
  );
}

/**
 * The outermost overridable at-rules of `css`, counted.
 *
 * @param {string} css
 * @return {number}
 */
function countOf(css) {
  const context = createRunContext();
  const { records } = runDriver.build(postcss.parse(css), context);
  return walkDown(records).length;
}

describe('the scope key of an overridable at-rule', () => {
  test('two keyframes of one name at the top level share a scope', () => {
    const [first, second] = scopeKeysOf('@keyframes a{}@keyframes a{}');
    assert.equal(first, second);
  });

  test('two keyframes of different names at the top level do not share a scope', () => {
    const [first, second] = scopeKeysOf('@keyframes a{}@keyframes b{}');
    assert.notEqual(first, second);
  });

  test('two keyframes of one name in equal media queries share a scope', () => {
    const [first, second] = scopeKeysOf(
      '@media (x){@keyframes a{}}@media (x){@keyframes a{}}'
    );
    assert.equal(first, second);
  });

  test('two keyframes of one name in media queries with different preludes do not share a scope', () => {
    const [first, second] = scopeKeysOf(
      '@media (x){@keyframes a{}}@media (y){@keyframes a{}}'
    );
    assert.notEqual(first, second);
  });

  test('a rule around a keyframes does not separate its scope from a top-level one', () => {
    const [first, second] = scopeKeysOf('a{@keyframes x{}}@keyframes x{}');
    assert.equal(first, second);
  });

  test('keyframes under a media query and under a supports query with one prelude do not share a scope', () => {
    const [first, second] = scopeKeysOf(
      '@media (x){@keyframes a{}}@supports (x){@keyframes a{}}'
    );
    assert.notEqual(first, second);
  });

  test('two keyframes in anonymous layers share a scope, as the host walk always had it', () => {
    // The layer prelude is empty in both, so the scope does not tell the two layers apart.
    const [first, second] = scopeKeysOf(
      '@layer{@keyframes a{}}@layer{@keyframes a{}}'
    );
    assert.equal(first, second);
  });
});

describe('the outermost overridable at-rules of a stylesheet', () => {
  test('an overridable at-rule nested in another is not collected', () => {
    assert.equal(countOf('@keyframes a{@keyframes b{}}'), 1);
  });

  test('a counter-style statement is collected', () => {
    assert.equal(countOf('@counter-style x;'), 1);
  });

  test('a comment and an at-rule that is not overridable are not collected', () => {
    assert.equal(countOf('/*c*/@media x{}'), 0);
  });
});
