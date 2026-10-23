import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import minifyParams from '../../src/plugins/postcss-minify-params/index.js';

const plugin = oneStagePlugin(minifyParams);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/** The default preset with minifyParams turned off, for the output without it. */
async function presetWithoutParams(css) {
  const result = await postcss(
    defaultPreset({ disable: ['minifyParams'] })
  ).process(css, { from: undefined });
  return result.css;
}

suite('minifyParams on the space after an at-rule name', () => {
  test(
    'strips the space before a media prelude that starts with a parenthesis',
    processCSS(
      '@media (min-width:1px){a{color:red}}',
      '@media(min-width:1px){a{color:red}}'
    )
  );

  test('keeps the space before a media prelude when minifyParams is disabled', async () => {
    assert.equal(
      await presetWithoutParams('@media (min-width:1px){a{color:red}}'),
      '@media (min-width:1px){a{color:red}}'
    );
  });

  test(
    'strips the space before a supports prelude that starts with a parenthesis',
    processCSS(
      '@supports (display:grid){a{color:red}}',
      '@supports(display:grid){a{color:red}}'
    )
  );

  test(
    'keeps the space before an all prelude, which does not start with a parenthesis',
    passthroughCSS('@media all {a{color:red}}')
  );

  test('keeps the space before an all prelude when minifyParams is disabled', async () => {
    assert.equal(
      await presetWithoutParams('@media all {a{color:red}}'),
      '@media all{a{color:red}}'
    );
  });

  test(
    'keeps the space before a prelude that is only a comment, which PostCSS gives as an empty prelude',
    passthroughCSS('@media /*x*/ {a{color:red}}')
  );

  test(
    'keeps the space before an empty prelude, since the transform does not run on it',
    passthroughCSS('@media {a{color:red}}')
  );

  test(
    'keeps the space before an unbalanced prelude, which is left as written',
    passthroughCSS('@media (min-width:1px{a{color:red}}')
  );

  test(
    'keeps the comment and strips only the whitespace around it before a parenthesis',
    processCSS(
      '@media/*x*/ (min-width:1px){a{color:red}}',
      '@media/*x*/(min-width:1px){a{color:red}}'
    )
  );
});
