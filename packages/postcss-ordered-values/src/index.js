import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
} from '@csstools/css-parser-algorithms';
import { isTokenIdent } from '@csstools/css-tokenizer';
import { parseComponentValues, serializeComponentValues } from './lib/parse.js';
import {
  normalizeGridAutoFlow,
  normalizeGridColumnRowGap,
  normalizeGridColumnRow,
} from './rules/grid.js';
import animation from './rules/animation.js';
import border from './rules/border.js';
import boxShadow from './rules/boxShadow.js';
import flexFlow from './rules/flexFlow.js';
import transition from './rules/transition.js';
import listStyle from './rules/listStyle.js';
import column from './rules/columns.js';
import vendorUnprefixed from './lib/vendorUnprefixed.js';

const borderRules = [
  'border',
  'border-block',
  'border-inline',
  'border-block-end',
  'border-block-start',
  'border-inline-end',
  'border-inline-start',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
].map((property) => [property, border]);
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
const rules = new Map([
  ['animation', animation],
  ['outline', border],
  ['box-shadow', boxShadow],
  ['flex-flow', flexFlow],
  ['list-style', listStyle],
  ['transition', transition],
  ...borderRules,
  ...grid,
  ['column-rule', border],
  ['columns', column],
]);
const variableFunctions = new Set(['var', 'env', 'constant']);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes */
function shouldAbort(nodes) {
  return nodes.some(
    (node) =>
      node.type === 'comment' ||
      (isFunctionNode(node) &&
        variableFunctions.has(node.getName().toLowerCase())) ||
      (isTokenNode(node) &&
        isTokenIdent(node.value) &&
        node.value[1].includes('___CSS_LOADER_IMPORT___')) ||
      ((isFunctionNode(node) || isSimpleBlockNode(node)) &&
        shouldAbort(node.value))
  );
}

/** @param {import('postcss').Declaration} decl */
function getValue(decl) {
  return decl.raws?.value?.raw || decl.value;
}

/** @return {import('postcss').Plugin} */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-ordered-values',
    prepare() {
      /** @type {Map<Function, Map<string, string>>} */
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls((decl) => {
            const processor = rules.get(
              vendorUnprefixed(decl.prop.toLowerCase())
            );
            if (!processor) return;
            const value = getValue(decl);
            let processorCache = cache.get(processor);
            if (!processorCache) {
              processorCache = new Map();
              cache.set(processor, processorCache);
            }
            if (processorCache.has(value)) {
              decl.value = processorCache.get(value);
              return;
            }
            const parsed = parseComponentValues(value);
            const result =
              parsed.length < 2 || shouldAbort(parsed)
                ? serializeComponentValues(parsed)
                : processor(parsed);
            decl.value = result;
            processorCache.set(value, result);
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
