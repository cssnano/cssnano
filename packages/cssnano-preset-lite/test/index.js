'use strict';
const { test } = require('uvu');
const {
  processCSSWithPresetFactory,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

const { processCSS } = processCSSWithPresetFactory(preset);

test('Simple test', processCSS('h1 { } ', ''));

test('Simple test #2', processCSS('h1 { color: red} ', 'h1{color:red}'));

test(
  'Simple test with comment',
  processCSS('h1 { color: /** some comment here */ red} ', 'h1{color:red}')
);

test(
  'Simple test with comment #2',
  processCSS(
    `h1 { color: /**
 some comment
 here
 */ red} `,
    'h1{color:red}'
  )
);

test(
  'Simple test with comment #3',
  processCSS(
    `

@media screen and (min-width: 480px) {
    body {
        background-color: lightgreen;
    }
}

#main {
    border: 1px/**
 * Paste or drop some CSS here and explore
 * the syntax tree created by chosen parser.
 * Enjoy!
 */ solid black;
}

ul li {
	padding: 5px;
}
`,
    '@media screen and (min-width: 480px){body{background-color:lightgreen}}#main{border:1px solid black}ul li{padding:5px}'
  )
);

test(
  'Simple test with empty and comment',
  processCSS(
    `h1 { color: /**
 some comment
 here
 */ } `,
    ''
  )
);
test.run();
