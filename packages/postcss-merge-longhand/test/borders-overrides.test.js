import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not crash on comments',
  processCSS(
    'h1{\n  border-width:3px;/* 1 */\n  border-style:solid;/* 2 */\n  border-color:red;/* 3 */}',
    'h1{/* 1 *//* 2 */\n  border-color:red;\n  border-style:solid;\n  border-width:3px;/* 3 */}'
  )
);

test(
  'should not convert border: 0 to border-width: 0',
  passthroughCSS('h1{border:none}')
);

test(
  'should not convert border: 0 to border-width: 0 (uppercase)',
  processCSS('h1{BORDER:none}', 'h1{border:none}')
);

test(
  'should not merge border-left values with mixed !important',
  passthroughCSS(
    'h1{border-left-color:red;border-left-width:1px!important;border-left-style:dashed!important}'
  )
);

test(
  'should not merge border-left values with mixed !important (uppercase)',
  passthroughCSS(
    'h1{BORDER-LEFT-COLOR:RED;BORDER-LEFT-WIDTH:1PX!IMPORTANT;BORDER-LEFT-STYLE:DASHED!IMPORTANT}'
  )
);

test(
  'should minimize default border values',
  processCSS('h1{border:medium none currentColor}', 'h1{border:none}')
);

test(
  'should minimize default border values (uppercase)',
  processCSS('h1{BORDER:medium none currentColor}', 'h1{border:none}')
);

test(
  'should optimize border merging for length',
  processCSS(
    'h1{border:1px solid #ddd;border-bottom:1px solid #fff}',
    'h1{border:1px solid;border-color:#ddd #ddd #fff}'
  )
);

test(
  'should optimize border merging for length (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #DDD;BORDER-BOTTOM:1PX SOLID #FFF}',
    'h1{border:1px solid;border-color:#ddd #ddd #fff}'
  )
);

test(
  'should not mangle borders',
  passthroughCSS(
    'hr{display:block;height:1px;border:none;border-top:1px solid #ddd}'
  )
);

test(
  'should not mangle borders (uppercase)',
  processCSS(
    'hr{DISPLAY:BLOCK;HEIGHT:1PX;BORDER:NONE;BORDER-TOP:1PX SOLID #DDD}',
    'hr{DISPLAY:BLOCK;HEIGHT:1PX;border:none;border-top:1px solid #ddd}'
  )
);

test(
  'Should not mangle borders (#579) (1)',
  processCSS(
    'h1{border-bottom:none;border-color:red}',
    'h1{border-bottom:none;border-color:red}'
  )
);

test(
  'Should not mangle borders (#579) (1) (uppercase)',
  passthroughCSS('h1{BORDER-BOTTOM:NONE;BORDER-COLOR:RED}')
);

test(
  'Should not mangle borders (#579) (2)',
  processCSS('h1{border:none;border-color:red}', 'h1{border:red}')
);

test(
  'Should not mangle borders (#579) (2) (uppercase)',
  processCSS('h1{BORDER:NONE;BORDER-COLOR:RED}', 'h1{border:red}')
);

test(
  'should use shorter equivalent rules',
  processCSS(
    'h1{border:5px solid;border-color:#222 transparent transparent}',
    'h1{border:5px solid transparent;border-top-color:#222}'
  )
);

test(
  'should use shorter equivalent rules (uppercase)',
  processCSS(
    'h1{BORDER:5PX SOLID;BORDER-COLOR:#222 TRANSPARENT TRANSPARENT}',
    'h1{border:5px solid transparent;border-top-color:#222}'
  )
);

test(
  'should merge redundant values',
  processCSS(
    'h1{border-width:5px 5px 0;border-bottom-width:0}',
    'h1{border-width:5px 5px 0}'
  )
);

test(
  'should merge redundant values (uppercase)',
  processCSS(
    'h1{BORDER-WIDTH:5PX 5PX 0;BORDER-BOTTOM-WIDTH:0}',
    'h1{border-width:5PX 5PX 0}'
  )
);

test(
  'should merge redundant values (2)',
  processCSS(
    'h1{border-width:5px 5px 0;border-bottom-width:10px}',
    'h1{border-width:5px 5px 10px}'
  )
);

