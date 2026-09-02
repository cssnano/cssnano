import { test } from 'node:test';
import assert from 'node:assert/strict';
import cssnanoUtils from 'cssnano-utils';
import keywords from '../src/lib/keywords.js';
import minifyFamily from '../src/lib/minify-family.js';
import minifyFont from '../src/lib/minify-font.js';
import minifyWeight from '../src/lib/minify-weight.js';

const { TokenType, tokens } = cssnanoUtils;

// Frozen scanner from the pre-balanced-token implementation. The corpus below
// intentionally stays within the legacy grammar so this remains a differential
// compatibility check while the new scanner gains functional-value support.
// Variable-bearing shorthands are intentionally excluded: they now pass through
// because their grammar is resolved only after custom-property substitution.
// eslint-disable-next-line complexity -- frozen legacy implementation
function legacyMinifyFont(value, opts) {
  const input = tokens(value);
  let familyStart = -1;
  let possibleFamilyStart = -1;
  let hasSize = false;
  for (const [index, token] of input.entries()) {
    if (token[0] === TokenType.Ident) {
      const name = token[4].value.toLowerCase();
      if (
        !hasSize &&
        (keywords.style.has(name) ||
          keywords.variant.has(name) ||
          keywords.stretch.has(name) ||
          keywords.weight.has(name))
      ) {
        let next = index + 1;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
        possibleFamilyStart = input[next]?.[2] ?? value.length;
        continue;
      } else if (!hasSize && keywords.size.has(name)) hasSize = true;
    }
    if (
      !hasSize &&
      (token[0] === TokenType.Percentage ||
        (token[0] === TokenType.Dimension &&
          !/(deg|grad|rad|turn)$/i.test(token[4].unit)))
    )
      hasSize = true;
    if (hasSize) {
      let next = index + 1;
      if (input[next]?.[0] === TokenType.Delim && input[next][1] === '/') {
        next++;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
        next++;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
      }
      familyStart = input[next]?.[2] ?? value.length;
      break;
    }
  }
  if (familyStart < 0) familyStart = possibleFamilyStart;
  if (familyStart < 0) return value;
  let prefix = value
    .slice(0, familyStart)
    .replace(/\bbold\b/gi, (word) => minifyWeight(word.toLowerCase()));
  if (!prefix.endsWith(' ') && prefix) prefix += ' ';
  return prefix + minifyFamily(value.slice(familyStart), opts);
}

test('matches the frozen legacy scanner across a deterministic corpus', () => {
  const styles = ['', 'italic ', 'bold italic '];
  const sizes = ['12px', '1.25em', 'small'];
  const lineHeights = ['', '/1.2 ', '/normal '];
  const families = [
    '"Helvetica Neue", Arial',
    'Inter, serif',
    'A\\, B, sans-serif',
  ];

  for (const style of styles) {
    for (const size of sizes) {
      for (const lineHeight of lineHeights) {
        for (const family of families) {
          const value = `${style}${size}${lineHeight}${family}`;
          assert.equal(
            minifyFont(value, { removeQuotes: true }),
            legacyMinifyFont(value, { removeQuotes: true }),
            value
          );
        }
      }
    }
  }
});

test('handles numeric font weights outside the frozen legacy corpus', () => {
  for (const weight of ['1', '753', '1000']) {
    const value = `condensed oblique 25deg ${weight} 12pt "Helvetica Neue", serif`;
    assert.equal(
      minifyFont(value, { removeQuotes: true }),
      `condensed oblique 25deg ${weight} 12pt Helvetica Neue,serif`
    );
  }
});
