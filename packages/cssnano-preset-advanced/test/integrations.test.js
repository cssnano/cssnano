import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTests,
  createCssnanoProcessor,
  processCSSWithPresetFactory,
} from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const testDir = dirname(fileURLToPath(import.meta.url));
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
    'should merge alignment longhands into place-content when every target supports place-*',
    processCSSWithPresetFactory(
      preset({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' })
    ).processCSS(
      '.a{justify-content:center;align-items:center;align-content:center}',
      '.a{align-items:center;place-content:center}'
    )
  );

  test(
    'should keep alignment longhands for default targets because Opera Mini lacks place-*',
    withDefaults.processCSS(
      '.a{justify-content:center;align-items:center;align-content:center}',
      '.a{align-content:center;align-items:center;justify-content:center}'
    )
  );

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

describe('framework tests', () => {
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
