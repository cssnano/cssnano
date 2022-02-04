'use strict';
const pluginCreator = () => {
  return {
    postcssPlugin: 'cssnano-util-raw-cache',
    OnceExit(css, { result }) {
      result.root.rawCache = {
        colon: ':',
        indent: '',
        beforeDecl: '',
        beforeRule: '',
        beforeOpen: '',
        beforeClose: '',
        beforeComment: '',
        after: '',
        emptyBody: '',
        commentLeft: '',
        commentRight: '',
      };
    },
  };
};

pluginCreator.postcss = true;

module.exports = pluginCreator;
