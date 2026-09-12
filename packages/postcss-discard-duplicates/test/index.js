import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove duplicate rules',
  processCSS('h1{font-weight:bold}h1{font-weight:bold}', 'h1{font-weight:bold}')
);

test(
  'should remove duplicate rules (2)',
  processCSS(
    'h1{color:#000}h2{color:#fff}h1{color:#000}',
    'h2{color:#fff}h1{color:#000}'
  )
);

test(
  'should remove duplicate rules (3)',
  processCSS(
    'h1 { font-weight: bold }\nh1{font-weight:bold}',
    'h1{font-weight:bold}'
  )
);

test(
  'should remove duplicate declarations',
  processCSS('h1{font-weight:bold;font-weight:bold}', 'h1{font-weight:bold}')
);

test(
  'should remove duplicate declarations, with comments',
  processCSS(
    'h1{/*test*/font-weight:bold}h1{/*test*/font-weight:bold}',
    'h1{/*test*/font-weight:bold}'
  )
);

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
  'should remove declarations before rules',
  processCSS(
    'h1{font-weight:bold;font-weight:bold}h1{font-weight:bold}',
    'h1{font-weight:bold}'
  )
);

test(
  'should not deduplicate comments',
  passthroughCSS('h1{color:#000}/*test*/h2{color:#fff}/*test*/')
);

test(
  'should not crash on @layer syntax',
  processCSS(
    '@layer ui-components { } @layer ui-components',
    '@layer ui-components { } @layer ui-components'
  )
);

test(
  'should not remove declarations when selectors are different',
  passthroughCSS('h1{font-weight:bold}h2{font-weight:bold}')
);

test(
  'should not remove across contexts',
  passthroughCSS('h1{display:block}@media print{h1{display:block}}')
);

test(
  'should not be responsible for normalising selectors',
  passthroughCSS('h1,h2{font-weight:bold}h2,h1{font-weight:bold}')
);

test(
  'should not be responsible for normalising declarations',
  passthroughCSS('h1{margin:10px 0 10px 0;margin:10px 0}')
);

test(
  'should remove duplicate rules and declarations',
  processCSS(
    'h1{color:#000}h2{color:#fff}h1{color:#000;color:#000}',
    'h2{color:#fff}h1{color:#000}'
  )
);

test(
  'should remove differently ordered duplicates',
  processCSS(
    'h1{color:black;font-size:12px}h1{font-size:12px;color:black}',
    'h1{font-size:12px;color:black}'
  )
);

test(
  'should remove partial duplicates',
  processCSS(
    'h1{color:red;background:blue}h1{color:red}',
    'h1{background:blue}h1{color:red}'
  )
);

test(
  'should preserve browser hacks (1)',
  passthroughCSS('h1{_color:white;color:white}')
);

test(
  'should preserve browser hacks (2)',
  passthroughCSS('@media \0 all {}@media all {}')
);

// csso#471: duplicate content with alt text fallback must be preserved
test(
  'should preserve content property fallbacks with alt text',
  passthroughCSS('h1{content:"⚠";content:"⚠" / "Warning"}')
);

// display: block; display: flex fallback pair must be preserved
test(
  'should preserve display fallback pairs',
  passthroughCSS('h1{display:block;display:flex}')
);

test('should preserve standalone empty rule', passthroughCSS('h1{}'));

test(
  'should remove earlier duplicate empty rule sharing selector',
  processCSS('h1{}h1{}', 'h1{}')
);

test(
  'should remove earlier rule when declaration matches one in a multi-declaration fallback',
  processCSS(
    'h1{display:block}h1{display:block;display:flex}',
    'h1{display:block;display:flex}'
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
  'should deduplicate rules with pseudo-class selectors',
  processCSS('a:hover{color:red}a:hover{color:red}', 'a:hover{color:red}')
);

test(
  'should deduplicate rules with escaped selectors',
  processCSS('.\\:hover{color:red}.\\:hover{color:red}', '.\\:hover{color:red}')
);

test(
  'should deduplicate rules with empty selectors',
  processCSS('{color:red}{color:red}', '{color:red}')
);

test(
  'should deduplicate declarations with empty values',
  processCSS('h1{color:;color:;}', 'h1{color:;}')
);

test(
  'should deduplicate top-level declarations without a rule',
  processCSS('color:red;color:red;', 'color:red;')
);

test(
  'should deduplicate empty at-rules without params or blocks',
  processCSS('@media;@media;', '@media;')
);

test(
  'should deduplicate identical unknown at-rules',
  processCSS('@unknown{color:red}@unknown{color:red}', '@unknown{color:red}')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
