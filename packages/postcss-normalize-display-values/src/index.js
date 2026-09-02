import {
  isTokenIdent,
  isTokenWhiteSpaceOrComment,
  tokenize,
  TokenType,
} from '@csstools/css-tokenizer';
import mappings from './lib/map.js';

const displayRegex = /^display$/i;

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  let key = '';
  for (const token of tokenize({ css: value })) {
    if (token[0] === TokenType.EOF) {
      break;
    }

    if (isTokenWhiteSpaceOrComment(token)) {
      continue;
    }

    if (!isTokenIdent(token)) {
      return value;
    }

    const identifier = token[4].value.toLowerCase();
    key = key ? `${key},${identifier}` : identifier;
  }

  return mappings.get(key) ?? value;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-display-values',

    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(displayRegex, (decl) => {
            const value = decl.raws.value?.raw ?? decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const result = transform(value);

            decl.value = result;
            if (decl.raws.value?.raw) {
              decl.raws.value = { raw: result, value: result };
            }
            cache.set(value, result);
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
