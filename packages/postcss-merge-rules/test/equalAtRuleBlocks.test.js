import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
  // `.b{top}` cannot move up past `.x{top}`, but `.a{color}` can move down past
  // `.x` into the later block, which keeps `.a` before `.b`.
  'should move an earlier equal @media block down when the rule between sets a property only the earlier block sets',
  processCSS(
    '@media (min-width:640px){.a{color:red}}.x{top:0}@media (min-width:640px){.b{top:2px}}',
    '.x{top:0}@media (min-width:640px){.a{color:red}.b{top:2px}}'
  )
);

test(
  // `.x` sets `color`, which the earlier block sets, and `top`, which the later
  // block sets, so neither block can move past it.
  'should not join equal @media blocks in either direction when the rule between sets a property from each block',
  passthroughCSS(
    '@media (min-width:640px){.a{color:red}}.x{color:blue;top:0}@media (min-width:640px){.b{top:2px}}'
  )
);

test(
  // The @layer inside the earlier block is not modelled, so the block stays put
  // even though nothing between the blocks sets a property the block sets.
  'should not move an equal @media block that holds an @layer down past a rule',
  passthroughCSS(
    '@media print{.a{color:red}@layer x{.y{top:0}}}.x{top:0}@media print{.b{top:2px}}'
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
  'should not join equal @media blocks because one element can match both .foo and .bar, so the blocks keep their order (#111)',
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
