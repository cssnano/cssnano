import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge in media queries',
  processCSS(
    '@media print{h1{display:block}h1{color:red}}',
    '@media print{h1{display:block;color:red}}'
  )
);

test(
  'should merge a rule moved into an earlier equivalent @media block with the rule that followed it',
  processCSS(
    '@media print{.a{top:0}}@media print{.b{top:0}.c{top:0}}',
    '@media print{.a,.b,.c{top:0}}'
  )
);

test(
  'should merge a rule moved into an earlier equivalent @media block nested in @supports with the rule that followed it',
  processCSS(
    '@supports (x:y){@media print{.a{top:0}}}@supports (x:y){@media print{.b{top:0}.c{top:0}}}',
    '@supports (x:y){@media print{.a,.b,.c{top:0}}}'
  )
);

test(
  'should merge in media queries (2)',
  processCSS(
    '@media print{h1{display:block}p{display:block}}',
    '@media print{h1,p{display:block}}'
  )
);

test(
  'should merge in media queries (3)',
  processCSS(
    '@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}h3{text-decoration:none}',
    '@media print{h1{color:red}h1,h2{text-decoration:none}}h3{text-decoration:none}'
  )
);

test(
  'should merge in media queries (4)',
  processCSS(
    'h3{text-decoration:none}@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}',
    'h3{text-decoration:none}@media print{h1{color:red}h1,h2{text-decoration:none}}'
  )
);

test(
  'should not merge across media queries',
  passthroughCSS(
    '@media screen and (max-width:480px){h1{display:block}}@media screen and (min-width:480px){h2{display:block}}'
  )
);

test(
  'should not merge across media queries (2)',
  passthroughCSS(
    '@media screen and (max-width:200px){h1{color:red}}@media screen and (min-width:480px){h1{display:block}}'
  )
);

test(
  'should not merge in different contexts',
  passthroughCSS('h1{display:block}@media print{h1{color:red}}')
);

test(
  'should not merge in different contexts (2)',
  passthroughCSS('@media print{h1{display:block}}h1{color:red}')
);

// Equal blocks join into the first one instead of leaving an empty block
// behind, so the output is smaller and the rules keep their order.
test(
  'should merge multiple media queries',
  processCSS(
    '@media print{h1{display:block}}@media print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}'
  )
);

test(
  'should merge multiple media queries (uppercase)',
  processCSS(
    '@media print{h1{display:block}}@MEDIA print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}'
  )
);

test(
  'should merge @media inside @layer with custom properties',
  passthroughCSS(`@layer utilities {
  .dark\\:border-zinc-700 {
    @media (prefers-color-scheme: dark) {
      border-color: var(--color-zinc-700);
    }
  }
  .dark\\:bg-black {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-black);
    }
  }
  .dark\\:bg-neutralDark {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutralDark);
    }
  }
  .dark\\:text-gray-200 {
    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-200);
    }
  }
  .dark\\:text-white {
    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }
}`)
);

test(
  'should merge multiple values across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
      '@media (width:40px){h1{border:1px solid red;background-color:red}}',
      '@media (width:40px){h1{border:1px solid red}}',
    ].join(''),
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
    ].join('')
  )
);

test(
  'should prefer the smaller opposite-direction partial merge across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{color:black}h2{color:black;font-weight:bold}}',
      '@media (width:40px){h3{color:black;font-weight:bold}}',
    ].join(''),
    ['@media (width:40px){h1,h2,h3{color:black}h2,h3{font-weight:bold}}'].join(
      ''
    )
  )
);

test(
  'should merge identical media queries without reordering conflicting nth-child rules',
  processCSS(
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
}
@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}`,
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}`
  )
);

// Blocks with equal conditions only join when nothing between them sets a
// conflicting property, because the later block would otherwise change the
// order in which equal-specificity rules cascade.

test(
  'should merge equal @media blocks that surround a rule with other properties (#806)',
  processCSS(
    '@media print{.a{color:red}}.b{width:1px}@media print{.c{height:1px}}',
    '@media print{.a{color:red}.c{height:1px}}.b{width:1px}'
  )
);

test(
  'should not merge equal @media blocks across a rule that sets the same property',
  passthroughCSS(
    '@media print{.a{color:red}}.b{color:blue}@media print{.c{color:green}}'
  )
);

test(
  // `margin:0` resets `margin-left`. An element with classes b and c gets
  // `margin-left:2px` only while the second block stays after the shorthand;
  // moving it up beside `.a` would let `margin:0` win.
  'should not merge equal @media blocks across a shorthand that resets their longhands',
  passthroughCSS(
    '@media (min-width:1px){.a{margin-left:1px}}.b{margin:0}@media (min-width:1px){.c{margin-left:2px}}'
  )
);

test(
  // Every rule between the two (min-width:640px) blocks sets `width`, so an
  // element with classes foo and bar needs the later block to stay last.
  'should not merge equal @media blocks when every rule in between sets width (#111)',
  passthroughCSS(
    '.foo{width:10px}@media (min-width:640px){.foo{width:150px}}.bar{width:20px}@media (min-width:320px){.bar{width:200px}}@media (min-width:640px){.bar{width:300px}}'
  )
);

test(
  'should not merge @media blocks with different conditions',
  passthroughCSS(
    '@media print{.a{color:red}}.b{width:1px}@media screen{.c{height:1px}}'
  )
);

test(
  'should not merge named @layer blocks, because layer order follows the first appearance',
  passthroughCSS('@layer x{.a{color:red}}.b{width:1px}@layer x{.c{height:1px}}')
);

test(
  'should merge equal @supports blocks across a rule with other properties',
  processCSS(
    '@supports (display:grid){.a{color:red}}.b{width:1px}@supports (display:grid){.c{height:1px}}',
    '@supports (display:grid){.a{color:red}.c{height:1px}}.b{width:1px}'
  )
);

test(
  'should merge equal @container blocks across a rule with other properties',
  processCSS(
    '@container (min-width:1px){.a{color:red}}.b{width:1px}@container (min-width:1px){.c{height:1px}}',
    '@container (min-width:1px){.a{color:red}.c{height:1px}}.b{width:1px}'
  )
);

test(
  'should not merge equal @media blocks across an unanalysable at-rule',
  passthroughCSS(
    '@media print{.a{color:red}}@unknown x{.b{width:1px}}@media print{.c{height:1px}}'
  )
);

// An @layer inside the later block keeps the blocks from joining, because
// moving the layer earlier could reorder layers. The rule beside it still
// belongs to an equivalent block, so it moves up and merges as before.
test(
  'should merge a rule into an equal @media block when the later block holds an @layer',
  processCSS(
    '@media print{.a{color:red;width:1px}}@media print{.c{color:red;width:1px}@layer x{.b{top:0}}}',
    '@media print{.a,.c{color:red;width:1px}}@media print{@layer x{.b{top:0}}}'
  )
);

test(
  'should move a rule into an equal @media block when the later block holds an @layer and nothing merges',
  processCSS(
    '@media print{.a{color:red}}@media print{.c{width:1px}@layer x{.b{top:0}}}',
    '@media print{.a{color:red}.c{width:1px}}@media print{@layer x{.b{top:0}}}'
  )
);
