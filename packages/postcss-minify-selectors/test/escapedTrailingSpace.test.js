import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';

// An escaped space ends an identifier and is not whitespace, so trimming it breaks the escape.

test('keeps an escaped trailing space in a :dir() argument so the escape does not swallow the closing parenthesis', () => {
  assert.equal(normalizeList(':dir(ltr\\ )', false, false), ':dir(ltr\\ )');
});

test('keeps an escaped trailing space in a ::part() argument so the escape does not swallow the closing parenthesis', () => {
  assert.equal(normalizeList('::part(foo\\ )', false, false), '::part(foo\\ )');
});

test('keeps an escaped trailing space in a ::highlight() argument so the escape does not swallow the closing parenthesis', () => {
  assert.equal(
    normalizeList('::highlight(foo\\ )', false, false),
    '::highlight(foo\\ )'
  );
});

test('keeps an escaped trailing space in a :not() class so the escape does not swallow the closing parenthesis', () => {
  assert.equal(normalizeList('a:not(.b\\ )', false, false), 'a:not(.b\\ )');
});

test('keeps an escaped trailing space in a class before a comma so the escape does not merge two selectors', () => {
  assert.equal(normalizeList('.a\\ , .b', false, false), '.a\\ ,.b');
});

test('keeps an escaped trailing space in a final class so the escape stays closed', () => {
  assert.equal(normalizeList('p .a\\ ', false, false), 'p .a\\ ');
});

// A hex escape consumes one whitespace as its terminator, so that whitespace
// can only be dropped when the next output character cannot continue the escape.

test('keeps a hex escape terminator before a descendant combinator so the combinator is not absorbed', () => {
  assert.equal(normalizeList('.a\\61  .b', false, false), '.a\\61  .b');
});

test('keeps a hex escape terminator before a tab-separated descendant so the combinator is not absorbed', () => {
  assert.equal(normalizeList('.a\\61 \t.b', false, false), '.a\\61  .b');
});

test('keeps a hex escape terminator between ::part() names so the names stay separate', () => {
  assert.equal(
    normalizeList('::part(a\\61  b)', false, false),
    '::part(a\\61  b)'
  );
});

test('keeps a hex escape terminator before a comment between ::part() names so the names stay separate', () => {
  assert.equal(
    normalizeList('::part(a\\61 /**/b)', false, false),
    '::part(a\\61  b)'
  );
});

test('drops the hex escape terminator of the last ::part() name because only the closing parenthesis follows', () => {
  assert.equal(
    normalizeList('::part(a \\61 )', false, false),
    '::part(a \\61)'
  );
});

test('drops a hex escape terminator at the end of a :lang() identifier because only a comma or parenthesis follows', () => {
  assert.equal(normalizeList(':lang(\\61 )', false, false), ':lang(\\61)');
});

test('drops a tab hex escape terminator before a comma because any single whitespace terminates the escape', () => {
  assert.equal(normalizeList('.a\\61\t,.b', false, false), '.a\\61,.b');
});

test('drops a CRLF hex escape terminator before a comma because CRLF counts as one whitespace', () => {
  assert.equal(normalizeList('.a\\61\r\n,.b', false, false), '.a\\61,.b');
});

test('keeps an escaped tab before a comma because the tab is the escaped character, not a terminator', () => {
  assert.equal(normalizeList('.a\\\t,.b', false, false), '.a\\\t,.b');
});

for (const [input, expected] of [
  ['.a\\6e , .b', '.a\\6e,.b'],
  ['.a\\6E , .b', '.a\\6E,.b'],
  ['.a\\00006e , .b', '.a\\00006e,.b'],
])
  test(`drops the hex escape terminator before a comma in ${input} for any hex letter case or digit count`, () => {
    assert.equal(normalizeList(input, false, false), expected);
  });

for (const combinator of ['+', '~'])
  test(`drops a hex escape terminator before the ${combinator} combinator because the combinator cannot continue the escape`, () => {
    assert.equal(
      normalizeList(`.a\\61  ${combinator} .b`, false, false),
      `.a\\61${combinator}.b`
    );
  });

