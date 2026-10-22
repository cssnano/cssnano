import { createRequire } from 'node:module';
import postcss from 'postcss';
import { oneStagePlugin } from '../../testHelpers.js';

const require = createRequire(import.meta.url);

function pluginProcessor(packageName, options) {
  const exported = require(
    `../../../packages/cssnano/src/plugins/${packageName}/index.js`
  );
  const stage = exported.default ?? exported;
  // A stage descriptor runs as the host plugin it builds, as in the preset.
  if ('compile' in stage) return postcss([oneStagePlugin(stage)(options)]);
  return postcss([options === undefined ? stage : stage(options)]);
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
