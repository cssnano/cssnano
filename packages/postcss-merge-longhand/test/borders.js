'use strict';
const { test } = require('uvu');
const trbl = require('../src/lib/trbl.js');
const { processCSSFactory } = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

const wsc = [
  {
    property: 'width',
    fixture: '1px',
  },
  {
    property: 'style',
    fixture: 'solid',
  },
  {
    property: 'color',
    fixture: 'red',
  },
];

wsc.forEach(({ property, fixture }) => {
  test(
    `should merge to form a border-trbl-${property} definition`,
    processCSS(
      [
        `h1{`,
        `border-${trbl[0]}-${property}:${fixture};`,
        `border-${trbl[1]}-${property}:${fixture};`,
        `border-${trbl[2]}-${property}:${fixture};`,
        `border-${trbl[3]}-${property}:${fixture}`,
        `}`,
      ].join(''),
      `h1{border-${property}:${fixture}}`
    )
  );

  test(
    `should merge to form a BORDER-TRBL-${property.toUpperCase()} definition`,
    processCSS(
      [
        `h1{`,
        `BORDER-${trbl[0].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${trbl[1].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${trbl[2].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${trbl[3].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()}`,
        `}`,
      ].join(''),
      `h1{border-${property}:${fixture.toUpperCase()}}`
    )
  );
});

trbl.forEach((direction) => {
  const value = wsc.reduce((list, { fixture }) => [...list, fixture], []);

  test(
    `should merge to form a border-${direction} definition`,
    processCSS(
      [
        `h1{`,
        `border-${direction}-width:${value[0]};`,
        `border-${direction}-style:${value[1]};`,
        `border-${direction}-color:${value[2]}`,
        `}`,
      ].join(''),
      `h1{border-${direction}:${value[0]} ${value[1]} ${value[2]}}`
    )
  );

  test(
    `should merge to form a border-${direction.toUpperCase()} definition`,
    processCSS(
      [
        `h1{`,
        `BORDER-${direction.toUpperCase()}-WIDTH:${value[0].toUpperCase()};`,
        `BORDER-${direction.toUpperCase()}-STYLE:${value[1].toUpperCase()};`,
        `BORDER-${direction.toUpperCase()}-COLOR:${value[2].toUpperCase()}`,
        `}`,
      ].join(''),
      `h1{border-${direction}:${value[0]} ${value[1]} ${value[2]}}`
    )
  );
});

test(
  'should merge identical border values',
  processCSS(
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black}',
    'h1{border:1px solid black}'
  )
);

test(
  'should merge identical border values (uppercase)',
  processCSS(
    'h1{BORDER-TOP:1px solid black;BORDER-BOTTOM:1px solid black;BORDER-LEFT:1px solid black;BORDER-RIGHT:1px solid black}',
    'h1{border:1px solid black}'
  )
);

test(
  'should merge identical border values with !important',
  processCSS(
    'h1{border-top:1px solid black!important;border-bottom:1px solid black!important;border-left:1px solid black!important;border-right:1px solid black!important}',
    'h1{border:1px solid black!important}'
  )
);

test(
  'should merge identical border values with !important (uppercase)',
  processCSS(
    'h1{BORDER-TOP:1px solid black!important;BORDER-BOTTOM:1px solid black!important;BORDER-LEFT:1px solid black!important;BORDER-RIGHT:1px solid black!important}',
    'h1{border:1px solid black!important}'
  )
);

test(
  'should merge identical border values with !important 1 (uppercase)',
  processCSS(
    'h1{border-top:1px solid black!IMPORTANT;border-bottom:1px solid black!IMPORTANT;border-left:1px solid black!IMPORTANT;border-right:1px solid black!IMPORTANT}',
    'h1{border:1px solid black!IMPORTANT}'
  )
);

test(
  'should not merge identical border values with mixed !important',
  passthroughCSS(
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black!important;border-right:1px solid black!important}'
  )
);

test(
  'should merge border values',
  processCSS(
    'h1{border-color:red;border-width:1px;border-style:dashed}',
    'h1{border:1px dashed red}'
  )
);

test(
  'should merge border values (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX;BORDER-STYLE:DASHED}',
    'h1{border:1px dashed red}'
  )
);

