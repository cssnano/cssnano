import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
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
  'should preserve standalone rule containing only comments',
  passthroughCSS('h1{/*comment*/}')
);

test(
  'should remove earlier rule sharing selector when it contains only comments',
  processCSS('h1{/*comment*/}h1{color:red}', 'h1{color:red}')
);

test(
  'should remove earlier rule sharing selector when all declarations are deduplicated even if comments remain',
  processCSS('h1{/*comment*/color:red}h1{color:red}', 'h1{color:red}')
);
