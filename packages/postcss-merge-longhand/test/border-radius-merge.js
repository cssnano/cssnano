import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge 4 identical corner longhands into a 1-value shorthand',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should merge 4 corner longhands with 2-value diagonal symmetry',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:10px;border-bottom-left-radius:20px}',
    'a{border-radius:10px 20px}'
  )
);

test(
  'should merge 4 corner longhands with 3-value symmetry',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:30px;border-bottom-left-radius:20px}',
    'a{border-radius:10px 20px 30px}'
  )
);

test(
  'should merge 4 distinct corner longhands into a 4-value shorthand',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:30px;border-bottom-left-radius:40px}',
    'a{border-radius:10px 20px 30px 40px}'
  )
);

test(
  'should merge two-value corner longhands into a slash-separated shorthand',
  processCSS(
    'a{border-top-left-radius:10px 20px;border-top-right-radius:10px 20px;border-bottom-right-radius:10px 20px;border-bottom-left-radius:10px 20px}',
    'a{border-radius:10px/20px}'
  )
);

test(
  'should merge mixed two-value corner longhands with independent axis compression',
  processCSS(
    'a{border-top-left-radius:10px 5px;border-top-right-radius:20px 5px;border-bottom-right-radius:10px 5px;border-bottom-left-radius:20px 5px}',
    'a{border-radius:10px 20px/5px}'
  )
);

test(
  'should omit slash when horizontal and vertical vectors are equal',
  processCSS(
    'a{border-top-left-radius:10px 10px;border-top-right-radius:10px 10px;border-bottom-right-radius:10px 10px;border-bottom-left-radius:10px 10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should merge unitless zero lengths',
  processCSS(
    'a{border-top-left-radius:0;border-top-right-radius:0;border-bottom-right-radius:0;border-bottom-left-radius:0}',
    'a{border-radius:0}'
  )
);

test(
  'should merge percentage values',
  processCSS(
    'a{border-top-left-radius:50%;border-top-right-radius:50%;border-bottom-right-radius:50%;border-bottom-left-radius:50%}',
    'a{border-radius:50%}'
  )
);

test(
  'should merge corner longhands in !important lane',
  processCSS(
    'a{border-top-left-radius:10px!important;border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;border-bottom-left-radius:10px!important}',
    'a{border-radius:10px!important}'
  )
);

test(
  'should preserve mixed importance lanes',
  passthroughCSS(
    'a{border-top-left-radius:10px!important;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should merge longhands across interleaved unrelated properties',
  processCSS(
    'a{border-top-left-radius:10px;color:red;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{color:red;border-radius:10px}'
  )
);

test(
  'should optimize both physical borders and border-radius within the same rule',
  processCSS(
    'a{border:none;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{border:1px solid red;border-radius:10px}'
  )
);

test(
  'should normalize standalone 4-value shorthand to 1-value',
  processCSS('a{border-radius:10px 10px 10px 10px}', 'a{border-radius:10px}')
);

test(
  'should normalize standalone slash shorthand when axes match',
  processCSS(
    'a{border-radius:10px 10px 10px 10px / 10px 10px 10px 10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should normalize standalone slash shorthand without spaces around slash',
  processCSS('a{border-radius:10px 10px/10px 10px}', 'a{border-radius:10px}')
);

test(
  'should keep distinct axes when normalizing standalone slash shorthand',
  processCSS(
    'a{border-radius:10px 10px 10px 10px / 20px 20px 20px 20px}',
    'a{border-radius:10px/20px}'
  )
);

test(
  'should normalize a standalone corner longhand with identical horizontal and vertical values',
  processCSS(
    'a{border-top-left-radius:10px 10px}',
    'a{border-top-left-radius:10px}'
  )
);

test(
  'should preserve a standalone corner longhand with differing horizontal and vertical values',
  passthroughCSS('a{border-top-left-radius:10px 20px}')
);

test(
  'should replace existing shorthand when all 4 corners are redefined after it',
  processCSS(
    'a{border-radius:5px;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should merge uppercase property names',
  processCSS(
    'a{BORDER-TOP-LEFT-RADIUS:10px;BORDER-TOP-RIGHT-RADIUS:10px;BORDER-BOTTOM-RIGHT-RADIUS:10px;BORDER-BOTTOM-LEFT-RADIUS:10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should merge mixed-case property names',
  processCSS(
    'a{Border-Top-Left-Radius:10px;Border-Top-Right-Radius:10px;Border-Bottom-Right-Radius:10px;Border-Bottom-Left-Radius:10px}',
    'a{border-radius:10px}'
  )
);

test(
  'should parse and preserve 3-value shorthand',
  passthroughCSS('a{border-radius:10px 20px 30px}')
);

test(
  'should parse and minify 3-value shorthand with slash',
  processCSS(
    'a{border-radius:10px 20px 30px / 5px}',
    'a{border-radius:10px 20px 30px/5px}'
  )
);

test(
  'should eliminate earlier dead-store corner declaration before coalescing into shorthand',
  processCSS(
    'a{border-top-left-radius:5px;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{border-radius:10px}'
  )
);
