import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

// ---------------------------------------------------------------------------
// :is() folding (issue #1703)
// ---------------------------------------------------------------------------

const modernBl = { overrideBrowserslist: 'last 2 Chrome versions' };

suite('fold that fires', () => {
  test(
    'fold: MDN level-1 section headings example',
    processCSS(
      'section h1, article h1, aside h1, nav h1{font-size:25px}',
      ':is(article,aside,nav,section) h1{font-size:25px}',
      modernBl
    )
  );

  test(
    'fold: common suffix with multiple selectors',
    processCSS(
      'section h1,article h1,aside h1,nav h1{font-size:25px}',
      ':is(article,aside,nav,section) h1{font-size:25px}',
      modernBl
    )
  );

  test(
    'fold: common prefix with multiple selectors',
    processCSS(
      '.foo .a .x,.foo .b .x,.foo .c .x{color:red}',
      '.foo :is(.a,.b,.c) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: common prefix and suffix',
    processCSS(
      '.nav .item .home,.nav .item .shop,.nav .item .help{color:red}',
      '.nav .item :is(.help,.home,.shop){color:red}',
      modernBl
    )
  );

  test(
    'fold: MDN deep list-style example (16-way)',
    processCSS(
      'ol ol ul,ol ul ul,ol menu ul,ol dir ul,ul ol ul,ul ul ul,ul menu ul,' +
        'ul dir ul,menu ol ul,menu ul ul,menu menu ul,menu dir ul,dir ol ul,' +
        'dir ul ul,dir menu ul,dir dir ul{list-style:square}',
      ':is(dir,menu,ol,ul) :is(dir,menu) ul,' +
        ':is(dir,menu,ol,ul) :is(ol,ul) ul{list-style:square}',
      modernBl
    )
  );

  test(
    'fold: pseudo-class in middle (same specificity)',
    processCSS(
      '.btn a:hover,.btn a:focus,.btn a:active{color:red}',
      '.btn :is(a:active,a:focus,a:hover){color:red}',
      modernBl
    )
  );

  test(
    'no-fold: functional pseudo in middle (outside allowlist)',
    processCSS(
      '.box :not(.a) .x,.box :not(.b) .x,.box :not(.c) .x{color:red}',
      '.box :not(.a) .x,.box :not(.b) .x,.box :not(.c) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: universal selector in common part stays outside `:is()`',
    processCSS(
      '.a * .x,.b * .x,.c * .x{color:red}',
      ':is(.a,.b,.c) * .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: child combinator in common prefix',
    processCSS(
      '.wrap > .a .x,.wrap > .b .x,.wrap > .c .x{color:red}',
      '.wrap>:is(.a,.b,.c) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: sibling combinator in common prefix',
    processCSS(
      '.a~.m,.a~.n,.a~.o{color:red}',
      '.a~:is(.m,.n,.o){color:red}',
      modernBl
    )
  );

  test(
    'fold: adjacent-sibling combinator in common prefix',
    processCSS(
      '.a+.m,.a+.n,.a+.o{color:red}',
      '.a+:is(.m,.n,.o){color:red}',
      modernBl
    )
  );

  test(
    'fold: compound selector (multi-class) in common prefix',
    processCSS(
      '.menu.open a,.menu.open b,.menu.open c{color:red}',
      '.menu.open :is(a,b,c){color:red}',
      modernBl
    )
  );

  test(
    'fold: multi-simple compound middle with same specificity',
    processCSS(
      '.root a.x b,.root a.y b,.root a.z b{color:red}',
      '.root :is(a.x,a.y,a.z) b{color:red}',
      modernBl
    )
  );

  test(
    'fold: ids in middle (all same specificity)',
    processCSS(
      '#a .x,#b .x,#c .x{color:red}',
      ':is(#a,#b,#c) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: attribute selectors with matching specificity',
    processCSS(
      '[data-a] .item .x,[data-b] .item .x,[data-c] .item .x{color:red}',
      ':is([data-a],[data-b],[data-c]) .item .x{color:red}',
      modernBl
    )
  );

  test(
    'no-fold: namespaced attribute selectors',
    processCSS(
      '.scope [ns|foo] .tail,.scope [ns|bar] .tail{color:red}',
      '.scope [ns|bar] .tail,.scope [ns|foo] .tail{color:red}',
      modernBl
    )
  );

  test(
    'fold: pseudo-class after compound in common prefix',
    processCSS(
      '.tab:hover .a,.tab:hover .b,.tab:hover .c{color:red}',
      '.tab:hover :is(.a,.b,.c){color:red}',
      modernBl
    )
  );

  test(
    'fold: does not touch nested `&` selectors',
    processCSS(
      '& .a .x,& .b .x,& .c .x{color:red}',
      '& :is(.a,.b,.c) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: dedupes identical middles',
    processCSS(
      '.foo .a .x,.foo .a .x,.foo .b .x{color:red}',
      '.foo :is(.a,.b) .x{color:red}',
      modernBl
    )
  );

  test(
    'fold: survives duplicates being removed before fold',
    processCSS(
      '.a .x,.a .x,.a .y,.a .z{color:red}',
      '.a :is(.x,.y,.z){color:red}',
      modernBl
    )
  );
});
