import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);
const processor = postcss([plugin()]);
const staleRawPlugin = {
  postcssPlugin: 'stale-raw',
  Declaration(decl) {
    decl.value = 'new value';
  },
};

test(
  'should trim whitespace from nested functions',
  processCSS(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - (100px / var(--test)))}'
  )
);

test(
  'should prefer a declaration value over stale raw metadata',
  processCSSFactory([staleRawPlugin, plugin]).processCSS(
    'a{color:old /* inline comment */}',
    'a{color:new value /* inline comment */}'
  )
);

test(
  'should preserve whitespace in unquoted URLs',
  passthroughCSS('a{background:url( assets/a.png )}')
);

test(
  'should preserve whitespace in uppercase unquoted URLs',
  passthroughCSS('a{background:URL( assets/a.png )}')
);

test(
  'should preserve escaped whitespace in unquoted URLs',
  passthroughCSS('a{background:url( a\\ b.png )}')
);

for (const [name, whitespace, expectedValue] of [
  ['space', ' ', 'foo '],
  ['tab', '\t', 'foo\t'],
]) {
  test(`should preserve escaped URL-boundary ${name}`, async () => {
    const input = `a{x:url(foo\\${whitespace})}`;
    const result = await processor.process(input, { from: undefined });

    assert.equal(result.css, input);
    const reparsed = postcss.parse(result.css);
    const token = [...tokenize({ css: reparsed.first.first.value })].find(
      (candidate) => candidate[0] === TokenType.URL
    );

    assert.equal(token?.[4].value, expectedValue);
  });
}

test(
  'should trim whitespace from regular functions, commas and dividers',
  processCSS(
    'a{transform:translate( 1px , 2px ) scale( 1 / 2 )}',
    'a{transform:translate(1px,2px) scale(1/2)}'
  )
);

test(
  'should preserve calc whitespace around operators and trim its boundaries',
  processCSS(
    'a{width:calc( 100% - ( 10px / 2 ) )}',
    'a{width:calc(100% - (10px / 2))}'
  )
);

test(
  'should preserve division whitespace in modern math functions while trimming commas',
  processCSS(
    'a{width:min( 100px , 1 / 2 );height:clamp( 1px , 1 / 2 , 5px )}',
    'a{width:min(100px,1 / 2);height:clamp(1px,1 / 2,5px)}'
  )
);

test(
  'should trim comma whitespace inside nested math functions in calc',
  processCSS(
    'a{width:calc( min( 10px , 20px ) + clamp( 1px , 2px , 3px ) )}',
    'a{width:calc(min(10px,20px) + clamp(1px,2px,3px))}'
  )
);

test(
  'should preserve division whitespace in uppercase math functions',
  processCSS(
    'a{width:MIN( 100px , 1 / 2 );height:CLAMP( 1px , 1 / 2 , 5px )}',
    'a{width:MIN(100px,1 / 2);height:CLAMP(1px,1 / 2,5px)}'
  )
);

test(
  'should preserve division whitespace in stepped, trig, and nested math functions',
  processCSS(
    'a{width:round( 1 / 2 , 1px );transform:rotate(atan2( 1 / 2 , 3 / 4 ));max-width:clamp( 1px , min( 100px , 1 / 2 ) , 5px )}',
    'a{width:round(1 / 2,1px);transform:rotate(atan2(1 / 2,3 / 4));max-width:clamp(1px,min(100px,1 / 2),5px)}'
  )
);

test(
  'should trim slash whitespace in non-math functions such as color alpha dividers',
  processCSS(
    'a{color:hsl( 0 0% 0% / 0.5 );background:rgb( 255 0 0 / 50% )}',
    'a{color:hsl(0 0% 0%/0.5);background:rgb(255 0 0/50%)}'
  )
);

test(
  'should preserve comments at function boundaries and around dividers',
  processCSS(
    'a{x:foo( /**/ a /**/ , /**/ b /**/ )}',
    'a{x:foo(/**/ a /**/,/**/ b /**/)}'
  )
);

test(
  'should normalize nested calc, variable functions and blocks',
  processCSS(
    'a{x:calc( var(--x, env(safe-area-inset-top, )) + constant(--y, [ 1px / ( 2px ) ]) )}',
    'a{x:calc(var(--x,env(safe-area-inset-top, )) + constant(--y,[ 1px / (2px) ]))}'
  )
);

