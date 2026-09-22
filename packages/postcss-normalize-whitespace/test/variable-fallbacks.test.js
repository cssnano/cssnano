import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);
const processor = postcss([plugin()]);

test(
  'should trim whitespace before and after first comma with fallback',
  processCSS(
    'h1{color:var(  --custom   ,  10px  )}',
    'h1{color:var(--custom,10px)}'
  )
);

test(
  'should trim whitespace around multiple fallback commas',
  processCSS(
    'h1{font-family:var(  --font  ,  "Helvetica Neue"  ,  Arial  ,  sans-serif  )}',
    'h1{font-family:var(--font,"Helvetica Neue",Arial,sans-serif)}'
  )
);

test(
  'should trim fallback division whitespace outside math functions',
  processCSS('h1{width:var(--ratio, 16 / 9)}', 'h1{width:var(--ratio,16/9)}')
);

test(
  'should preserve fallback division whitespace inside math functions',
  processCSS(
    'h1{width:calc(var(--ratio, 16 / 9))}',
    'h1{width:calc(var(--ratio,16 / 9))}'
  )
);

test(
  'should trim whitespace around parenthesized fallback expressions',
  processCSS('h1{width:var(--foo, ( 10px ))}', 'h1{width:var(--foo,(10px))}')
);

test(
  'should preserve operator whitespace in parenthesized fallback expressions',
  processCSS(
    'h1{width:var(--foo, ( 10px + 20px ))}',
    'h1{width:var(--foo,(10px + 20px))}'
  )
);

test(
  'should trim fallback separators without changing commas in strings',
  processCSS(
    'h1{content:var(--x, "hello, " , "world")}',
    'h1{content:var(--x,"hello, ","world")}'
  )
);

test(
  'should preserve spaces in string fallback arguments',
  processCSS(
    'h1{font-family:var(--f, "Helvetica Neue" , sans-serif)}',
    'h1{font-family:var(--f,"Helvetica Neue",sans-serif)}'
  )
);

test(
  'should normalize multiple spaces in empty fallback to single space',
  processCSS('h1{color:var(  --custom   ,    )}', 'h1{color:var(--custom, )}')
);

test(
  'should retain bare comma empty fallback when input has no space',
  processCSS('h1{color:var(  --custom   ,)}', 'h1{color:var(--custom,)}')
);

test(
  'should preserve the empty fallback space in var( , )',
  processCSS('h1{color:var( , )}', 'h1{color:var(, )}')
);

test(
  'should trim whitespace in deeply nested variable fallback containing commas',
  processCSS(
    'h1{color:var(  --x  , fn(  fn(  1px  ,  2px  )  ,  3px  )  )}',
    'h1{color:var(--x,fn(fn(1px,2px),3px))}'
  )
);

test('should process deeply nested variable fallback with many commas without quadratic cost', () => {
  let input = Array.from({ length: 50 }, (_, i) => `  ${i}px  `).join(',');
  let expected = Array.from({ length: 50 }, (_, i) => `${i}px`).join(',');
  for (let d = 0; d < 50; d++) {
    input = `fn(  ${input}  ,  ${d}px  )`;
    expected = `fn(${expected},${d}px)`;
  }
  return processCSS(
    `h1{color:var(  --x  ,  ${input}  )}`,
    `h1{color:var(--x,${expected})}`
  )();
});

test('should be idempotent on fallback boundary whitespace', async () => {
  const first = await processor.process('h1{width:var(--foo, 10px )}', {
    from: undefined,
  });
  const second = await processor.process(first.css, { from: undefined });

  assert.equal(first.css, 'h1{width:var(--foo,10px)}');
  assert.equal(second.css, first.css);
});
