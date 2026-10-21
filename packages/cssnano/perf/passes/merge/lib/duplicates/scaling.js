import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
const plugin = transformPlugin('discardDuplicates');

/**
 * @param {string} css
 * @return {number} one run of the whole plugin in milliseconds
 */
function timePlugin(css) {
  return timeOneRun(plugin, css);
}

/**
 * @param {number} count
 * @return {string} sibling at-rules with distinct parameters
 */
function distinctMediaBlocks(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `@media (w${i}){h1{display:block}}`;
  }
  return css;
}

/**
 * @param {number} count
 * @return {string} one rule whose `color` values are all distinct
 */
function distinctColors(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `color:c${i};`;
  }
  return `h1{${css}}`;
}

/**
 * @param {() => void} work
 * @return {number} the children PostCSS scans to remove nodes during `work`,
 * counted as the container's size at each removal
 */
function countRemovalScans(work) {
  const { removeChild } = postcss.Container.prototype;
  let scanned = 0;
  postcss.Container.prototype.removeChild = function (child, ...rest) {
    scanned += this.nodes.length;
    return removeChild.call(this, child, ...rest);
  };
  try {
    work();
  } finally {
    postcss.Container.prototype.removeChild = removeChild;
  }
  return scanned;
}

/**
 * @param {string} css
 */
function runPlugin(css) {
  postcss([plugin()]).process(css, { from: undefined }).sync();
}

/**
 * @param {number} count
 * @return {string} one rule in which each color appears twice in a row
 */
function duplicatedColors(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `color:c${i};color:c${i};`;
  }
  return `h1{${css}}`;
}

/**
 * @param {number} count
 * @return {string} sibling rules, each repeated once
 */
function duplicatedRules(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `h1{color:c${i}}h1{color:c${i}}`;
  }
  return css;
}

/**
 * @param {number} count
 * @return {string} sibling @media blocks, each repeated once
 */
function duplicatedMediaBlocks(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `@media (w${i}){h1{display:block}}@media (w${i}){h1{display:block}}`;
  }
  return css;
}

/**
 * Quadrupling the input must not more than double the scan count of a linear
 * pass (4), so the bound 8 separates it from a quadratic one (16).
 *
 * @param {(count: number) => string} generate
 * @return {void}
 */
function assertScansLinearly(generate) {
  const small = countRemovalScans(() => runPlugin(generate(1000)));
  const large = countRemovalScans(() => runPlugin(generate(4000)));
  assert.ok(
    large <= 8 * small,
    `4000/1000 removal scan ratio ${(large / small).toFixed(2)}`
  );
}

test('discarding duplicate declarations scans the children of one rule linearly as it grows', () => {
  assertScansLinearly(duplicatedColors);
});

test('discarding duplicate rules scans the children of the stylesheet linearly as it grows', () => {
  assertScansLinearly(duplicatedRules);
});

test('discarding duplicate @media blocks scans the children of the stylesheet linearly as it grows', () => {
  assertScansLinearly(duplicatedMediaBlocks);
});

test('discarding duplicate @media blocks takes linear time as the count grows', () => {
  assertLinearTime((size) => timePlugin(distinctMediaBlocks(size)), 8000);
});

test('discarding duplicate declarations takes linear time as one rule grows', () => {
  assertLinearTime((size) => timePlugin(distinctColors(size)), 48000);
});
