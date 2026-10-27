import reduceTokens, {
  hasPotentialMathFunction,
} from 'postcss-calc/reduce-tokens';
import { parsedValueText } from '../../utils/parsedValueText.js';
import { tokens } from '../../utils/value.js';

/** @import {PostCssCalcOptions} from 'postcss-calc' */
/** @import {ReduceCalcOptions} from 'postcss-calc/reduce-tokens' */
/** @import {TokenReplacement} from 'postcss-calc/reduce-tokens' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, StageEntry, Stage, TextReducer} from '../../pipeline/host.js' */

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
 * @returns {string}
 */
function reducePrelude(text, options, warn) {
  if (!hasPotentialMathFunction(text)) return text;
  const list = tokens(text);
  const replacements = reduceTokens(list, reduceOptions(options, warn, false));
  if (replacements.length === 0) return text;
  return applyReplacements(list, replacements)
    .map((token) => token[1])
    .join('');
}

/**
 * The stage for one run. Its value reducer joins the walk of the other value
 * stages, and its prelude and selector reducers join the walk of the preludes
 * and selectors.
 *
 * @param {PostCssCalcOptions} options
 * @returns {Stage}
 */
function calcStage(options) {
  /** @type {TextReducer} */
  const reduceAtRule = (text, _context, warn) =>
    reducePrelude(text, options, warn);
  /** @type {Reducer} */
  const reduceSelector = (buffer) => {
    // After an edit, reduceTokens finds the math functions in the tokens.
    if (!buffer.isEdited() && !hasPotentialMathFunction(buffer.text())) return;
    /** @type {(message: string, plugin?: string) => void} */
    const warn = (message, plugin) => buffer.warn(message, plugin);
    // reduceTokens reads its input only, so the buffer's readonly view is safe.
    buffer.replaceRanges(
      reduceTokens(
        /** @type {CSSToken[]} */ (buffer.tokens()),
        reduceOptions(options, warn, true)
      )
    );
  };
  return {
    forAtRule: options.mediaQueries ? () => reduceAtRule : undefined,
    selector: options.selectors ? reduceSelector : undefined,
    forProperty: () => (buffer) => {
      if (!buffer.isEdited() && !hasPotentialMathFunction(buffer.text()))
        return;
      /** @type {(message: string, plugin?: string) => void} */
      const warn = (message, plugin) => buffer.warn(message, plugin);
      // PostCSS gives the value without comments, so reduce what it would give.
      if (!buffer.text().includes('/*')) {
        // reduceTokens reads its input only, so the buffer's readonly view is safe.
        const replacements = reduceTokens(
          /** @type {CSSToken[]} */ (buffer.tokens()),
          reduceOptions(options, warn, false)
        );
        buffer.replaceRanges(replacements);
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
  };
}

/** @satisfies {StageEntry} */
const calc = {
  create: (/** @type {PostCssCalcOptions} */ options) => calcStage(options),
};

export { calc as default };
