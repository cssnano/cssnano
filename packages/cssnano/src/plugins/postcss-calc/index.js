import { TokenType } from '@csstools/css-tokenizer';
import {
  createReducer,
  hasPotentialMathFunction,
} from 'postcss-calc/reduce-tokens';
import cssnanoUtils from '#utils';

const { asciiLowerCase } = cssnanoUtils;

/** @import {PostCssCalcOptions} from 'postcss-calc' */
/** @import {ReduceCalcOptions} from 'postcss-calc/reduce-tokens' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from '../../values/valueBuffer.js' */
/** @import {Reducer, StageEntry, Stage} from '../../pipeline/host.js' */

/**
 * The reducer options for a stage. A selector cannot keep a calc() that does
 * not resolve to a plain value, so it always unwraps. Warnings go to the
 * buffer that is reduced.
 *
 * @param {PostCssCalcOptions} options
 * @param {boolean} selector
 * @returns {ReduceCalcOptions}
 */
function reduceOptions(options, selector) {
  return {
    precision: options.precision,
    warnWhenCannotResolve: options.warnWhenCannotResolve,
    onParseError: options.onParseError,
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
  const reduce = createReducer(reduceOptions(options, selector));
  return (buffer) => {
    // After an edit, reduceTokens finds the math functions in the tokens.
    if (!buffer.isEdited() && !hasPotentialMathFunction(buffer.text())) return;
    buffer.replaceRanges(
      reduce(/** @type {CSSToken[]} */ (buffer.tokens()), buffer)
    );
  };
}

/**
 * The token ranges of the `style()` queries in a container prelude, as
 * [start, end) indexes. A style query matches a custom property as written.
 *
 * @param {readonly CSSToken[]} list
 * @returns {[number, number][]}
 */
function styleQueryRanges(list) {
  /** @type {[number, number][]} */
  const ranges = [];
  for (let start = 0; start < list.length; start++) {
    const token = list[start];
    if (
      token[0] !== TokenType.Function ||
      asciiLowerCase(token[4].value) !== 'style'
    ) {
      continue;
    }
    let depth = 0;
    let end = start;
    do {
      const type = list[end][0];
      if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
      else if (type === TokenType.CloseParen) depth--;
      end++;
    } while (depth > 0 && end < list.length);
    ranges.push([start, end]);
    start = end - 1;
  }
  return ranges;
}

/**
 * A reducer of the calc() functions in a container prelude outside its
 * `style()` queries. Each run between two queries is reduced on its own, so a
 * calc() inside a query is neither reduced nor warned about.
 *
 * @param {PostCssCalcOptions} options
 * @returns {Reducer}
 */
function reduceContainerTokens(options) {
  const reduce = createReducer(reduceOptions(options, false));
  return (buffer) => {
    if (!buffer.isEdited() && !hasPotentialMathFunction(buffer.text())) return;
    const list = /** @type {CSSToken[]} */ (buffer.tokens());
    const queries = styleQueryRanges(list);
    queries.push([list.length, list.length]);
    /** @type {TokenEdit[]} */
    const edits = [];
    let runStart = 0;
    for (const [queryStart, queryEnd] of queries) {
      for (const edit of reduce(list, buffer, runStart, queryStart)) {
        edits.push(edit);
      }
      runStart = queryEnd;
    }
    buffer.replaceRanges(edits);
  };
}

/**
 * The stage for one run. Its value reducer joins the walk of the other value
 * stages, and its prelude and selector reducers join the walk of the preludes
 * and selectors. A media query and a container query are reduced; a feature
 * query such as `@supports` is left alone, since a reduced `abs()` can pass a
 * test that the original fails.
 *
 * @param {PostCssCalcOptions} options
 * @returns {Stage}
 */
function calcStage(options) {
  const media = { buffer: reduceCalcTokens(options, false) };
  const container = { buffer: reduceContainerTokens(options) };
  const value = reduceCalcTokens(options, false);
  return {
    forAtRule: options.mediaQueries
      ? (name) => {
          switch (asciiLowerCase(name)) {
            case 'media':
              return media;
            case 'container':
              return container;
            default:
              return null;
          }
        }
      : undefined,
    selector: options.selectors ? reduceCalcTokens(options, true) : undefined,
    forProperty: () => value,
  };
}

/** @satisfies {StageEntry} */
const calc = {
  create: (/** @type {PostCssCalcOptions} */ options) => calcStage(options),
};

export { calc as default };
