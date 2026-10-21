import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

/**
 * @param {string} css
 * @return {number} best of two runs of the whole plugin in milliseconds, so one GC pause does not decide
 */
function timePlugin(css) {
  const run = () => {
    const start = performance.now();
    postcss([plugin()]).process(css, { from: undefined }).sync();
    return performance.now() - start;
  };
  return Math.min(run(), run());
}

/**
 * @param {number} count
 * @return {string} two rules that repeat `margin-left` count times, the second with one more declaration so the pair is a partial merge
 */
function repeatedLonghands(count) {
  let body = '';
  for (let i = 0; i < count; i++) {
    body += `margin-left:${i}px;`;
  }
  return `a{${body}}b{${body}color:red}`;
}

/**
 * @param {number} count
 * @return {string} two rules that alternate `margin` and `margin-left`, the second with one more declaration
 */
function alternatingShorthandAndLonghand(count) {
  let body = '';
  for (let i = 0; i < count; i++) {
    body += `margin:${i}px;margin-left:${i}px;`;
  }
  return `a{${body}}b{${body}color:red}`;
}

test('merging rules that repeat one longhand takes linear time as the rules grow', () => {
  timePlugin(repeatedLonghands(2000));
  const small = timePlugin(repeatedLonghands(1000));
  const large = timePlugin(repeatedLonghands(2000));
  // Doubling the input takes about two times as long for a linear pass and
  // about four times as long for a quadratic one.
  assert.ok(
    large / small < 3,
    `2000/1000 time ratio ${(large / small).toFixed(2)}`
  );
});

test('merging rules that alternate a shorthand and its longhand takes linear time as the rules grow', () => {
  timePlugin(alternatingShorthandAndLonghand(1000));
  const small = timePlugin(alternatingShorthandAndLonghand(500));
  const large = timePlugin(alternatingShorthandAndLonghand(1000));
  assert.ok(
    large / small < 3,
    `1000/500 time ratio ${(large / small).toFixed(2)}`
  );
});

/**
 * @param {number} count
 * @param {(index: number) => string} declarationAt
 * @return {string} `count` declarations, each made by `declarationAt`
 */
function declarations(count, declarationAt) {
  return Array.from({ length: count }, (_, index) => declarationAt(index)).join(
    ';'
  );
}

/**
 * @param {number} count
 * @return {string} two rules whose first declarations `-bar-c*` repeat, followed by distinct `-foo-*` names with two word counts that do not conflict with them
 */
function denseUnknownNames(count) {
  const shared = declarations(count, (i) => `-bar-c${i}:1`);
  const outside = declarations(count, (i) =>
    i % 2 ? `-foo-x${i}:2` : `-foo-y${i}-z:2`
  );
  return `a{${shared};${outside}}b{${shared};color:red}`;
}

/**
 * @param {number} count
 * @return {string} a rule repeating `count` distinct unknown names, and a later rule with `all` that repeats them and adds `count` more unknown names
 */
function laterRuleWithAll(count) {
  const shared = declarations(count, (i) => `-foo-c${i}:1`);
  const later = declarations(count, (i) => `-foo-x${i}:2`);
  return `a{${shared}}b{${shared};all:initial;${later}}`;
}

/**
 * @param {number} count
 * @return {string} a rule repeating `count` unknown names, and a later rule with `count` distinct unknown names that do not conflict with them
 */
function laterRuleWithUnsharedNames(count) {
  const shared = declarations(count, (i) => `-foo-c${i}:1`);
  const unshared = declarations(count, (i) => `-foo-x${i}:2`);
  return `a{${shared}}b{${unshared};${shared}}`;
}

test('merging rules with distinct unknown names outside the shared declarations takes linear time as the rules grow', () => {
  timePlugin(denseUnknownNames(250));
  const small = timePlugin(denseUnknownNames(250));
  const large = timePlugin(denseUnknownNames(500));
  assert.ok(
    large / small < 3,
    `500/250 time ratio ${(large / small).toFixed(2)}`
  );
});

test('merging rules when a later rule with all follows many distinct unknown names takes linear time as the rules grow', () => {
  timePlugin(laterRuleWithAll(250));
  const small = timePlugin(laterRuleWithAll(250));
  const large = timePlugin(laterRuleWithAll(500));
  assert.ok(
    large / small < 3,
    `500/250 time ratio ${(large / small).toFixed(2)}`
  );
});

test('merging rules when a later rule holds many distinct unshared unknown names takes linear time as the rules grow', () => {
  timePlugin(laterRuleWithUnsharedNames(250));
  const small = timePlugin(laterRuleWithUnsharedNames(250));
  const large = timePlugin(laterRuleWithUnsharedNames(500));
  assert.ok(
    large / small < 3,
    `500/250 time ratio ${(large / small).toFixed(2)}`
  );
});
