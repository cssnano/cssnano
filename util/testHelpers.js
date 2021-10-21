import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index';

export function usePostCSSPlugin(plugin) {
  return () => {
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
  const frameworks = new Map();
  for (const framework of fs.readdirSync(
    path.join(__dirname, '../frameworks')
  )) {
    frameworks.set(
      path.basename(framework, '.css'),
      fs.readFileSync(path.join(__dirname, '../frameworks', framework), 'utf8')
    );
  }

  const expectations = [];
  for (const [framework, css] of frameworks) {
    expectations.push(
      postcss([cssnano({ preset })])
        .process(css, { from: undefined })
        .then((result) => {
          expect(result.css).toBe(
            fs.readFileSync(`${integrations}/${framework}.css`, 'utf8')
          );
        })
    );
  }
  return () => Promise.all(expectations);
}