test('keeps a 6-digit hex escape terminator before a descendant combinator so the combinator is not absorbed', () => {
  assert.equal(normalizeList('.a\\00006e  .b', false, false), '.a\\00006e  .b');
});

test('drops the hex escape terminator of an id before a comma because a comma cannot continue the escape', () => {
  assert.equal(normalizeList('#a\\61 , b', false, false), '#a\\61,b');
});

test('keeps the hex escape terminator of an id before a descendant combinator so the combinator is not absorbed', () => {
  assert.equal(normalizeList('#a\\61  b', false, false), '#a\\61  b');
});

test('drops the hex escape terminator of a type selector before a comma because a comma cannot continue the escape', () => {
  assert.equal(normalizeList('a\\61 , b', false, false), 'a\\61,b');
});

test('keeps the hex escape terminator of a type selector before a descendant combinator so the combinator is not absorbed', () => {
  assert.equal(normalizeList('a\\61  b', false, false), 'a\\61  b');
});

test('keeps an escaped trailing space in a view-transition name list so the escape does not swallow the closing parenthesis', () => {
  assert.equal(
    normalizeList('::view-transition-group(a\\ .b\\ )', false, false),
    '::view-transition-group(a\\ .b\\ )'
  );
});

test('drops a tab hex escape terminator at the end of an An+B formula because only a parenthesis follows', () => {
  assert.equal(
    normalizeList(':nth-child(2\\6e\t)', false, false),
    ':nth-child(2\\6e)'
  );
});

test('keeps a lone CRLF hex escape terminator before the of keyword in an An+B formula because it is also the required separator', () => {
  assert.equal(
    normalizeList(':nth-child(2\\6e\r\nof .a)', false, false),
    ':nth-child(2\\6e\r\nof .a)'
  );
});

test('keeps a hex escape terminator before a hex digit in an An+B formula so the digit stays outside the escape', () => {
  assert.equal(
    normalizeList(':nth-child(\\6e\\2d  1)', false, false),
    ':nth-child(\\6e\\2d 1)'
  );
});

test('keeps a space terminator after a hex escape before of in an An+B formula so the keyword does not join the escape', () => {
  assert.equal(
    normalizeList(':nth-child(2\\6e  of .a)', false, false),
    ':nth-child(2\\6e  of .a)'
  );
});

test('keeps a space terminator after a hex escape ident before of in an An+B formula so the keyword does not join the ident', () => {
  assert.equal(
    normalizeList(':nth-child(\\6e  of .a)', false, false),
    ':nth-child(\\6e  of .a)'
  );
});

test('keeps a tab terminator after a hex escape before of in an An+B formula so the keyword does not join the escape', () => {
  assert.equal(
    normalizeList(':nth-child(2\\6e\t of .a)', false, false),
    ':nth-child(2\\6e  of .a)'
  );
});

test('keeps a hex escape terminator before a letter in an An+B formula because the dimension stays invalid either way', () => {
  assert.equal(
    normalizeList(':nth-child(2\\6e a)', false, false),
    ':nth-child(2\\6e a)'
  );
});

for (const [input, expected] of [
  ['.a\\61 .b', '.a\\61.b'],
  ['.\\61 #x', '.\\61#x'],
  ['.\\61 [b]', '.\\61[b]'],
  ['#a\\61 .b', '#a\\61.b'],
])
  test(`drops the hex escape terminator in ${input} because the next token starts with a delimiter that cannot continue the escape`, () => {
    assert.equal(normalizeList(input, false, false), expected);
  });

test('keeps a hex escape terminator before a descendant combinator and compound so the combinator is not absorbed', () => {
  assert.equal(normalizeList('.a\\61  .b', false, false), '.a\\61  .b');
});

for (const [input, expected] of [
  ['[a\\61 ]', '[a\\61]'],
  ['[a\\61 =b]', '[a\\61=b]'],
  ['[a=\\61 ]', '[a=\\61]'],
  ['[a = \\61  ]', '[a=\\61]'],
  ['[ns\\61 |a]', '[ns\\61|a]'],
  ['[a=b\\61 ]', '[a=b\\61]'],
])
  test(`drops the hex escape terminator in ${input} because only a delimiter follows`, () => {
    assert.equal(normalizeList(input, false, false), expected);
  });

