import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

const { passthroughCSS } = processCSSFactory(plugin);

// In Firefox 41 to 62, `offset-block-start` sets `inset-block-start`. Joining
// the second `.a` up past `.b` would leave `.b`'s value winning on an element
// matching both rules, so each input must stay as written.
test(
  'should keep a rule apart when an offset-* alias between two rules overrides the inset-* longhand they set',
  passthroughCSS(
    '.a{inset-block-start:0}.b{offset-block-start:1px}.a{inset-block-start:2px}'
  )
);

test(
  'should keep a rule apart when an inset-* longhand between two rules overrides the offset-* alias they set',
  passthroughCSS(
    '.a{offset-block-start:1px}.b{inset-block-start:0}.a{offset-block-start:2px}'
  )
);
