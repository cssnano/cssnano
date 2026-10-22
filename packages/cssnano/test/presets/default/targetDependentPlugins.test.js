import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { test } from 'node:test';
import { defaultPluginEntries } from '../../../src/presets/defaultPlugins.js';

const pluginsDirectory = new URL('../../../src/plugins/', import.meta.url);

/** @return {Promise<string[]>} directories of the plugins that resolve browser targets */
async function pluginsThatResolveTargets() {
  const names = new Set();
  for await (const file of glob('postcss-*/**/*.js', {
    cwd: pluginsDirectory,
  })) {
    const source = await readFile(new URL(file, pluginsDirectory), 'utf8');
    if (/from\s*'#utils\/browser-targets'/v.test(source)) {
      // Glob returns paths with the platform's separator.
      names.add(file.split(sep)[0]);
    }
  }
  return [...names].toSorted();
}

test('the default preset marks exactly the plugins that resolve browser targets', async () => {
  // The merge pass lives under passes/, so the scan above does not find it.
  const marked = defaultPluginEntries
    .filter(([, , settings]) => settings?.targets === true)
    .map(([, , settings]) => settings.postcssPlugin);
  assert.deepEqual(
    marked.toSorted(),
    [...(await pluginsThatResolveTargets()), 'cssnano-merge'].toSorted()
  );
});
