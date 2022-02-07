'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should normalise @media queries (2)',
  processCss(
    '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:#00f}}',
    '@media only screen and (min-width:400px,min-height:500px){h1{color:#00f}}'
  )
);
test.run();
