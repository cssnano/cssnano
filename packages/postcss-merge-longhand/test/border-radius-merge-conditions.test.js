import { test, describe } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('all reset boundaries', () => {
  test(
    'should not merge physical corners across a normal all reset',
    passthroughCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:2px;all:initial;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
    )
  );

  test(
    'should not merge physical corners across an important all reset',
    passthroughCSS(
      'a{border-top-left-radius:1px!important;border-top-right-radius:2px!important;all:unset!important;border-bottom-right-radius:3px!important;border-bottom-left-radius:4px!important}'
    )
  );

  test(
    'should merge physical corners across an invalid all declaration in the opposite lane',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:2px;all:invalid!important;border-bottom-right-radius:3px;border-bottom-left-radius:4px}',
      'a{all:invalid!important;border-radius:1px 2px 3px 4px}'
    )
  );

  test(
    'should reduce complete physical corner groups on both sides of an all reset',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;all:initial;border-top-left-radius:2px;border-top-right-radius:2px;border-bottom-right-radius:2px;border-bottom-left-radius:2px}',
      'a{border-radius:1px;all:initial;border-radius:2px}'
    )
  );

  test(
    'should recognize a case-insensitive ALL reset between physical corners',
    passthroughCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:2px;ALL:initial;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
    )
  );
});

test(
  'should merge complete normal and !important lanes independently within the same rule',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px;border-top-left-radius:20px!important;border-top-right-radius:20px!important;border-bottom-right-radius:20px!important;border-bottom-left-radius:20px!important}',
    'a{border-radius:10px;border-radius:20px!important}'
  )
);

test(
  'should merge interleaved complete normal and !important lanes',
  processCSS(
    'a{border-top-left-radius:10px;border-top-left-radius:20px!important;border-top-right-radius:10px;border-top-right-radius:20px!important;border-bottom-right-radius:10px;border-bottom-right-radius:20px!important;border-bottom-left-radius:10px;border-bottom-left-radius:20px!important}',
    'a{border-radius:10px;border-radius:20px!important}'
  )
);

test(
  'should normalize normal shorthand alongside an incomplete !important lane',
  processCSS(
    'a{border-radius:10px 10px 10px 10px;border-top-left-radius:20px!important}',
    'a{border-radius:10px;border-top-left-radius:20px!important}'
  )
);

test(
  'should preserve env() fallback on corner longhand',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-top-left-radius:env(safe-area-inset-top);border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should preserve shorthand when followed by env() corner fallback',
  passthroughCSS(
    'a{border-radius:10px;border-top-left-radius:env(safe-area-inset-top)}'
  )
);

test(
  'should preserve shorthand when followed by constant() corner fallback',
  passthroughCSS(
    'a{border-radius:10px;border-top-left-radius:constant(safe-area-inset-top)}'
  )
);

test(
  'should preserve shorthand when followed by math/conditional function fallback',
  passthroughCSS('a{border-radius:10px;border-top-left-radius:max(10px, 2vw)}')
);

test(
  'should preserve shorthand when followed by another shorthand requiring new support',
  passthroughCSS('a{border-radius:10px;border-radius:max(10px, 2vw)}')
);

test(
  'should retain earlier corner fallback when all corners complete with supported math function',
  processCSS(
    'a{border-top-left-radius:10px;border-top-left-radius:max(10px,2vw);border-top-right-radius:max(10px,2vw);border-bottom-right-radius:max(10px,2vw);border-bottom-left-radius:max(10px,2vw)}',
    'a{border-top-left-radius:10px;border-radius:max(10px,2vw)}'
  )
);

test(
  'should merge with radius declarations before border declarations',
  processCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px;border:none;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
    'a{border-radius:10px;border:1px solid red}'
  )
);

test(
  'should merge with border declarations before radius declarations',
  processCSS(
    'a{border:none;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
    'a{border:1px solid red;border-radius:10px}'
  )
);

test(
  'should merge fully interleaved border and radius declarations',
  processCSS(
    'a{border:none;border-top:1px solid red;border-top-left-radius:10px;border-right:1px solid red;border-top-right-radius:10px;border-bottom:1px solid red;border-bottom-right-radius:10px;border-left:1px solid red;border-bottom-left-radius:10px}',
    'a{border:1px solid red;border-radius:10px}'
  )
);

test(
  'should retain earlier corner fallback when followed by shorthand requiring new support',
  passthroughCSS('a{border-top-left-radius:10px;border-radius:max(10px,2vw)}')
);

test(
  'should reduce complete physical corner groups across multiple all resets',
  processCSS(
    'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;all:initial;border-top-left-radius:2px;border-top-right-radius:2px;border-bottom-right-radius:2px;border-bottom-left-radius:2px;all:unset;border-top-left-radius:3px;border-top-right-radius:3px;border-bottom-right-radius:3px;border-bottom-left-radius:3px}',
    'a{border-radius:1px;all:initial;border-radius:2px;all:unset;border-radius:3px}'
  )
);

test(
  'should not merge corner longhands across an intervening stylehacked shorthand',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-radius:10px \\9;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

describe('newer syntax a browser may reject', () => {
  test(
    'should keep border-radius:1px before border-radius:5dvh because browsers without dynamic viewport units fall back to 1px',
    passthroughCSS('a{border-radius:1px;border-radius:5dvh}')
  );

  test(
    'should keep a corner before a border-radius using dvh because the shorthand is dropped where dvh is unsupported',
    passthroughCSS('a{border-top-left-radius:1px;border-radius:5dvh}')
  );
});

describe('full vector reset', () => {
  test(
    'should commit the merged radius before a top-left corner needing newer support',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-top-left-radius:max(10px,2vw)}',
      'a{border-radius:1px;border-top-left-radius:max(10px,2vw)}'
    )
  );

  test(
    'should commit the merged radius before a top-right corner needing newer support',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-top-right-radius:max(10px,2vw)}',
      'a{border-radius:1px;border-top-right-radius:max(10px,2vw)}'
    )
  );

  test(
    'should commit the merged radius before a bottom-right corner needing newer support',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-bottom-right-radius:max(10px,2vw)}',
      'a{border-radius:1px;border-bottom-right-radius:max(10px,2vw)}'
    )
  );

  test(
    'should commit the merged radius before a bottom-left corner needing newer support',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-bottom-left-radius:max(10px,2vw)}',
      'a{border-radius:1px;border-bottom-left-radius:max(10px,2vw)}'
    )
  );

  test(
    'should commit the merged radius before a shorthand needing newer support',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-radius:max(10px,2vw)}',
      'a{border-radius:1px;border-radius:max(10px,2vw)}'
    )
  );

  test(
    'should not merge a full vector across a shorthand CSS-wide keyword',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-radius:inherit}',
      'a{border-radius:1px;border-radius:inherit}'
    )
  );

  test(
    'should drop the overridden corner when a CSS-wide keyword replaces it',
    processCSS(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-top-left-radius:inherit}',
      'a{border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;border-top-left-radius:inherit}'
    )
  );
});