test('keeps the hex escape terminator of an attribute value before a modifier so the modifier does not join the escape', () => {
  assert.equal(normalizeList('[a=\\61  i]', false, false), '[a=\\61  i]');
});

test('drops the hex escape terminator of a namespace prefix because the namespace separator follows', () => {
  assert.equal(normalizeList('ns\\61 |a', false, false), 'ns\\61|a');
});

test('drops a 6-digit hex escape terminator before a hex digit in an An+B formula because a seventh digit cannot join the escape', () => {
  assert.equal(
    normalizeList(':nth-child(\\00006e\\00002d  1)', false, false),
    ':nth-child(\\00006e\\00002d1)'
  );
});

test('keeps a 6-digit hex escape terminator before the of keyword in an An+B formula because the separator would become the terminator', () => {
  assert.equal(
    normalizeList(':nth-child(2\\00006e  of .a)', false, false),
    ':nth-child(2\\00006e  of .a)'
  );
});

// The terminator is chosen from the serialized neighbor, so source trivia that
// is dropped from the output cannot keep a terminator alive.
for (const [input, expected] of [
  ['.a\\61 /**/,.b', '.a\\61,.b'],
  ['.a\\61 /**/>.b', '.a\\61>.b'],
  ['.a\\61 /**/', '.a\\61'],
  ['.a\\61  || .b', '.a\\61||.b'],
])
  test(`drops the hex escape terminator in ${JSON.stringify(input)} because the serialized neighbor cannot continue the escape`, () => {
    assert.equal(normalizeList(input, false, false), expected);
  });

test('drops the hex escape terminator of a compound folded into :is() before a comma because the fold moves the compound next to a comma', () => {
  assert.equal(
    normalizeList('.a\\61  .x,.b .x,.c .x', true, true),
    ':is(.a\\61,.b,.c) .x'
  );
});

test('drops the hex escape terminator of a compound folded into a trailing :is() because only a comma follows', () => {
  assert.equal(
    normalizeList('.x .a\\61 ,.x .b,.x .c', true, true),
    '.x :is(.a\\61,.b,.c)'
  );
});

test('keeps the hex escape terminator of a common prefix before the folded :is() so the descendant combinator survives', () => {
  assert.equal(
    normalizeList('.a\\61  .x,.a\\61  .y', true, true),
    '.a\\61  :is(.x,.y)'
  );
});

test('keeps a hex escape terminator before a comment and hex digit in an An+B formula because the removed comment no longer separates the digit', () => {
  assert.equal(
    normalizeList(':nth-child(\\6e\\2d /**/1)', false, false),
    ':nth-child(\\6e\\2d 1)'
  );
});

test('leaves an escaped backslash followed by hex digits alone because it is not a hex escape and needs no terminator', () => {
  assert.equal(normalizeList('.a\\\\61 .b', false, false), '.a\\\\61 .b');
});

test('adds no terminator after an escaped backslash in a ::part() argument because the digits are literal', () => {
  assert.equal(
    normalizeList('::part(a\\\\61 b)', false, false),
    '::part(a\\\\61 b)'
  );
});

test('keeps the terminator after an escaped backslash that precedes a real hex escape', () => {
  assert.equal(normalizeList('.a\\\\\\61  .b', false, false), '.a\\\\\\61  .b');
});

for (const [name, terminator] of [
  ['CRLF', '\r\n'],
  ['form feed', '\f'],
  ['tab', '\t'],
])
  test(`keeps a six-digit hex escape terminated by ${name} before a descendant combinator so the combinator is not absorbed`, () => {
    assert.equal(
      normalizeList(`.a\\10ffff${terminator} .b`, false, false),
      '.a\\10ffff  .b'
    );
  });

for (const input of [
  '.a\\61  .b',
  '.a\\61 /**/,.b',
  '[a=\\61  i]',
  '::part(a\\61 /**/b\\62 )',
  ':nth-child(2\\6e  of .a\\62 )',
  '.a\\61  .x,.b .x,.c .x',
])
  test(`normalizes ${JSON.stringify(input)} to a fixed point so the chosen terminators are stable`, () => {
    const once = normalizeList(input, true, true);
    assert.equal(normalizeList(once, true, true), once);
  });
