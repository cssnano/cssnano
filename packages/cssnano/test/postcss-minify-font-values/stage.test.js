import { test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import minifyFontValues from '../../src/plugins/postcss-minify-font-values/index.js';

const plugin = oneStagePlugin(minifyFontValues);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should minify a font-family whose comment PostCSS strips, and keep the comment when nothing changes',
  processCSS('a{font-family:"Arial" /*c*/}', 'a{font-family:Arial /*c*/}')
);

test(
  'should unquote a custom property that removeQuotes maps to font-family',
  processCSS('a{--x:"Arial"}', 'a{--x:Arial}', {
    removeQuotes: () => 'font-family',
  })
);

test(
  'should leave a custom property unchanged when removeQuotes maps it to no font property',
  passthroughCSS('a{--x:"Arial"}', {
    removeQuotes: () => '',
  })
);
