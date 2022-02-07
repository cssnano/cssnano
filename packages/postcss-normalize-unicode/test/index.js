'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
  'should convert a unicode range to a wildcard range',
  processCSS(
    fixture('u+2b00-2bff'), // Miscellaneous Symbols and Arrows
    fixture('u+2b??'),
    { env: 'not ie' }
  )
);

test(
  'should convert a unicode range to a wildcard range (2)',
  processCSS(
    fixture('u+1e00-1eff'), // Latin Extended Additional
    fixture('u+1e??'),
    { env: 'not ie' }
  )
);

test(
  'should convert a unicode range to a wildcard range (3)',
  processCSS(fixture('u+2120-212f'), fixture('u+212?'), { env: 'not ie' })
);

test(
  'should convert a unicode range to a wildcard range (4)',
  processCSS(fixture('u+2100-21ff'), fixture('u+21??'), { env: 'not ie' })
);

test(
  'should convert a unicode range to a wildcard range (5)',
  processCSS(fixture('u+2000-2fff'), fixture('u+2???'), { env: 'not ie' })
);

test(
  'should pass through a unicode range that cannot be reduced',
  passthroughCSS(
    fixture('u+0-7f'), // Basic Latin
    { env: 'not ie' }
  )
);

test(
  'should pass through a unicode range that cannot be reduced (2)',
  passthroughCSS(fixture('u+2125-2128'), { env: 'not ie' })
);

test(
  'should pass through a unicode range that cannot be reduced (3)',
  passthroughCSS(fixture('u+2012-2f12'), { env: 'not ie' })
);

test(
  'should pass through a unicode range that cannot be reduced (4)',
  passthroughCSS(fixture('u+2002-2ff2'), { env: 'not ie' })
);

test(
  'should pass through css variables',
  passthroughCSS(fixture('var(--caseInsensitive)'))
);

test(
  'should pass through env variables',
  passthroughCSS(fixture('env(foo-bar)'))
);

test('should pass through initial', passthroughCSS(fixture('initial')));

test(
  'should pass through unknown property',
  passthroughCSS('new-property: u+2b00-2bff')
);

test(
  'should downcase the unicode-range property/value pair',
  processCSS(
    '@font-face{font-family:test;UNICODE-RANGE:U+07-F}*{font-family:test}',
    '@font-face{font-family:test;UNICODE-RANGE:u+07-f}*{font-family:test}',
    { env: 'not ie' }
  )
);

test(
  'should upcase the "u" prefix (IE)',
  processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), { env: 'ie9' })
);

test(
  'should upcase the "u" prefix (Edge 15)',
  processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), { env: 'edge15' })
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
