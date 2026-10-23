import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);

// A stage descriptor runs in a host plugin of its own, as in the preset. The
// host is loaded only for descriptors, because the harness also runs against
// base revisions that have neither descriptors nor the host module.
function stagePlugin(entry, options = {}) {
  const {
    hostPlugin,
  } = require('../../../packages/cssnano/src/pipeline/host.js');
  return hostPlugin([{ entry, options, targets: true }]);
}

function pluginProcessor(packageName, options) {
  const exported = require(
    `../../../packages/cssnano/src/plugins/${packageName}/index.js`
  );
  const stage = exported.default ?? exported;
  if (typeof stage !== 'function')
    return postcss([stagePlugin(stage, options)]);
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
