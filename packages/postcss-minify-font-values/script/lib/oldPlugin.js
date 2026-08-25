import valueParser from 'postcss-value-parser';
import minifyWeight from '../../src/lib/minify-weight.js';
import minifyFamily from '../../src/lib/minify-family.js';
import minifyFont from '../../src/lib/minify-font.js';

const fontRegex = /font/i;

/** @param {string} value */
function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();
  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

/** @param {string} prop @param {string} value @param {Options} opts */
function transform(prop, value, opts) {
  const lowerCasedProp = prop.toLowerCase();
  let variableType = '';
  if (typeof opts.removeQuotes === 'function') {
    variableType = opts.removeQuotes(prop);
    opts.removeQuotes = true;
  }
  if (
    (lowerCasedProp === 'font-weight' || variableType === 'font-weight') &&
    !hasVariableFunction(value)
  ) {
    return minifyWeight(value);
  }
  if (
    (lowerCasedProp === 'font-family' || variableType === 'font-family') &&
    !hasVariableFunction(value)
  ) {
    const tree = valueParser(value);
    tree.nodes = minifyFamily(tree.nodes, opts);
    return tree.toString();
  }
  if (lowerCasedProp === 'font' || variableType === 'font') {
    return minifyFont(value, opts);
  }
  return value;
}

/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')}} Options */

/** @param {Options} opts */
function pluginCreator(opts) {
  const normalizedOpts = Object.assign(
    {},
    { removeAfterKeyword: false, removeDuplicates: true, removeQuotes: true },
    opts
  );
  return {
    postcssPlugin: 'postcss-minify-font-values',
    prepare() {
      const cache = new Map();
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          css.walkDecls(fontRegex, (decl) => {
            if (!decl.value) return;
            const cacheKey = `${decl.prop}|${decl.value}`;
            if (cache.has(cacheKey)) {
              decl.value = cache.get(cacheKey);
              return;
            }
            const newValue = transform(decl.prop, decl.value, normalizedOpts);
            decl.value = newValue;
            cache.set(cacheKey, newValue);
          });
        },
      };
    },
  };
}

/** @type {true} */
pluginCreator.postcss = true;
export { pluginCreator as default, pluginCreator as 'module.exports' };
