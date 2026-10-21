import { test } from 'node:test';
import { transformPlugin } from '#passes/merge';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
const plugin = transformPlugin('mergeRules');

/**
 * @param {string} css
 * @return {number} one run of the whole plugin in milliseconds
 */
function timePlugin(css) {
  return timeOneRun(plugin, css);
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
  assertLinearTime((size) => timePlugin(repeatedLonghands(size)), 6000);
});

test('merging rules that alternate a shorthand and its longhand takes linear time as the rules grow', () => {
  assertLinearTime(
    (size) => timePlugin(alternatingShorthandAndLonghand(size)),
    5000
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
  assertLinearTime((size) => timePlugin(denseUnknownNames(size)), 5000);
});

test('merging rules when a later rule with all follows many distinct unknown names takes linear time as the rules grow', () => {
  assertLinearTime((size) => timePlugin(laterRuleWithAll(size)), 5000);
});

test('merging rules when a later rule holds many distinct unshared unknown names takes linear time as the rules grow', () => {
  assertLinearTime(
    (size) => timePlugin(laterRuleWithUnsharedNames(size)),
    5000
  );
});
