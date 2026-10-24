import { describe, test } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';

const { passthroughCSS } = processCSSFactory(oneStagePlugin(convertValues));

describe('A number followed by a dot and a unit is invalid, so it is kept', () => {
  test(
    'should keep `1.em`, which is invalid CSS, instead of making it the valid `1em`',
    passthroughCSS('a{width:1.em}')
  );

  test(
    'should keep `1.em` in a list, as the invalid term stays as written',
    passthroughCSS('a{margin:0 1.em}')
  );

  test(
    'should keep `10.px` inside calc, as the dot before the unit is invalid',
    passthroughCSS('h1{width:calc(10.px + 0px)}')
  );
});
