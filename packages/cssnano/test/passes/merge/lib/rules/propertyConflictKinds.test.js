import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

const { passthroughCSS } = processCSSFactory(plugin);

test(
  // In a vertical writing mode `margin-inline-start` is `margin-top`, so the
  // write between the two `.a` rules conflicts with the later `margin-top`.
  'should keep same-selector rules apart across a flow-relative write to a physical longhand',
  passthroughCSS(
    '.a{margin-top:1px}.b{margin-inline-start:2px}.a{margin-top:3px}'
  )
);

test(
  // `all` resets every property except `direction` and `unicode-bidi`, so the
  // write between the two `.a` rules conflicts with the later `color`.
  'should keep same-selector rules apart across an `all` declaration that resets the property',
  passthroughCSS('.a{color:red}.b{all:unset}.a{color:blue}')
);

test(
  // The shorthand `margin` sets `margin-top`, so the write between the two `.a`
  // rules conflicts with the later `margin-top`.
  'should keep same-selector rules apart across a shorthand that sets the longhand',
  passthroughCSS('.a{margin-top:1px}.b{margin:2px}.a{margin-top:3px}')
);
