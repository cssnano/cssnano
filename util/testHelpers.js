import postcss from 'postcss';
import * as assert from 'uvu/assert';

export function usePostCSSPlugin(plugin) {
  return () => {
    assert.ok(plugin.postcssPlugin);
  };
}

export function processCSSFactory(plugin) {
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