test(
  'should merge border values with !important',
  processCSS(
    'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    'h1{border:1px dashed red!important}'
  )
);

test(
  'should merge border values with !important (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED!IMPORTANT;BORDER-WIDTH:1PX!IMPORTANT;BORDER-STYLE:DASHED!IMPORTANT}',
    'h1{border:1px dashed red!IMPORTANT}'
  )
);

test(
  'should merge border values with identical values for all sides',
  processCSS(
    'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border:1px solid red}'
  )
);

test(
  'should merge border values with identical values for all sides (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED RED RED RED;BORDER-WIDTH:1PX 1PX 1PX 1PX;BORDER-STYLE:SOLID SOLID SOLID SOLID}',
    'h1{border:1px solid red}'
  )
);

test(
  'should merge border value shorthands',
  processCSS(
    'h1{border-color:red blue red blue;border-style:solid;border-width:10px 20px 10px 20px}',
    'h1{border-color:red blue;border-style:solid;border-width:10px 20px}'
  )
);

test(
  'should merge border value shorthands (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED BLUE RED BLUE;BORDER-STYLE:SOLID;BORDER-WIDTH:10PX 20PX 10PX 20PX}',
    'h1{border-color:red blue;border-style:solid;border-width:10px 20px}'
  )
);

test(
  'should not merge border values with mixed !important',
  passthroughCSS(
    'h1{border-color:red;border-width:1px!important;border-style:dashed!important}'
  )
);

test(
  'should not merge border values with mixed !important (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX!IMPORTANT;BORDER-STYLE:DASHED!IMPORTANT}',
    'h1{border-color:RED;border-width:1PX!IMPORTANT;border-style:DASHED!IMPORTANT}'
  )
);

test(
  'should not merge border values with more than 3 values',
  passthroughCSS(
    'h1{border-color:red;border-style:dashed;border-width:1px 5px}'
  )
);

test(
  'should not merge border values with more than 3 values (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED;BORDER-STYLE:DASHED;BORDER-WIDTH:1PX 5PX}',
    'h1{border-color:red;border-style:dashed;border-width:1px 5px}'
  )
);

test(
  'should not merge rules with the inherit keyword',
  processCSS(
    'h1{border-width:3px;border-style:solid;border-color:inherit}',
    'h1{border:3px solid;border-color:inherit}'
  )
);

test(
  'should not merge rules with the inherit keyword (uppercase)',
  processCSS(
    'h1{BORDER-WIDTH:3PX;BORDER-STYLE:SOLID;BORDER-COLOR:INHERIT}',
    'h1{border:3px solid;BORDER-COLOR:INHERIT}'
  )
);

