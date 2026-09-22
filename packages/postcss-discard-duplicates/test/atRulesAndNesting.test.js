import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove duplicate @rules',
  processCSS('@charset "utf-8";@charset "utf-8";', '@charset "utf-8";')
);

test(
  'should remove duplicate @rules (2)',
  processCSS(
    '@charset "utf-8";@charset "hello!";@charset "utf-8";',
    '@charset "hello!";@charset "utf-8";'
  )
);

test(
  'should remove duplicates inside @media queries',
  processCSS(
    '@media print{h1{display:block}h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should remove duplicate @media queries',
  processCSS(
    '@media print{h1{display:block}}@media print{h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should not mangle same keyframe rules but with different vendors',
  passthroughCSS(
    '@-webkit-keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}@keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}'
  )
);

test(
  'should not merge across keyframes',
  passthroughCSS(
    '@-webkit-keyframes test{0%{color:#000}to{color:#fff}}@keyframes test{0%{color:#000}to{color:#fff}}'
  )
);

test(
  'should not merge across keyframes (2)',
  passthroughCSS(
    '@-webkit-keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}'
  )
);

test(
  'should not crash on @layer syntax',
  processCSS(
    '@layer ui-components { } @layer ui-components',
    '@layer ui-components { } @layer ui-components'
  )
);

test(
  'should deduplicate duplicate declarations within @page rule',
  processCSS('@page{margin:1cm;margin:1cm}', '@page{margin:1cm}')
);

test(
  'should deduplicate declarations and nested rules within a parent rule',
  processCSS(
    '.card{color:red;color:red;.header{font-size:14px;font-size:14px;}}',
    '.card{color:red;.header{font-size:14px;}}'
  )
);

test(
  'should deduplicate at-rules whose inner rules contain duplicate declarations',
  processCSS(
    '@media print{h1{color:red;color:red}}@media print{h1{color:red}}',
    '@media print{h1{color:red}}'
  )
);

test(
  'should deduplicate empty at-rules without params or blocks',
  processCSS('@media;@media;', '@media;')
);

test(
  'should deduplicate identical unknown at-rules',
  processCSS('@unknown{color:red}@unknown{color:red}', '@unknown{color:red}')
);

test(
  'should retain earlier rule sharing selector when declarations are deduplicated but nested containers remain',
  processCSS(
    '.card{color:red;.inner{color:blue}}.card{color:red}',
    '.card{.inner{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate duplicate nested rules within a parent rule',
  processCSS(
    '.card{.header{color:red}.header{color:red}}',
    '.card{.header{color:red}}'
  )
);

test(
  'should retain earlier rule sharing selector when declarations are deduplicated but nested at-rules remain',
  processCSS(
    '.card{color:red;@media print{color:blue}}.card{color:red}',
    '.card{@media print{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate duplicate nested at-rules within a parent rule',
  processCSS(
    '.card{@media print{color:red}@media print{color:red}}',
    '.card{@media print{color:red}}'
  )
);

test(
  'should deduplicate duplicate nested rules across multiple nesting levels within a parent rule',
  processCSS(
    '.card{.inner{.leaf{color:red}.leaf{color:red}}}',
    '.card{.inner{.leaf{color:red}}}'
  )
);

test(
  'should retain earlier rule sharing selector with comments and nested containers after declarations are deduplicated',
  processCSS(
    '.card{/*note*/color:red;.inner{color:blue}}.card{color:red}',
    '.card{/*note*/.inner{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate declarations surrounding a nested rule',
  processCSS(
    '.card{color:red;.inner{color:blue}color:red}',
    '.card{.inner{color:blue}color:red}'
  )
);

test(
  'should deduplicate duplicate empty nested rules within a container',
  processCSS('.card{.inner{}.inner{}}', '.card{.inner{}}')
);

test(
  'should deduplicate duplicate declarations within nested rules inside an at-rule',
  processCSS(
    '.card{@media print{.inner{color:red;color:red}}}',
    '.card{@media print{.inner{color:red}}}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
