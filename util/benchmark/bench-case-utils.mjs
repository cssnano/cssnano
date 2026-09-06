import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

export function pluginProcessor(packageName) {
  return postcss([require(`../../packages/${packageName}/src/index.js`)]);
}

export function pluginCase(packageName, css) {
  return {
    plugin: packageName,
    createProcessor() {
      return pluginProcessor(packageName);
    },
    css,
  };
}
