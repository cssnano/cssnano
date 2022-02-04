'use strict';
const defaultPreset = require('cssnano-preset-default');
const postcssDiscardUnused = require('postcss-discard-unused');
const postcssMergeIdents = require('postcss-merge-idents');
const postcssReduceIdents = require('postcss-reduce-idents');
const postcssZindex = require('postcss-zindex');
const autoprefixer = require('autoprefixer');

const defaultOpts = {
  autoprefixer: {
    add: false,
  },
};

module.exports = function advancedPreset(opts = {}) {
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
};
