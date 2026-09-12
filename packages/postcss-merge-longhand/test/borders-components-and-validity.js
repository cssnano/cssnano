import { suite, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

suite('component merging', () => {
  test(
    'should correctly handle a component a shorthand has already specified',
    processCSS(
      'a{border-left:1px solid;border-top-width:1px;border-width:1px}',
      'a{border-left:1px solid;border-width:1px}'
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

/* the browser ignores a `border` that specifies a component twice, or that
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
 * the browser ignores sets no border, and must not be shortened into one, read as
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
  processCSS(
    'a{border:1px solid red;border-left:solid;border-color:currentcolor}',
    'a{border:1px solid;border-left:solid}'
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
    'a{border-width:medium;border-left-style:dashed;border-left-color:currentcolor}'
  )
);

test(
  'should not merge unitless non-zero border-width into shorthand',
  passthroughCSS(
    'a{border-top-width:1;border-right-width:1px;border-bottom-width:1px;border-left-width:1px}'
  )
);

test(
  'should merge CSS Color 4 system color Canvas in border-color',
  processCSS(
    'a{border-top-color:Canvas;border-right-color:Canvas;border-bottom-color:Canvas;border-left-color:Canvas}',
    'a{border-color:Canvas}'
  )
);

test(
  'should merge border shorthand with system color Canvas',
  processCSS(
    'a{border-top:1px solid Canvas;border-right:1px solid Canvas;border-bottom:1px solid Canvas;border-left:1px solid Canvas}',
    'a{border-color:canvas;border-style:solid;border-width:1px}'
  )
);

test(
  'should merge CSS Color 4 system color Highlight in border-color',
  processCSS(
    'a{border-top-color:Highlight;border-right-color:Highlight;border-bottom-color:Highlight;border-left-color:Highlight}',
    'a{border-color:Highlight}'
  )
);
