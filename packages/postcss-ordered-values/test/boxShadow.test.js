import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'preserves an inset() function in box-shadow',
  passthroughCSS('a{box-shadow:red 2px 5px inset()}')
);

test(
  'keeps modern math functions intact, dropping only the literal zero blur',
  processCSS(
    'a{box-shadow:round(2px, 1px) 0 0 #000;box-shadow:hypot(3px, 4px) 0 0 #000;box-shadow:0 0 abs(-5px) red;box-shadow:sign(10px) 0 0 blue;box-shadow:0 0 mod(10px, 3px) green}',
    'a{box-shadow:round(2px, 1px) 0 #000;box-shadow:hypot(3px, 4px) 0 #000;box-shadow:0 0 abs(-5px) red;box-shadow:sign(10px) 0 0 blue;box-shadow:0 0 mod(10px, 3px) green}'
  )
);

test(
  'fails closed on unknown functions in the color slot',
  passthroughCSS(
    'a{box-shadow:paint(foo) 2px 5px;box-shadow:foo(1) 2px 5px;box-shadow:rotate(2deg) 2px 5px}'
  )
);

test(
  'fails closed on image functions in the color slot',
  passthroughCSS('a{box-shadow:linear-gradient(red, blue) 2px 5px}')
);

test(
  'orders box-shadow with spec-defined color functions',
  processCSS(
    'a{box-shadow:rgb(0 0 0) 2px 5px;box-shadow:hsl(120deg 75% 25%) 2px 5px;box-shadow:color-mix(in srgb, red, blue) 2px 5px;box-shadow:lab(50% 40 20) 2px 5px;box-shadow:light-dark(red, blue) 2px 5px}',
    'a{box-shadow:2px 5px rgb(0 0 0);box-shadow:2px 5px hsl(120deg 75% 25%);box-shadow:2px 5px color-mix(in srgb, red, blue);box-shadow:2px 5px lab(50% 40 20);box-shadow:2px 5px light-dark(red, blue)}'
  )
);

test(
  'should pass through multi-item box-shadow containing none',
  passthroughCSS('a{box-shadow:none, red 2px 5px;box-shadow:red 2px 5px, none}')
);

test(
  'orders box-shadow with mixed-unit calc lengths',
  processCSS(
    'a{box-shadow:red calc(1px + 1em) 0 0}',
    'a{box-shadow:calc(1px + 1em) 0 red}'
  )
);

test(
  'should pass through box-shadow math that does not resolve to a length',
  passthroughCSS(
    'a{box-shadow:red calc(1px + 1%) 0 0;box-shadow:red sign(10px) 0 0;box-shadow:red calc(1px + 1s) 0 0}'
  )
);

