import { isTokenIdent, tokenize } from '@csstools/css-tokenizer';
import {
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import mappings from './lib/map.js';

const displayRegex = /^display$/i;

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  if (nodes.length === 1) {
    return value;
  }

  const values = nodes
    .filter((_node, index) => index % 2 === 0)
    .filter((node) => isTokenNode(node) && isTokenIdent(node.value))
    .map((node) => node.value[1].toLowerCase());

  if (values.length === 0) {
    return value;
  }

  const match = mappings.get(values.toString());

  if (!match) {
    return value;
  }

  return match;
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
            const value = decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const result = transform(value);

            decl.value = result;
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
