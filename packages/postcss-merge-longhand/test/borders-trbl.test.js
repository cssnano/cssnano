import { test } from 'node:test';
import topRightBottomLeft from '../src/lib/trbl.js';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

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
  passthroughCSS(
    'h1{BORDER-COLOR:RED;BORDER-WIDTH:1PX!IMPORTANT;BORDER-STYLE:DASHED!IMPORTANT}'
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
