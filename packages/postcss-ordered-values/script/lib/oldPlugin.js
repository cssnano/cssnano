import valueParser from 'postcss-value-parser';
import {
  normalizeGridAutoFlow,
  normalizeGridColumnRowGap,
  normalizeGridColumnRow,
} from '../../src/rules/grid.js';
import animation from '../../src/rules/animation.js';
import border from '../../src/rules/border.js';
import boxShadow from '../../src/rules/boxShadow.js';
import flexFlow from '../../src/rules/flexFlow.js';
import transition from '../../src/rules/transition.js';
import listStyle from '../../src/rules/listStyle.js';
import column from '../../src/rules/columns.js';
import vendorUnprefixed from '../../src/lib/vendorUnprefixed.js';

const borderRules = [
  ['border', border],
  ['border-block', border],
  ['border-inline', border],
  ['border-block-end', border],
  ['border-block-start', border],
  ['border-inline-end', border],
  ['border-inline-start', border],
  ['border-top', border],
  ['border-right', border],
  ['border-bottom', border],
  ['border-left', border],
];

const grid = [
  ['grid-auto-flow', normalizeGridAutoFlow],
  ['grid-column-gap', normalizeGridColumnRowGap],
  ['grid-row-gap', normalizeGridColumnRowGap],
  ['grid-column', normalizeGridColumnRow],
  ['grid-row', normalizeGridColumnRow],
  ['grid-row-start', normalizeGridColumnRow],
  ['grid-row-end', normalizeGridColumnRow],
  ['grid-column-start', normalizeGridColumnRow],
  ['grid-column-end', normalizeGridColumnRow],
];

const columnRules = [
  ['column-rule', border],
  ['columns', column],
];

const rules = new Map([
  ['animation', animation],
  ['outline', border],
  ['box-shadow', boxShadow],
  ['flex-flow', flexFlow],
  ['list-style', listStyle],
  ['transition', transition],
  ...borderRules,
  ...grid,
  ...columnRules,
]);

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
    return false;
  });
  return abort;
}

function getValue(decl) {
  return decl.raws?.value?.raw || decl.value;
}

function restoreLegacyStringifiers(parsed) {
  parsed.walk((node) => {
    if (node.type === 'function') {
      node.toString = () => valueParser.stringify(node);
    }
    return true;
  });
  return parsed;
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
            const parsed = restoreLegacyStringifiers(valueParser(value));
            if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
              cache.set(value, value);
              return;
            }
            const result = processor(parsed).toString();
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
