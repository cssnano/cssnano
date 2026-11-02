import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('discardDuplicates');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should keep an earlier statement at-rule when a later block at-rule has the same prelude because a statement and a block are different constructs',
  passthroughCSS('@foo x;@foo x{.a{x:1}}')
);

test(
  'should keep an earlier block at-rule when a later statement at-rule has the same prelude because a statement and a block are different constructs',
  passthroughCSS('@foo x{.a{x:1}}@foo x;')
);

test(
  'should keep a statement at-rule and an empty block at-rule with the same prelude because a statement and a block are different constructs',
  passthroughCSS('@foo x;@foo x{}')
);

test(
  'should keep two block at-rules that differ only by a comment after the name because the comment is part of the prelude it compares',
  passthroughCSS('@foo/*c*/x{.a{x:1}}@foo x{.a{x:1}}')
);

test(
  'should drop the earlier of two block at-rules that differ only in the whitespace after the name',
  processCSS('@foo  x{.a{x:1}}@foo x{.a{x:1}}', '@foo x{.a{x:1}}')
);

test(
  'should keep two block at-rules when a stray semicolon precedes the later because the semicolon is part of the raws it compares',
  passthroughCSS('@foo x{.a{x:1}};@foo x{.a{x:1}}')
);
