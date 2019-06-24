import fs from 'fs';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index';
import frameworks from './frameworks';

export function usePostCSSPlugin(plugin) {
  return () => {
    expect(plugin.postcssVersion).toBeDefined();
    expect(plugin.postcssPlugin).toBeDefined();
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
          expect(result.css).toBe(expected);
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
          expect(result.css).toBe(expected);
          return result;
        });
    };

    passthroughCSS = (fixture, options) => {
      return processCSS(fixture, fixture, options);
    };
  }

  return { processor, processCSS, passthroughCSS };
}

export function processCSSWithPresetFactory(preset) {
  return processCSSFactory([cssnano({ preset })]);
}

export function loadPreset(preset) {
  return postcss(cssnano({ preset }));
}

export function integrationTests(preset, integrations) {
  return () =>
    Promise.all(
      Object.keys(frameworks).map((framework) => {
        const css = frameworks[framework];

        return postcss([cssnano({ preset })])
          .process(css, { from: undefined })
          .then((result) => {
            expect(result.css).toBe(
              fs.readFileSync(`${integrations}/${framework}.css`, 'utf8')
            );
          });
      })
    );
}
