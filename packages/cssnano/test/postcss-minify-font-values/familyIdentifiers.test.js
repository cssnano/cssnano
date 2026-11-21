import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import minifyFamily, {
  familyIdentifiers,
} from '../../src/plugins/postcss-minify-font-values/lib/minify-family.js';

// Names recorded from the writer that this one replaces, over the same
// alphabet as the generated names below. Each spelling is kept as it was.
const recordedSpellings = [
  ['a 1', 'a\\ 1'],
  ['a1 ', 'a1\\ '],
  ['a  1', 'a \\ 1'],
  ['a  ', 'a \\ '],
  // A lone hyphen is escaped; the recorded writer left it bare.
  ['a  -', 'a \\ \\-'],
  ['1a', '\\31 a'],
  [' a', '\\ a'],
  [' ', '\\ '],
  ['-1', '\\-1'],
  ['--a', '\\--a'],
  ['a:', 'a\\3a '],
  ['a!', 'a\\!'],
  ['a -', 'a \\-'],
  ['a ', 'a\\ '],
  ['é 1', 'é\\ 1'],
];

const alphabet = ['a', '1', '-', ' ', ':', '\u000b', 'é', '!'];

/** @param {number} depth @return {string[]} */
function namesUpTo(depth) {
  const names = [''];
  let previous = [''];
  for (let level = 0; level < depth; level++) {
    previous = previous.flatMap((prefix) =>
      alphabet.map((character) => prefix + character)
    );
    names.push(...previous);
  }
  return names;
}

test('familyIdentifiers spells each recorded name the way the writer it replaces did', () => {
  for (const [name, spelling] of recordedSpellings) {
    const text = familyIdentifiers(name)
      .map((identifier) => identifier.text)
      .join(' ');
    assert.equal(text, spelling, `spelling of ${JSON.stringify(name)}`);
  }
});

test('familyIdentifiers gives the values that join to the name, for every name over the alphabet', () => {
  for (const name of namesUpTo(4)) {
    const values = familyIdentifiers(name).map(
      (identifier) => identifier.value
    );
    assert.equal(values.join(' '), name, `values of ${JSON.stringify(name)}`);
  }
});

test('familyIdentifiers spellings read back as identifiers with those values', () => {
  for (const name of namesUpTo(4)) {
    const identifiers = familyIdentifiers(name);
    const text = identifiers.map((identifier) => identifier.text).join(' ');
    const read = tokenize({ css: text })
      .slice(0, -1)
      .filter((token) => token[0] !== TokenType.Whitespace);
    assert.deepEqual(
      read.map((token) => [token[0], token[4]?.value]),
      identifiers.map((identifier) => [TokenType.Ident, identifier.value]),
      `tokens of ${JSON.stringify(name)}`
    );
  }
});

test('minifyFamily keeps quotes around a name with three spaces, because its escaped form is longer', () => {
  // Three escaped spaces cost more characters than the two quotes they save.
  assert.equal(minifyFamily('"a   b"', { removeQuotes: true }), '"a   b"');
});