test(
  'should merge redundant values (2) (uppercase)',
  processCSS(
    'h1{BORDER-WIDTH:5PX 5PX 0;BORDER-BOTTOM-WIDTH:10PX}',
    'h1{border-width:5PX 5PX 10PX}'
  )
);

test(
  'should merge redundant values (3)',
  processCSS(
    'h1{border:1px solid #ddd;border-bottom-color:transparent}',
    'h1{border:1px solid;border-color:#ddd #ddd transparent}'
  )
);

test(
  'should merge redundant values (3) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #DDD;BORDER-BOTTOM-COLOR:TRANSPARENT}',
    'h1{border:1px solid;border-color:#ddd #ddd transparent}'
  )
);

test(
  'should merge redundant values (4)',
  processCSS(
    'h1{border:1px solid #ddd;border-bottom-style:dotted}',
    'h1{border:1px #ddd;border-style:solid solid dotted}'
  )
);

test(
  'should merge redundant values (4) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #DDD;BORDER-BOTTOM-STYLE:DOTTED}',
    'h1{border:1px #ddd;border-style:solid solid dotted}'
  )
);

test(
  'should merge redundant values (5)',
  processCSS(
    'h1{border:1px solid #ddd;border-bottom-width:5px}',
    'h1{border:solid #ddd;border-width:1px 1px 5px}'
  )
);

test(
  'should merge redundant values (5) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #DDD;BORDER-BOTTOM-WIDTH:5PX}',
    'h1{border:solid #ddd;border-width:1px 1px 5px}'
  )
);

test(
  'should merge redundant values (6)',
  passthroughCSS(
    'h1{border-width:1px;border-top-width:none;border-left-width:none;border-style:solid;border-color:#000;}'
  )
);

test(
  'should merge redundant values (6) (uppercase)',
  passthroughCSS(
    'h1{BORDER-WIDTH:1PX;BORDER-TOP-WIDTH:NONE;BORDER-LEFT-WIDTH:NONE;BORDER-STYLE:SOLID;BORDER-COLOR:#000;}'
  )
);

test(
  'Should not merge redundant values if declarations are of different importance (#618)',
  passthroughCSS(
    'h1{border:1px solid #3060b1;border-bottom:1px solid #3060b1 !important}'
  )
);

test(
  'Should not merge redundant values if declarations are of different importance (#618) (uppercase)',
  passthroughCSS(
    'h1{BORDER:1PX SOLID #3060B1;BORDER-BOTTOM:1PX SOLID #3060B1 !IMPORTANT}'
  )
);

test(
  'should merge redundant border-spacing values',
  processCSS('h1{border-spacing:10px 10px;}', 'h1{border-spacing:10px;}')
);

test(
  'should merge redundant border-spacing values (uppercase)',
  processCSS('h1{BORDER-SPACING:10px 10px;}', 'h1{BORDER-SPACING:10px;}')
);

test(
  'should not merge different border-spacing values',
  passthroughCSS('h1{border-spacing:10px 50px;}')
);

test(
  'should not merge different border-spacing values (uppercase)',
  passthroughCSS('h1{BORDER-SPACING:10px 50px;}')
);

test(
  'should merge border and border-width values',
  processCSS(
    'h1{border:0 solid rgba(0, 0, 0, 0.2);border-width:1px;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
  )
);

test(
  'should merge border and border-width values (uppercase)',
  processCSS(
    'h1{BORDER:0 SOLID RGBA(0, 0, 0, 0.2);BORDER-WIDTH:1PX;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
  )
);

test(
  'should merge border and multiple border-*-width values',
  processCSS(
    'h1{border:0 solid rgba(0, 0, 0, 0.2);border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
  )
);

test(
  'should merge border and multiple border-*-width values (uppercase)',
  processCSS(
    'h1{BORDER:0 SOLID RGBA(0, 0, 0, 0.2);BORDER-TOP-WIDTH:1PX;BORDER-RIGHT-WIDTH:1PX;BORDER-BOTTOM-WIDTH:1PX;BORDER-LEFT-WIDTH:1PX;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
  )
);

test(
  'should produce the minimum css necessary',
  passthroughCSS('h1{border-width:none;border-top:1px solid #e1e1e1}')
);
