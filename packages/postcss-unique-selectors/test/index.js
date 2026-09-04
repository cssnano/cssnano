import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should deduplicate selectors',
  processCSS('h1,h1,h1,h1{color:red}', 'h1{color:red}')
);

test(
  'should sort selectors',
  processCSS('h1,h10,H2,h7{color:red}', 'H2,h1,h10,h7{color:red}')
);

test(
  'should keep comments in the selector',
  processCSS(
    '.newbackbtn,/*.searchall,*/.calNav{padding:5px;}',
    '/*.searchall,*/.calNav,.newbackbtn{padding:5px;}'
  )
);

test(
  'should keep comments in the selector (2)',
  processCSS(
    '.x/*a*/,/*b*/.y/*c*/,.x,.y{padding:5px;}',
    '.x/*a*/,/*b*/.y/*c*/{padding:5px;}'
  )
);
test(
  'should keep comments in the selector (3)',
  processCSS(
    '.x,.y,/*a*/.x/*b*/,/*c*/.y/*d*/{padding:5px;}',
    '.x/*a*//*b*/,.y/*c*//*d*/{padding:5px;}'
  )
);
test(
  'should keep comments in the selector (4)',
  processCSS(
    ':is(/*a*/.x/*b*/,/*c*/.y/*d*/), :is(.x,.y),{padding:5px;}',
    ':is(/*a*/.x/*b*/,/*c*/.y/*d*/){padding:5px;}'
  )
);

test(
  'should not deduplicate comments that provide selector whitespace',
  processCSS('a/**/b,ab{color:red}', 'a/**/b,ab{color:red}')
);

test(
  'should deduplicate comments next to existing selector whitespace',
  processCSS('a/**/ b,a b{color:red}', 'a/**/ b{color:red}')
);

test(
  'should split only on top-level commas',
  processCSS(
    '.a\\,b, [data-value="a,b"], :is(.c, .d), .a\\,b{color:red}',
    '.a\\,b, :is(.c, .d), [data-value="a,b"]{color:red}'
  )
);

test(
  'should preserve namespaces and escaped spelling',
  processCSS('svg|a,svg\\7c a,svg|a{color:red}', 'svg\\7c a,svg|a{color:red}')
);

test(
  'should preserve malformed selector fragments',
  processCSS(
    'a,,a, :is(.b, .c), :is(.b, .c){color:red}',
    ', :is(.b, .c),a{color:red}'
  )
);

test(
  'should preserve a trailing empty selector fragment',
  processCSS('a,{color:red}', ',a{color:red}')
);

const selectorWithManyComments = '.x' + '/*x*/'.repeat(100);
test(
  'should preserve selectors with many comments',
  processCSS(
    `${selectorWithManyComments},${selectorWithManyComments}{color:red}`,
    `${selectorWithManyComments}${'/*x*/'.repeat(100)}{color:red}`
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
