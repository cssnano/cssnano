'use strict';
const { test, suite } = require('node:test');
const topRightBottomLeft = require('../src/lib/trbl.js');
const { processCSSFactory } = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

const widthStyleColor = [
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

for (const { property, fixture } of widthStyleColor) {
  test(
    `should merge to form a border-trbl-${property} definition`,
    processCSS(
      [
        `h1{`,
        `border-${topRightBottomLeft[0]}-${property}:${fixture};`,
        `border-${topRightBottomLeft[1]}-${property}:${fixture};`,
        `border-${topRightBottomLeft[2]}-${property}:${fixture};`,
        `border-${topRightBottomLeft[3]}-${property}:${fixture}`,
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
        `BORDER-${topRightBottomLeft[0].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${topRightBottomLeft[1].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${topRightBottomLeft[2].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()};`,
        `BORDER-${topRightBottomLeft[3].toUpperCase()}-${property.toUpperCase()}:${fixture.toUpperCase()}`,
        `}`,
      ].join(''),
      `h1{border-${property}:${fixture.toUpperCase()}}`
    )
  );
}

for (const direction of topRightBottomLeft) {
  const value = [];
  for (const { fixture } of widthStyleColor) {
    value.push(fixture);
  }

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
}

test(
  'should merge identical border values',
  processCSS(
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black}',
    'h1{border-color:black;border-style:solid;border-width:1px}'
  )
);

test(
  'should merge identical border values (uppercase)',
  processCSS(
    'h1{BORDER-TOP:1px solid black;BORDER-BOTTOM:1px solid black;BORDER-LEFT:1px solid black;BORDER-RIGHT:1px solid black}',
    'h1{border-color:black;border-style:solid;border-width:1px}'
  )
);

test(
  'should merge identical border values with !important',
  processCSS(
    'h1{border-top:1px solid black!important;border-bottom:1px solid black!important;border-left:1px solid black!important;border-right:1px solid black!important}',
    'h1{border-color:black!important;border-style:solid!important;border-width:1px!important}'
  )
);

test(
  'should merge identical border values with !important (uppercase)',
  processCSS(
    'h1{BORDER-TOP:1px solid black!important;BORDER-BOTTOM:1px solid black!important;BORDER-LEFT:1px solid black!important;BORDER-RIGHT:1px solid black!important}',
    'h1{border-color:black!important;border-style:solid!important;border-width:1px!important}'
  )
);

test(
  'should merge identical border values with !important 1 (uppercase)',
  processCSS(
    'h1{border-top:1px solid black!IMPORTANT;border-bottom:1px solid black!IMPORTANT;border-left:1px solid black!IMPORTANT;border-right:1px solid black!IMPORTANT}',
    'h1{border-color:black!IMPORTANT;border-style:solid!IMPORTANT;border-width:1px!IMPORTANT}'
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
    'h1{border-color:red;border-style:dashed;border-width:1px}'
  )
);

test(
  'should merge border values (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX;BORDER-STYLE:DASHED}',
    'h1{border-color:red;border-style:dashed;border-width:1px}'
  )
);

test(
  'should merge border values with !important',
  processCSS(
    'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    'h1{border-color:red!important;border-style:dashed!important;border-width:1px!important}'
  )
);

test(
  'should merge border values with !important (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED!IMPORTANT;BORDER-WIDTH:1PX!IMPORTANT;BORDER-STYLE:DASHED!IMPORTANT}',
    'h1{border-color:red!IMPORTANT;border-style:dashed!IMPORTANT;border-width:1px!IMPORTANT}'
  )
);

test(
  'should merge border values with identical values for all sides',
  processCSS(
    'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border-color:red;border-style:solid;border-width:1px}'
  )
);

