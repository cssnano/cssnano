import postcssDiscardComments from 'lerna:postcss-discard-comments';
import postcssNormalizeWhitespace from 'lerna:postcss-normalize-whitespace';
import postcssDiscardEmpty from 'lerna:postcss-discard-empty';
import { rawCache } from 'lerna:cssnano-utils';

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
