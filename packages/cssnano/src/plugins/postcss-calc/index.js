import reduceTokens, {
  hasPotentialMathFunction,
} from 'postcss-calc/reduce-tokens';
import { parsedValueText } from '../../utils/parsedValueText.js';
import { tokens } from '../../utils/value.js';
import { spliceRanges } from '../../values/spliceRanges.js';

/** @import {PostCssCalcOptions} from 'postcss-calc' */
/** @import {ReduceCalcOptions} from 'postcss-calc/reduce-tokens' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Reducer, StageEntry, Stage} from '../../pipeline/host.js' */

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
 * A reducer of the calc() functions in the tokens of a buffer, for a selector
 * or a prelude. A buffer without a `(` after its last edit has none, so it is
 * left as it is.
 *
 * @param {PostCssCalcOptions} options
 * @param {boolean} selector
 * @returns {Reducer}
 */
function reduceCalcTokens(options, selector) {
  return (buffer) => {
    // After an edit, reduceTokens finds the math functions in the tokens.
    if (!buffer.isEdited() && !hasPotentialMathFunction(buffer.text())) return;
    /** @type {(message: string, plugin?: string) => void} */
    const warn = (message, plugin) => buffer.warn(message, plugin);
    // reduceTokens reads its input only, so the buffer's readonly view is safe.
    buffer.replaceRanges(
      reduceTokens(
        /** @type {CSSToken[]} */ (buffer.tokens()),
        reduceOptions(options, warn, selector)
      )
    );
  };
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
  const reducePrelude = reduceCalcTokens(options, false);
  return {
    forAtRule: options.mediaQueries
      ? () => ({ buffer: reducePrelude })
      : undefined,
    selector: options.selectors ? reduceCalcTokens(options, true) : undefined,
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
        spliceRanges(list, replacements)
      );
    },
  };
}

/** @satisfies {StageEntry} */
const calc = {
  create: (/** @type {PostCssCalcOptions} */ options) => calcStage(options),
};

export { calc as default };
