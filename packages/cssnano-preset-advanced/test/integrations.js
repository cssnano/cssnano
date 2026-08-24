import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodepath from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTests,
  createCssnanoProcessor,
  processCSSWithPresetFactory,
} from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { join } = nodepath;
const withDefaults = processCSSWithPresetFactory(preset);
const withBrowserslist = processCSSWithPresetFactory(
  preset({
    path: join(testDir, 'browserslist/example.css'),
    env: 'modern',

    // Add Autoprefix vendor prefixes to confirm output
    // changes based on Browserslist options
    autoprefixer: {
      add: true,
    },
  })
);

describe('CSS processing', () => {
  test(
    'should process CSS with default options',
    withDefaults.processCSS(
      'button { color: hsla(0 100% 50% / 40%); appearance: none }',
      'button{appearance:none;color:rgba(255,0,0,.4)}'
    )
  );

  test(
    'should process CSS with Browserslist options',
    withBrowserslist.processCSS(
      'button { color: hsla(0 100% 50% / 40%); appearance: none }',
      'button{-webkit-appearance:none;-moz-appearance:none;appearance:none;color:#f006}'
    )
  );
});

describe('framework integrations', () => {
  test(
    'should correctly handle the framework tests',
    { concurrency: true },
    integrationTests(preset, `${testDir}/integrations`)
  );
});

describe('z-index options', () => {
  test('preserves z-index values when zindex is disabled', async () => {
    const input = 'h1{z-index:10}';
    const { css } = await createCssnanoProcessor(
      preset({ zindex: false })
    ).process(input, {
      from: undefined,
    });

    assert.strictEqual(css, input);
  });

  test('preserves z-index values with the exclude option', async () => {
    const input = 'h1{z-index:10}';
    const { css } = await createCssnanoProcessor(
      preset({ zindex: { exclude: true } })
    ).process(input, { from: undefined });

    assert.strictEqual(css, input);
  });
});
