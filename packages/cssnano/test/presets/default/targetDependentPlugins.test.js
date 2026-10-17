import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { test } from 'node:test';
import preset from '../../../src/presets/default.js';
import presetTargets from '../../../src/utils/presetTargets.js';

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

test('the default preset hands its browser targets to exactly the plugins that resolve browser targets', async () => {
  const given = new Set();
  for (const [creator, options] of preset().plugins) {
    if (options && Object.hasOwn(options, presetTargets)) {
      given.add(creator(options).postcssPlugin);
    }
  }
  assert.deepEqual([...given].toSorted(), await pluginsThatResolveTargets());
});
