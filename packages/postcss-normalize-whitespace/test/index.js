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
    'a{x:calc(var(--x,env(safe-area-inset-top, )) + constant(--y,[ 1px / ( 2px ) ]))}'
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
