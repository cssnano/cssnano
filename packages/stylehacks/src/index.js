'use strict';
const browserslist = require('browserslist');
const plugins = require('./plugins');

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'stylehacks',

    OnceExit(css, { result }) {
      const resultOpts = result.opts || {};
      const browsers = browserslist(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env,
      });

      const processors = [];
      for (const Plugin of plugins) {
        const hack = new Plugin(result);
        if (!browsers.some((browser) => hack.targets.has(browser))) {
          processors.push(hack);
        }
      }
      css.walk((node) => {
        processors.forEach((proc) => {
          if (!proc.nodeTypes.has(node.type)) {
            return;
          }

          if (opts.lint) {
            return proc.detectAndWarn(node);
          }

          return proc.detectAndResolve(node);
        });
      });
    },
  };
}

pluginCreator.detect = (node) => {
  return plugins.some((Plugin) => {
    const hack = new Plugin();

    return hack.any(node);
  });
};

pluginCreator.postcss = true;
module.exports = pluginCreator;
