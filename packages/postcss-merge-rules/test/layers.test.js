import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not merge rules across distinct anonymous @layer at-rules',
  passthroughCSS('@layer{#main.foo{color:red}}@layer{.foo{color:blue}}')
);

test(
  'should not merge rules across distinct anonymous @layer at-rules with comments',
  passthroughCSS(
    '@layer /*! important 1 */ {#main.foo{color:red}}@layer /*! important 2 */ {.foo{color:blue}}'
  )
);

test(
  'should remove a named @layer block that a merge emptied, because an earlier block of the layer fixes its order',
  processCSS('@layer x{.a{top:0}}@layer x{.b{top:0}}', '@layer x{.a,.b{top:0}}')
);

test(
  'should remove a nested named @layer block that a merge emptied',
  processCSS(
    '.r{@layer x{.a{top:0}}@layer x{.b{top:0}}}',
    '.r{@layer x{.a,.b{top:0}}}'
  )
);

test(
  'should remove every later named @layer block that a merge emptied',
  processCSS(
    '@layer x{.a{top:0}}@layer x{.b{top:0}}@layer x{.c{top:0}}',
    '@layer x{.a,.b,.c{top:0}}'
  )
);

test(
  'should keep an @layer block that holds a rule after a merge moved another out',
  processCSS(
    '@layer x{.a{top:0}}@layer x{.b{top:0}.d{color:red}}',
    '@layer x{.a,.b{top:0}.d{color:red}}'
  )
);

test(
  'should remove an emptied @layer block nested in an equal @layer block',
  processCSS(
    '@layer a{@layer x{.p{top:0}}}@layer a{@layer x{.q{top:0}}}',
    '@layer a{@layer x{.p,.q{top:0}}}'
  )
);

test(
  'should remove an emptied @layer block with a dotted name',
  processCSS(
    '@layer a.b{.a{top:0}}@layer a.b{.b{top:0}}',
    '@layer a.b{.a,.b{top:0}}'
  )
);

test(
  'should remove an emptied @layer block whose at-rule name is in upper case',
  processCSS('@LAYER x{.a{top:0}}@LAYER x{.b{top:0}}', '@LAYER x{.a,.b{top:0}}')
);

test(
  'should not merge @layer blocks whose names differ in case, because layer names are compared as written',
  passthroughCSS('@layer x{.a{top:0}}@layer X{.b{top:0}}')
);

test(
  'should remove a named @layer block that a merge emptied by moving out its only @media block',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}}',
    '@layer x{@media print{.c,.d{top:0}}}'
  )
);

test(
  'should remove every nested named @layer block that a merge emptied',
  processCSS(
    '@layer a{@layer x{@media print{.c{top:0}}}}@layer a{@layer x{@media print{.d{top:0}}}}',
    '@layer a{@layer x{@media print{.c,.d{top:0}}}}'
  )
);

test(
  'should keep an ancestor @layer block that still holds another rule after its @media block emptied',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}.e{color:red}}',
    '@layer x{@media print{.c,.d{top:0}}}@layer x{.e{color:red}}'
  )
);

test(
  'should keep an ancestor @layer block that holds a comment after its @media block emptied',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{/*k*/@media print{.d{top:0}}}',
    '@layer x{@media print{.c,.d{top:0}}}@layer x{/*k*/}'
  )
);

test(
  'should keep the order in which @layer x and @layer y are declared, because a rule does not move across another layer',
  passthroughCSS(
    '@layer x{@media print{.c{top:0}}}@layer y{.m{color:red}}@layer x{@media print{.d{top:0}}}'
  )
);

test(
  'should keep an emptied @scope block, because postcss-discard-empty is the one that removes it',
  processCSS(
    '@scope (.a){@media print{.c{top:0}}}@scope (.a){@media print{.d{top:0}}}',
    '@scope (.a){@media print{.c,.d{top:0}}}@scope (.a){}'
  )
);

test(
  'should remove an emptied @layer block when two sibling @media blocks move out of it in turn',
  processCSS(
    '@layer x{@media print{.c{top:0}}}@layer x{@media print{.d{top:0}}@media print{.e{top:0}}}',
    '@layer x{@media print{.c,.d,.e{top:0}}}'
  )
);

test(
  'should keep an @layer block that is empty in the source, because it may be the first statement that orders its layer',
  passthroughCSS('@layer b{}@layer a{.a{top:0}}')
);

test(
  'should keep an @layer block that is empty in the source beside one that a merge emptied',
  processCSS(
    '@layer b{}@layer x{.a{top:0}}@layer x{.b{top:0}}',
    '@layer b{}@layer x{.a,.b{top:0}}'
  )
);

test(
  'should keep an @media block that is empty in the source beside one that a merge emptied',
  processCSS(
    '@media print{}@media screen{.a{top:0}}@media screen{.b{top:0}}',
    '@media print{}@media screen{.a,.b{top:0}}'
  )
);
