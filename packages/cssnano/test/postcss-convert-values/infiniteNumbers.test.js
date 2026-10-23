import { describe, test } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';

const plugin = oneStagePlugin(convertValues);

const { passthroughCSS } = processCSSFactory(plugin);

describe('Numbers the tokenizer reads as infinity', () => {
  test(
    'should keep a length whose value overflows to infinity, since Infinity is not a CSS number',
    passthroughCSS(`a{width:1${'0'.repeat(400)}px}`)
  );
});