test(
  'should not crash on comments',
  processCSS(
    'h1{\n  border-width:3px;/* 1 */\n  border-style:solid;/* 2 */\n  border-color:red;/* 3 */}',
    'h1{/* 1 *//* 2 */\n  border:3px solid red;/* 3 */}'
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
  processCSS(
    'h1{BORDER-BOTTOM:NONE;BORDER-COLOR:RED}',
    'h1{border-bottom:none;border-color:red}'
  )
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
  processCSS(
    'h1{border-width:1px;border-top-width:none;border-left-width:none;border-style:solid;border-color:#000;}',
    'h1{border-color:#000;border-style:solid;border-width:0 1px 1px 0;}'
  )
);

test(
  'should merge redundant values (6) (uppercase)',
  processCSS(
    'h1{BORDER-WIDTH:1PX;BORDER-TOP-WIDTH:NONE;BORDER-LEFT-WIDTH:NONE;BORDER-STYLE:SOLID;BORDER-COLOR:#000;}',
    'h1{border-color:#000;border-style:solid;border-width:0 1px 1px 0;}'
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
  processCSS(
    'h1{BORDER:1PX SOLID #3060B1;BORDER-BOTTOM:1PX SOLID #3060B1 !IMPORTANT}',
    'h1{border:1px solid #3060b1;border-bottom:1px solid #3060b1 !IMPORTANT}'
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

test(
  'should produce the minimum css necessary (uppercase)',
  processCSS(
    'h1{BORDER-WIDTH:NONE;BORDER-TOP:1PX SOLID #E1E1E1}',
    'h1{border-width:NONE;border-top:1px solid #e1e1e1}'
  )
);

test(
  'should produce the minimum css necessary (2)',
  processCSS(
    'h1{border-color:rgba(0,0,0,.2);border-right-style:solid;border-right-width:1px}',
    'h1{border-right:1px solid;border-color:rgba(0,0,0,.2)}'
  )
);

test(
  'should produce the minimum css necessary (2) (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RGBA(0,0,0,.2);BORDER-RIGHT-STYLE:SOLID;BORDER-RIGHT-WIDTH:1PX}',
    'h1{border-right:1px solid;border-color:RGBA(0,0,0,.2)}'
  )
);

test(
  'should produce the minimum css necessary (3)',
  processCSS(
    'h1{border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}',
    'h1{border-color:transparent;border-style:solid;border-width:0 4em 4em 0;border-right-color:inherit}'
  )
);

test(
  'should produce the minimum css necessary (3) (uppercase)',
  processCSS(
    'h1{BORDER-TOP:0 SOLID TRANSPARENT;BORDER-RIGHT:4EM SOLID TRANSPARENT;BORDER-BOTTOM:4EM SOLID TRANSPARENT;BORDER-LEFT:0 SOLID TRANSPARENT;BORDER-RIGHT-COLOR:INHERIT}',
    'h1{border-color:transparent;border-style:solid;border-width:0 4em 4em 0;BORDER-RIGHT-COLOR:INHERIT}'
  )
);

test(
  'should produce the minimum css necessary (4)',
  processCSS(
    'h1{border:none;border-top:1px solid #d4d4d5;border-right:1px solid #d4d4d5}',
    'h1{border:1px solid #d4d4d5;border-bottom:none;border-left:none}'
  )
);

test(
  'should produce the minimum css necessary (4) (uppercase)',
  processCSS(
    'h1{BORDER:NONE;BORDER-TOP:1PX SOLID #D4D4D5;BORDER-RIGHT:1PX SOLID #D4D4D5}',
    'h1{border:1px solid #d4d4d5;border-bottom:none;border-left:none}'
  )
);

test(
  'should produce the minimum css necessary (5)',
  processCSS(
    'h1{border-spacing:50px 50px;border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}',
    'h1{border-spacing:50px;border-color:transparent;border-style:solid;border-width:0 4em 4em 0;border-right-color:inherit}'
  )
);

test(
  'should produce the minimum css necessary (5) (uppercase)',
  processCSS(
    'h1{BORDER-SPACING:50PX 50PX;BORDER-TOP:0 SOLID TRANSPARENT;BORDER-RIGHT:4EM SOLID TRANSPARENT;BORDER-BOTTOM:4EM SOLID TRANSPARENT;BORDER-LEFT:0 SOLID TRANSPARENT;BORDER-RIGHT-COLOR:INHERIT}',
    'h1{BORDER-SPACING:50PX;border-color:transparent;border-style:solid;border-width:0 4em 4em 0;BORDER-RIGHT-COLOR:INHERIT}'
  )
);

test(
  'should produce the minimum css necessary (6)',
  processCSS(
    'h1{border:1px solid #00d1b2;border-right:none;border-top:none}',
    'h1{border:1px solid #00d1b2;border-top:none;border-right:none}'
  )
);

test(
  'should produce the minimum css necessary (6) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #00D1B2;BORDER-RIGHT:NONE;BORDER-TOP:NONE}',
    'h1{border:1px solid #00d1b2;border-top:none;border-right:none}'
  )
);

test(
  'should produce the minimum css necessary (7)',
  processCSS(
    'h1{border-top:none;border-right:none;border-bottom:1px solid #cacaca;border-left:none}',
    'h1{border:none;border-bottom:1px solid #cacaca}'
  )
);

test(
  'should produce the minimum css necessary (7) (uppercase)',
  processCSS(
    'h1{BORDER-TOP:NONE;BORDER-RIGHT:NONE;BORDER-BOTTOM:1PX SOLID #CACACA;BORDER-LEFT:NONE}',
    'h1{border:none;border-bottom:1px solid #cacaca}'
  )
);

test(
  'should produce the minimum css necessary (8)',
  processCSS(
    'h1{border-top:none;border-right:none;border-bottom:none;border-left:5px}',
    'h1{border:none;border-left:5px}'
  )
);

test(
  'should produce the minimum css necessary (8) (uppercase)',
  processCSS(
    'h1{BORDER-TOP:NONE;BORDER-RIGHT:NONE;BORDER-BOTTOM:NONE;BORDER-LEFT:5PX}',
    'h1{border:none;border-left:5PX}'
  )
);

test(
  'should produce the minimum css necessary (9)',
  processCSS(
    'h1{border:medium none;border-style:solid;border-color:rgba(34, 36, 38, 0.15);border-width:0px 1px 1px 0px}',
    'h1{border:solid rgba(34, 36, 38, 0.15);border-width:0px 1px 1px 0px}'
  )
);

test(
  'should produce the minimum css necessary (9) (uppercase)',
  processCSS(
    'h1{BORDER:MEDIUM NONE;BORDER-STYLE:SOLID;BORDER-COLOR:RGBA(34, 36, 38, 0.15);BORDER-WIDTH:0PX 1PX 1PX 0PX}',
    'h1{border:solid rgba(34, 36, 38, 0.15);border-width:0px 1px 1px 0px}'
  )
);

test(
  'should produce the minimum css necessary (10)',
  processCSS(
    'h1{border-bottom:none;border-left:1px solid transparent;border-right:1px solid transparent;border-top:2px solid transparent}',
    'h1{border:1px solid transparent;border-top:2px solid transparent;border-bottom:none}'
  )
);

test(
  'should produce the minimum css necessary (10) (uppercase)',
  processCSS(
    'h1{BORDER-BOTTOM:NONE;BORDER-LEFT:1PX SOLID TRANSPARENT;BORDER-RIGHT:1PX SOLID TRANSPARENT;BORDER-TOP:2PX SOLID TRANSPARENT}',
    'h1{border:1px solid transparent;border-top:2px solid transparent;border-bottom:none}'
  )
);

test(
  'should not merge declarations with hacks',
  processCSS(
    'h1{border-color:red red red red;_border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border-color:red;_border-width:1px 1px 1px 1px;border-style:solid}'
  )
);

test(
  'should not merge declarations with hacks (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED RED RED RED;_BORDER-WIDTH:1PX 1PX 1PX 1PX;BORDER-STYLE:SOLID SOLID SOLID SOLID}',
    'h1{border-color:RED;_BORDER-WIDTH:1PX 1PX 1PX 1PX;border-style:SOLID}'
  )
);

test(
  'should not merge fallback colours',
  passthroughCSS('h1{border-color:#ddd;border-color:rgba(0,0,0,.15)}')
);

test(
  'should not merge fallback colours (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:#DDD;BORDER-COLOR:RGBA(0,0,0,.15)}',
    'h1{border-color:#DDD;border-color:RGBA(0,0,0,.15)}'
  )
);

