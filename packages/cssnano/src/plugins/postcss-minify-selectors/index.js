import { resolveTargets } from '#utils/browser-targets';
import { supportsAll } from '#utils/browser-support';
import { isFixedPointSelector } from './lib/fixedPointSelector.js';
import { isInvalidSelector } from './lib/isInvalidSelector.js';
import { isDefaultNamespace } from './lib/isDefaultNamespace.js';
import { normalizeList } from './lib/selectorScanner.js';

/**
 * @typedef {object} Options
 * @property {boolean} [sort] Sorts the selectors of a list alphabetically. (default: true)
 * @property {boolean} [convertToIs] Factors a shared prefix or suffix of a selector list into `:is()` when that is shorter and keeps the cascade. (default: true)
 */

/**
 * These vendor spellings were used by browsers before unprefixed keyframes
 * support; arbitrary suffixes must not receive keyframe-selector semantics.
 * @type {ReadonlySet<string>}
 */
const keyframeAtRuleNames = new Set([
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
  '-o-keyframes',
]);

/**
 * @param {string} value
 * @param {string} expected Lowercase ASCII reference spelling.
 * @return {boolean}
 */
function isAsciiCaseInsensitive(value, expected) {
  if (value.length !== expected.length) return false;
  for (let index = 0; index < value.length; index++) {
    let code = value.charCodeAt(index);
    if (code >= 0x41 && code <= 0x5a) code += 0x20;
    if (code !== expected.charCodeAt(index)) return false;
  }
  return true;
}

/** @param {unknown} name @return {boolean} */
function isKeyframesAtRule(name) {
  if (typeof name !== 'string') return false;
  for (const expected of keyframeAtRuleNames) {
    if (isAsciiCaseInsensitive(name, expected)) return true;
  }
  return false;
}

/**
 * Minify selectors from tokenizer spans. Function arguments are normalized
 * bottom-up without recursive descent.
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const resolved = { sort: true, convertToIs: true, ...opts };
  return {
    postcssPlugin: 'postcss-minify-selectors',
    /** @param {import('postcss').Result} result */
    prepare(result) {
      let fold = resolved.convertToIs !== false;
      if (fold) {
        fold = supportsAll(
          resolveTargets(resolved, result),
          'css-matches-pseudo'
        );
      }
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          const cache = new Map();
          let hasDefaultNamespace = false;
          /** @type {import('postcss').Rule[]} */
          const rules = [];
          css.walk((node) => {
            if (node.type === 'rule') {
              rules.push(node);
            } else if (
              node.type === 'atrule' &&
              isAsciiCaseInsensitive(node.name, 'namespace')
            ) {
              hasDefaultNamespace ||= isDefaultNamespace(node.params);
            }
          });
          for (const rule of rules) {
            const source =
              rule.raws.selector && rule.raws.selector.value === rule.selector
                ? rule.raws.selector.raw
                : rule.selector;
            if (source.at(-1) === ':') continue;
            const inKeyframes =
              rule.parent?.type === 'atrule' &&
              isKeyframesAtRule(rule.parent.name);
            if (
              !inKeyframes &&
              !hasDefaultNamespace &&
              isFixedPointSelector(source)
            ) {
              continue;
            }
            const cacheKey = `${inKeyframes ? 'k' : 's'}${hasDefaultNamespace ? 'n' : ''}\0${source}`;
            let output = cache.get(cacheKey);
            if (output === undefined) {
              output = normalizeList(
                source,
                resolved.sort,
                fold,
                inKeyframes,
                hasDefaultNamespace
              );
              cache.set(cacheKey, output);
            }
            rule.selector = output;
          }
        },
      };
    },
  };
}

/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;
export {
  moduleExports as default,
  moduleExports as 'module.exports',
  isInvalidSelector,
};
