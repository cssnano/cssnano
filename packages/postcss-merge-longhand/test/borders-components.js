import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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

  /* Every maths function fixes its type the same way `calc()` does, not just
   * `calc()` itself. */
  test(
    'should keep reading a min() as a width',
    processCSS(
      'h1{border-top-width:min(1px,2px);border-right-width:min(1px,2px);border-bottom-width:min(1px,2px);border-left-width:min(1px,2px)}',
      'h1{border-width:min(1px,2px)}'
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

  /* `border-width: none` is no width, so the browser ignores it and the rule is
   * left alone, down to the case its properties are written in. */
  test(
    'should produce the minimum css necessary (uppercase)',
    passthroughCSS('h1{BORDER-WIDTH:NONE;BORDER-TOP:1PX SOLID #E1E1E1}')
  );
});

suite('maths functions never stand in for a style or a colour', () => {
  /* `calc()`, `min()`, `max()` and their siblings fix their own type: always a
   * number or a length, so the only border component whose grammar accepts
   * them is the width. A user agent never reads a bare maths function as a
   * `<line-style>` keyword or a `<color>` — unlike `var()`/`env()`, whose type
   * stays unknowable until substitution and so can fill any of the three. */

  test(
    'should not merge a maths function into a border-style shorthand',
    passthroughCSS(
      'a{border-top-style:min(1px,2px);border-right-style:min(1px,2px);border-bottom-style:min(1px,2px);border-left-style:min(1px,2px)}'
    )
  );

  test(
    'should not merge a maths function into a border-color shorthand',
    passthroughCSS(
      'a{border-top-color:min(1px,2px);border-right-color:min(1px,2px);border-bottom-color:min(1px,2px);border-left-color:min(1px,2px)}'
    )
  );
});

test(
  'should produce the minimum css necessary (2)',
  passthroughCSS(
    'h1{border-color:rgba(0,0,0,.2);border-right-style:solid;border-right-width:1px}'
  )
);

test(
  'should produce the minimum css necessary (2) (uppercase)',
  passthroughCSS(
    'h1{BORDER-COLOR:RGBA(0,0,0,.2);BORDER-RIGHT-STYLE:SOLID;BORDER-RIGHT-WIDTH:1PX}'
  )
);

suite('component merging', () => {
  /* Exploding a shorthand and merging the pieces back can answer with more
   * declarations than it was given: three component shorthands where the
   * stylesheet wrote a `border` and a `border-color`. Whatever the pipeline
   * arrives at, a rule it leaves longer than it found is one to put back. */

  test(
    'should not grow a rule by spreading a border across its components',
    processCSS(
      'h1{border:1px solid red;border-color:red blue red blue}',
      'h1{border:1px solid;border-color:red blue}'
    )
  );

  test(
    'should not grow an important rule by spreading a border across its components',
    processCSS(
      'h1{border:1px solid red!important;border-color:red blue red blue!important}',
      'h1{border:1px solid!important;border-color:red blue!important}'
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
  passthroughCSS(
    'h1{BORDER-TOP:NONE;BORDER-RIGHT:NONE;BORDER-BOTTOM:NONE;BORDER-LEFT:5PX}'
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
    'h1{BORDER-COLOR:RED;_BORDER-WIDTH:1PX 1PX 1PX 1PX;BORDER-STYLE:SOLID}'
  )
);

test(
  'should not merge fallback colours',
  passthroughCSS('h1{border-color:#ddd;border-color:rgba(0,0,0,.15)}')
);

test(
  'should not merge fallback colours (uppercase)',
  passthroughCSS('h1{BORDER-COLOR:#DDD;BORDER-COLOR:RGBA(0,0,0,.15)}')
);

test(
  'should not merge fallback colours with color function',
  passthroughCSS(
    'h1{ border-color:rgb(37,45,49);border-color:color(display-p3 0.1451 0.1765 0.1922 / 1)}'
  )
);
