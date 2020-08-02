import postcssDiscardComments from 'lerna:postcss-discard-comments';
import postcssNormalizeWhitespace from 'lerna:postcss-normalize-whitespace';
import { rawCache } from 'lerna:cssnano-utils';

const defaultOpts = {};

export default function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [rawCache, options.rawCache],
  ];

  return { plugins };
}