test(
  'should not merge fallback colours with color function',
  passthroughCSS(
    'h1{ border-color:rgb(37,45,49);border-color:color(display-p3 0.1451 0.1765 0.1922 / 1)}'
  )
);
test(
  'should not merge fallback colours with shorthand property',
  processCSS(
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}',
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}'
  )
);

test(
  'should not merge fallback colours with shorthand property (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #CCC;BORDER:1PX SOLID RGBA(0,0,0,.2)}',
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}'
  )
);

test(
  'should merge together all initial values',
  processCSS(
    'h1{border-color:initial;border-width:initial;border-style:initial}',
    'h1{border:initial}'
  )
);

test(
  'should merge together all initial values (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:initial;BORDER-WIDTH:initial;BORDER-STYLE:initial}',
    'h1{border:initial}'
  )
);

test(
  'should merge together all initial values 1 (uppercase)',
  processCSS(
    'h1{border-color:INITIAL;border-width:INITIAL;border-style:INITIAL}',
    'h1{border:INITIAL}'
  )
);

test(
  'should merge together all inherit values',
  processCSS(
    'h1{border-color:inherit;border-width:inherit;border-style:inherit}',
    'h1{border:inherit}'
  )
);

test(
  'should merge together all inherit values (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:INHERIT;BORDER-WIDTH:INHERIT;BORDER-STYLE:INHERIT}',
    'h1{border:INHERIT}'
  )
);

