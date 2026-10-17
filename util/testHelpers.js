import postcss from 'postcss';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

/**
 * A file in the repository root, so browserslist finds the repository's
 * config wherever the tests run from, instead of searching from the working
 * directory.
 */
export const repositoryFile = fileURLToPath(
  new URL('../input.css', import.meta.url)
);

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

export { usePostCSSPlugin, processCSSFactory };
