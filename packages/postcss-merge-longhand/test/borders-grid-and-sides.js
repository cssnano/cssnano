import { suite, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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

  /* Found by the differential fuzzer: three sides shared an identical
   * width/style/colour triple whose colour was a `calc()`, so the grid
   * resolver folded them into `border:calc(2*1px)` — a value a user agent
   * reads as the *width*, silently discarding the `medium` width and `none`
   * style the sides actually had. */
  test(
    'border grid: should not fold a calc() colour into a bare border width',
    passthroughCSS(
      'a{border:medium;border-color:calc(2*1px) blue calc(2*1px) calc(2*1px)}'
    )
  );
});

suite('invalid declarations', () => {
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
    'should take the width a side shorthand stating only a style resets to',
    processCSS(
      'a{border-top-width:medium;border-right-width:medium;border-bottom-width:medium;border-left:dashed}',
      'a{border-width:medium;border-left-style:dashed;border-left-color:currentcolor}'
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
    passthroughCSS('a{border-width:thin;border:oklch(0.7 0.1 200) solid}')
  );

  test(
    'should not revive a longhand a later duplicate had overridden',
    processCSS(
      'a{border-left:dashed blue;border-color:red;border-bottom-color:green;border-bottom-color:red}',
      'a{border-left:dashed blue;border-color:red;border-bottom-color:red}'
    )
  );

  test(
    'should keep the last of a run of duplicate longhands',
    processCSS(
      'a{border-left:medium dashed blue;border-color:red red;border-bottom-color:currentcolor;border-bottom-color:blue;border-bottom-color:red}',
      'a{border-color:red;border-left-width:medium;border-left-style:dashed}'
    )
  );

  /* `border-top` and `border-color` reach the same longhand, `border-top-color`,
   * while neither property name contains the other, so a subset test on the two
   * names cannot see that they collide. A merge that moves one of them past the
   * other has to weigh it, or the side quietly takes back a component something
   * else had already set. */

  test(
    'should not move a side shorthand past a component shorthand that overrode it',
    processCSS(
      'a{border:medium none #fff;border-left:thick;border:solid #abc123;border-width:1px medium 1px 0;border-left:1px}',
      'a{border:1px solid #abc123;border-right-width:medium;border-left:1px}'
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
