import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { resolveOptions } from '../src/config.js';

const recorder = new URL(
  './config_loading/recordModuleLoads.js',
  import.meta.url
);
const configUrl = new URL('../src/config.js', import.meta.url);
const presetUrl = (name) =>
  new URL(`../src/presets/${name}.js`, import.meta.url).href;

// The modules that only the advanced preset needs.
const advancedModules = [
  'presets/advanced.js',
  'presets/advancedPlugins.js',
  'postcss-discard-unused',
  'postcss-merge-idents',
  'postcss-reduce-idents',
  'postcss-zindex',
];

/**
 * Runs a module body in a child process, and returns the URLs of every module
 * the child loaded, so the test sees loads that happen after the first import.
 *
 * @param {string} body statements that import and call the modules under test
 * @returns {string[]}
 */
function modulesLoadedBy(body) {
  const directory = mkdtempSync(path.join(tmpdir(), 'cssnano-preset-loading-'));
  const logFile = path.join(directory, 'modules.log');
  const script = body;
  try {
    execFileSync(
      process.execPath,
      ['--import', recorder.href, '--input-type=module', '-e', script],
      { env: { ...process.env, MODULE_LOAD_LOG: logFile } }
    );
    return readFileSync(logFile, 'utf8').trim().split('\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Imports a built preset and resolves it in a child process.
 *
 * @param {'default' | 'lite' | 'advanced'} name
 * @returns {string[]}
 */
function modulesLoadedFor(name) {
  return modulesLoadedBy(`import { resolveOptions } from ${JSON.stringify(configUrl.href)};
import preset from ${JSON.stringify(presetUrl(name))};
resolveOptions({ preset });`);
}

describe('built-in preset loading', () => {
  test('no options without a preset load the default plugins only, not the advanced ones', () => {
    const loaded = modulesLoadedBy(
      `import { resolveOptions } from ${JSON.stringify(configUrl.href)};\nresolveOptions({});`
    );
    assert.ok(loaded.some((url) => url.includes('postcss-colormin')));
    const advancedLoaded = loaded.filter((url) =>
      advancedModules.some((module) => url.includes(module))
    );
    assert.deepStrictEqual(advancedLoaded, []);
  });

  // The preset is imported alone, because the configuration code loads every default plugin.
  test('the lite preset loads its own plugins, not the default plugins it does not run', () => {
    const loaded = modulesLoadedBy(
      `import preset from ${JSON.stringify(presetUrl('lite'))};\npreset();`
    );
    assert.ok(loaded.some((url) => url.includes('presets/litePlugins.js')));
    const defaultOnly = loaded.filter((url) =>
      ['postcss-colormin', 'postcss-merge-longhand'].some((module) =>
        url.includes(module)
      )
    );
    assert.deepStrictEqual(defaultOnly, []);
  });

  test('the default preset does not load the advanced plugins', () => {
    const loaded = modulesLoadedFor('default');
    const advancedLoaded = loaded.filter((url) =>
      advancedModules.some((module) => url.includes(module))
    );
    assert.deepStrictEqual(advancedLoaded, []);
  });

  // Checks that the recorder sees a load, so the test above cannot pass by recording nothing.
  test('the advanced preset loads its modules when it is used', () => {
    const loaded = modulesLoadedFor('advanced');
    assert.ok(loaded.some((url) => url.includes('presets/advancedPlugins.js')));
  });

  test('a preset name that only inherits from Object.prototype throws, because a preset is a function', () => {
    assert.throws(() => resolveOptions({ preset: 'toString' }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });
});
