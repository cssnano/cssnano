'use strict';
const processors = require('./lib/decl');

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-longhand',

    OnceExit(css) {
      css.walkRules((rule) => {
        processors.forEach((p) => {
          p.explode(rule);
          p.merge(rule);
        });
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
