import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
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

// Down joins: the earlier block cannot move up past `.x`'s `top` conflict with
// the later block, but it can move down past `.x`, since `.x` shares no
// property with the earlier block.

test(
  'should move an earlier equal @supports block down when the rule between sets a property only the later block sets',
  processCSS(
    '@supports (display:grid){.a{color:red}}.x{top:0}@supports (display:grid){.b{top:2px}}',
    '.x{top:0}@supports (display:grid){.a{color:red}.b{top:2px}}'
  )
);

test(
  'should move an earlier equal @container block down when the rule between sets a property only the later block sets',
  processCSS(
    '@container (min-width:1px){.a{color:red}}.x{top:0}@container (min-width:1px){.b{top:2px}}',
    '.x{top:0}@container (min-width:1px){.a{color:red}.b{top:2px}}'
  )
);

test(
  // After the first down join the block stands at the second position, so the
  // third block must be compared against writes between that position and its own.
  'should join a chain of three equal @media blocks downward into the last position',
  processCSS(
    '@media print{.a{color:red}}.x{top:0}@media print{.b{top:1px}}.y{height:3px}@media print{.c{height:2px}}',
    '.x{top:0}.y{height:3px}@media print{.a{color:red}.b{top:1px}.c{height:2px}}'
  )
);

test(
  'should join a third equal @media block upward into the block that an earlier down join placed',
  processCSS(
    '@media print{.a{color:red}}.x{top:0}@media print{.b{top:1px}}.y{color:blue}@media print{.c{top:2px}}',
    '.x{top:0}@media print{.a{color:red}.b{top:1px}.c{top:2px}}.y{color:blue}'
  )
);

test(
  // `.x` nests `top`, which the later block sets, and `color`, which the
  // earlier block sets, so neither block can move past it.
  'should not join equal @media blocks when a nested rule between them sets a property from each block',
  passthroughCSS(
    '@media print{.a{color:red}}.x{top:0;.y{color:blue}}@media print{.b{top:2px}}'
  )
);

test(
  'should not join equal @media blocks when a rule inside an at-rule between them sets a conflicting property',
  passthroughCSS(
    '@media print{.a{color:red}}@supports (display:grid){.x{color:blue;top:0}}@media print{.b{top:2px}}'
  )
);

test(
  'should move an earlier equal @media block down when it holds a nested @supports block',
  processCSS(
    '@media print{.a{color:red}@supports (display:grid){.c{width:1px}}}.x{top:0}@media print{.b{top:2px}}',
    '.x{top:0}@media print{.a{color:red}@supports (display:grid){.c{width:1px}}.b{top:2px}}'
  )
);

test(
  'should not move an earlier equal @media block down past a rule that conflicts with its nested @supports block',
  passthroughCSS(
    '@media print{@supports (display:grid){.c{width:1px}}}.x{width:2px;top:0}@media print{.b{top:2px}}'
  )
);

test(
  // The later block takes the earlier block's place, so the comment and
  // indentation that preceded it must stay in front of it. The whitespace
  // before the first rule is incidental and is not asserted.
  'should keep the later block comment and indentation when an equal @media block moves down',
  async () => {
    const { css } = await postcss([plugin]).process(
      '@media print{.a{color:red}}\n.x{top:0}\n  /* later */\n  @media print{.b{top:2px}}',
      { from: undefined }
    );
    assert.ok(
      css.endsWith(
        '.x{top:0}\n  /* later */\n  @media print{.a{color:red}.b{top:2px}}'
      ),
      css
    );
  }
);

test('should produce the same output when equal @media blocks joined downward are processed again', async () => {
  const once = await postcss([plugin]).process(
    '@media print{.a{color:red}}.x{top:0}@media print{.b{top:2px}}',
    { from: undefined }
  );
  const twice = await postcss([plugin]).process(once.css, {
    from: undefined,
  });
  assert.equal(twice.css, once.css);
});