test(
  'should preserve nesting level',
  processCSS(
    'section{h1{border-color:red;border-width:1px;border-style:solid}}',
    'section{h1{border:1px solid red}}'
  )
);

test(
  'should preserve nesting level (uppercase)',
  processCSS(
    'section{h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX;BORDER-STYLE:SOLID}}',
    'section{h1{border:1px solid red}}'
  )
);

test(
  'should not merge custom properties',
  passthroughCSS(
    ':root{--my-border-width:2px;--my-border-style:solid;--my-border-color:#fff;}'
  )
);

test(
  'should not merge custom properties (uppercase)',
  passthroughCSS(
    ':root{--MY-BORDER-WIDTH:2PX;--MY-BORDER-STYLE:SOLID;--MY-BORDER-COLOR:#FFF;}'
  )
);

test(
  'should not merge custom properties with variables',
  passthroughCSS(
    ':root{--my-border-width:var(--my-border-width);--my-border-style:var(--my-border-style);--my-border-color:var(--my-border-color);}'
  )
);

test(
  'should not merge custom properties with variables (uppercase)',
  passthroughCSS(
    ':root{--MY-BORDER-WIDTH:VAR(--MY-BORDER-WIDTH);--MY-BORDER-STYLE:VAR(--MY-BORDER-STYLE);--MY-BORDER-COLOR:VAR(--MY-BORDER-COLOR);}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks',
  processCSS(
    'h1{border-top-width:10px;border-right-width:var(--variable);border-right-width:15px;border-bottom-width:var(--variable);border-bottom-width:20px;border-left-width:25px;border-top-width:var(--variable);border-left-width:var(--variable)}',
    'h1{border-width:10px 15px 20px 25px;border-top-width:var(--variable);border-left-width:var(--variable)}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks (uppercase)',
  processCSS(
    'h1{BORDER-TOP-WIDTH:10PX;BORDER-RIGHT-WIDTH:VAR(--VARIABLE);BORDER-RIGHT-WIDTH:15PX;BORDER-BOTTOM-WIDTH:VAR(--VARIABLE);BORDER-BOTTOM-WIDTH:20PX;BORDER-LEFT-WIDTH:25PX;BORDER-TOP-WIDTH:VAR(--VARIABLE);BORDER-LEFT-WIDTH:VAR(--VARIABLE)}',
    'h1{border-width:10PX 15PX 20PX 25PX;BORDER-TOP-WIDTH:VAR(--VARIABLE);BORDER-LEFT-WIDTH:VAR(--VARIABLE)}'
  )
);

test(
  'save fallbacks should border-style',
  processCSS(
    'h1{border-style:dotted;border-style:var(--variable)}',
    'h1{border-style:dotted;border-style:var(--variable)}'
  )
);

test(
  'save fallbacks should border-color (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:DOTTED;BORDER-COLOR:VAR(--VARIABLE)}',
    'h1{border-color:DOTTED;border-color:VAR(--VARIABLE)}'
  )
);

test(
  'should not explode border with custom properties',
  passthroughCSS('h1{border:var(--variable)}')
);

test(
  'should not explode border with custom properties (uppercase)',
  passthroughCSS('h1{border:VAR(--VARIABLE)}')
);

test(
  'should not explode border with initial properties',
  passthroughCSS('h1{border:initial}')
);

test(
  'should not explode border with initial properties (uppercase)',
  passthroughCSS('h1{BORDER:initial}')
);

test(
  'should not explode border with initial properties 1 (uppercase)',
  passthroughCSS('h1{border:INITIAL}')
);

test(
  'should not explode border with inherit properties',
  passthroughCSS('h1{border:inherit}')
);

test(
  'should not explode border with inherit properties (uppercase)',
  passthroughCSS('h1{BORDER:inherit}')
);

test(
  'should not explode border with inherit properties 1 (uppercase)',
  passthroughCSS('h1{border:INHERIT}')
);

test(
  'should not explode border with unset properties',
  passthroughCSS('h1{border:unset}')
);

test(
  'should not explode border with unset properties (uppercase)',
  passthroughCSS('h1{BORDER:unset}')
);

test(
  'should not explode border with unset properties 1 (uppercase)',
  passthroughCSS('h1{border:UNSET}')
);

test(
  'should not explode border with revert properties (uppercase)',
  passthroughCSS('h1{BORDER:revert}')
);

trbl.forEach((direction) => {
  test(
    `should not explode border-${direction} with custom properties`,
    passthroughCSS(`h1{border-${direction}:var(--variable)}`)
  );

  test(
    `should not explode border-${direction.toUpperCase()} with custom properties`,
    passthroughCSS(`h1{BORDER-${direction.toUpperCase()}:VAR(--variable)}`)
  );
});

test(
  'should not explode custom properties with less than two concrete sides (1)',
  passthroughCSS(
    'h1{border:var(--border-width) var(--border-style) transparent}'
  )
);

test(
  'should not explode custom properties with less than two concrete sides (1) (uppercase)',
  passthroughCSS(
    'h1{BORDER:VAR(--BORDER-WIDTH) VAR(--BORDER-STYLE) TRANSPARENT}'
  )
);

test(
  'should not explode custom properties with less than two concrete sides (2)',
  passthroughCSS('h1{border:var(--border-width) solid var(--border-color)}')
);

test(
  'should not explode custom properties with less than two concrete sides (2) (uppercase)',
  passthroughCSS('h1{BORDER:VAR(--BORDER-WIDTH) SOLID VAR(--BORDER-COLOR)}')
);

test(
  'should not explode custom properties with less than two concrete sides (3)',
  passthroughCSS('h1{border:1px var(--border-style) var(--border-color)}')
);

test(
  'should not explode custom properties with less than two concrete sides (3) (uppercase)',
  passthroughCSS('h1{BORDER:1PX VAR(--BORDER-STYLE) VAR(--BORDER-COLOR)}')
);

test(
  'Should correctly merge border declarations (#551) (1)',
  processCSS(
    'h1{border:1px solid black;border-top-width:2px;border-right-width:2px;border-bottom-width:2px}',
    'h1{border:2px solid black;border-left-width:1px}'
  )
);

test(
  'Should correctly merge border declarations (#551) (1) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID BLACK;BORDER-TOP-WIDTH:2PX;BORDER-RIGHT-WIDTH:2PX;BORDER-BOTTOM-WIDTH:2PX}',
    'h1{border:2px solid black;border-left-width:1px}'
  )
);

