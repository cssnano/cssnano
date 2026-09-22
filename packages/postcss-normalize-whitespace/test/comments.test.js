import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should preserve comments at function boundaries and around dividers',
  processCSS(
    'a{x:foo( /**/ a /**/ , /**/ b /**/ )}',
    'a{x:foo(/**/ a /**/,/**/ b /**/)}'
  )
);

test(
  'should preserve comments while trimming whitespace from css variables',
  processCSS('h1{width:var(/**/ x,  )}', 'h1{width:var(/**/ x, )}')
);

// postcss-discard-comments keeps preserved comments in raws.between, so
// trimming the separator must not clobber them.
test(
  'should preserve a kept comment between custom property name and value',
  passthroughCSS('a{--x:/*! keep */1}')
);

test(
  'should preserve authored whitespace after a kept comment in a custom property value',
  passthroughCSS('a{--v:/*! keep */ 1}')
);

test(
  'should preserve a kept comment between standard declaration name and value',
  passthroughCSS('a{color:/*! keep */red}')
);

test(
  'should trim separator whitespace around a kept comment in a standard declaration',
  processCSS('a{color : /*! keep */ red}', 'a{color:/*! keep */red}')
);

// CSS Variables 1 serializes values as authored; only the leading run
// around the colon goes.
test(
  'should trim only the leading separator run around a kept comment in a custom property',
  processCSS('a{--x : /*! keep */ 1}', 'a{--x:/*! keep */ 1}')
);

test(
  'should preserve comments while trimming whitespace around fallback commas',
  processCSS(
    'h1{color:var(--custom /**/ , /**/ 10px)}',
    'h1{color:var(--custom /**/,/**/ 10px)}'
  )
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
  'should trim whitespace surrounding custom property name with comments',
  processCSS(
    'h1{color:var( /**/ --custom /**/ )}',
    'h1{color:var(/**/ --custom /**/)}'
  )
);