test(
  'should trim whitespace from nested functions (uppercase "calc")',
  processCSS(
    'h1{width:CALC(10px - ( 100px / var(--test) ))}',
    'h1{width:CALC(10px - (100px / var(--test)))}'
  )
);

test(
  'should trim whitespace from css variables',
  processCSS(
    'h1{width:var(--foo, calc(10px + 10px))}',
    'h1{width:var(--foo,calc(10px + 10px))}'
  )
);

test(
  'should preserve comments while trimming whitespace from css variables',
  processCSS('h1{width:var(/**/ x,  )}', 'h1{width:var(/**/ x, )}')
);

test(
  'should trim whitespace from env variables',
  processCSS(
    'h1{width:env(--foo, calc(10px + 10px))}',
    'h1{width:env(--foo,calc(10px + 10px))}'
  )
);

test(
  'should trim whitespace from var with calc',
  processCSS(
    'h1{width:var(--foo, calc(10px * 10px))}',
    'h1{width:var(--foo,calc(10px * 10px))}'
  )
);

test(
  'should preserve space in custom property',
  passthroughCSS('h1{--prop:  }')
);

test(
  'should not add space around empty custom property',
  passthroughCSS('h1{--prop:}')
);
test(
  'should not trim spaces inside of nested var function',
  processCSS(
    'div{background:var(--my-var, var(--my-background, pink, ))}',
    'div{background:var(--my-var,var(--my-background,pink, ))}'
  )
);
test(
  'should not trim spaces inside of var inside calc function',
  processCSS(
    'div {height: calc(var(--text-xxxl, ) * var(--text-scale-ratio-up, ))}',
    'div{height:calc(var(--text-xxxl, ) * var(--text-scale-ratio-up, ))}'
  )
);

test(
  'should not trim spaces inside of var function',
  processCSS(
    'div{border-radius:10px var(--foobar, )}',
    'div{border-radius:10px var(--foobar, )}'
  )
);

test(
  'should not trim spaces inside of env function',
  processCSS(
    'div{ border-radius:env(border-rad, ) }',
    'div{border-radius:env(border-rad, )}'
  )
);
test(
  'should not trim spaces inside of constant function',
  processCSS(
    'div{ border-radius:constant(border-rad, ) }',
    'div{border-radius:constant(border-rad, )}'
  )
);

test(
  'should not trim spaces inside of env function',
  processCSS(
    'div{ border-radius:var(border-rad, ) }',
    'div{border-radius:var(border-rad, )}'
  )
);

test(
  'should preserve whitespace after custom property declaration',
  passthroughCSS(':root{--foo: bar}')
);

test(
  'should preserve an escaped tab character used as an IE hack',
  passthroughCSS('div{display:none\\\t}')
);

test(
  'should preserve an escaped tab character and drop redundant trailing whitespace',
  processCSS('div{display:none\\\t   }', 'div{display:none\\\t}')
);

test(
  'should not let a trailing backslash followed by a newline become an escape of the closing brace',
  passthroughCSS('div{display:none\\\n}')
);

test(
  'should not treat an escaped backslash as a dangling escape',
  passthroughCSS('div{content:"x"\\\\}')
);

test(
  'should preserve an escaped tab character in the last declaration of an at-rule',
  passthroughCSS('@font-face{src:url(a)\\\t}')
);

test(
  'should preserve an escaped tab character in a custom property that is the last declaration',
  passthroughCSS(':root{--x:1;--y:red\\\t}')
);

test(
  'should retain whitespace around division in escaped math functions',
  processCSS('h1{width:c\\61lc(10px / 2)}', 'h1{width:c\\61lc(10px / 2)}')
);

test('should synchronize decl.raws.value when normalized', async () => {
  const input = 'a{width:  10px  }';
  const root = postcss.parse(input);
  const decl = root.first.first;
  decl.raws.value = { raw: '  10px  ', value: '10px' };
  await processor.process(root, { from: undefined });
  assert.deepEqual(decl.raws.value, { raw: ' 10px ', value: ' 10px ' });
});

