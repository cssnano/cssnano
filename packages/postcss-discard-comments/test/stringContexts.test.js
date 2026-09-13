import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('String contexts and URLs', () => {
  test(
    'should not remove comments inside URL strings with double quotes',
    passthroughCSS('h1{background:url("http://example.com/*comment*/")}')
  );

  test(
    'should not remove comments inside URL strings with single quotes',
    passthroughCSS("h1{background:url('http://example.com/*comment*/')}")
  );

  test(
    'should not remove comments inside content property with double quotes',
    passthroughCSS('h1::before{content:"/* not a comment */"}')
  );

  test(
    'should not remove comments inside content property with single quotes',
    passthroughCSS("h1::before{content:'/* not a comment */'}")
  );

  test(
    'should handle escaped quotes in strings',
    passthroughCSS(
      'h1::before{content:"escaped quote: \\"/* not comment */\\""}'
    )
  );

  test(
    'should handle escaped quotes in single quote strings',
    passthroughCSS(
      "h1::before{content:'escaped quote: \\'/* not comment */\\''}"
    )
  );

  test(
    'should remove real comments but preserve string comments',
    processCSS(
      'h1{background:url("http://example.com/*fake*/") /* real comment */}',
      'h1{background:url("http://example.com/*fake*/")}'
    )
  );

  test(
    'should handle complex mixed scenarios',
    processCSS(
      '.class{background:url("data:image/svg+xml,<svg>/*fake*/</svg>") /* real */; content:"/*fake*/" /* real */}',
      '.class{background:url("data:image/svg+xml,<svg>/*fake*/</svg>"); content:"/*fake*/"}'
    )
  );

  test(
    'should handle multiple strings with comments',
    processCSS(
      'h1{content:"/*fake1*/" /* real1 */; background:url("/*fake2*/") /* real2 */}',
      'h1{content:"/*fake1*/"; background:url("/*fake2*/")}'
    )
  );

  test(
    'should handle unclosed strings gracefully',
    processCSS(
      'h1{content:"closed string" /* comment */; color:red}',
      'h1{content:"closed string"; color:red}'
    )
  );

  test(
    'should handle empty strings',
    processCSS(
      'h1{content:"" /* comment */; background:url(\'\') /* comment */}',
      'h1{content:""; background:url(\'\')}'
    )
  );

  test(
    'should handle nested quotes correctly',
    passthroughCSS('h1{content:"outer \\"inner /* comment */ inner\\" outer"}')
  );

  test(
    'should handle data URLs with embedded CSS',
    passthroughCSS(
      'h1{background:url("data:text/css,.test{color:red/*comment*/}")}'
    )
  );

  test(
    'should handle SVG data URLs with comments',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml;utf8,<svg>\\3c !-- comment -->\\3c style>/*css comment*/\\3c /style></svg>")}'
    )
  );

  test(
    'should handle calc() with string values',
    processCSS(
      'h1{width:calc(100% - 20px) /* comment */; content:"calc(/*fake*/)" /* real */}',
      'h1{width:calc(100% - 20px); content:"calc(/*fake*/)"}'
    )
  );

  test(
    'should handle attribute selectors with comments in strings',
    processCSS(
      '[data-content="/* not comment */"] /* real comment */ {color:red}',
      '[data-content="/* not comment */"]{color:red}'
    )
  );

  test(
    'should handle multiple escaped characters',
    passthroughCSS('h1{content:"\\22 /* not comment */ \\22 "}')
  );

  test(
    'should handle backslash at end of string',
    processCSS('h1{content:"test\\\\"} /* comment */', 'h1{content:"test\\\\"}')
  );

  test(
    'should handle comments in keyframe names with strings',
    processCSS(
      '@keyframes "slide-in" /* comment */ {from{opacity:0}}',
      '@keyframes "slide-in"{from{opacity:0}}'
    )
  );
});
