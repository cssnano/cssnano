// Guards for the longhand rounds' order against the walks of step 14. Each
// test pins the output the default and advanced presets give today, so it
// passes before and after the walks run the rounds; the column facts and the
// blocks the rounds reach are the inputs the walks are most likely to change.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import advancedPreset from '#presets/advanced';

const edgeCasesFile = new URL(
  '../../script/pipeline/edgeCases.css',
  import.meta.url
);

/**
 * @param {string} css
 * @param {Record<string, unknown>} [options] the preset options
 * @param {typeof defaultPreset} [preset]
 * @return {Promise<string>} the output of the preset
 */
async function run(css, options = {}, preset = defaultPreset) {
  const result = await postcss(preset(options)).process(css, {
    from: undefined,
  });
  return result.css;
}

// Every stage of the default preset, so only the merge runs.
const EVERY_STAGE = [
  'discardComments',
  'minifyGradients',
  'reduceInitial',
  'normalizeDisplayValues',
  'reduceTransforms',
  'colormin',
  'normalizeTimingFunctions',
  'calc',
  'convertValues',
  'orderedValues',
  'minifySelectors',
  'minifyParams',
  'normalizeCharset',
  'discardOverridden',
  'normalizeString',
  'normalizeUnicode',
  'minifyFontValues',
  'normalizeUrl',
  'normalizeRepeatStyle',
  'normalizePositions',
  'normalizeWhitespace',
  'uniqueSelectors',
  'discardEmpty',
  'rawCache',
];

// The walk after the merge, which holds the transforms that run after it.
const AFTER_MERGE = [
  'normalizeWhitespace',
  'uniqueSelectors',
  'discardEmpty',
  'normalizeCharset',
  'rawCache',
];

test('an overridden @keyframes that sets column-height does not stop column-width and column-count joining in a later rule', async () => {
  assert.equal(
    await run(
      '@keyframes k{from{column-height:1px}}@keyframes k{to{color:red}}b{column-width:1px;column-count:2}'
    ),
    '@keyframes k{to{color:red}}b{columns:1px 2}'
  );
});

test('a kept @keyframes that sets column-height stops column-width and column-count joining', async () => {
  assert.equal(
    await run(
      '@keyframes k{from{column-height:1px}}b{column-width:1px;column-count:2}'
    ),
    '@keyframes k{0%{column-height:1px}}b{column-width:1px;column-count:2}'
  );
});

test('column-height in a rule after the column rule stops column-width and column-count joining', async () => {
  assert.equal(
    await run('b{column-width:1px;column-count:2}c{column-height:1px}'),
    'b{column-width:1px;column-count:2}c{column-height:1px}'
  );
});

test('two rules the merge joins keep their reduced block under the default preset with normalizeWhitespace, uniqueSelectors and discardEmpty on', async () => {
  assert.equal(
    await run(
      'a{color:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{color:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}'
    ),
    'a,b{color:red;margin:1px}'
  );
});

test('two rules the merge joins keep their reduced block under the default preset with discardEmpty off, in pre-order', async () => {
  assert.equal(
    await run(
      'a{color:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{color:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      { disable: ['discardEmpty'] }
    ),
    'a,b{color:red;margin:1px}'
  );
});

test('a joined rule with zindex under the advanced preset keeps its zindex and reduced margin', async () => {
  assert.equal(
    await run(
      'a{color:red;zindex:1;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{color:red;zindex:1;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      { disable: ['discardEmpty'] },
      advancedPreset
    ),
    'a,b{color:red;zindex:1;margin:1px}'
  );
});

test('with every stage disabled and the merge on, longhands of joined rules reduce in both rounds', async () => {
  assert.equal(
    await run(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      { disable: EVERY_STAGE }
    ),
    'a,b{margin:1px}'
  );
});

test('with the merge on and no transform after it, longhands of joined rules reduce', async () => {
  assert.equal(
    await run(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;color:red}b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;color:red}',
      { disable: AFTER_MERGE }
    ),
    'a,b{margin:1px;color:red}'
  );
});

test('the overridden at-rules and column blocks of edgeCases.css keep a declaration after the rounds, with discardEmpty off', async () => {
  // Section 18 holds no empty block in its input, so an empty block in the output is one a round emptied.
  const css = readFileSync(edgeCasesFile, 'utf8');
  const section = css.slice(css.indexOf('/* 18.'));
  const output = await run(section, { disable: ['discardEmpty'] });
  assert.doesNotMatch(output, /\{\s*\}/v);
});
