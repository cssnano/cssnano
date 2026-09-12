import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import postcss from 'postcss';
import cssnanoUtils from 'cssnano-utils';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
  isValidLengthPercentage,
} from '../src/lib/validateRadius.js';
import { reduceBorderRadius } from '../src/lib/decl/borderRadiusReducer.js';

const { tokens } = cssnanoUtils;
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('border-radius merging', () => {
  test(
    'should merge 4 identical corner longhands into a 1-value shorthand',
    processCSS(
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
      'a{border-radius:10px}'
    )
  );

  test(
    'should merge 4 corner longhands with 2-value diagonal symmetry',
    processCSS(
      'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:10px;border-bottom-left-radius:20px}',
      'a{border-radius:10px 20px}'
    )
  );

  test(
    'should merge 4 corner longhands with 3-value symmetry',
    processCSS(
      'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:30px;border-bottom-left-radius:20px}',
      'a{border-radius:10px 20px 30px}'
    )
  );

  test(
    'should merge 4 distinct corner longhands into a 4-value shorthand',
    processCSS(
      'a{border-top-left-radius:10px;border-top-right-radius:20px;border-bottom-right-radius:30px;border-bottom-left-radius:40px}',
      'a{border-radius:10px 20px 30px 40px}'
    )
  );

  test(
    'should merge two-value corner longhands into a slash-separated shorthand',
    processCSS(
      'a{border-top-left-radius:10px 20px;border-top-right-radius:10px 20px;border-bottom-right-radius:10px 20px;border-bottom-left-radius:10px 20px}',
      'a{border-radius:10px/20px}'
    )
  );

  test(
    'should merge mixed two-value corner longhands with independent axis compression',
    processCSS(
      'a{border-top-left-radius:10px 5px;border-top-right-radius:20px 5px;border-bottom-right-radius:10px 5px;border-bottom-left-radius:20px 5px}',
      'a{border-radius:10px 20px/5px}'
    )
  );

  test(
    'should omit slash when horizontal and vertical vectors are equal',
    processCSS(
      'a{border-top-left-radius:10px 10px;border-top-right-radius:10px 10px;border-bottom-right-radius:10px 10px;border-bottom-left-radius:10px 10px}',
      'a{border-radius:10px}'
    )
  );

  test(
    'should merge unitless zero lengths',
    processCSS(
      'a{border-top-left-radius:0;border-top-right-radius:0;border-bottom-right-radius:0;border-bottom-left-radius:0}',
      'a{border-radius:0}'
    )
  );

  test(
    'should merge percentage values',
    processCSS(
      'a{border-top-left-radius:50%;border-top-right-radius:50%;border-bottom-right-radius:50%;border-bottom-left-radius:50%}',
      'a{border-radius:50%}'
    )
  );

  test(
    'should merge corner longhands in !important lane',
    processCSS(
      'a{border-top-left-radius:10px!important;border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;border-bottom-left-radius:10px!important}',
      'a{border-radius:10px!important}'
    )
  );

  test(
    'should preserve mixed importance lanes',
    passthroughCSS(
      'a{border-top-left-radius:10px!important;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    )
  );

  test(
    'should merge longhands across interleaved unrelated properties',
    processCSS(
      'a{border-top-left-radius:10px;color:red;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
      'a{color:red;border-radius:10px}'
    )
  );

  test(
    'should optimize both physical borders and border-radius within the same rule',
    processCSS(
      'a{border:none;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
      'a{border:1px solid red;border-radius:10px}'
    )
  );

  test(
    'should normalize standalone 4-value shorthand to 1-value',
    processCSS('a{border-radius:10px 10px 10px 10px}', 'a{border-radius:10px}')
  );

  test(
    'should normalize standalone slash shorthand when axes match',
    processCSS(
      'a{border-radius:10px 10px 10px 10px / 10px 10px 10px 10px}',
      'a{border-radius:10px}'
    )
  );

  test(
    'should normalize standalone slash shorthand without spaces around slash',
    processCSS('a{border-radius:10px 10px/10px 10px}', 'a{border-radius:10px}')
  );

  test(
    'should keep distinct axes when normalizing standalone slash shorthand',
    processCSS(
      'a{border-radius:10px 10px 10px 10px / 20px 20px 20px 20px}',
      'a{border-radius:10px/20px}'
    )
  );

  test(
    'should normalize a standalone corner longhand with identical horizontal and vertical values',
    processCSS(
      'a{border-top-left-radius:10px 10px}',
      'a{border-top-left-radius:10px}'
    )
  );

  test(
    'should preserve a standalone corner longhand with differing horizontal and vertical values',
    passthroughCSS('a{border-top-left-radius:10px 20px}')
  );

  test(
    'should replace existing shorthand when all 4 corners are redefined after it',
    processCSS(
      'a{border-radius:5px;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}',
      'a{border-radius:10px}'
    )
  );

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
    passthroughCSS(
      'a{border-radius:10px;border-top-left-radius:max(10px, 2vw)}'
    )
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
    'should merge uppercase property names',
    processCSS(
      'a{BORDER-TOP-LEFT-RADIUS:10px;BORDER-TOP-RIGHT-RADIUS:10px;BORDER-BOTTOM-RIGHT-RADIUS:10px;BORDER-BOTTOM-LEFT-RADIUS:10px}',
      'a{border-radius:10px}'
    )
  );

  test(
    'should merge mixed-case property names',
    processCSS(
      'a{Border-Top-Left-Radius:10px;Border-Top-Right-Radius:10px;Border-Bottom-Right-Radius:10px;Border-Bottom-Left-Radius:10px}',
      'a{border-radius:10px}'
    )
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

  test(
    'should parse and preserve 3-value shorthand',
    passthroughCSS('a{border-radius:10px 20px 30px}')
  );

  test(
    'should parse and minify 3-value shorthand with slash',
    processCSS(
      'a{border-radius:10px 20px 30px / 5px}',
      'a{border-radius:10px 20px 30px/5px}'
    )
  );

  test('should reduce border-radius when declarations argument is omitted', () => {
    const root = postcss.parse(
      'a{border-top-left-radius:10px;border-top-right-radius:10px;border-bottom-right-radius:10px;border-bottom-left-radius:10px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceBorderRadius(rule);
    assert.equal(rule.toString(), 'a{border-radius:10px}');
  });

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
    'should retain earlier corner fallback when followed by shorthand requiring new support',
    passthroughCSS('a{border-top-left-radius:10px;border-radius:max(10px,2vw)}')
  );
});
