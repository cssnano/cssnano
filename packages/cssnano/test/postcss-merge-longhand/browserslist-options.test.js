import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { resolveTargets } from '../../src/utils/browserTargets.js';
import plugin from '../../src/plugins/postcss-merge-longhand/index.js';
import { repositoryFile, withTargets } from '../../../../util/testHelpers.js';

const longhands = 'a{align-items:center;justify-items:start}';

/**
 * @param {Parameters<typeof plugin>[0]} options
 * @param {import('postcss').ProcessOptions} [processOptions]
 * @return {Promise<string>}
 */
async function run(options, processOptions = {}) {
  const result = await postcss([plugin(options)]).process(longhands, {
    from: repositoryFile,
    ...processOptions,
  });
  return result.css;
}

/**
 * @param {string} browserslistConfig
 * @return {string} a directory whose browserslist file holds the query
 */
function projectWith(browserslistConfig) {
  const dir = mkdtempSync(join(tmpdir(), 'merge-longhand-'));
  writeFileSync(join(dir, '.browserslistrc'), browserslistConfig);
  return dir;
}

describe('Browserslist options of the place-* gate', () => {
  test('uses a browserslist file found next to the stylesheet given as from', async () => {
    const dir = projectWith('safari 10.1\n');
    assert.equal(await run({}, { from: join(dir, 'in.css') }), longhands);
  });

  test('selects the browserslist environment given as env', async () => {
    const dir = projectWith('[legacy]\nsafari 10.1\n[modern]\nchrome 120\n');
    assert.equal(
      await run(withTargets(undefined, { env: 'legacy' }), {
        from: join(dir, 'input.css'),
      }),
      longhands
    );
    assert.equal(
      await run(withTargets(undefined, { env: 'modern' }), {
        from: join(dir, 'input.css'),
      }),
      'a{place-items:center start}'
    );
  });

  test('resolves a coverage query against the given usage stats', async () => {
    const modernOnly = { chrome: { 120: 100 }, safari: { 10.1: 0 } };
    assert.equal(
      await run(withTargets('> 50% in my stats', { stats: modernOnly })),
      'a{place-items:center start}'
    );
  });

  test('takes stats from the PostCSS options when the plugin has none', async () => {
    const legacyOnly = { safari: { 10.1: 100 } };
    assert.equal(
      await run(withTargets('> 50% in my stats'), { stats: legacyOnly }),
      longhands
    );
  });

  test('resolves the targets from the query of the preset targets', () => {
    assert.deepEqual(resolveTargets(withTargets('chrome 120'), undefined), [
      'chrome 120',
    ]);
  });
});
