import minifyWeight from './lib/minify-weight.js';
import minifyFamily from './lib/minify-family.js';
import minifyFont from './lib/minify-font.js';

const fontRegex = /^(?:font|font-family|font-weight)$/i;
/**
 * @param {string} value
 * @return {boolean}
 */
function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

/** @type {Map<string, (value: string, opts: Options, removeQuotes: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight') | undefined) => string>} */
const propertyMinifiers = new Map([
  [
    'font-weight',
    (value) => (hasVariableFunction(value) ? value : minifyWeight(value)),
  ],
  [
    'font-family',
    (value, opts, removeQuotes) =>
      hasVariableFunction(value)
        ? value
        : minifyFamily(value, opts, removeQuotes),
  ],
  [
    'font',
    (value, opts, removeQuotes) => minifyFont(value, opts, removeQuotes),
  ],
]);

/**
 * @param {string} prop
 * @param {string} value
 * @param {Options} opts
 * @return {string}
 */
function transform(prop, value, opts) {
  let targetType = prop.toLowerCase();
  let removeQuotes = opts.removeQuotes;

  if (typeof opts.removeQuotes === 'function') {
    targetType = opts.removeQuotes(prop) || targetType;
    removeQuotes = true;
  }

  const minifier = propertyMinifiers.get(targetType);
  if (minifier) {
    return minifier(value, opts, removeQuotes);
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
          /** @param {import('postcss').Declaration} decl */
          const handleDecl = (decl) => {
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
          };

          if (typeof normalizedOpts.removeQuotes === 'function') {
            css.walkDecls(handleDecl);
          } else {
            css.walkDecls(fontRegex, handleDecl);
          }
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
