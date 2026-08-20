'use strict';
const postcss = require('postcss');
const assert = require('node:assert/strict');

function usePostCSSPlugin(plugin) {
  return () => {
    assert.ok(plugin.postcssPlugin);
  };
}

function processCSSFactory(plugin) {
  let processor, processCSS, passthroughCSS;

  if (Array.isArray(plugin)) {
    const postcssProcessor = postcss(plugin);

    processor = (fixture, options) =>
      postcssProcessor.process(
        fixture,
        Object.assign({}, { from: undefined }, options)
      );

    processCSS = (fixture, expected, options) => {
      return async () => {
        const result = await processor(fixture, options);
        assert.strictEqual(result.css, expected);
        return result;
      };
    };

    passthroughCSS = (fixture, options) => {
      return processCSS(fixture, fixture, options);
    };
  } else {
    processor = (fixture, options) => {
      return postcss(plugin(options)).process(
        fixture,
        Object.assign({}, { from: undefined }, options)
      );
    };

    processCSS = (fixture, expected, options) => {
      return async () => {
        const result = await processor(fixture, options);
        assert.strictEqual(result.css, expected);
        return result;
      };
    };

    passthroughCSS = (fixture, options) => {
      return processCSS(fixture, fixture, options);
    };
  }

  return { processor, processCSS, passthroughCSS };
}

module.exports = { usePostCSSPlugin, processCSSFactory };
