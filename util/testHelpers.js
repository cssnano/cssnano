import postcss from 'postcss';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { browserTargets } from '../packages/cssnano/src/utils/browserTargets.js';
import { hostPlugin } from '../packages/cssnano/src/pipeline/host.js';

/**
 * A file in the repository root, so browserslist finds the repository's
 * config wherever the tests run from, instead of searching from the working
 * directory.
 */
export const repositoryFile = fileURLToPath(
  new URL('../input.css', import.meta.url)
);

/**
 * The browser targets of a plugin, as a preset gives them. The query, env and
 * stats are the ones browserslist takes; unset ones are left to browserslist.
 *
 * @param {string | string[]} [query]
 * @param {{env?: string, stats?: unknown}} [settings]
 * @returns {Record<symbol, object>}
 */
export function withTargets(query, { env, stats } = {}) {
  return { [browserTargets]: Object.freeze({ query, env, stats }) };
}

/**
 * Process options that read the repository's browserslist config, unless the
 * test names its own input file.
 */
export function withRepositoryFile(options) {
  if (options?.from !== undefined || options?.file !== undefined) {
    return options;
  }
  return { from: repositoryFile, ...options };
}

function usePostCSSPlugin(plugin) {
  return () => {
    assert.ok(plugin.postcssPlugin);
  };
}

function processCSSFactory(plugin) {
  let processor;

  if (Array.isArray(plugin)) {
    const postcssProcessor = postcss(plugin);
    processor = (fixture, options) =>
      postcssProcessor.process(fixture, withRepositoryFile(options));
  } else {
    processor = (fixture, options) =>
      postcss(plugin(options)).process(fixture, withRepositoryFile(options));
  }

  const processCSS = (fixture, expected, options) => {
    return async () => {
      const result = await processor(fixture, options);
      assert.strictEqual(result.css, expected);
      return result;
    };
  };

  const passthroughCSS = (fixture, options) => {
    return processCSS(fixture, fixture, options);
  };

  return { processor, processCSS, passthroughCSS };
}

/**
 * A PostCSS plugin creator that runs one stage entry, the way a preset does: the
 * stage is built for each run in a host plugin of its own. The browser targets
 * are resolved for every stage, so a stage that ignores them is built once per
 * targets array, which changes nothing it outputs.
 *
 * @param {import('../packages/cssnano/src/pipeline/host.js').StageEntry} entry
 */
function oneStagePlugin(entry) {
  return (options = {}) => hostPlugin([{ entry, options, targets: true }]);
}

export { oneStagePlugin, usePostCSSPlugin, processCSSFactory };
