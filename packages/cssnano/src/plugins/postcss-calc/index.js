import reduceTokens, {
  hasPotentialMathFunction,
} from 'postcss-calc/reduce-tokens';
import { parsedValueText } from '../../utils/parsedValueText.js';
import { tokens } from '../../utils/value.js';

/** @import {PostCssCalcOptions} from 'postcss-calc' */
/** @import {ReduceCalcOptions} from 'postcss-calc/reduce-tokens' */
/** @import {TokenReplacement} from 'postcss-calc/reduce-tokens' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Helpers, Root} from 'postcss' */
/** @import {StageEntry, Stage} from '../../pipeline/host.js' */

/**
 * The reducer options for one text. A parse error goes to the `onParseError`
 * option when it is set, and otherwise to `warn`. A selector cannot keep a
 * calc() that does not resolve to a plain value, so it always unwraps.
 *
 * @param {PostCssCalcOptions} options
 * @param {(message: string, plugin?: string) => void} warn
 * @param {boolean} selector
 * @returns {ReduceCalcOptions}
 */
function reduceOptions(options, warn, selector) {
  return {
    precision: options.precision,
    warnWhenCannotResolve: options.warnWhenCannotResolve,
    onParseError:
      options.onParseError ?? ((error) => warn(error.message, 'postcss-calc')),
    onWarn: (message) => warn(message, 'postcss-calc'),
    unwrapSingleValue: selector || options.unwrapSingleValue,
  };
}

/**
 * Writes the replacements of a token list in one pass. The replacements are
 * ordered and non-overlapping, as reduceTokens returns them.
 *
 * @param {readonly CSSToken[]} list
 * @param {readonly TokenReplacement[]} replacements
 * @returns {CSSToken[]}
 */
function applyReplacements(list, replacements) {
  /** @type {CSSToken[]} */
  const out = [];
  let index = 0;
  for (const { start, end, tokens: replacement } of replacements) {
    for (; index < start; index++) out.push(list[index]);
    out.push(...replacement);
    index = end;
  }
  for (; index < list.length; index++) out.push(list[index]);
  return out;
}

/**
 * Reduces the calc() functions of a prelude. A prelude without a `(` has none,
 * so it is returned as it is.
 *
 * @param {string} text
 * @param {PostCssCalcOptions} options
 * @param {(message: string, plugin?: string) => void} warn
 * @param {boolean} selector
 * @returns {string}
 */
function reducePrelude(text, options, warn, selector) {
  if (!hasPotentialMathFunction(text)) return text;
  const list = tokens(text);
  const replacements = reduceTokens(
    list,
    reduceOptions(options, warn, selector)
  );
  if (replacements.length === 0) return text;
  return applyReplacements(list, replacements)
    .map((token) => token[1])
    .join('');
}

/**
 * The at-rule and selector parts of the calc stage. They run once the walk of
 * the declarations has finished, since they change no declaration.
 *
 * @param {Root} root
 * @param {PostCssCalcOptions} options
 * @param {Helpers['result']} result
 */
function reducePreludes(root, options, result) {
  if (!options.mediaQueries && !options.selectors) return;
  root.walk((node) => {
    if (node.type === 'atrule' && options.mediaQueries) {
      const params = reducePrelude(
        node.params,
        options,
        (message, plugin) => result.warn(message, { plugin, node }),
        false
      );
      if (params !== node.params) node.params = params;
    }
    if (node.type === 'rule' && options.selectors) {
      const selector = reducePrelude(
        node.selector,
        options,
        (message, plugin) => result.warn(message, { plugin, node }),
        true
      );
      if (selector !== node.selector) node.selector = selector;
    }
  });
}

/**
 * The stage for one run. Its value reducer joins the walk of the other value
 * stages, and its at-rule and selector part follows that walk.
 *
 * @param {PostCssCalcOptions} options
 * @returns {Stage}
 */
function calcStage(options) {
  return {
    forProperty: () => (buffer) => {
      if (!hasPotentialMathFunction(buffer.text())) return;
      /** @type {(message: string, plugin?: string) => void} */
      const warn = (message, plugin) => buffer.warn(message, plugin);
      // PostCSS gives the value without comments, so reduce what it would give.
      if (!buffer.text().includes('/*')) {
        // reduceTokens reads its input only, so the buffer's readonly view is safe.
        const replacements = reduceTokens(
          /** @type {CSSToken[]} */ (buffer.tokens()),
          reduceOptions(options, warn, false)
        );
        for (let index = replacements.length - 1; index >= 0; index--) {
          const { start, end, tokens: replacement } = replacements[index];
          buffer.replace(start, end, replacement);
        }
        return;
      }
      const list = tokens(parsedValueText(buffer.tokens()));
      const replacements = reduceTokens(
        list,
        reduceOptions(options, warn, false)
      );
      if (replacements.length === 0) return;
      buffer.replace(
        0,
        buffer.tokens().length,
        applyReplacements(list, replacements)
      );
    },
    run: (root, helpers) => reducePreludes(root, options, helpers.result),
  };
}

/** @satisfies {StageEntry} */
const calc = {
  create: (/** @type {PostCssCalcOptions} */ options) => calcStage(options),
};

export { calc as default };
