import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-normalize-unicode/index.js';

const { processCSS } = processCSSFactory(plugin);

const input = '@font-face{unicode-range:U+0025-00FF}';
const testDir = dirname(fileURLToPath(import.meta.url));
const configDir = join(testDir, 'browserslist');

describe('normalize-unicode browser targets', () => {
  // IE 11 and Edge before 16 ignore unicode-range when the U is lowercase.
  for (const query of ['ie 11', 'edge 15']) {
    test(
      `keeps the uppercase U+ prefix for ${query}`,
      processCSS(input, '@font-face{unicode-range:U+25-ff}', {
        overrideBrowserslist: query,
      })
    );
  }

  for (const query of [
    'defaults',
    'last 1 chrome version',
    'safari TP',
    'op_mini all',
  ]) {
    test(
      `lowercases the U+ prefix for ${query}`,
      processCSS(input, '@font-face{unicode-range:u+25-ff}', {
        overrideBrowserslist: query,
      })
    );
  }

  test(
    'lowercases the U+ prefix when stats select only chrome 150',
    processCSS(input, '@font-face{unicode-range:u+25-ff}', {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});

describe('browserslist config resolution', () => {
  // With no from, file or path, the search starts at the plugin's own directory
  // and reaches the repository root package.json, whose production env is legacy.
  test(
    'uses the production env of the repository root config when no from, file or path is set',
    processCSS(input, '@font-face{unicode-range:U+25-ff}', {})
  );

  test(
    'reads the legacy env from the config found next to from',
    processCSS(input, '@font-face{unicode-range:U+25-ff}', {
      from: join(configDir, 'example.css'),
      env: 'legacy',
    })
  );

  test(
    'reads the legacy env from the config found next to file',
    processCSS(input, '@font-face{unicode-range:U+25-ff}', {
      file: join(configDir, 'example.css'),
      env: 'legacy',
    })
  );

  test(
    'reads the legacy env from the config in path',
    processCSS(input, '@font-face{unicode-range:U+25-ff}', {
      path: configDir,
      env: 'legacy',
    })
  );

  // path wins over from: the test directory has no legacy env, so the modern output wins.
  test(
    'searches path instead of from when both are set',
    processCSS(input, '@font-face{unicode-range:u+25-ff}', {
      from: join(configDir, 'example.css'),
      path: testDir,
      env: 'legacy',
    })
  );
});