// lightningcss#1201: whitespace between adjacent var() calls must be preserved
test(
  'should preserve whitespace between adjacent var() calls',
  processCSS('h1{margin: var(--a)  var(--b)}', 'h1{margin:var(--a) var(--b)}')
);

// lightningcss#1141: var(--x, ) with empty fallback must be idempotent
test(
  'should be idempotent on var() with empty fallback',
  passthroughCSS('h1{width:var(--x, )}')
);

test(
  'should trim whitespace surrounding custom property name in var()',
  processCSS('h1{color:var(  --custom  )}', 'h1{color:var(--custom)}')
);

test(
  'should trim whitespace surrounding identifier in env()',
  processCSS(
    'h1{color:env(  safe-area-inset-top  )}',
    'h1{color:env(safe-area-inset-top)}'
  )
);

test(
  'should trim whitespace surrounding identifier in constant()',
  processCSS(
    'h1{color:constant(  safe-area-inset-top  )}',
    'h1{color:constant(safe-area-inset-top)}'
  )
);

test(
  'should trim whitespace surrounding custom property name in uppercase VAR()',
  processCSS('h1{color:VAR(  --custom  )}', 'h1{color:VAR(--custom)}')
);

test(
  'should trim whitespace surrounding identifier in uppercase ENV()',
  processCSS('h1{color:ENV(  safe-area  )}', 'h1{color:ENV(safe-area)}')
);

test(
  'should trim whitespace surrounding identifier in uppercase CONSTANT()',
  processCSS(
    'h1{color:CONSTANT(  safe-area  )}',
    'h1{color:CONSTANT(safe-area)}'
  )
);

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
  'should preserve comments while trimming whitespace around fallback commas',
  processCSS(
    'h1{color:var(--custom /**/ , /**/ 10px)}',
    'h1{color:var(--custom /**/,/**/ 10px)}'
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
  'should trim whitespace from an empty var() function',
  processCSS('h1{color:var( )}', 'h1{color:var()}')
);

test(
  'should preserve the empty fallback space in var( , )',
  processCSS('h1{color:var( , )}', 'h1{color:var(, )}')
);

test(
  'should trim the boundary after a comment-only fallback',
  processCSS('h1{color:var(--foo, /**/ )}', 'h1{color:var(--foo,/**/)}')
);

test(
  'should normalize a comment-only fallback without trailing whitespace',
  processCSS('h1{color:var(--foo, /**/)}', 'h1{color:var(--foo,/**/)}')
);

test(
  'should not alter custom property declarations containing var()',
  passthroughCSS('h1{--custom: var(  --other  )}')
);

test(
  'should preserve whitespace between adjacent var() calls while trimming internal whitespace',
  processCSS(
    'h1{margin:var(  --a  )   var(  --b  )}',
    'h1{margin:var(--a) var(--b)}'
  )
);

test(
  'should trim whitespace surrounding custom property name with comments',
  processCSS(
    'h1{color:var( /**/ --custom /**/ )}',
    'h1{color:var(/**/ --custom /**/)}'
  )
);

test(
  'should trim whitespace in nested variable functions',
  processCSS(
    'h1{color:var(  --a  , var(  --b  )  )}',
    'h1{color:var(--a,var(--b))}'
  )
);

test(
  'should trim boundary whitespace in indexed env() while preserving required index spacing',
  processCSS(
    'h1{color:env(  viewport-segment-width 0 0  )}',
    'h1{color:env(viewport-segment-width 0 0)}'
  )
);

test(
  'should trim boundary whitespace and separator comma in indexed env() with fallback',
  processCSS(
    'h1{color:env(  viewport-segment-width 0 0  ,  10px  )}',
    'h1{color:env(viewport-segment-width 0 0,10px)}'
  )
);

test(
  'should trim whitespace surrounding custom property name in escaped var()',
  processCSS('h1{color:v\\61r(  --custom  )}', 'h1{color:v\\61r(--custom)}')
);

test(
  'should trim whitespace before and after first comma in escaped var() with fallback',
  processCSS(
    'h1{color:v\\61r(  --custom  ,  10px  )}',
    'h1{color:v\\61r(--custom,10px)}'
  )
);

test(
  'should trim whitespace surrounding identifier in escaped env()',
  processCSS('h1{color:\\65nv(  safe-area  )}', 'h1{color:\\65nv(safe-area)}')
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
