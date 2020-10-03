import processors from './lib/decl';

const postcssPlugin = 'postcss-merge-longhand';

const pluginCreator = () => {
  return {
    postcssPlugin,
    Once(css) {
      css.walkRules((rule) => {
        processors.forEach((p) => {
          p.explode(rule);
          p.merge(rule);
        });
      });
    },
  };
};
pluginCreator.postcss = true;

export default pluginCreator;
