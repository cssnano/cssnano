import { tokenizeValue } from './lib/tokenize.js';
import { normalizeGridAutoFlow, normalizeGridColumnRow } from './rules/grid.js';
import animation from './rules/animation.js';
import border from './rules/border.js';
import boxShadow from './rules/boxShadow.js';
import flexFlow from './rules/flexFlow.js';
import transition from './rules/transition.js';
import listStyle from './rules/listStyle.js';
import column from './rules/columns.js';
import vendorUnprefixed from './lib/vendorUnprefixed.js';

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const borderProcessor = (parsed) => border(parsed.terms);
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null][]} */
const borderRules = [
  ['border', borderProcessor],
  ['border-block', borderProcessor],
  ['border-inline', borderProcessor],
  ['border-block-end', borderProcessor],
  ['border-block-start', borderProcessor],
  ['border-inline-end', borderProcessor],
  ['border-inline-start', borderProcessor],
  ['border-top', borderProcessor],
  ['border-right', borderProcessor],
  ['border-bottom', borderProcessor],
  ['border-left', borderProcessor],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const gridAutoFlowProcessor = (parsed) => normalizeGridAutoFlow(parsed.terms);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const gridLineProcessor = (parsed) => normalizeGridColumnRow(parsed.terms, 2);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const gridLonghandProcessor = (parsed) =>
  normalizeGridColumnRow(parsed.terms, 1);
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null][]} */
const grid = [
  ['grid-auto-flow', gridAutoFlowProcessor],
  ['grid-column', gridLineProcessor],
  ['grid-row', gridLineProcessor],
  ['grid-row-start', gridLonghandProcessor],
  ['grid-row-end', gridLonghandProcessor],
  ['grid-column-start', gridLonghandProcessor],
  ['grid-column-end', gridLonghandProcessor],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const columnRuleProcessor = borderProcessor;
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null][]} */
const columnRules = [
  ['column-rule', columnRuleProcessor],
  ['columns', (parsed) => column(parsed.terms)],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const flexFlowProcessor = (parsed) => flexFlow(parsed.terms);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null} */
const listStyleProcessor = (parsed) => listStyle(parsed.terms);

/** @type {Map<string, (parsed: ReturnType<typeof tokenizeValue>) => string | string[] | null>} */
const rules = new Map([
  ['animation', animation],
  ['outline', borderProcessor],
  ['box-shadow', boxShadow],
  ['flex-flow', flexFlowProcessor],
  ['list-style', listStyleProcessor],
  ['transition', transition],
  ...borderRules,
  ...grid,
  ...columnRules,
]);

/**
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
function getValue(decl) {
  let value = decl.value;
  const raws = decl.raws;
  if (raws && raws.value && raws.value.raw && raws.value.value === decl.value) {
    value = raws.value.raw;
  }

  return value;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} value
 */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) {
    decl.raws.value = { raw: value, value };
  }
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
              assignValue(
                decl,
                /** @type {string} */ (processorCache.get(value))
              );

              return;
            }

            if (value.length < 2 || !/[,\s/]/.test(value)) {
              processorCache.set(value, value);
              assignValue(decl, value);
              return;
            }

            const parsed = tokenizeValue(value);

            if (parsed.terms.length < 2 || parsed.abort) {
              processorCache.set(value, value);
              assignValue(decl, value);

              return;
            }

            const processed = processor(parsed);
            const result = processed === null ? value : processed.toString();

            assignValue(decl, result);
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
