'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should merge based on declarations',
  processCss('h1{display:block}h2{display:block}', 'h1,h2{display:block}')
);

test(
  'should merge based on declarations (2)',
  processCss(
    'h1{color:red;line-height:1.5;font-size:2em;}h2{color:red;line-height:1.5;font-size:2em;}',
    'h1,h2{color:red;font-size:2em;line-height:1.5}'
  )
);

test(
  'should merge based on declarations, with a different property order',
  processCss(
    'h1{color:red;line-height:1.5;font-size:2em;}h2{font-size:2em;color:red;line-height:1.5;}',
    'h1,h2{color:red;font-size:2em;line-height:1.5}'
  )
);

test(
  'should merge based on selectors',
  processCss(
    'h1{display:block}h1{text-decoration:underline}',
    'h1{display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (2)',
  processCss(
    'h1{color:red;display:block}h1{text-decoration:underline}',
    'h1{color:red;display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (3)',
  processCss(
    'h1{font-size:2em;color:#000}h1{background:#fff;line-height:1.5;}',
    'h1{background:#fff;color:#000;font-size:2em;line-height:1.5}'
  )
);

test(
  'should merge in media queries',
  processCss(
    '@media print{h1{display:block;}h1{color:red;}}',
    '@media print{h1{color:red;display:block}}'
  )
);

test(
  'should merge in media queries (2)',
  processCss(
    '@media print{h1{display:block}p{display:block}}',
    '@media print{h1,p{display:block}}'
  )
);

test(
  'should merge in media queries (3)',
  processCss(
    '@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}h3{text-decoration:none}',
    '@media print{h1{color:red}h1,h2{text-decoration:none}}h3{text-decoration:none}'
  )
);

test(
  'should merge in media queries (4)',
  processCss(
    'h3{text-decoration:none}@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}',
    'h3{text-decoration:none}@media print{h1{color:red}h1,h2{text-decoration:none}}'
  )
);

test(
  'should not merge across media queries',
  processCss(
    '@media screen and (max-width:480px){h1{display:block}}@media screen and (min-width:480px){h2{display:block}}',
    '@media screen and (max-width:480px){h1{display:block}}@media screen and (min-width:480px){h2{display:block}}'
  )
);

test(
  'should not merge across media queries (2)',
  processCss(
    '@media screen and (max-width:200px){h1{color:red}}@media screen and (min-width:480px){h1{display:block}}',
    '@media screen and (max-width:200px){h1{color:red}}@media screen and (min-width:480px){h1{display:block}}'
  )
);

test(
  'should not merge in different contexts',
  processCss(
    'h1{display:block}@media print{h1{color:red}}',
    'h1{display:block}@media print{h1{color:red}}'
  )
);

test(
  'should not merge in different contexts (2)',
  processCss(
    '@media print{h1{display:block}}h1{color:red}',
    '@media print{h1{display:block}}h1{color:red}'
  )
);

test(
  'should perform partial merging of selectors',
  processCss(
    'h1{color:red}h2{color:red;text-decoration:underline}',
    'h1,h2{color:red}h2{text-decoration:underline}'
  )
);

test(
  'should perform partial merging of selectors (2)',
  processCss(
    'h1{color:red}h2{color:red;text-decoration:underline}h3{color:green;text-decoration:underline}',
    'h1,h2{color:red}h2,h3{text-decoration:underline}h3{color:green}'
  )
);

test(
  'should perform partial merging of selectors (3)',
  processCss(
    'h1{color:red;text-decoration:underline}h2{text-decoration:underline;color:green}h3{font-weight:bold;color:green}',
    'h1{color:red}h1,h2{text-decoration:underline}h2,h3{color:green}h3{font-weight:700}'
  )
);

test(
  'should perform partial merging of selectors (4)',
  processCss(
    '.test0{color:red;border:none;margin:0}.test1{color:green;border:none;margin:0}',
    '.test0{color:red}.test0,.test1{border:none;margin:0}.test1{color:green}'
  )
);

test(
  'should perform partial merging of selectors (5)',
  processCss(
    'h1{color:red;font-weight:bold}h2{font-weight:bold}h3{text-decoration:none}',
    'h1{color:red}h1,h2{font-weight:700}h3{text-decoration:none}'
  )
);

test(
  'should perform partial merging of selectors (6)',
  processCss(
    '.test-1,.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.another-test,.test-1,.test-2{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors (7)',
  processCss(
    '.test-1{margin-top:10px;margin-bottom:20px}.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.test-1{margin-bottom:20px}.another-test,.test-1,.test-2{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors in the opposite direction',
  processCss(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    'h1{color:#000}h2,h3{color:#000;font-weight:700}'
  )
);

test(
  'should not perform partial merging of selectors if the output would be longer',
  processCss(
    '.test0{color:red;border:none;margin:0;}.longlonglonglong{color:green;border:none;margin:0;}',
    '.test0{border:none;color:red;margin:0}.longlonglonglong{border:none;color:green;margin:0}'
  )
);

test(
  'should merge vendor prefixed selectors when vendors are the same',
  processCss(
    'code ::-moz-selection{background:red}code::-moz-selection{background:red}',
    'code ::-moz-selection,code::-moz-selection{background:red}'
  )
);

test(
  'should not merge mixed vendor prefixes',
  processCss(
    'code ::-webkit-selection{background:red}code::-moz-selection{background:red}',
    'code ::-webkit-selection{background:red}code::-moz-selection{background:red}'
  )
);

test(
  'should not merge mixed vendor prefixed and non-vendor prefixed',
  processCss(
    'code ::selection{background:red}code ::-moz-selection{background:red}',
    'code ::selection{background:red}code ::-moz-selection{background:red}'
  )
);

test(
  'should merge text-* properties',
  processCss(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (2)',
  processCss(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:green}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}h2{color:green}'
  )
);

test(
  'should merge text-* properties (3)',
  processCss(
    'h1{background:white;color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:red}',
    'h1{background:#fff}h1,h2{color:red;text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (4)',
  processCss(
    'h1{color:red;text-align:center;text-transform:small-caps}h2{text-align:center;color:red}',
    'h1{text-transform:small-caps}h1,h2{color:red;text-align:center}'
  )
);

test(
  'should merge text-* properties (5)',
  processCss(
    'h1{text-align:left;text-transform:small-caps}h2{text-align:right;text-transform:small-caps}',
    'h1{text-align:left}h1,h2{text-transform:small-caps}h2{text-align:right}'
  )
);

test(
  'should not incorrectly extract transform properties',
  processCss(
    '@keyframes a{0%{transform-origin:right bottom;transform:rotate(-90deg);opacity:0}100%{transform-origin:right bottom;transform:rotate(0);opacity:1}}a{animation:a}',
    '@keyframes a{0%{opacity:0;transform:rotate(-90deg);transform-origin:right bottom}to{opacity:1;transform:rotate(0);transform-origin:right bottom}}a{animation:a}'
  )
);

test(
  'should not incorrectly extract background properties',
  processCss(
    '.iPhone{background:url(a.png);background-image:url(../../../sprites/c.png);background-position:-102px -74px;background-repeat:no-repeat}.logo{background:url(b.png);background-image:url(../../../sprites/c.png);background-position:-2px -146px;background-repeat:no-repeat}',
    '.iPhone{background:url(a.png);background-image:url(../../../sprites/c.png);background-position:-102px -74px;background-repeat:no-repeat}.logo{background:url(b.png);background-image:url(../../../sprites/c.png);background-position:-2px -146px;background-repeat:no-repeat}'
  )
);

test(
  'should not incorrectly extract display properties',
  processCss(
    '.box1{display:inline-block;display:block}.box2{display:inline-block}',
    '.box1{display:inline-block;display:block}.box2{display:inline-block}'
  )
);
test.run();
