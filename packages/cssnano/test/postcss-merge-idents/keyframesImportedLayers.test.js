import { test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-merge-idents/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not merge names defined in different layers when an @import can reorder those layers',
  passthroughCSS(
    [
      '@import url(x.css) layer(L3);',
      '@layer L1{@keyframes a{0%{top:0}}@keyframes b{0%{top:0}}}',
      '@layer L2{@keyframes a{0%{top:1px}}}',
      '@layer L3{@keyframes b{0%{top:1px}}}',
      'div{animation:a 1s}p{animation:b 1s}',
    ].join('')
  )
);

test(
  'should not remove a repeat definition in another layer when an @import can reorder the layers',
  passthroughCSS(
    [
      '@import url(x.css) layer(L2);@import url(y.css) layer(L3);',
      '@layer L1{@keyframes a{0%{top:0}}}',
      '@layer L2{@keyframes a{0%{top:0}}}',
      '@media print{@layer L3{@keyframes a{0%{top:1px}}}}',
      'div{animation:a 1s}',
    ].join('')
  )
);

test(
  'should remove a repeat definition in the same layer when an @import can reorder the layers',
  processCSS(
    '@import url(x.css);@layer L1{@keyframes a{0%{top:0}}}@layer L1{@keyframes a{0%{top:0}}}div{animation:a 1s}',
    '@import url(x.css);@layer L1{}@layer L1{@keyframes a{0%{top:0}}}div{animation:a 1s}'
  )
);
