import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'preserves an inset() function in box-shadow',
  passthroughCSS('a{box-shadow:red 2px 5px inset()}')
);

test(
  'preserves box-shadow with modern math functions',
  passthroughCSS(
    'a{box-shadow:round(2px, 1px) 0 0 #000;box-shadow:hypot(3px, 4px) 0 0 #000;box-shadow:0 0 abs(-5px) red;box-shadow:sign(10px) 0 0 blue;box-shadow:0 0 mod(10px, 3px) green}'
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
    'a{box-shadow:calc(1px + 1em) 0 0 red}'
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
