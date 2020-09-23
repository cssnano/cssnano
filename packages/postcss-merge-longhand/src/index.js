import processors from './lib/decl';

const postcssPlugin = 'postcss-merge-longhand';

export default () => {
  return {
    postcssPlugin,
    Root(css) {
      css.walkRules((rule) => {
        processors.forEach((p) => {
          p.explode(rule);
          p.merge(rule);
        });
      });
    },
  };
};

export const postcss = true;
