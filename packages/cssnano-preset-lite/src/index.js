import postcssDiscardComments from 'postcss-discard-comments';
import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
import postcssDiscardEmpty from 'postcss-discard-empty';
import { rawCache } from 'cssnano-utils';

const defaultOpts = {};

export default function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [postcssDiscardEmpty, options.discardEmpty],
    [rawCache, options.rawCache],
  ];

  return { plugins };
}