describe('Order', () => {
  test(
    'should order box-shadow consistently (1)',
    processCSS('h1{box-shadow:2px 5px red}', 'h1{box-shadow:2px 5px red}')
  );

  test(
    'should order box-shadow consistently (2)',
    processCSS('h1{box-shadow:red 2px 5px}', 'h1{box-shadow:2px 5px red}')
  );

  test(
    'should order box-shadow consistently (2) (uppercase property and value)',
    processCSS('h1{BOX-SHADOW:RED 2PX 5PX}', 'h1{BOX-SHADOW:2PX 5PX RED}')
  );

  test(
    'should order box-shadow consistently (3)',
    processCSS(
      'h1{box-shadow:2px 5px 10px red}',
      'h1{box-shadow:2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (4)',
    processCSS(
      'h1{box-shadow:red 2px 5px 10px}',
      'h1{box-shadow:2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (5)',
    processCSS(
      'h1{box-shadow:inset red 2px 5px 10px}',
      'h1{box-shadow:inset 2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (6)',
    processCSS(
      'h1{box-shadow:red 2px 5px 10px inset}',
      'h1{box-shadow:inset 2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (6) (uppercase "inset")',
    processCSS(
      'h1{box-shadow:red 2px 5px 10px INSET}',
      'h1{box-shadow:INSET 2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (7)',
    processCSS(
      'h1{box-shadow:2px 5px 10px red inset}',
      'h1{box-shadow:inset 2px 5px 10px red}'
    )
  );

  test(
    'should order box-shadow consistently (8)',
    processCSS(
      'h1{box-shadow:red 2px 5px,blue 2px 5px}',
      'h1{box-shadow:2px 5px red,2px 5px blue}'
    )
  );

  test(
    'should order box-shadow consistently (9)',
    processCSS(
      'h1{box-shadow:red 2px 5px 10px inset,blue inset 2px 5px 10px}',
      'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
    )
  );

  test(
    'should order box-shadow consistently (10)',
    processCSS(
      'h1{box-shadow:red 2px 5px 10px inset,blue 2px 5px 10px inset}',
      'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
    )
  );

  test(
    'should order box-shadow consistently (11)',
    processCSS(
      'h1{box-shadow:rgba(255, 0, 0, 0.5) 2px 5px 10px inset}',
      'h1{box-shadow:inset 2px 5px 10px rgba(255, 0, 0, 0.5)}'
    )
  );

  test(
    'should order box-shadow consistently (12)',
    passthroughCSS('h1{box-shadow:0 0 3px}')
  );
});

describe('Trailing zero lengths', () => {
  test(
    'drops a zero blur and zero spread, which default to 0',
    processCSS('h1{box-shadow:0 50px 0 0 #fff}', 'h1{box-shadow:0 50px #fff}')
  );

  test(
    'drops only the zero spread when the blur is non-zero',
    processCSS(
      'h1{box-shadow:1px 2px 3px 0 red}',
      'h1{box-shadow:1px 2px 3px red}'
    )
  );

  test(
    'drops a zero blur when no spread follows',
    processCSS('h1{box-shadow:1px 2px 0 red}', 'h1{box-shadow:1px 2px red}')
  );

  test(
    'drops a zero blur and spread written with units',
    processCSS(
      'h1{box-shadow:1px 2px 0px 0em red}',
      'h1{box-shadow:1px 2px red}'
    )
  );

  test(
    'keeps zero offsets, which are required',
    processCSS('h1{box-shadow:0 0 0 0 #fff}', 'h1{box-shadow:0 0 #fff}')
  );

  test(
    'trims each shadow in a list and keeps inset',
    processCSS(
      'h1{box-shadow:red 1px 2px 0 0 inset,0 0 0 0 blue}',
      'h1{box-shadow:inset 1px 2px red,0 0 blue}'
    )
  );

  test(
    'keeps a zero blur before a non-zero spread, since the spread cannot be given without the blur',
    passthroughCSS('h1{box-shadow:0 0 0 5px red}')
  );

  test(
    'drops a zero written in uppercase units and with a sign',
    processCSS(
      'h1{box-shadow:1px 2px 0PX -0px red;box-shadow:1px 2px +0.0em 0 red}',
      'h1{box-shadow:1px 2px red;box-shadow:1px 2px red}'
    )
  );

  test(
    'drops trailing zeros in prefixed box-shadow and keeps !important',
    processCSS(
      'h1{-webkit-box-shadow:1px 2px 0 0 red!important}',
      'h1{-webkit-box-shadow:1px 2px red!important}'
    )
  );

  test(
    'drops a literal zero spread but keeps the calc() blur before it',
    processCSS(
      'h1{box-shadow:1px 2px calc(0px) 0 red}',
      'h1{box-shadow:1px 2px calc(0px) red}'
    )
  );

  test(
    'trims each shadow independently, keeping a zero blur before a non-zero spread',
    processCSS(
      'h1{box-shadow:0 0 0 5px red,1px 1px 0 0 blue}',
      'h1{box-shadow:0 0 0 5px red,1px 1px blue}'
    )
  );

  test(
    'leaves the whole list untouched when one shadow is invalid, so a valid sibling is not trimmed',
    passthroughCSS('h1{box-shadow:0 0 0 0 red,var(--x)}')
  );

  test(
    'leaves the list untouched when none is combined with a shadow, which is invalid',
    passthroughCSS('h1{box-shadow:none,0 0 0 0 red}')
  );

  test(
    'keeps a zero-valued calc() blur, which is not a literal zero',
    passthroughCSS('h1{box-shadow:1px 2px calc(0px) red}')
  );
});

describe('Pass', () => {
  test(
    'should pass through box-shadow values that contain calc()',
    passthroughCSS('h1{box-shadow: inset 0 calc(1em + 1px) 0 1px red}')
  );

  test(
    'should pass through box-shadow values that contain calc() (uppercase "calc")',
    passthroughCSS('h1{box-shadow: inset 0 CALC(1em + 1px) 0 1px red}')
  );

  test(
    'should pass through box-shadow values that contain prefixed calc()',
    passthroughCSS('h1{box-shadow: inset 0 -webkit-calc(1em + 1px) 0 1px red}')
  );

  test(
    'should pass through invalid box-shadow values',
    passthroughCSS('h1{box-shadow:1px solid rgba(34,36,38,.15)}')
  );

  test(
    'should pass through important comments (box-shadow)',
    passthroughCSS('box-shadow: 0 1px 3px /*!wow*/ red')
  );
});

describe('Pass through', () => {
  test(
    'should abort ordering when a var is detected (box-shadow)',
    passthroughCSS('box-shadow: 0 1px 3px var(--red)')
  );

  test(
    'should abort ordering when a var is detected (box-shadow) (uppercase "var")',
    passthroughCSS('box-shadow: 0 1px 3px VAR(--red)')
  );

  test(
    'should pass through box-shadow with CSS-wide keywords, invalid none, and quoted url',
    passthroughCSS(
      'h1{box-shadow:inherit 10px 10px;box-shadow:none 10px 10px;box-shadow:10px 10px url("foo.png")}'
    )
  );

  test(
    'should pass through box-shadow declarations with structural tokens',
    passthroughCSS(
      'a{box-shadow: (foo) 10px 10px;box-shadow: [foo] 10px 10px;box-shadow: @foo 10px 10px;box-shadow: 10px 10px (foo)}'
    )
  );

  test(
    'should pass through box-shadow with case-insensitive CSS-wide keywords and NONE',
    passthroughCSS(
      'h1{box-shadow: 10px 10px NONE;box-shadow: 10px 10px INHERIT;box-shadow: INITIAL 10px 10px}'
    )
  );
});
