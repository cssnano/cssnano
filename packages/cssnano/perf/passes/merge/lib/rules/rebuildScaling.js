// Counts the entries that each rebuild of a rule's declaration cache walks.
// A rebuild reads the rule's whole chain, so a transform that reads the keys
// of a rule between appends to it walks the chain once per append, and the
// work grows with the square of the number of appended declarations. Each
// family below appends n declarations to one rule, so the walked entries
// divided by n must stay flat as n grows.
//
// Two counters wrap the cache readers. The keys counter wraps `keysOf` and
// `receivingOf`, and a read that returns a different entry than the rule's
// previous read is a rebuild. The receiving counter wraps `receivingOf` and
// counts the chain walk of a new entry, and the write walk of new writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import { DeclarationCache } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';

const plugin = transformPlugin('mergeRules');

const walk = { rebuilds: 0, entries: 0 };
const receiving = { rebuilds: 0, entries: 0 };
/** @type {Map<number, object>} the entry each container's previous read returned */
let lastRead = new Map();
/** @type {Map<number, object>} the entry each container's previous receiving read returned */
let lastReceived = new Map();
/** @type {Map<number, object>} the writes each container's previous receiving read returned */
let lastWrites = new Map();

const keysOf = DeclarationCache.prototype.keysOf;
const receivingOf = DeclarationCache.prototype.receivingOf;
DeclarationCache.prototype.keysOf = function (records, index) {
  const keys = keysOf.call(this, records, index);
  countKeys(records, index, keys);
  return keys;
};
DeclarationCache.prototype.receivingOf = function (records, index) {
  const keys = receivingOf.call(this, records, index);
  countKeys(records, index, keys);
  countReceiving(records, index, keys);
  return keys;
};

/**
 * @param {import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecords} records
 * @param {number} index
 * @param {object} keys the entry a read returned
 * @return {void}
 */
function countKeys(records, index, keys) {
  if (lastRead.get(index) !== keys) {
    lastRead.set(index, keys);
    walk.rebuilds++;
    walk.entries += records.links.childCount(index);
  }
}

/**
 * @param {import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecords} records
 * @param {number} index
 * @param {{kept: readonly number[], writes: object | undefined}} keys the entry a receiving read returned
 * @return {void}
 */
function countReceiving(records, index, keys) {
  if (lastReceived.get(index) !== keys) {
    lastReceived.set(index, keys);
    receiving.rebuilds++;
    receiving.entries += records.links.childCount(index);
  }
  if (lastWrites.get(index) !== keys.writes) {
    lastWrites.set(index, keys.writes);
    receiving.rebuilds++;
    receiving.entries += keys.kept.length;
  }
}

/**
 * @param {string} css
 * @return {{keys: {rebuilds: number, entries: number}, receiving: {rebuilds: number, entries: number}}} the cache walks of one run
 */
function measure(css) {
  walk.rebuilds = 0;
  walk.entries = 0;
  receiving.rebuilds = 0;
  receiving.entries = 0;
  lastRead = new Map();
  lastReceived = new Map();
  lastWrites = new Map();
  postcss([plugin()]).process(css, { from: undefined }).sync();
  return {
    keys: { rebuilds: walk.rebuilds, entries: walk.entries },
    receiving: { rebuilds: receiving.rebuilds, entries: receiving.entries },
  };
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