test(
  'Should correctly merge border declarations (#551) (2)',
  processCSS(
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}',
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}'
  )
);

test(
  'Should correctly merge border declarations (#551) (2) (uppercase)',
  processCSS(
    'h1{BORDER:NONE;BORDER-TOP:6PX SOLID #000;BORDER-BOTTOM:1PX SOLID #FFF}',
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}'
  )
);

test(
  'should not break border-color (#553)',
  processCSS(
    'h1{border:solid transparent;border-width:0 8px 16px;border-bottom-color:#eee}',
    'h1{border:solid transparent;border-bottom:solid #eee;border-width:0 8px 16px}'
  )
);

test(
  'should not break border-color (#553) (uppercase)',
  processCSS(
    'h1{BORDER:SOLID TRANSPARENT;BORDER-WIDTH:0 8PX 16PX;BORDER-BOTTOM-COLOR:#EEE}',
    'h1{border:solid transparent;border-bottom:solid #eee;border-width:0 8px 16px}'
  )
);

test(
  'should not remove border-top-color (#554)',
  passthroughCSS(
    'h1{border-top-color: rgba(85, 85, 85, 0.95);border-bottom: 0}'
  )
);

test(
  'should not remove border-top-color (#554) (uppercase)',
  passthroughCSS(
    'h1{BORDER-TOP-COLOR: RGBA(85, 85, 85, 0.95);BORDER-BOTTOM: 0}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (1)',
  passthroughCSS(
    'h1{border:1px solid #d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (1) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID #D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}',
    'h1{border:1px solid #d3d6db;border:1px solid VAR(--GRAY-LIGHTER);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2)',
  processCSS(
    'h1{border-left-style:solid;border-left-color:#d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}',
    'h1{border-left:1px solid #d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2) (uppercase)',
  processCSS(
    'h1{BORDER-LEFT-STYLE:SOLID;BORDER-LEFT-COLOR:#D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}',
    'h1{border-left:1px solid #d3d6db;border:1px solid VAR(--GRAY-LIGHTER);border-left-width:0;}'
  )
);

test(
  'Should not convert currentcolor (#559)',
  passthroughCSS(
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (uppercase)',
  processCSS(
    'h1{BORDER:2PX SOLID TRANSPARENT;BORDER-TOP-COLOR:CURRENTCOLOR;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (2)',
  processCSS(
    'h1{border:2px solid transparent;border-top-color:currentColor;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'Should not convert currentcolor (#559) (2) (uppercase)',
  processCSS(
    'h1{BORDER:2PX SOLID TRANSPARENT;BORDER-TOP-COLOR:CURRENTCOLOR;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}'
  )
);

test(
  'should not drop border-width with custom property from border shorthand (#561)',
  passthroughCSS('h1{border:var(--border-width) solid grey}')
);

test(
  'should not drop border-width with custom property from border shorthand (#561) (uppercase)',
  processCSS(
    'h1{BORDER:VAR(--border-width) SOLID GREY}',
    'h1{border:VAR(--border-width) solid grey}'
  )
);

test(
  'Should not throw error (#570)',
  processCSS(
    'h1{border:1px none;border-bottom-style:solid}',
    'h1{border:1px;border-bottom:1px solid}'
  )
);

test(
  'Should not throw error (#570) (uppercase)',
  processCSS(
    'h1{BORDER:1PX NONE;BORDER-BOTTOM-STYLE:SOLID}',
    'h1{border:1px;border-bottom:1px solid}'
  )
);

test(
  'Should correctly merge borders with custom properties (#572)',
  passthroughCSS(
    'h1{border:6px solid red;border-top:6px solid var(--mycolor);}'
  )
);

test(
  'Should correctly merge borders with custom properties (#572) (uppercase)',
  processCSS(
    'h1{BORDER:6PX SOLID RED;BORDER-TOP:6PX SOLID VAR(--mycolor);}',
    'h1{border:6px solid red;border-top:6px solid VAR(--mycolor);}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (1)',
  passthroughCSS('h1{border:1px solid;border-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (1) (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID;BORDER-COLOR:VAR(--COLOR-VAR)}',
    'h1{border:1px solid;border-color:VAR(--COLOR-VAR)}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (2)',
  passthroughCSS('h1{border-left:1px solid;border-left-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (2) (uppercase)',
  processCSS(
    'h1{BORDER-LEFT:1PX SOLID;BORDER-LEFT-COLOR:VAR(--COLOR-VAR)}',
    'h1{border-left:1px solid;border-left-color:VAR(--COLOR-VAR)}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (3)',
  passthroughCSS(
    'h1{border-color:red green blue magenta;border-top-color:var(--color-var)}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (3) (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED GREEN BLUE MAGENTA;BORDER-TOP-COLOR:VAR(--COLOR-VAR)}',
    'h1{border-color:RED GREEN BLUE MAGENTA;BORDER-TOP-COLOR:VAR(--COLOR-VAR)}'
  )
);

test(
  'Should not throw error when a border property value is undefined (#639)',
  processCSS(
    'h1{border:2px solid #fff;border-color:inherit}',
    'h1{border:2px solid;border-color:inherit}'
  )
);

test(
  'Should not throw error when a border property value is undefined (#639) (uppercase)',
  processCSS(
    'h1{BORDER:2PX SOLID #FFF;BORDER-COLOR:INHERIT}',
    'h1{border:2px solid;BORDER-COLOR:INHERIT}'
  )
);

test(
  'Should preserve case of css custom properties #648',
  passthroughCSS('h1{border:1px solid rgba(var(--fooBar));}')
);

test(
  'Should preserve case of css custom properties #648 (uppercase)',
  processCSS(
    'h1{BORDER:1PX SOLID RGBA(VAR(--fooBar));}',
    'h1{border:1px solid rgba(var(--fooBar));}'
  )
);

test(
  'Should preserve case of css custom properties #847',
  passthroughCSS(
    'h1 {border: 1px solid hsla(var(--HUE), var(--SATURATION), var(--LUMINANCE), 0.5)}'
  )
);

test(
  'Should preserve case of css custom property names with hyphens',
  passthroughCSS('h1 { border: 1px solid rgba(var(--colors-secondaryColor)); }')
);

test(
  'Should preserve case of css custom properties example 2',
  processCSS(
    'h1 {border:solid 2px var(--buttonBorderColor, var(--buttonBaseColor, #000));}',
    'h1 {border:2px solid var(--buttonBorderColor, var(--buttonBaseColor, #000));}'
  )
);

test(
  'Should preserve border rule with only custom properties #1051',
  passthroughCSS(
    'h1{border-color: var(--a) var(--b) var(--c) var(--d);border-style:solid;border:var(--fooBar));}'
  )
);

test(
  'should not break border rules mixing custom and regular properties',
  passthroughCSS(
    'h1{border:var(--v1) solid var(--v2, #abc123);border-right-color:blue}'
  )
);

test(
  'should not merge declarations with custom properties #1354',
  passthroughCSS(
    'h1{border-width:var(--width); border-style:solid; border-color: hotpink;}'
  )
);

test(
  'should not merge declarations with custom properties #675',
  passthroughCSS(
    '.class{border-width:var(--border-width);border-style:var(--border-style);border-color:var(--border-color);}'
  )
);

test(
  'should not merge declarations with custom properties #1044',
  passthroughCSS('div{border:1px solid;border-color:red var(--grey);}')
);

test(
  'do not crash',
  processCSS(
    `.next-step-arrow[dir='rtl'] .next-step-item:before {
  border: 16px solid transparent;
  border-right: 16px solid transparent;
  border: var(--step-arrow-item-border-width, 16px) solid transparent;
  border-right-color: transparent;
}`,
    `.next-step-arrow[dir='rtl'] .next-step-item:before {
  border: 16px solid transparent;
  border-right: 16px solid transparent;
  border: var(--step-arrow-item-border-width, 16px) solid transparent;
}`
  )
);

test(
  'should overwrite some border-width props and save fallbacks and preserve case #648 2',
  processCSS(
    'h1{border-top-width:10px;border-right-width:var(--fooBar);border-right-width:15px;border-bottom-width:var(--fooBar);border-bottom-width:20px;border-left-width:25px;border-top-width:var(--fooBar);border-left-width:var(--fooBar)}',
    'h1{border-width:10px 15px 20px 25px;border-top-width:var(--fooBar);border-left-width:var(--fooBar)}'
  )
);

test(
  'should overwrite some border-width props and save fallbacks and preserve case #648 2 (uppercase)',
  processCSS(
    'h1{BORDER-TOP-WIDTH:10PX;BORDER-RIGHT-WIDTH:VAR(--fooBar);BORDER-RIGHT-WIDTH:15PX;BORDER-BOTTOM-WIDTH:VAR(--fooBar);BORDER-BOTTOM-WIDTH:20PX;BORDER-LEFT-WIDTH:25PX;BORDER-TOP-WIDTH:VAR(--fooBar);BORDER-LEFT-WIDTH:VAR(--fooBar)}',
    'h1{border-width:10PX 15PX 20PX 25PX;BORDER-TOP-WIDTH:VAR(--fooBar);BORDER-LEFT-WIDTH:VAR(--fooBar)}'
  )
);

test(
  'should handle !important statements for border-width props',
  processCSS(
    'h1{border:1px solid red!important;border-top-width:0!important;border-right-width:0!important;border-bottom-width:0!important;}',
    'h1{border:solid red!important;border-width:0 0 0 1px!important;}'
  )
);

test(
  'should handle mixed border declarations',
  processCSS(
    'h1{border: 2px solid red;border-bottom-width:0;border-right-width:0;border-top-width:0;}',
    'h1{border:solid red;border-width:0 0 0 2px;}'
  )
);

test(
  'avoid dropping custom property when merging expansions',
  passthroughCSS(
    'h1{border:1px solid;border-color:var(--BORDER);border-left-style:none;}'
  )
);

test('should handle empty border', processCSS('h1{border:;}', 'h1{border:;}'));
test.run();
