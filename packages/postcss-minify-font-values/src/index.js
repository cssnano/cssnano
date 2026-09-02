import minifyWeight from './lib/minify-weight.js';
import minifyFamily from './lib/minify-family.js';
import minifyFont from './lib/minify-font.js';

const fontRegex = /font/i;
/**
 * @param {string} value
 * @return {boolean}
 */
function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

/**
 * @param {string} prop
 * @param {string} value
 * @param {Options} opts
 * @return {string}
 */
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
  } else if (
    (lowerCasedProp === 'font-family' || variableType === 'font-family') &&
    !hasVariableFunction(value)
  ) {
    return minifyFamily(value, opts);
  } else if (lowerCasedProp === 'font' || variableType === 'font') {
    return minifyFont(value, opts);
  }

  return value;
}

/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')}} Options */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const normalizedOpts = Object.assign(
    {},
    {
      removeAfterKeyword: false,
      removeDuplicates: true,
      removeQuotes: true,
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-minify-font-values',
    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(fontRegex, (decl) => {
            const value = decl.value;

            if (!value) {
              return;
            }

            const prop = decl.prop;

            const cacheKey = `${prop}|${value}`;

            if (cache.has(cacheKey)) {
              decl.value = cache.get(cacheKey);

              return;
            }

            const newValue = transform(prop, value, normalizedOpts);

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
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
