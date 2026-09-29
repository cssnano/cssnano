import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
  isValidLengthPercentage,
} from '../src/lib/validateRadius.js';

const { tokens } = cssnanoUtils;
const { passthroughCSS } = processCSSFactory(plugin);

test(
  'should reject negative radius values and preserve original declarations',
  passthroughCSS(
    'a{border-top-left-radius:-1px;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should reject unitless non-zero values',
  passthroughCSS(
    'a{border-top-left-radius:5;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should reject unknown dimension units',
  passthroughCSS(
    'a{border-top-left-radius:10foo;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should reject invalid property values',
  passthroughCSS(
    'a{border-top-left-radius:solid;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should preserve declarations when logical corner properties are present',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px;border-start-start-radius:20px}'
  )
);

test(
  'should preserve declarations with uniform CSS-wide keywords',
  passthroughCSS(
    'a{border-top-left-radius:inherit;border-top-right-radius:inherit;border-bottom-right-radius:inherit;border-bottom-left-radius:inherit}'
  )
);

test(
  'should preserve declarations with mixed CSS-wide keywords',
  passthroughCSS(
    'a{border-top-left-radius:inherit;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should preserve declarations with custom properties',
  passthroughCSS(
    'a{border-top-left-radius:var(--r);border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should reject malformed trailing slash in shorthand',
  passthroughCSS('a{border-radius:10px /}')
);

test(
  'should preserve style hacks on radius properties',
  passthroughCSS(
    'a{_border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should fail closed on comments inside shorthand values',
  passthroughCSS('a{border-radius:10px /* comment */ 20px}')
);

test(
  'should fail closed on comments inside corner longhand values',
  passthroughCSS('a{border-top-left-radius:10px /* comment */ 20px}')
);

test(
  'should fail closed on two slashes in shorthand',
  passthroughCSS('a{border-radius:10px / 20px / 30px}')
);

test('should fail closed on unbalanced function in validateRadius parser', () => {
  assert.equal(parseRadiusShorthand('calc(10px + 5px'), null);
  assert.equal(parseCornerRadius('calc(10px'), null);
});

test(
  'should fail closed on slash in corner longhand',
  passthroughCSS('a{border-top-left-radius:10px / 20px}')
);

test(
  'should fail closed on unspaced slash in corner longhand',
  passthroughCSS('a{border-top-left-radius:10px/20px}')
);

test(
  'should fail closed on more than 4 horizontal values in shorthand',
  passthroughCSS('a{border-radius:1px 2px 3px 4px 5px}')
);

test(
  'should fail closed on more than 4 vertical values in shorthand',
  passthroughCSS('a{border-radius:1px / 1px 2px 3px 4px 5px}')
);

test(
  'should fail closed on more than 2 values in corner longhand',
  passthroughCSS('a{border-top-left-radius:1px 2px 3px}')
);

test(
  'should fail closed on string tokens in corner longhand',
  passthroughCSS('a{border-top-left-radius:"10px"}')
);

test(
  'should preserve whitespace-padded CSS-wide keywords across all corners',
  passthroughCSS(
    'a{border-top-left-radius:  inherit  ;border-top-right-radius:inherit;border-bottom-right-radius:inherit;border-bottom-left-radius:inherit}'
  )
);

test(
  'should preserve whitespace-padded CSS-wide keyword mixed with lengths',
  passthroughCSS(
    'a{border-top-left-radius:  initial  ;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should preserve whitespace-padded CSS-wide keyword on shorthand',
  passthroughCSS('a{border-radius:  unset  }')
);

test(
  'should reset shorthand when followed by whitespace-padded CSS-wide keyword',
  passthroughCSS(
    'a{border-radius:10px;border-top-left-radius:  inherit  ;border-top-right-radius:inherit;border-bottom-right-radius:inherit;border-bottom-left-radius:inherit}'
  )
);

test(
  'should reset active slots on mid-stream invalid shorthand',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-radius:invalid;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should reset active slots on mid-stream invalid corner longhand',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:invalid;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test(
  'should reset active slots on shorthand with style hack',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-radius:10px \\9;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
  )
);

test('isValidLengthPercentage returns false for multi-token terms', () => {
  assert.equal(
    isValidLengthPercentage('10px 20px', tokens('10px 20px')),
    false
  );
});

test(
  'should reject invalid values beginning with a trusted function and preserve declarations',
  passthroughCSS(
    'a{border-top-left-radius:calc(1px)foo;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}'
  )
);

test(
  'should preserve global keyword shorthand followed by corner longhand',
  passthroughCSS('a{border-radius:inherit;border-top-left-radius:10px}')
);

test(
  'should reject invalid mid-stream corner longhand in 4-corner rule and leave declarations untouched',
  passthroughCSS(
    'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:invalid;border-bottom-left-radius:10px}'
  )
);
