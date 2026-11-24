import { test } from 'node:test';
import { processCSSFactory } from '../../../../../util/testHelpers.js';
import { onlyTransform } from '../onlyTransform.js';

// A value that ends in the whitespace after a final backslash stays as
// written: trimming the newline of an invalid escape, or the space or tab of a
// valid one, would let the backslash escape the `;` or `}` that follows.
const { passthroughCSS } = processCSSFactory(onlyTransform(['mergeLonghand']));

test(
  'mergeLonghand leaves a border value ending in a backslash before a newline as written',
  passthroughCSS('a{border:calc(3px)\\\n}')
);

test(
  'mergeLonghand leaves a border value ending in an escaped space as written',
  passthroughCSS('a{border:calc(3px)\\ }')
);
