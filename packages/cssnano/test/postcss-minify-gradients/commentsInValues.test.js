import { describe, test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import minifyGradients from '../../src/plugins/postcss-minify-gradients/index.js';

const plugin = oneStagePlugin(minifyGradients);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// A rewritten gradient takes the value PostCSS parses, which drops most
// comments, so the output matches the value before this stage read raw text.
describe('Gradients with comments inside their value', () => {
  test(
    'should drop a comment after a colour when it rewrites the direction',
    processCSS(
      'background:linear-gradient(to top, red /*x*/, blue)',
      'background:linear-gradient(0deg, red , blue)'
    )
  );

  test(
    'should drop a comment after the direction keyword',
    processCSS(
      'background:linear-gradient(to top /*x*/, red, blue)',
      'background:linear-gradient(0deg , red, blue)'
    )
  );

  test(
    'should drop a comment between a colour and its zero position',
    processCSS(
      'background:linear-gradient(to top, red/*x*/0%, blue)',
      'background:linear-gradient(0deg, red, blue)'
    )
  );

  test(
    'should keep a comment in a gradient with nothing to shorten',
    passthroughCSS('background:linear-gradient(red 10px, blue /*x*/ 20px)')
  );
});
