import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../src/run/runContext.js';
import { buildRecords } from '../../src/ir/tree/buildRecords.js';
import { PropertyNames } from '../../src/ir/propertyTable.js';
import {
  tokenizeMode,
  tokenizeModeOfKeys,
} from '../../src/values/tokenizeMode.js';

/**
 * The number of tokens in the value of the first declaration of the css, as
 * the build interns it.
 *
 * @param {string} css
 * @return {number}
 */
function valueTokenCountOf(css) {
  const root = postcss.parse(css);
  const run = createRunContext();
  const { records, nodes } = buildRecords(root, run);
  const decl = records.entry(nodes.indexOf(root.first.first));
  return run.tokenLists.get(decl.valueList).length;
}

/**
 * A spelling of a name whose ASCII letters take case from `seed`: bit `i` of
 * the seed, cycling every eight letters, uppercases the i-th letter.
 *
 * @param {string} name
 * @param {number} seed
 * @return {string}
 */
function cased(name, seed) {
  let out = '';
  let letter = 0;
  for (const char of name) {
    const isAsciiLetter = char.toLowerCase() !== char.toUpperCase();
    if (!isAsciiLetter) {
      out += char;
      continue;
    }
    const bit = Math.floor(seed / 2 ** (letter % 8)) % 2;
    out += bit === 1 ? char.toUpperCase() : char.toLowerCase();
    letter++;
  }
  return out;
}

suite('the tokenizer mode of a declaration value', () => {
  test('unicode-range keeps a U+ range as one token', () => {
    assert.equal(valueTokenCountOf('a{unicode-range:U+0025-00FF}'), 1);
  });

  test('UNICODE-RANGE keeps a U+ range as one token, since its name folds', () => {
    assert.equal(valueTokenCountOf('a{UNICODE-RANGE:U+0025-00FF}'), 1);
  });

  test('src tokenizes a U+ range in the default mode', () => {
    assert.notEqual(valueTokenCountOf('a{src:U+0025-00FF}'), 1);
  });

  test('a custom property named --unicode-range tokenizes in the default mode', () => {
    assert.notEqual(valueTokenCountOf('a{--unicode-range:U+0025-00FF}'), 1);
  });

  // The name's keys fold its escapes, but the mode keeps the raw spelling, as
  // it did before the keys carried the mode. Decoding it would keep the range
  // as one token, an output change this pins as not made.
  test('an escaped unicode-range name keeps the default mode of its raw spelling', () => {
    assert.notEqual(valueTokenCountOf('a{unicode-r\\61nge:U+0025-00FF}'), 1);
  });
});

suite('the tokenizer mode a property name gives its keys', () => {
  const names = ['unicode-range', 'src', 'color', '--unicode-range', 'all'];

  test('every spelling of a name without escapes gives the mode of tokenizeMode', () => {
    for (const name of names) {
      for (let seed = 0; seed < 256; seed++) {
        const spelling = cased(name, seed);
        assert.equal(
          tokenizeModeOfKeys(new PropertyNames().keysOf(spelling)),
          tokenizeMode(spelling),
          spelling
        );
      }
    }
  });

  test('each shape of keys carries a boolean unicodeRange flag', () => {
    const table = new PropertyNames();
    for (const name of ['--custom', 'all', 'color', 'no-such-property']) {
      assert.equal(typeof table.keysOf(name).unicodeRange, 'boolean', name);
    }
  });
});
