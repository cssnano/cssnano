import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { normalizeList } from '../src/lib/selectorScanner.js';

function minify(selector) {
  return postcss([plugin({ convertToIs: false })]).process(`${selector}{x:y}`, {
    from: undefined,
  }).css;
}

test('normalizes deeply nested supported selector functions without a depth cap', () => {
  const input = `${':is( '.repeat(1000)}.item${')'.repeat(1000)}`;
  assert.doesNotThrow(() => minify(input));
  assert.equal(
    minify(input),
    `${':is('.repeat(1000)}.item${')'.repeat(1000)}{x:y}`
  );
});

test('does not retain serialized output for nested functions with siblings', () => {
  const depth = 32_000;
  const input = `${':is(.x'.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('keeps nested selector lists with sibling members structural', () => {
  const depth = 12_000;
  const input = `${':is(.x,'.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('keeps deeply nested opaque functions as source spans until serialization', () => {
  const depth = 32_000;
  const input = `${':framework('.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('normalizes nth formulas when of selector list is present', () => {
  assert.equal(
    normalizeList(':nth-child(even of .a)', false, false),
    ':nth-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(EVEN of .a)', false, false),
    ':nth-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(even of .a, #b)', false, false),
    ':nth-child(2n of .a,#b)'
  );
  assert.equal(
    normalizeList(':nth-child(2n + 1 of .a)', false, false),
    ':nth-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-child( 2n + 1 of .a )', false, false),
    ':nth-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(odd of .a)', false, false),
    ':nth-child(odd of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(ODD of .a)', false, false),
    ':nth-child(odd of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(even of .a)', false, false),
    ':nth-last-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(EVEN of .a)', false, false),
    ':nth-last-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(2n + 1 of .a)', false, false),
    ':nth-last-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child( 2n + 1 of .a )', false, false),
    ':nth-last-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(odd of .a)', false, false),
    ':nth-last-child(odd of .a)'
  );
});

test('drops invalid delimiter operators in forgiving lists', () => {
  assert.equal(normalizeList(':is([attr~], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr^], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr$], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr*], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr|=], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr=], .ok)', false, false), ':is(.ok)');
  assert.equal(
    normalizeList(':where([attr~], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr^], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr$], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr*], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr|=], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':not([attr~], .ok)', false, false),
    ':not([attr~], .ok)'
  );
  assert.equal(
    normalizeList(':not([attr^], .ok)', false, false),
    ':not([attr^], .ok)'
  );
});

test('empty forgiving selector list does not invalidate containing rule', () => {
  assert.equal(normalizeList('.a, :is([attr~])', false, false), '.a,:is()');
  assert.equal(normalizeList(':is([attr~]), .b', false, false), ':is(),.b');
  assert.equal(
    normalizeList('.a, :where([attr~])', false, false),
    '.a,:where()'
  );
  assert.equal(
    normalizeList(':where([attr~]), .b', false, false),
    ':where(),.b'
  );
  assert.equal(
    normalizeList(':is([attr~], [attr^], [attr$])', false, false),
    ':is()'
  );
  assert.equal(
    normalizeList(':where([attr~], [attr^], [attr$])', false, false),
    ':where()'
  );
  assert.equal(
    normalizeList(':is([attr~]), :where([attr^]), .target', false, false),
    ':is(),:where(),.target'
  );
  assert.equal(minify('.a, :is([attr~])'), '.a,:is(){x:y}');
  assert.equal(minify(':where([attr~]), .b'), '.b,:where(){x:y}');
  assert.equal(minify(':is([attr~])'), ':is(){x:y}');
  assert.equal(minify(':where([attr~])'), ':where(){x:y}');
});

test('deduplicates wide selector lists with functions in linear time', () => {
  const count = 2000;
  const items = Array.from({ length: count }, (_, i) => `:is(.item-${i})`);
  const input = items.join(',');
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.equal(output, input);
  assert.ok(elapsed < 200, `Expected < 200ms, took ${elapsed.toFixed(1)}ms`);
});

test('deduplicates wide inner selector lists with functions in linear time', () => {
  const count = 2000;
  const items = Array.from({ length: count }, (_, i) => `:not(.item-${i})`);
  const input = `:is(${items.join(',')})`;
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.equal(output, input);
  assert.ok(elapsed < 150, `Expected < 150ms, took ${elapsed.toFixed(1)}ms`);
});

test('deduplicates identical opaque and raw functional pseudos in inner selector lists', () => {
  assert.equal(
    normalizeList(':is(:unknown(x), :unknown(x))', false, false),
    ':is(:unknown(x))'
  );
  assert.equal(
    normalizeList(':is(:not(:unknown(x)), :not(:unknown(x)))', false, false),
    ':is(:not(:unknown(x)))'
  );
});

test('normalizes compound arguments with attribute whitespace inside functional pseudos', () => {
  assert.equal(
    normalizeList(':host([attr = "val"])', false, false),
    ':host([attr=val])'
  );
});

test('preserves compound-only functional pseudos when arguments contain combinators or commas', () => {
  for (const input of [
    ':host(.a > .b)',
    ':host(.a, .b)',
    ':host-context(.a + .b)',
    ':slotted(.a ~ .b)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('normalizes functional pseudo arguments in a single pass without multi-pass trivia rescans', () => {
  const input = ':not(h1 /**/ p, div /* c1 */ > /* c2 */ span, .a + .b)';
  assert.equal(normalizeList(input, false, false), ':not(h1 p,div>span,.a+.b)');
  const repeated = `:not(${Array.from({ length: 500 }, (_, i) => `div /* ${i} */ > /* ${i} */ .item-${i}`).join(',')})`;
  const start = performance.now();
  const output = normalizeList(repeated, false, false);
  const elapsed = performance.now() - start;
  assert.ok(output.startsWith(':not('));
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});
