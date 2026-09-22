import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { normalizeList } from '../src/lib/selectorScanner.js';

const corpus = [
  ['.card, .card, article.card', '.card,article.card'],
  ['div /* comment */ > :is(.a, .b)', 'div>:is(.a,.b)'],
  ['[data-value="a,b"][lang = "en" i]', '[data-value="a,b"][lang=en i]'],
  ['svg|* , |* , .\\31 23', '.\\31 23,svg|*,|*'],
  ['*|a, *|*, *|*.class', '*|*,*|*.class,*|a'],
  ['svg|*, *|a, |a, |*', '*|a,svg|*,|*,|a'],
  [':not(:is(.a, .b)), :nth-child(2n + 1)', ':not(:is(.a,.b)),:nth-child(odd)'],
  [
    '.a\\,b, .a\\,b, .x[attr="(deep, value)"]',
    '.a\\,b,.x[attr="(deep, value)"]',
  ],
  ['h1/**/p, .a/* comment */.b', '.a .b,h1 p'],
  [
    'a\\E0000\\E001, a\\E0000\\E001[attr="x,y"]',
    'a\\E0000\\E001,a\\E0000\\E001[attr="x,y"]',
  ],
];

function minify(selector) {
  return postcss([plugin({ convertToIs: false })]).process(`${selector}{x:y}`, {
    from: undefined,
  }).css;
}

test('selector characterization corpus preserves reference bytes and is idempotent', () => {
  for (const [input, expected] of corpus) {
    const output = minify(input);
    assert.equal(output, `${expected}{x:y}`, input);
    assert.equal(minify(output.slice(0, -5)), output, `idempotence: ${input}`);
  }
});

test('large selector lists complete without recursive overflow', () => {
  const input = Array.from({ length: 3000 }, (_, i) => `.item-${i}`).join(',');
  const output = minify(input);
  assert.match(output, /^\.item-0,/v);
  assert.match(output, /\.item-2999(?:,|\{)/v);
});

test('normalizes every attribute operator without leaking state between attributes', () => {
  const input = '[a = x i][b ~= y s][c |= z i][d ^= q s][e $= r i][f *= t s]';
  assert.equal(
    minify(input),
    '[a=x i][b~=y s][c|=z i][d^=q s][e$=r i][f*=t s]{x:y}'
  );
});

test('preserves attribute matchers with missing values', () => {
  for (const operator of ['=', '~=', '|=', '^=', '$=', '*=']) {
    const selector = `[data${operator}]`;
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
  for (const selector of ['[data=/**/]', '[data~=/**/]', '[data|=/**/]']) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('preserves unexpected identifiers in attribute selectors', () => {
  for (const selector of [
    '[data unexpected]',
    '[data=value unexpected]',
    '[data=value i unexpected]',
    '[ns|data=value unexpected]',
  ]) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('preserves invalid attribute modifiers', () => {
  for (const selector of [
    '[data=value x]',
    '[data=value i s]',
    '[data=value/**/x]',
    '[data=value/**/i/**/x]',
  ]) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('normalizes every namespaced attribute-selector form', () => {
  const forms = ['data', 'ns|data', '*|data', '|data'];
  for (const form of forms) {
    const selector = `[/**/${form}/**/=/**/value/**/]`;
    assert.equal(
      normalizeList(selector, false, false),
      `[${form}=value]`,
      selector
    );
  }
});

test('preserves wildcard local names in attribute selectors', () => {
  for (const selector of ['[ns|*]', '[*|*]', '[|*]', '[*]']) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('removes ordinary comments around attribute-selector boundaries', () => {
  const cases = [
    ['[/**/data/**/]', '[data]'],
    ['[/**/data/**/=/**/value/**/]', '[data=value]'],
    ['[data/**/=/**/value/**/i/**/]', '[data=value i]'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeList(input, false, false), expected, input);
  }
});

test('preserves important comments around attribute-selector boundaries', () => {
  const input =
    '[/*! name */data/*! operator */=/*! value */value/*! modifier */i/*! close */]';
  assert.equal(
    normalizeList(input, false, false),
    '[/*! name */data/*! operator */=/*! value */value/*! modifier */ i/*! close */]'
  );
});

test('preserves comments that split a namespaced attribute name', () => {
  for (const selector of ['[ns /**/|data=value]', '[* /**/|data=value]']) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('preserves comments that split any part of a namespaced attribute name', () => {
  for (const selector of [
    '[ns/**/|data=value]',
    '[ns|/**/data=value]',
    '[*|/**/data=value]',
    '[|/**/data=value]',
  ]) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('normalizes wide attribute compounds in one linear scan', () => {
  const input = Array.from(
    { length: 3000 },
    (_, index) => `[data-${index} = value-${index} i]`
  ).join('');
  const expected = Array.from(
    { length: 3000 },
    (_, index) => `[data-${index}=value-${index} i]`
  ).join('');
  assert.equal(normalizeList(input, false, false), expected);
});
