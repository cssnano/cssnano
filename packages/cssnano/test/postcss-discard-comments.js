'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should remove non-special comments',
  processCss(
    'h1{font-weight:700!important/*test comment*/}',
    'h1{font-weight:700!important}'
  )
);

test(
  'should remove non-special comments 2',
  processCss('h1{/*test comment*/font-weight:700}', 'h1{font-weight:700}')
);

test(
  'should remove non-special comments 3',
  processCss(
    '/*test comment*/h1{font-weight:700}/*test comment*/',
    'h1{font-weight:700}'
  )
);

test(
  'should remove non-special comments 4',
  processCss('h1{font-weight:/*test comment*/700}', 'h1{font-weight:700}')
);

test(
  'should remove non-special comments 5',
  processCss('h1{margin:10px/*test*/20px}', 'h1{margin:10px 20px}')
);

test(
  'should remove non-special comments 6',
  processCss(
    'h1{margin:10px /*test*/ 20px /*test*/ 10px /*test*/ 20px}',
    'h1{margin:10px 20px}'
  )
);

test(
  'should remove non-special comments 7',
  processCss('/*comment*/*/*comment*/{margin:10px}', '*{margin:10px}')
);

test(
  'should remove non-special comments 8',
  processCss(
    'h1,/*comment*/ h2, h3/*comment*/{margin:20px}',
    'h1,h2,h3{margin:20px}'
  )
);

test(
  'should remove non-special comments 9',
  processCss(
    '@keyframes /*test*/ fade{0%{opacity:0}100%{opacity:1}}a{animation:fade}',
    '@keyframes fade{0%{opacity:0}to{opacity:1}}a{animation:fade}'
  )
);

test(
  'should remove non-special comments 10',
  processCss(
    '@media only screen /*desktop*/ and (min-width:900px){body{margin:0 auto}}',
    '@media only screen and (min-width:900px){body{margin:0 auto}}'
  )
);

test(
  'should remove non-special comments 11',
  processCss(
    '@media only screen and (min-width:900px)/*test*/{body{margin:0 auto}}',
    '@media only screen and (min-width:900px){body{margin:0 auto}}'
  )
);

test(
  'should remove non-special comments 12',
  processCss('h1{margin/*test*/:20px}', 'h1{margin:20px}')
);

test(
  'should remove non-special comments 13',
  processCss(
    'h1{margin:20px! /* test */ important}',
    'h1{margin:20px!important}'
  )
);

test(
  'should keep special comments',
  processCss(
    'h1{font-weight:700!important/*!test comment*/}',
    'h1{font-weight:700!important/*!test comment*/}'
  )
);

test(
  'should keep special comments 2',
  processCss(
    'h1{/*!test comment*/font-weight:700}',
    'h1{font-weight:700/*!test comment*/}'
  )
);

test(
  'should keep special comments 3',
  processCss(
    '/*!test comment*/h1{font-weight:700}/*!test comment*/',
    '/*!test comment*/h1{font-weight:700}/*!test comment*/'
  )
);

test(
  "should pass through when it doesn't find a comment",
  processCss('h1{color:#000;font-weight:700}', 'h1{color:#000;font-weight:700}')
);
test.run();
