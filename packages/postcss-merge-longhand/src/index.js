import postcss from 'postcss';
import processors from './lib/decl';

const run = (rule) => (processor) => {
  processor.explode(rule);
  processor.merge(rule);
};

export default postcss.plugin('postcss-merge-longhand', () => {
  return (css) => {
    css.walkRules((rule) => {
      processors.forEach(run(rule));
    });
  };
});
