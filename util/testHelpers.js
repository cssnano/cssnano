'use strict';
const postcss = require('postcss');
const assert = require('uvu/assert');

function usePostCSSPlugin(plugin) {
  return () => {
    assert.ok(plugin.postcssPlugin);
  };
}

function processCSSFactory(plugin) {
  let processor, processCSS, passthroughCSS;

  if (Array.isArray(plugin)) {
    processor = (fixture, options) =>
      postcss(plugin).process(
        fixture,
        Object.assign({}, { from: undefined }, options)
      );

    processCSS = (fixture, expected, options) => {
      return () =>
        processor(fixture, options).then((result) => {
          assert.is(result.css, expected);
          return result;
        });
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
      return () =>
        processor(fixture, options).then((result) => {
          assert.is(result.css, expected);
          return result;
        });
    };

    passthroughCSS = (fixture, options) => {
      return processCSS(fixture, fixture, options);
    };
  }

  return { processor, processCSS, passthroughCSS };
}

module.exports = { usePostCSSPlugin, processCSSFactory };
