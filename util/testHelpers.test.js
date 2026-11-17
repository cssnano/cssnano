import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import colormin from '../packages/cssnano/src/plugins/postcss-colormin/index.js';

const plugin = oneStagePlugin(colormin);
import { browserTargets } from '../packages/cssnano/src/utils/browserTargets.js';
import { oneStagePlugin, processCSSFactory } from './testHelpers.js';

// rgb() with an alpha channel is written as rgba() for IE 11 and as hex for
// the default targets, so the output shows which targets a run used.
const alphaColor = 'a{color:rgb(0 0 0 / 50%)}';

/**
 * Runs `callback` with the browserslist environment variables set to an
 * unknown environment, so any config they select would change the targets.
 *
 * @param {() => Promise<void>} callback
 */
async function withUnknownBrowserslistEnv(callback) {
  const saved = process.env.BROWSERSLIST_ENV;
  process.env.BROWSERSLIST_ENV = 'none-such';
  try {
    await callback();
  } finally {
    if (saved === undefined) delete process.env.BROWSERSLIST_ENV;
    else process.env.BROWSERSLIST_ENV = saved;
  }
}

describe('processCSSFactory without named targets', () => {
  test('uses the named test targets whatever the browserslist environment', async () => {
    const { processor } = processCSSFactory(plugin);
    await withUnknownBrowserslistEnv(async () => {
      const { css } = await processor(alphaColor, {});
      assert.equal(css, 'a{color:rgba(0,0,0,.5)}');
    });
  });

  test('keeps the targets a test names over the test targets', async () => {
    const { processor } = processCSSFactory(plugin);
    const { css } = await processor(alphaColor, {
      [browserTargets]: { query: 'chrome 120' },
    });
    assert.equal(css, 'a{color:#00000080}');
  });
});
