'use strict';
const { test } = require('node:test');
const processCss = require('./_processCss');

test(
  'preserves border width when merging border shorthands with custom properties (#1000)',
  processCss(
    `:root {
      --border--width--thick: 10px;
    }

    .a {
      border-top: var(--border--width--thick) solid blue;
      border-width: 1px;
    }

    .a > .b {
      border-left: var(--border--width--thick) solid blue;
      border-width: 1px;
    }`,
    ':root{--border--width--thick:10px}.a{border-top:solid blue;border-width:1px}.a>.b{border-left:solid blue;border-width:1px}'
  )
);
