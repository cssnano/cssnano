'use strict';
const { test } = require('node:test');
const vars = require('postcss-simple-vars');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove non-special comments',
  processCSS(
    'h1{font-weight:700!important/*test comment*/}',
    'h1{font-weight:700!important}'
  )
);

test(
  'should remove non-special comments 2',
  processCSS('h1{/*test comment*/font-weight:700}', 'h1{font-weight:700}')
);

test(
  'should remove non-special comments 3',
  processCSS(
    '/*test comment*/h1{font-weight:700}/*test comment*/',
    'h1{font-weight:700}'
  )
);

test(
  'should remove non-special comments 4',
  processCSS('h1{font-weight:/*test comment*/700}', 'h1{font-weight:700}')
);

test(
  'should remove non-special comments 5',
  processCSS('h1{margin:10px/*test*/20px}', 'h1{margin:10px 20px}')
);

test(
  'should remove non-special comments 6',
  processCSS(
    'h1{margin:10px /*test*/ 20px /*test*/ 30px /*test*/ 40px}',
    'h1{margin:10px 20px 30px 40px}'
  )
);

test(
  'should remove non-special comments 7',
  processCSS('/*comment*/*/*comment*/{margin:10px}', '*{margin:10px}')
);

test(
  'should remove non-special comments 8',
  processCSS(
    'h1,/*comment*/ h2, h3/*comment*/{margin:20px}',
    'h1, h2, h3{margin:20px}'
  )
);

test(
  'should remove non-special comments 9',
  processCSS(
    '@keyframes /*test*/ fade{0%{opacity:0}to{opacity:1}}',
    '@keyframes fade{0%{opacity:0}to{opacity:1}}'
  )
);

test(
  'should remove non-special comments 10',
  processCSS(
    '@media only screen /*desktop*/ and (min-width:900px){body{margin:0 auto}}',
    '@media only screen and (min-width:900px){body{margin:0 auto}}'
  )
);

test(
  'should remove non-special comments 11',
  processCSS(
    '@media only screen and (min-width:900px)/*test*/{body{margin:0 auto}}',
    '@media only screen and (min-width:900px){body{margin:0 auto}}'
  )
);

test(
  'should remove non-special comments 12',
  processCSS('h1{margin/*test*/:20px}', 'h1{margin:20px}')
);

test(
  'should remove non-special comments 13',
  processCSS(
    'h1{margin:20px! /* test */ important}',
    'h1{margin:20px!important}'
  )
);

test(
  'should keep special comments',
  passthroughCSS('h1{font-weight:700!important/*!test comment*/}')
);

test(
  'should keep special comments 2',
  passthroughCSS('h1{/*!test comment*/font-weight:700}')
);

test(
  'should keep special comments 3',
  passthroughCSS('/*!test comment*/h1{font-weight:700}/*!test comment*/')
);

test(
  'should keep special comments 4',
  passthroughCSS('h1{font-weight:/*!test comment*/700}')
);

test(
  'should keep special comments 5',
  passthroughCSS('h1{margin:10px/*!test*/20px}')
);

test(
  'should keep special comments 6',
  passthroughCSS('h1{margin:10px /*!test*/ 20px /*!test*/ 30px /*!test*/ 40px}')
);

test(
  'should keep special comments 7',
  passthroughCSS('/*!comment*/*/*!comment*/{margin:10px}')
);

test(
  'should keep special comments 8',
  passthroughCSS('h1,/*!comment*/h2,h3/*!comment*/{margin:20px}')
);

test(
  'should keep special comments 9',
  passthroughCSS('@keyframes /*!test*/ fade{0%{opacity:0}to{opacity:1}}')
);

test(
  'should keep special comments 10',
  passthroughCSS(
    '@media only screen /*!desktop*/ and (min-width:900px){body{margin:0 auto}}'
  )
);

test(
  'should keep special comments 11',
  passthroughCSS(
    '@media only screen and (min-width:900px)/*!test*/{body{margin:0 auto}}'
  )
);

test(
  'should keep special comments 12',
  passthroughCSS('h1{margin/*!test*/:20px}')
);

test(
  'should keep special comments 13',
  passthroughCSS('h1{margin:20px! /*! test */ important}')
);

test(
  'should keep special comments 14',
  passthroughCSS('h1 /*!test comment*/, h2{color:#00f}')
);

