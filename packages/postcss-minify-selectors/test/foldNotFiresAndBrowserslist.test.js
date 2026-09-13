import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

const modernBl = { overrideBrowserslist: 'last 2 Chrome versions' };

suite('fold that do not fire', () => {
  test(
    'no-fold: 2-selector pair without byte savings is left alone',
    processCSS(
      'ol li a, ul li a{color:red}',
      'ol li a,ul li a{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: byte-neutral 2-selector child-combinator case',
    // `.foo>.a,.foo>.b` (15) == `.foo>:is(.a,.b)` (15) — equal, no fold.
    processCSS(
      '.foo>.a,.foo>.b{color:red}',
      '.foo>.a,.foo>.b{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: only fires when strictly shorter',
    // `:is(a,b) c` would be 11 chars, original `a c,b c` is 7 — stay put.
    processCSS('a c,b c{color:red}', 'a c,b c{color:red}', modernBl)
  );

  test(
    'no-fold: rejects mixed-specificity middles (id vs class)',
    processCSS(
      '.a b,#x b,.c b{color:red}',
      '#x b,.a b,.c b{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: rejects mixed-specificity middles (tag vs class)',
    processCSS(
      'ol li a,ul li a,.menu li a{color:red}',
      '.menu li a,ol li a,ul li a{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: rejects universal vs tag in middle (different specificity)',
    processCSS(
      '* h1,body h1{font-size:1rem}',
      '* h1,body h1{font-size:1rem}',
      modernBl
    )
  );

  test(
    'no-fold: rejects :not() with differing inner specificity',
    processCSS(
      '.p :not(.a) b,.p :not(#x) b{color:red}',
      '.p :not(#x) b,.p :not(.a) b{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: rejects pseudo-element in middle',
    processCSS(
      '.a::before,.b::before,.c::before{content:""}',
      '.a:before,.b:before,.c:before{content:""}',
      modernBl
    )
  );

  test(
    'no-fold: rejects legacy single-colon pseudo-element in middle',
    processCSS(
      '.a:before,.b:before,.c:before{content:""}',
      '.a:before,.b:before,.c:before{content:""}',
      modernBl
    )
  );

  test(
    'no-fold: rejects pseudo-element that survived `::` → `:` shortening',
    processCSS(
      '.t a:hover::after,.t b:hover::after,.t c:hover::after{content:"x"}',
      '.t a:hover:after,.t b:hover:after,.t c:hover:after{content:"x"}',
      modernBl
    )
  );

  test(
    'no-fold: pseudo-element in common part stays put (not pulled into `:is()`)',
    processCSS(
      'a::before h1,b::before h1,c::before h1{content:"x"}',
      'a:before h1,b:before h1,c:before h1{content:"x"}',
      modernBl
    )
  );

  test(
    'no-fold: keyframes percentages are untouched (no combinator context)',
    processCSS(
      '@keyframes k{0%,50%,to{opacity:0}}',
      '@keyframes k{0%,50%,to{opacity:0}}',
      modernBl
    )
  );

  test(
    'no-fold: rejects combinator in middle when prefix is non-empty (child)',
    processCSS(
      '.card>.header>.title,.card>.footer>.meta{color:red}',
      '.card>.footer>.meta,.card>.header>.title{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: rejects combinator in middle when prefix is non-empty (descendant)',
    processCSS(
      '.x .a .b,.x .c .d{color:red}',
      '.x .a .b,.x .c .d{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: already-nested `:is()` when result would not be shorter',
    processCSS(
      ':is(.a,.b) .x,:is(.c,.d) .x{color:red}',
      ':is(.a,.b) .x,:is(.c,.d) .x{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: idempotent on already-folded output',
    processCSS(
      ':is(article,aside,nav,section) h1{font-size:25px}',
      ':is(article,aside,nav,section) h1{font-size:25px}',
      modernBl
    )
  );

  test(
    'no-fold: single-selector rules',
    processCSS('.foo .bar{color:red}', '.foo .bar{color:red}', modernBl)
  );

  test(
    'no-fold: mixin-like selectors',
    processCSS('.mixin:{color:red}', '.mixin:{color:red}', modernBl)
  );
});

suite('options  / browserslist interactions', () => {
  test(
    'fold: disabled by convertToIs=false',
    processCSS(
      'section h1,article h1,aside h1,nav h1{font-size:25px}',
      'article h1,aside h1,nav h1,section h1{font-size:25px}',
      { ...modernBl, convertToIs: false }
    )
  );

  test(
    'fold: disabled when browserslist does not support :is() (IE 11)',
    processCSS(
      'section h1,article h1,aside h1,nav h1{font-size:25px}',
      'article h1,aside h1,nav h1,section h1{font-size:25px}',
      { overrideBrowserslist: 'ie 11' }
    )
  );

  test(
    'fold: disabled when any target in a list is unsupported',
    processCSS(
      'section h1,article h1,aside h1,nav h1{font-size:25px}',
      'article h1,aside h1,nav h1,section h1{font-size:25px}',
      { overrideBrowserslist: ['last 2 Chrome versions', 'IE 11'] }
    )
  );

  test(
    'fold: honours sort=false (does not re-sort middles after fold)',
    processCSS(
      '.foo .z .x,.foo .a .x,.foo .m .x{color:red}',
      '.foo :is(.z,.a,.m) .x{color:red}',
      { ...modernBl, sort: false }
    )
  );

  test(
    'fold: sort=true reorders middles alphabetically',
    processCSS(
      '.foo .z .x,.foo .a .x,.foo .m .x{color:red}',
      '.foo :is(.a,.m,.z) .x{color:red}',
      modernBl
    )
  );
});
