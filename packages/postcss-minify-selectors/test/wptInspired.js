import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { normalizeList, specificityOf } from '../src/lib/selectorScanner.js';

// Pinned translations of selector syntax/specification cases. These are kept
// as Node assertions rather than importing the browser-oriented WPT harness.
test('preserves invalid An+B microsyntax as raw function source', () => {
  for (const selector of [
    ':nth-child(+ n)',
    ':nth-child(+ 1)',
    ':nth-child(2 n+1)',
  ]) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
  assert.equal(
    normalizeList(':nth-child( 2n + 1 )', false, false),
    ':nth-child(odd)'
  );
});

test('keeps an invalid root selector list entirely raw', () => {
  for (const selector of [',.a', '.a,', '.a,,.b']) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});

test('applies forgiving and unforgiving pseudo list rules', () => {
  assert.equal(normalizeList(':is(.a,::before)', false, false), ':is(.a)');
  assert.equal(
    normalizeList(':where(::before,.a)', false, false),
    ':where(.a)'
  );
  assert.equal(
    normalizeList(':not(.a,::before)', false, false),
    ':not(.a,::before)'
  );
  assert.equal(normalizeList(':has(:has(.a))', false, false), ':has(:has(.a))');
});

test('counts namespace-qualified names and malformed double colons correctly', () => {
  assert.equal(specificityOf('svg|a'), '0,0,1');
  assert.equal(specificityOf('svg|*'), '0,0,0');
  for (const selector of ['*div', '.a*#b', '::', ':::', '::(foo)']) {
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
  assert.equal(specificityOf('::'), '0,0,0');
});

test('keeps namespace-significant universals and only rewrites keyframe positions', async () => {
  const result = await postcss([
    plugin({ convertToIs: false, sort: false }),
  ]).process(
    '@namespace url(http://www.w3.org/2000/svg);*.a{x:y}@keyframes x{from .a{a:b}100%{a:b}}',
    { from: undefined }
  );
  assert.equal(
    result.css,
    '@namespace url(http://www.w3.org/2000/svg);*.a{x:y}@keyframes x{from .a{a:b}to{a:b}}'
  );
});

test('supports View Transitions Level 2 name/class forms and retains lang comments', () => {
  assert.equal(
    normalizeList('::view-transition-old(foo.bar)', false, false),
    '::view-transition-old(foo.bar)'
  );
  assert.equal(
    normalizeList('::view-transition-group(.modal)', false, false),
    '::view-transition-group(.modal)'
  );
  assert.equal(specificityOf('::view-transition-old(*)'), '0,0,0');
  assert.equal(specificityOf('::view-transition-old(/*! keep */ *)'), '0,0,0');
  assert.equal(specificityOf('::view-transition-old(foo.bar)'), '0,0,1');
  assert.equal(specificityOf('::view-transition-group(.modal)'), '0,0,1');
  assert.equal(
    normalizeList(':lang(en/*! keep */,en)', false, false),
    ':lang(en/*! keep */)'
  );
});

test('preserves important comments in An+B formulas', () => {
  assert.equal(
    normalizeList(':nth-child( 2n + /*! keep */ 1 )', false, false),
    ':nth-child(2n+/*! keep */1)'
  );
});

test('normalizes nested forgiving pseudo-elements without dropping the outer pseudo', () => {
  assert.equal(normalizeList(':is(:is(::before))', false, false), ':is(:is())');
  assert.equal(
    normalizeList(':where(:where(::after))', false, false),
    ':where(:where())'
  );
});

test('minifies rules under default namespace without dropping universal or skipping other selectors', async () => {
  const result = await postcss([
    plugin({ convertToIs: false, sort: false }),
  ]).process(
    '@namespace url(http://www.w3.org/2000/svg); *.card, .b, .b { color: red; }',
    { from: undefined }
  );
  assert.equal(
    result.css,
    '@namespace url(http://www.w3.org/2000/svg); *.card,.b { color: red; }'
  );
});

test('preserves malformed universal selectors under default namespace verbatim', async () => {
  for (const selector of ['.ok, *div', '.ok, **', '.ok, .a*']) {
    const input = `@namespace url(http://www.w3.org/2000/svg); ${selector} { color: red; }`;
    const result = await postcss([plugin({ sort: true })]).process(input, {
      from: undefined,
    });
    assert.equal(result.css, input);
  }
});

test('preserves important comments before universal selector without marking compound invalid', async () => {
  const input = '.a + /*! keep */ *, .b, .b { color: red; }';
  const result = await postcss([plugin({ sort: true })]).process(input, {
    from: undefined,
  });
  assert.equal(result.css, '.a+/*! keep */*,.b { color: red; }');
});

test('deduplicates distinct wide functional lists in linear time', () => {
  for (const count of [256, 512, 1024]) {
    const input = `:is(${Array.from(
      { length: count },
      (_, index) => `:not(.item-${index})`
    ).join(',')})`;
    assert.equal(normalizeList(input, false, false), input);
  }
});
