import valueParser from 'postcss-value-parser';
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

/** @type {[string, (parsed: valueParser.ParsedValue) => string][]} */
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

/** @type {[string, (parsed: valueParser.ParsedValue) => string | string[] | valueParser.ParsedValue][]} */
const grid = [
  ['grid-auto-flow', normalizeGridAutoFlow],
  ['grid-column-gap', normalizeGridColumnRowGap], // normal | <length-percentage>
  ['grid-row-gap', normalizeGridColumnRowGap], // normal | <length-percentage>
  ['grid-column', normalizeGridColumnRow], // <grid-line>+
  ['grid-row', normalizeGridColumnRow], // <grid-line>+
  ['grid-row-start', normalizeGridColumnRow], // <grid-line>
  ['grid-row-end', normalizeGridColumnRow], // <grid-line>
  ['grid-column-start', normalizeGridColumnRow], // <grid-line>
  ['grid-column-end', normalizeGridColumnRow], // <grid-line>
];

/** @type {[string, (parsed: valueParser.ParsedValue) => string | valueParser.ParsedValue][]} */
const columnRules = [
  ['column-rule', border],
  ['columns', column],
];

/** @type {Map<string, ((parsed: valueParser.ParsedValue) => string | string[] | valueParser.ParsedValue)>} */
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

/**
 * @param {valueParser.Node} node
 * @return {boolean}
 */
function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return variableFunctions.has(node.value.toLowerCase());
}

/**
 * @param {valueParser.ParsedValue} parsed
 * @return {boolean}
 */
function shouldAbort(parsed) {
  let abort = false;

  parsed.walk((node) => {
    if (
      node.type === 'comment' ||
      isVariableFunctionNode(node) ||
      (node.type === 'word' && node.value.includes(`___CSS_LOADER_IMPORT___`))
    ) {
      abort = true;

      return false;
    }
    return false;
  });

  return abort;
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
function getValue(decl) {
  let value = decl.value;
  const raws = decl.raws;
  if (raws && raws.value && raws.value.raw) {
    value = raws.value.raw;
  }

  return value;
}
/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-ordered-values',
    prepare() {
      /** @type {Map<Function, Map<string, string>>} */
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls((decl) => {
            const lowerCasedProp = decl.prop.toLowerCase();
            const normalizedProp = vendorUnprefixed(lowerCasedProp);
            const processor = rules.get(normalizedProp);

            if (!processor) {
              return;
            }

            const value = getValue(decl);
            let processorCache = cache.get(processor);
            if (processorCache === undefined) {
              processorCache = new Map();
              cache.set(processor, processorCache);
            }

            if (processorCache.has(value)) {
              decl.value = /** @type {string} */ (processorCache.get(value));

              return;
            }

            const parsed = valueParser(value);

            if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
              processorCache.set(value, value);

              return;
            }

            const result = processor(parsed).toString();

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
