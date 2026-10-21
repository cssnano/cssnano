import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('discardDuplicates');

const { passthroughCSS } = processCSSFactory(plugin);

test(
  'should keep an earlier statement at-rule when a later block at-rule has the same prelude because a statement and a block are different constructs',
  passthroughCSS('@foo x;@foo x{.a{x:1}}')
);

test(
  'should keep an earlier block at-rule when a later statement at-rule has the same prelude because a statement and a block are different constructs',
  passthroughCSS('@foo x{.a{x:1}}@foo x;')
);
