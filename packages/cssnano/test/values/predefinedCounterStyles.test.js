import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predefinedCounterStyles } from '../../src/values/predefinedCounterStyles.js';

// Every name CSS Counter Styles 3 defines: §6 (simple) and §7 (complex).
const simple = [
  ...'decimal decimal-leading-zero arabic-indic armenian upper-armenian lower-armenian bengali cambodian khmer cjk-decimal devanagari georgian gujarati gurmukhi hebrew kannada lao malayalam mongolian myanmar oriya persian lower-roman upper-roman tamil telugu thai tibetan'.split(
    ' '
  ),
  ...'lower-alpha lower-latin upper-alpha upper-latin lower-greek hiragana hiragana-iroha katakana katakana-iroha'.split(
    ' '
  ),
  ...'disc circle square disclosure-open disclosure-closed'.split(' '),
];
const complex =
  'cjk-earthly-branch cjk-heavenly-stem japanese-informal japanese-formal korean-hangul-formal korean-hanja-informal korean-hanja-formal simp-chinese-informal simp-chinese-formal trad-chinese-informal trad-chinese-formal cjk-ideographic ethiopic-numeric'.split(
    ' '
  );

test('predefinedCounterStyles lists exactly the names CSS Counter Styles 3 defines', () => {
  assert.deepEqual(
    [...predefinedCounterStyles].toSorted(),
    [...simple, ...complex].toSorted()
  );
});

test('predefinedCounterStyles holds only lowercase names, so a case-folded lookup finds them', () => {
  for (const name of predefinedCounterStyles) {
    assert.equal(name, name.toLowerCase());
  }
});