test(
  'should keep special comments 15',
  passthroughCSS('h1 /*!test comment*/ span, h2{color:#00f}')
);

test(
  'should remove comments marked as @ but keep other',
  processCSS(
    '/* keep *//*@ remove */h1{color:#000;/*@ remove */font-weight:700}',
    '/* keep */h1{color:#000;font-weight:700}',
    { remove: (comment) => comment[0] === '@' }
  )
);

test(
  'should remove all important comments, with a flag',
  processCSS(
    '/*!license*/h1{font-weight:700}/*!license 2*/h2{color:#000}',
    'h1{font-weight:700}h2{color:#000}',
    { removeAll: true }
  )
);

test(
  'should remove all important comments but the first, with a flag',
  processCSS(
    '/*!license*/h1{font-weight:700}/*!license 2*/h2{color:#000}',
    '/*!license*/h1{font-weight:700}h2{color:#000}',
    { removeAllButFirst: true }
  )
);

test(
  'should remove non-special comments that have exclamation marks',
  processCSS(
    '/* This makes a heading black! Wow! */h1{color:#000}',
    'h1{color:#000}'
  )
);

test(
  'should remove block comments',
  processCSS(
    '/*\n\n# Pagination\n\n...\n\n*/.pagination{color:#000}',
    '.pagination{color:#000}'
  )
);

test(
  'should remove only a comment',
  processCSS(
    '.a /*comment*/ [attr="/* not a comment */"]{color:#000}',
    '.a [attr="/* not a comment */"]{color:#000}'
  )
);

test(
  'should remove only a comment 2',
  processCSS(
    '.a [attr="/* not a comment */"] /*comment*/, .b {color:#000}',
    '.a [attr="/* not a comment */"], .b{color:#000}'
  )
);

test(
  'should remove only a comment 3',
  processCSS(
    ':not(/*comment*/ [attr="/* not a comment */"]){color:#000}',
    ':not( [attr="/* not a comment */"]){color:#000}'
  )
);

test(
  'should remove comments in selector',
  processCSS('.x/*comment*/.y{color:#000}', '.x.y{color:#000}')
);

test(
  'should remove comments in pseudo-class-function',
  processCSS(':not(/*comment*/.foo){color:#000}', ':not(.foo){color:#000}')
);

test(
  'should remove comments in @rule param',
  processCSS(
    '@media/*a*/screen/*b*/and/*c*/(min-width:/*d*/900px)/*e*/{color: red}',
    '@media screen and (min-width: 900px){color:red}'
  )
);

test(
  "should pass through when it doesn't find a comment",
  passthroughCSS('h1{color:#000;font-weight:700}')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should pass through at rules without comments',
  passthroughCSS('@page{body{font-size:1em}}')
);

const { processCSS: singleLine } = processCSSFactory(plugin);

test(
  'should work with single line comments',
  singleLine('//!wow\n//wow\nh1{//color:red\n}', '//!wow\nh1{\n}', {
    syntax: require('postcss-scss'),
  })
);

const { processCSS: otherPlugins } = processCSSFactory([vars(), plugin]);

test(
  'should handle comments from other plugins',
  otherPlugins(
    '$color: red; :root { box-shadow: inset 0 -10px 12px 0 $color, /* some comment */ inset 0 0 5px 0 $color; }',
    ':root{ box-shadow:inset 0 -10px 12px 0 red, inset 0 0 5px 0 red; }'
  )
);

// New tests for string context awareness
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
  passthroughCSS('h1::before{content:"escaped quote: \\"/* not comment */\\""}')
);

test(
  'should handle escaped quotes in single quote strings',
  passthroughCSS("h1::before{content:'escaped quote: \\'/* not comment */\\''}")
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
  passthroughCSS('h1{background:url("data:text/css,.test{color:red/*comment*/}")}')
);

test(
  'should handle SVG data URLs with comments',
  passthroughCSS('h1{background:url("data:image/svg+xml;utf8,<svg><!-- comment --><style>/*css comment*/</style></svg>")}')
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
  processCSS(
    'h1{content:"test\\\\"} /* comment */',
    'h1{content:"test\\\\"}'
  )
);

test(
  'should handle comments in keyframe names with strings',
  processCSS(
    '@keyframes "slide-in" /* comment */ {from{opacity:0}}',
    '@keyframes "slide-in"{from{opacity:0}}'
  )
);
