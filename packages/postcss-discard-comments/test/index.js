'use strict';
const { test } = require('uvu');
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
test.run();
