'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { processCSS } = processCSSFactory(plugin);

test(
  'should deduplicate selectors',
  processCSS('h1,h1,h1,h1{color:red}', 'h1{color:red}')
);

test(
  'should sort selectors',
  processCSS('h1,h10,H2,h7{color:red}', 'H2,h1,h10,h7{color:red}')
);

test(
  'should leave out comments in the selector',
  processCSS(
    '.newbackbtn,/*.searchall,*/.calNav{padding:5px;}',
    '.calNav,.newbackbtn,/*.searchall,*/{padding:5px;}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
