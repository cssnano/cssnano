import valueParser from 'postcss-value-parser';
import { rules } from './legacy/rules.js';
import vendorUnprefixed from './legacy/vendorUnprefixed.js';

const variableFunctions = new Set(['var', 'env', 'constant']);

function shouldAbort(parsed) {
  let abort = false;
  parsed.walk((node) => {
    if (
      node.type === 'comment' ||
      (node.type === 'function' &&
        variableFunctions.has(node.value.toLowerCase())) ||
      (node.type === 'word' && node.value.includes('___CSS_LOADER_IMPORT___'))
    ) {
      abort = true;
      return false;
    }
    return true;
  });
  return abort;
}

function getValue(decl) {
  return decl.raws?.value?.raw || decl.value;
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-ordered-values',
    prepare() {
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls((decl) => {
            const processor = rules.get(
              vendorUnprefixed(decl.prop.toLowerCase())
            );
            if (!processor) return;
            const value = getValue(decl);
            if (cache.has(value)) {
              decl.value = cache.get(value);
              return;
            }
            const parsed = valueParser(value);
            if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
              cache.set(value, value);
              return;
            }
            const result = processor(parsed);
            decl.value = result;
            cache.set(value, result);
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;

export default pluginCreator;
