// Counts the entries that each rebuild of a rule's declaration cache walks.
// A rebuild reads the rule's whole chain, so a transform that reads the keys
// of a rule between appends to it walks the chain once per append, and the
// work grows with the square of the number of appended declarations. Each
// family below appends n declarations to one rule, so the walked entries
// divided by n must stay flat as n grows.
//
// The keys counter sums the rebuilds of the keys and receiving reads, and the
// receiving counter sums the receiving rebuilds and the writes the receiving
// reads built. Both read the counts each cache keeps for its readers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import { DeclarationCache } from '../../../../../src/passes/ir/declarationCache.js';

const plugin = transformPlugin('mergeRules');

/** @type {Set<DeclarationCache>} the caches that the readers of the current run used */
let caches = new Set();

const keysOf = DeclarationCache.prototype.keysOf;
const receivingOf = DeclarationCache.prototype.receivingOf;
DeclarationCache.prototype.keysOf = function (records, index) {
  caches.add(this);
  return keysOf.call(this, records, index);
};
DeclarationCache.prototype.receivingOf = function (records, index) {
  caches.add(this);
  return receivingOf.call(this, records, index);
};

/**
 * @param {string} css
 * @return {{keys: {rebuilds: number, entries: number}, receiving: {rebuilds: number, entries: number}}} the cache walks of one run
 */
function measure(css) {
  caches = new Set();
  postcss([plugin()]).process(css, { from: undefined }).sync();
  const keys = { rebuilds: 0, entries: 0 };
  const receiving = { rebuilds: 0, entries: 0 };
  for (const cache of caches) {
    const { keys: fromKeys, receiving: fromReceiving, writes } = cache.rebuilds;
    keys.rebuilds += fromKeys.rebuilds + fromReceiving.rebuilds;
    keys.entries += fromKeys.walked + fromReceiving.walked;
    receiving.rebuilds += fromReceiving.rebuilds + writes.rebuilds;
    receiving.entries += fromReceiving.walked + writes.walked;
  }
  return { keys, receiving };
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
  { name: 'moveDeclarations', build: moveDeclarations, receives: false },
  { name: 'appendToDeclarations', build: appendToDeclarations, receives: true },
  {
    name: 'nested moveDeclarations',
    build: nestedMoveDeclarations,
    receives: false,
  },
  {
    name: 'nested appendToDeclarations',
    build: nestedAppendToDeclarations,
    receives: true,
  },
];

for (const { name, build, receives } of families) {
  test(`${name} walks the chain of a rule once per declaration it appends`, (t) => {
    /** @type {Record<'keys' | 'receiving', number[]>} */
    const perDeclaration = { keys: [], receiving: [] };
    for (const n of [100, 200, 400]) {
      const walked = measure(build(n));
      t.diagnostic(
        `${name} n=${n} keys rebuilds=${walked.keys.rebuilds} entries=${walked.keys.entries} entries/n=${(walked.keys.entries / n).toFixed(2)} receiving rebuilds=${walked.receiving.rebuilds} entries=${walked.receiving.entries} entries/n=${(walked.receiving.entries / n).toFixed(2)}`
      );
      assert.ok(
        walked.keys.entries > 0,
        `${name} n=${n} rebuilt no declaration cache`
      );
      perDeclaration.keys.push(walked.keys.entries / n);
      perDeclaration.receiving.push(walked.receiving.entries / n);
    }
    const counters = receives ? ['keys', 'receiving'] : ['keys'];
    for (const counter of counters) {
      const [small, , large] = perDeclaration[counter];
      assert.ok(
        large / small <= 1.5,
        `${name} ${counter}: entries/n grew ${(large / small).toFixed(2)} times from n=100 to n=400`
      );
    }
  });
}
