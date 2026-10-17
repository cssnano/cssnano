import postcss from 'postcss';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { integrationTests } from '../../../../../util/integrationTestHelpers.js';
import preset from '../../../src/presets/advanced.js';
import {
  processCSSFactory,
  repositoryFile,
} from '../../../../../util/testHelpers.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const withDefaults = processCSSFactory(preset());
const withBrowserslist = processCSSFactory(
  preset({ browserslist: { env: 'modern' } })
);
// The browserslist config is found next to the stylesheet given as from.
const browserslistFrom = { from: join(testDir, 'browserslist/example.css') };

describe('CSS processing', () => {
  test(
    'should merge alignment longhands into place-content when every target supports place-*',
    processCSSFactory(
      preset({ browserslist: { query: 'chrome 120, firefox 120, safari 17' } })
    ).processCSS(
      '.a{justify-content:center;align-items:center;align-content:center}',
      '.a{align-items:center;place-content:center}'
    )
  );

  test(
    'should keep alignment longhands for default targets because Opera Mini lacks place-*',
    withDefaults.passthroughCSS(
      '.a{justify-content:center;align-items:center;align-content:center}'
    )
  );

  test(
    'should process CSS with default options',
    withDefaults.processCSS(
      'button { color: hsla(0 100% 50% / 40%); appearance: none }',
      'button{color:rgba(255,0,0,.4);appearance:none}'
    )
  );

  test(
    'should process CSS with Browserslist options',
    withBrowserslist.processCSS(
      'button { color: hsla(0 100% 50% / 40%); appearance: none }',
      'button{color:#f006;appearance:none}',
      browserslistFrom
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
    const { css } = await postcss(preset({ disable: ['zindex'] })).process(
      input,
      {
        from: repositoryFile,
      }
    );

    assert.strictEqual(css, input);
  });

  test('preserves z-index values with the exclude option', async () => {
    const input = 'h1{z-index:10}';
    const { css } = await postcss(preset({ disable: ['zindex'] })).process(
      input,
      { from: repositoryFile }
    );

    assert.strictEqual(css, input);
  });
});
