import cssnanoUtils from '#utils';
import { supportsAll } from '#utils/browser-support';
import fromInitial from './data/fromInitial.json' with { type: 'json' };
import toInitial from './data/toInitial.json' with { type: 'json' };
import ignoreProps from './lib/ignoreProps.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { tokens: tokenizeValue } = cssnanoUtils;

const initial = 'initial';

/** @type {Map<string, readonly CSSToken[]>} */
const keywordTokens = new Map();

// In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905
const defaultIgnoreProps = ignoreProps;

/**
 * @typedef {object} Options
 * @property {string[]} [ignore] Properties that keep their value, such as `min-height`. (default: none)
 */

/**
 * The tokens of a keyword. Each keyword is tokenized once per process, and
 * every value that takes it shares the frozen list.
 *
 * @param {string} keyword
 * @return {readonly CSSToken[]}
 */
function tokensOfKeyword(keyword) {
  let list = keywordTokens.get(keyword);
  if (list === undefined) {
    list = Object.freeze(tokenizeValue(keyword));
    keywordTokens.set(keyword, list);
  }
  return list;
}

/**
 * Whether the tokens spell the keyword in lowercase, so the value's text is
 * the keyword whatever its case. Each token is compared as it comes, so no
 * text is joined.
 *
 * @param {readonly CSSToken[]} list
 * @param {string} keyword a lowercase keyword
 * @return {boolean}
 */
function spellsKeyword(list, keyword) {
  let position = 0;
  for (const token of list) {
    const text = token[1].toLowerCase();
    if (!keyword.startsWith(text, position)) return false;
    position += text.length;
  }
  return position === keyword.length;
}

/**
 * One reducer per pair of replacements, so properties that are treated alike
 * share it and their plan.
 * @typedef {Map<string | null, Map<string | null, import('../../pipeline/host.js').Reducer>>} Reducers
 */

/**
 * @param {Reducers} reducers
 * @param {string | null} toKeyword the initial value of the property, which becomes `initial`
 * @param {string | null} fromKeyword what `initial` becomes
 * @return {import('../../pipeline/host.js').Reducer}
 */
function reducerFor(reducers, toKeyword, fromKeyword) {
  let byFrom = reducers.get(toKeyword);
  if (byFrom === undefined) {
    byFrom = new Map();
    reducers.set(toKeyword, byFrom);
  }
  let reducer = byFrom.get(fromKeyword);
  if (reducer === undefined) {
    reducer = (buffer) => {
      const list = buffer.tokens();
      if (toKeyword !== null && spellsKeyword(list, toKeyword)) {
        buffer.replace(0, list.length, tokensOfKeyword(initial));
      } else if (fromKeyword !== null && spellsKeyword(list, initial)) {
        buffer.replace(0, list.length, tokensOfKeyword(fromKeyword));
      }
    };
    byFrom.set(fromKeyword, reducer);
  }
  return reducer;
}

/**
 * Compiles the properties to leave alone. The stage does nothing when a
 * browser target lacks the `initial` keyword.
 *
 * @param {Options} options
 * @param {readonly string[] | undefined} browsers
 * @return {import('../../pipeline/host.js').Stage | null}
 */
function compileReduceInitial(options, browsers) {
  if (
    !supportsAll(
      /** @type {readonly string[]} */ (browsers),
      'css-initial-value'
    )
  ) {
    return null;
  }
  const ignoreProp = new Set(defaultIgnoreProps.concat(options.ignore || []));
  /** @type {Reducers} */
  const reducers = new Map();
  return {
    forProperty(property) {
      const lowerCasedProp = property.toLowerCase();
      if (ignoreProp.has(lowerCasedProp)) return null;
      const toKeyword = Object.hasOwn(toInitial, lowerCasedProp)
        ? toInitial[/** @type keyof typeof toInitial */ (lowerCasedProp)]
        : null;
      const fromKeyword =
        fromInitial[/** @type keyof typeof fromInitial */ (lowerCasedProp)] ||
        null;
      if (toKeyword === null && fromKeyword === null) return null;
      return reducerFor(reducers, toKeyword, fromKeyword);
    },
  };
}

/** @satisfies {import('../../pipeline/host.js').StageEntry} */
const reduceInitial = { create: compileReduceInitial };

export { reduceInitial as default };
