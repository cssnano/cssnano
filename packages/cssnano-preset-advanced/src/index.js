import defaultPreset from 'cssnano-preset-default';
import postcssDiscardUnused from 'postcss-discard-unused';
import postcssMergeIdents from 'postcss-merge-idents';
import postcssReduceIdents from 'postcss-reduce-idents';
import postcssZindex from 'postcss-zindex';
import autoprefixer from 'autoprefixer';

const defaultOpts = {
  autoprefixer: {
    add: false,
  },
};

export default function advancedPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  const plugins = [
    ...defaultPreset(options).plugins,
    [autoprefixer, options.autoprefixer],
    [postcssDiscardUnused, options.discardUnused],
    [postcssMergeIdents, options.mergeIdents],
    [postcssReduceIdents, options.reduceIdents],
    [postcssZindex, options.zindex],
  ];

  return { plugins };
}
