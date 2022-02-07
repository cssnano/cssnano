'use strict';
const { test } = require('uvu');
const processCSS = require('./_processCSS');

test(
  'ie 6 underscore hack',
  processCSS('h1 { margin-top: 1px\\9; }', 'h1 { }', {
    target: 'ie8',
    unaffected: 'chrome58',
  })
);

test(
  'ie 6 underscore hack #1',
  processCSS('h1 { margin-top/*\\**/: 1px\\9; }', 'h1 { }', {
    target: 'ie8',
    unaffected: 'chrome58',
  })
);

test(
  'ie 6 underscore hack (uppercase)',
  processCSS('h1 { MARGIN-TOP: 1PX\\9; }', 'h1 { }', {
    target: 'ie8',
    unaffected: 'chrome58',
  })
);

test(
  'ie 6 underscore hack (uppercase) #1',
  processCSS('h1 { MARGIN-TOP/*\\**/: 1PX\\9; }', 'h1 { }', {
    target: 'ie8',
    unaffected: 'chrome58',
  })
);
test.run();
