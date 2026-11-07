// Counts the entries that each rebuild of a rule's declaration cache walks.
// A rebuild reads the rule's whole chain, so a transform that reads the keys
// of a rule between appends to it walks the chain once per append, and the
// work grows with the square of the number of appended declarations. Each
// family below appends n declarations to one rule, so the walked entries
// divided by n must stay flat as n grows.
//
// The counter wraps `RuleRecord.prototype.declarationKeys`, which the cache
// read goes through until the cache moves beside the records. A read that
// returns a different entry than the rule's previous read is a rebuild.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';

const plugin = transformPlugin('mergeRules');

const walk = { rebuilds: 0, entries: 0 };
const lastRead = new WeakMap();
const declarationKeys = RuleRecord.prototype.declarationKeys;
RuleRecord.prototype.declarationKeys = function (records) {
  const keys = declarationKeys.call(this, records);
  if (lastRead.get(this) !== keys) {
    lastRead.set(this, keys);
    walk.rebuilds++;
    walk.entries += records.links.childCount(this.index);
  }
  return keys;
};

/**
 * @param {string} css
 * @return {{rebuilds: number, entries: number}} the cache rebuilds of one run
 */
function measure(css) {
  walk.rebuilds = 0;
  walk.entries = 0;
  postcss([plugin()]).process(css, { from: undefined }).sync();
  return { rebuilds: walk.rebuilds, entries: walk.entries };
}

/**
 * @param {number} n
 * @param {string} prefix
 * @return {string} `n` declarations, `${prefix}0:1;` onward
 */
function declarations(n, prefix) {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}:1`).join(';');
}

/**
 * Two rules that share their declarations and differ in one more; the
 * second's shared declarations move into the first.
 *
 * @param {number} n
 * @return {string}
 */
function moveDeclarations(n) {
  return `.p{${declarations(n, '--d')}}.q{${declarations(n, '--d')};--z:1}.s{--z:2}`;
}

/**
 * Rules with one selector, each adding one declaration; the first receives
 * the children of the others.
 *
 * @param {number} n
 * @return {string}
 */
function appendToDeclarations(n) {
  return Array.from({ length: n }, (_, i) => `.a{--d${i}:1}`).join('');
}

/**
 * @param {number} n
 * @return {string} the moveDeclarations family inside a nesting rule
 */
function nestedMoveDeclarations(n) {
  return `.o{${moveDeclarations(n)}}`;
}

/**
 * @param {number} n
 * @return {string} the appendToDeclarations family inside a nesting rule
 */
function nestedAppendToDeclarations(n) {
  return `.o{${appendToDeclarations(n)}}`;
}

const families = [
  { name: 'moveDeclarations', build: moveDeclarations },
  { name: 'appendToDeclarations', build: appendToDeclarations },
  { name: 'nested moveDeclarations', build: nestedMoveDeclarations },
  { name: 'nested appendToDeclarations', build: nestedAppendToDeclarations },
];

for (const { name, build } of families) {
  test(`${name} walks the chain of a rule once per declaration it appends`, (t) => {
    const perDeclaration = [];
    for (const n of [100, 200, 400]) {
      const { rebuilds, entries } = measure(build(n));
      t.diagnostic(
        `${name} n=${n} rebuilds=${rebuilds} entries=${entries} entries/n=${(entries / n).toFixed(2)}`
      );
      assert.ok(entries > 0, `${name} n=${n} rebuilt no declaration cache`);
      perDeclaration.push(entries / n);
    }
    const [small, , large] = perDeclaration;
    assert.ok(
      large / small <= 1.5,
      `${name}: entries/n grew ${(large / small).toFixed(2)} times from n=100 to n=400`
    );
  });
}
