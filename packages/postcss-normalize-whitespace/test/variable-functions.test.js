import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should trim whitespace from css variables',
  processCSS(
    'h1{width:var(--foo, calc(10px + 10px))}',
    'h1{width:var(--foo,calc(10px + 10px))}'
  )
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
  'should trim whitespace from an empty var() function',
  processCSS('h1{color:var( )}', 'h1{color:var()}')
);

test(
  'should preserve whitespace between adjacent var() calls while trimming internal whitespace',
  processCSS(
    'h1{margin:var(  --a  )   var(  --b  )}',
    'h1{margin:var(--a) var(--b)}'
  )
);

test(
  'should trim whitespace in nested variable functions',
  processCSS(
    'h1{color:var(  --a  , var(  --b  )  )}',
    'h1{color:var(--a,var(--b))}'
  )
);
