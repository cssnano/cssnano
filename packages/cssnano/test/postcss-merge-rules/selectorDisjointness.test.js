import { test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-merge-rules/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// A write to a property by a rule whose selector can never match the moved
// rule's element cannot change the cascade of that element, so it does not
// block the join.

test(
  'should join a media block across a writer of the same property on another element type',
  processCSS(
    '@media print{h1{color:red}}h2{color:blue}@media print{h1{color:green}}',
    '@media print{h1{color:red;color:green}}h2{color:blue}'
  )
);

test(
  'should not join a media block across a writer of the same property on the same element type, even in another case',
  passthroughCSS(
    '@media print{h1{color:red}}H1{color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should join across a writer of a pseudo-element of the moved element type',
  processCSS(
    '@media print{h1{color:red}}h1::before{color:blue}@media print{h1{color:green}}',
    '@media print{h1{color:red;color:green}}h1::before{color:blue}'
  )
);

test(
  'should not join across a descendant writer whose last compound has the moved element type',
  passthroughCSS(
    '@media print{span{color:red}}div span{color:blue}@media print{span{color:green}}'
  )
);

test(
  'should not join across a class writer, since its element type is unknown',
  passthroughCSS(
    '@media print{h1{color:red}}.a{color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should not join across a universal writer, since its element type is unknown',
  passthroughCSS(
    '@media print{h1{color:red}}*{color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should not join across an id writer, since its element type is unknown',
  passthroughCSS(
    '@media print{h1{color:red}}#id{color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should not join across an is() writer, since its element type is a list',
  passthroughCSS(
    '@media print{h1{color:red}}:is(h2){color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should not join across a writer with a namespace prefix on the same element type',
  passthroughCSS(
    '@media print{h1{color:red}}*|h1{color:blue}@media print{h1{color:green}}'
  )
);

test(
  'should not join when a writer that matches the moved element sets an !important declaration',
  passthroughCSS(
    '@media print{h1{color:red}}h1{color:blue!important}@media print{h1{color:green}}'
  )
);

test(
  'should join across a writer of an !important declaration on another element type',
  processCSS(
    '@media print{h1{color:red}}h2{color:blue!important}@media print{h1{color:green}}',
    '@media print{h1{color:red;color:green}}h2{color:blue!important}'
  )
);

test(
  'should not join across an all writer on the moved element type',
  passthroughCSS(
    '@media print{h1{color:red}}h1{all:unset}@media print{h1{color:green}}'
  )
);

test(
  'should join across an all writer on another element type',
  processCSS(
    '@media print{h1{color:red}}h2{all:unset}@media print{h1{color:green}}',
    '@media print{h1{color:red;color:green}}h2{all:unset}'
  )
);

test(
  'should not join across a custom property writer on the moved element type',
  passthroughCSS(
    '@media print{h1{--x:red}}h1{--x:blue}@media print{h1{--x:green}}'
  )
);

test(
  'should join across a custom property writer on another element type',
  processCSS(
    '@media print{h1{--x:red}}h2{--x:blue}@media print{h1{--x:green}}',
    '@media print{h1{--x:red;--x:green}}h2{--x:blue}'
  )
);

test(
  'should join a rule across a writer of the same property on another element type',
  processCSS(
    'h1{color:red}h2{color:blue}h1{color:green}',
    'h1{color:red;color:green}h2{color:blue}'
  )
);

test(
  'should not join a media block across a rule writing the same property to the same element type',
  passthroughCSS(
    '@media print{h1{color:red}}h1{color:blue}@media print{h1{color:green}}'
  )
);
