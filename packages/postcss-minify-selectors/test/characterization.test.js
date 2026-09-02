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
  [':not(:is(.a, .b)), :nth-child(2n + 1)', ':not(:is(.a,.b)),:nth-child(odd)'],
  [
    '.a\\,b, .a\\,b, .x[attr="(deep, value)"]',
    '.a\\,b,.x[attr="(deep, value)"]',
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
  assert.match(output, /^\.item-0,/u);
  assert.match(output, /\.item-2999(?:,|\{)/u);
});

test('normalizes every attribute operator without leaking state between attributes', () => {
  const input = '[a = x i][b ~= y s][c |= z i][d ^= q s][e $= r i][f *= t s]';
  assert.equal(
    minify(input),
    '[a=x i][b~=y s][c|=z i][d^=q s][e$=r i][f*=t s]{x:y}'
  );
});

test('normalizes nested selector-list functions and nth formulas', () => {
  const input =
    ':is( .b, :not( .a, .a ), :where("a,b", .x /* comment */), .b, .\\61 )';
  assert.equal(minify(input), ':is(.b,:not(.a),:where("a,b",.x),.\\61){x:y}');
  assert.equal(
    minify(':is(:nth-child( 2n + 1 ), :nth-last-child( even ))'),
    ':is(:nth-child(odd),:nth-last-child(2n)){x:y}'
  );
  assert.equal(
    minify(':is( .z, .a, .z )'),
    minify(minify(':is( .z, .a, .z )').slice(0, -5))
  );
});

test('malformed and unclosed selectors remain non-throwing', () => {
  for (const input of [':is(.a', ':not([a=x)', '[a=x', ':where("a,b"']) {
    assert.doesNotThrow(() => normalizeList(input, false, false), input);
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('deeply nested selector functions stay bounded', () => {
  const input = `${':is('.repeat(400)}.item${')'.repeat(400)}`;
  assert.doesNotThrow(() => minify(input));
  assert.equal(minify(input), `${input}{x:y}`);
});