test(
  'should merge border values with identical values for all sides (uppercase)',
  processCSS(
    'h1{BORDER-COLOR:RED RED RED RED;BORDER-WIDTH:1PX 1PX 1PX 1PX;BORDER-STYLE:SOLID SOLID SOLID SOLID}',
    'h1{border-color:red;border-style:solid;border-width:1px}'
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
  passthroughCSS('h1{border-width:3px;border-style:solid;border-color:inherit}')
);

test(
  'should preserve rules with inherit keyword when the rules',
  passthroughCSS(`table tbody, table tr {
    border-color: inherit;
    border-style: inherit;
    border-width: 0;
  }`)
);

test(
  'should not merge rules with the inherit keyword (uppercase)',
  passthroughCSS('h1{BORDER-WIDTH:3PX;BORDER-STYLE:SOLID;BORDER-COLOR:INHERIT}')
);

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

suite('border-width', () => {
  /* A component is specified by a token that produces it. A function is taken on
   * trust only where the plugin cannot resolve what it produces — `var()` and
   * the maths functions — and never as a stand-in for any component at all. */
  test(
    'should not read a colour as a width',
    passthroughCSS(
      'h1{border-top-width:rgb(0,0,0);border-right-width:1px;border-bottom-width:1px;border-left-width:1px}'
    )
  );

  test(
    'should keep reading a calc as a width',
    processCSS(
      'h1{border-top-width:calc(1px + 1%);border-right-width:calc(1px + 1%);border-bottom-width:calc(1px + 1%);border-left-width:calc(1px + 1%)}',
      'h1{border-width:calc(1px + 1%)}'
    )
  );

  /* `hairline` is in the grammar of `<line-width>` and in no browser, so a
   * border stating it paints nothing and the rule stands as written. */
  test(
    'should not read a width keyword no browser ships as a width',
    passthroughCSS(
      'h1{border-top:hairline solid red;border-right:hairline solid red;border-bottom:hairline solid red;border-left:hairline solid red}'
    )
  );

  /* `border-width: none` is no width, so the browser drops it and the rule is
   * left alone, down to the case its properties are written in. */
  test(
    'should produce the minimum css necessary (uppercase)',
    passthroughCSS('h1{BORDER-WIDTH:NONE;BORDER-TOP:1PX SOLID #E1E1E1}')
  );
});

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

suite('component merging', () => {
  /* Exploding a shorthand and merging the pieces back can answer with more
   * declarations than it was given: three component shorthands where the
   * stylesheet wrote a `border` and a `border-color`. Whatever the pipeline
   * arrives at, a rule it leaves longer than it found is one to put back. */

  test(
    'should not grow a rule by spreading a border across its components',
    passthroughCSS('h1{border:1px solid red;border-color:red blue red blue}')
  );

  test(
    'should not grow an important rule by spreading a border across its components',
    passthroughCSS(
      'h1{border:1px solid red!important;border-color:red blue red blue!important}'
    )
  );
});

test(
  'should produce the minimum css necessary (3)',
  passthroughCSS(
    'h1{border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}'
  )
);

test(
  'should produce the minimum css necessary (3) (uppercase)',
  passthroughCSS(
    'h1{BORDER-TOP:0 SOLID TRANSPARENT;BORDER-RIGHT:4EM SOLID TRANSPARENT;BORDER-BOTTOM:4EM SOLID TRANSPARENT;BORDER-LEFT:0 SOLID TRANSPARENT;BORDER-RIGHT-COLOR:INHERIT}'
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
    'h1{border-spacing:50px;border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}'
  )
);

test(
  'should produce the minimum css necessary (5) (uppercase)',
  processCSS(
    'h1{BORDER-SPACING:50PX 50PX;BORDER-TOP:0 SOLID TRANSPARENT;BORDER-RIGHT:4EM SOLID TRANSPARENT;BORDER-BOTTOM:4EM SOLID TRANSPARENT;BORDER-LEFT:0 SOLID TRANSPARENT;BORDER-RIGHT-COLOR:INHERIT}',
    'h1{BORDER-SPACING:50PX;BORDER-TOP:0 SOLID TRANSPARENT;BORDER-RIGHT:4EM SOLID TRANSPARENT;BORDER-BOTTOM:4EM SOLID TRANSPARENT;BORDER-LEFT:0 SOLID TRANSPARENT;BORDER-RIGHT-COLOR:INHERIT}'
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

/* Spreading these four sides across the three components specifies the same
 * border in a third more room, so the rule the stylesheet wrote is the minimum
 * and the pipeline's answer is thrown away. */

test(
  'should produce the minimum css necessary (7)',
  passthroughCSS(
    'h1{border-top:none;border-right:none;border-bottom:1px solid #cacaca;border-left:none}'
  )
);

test(
  'should produce the minimum css necessary (7) (uppercase)',
  passthroughCSS(
    'h1{BORDER-TOP:NONE;BORDER-RIGHT:NONE;BORDER-BOTTOM:1PX SOLID #CACACA;BORDER-LEFT:NONE}'
  )
);

test(
  'should produce the minimum css necessary (8)',
  processCSS(
    'h1{border-top:none;border-right:none;border-bottom:none;border-left:5px}',
    'h1{border-top:none;border-right:none;border-bottom:none;border-left:5px}'
  )
);

test(
  'should produce the minimum css necessary (8) (uppercase)',
  processCSS(
    'h1{BORDER-TOP:NONE;BORDER-RIGHT:NONE;BORDER-BOTTOM:NONE;BORDER-LEFT:5PX}',
    'h1{border-top:none;border-right:none;border-bottom:none;BORDER-LEFT:5PX}'
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
    'h1{border-color:transparent transparent currentcolor;border-style:solid solid none;border-width:2px 1px medium}'
  )
);

test(
  'should produce the minimum css necessary (10) (uppercase)',
  processCSS(
    'h1{BORDER-BOTTOM:NONE;BORDER-LEFT:1PX SOLID TRANSPARENT;BORDER-RIGHT:1PX SOLID TRANSPARENT;BORDER-TOP:2PX SOLID TRANSPARENT}',
    'h1{border-color:transparent transparent currentcolor;border-style:solid solid none;border-width:2px 1px medium}'
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
  passthroughCSS(
    'h1{border-color:initial;border-width:initial;border-style:initial}'
  )
);

test(
  'should merge together all initial values (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:initial;BORDER-WIDTH:initial;BORDER-STYLE:initial}'
  )
);

test(
  'should merge together all initial values 1 (uppercase)',
  passthroughCSS(
    'h1{border-color:INITIAL;border-width:INITIAL;border-style:INITIAL}'
  )
);

test(
  'should merge together all inherit values',
  passthroughCSS(
    'h1{border-color:inherit;border-width:inherit;border-style:inherit}'
  )
);

test(
  'should merge together all inherit values (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:INHERIT;BORDER-WIDTH:INHERIT;BORDER-STYLE:INHERIT}'
  )
);

test(
  'should preserve nesting level',
  processCSS(
    'section{h1{border-color:red;border-width:1px;border-style:solid}}',
    'section{h1{border-color:red;border-style:solid;border-width:1px}}'
  )
);

test(
  'should preserve nesting level (uppercase)',
  processCSS(
    'section{h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX;BORDER-STYLE:SOLID}}',
    'section{h1{border-color:red;border-style:solid;border-width:1px}}'
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
  passthroughCSS('h1{BORDER-COLOR:DOTTED;BORDER-COLOR:VAR(--VARIABLE)}')
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

test(
  'should not explode border with revert-layer properties',
  passthroughCSS(
    'h1{border-width:1px;border-style:solid;border-color:revert-layer}'
  )
);

for (const direction of topRightBottomLeft) {
  test(
    `should not explode border-${direction} with custom properties`,
    passthroughCSS(`h1{border-${direction}:var(--variable)}`)
  );

  test(
    `should not explode border-${direction.toUpperCase()} with custom properties`,
    passthroughCSS(`h1{BORDER-${direction.toUpperCase()}:VAR(--variable)}`)
  );
}

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
  passthroughCSS(
    'h1{BORDER:1PX SOLID #D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2)',
  passthroughCSS(
    'h1{border-left-style:solid;border-left-color:#d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}'
  )
);

test(
  'Should not merge if there is a shorthand property between them (#557) (2) (uppercase)',
  passthroughCSS(
    'h1{BORDER-LEFT-STYLE:SOLID;BORDER-LEFT-COLOR:#D3D6DB;BORDER:1PX SOLID VAR(--GRAY-LIGHTER);BORDER-LEFT-WIDTH:0;}'
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
  passthroughCSS('h1{BORDER:VAR(--border-width) SOLID GREY}')
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
  passthroughCSS(
    'h1{BORDER:6PX SOLID RED;BORDER-TOP:6PX SOLID VAR(--mycolor);}'
  )
);

test(
  'Should correctly merge borders with custom properties (#619) (1)',
  passthroughCSS('h1{border:1px solid;border-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (1) (uppercase)',
  passthroughCSS('h1{BORDER:1PX SOLID;BORDER-COLOR:VAR(--COLOR-VAR)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (2)',
  passthroughCSS('h1{border-left:1px solid;border-left-color:var(--color-var)}')
);

test(
  'Should correctly merge borders with custom properties (#619) (2) (uppercase)',
  processCSS(
    'h1{BORDER-LEFT:1PX SOLID;BORDER-LEFT-COLOR:VAR(--COLOR-VAR)}',
    'h1{border-left:1px solid;BORDER-LEFT-COLOR:VAR(--COLOR-VAR)}'
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
  passthroughCSS('h1{border:2px solid #fff;border-color:inherit}')
);

test(
  'Should not throw error when a border property value is undefined (#639) (uppercase)',
  passthroughCSS('h1{BORDER:2PX SOLID #FFF;BORDER-COLOR:INHERIT}')
);

test(
  'Should preserve case of css custom properties #648',
  passthroughCSS('h1{border:1px solid rgba(var(--fooBar));}')
);

test(
  'Should preserve case of css custom properties #648 (uppercase)',
  passthroughCSS('h1{BORDER:1PX SOLID RGBA(VAR(--fooBar));}')
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
  passthroughCSS(
    'h1 {border:solid 2px var(--buttonBorderColor, var(--buttonBaseColor, #000));}'
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
  passthroughCSS(`.next-step-arrow[dir='rtl'] .next-step-item:before {
  border: 16px solid transparent;
  border-right: 16px solid transparent;
  border: var(--step-arrow-item-border-width, 16px) solid transparent;
  border-right-color: transparent;
}`)
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

test(
  'should preserve border with inherit in the middle',
  passthroughCSS(`div {
  border: 1em solid;
  border-color: inherit;
  border-top: none;
}`)
);

test(
  'should not overwrite border-inline-start property',
  passthroughCSS(
    `h1{border-width: 0; border-inline-start-width: 1px; border-style: solid;}`
  )
);

test(
  'should preserve custom property declared between two border properties',
  passthroughCSS(`.arrow {
  border-style: solid;
  border-width: 50px;
  border-color: #fff transparent;
  border-color: var(--col) transparent;
  border-top: none;
  height: 0;
  width: 0;
}`)
);

for (const [name, values] of [
  ['custom properties', ['var(--a)', '2px', '3px', '4px']],
  ['CSS-wide keywords', ['inherit', 'inherit', 'inherit', 'inherit']],
  ['malformed values', ['1px 2px 3px', '2px', '3px', '4px']],
  ['invalid values', ['solid', '2px', '3px', '4px']],
  ['negative values', ['-1px', '2px', '3px', '4px']],
  ['hacked values', ['_1px', '2px', '3px', '4px']],
]) {
  test(
    `should preserve border radii with ${name}`,
    passthroughCSS(
      `a{border-top-left-radius:${values[0]};border-top-right-radius:${values[1]};border-bottom-right-radius:${values[2]};border-bottom-left-radius:${values[3]}}`
    )
  );
}

test(
  'should preserve border radii with mixed importance',
  passthroughCSS(
    'a{border-top-left-radius:1px!important;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should not override border image',
  passthroughCSS(`.style {
      border-image: linear-gradient(to right, rgba(230, 232, 235, 0), #e6e8eb) 0 0
        0 100%;
    border-left: 60px;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
}`)
);

test(
  'should preserve all axes',
  passthroughCSS(`.selector  {
  border-style: solid;
  border-width: 0px 0px 5px 5px;
  border-top-color: transparent;
}`)
);

test(
  'should not unsafely merge custom properties',
  passthroughCSS(`.foo {
  padding-top: var(--padding-top);
  padding-bottom: var(--padding-bottom);
  padding-left: var(--padding-left);
  padding-right: var(--padding-right);
}`)
);

test(
  'should not incorrectly merge values containing inherit',
  passthroughCSS(`a {
  border-color: inherit;
  border-style: inherit;
  border-width: inherit;
  border-width: 0;
}`)
);

test(
  `s`,
  passthroughCSS(`.parent .child {
    border-width: 1px;
    border-style: solid;
    border-color: transparent;
    border-right-color: inherit;
    border-top-color: transparent;
    border-bottom-color: transparent;
}`)
);

test(
  'should not introdudce spurious currentcolor',
  passthroughCSS(`div {
    border: 1px solid;
    border-color: red var(--grey);
}`)
);

test('should handle empty border', processCSS('h1{border:;}', 'h1{border:;}'));

suite('support-dependent (env()) merge blocking', () => {
  test(
    'should save fallbacks for border-width that use env()',
    passthroughCSS(
      'h1{border-bottom-width:1px;border-bottom-width:env(safe-area-inset-bottom)}'
    )
  );

  test(
    'should not merge border longhands over a fallback',
    passthroughCSS(
      'h1{border-top-width:1px;border-top-width:env(safe-area-inset-bottom);border-top-style:solid;border-top-color:red}'
    )
  );
});

suite('border-color', () => {
  test(
    'should keep only the last of a chain of fallback colours',
    processCSS(
      'h1{border-color:#ddd;border-color:#eee;border-color:rgba(0,0,0,.1)}',
      'h1{border-color:#eee;border-color:rgba(0,0,0,.1)}'
    )
  );

  test(
    'should merge borders whose colour comes from a modern colour function',
    processCSS(
      'h1{border-top:solid lab(50% 40 59.5);border-right:solid lab(50% 40 59.5);border-bottom:solid lab(50% 40 59.5);border-left:solid lab(50% 40 59.5)}',
      'h1{border-color:lab(50% 40 59.5);border-style:solid;border-width:medium}'
    )
  );

  test(
    'should merge borders whose colour is mixed',
    processCSS(
      'h1{border-top:solid color-mix(in srgb,red,blue);border-right:solid color-mix(in srgb,red,blue);border-bottom:solid color-mix(in srgb,red,blue);border-left:solid color-mix(in srgb,red,blue)}',
      'h1{border-color:color-mix(in srgb,red,blue);border-style:solid;border-width:medium}'
    )
  );

  test(
    'should not read a function that merely ends in a colour name as a colour',
    passthroughCSS('h1{border-top:solid my-rgb(1,2,3)}')
  );

  test(
    'should merge borders whose colour depends on the colour scheme',
    processCSS(
      'h1{border-top:solid light-dark(white,black);border-right:solid light-dark(white,black);border-bottom:solid light-dark(white,black);border-left:solid light-dark(white,black)}',
      'h1{border-color:light-dark(white,black);border-style:solid;border-width:medium}'
    )
  );

  test(
    'should not merge borders with different support requirements across sides',
    passthroughCSS(
      'a{border-top:solid red;border-right:solid oklch(0.7 0.1 20);border-bottom:solid red;border-left:solid red}'
    )
  );

  test(
    'should not give a side a border a mistyped hex colour dropped',
    passthroughCSS(
      'a{border-top:1px solid #fffff;border-right:1px solid #fffff;border-bottom:1px solid #fffff;border-left:1px solid #fffff}'
    )
  );

  test(
    'should not merge a border-color whose hex is not hexadecimal',
    passthroughCSS(
      'a{border-top-color:#ggg;border-right-color:red;border-bottom-color:red;border-left-color:red}'
    )
  );

  test(
    'should not read a colour function beside a colour as one colour',
    passthroughCSS(
      'a{border-top-color:red rgb(0,0,0);border-right-color:red;border-bottom-color:red;border-left-color:red}'
    )
  );
});

suite('border grid resolution', () => {
  test(
    'border grid: should resolve border grid with reset and side override',
    processCSS(
      'button{color:blue;border:none;border-left:solid;border-color:grey;border-width:2px}',
      'button{color:blue;border:2px grey;border-left-style:solid}'
    )
  );

  test(
    'border grid: should not resolve border grid without border reset',
    passthroughCSS('a{border-left:solid;border-color:grey;border-width:2px}')
  );

  /* The browser drops a `border` that specifies a component twice, or that
   * specifies something no component accepts, so it resets nothing and the
   * sides it looked like it covered keep `border-style: none`. */
  test(
    'border grid: should not read a reset out of a repeated component',
    passthroughCSS(
      'a{border:solid red red;border-left:solid;border-color:grey;border-width:2px}'
    )
  );

  test(
    'border grid: should not read a reset out of an unrecognised component',
    passthroughCSS(
      'a{border:1px solid 50%;border-left:solid;border-color:grey;border-width:2px}'
    )
  );

  test(
    'border grid: should not read a reset out of two line styles',
    passthroughCSS(
      'a{border:none none;border-left:solid;border-color:grey;border-width:2px}'
    )
  );
});

suite('invalid declarations', () => {
  /* The same values, in the rules the rest of the plugin handles: a declaration
   * the browser drops sets no border, and must not be shortened into one, read as
   * overriding what comes before it, or written into what comes after. */
  test(
    'should not shorten a border that specifies a component twice',
    passthroughCSS('a{border:solid red red}')
  );

  test(
    'should not shorten a border that specifies two widths',
    passthroughCSS('a{border:1px 1px}')
  );

  test(
    'should keep a border-color a dropped border does not override',
    passthroughCSS('a{border-color:red;border:1px solid 50%}')
  );

  test(
    'should not write a dropped longhand into a side shorthand',
    passthroughCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:50%}'
    )
  );

  test(
    'should not let a dropped longhand take the other sides with it',
    passthroughCSS(
      'a{border-top-color:50%;border-right-color:red;border-bottom-color:red;border-left-color:red}'
    )
  );

  test(
    'should leave a border-color that specifies no colour alone',
    passthroughCSS('a{border-color:none;border-style:none;border-width:0}')
  );

  test(
    'should not explode a border whose hex colour has five digits',
    passthroughCSS('a{border:1px solid #fffff;border-top-width:2px}')
  );

  test(
    'should not read a fifth side into a border-width',
    passthroughCSS(
      'a{border-width:1px 2px 3px 4px 5px;border-style:solid;border-color:red}'
    )
  );
});

suite('side merging', () => {
  /* The merge this once asserted specified every side correctly and took half as
   * much room again as the rule it replaced, so the size guard in `index.js` now
   * puts the rule back. Both answers keep the sides straight; only the shorter
   * one ships. */

  test(
    'should keep the side a longhand belongs to when merging into border-color',
    passthroughCSS(
      'a{border:1px solid red;border-left:solid;border-color:currentcolor}'
    )
  );

  test(
    'should not read a side shorthand that omits a component positionally',
    passthroughCSS(
      'a{border:1px solid;border-top-width:env(a);border-style:none;border-right-width:thin}'
    )
  );

  test(
    'should not merge a longhand a later shorthand has already reset',
    processCSS(
      'a{border-left-color:red;border-top-color:red;border-right-color:blue;border-left:solid;border-bottom:1px solid green}',
      'a{border-top-color:red;border-right-color:blue;border-left:solid;border-bottom:1px solid green}'
    )
  );

  test(
    'should not read several colours as the colour of one side',
    passthroughCSS(
      'a{border-left:none;border-color:#fff #abc123 red blue;border-left-color:#fff #abc123 red blue}'
    )
  );

  test(
    'should take the width a side shorthand stating only a style resets to',
    processCSS(
      'a{border-top-width:medium;border-right-width:medium;border-bottom-width:medium;border-left:dashed}',
      'a{border-width:medium;border-left:dashed}'
    )
  );

  test(
    'should keep a border-width fallback a support-dependent border cannot reach',
    passthroughCSS(
      'a{border-width:thin;border:env(safe-area-inset-top) solid red}'
    )
  );

  test(
    'should keep a border-style fallback a support-dependent border cannot reach',
    passthroughCSS(
      'a{border-style:dashed;border:env(safe-area-inset-top) solid red}'
    )
  );

  test(
    'should keep a border-color fallback a support-dependent border cannot reach',
    passthroughCSS(
      'a{border-color:red green;border:env(safe-area-inset-top) solid red}'
    )
  );

  test(
    'should keep every longhand fallback a support-dependent border cannot reach',
    passthroughCSS(
      'a{border-width:thin;border-style:solid;border:env(safe-area-inset-top) solid red}'
    )
  );

  test(
    'should keep a border-width fallback a modern colour function cannot reach',
    processCSS(
      'a{border-width:thin;border:oklch(0.7 0.1 200) solid}',
      'a{border-width:thin;border:solid oklch(0.7 0.1 200)}'
    )
  );

  test(
    'should not revive a longhand a later duplicate had overridden',
    processCSS(
      'a{border-left:dashed blue;border-color:red;border-bottom-color:green;border-bottom-color:red}',
      'a{border-left:dashed;border-color:red}'
    )
  );

  test(
    'should keep the last of a run of duplicate longhands',
    processCSS(
      'a{border-left:medium dashed blue;border-color:red red;border-bottom-color:currentcolor;border-bottom-color:blue;border-bottom-color:red}',
      'a{border-left:dashed;border-color:red}'
    )
  );

  /* `border-top` and `border-color` reach the same longhand, `border-top-color`,
   * while neither property name contains the other, so a subset test on the two
   * names cannot see that they collide. A merge that moves one of them past the
   * other has to weigh it, or the side quietly takes back a component something
   * else had already set. */

  test(
    'should not move a side shorthand past a component shorthand that overrode it',
    passthroughCSS(
      'a{border:medium none #fff;border-left:thick;border:solid #abc123;border-width:1px medium 1px 0;border-left:1px}'
    )
  );

  /* Guards against the crossing check over-correcting: a crossing property the
   * merge never moves past is no reason to refuse. These pass either way. */

  test(
    'should still fold sides a later border-color only partly overrides',
    processCSS(
      'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-color:blue;border-left:1px solid red}',
      'a{border-color:blue blue blue red;border-style:solid;border-width:1px}'
    )
  );

  test(
    'should still fold sides a later border-style only partly overrides',
    processCSS(
      'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-style:dashed;border-left:1px solid red}',
      'a{border-color:red;border-style:dashed dashed dashed solid;border-width:1px}'
    )
  );

  test(
    'should still merge sides specified after the component shorthand they kill',
    processCSS(
      'a{border-color:blue;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
      'a{border-color:red;border-style:solid;border-width:1px}'
    )
  );
});

suite('component merging', () => {
  test(
    'should correctly handle a component a shorthand has already specified',
    processCSS(
      'a{border-left:1px solid;border-top-width:1px;border-width:1px}',
      'a{border-left:solid;border-width:1px}'
    )
  );
});

test(
  'border grid: should resolve border grid with reset and side override',
  processCSS(
    'button{color:blue;border:none;border-left:solid;border-color:grey;border-width:2px}',
    'button{color:blue;border:2px grey;border-left-style:solid}'
  )
);

test(
  'should not merge borders with different support requirements across sides',
  passthroughCSS(
    'a{border-top:solid red;border-right:solid oklch(0.7 0.1 20);border-bottom:solid red;border-left:solid red}'
  )
);

test(
  'border grid: should not resolve border grid without border reset',
  passthroughCSS('a{border-left:solid;border-color:grey;border-width:2px}')
);

/* The browser drops a `border` that specifies a component twice, or that
 * specifies something no component accepts, so it resets nothing and the
 * sides it looked like it covered keep `border-style: none`. */
test(
  'border grid: should not read a reset out of a repeated component',
  passthroughCSS(
    'a{border:solid red red;border-left:solid;border-color:grey;border-width:2px}'
  )
);

test(
  'border grid: should not read a reset out of an unrecognised component',
  passthroughCSS(
    'a{border:1px solid 50%;border-left:solid;border-color:grey;border-width:2px}'
  )
);

test(
  'border grid: should not read a reset out of two line styles',
  passthroughCSS(
    'a{border:none none;border-left:solid;border-color:grey;border-width:2px}'
  )
);

/* The same values, in the rules the rest of the plugin handles: a declaration
 * the browser drops sets no border, and must not be shortened into one, read as
 * overriding what comes before it, or written into what comes after. */
test(
  'should not shorten a border that specifies a component twice',
  passthroughCSS('a{border:solid red red}')
);

test(
  'should not shorten a border that specifies two widths',
  passthroughCSS('a{border:1px 1px}')
);

test(
  'should keep a border-color a dropped border does not override',
  passthroughCSS('a{border-color:red;border:1px solid 50%}')
);

test(
  'should not write a dropped longhand into a side shorthand',
  passthroughCSS(
    'a{border-top-width:1px;border-top-style:solid;border-top-color:50%}'
  )
);

test(
  'should not let a dropped longhand take the other sides with it',
  passthroughCSS(
    'a{border-top-color:50%;border-right-color:red;border-bottom-color:red;border-left-color:red}'
  )
);

test(
  'should leave a border-color that specifies no colour alone',
  passthroughCSS('a{border-color:none;border-style:none;border-width:0}')
);

/* The merge this once asserted specified every side correctly and took half as
 * much room again as the rule it replaced, so the size guard in `index.js` now
 * puts the rule back. Both answers keep the sides straight; only the shorter
 * one ships. */

test(
  'should keep the side a longhand belongs to when merging into border-color',
  passthroughCSS(
    'a{border:1px solid red;border-left:solid;border-color:currentcolor}'
  )
);

test(
  'should not read a side shorthand that omits a component positionally',
  passthroughCSS(
    'a{border:1px solid;border-top-width:env(a);border-style:none;border-right-width:thin}'
  )
);

test(
  'should not merge a longhand a later shorthand has already reset',
  processCSS(
    'a{border-left-color:red;border-top-color:red;border-right-color:blue;border-left:solid;border-bottom:1px solid green}',
    'a{border-top-color:red;border-right-color:blue;border-left:solid;border-bottom:1px solid green}'
  )
);

test(
  'should not read several colours as the colour of one side',
  passthroughCSS(
    'a{border-left:none;border-color:#fff #abc123 red blue;border-left-color:#fff #abc123 red blue}'
  )
);

test(
  'should not read a fifth side into a border-width',
  passthroughCSS(
    'a{border-width:1px 2px 3px 4px 5px;border-style:solid;border-color:red}'
  )
);

test(
  'should not give a side a border a mistyped hex colour dropped',
  passthroughCSS(
    'a{border-top:1px solid #fffff;border-right:1px solid #fffff;border-bottom:1px solid #fffff;border-left:1px solid #fffff}'
  )
);

test(
  'should not explode a border whose hex colour has five digits',
  passthroughCSS('a{border:1px solid #fffff;border-top-width:2px}')
);

test(
  'should not merge a border-color whose hex is not hexadecimal',
  passthroughCSS(
    'a{border-top-color:#ggg;border-right-color:red;border-bottom-color:red;border-left-color:red}'
  )
);

test(
  'should not read a colour function beside a colour as one colour',
  passthroughCSS(
    'a{border-top-color:red rgb(0,0,0);border-right-color:red;border-bottom-color:red;border-left-color:red}'
  )
);

test(
  'should take the width a side shorthand stating only a style resets to',
  processCSS(
    'a{border-top-width:medium;border-right-width:medium;border-bottom-width:medium;border-left:dashed}',
    'a{border-width:medium;border-left:dashed}'
  )
);

test(
  'should keep a border-width fallback a support-dependent border cannot reach',
  passthroughCSS(
    'a{border-width:thin;border:env(safe-area-inset-top) solid red}'
  )
);

test(
  'should keep a border-style fallback a support-dependent border cannot reach',
  passthroughCSS(
    'a{border-style:dashed;border:env(safe-area-inset-top) solid red}'
  )
);

test(
  'should keep a border-color fallback a support-dependent border cannot reach',
  passthroughCSS(
    'a{border-color:red green;border:env(safe-area-inset-top) solid red}'
  )
);

test(
  'should keep every longhand fallback a support-dependent border cannot reach',
  passthroughCSS(
    'a{border-width:thin;border-style:solid;border:env(safe-area-inset-top) solid red}'
  )
);

test(
  'should keep a border-width fallback a modern colour function cannot reach',
  processCSS(
    'a{border-width:thin;border:oklch(0.7 0.1 200) solid}',
    'a{border-width:thin;border:solid oklch(0.7 0.1 200)}'
  )
);

test(
  'should correctly handle a component a shorthand has already specified',
  processCSS(
    'a{border-left:1px solid;border-top-width:1px;border-width:1px}',
    'a{border-left:solid;border-width:1px}'
  )
);

test(
  'should not revive a longhand a later duplicate had overridden',
  processCSS(
    'a{border-left:dashed blue;border-color:red;border-bottom-color:green;border-bottom-color:red}',
    'a{border-left:dashed;border-color:red}'
  )
);

test(
  'should keep the last of a run of duplicate longhands',
  processCSS(
    'a{border-left:medium dashed blue;border-color:red red;border-bottom-color:currentcolor;border-bottom-color:blue;border-bottom-color:red}',
    'a{border-left:dashed;border-color:red}'
  )
);

/* `border-top` and `border-color` reach the same longhand, `border-top-color`,
 * while neither property name contains the other, so a subset test on the two
 * names cannot see that they collide. A merge that moves one of them past the
 * other has to weigh it, or the side quietly takes back a component something
 * else had already set. */

test(
  'should not move a side shorthand past a component shorthand that overrode it',
  passthroughCSS(
    'a{border:medium none #fff;border-left:thick;border:solid #abc123;border-width:1px medium 1px 0;border-left:1px}'
  )
);

/* Guards against the crossing check over-correcting: a crossing property the
 * merge never moves past is no reason to refuse. These pass either way. */

test(
  'should still fold sides a later border-color only partly overrides',
  processCSS(
    'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-color:blue;border-left:1px solid red}',
    'a{border-color:blue blue blue red;border-style:solid;border-width:1px}'
  )
);

test(
  'should still fold sides a later border-style only partly overrides',
  processCSS(
    'a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-style:dashed;border-left:1px solid red}',
    'a{border-color:red;border-style:dashed dashed dashed solid;border-width:1px}'
  )
);

test(
  'should still merge sides specified after the component shorthand they kill',
  processCSS(
    'a{border-color:blue;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
    'a{border-color:red;border-style:solid;border-width:1px}'
  )
);
