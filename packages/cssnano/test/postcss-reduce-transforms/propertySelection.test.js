import { describe, test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import reduceTransforms from '../../src/plugins/postcss-reduce-transforms/index.js';

const plugin = oneStagePlugin(reduceTransforms);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('reduceTransforms selects only transform properties', () => {
  test(
    'keeps scale(1,1) in text-transform, which is not a transform property',
    passthroughCSS('a{text-transform:scale(1,1)}')
  );

  test(
    'keeps scale(1,1) in a custom property whose name ends in transform',
    passthroughCSS('a{--x-transform:scale(1,1)}')
  );

  test(
    'reduces scale(1,1) in transform',
    processCSS('a{transform:scale(1,1)}', 'a{transform:scale(1)}')
  );

  test(
    'reduces scale(1,1) in -webkit-transform',
    processCSS(
      'a{-webkit-transform:scale(1,1)}',
      'a{-webkit-transform:scale(1)}'
    )
  );

  test(
    'reduces scale(1,1) in -moz-transform',
    processCSS('a{-moz-transform:scale(1,1)}', 'a{-moz-transform:scale(1)}')
  );

  test(
    'reduces scale(1,1) in -ms-transform',
    processCSS('a{-ms-transform:scale(1,1)}', 'a{-ms-transform:scale(1)}')
  );

  test(
    'reduces scale(1,1) in -o-transform',
    processCSS('a{-o-transform:scale(1,1)}', 'a{-o-transform:scale(1)}')
  );

  test(
    'reduces scale(1,1) in an uppercase -WEBKIT-TRANSFORM',
    processCSS(
      'a{-WEBKIT-TRANSFORM:scale(1,1)}',
      'a{-WEBKIT-TRANSFORM:scale(1)}'
    )
  );

  test(
    'keeps scale(1,1) in a property that merely contains transform as a suffix',
    passthroughCSS('a{xtransform:scale(1,1)}')
  );
});
