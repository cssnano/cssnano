import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

function pluginProcessor(packageName, options) {
  const plugin = require(`../../packages/${packageName}/src/index.js`);
  return postcss([options === undefined ? plugin : plugin(options)]);
}

export function pluginCase(packageName, css, options) {
  return {
    plugin: packageName,
    createProcessor() {
      return pluginProcessor(packageName, options);
    },
    css,
  };
}
