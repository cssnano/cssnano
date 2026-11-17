import {
  isTokenComment,
  isTokenComma,
  isTokenDelim,
  isTokenIdent,
  isTokenString,
  isTokenWhitespace,
} from '@csstools/css-tokenizer';
import { splitComma } from '../../values/splitTopLevel.js';
import cssnanoUtils from '#utils';
import {
  counterStyleName,
  usedCounterStyleNames,
} from './lib/counterStyleUses.js';
import { DECLARATION } from '../../ir/blockRecord.js';
import { preludeListOf } from '../../ir/declaredText.js';
import { commentFreeText } from '../../values/tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from '../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../ir/blockRecords.js' */
/** @import {RunContext} from '../../run/runContext.js' */
/** @import {TokenLists} from '../../ir/tokenLists.js' */
/** @import {RecordSymbolLists} from '../../run/symbolLists.js' */

const { asciiLowerCase } = cssnanoUtils;
const wildcard = true;

/**
 * The text of a record's list, comment-free and trimmed, as PostCSS's cleaned
 * value or params spell it.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {string}
 */
function cleanText(tokens) {
  return commentFreeText(tokens).trim();
}

/**
 * The value of a declaration record, comment-free and trimmed.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {string}
 */
function valueText(records, tokenLists, index) {
  const entry =
    /** @type {import('../../ir/declarationRecord.js').DeclarationRecord} */ (
      records.entry(index)
    );
  return cleanText(tokenLists.get(entry.valueList));
}

/**
 * The keyframes names that the animation declarations reference: each
 * identifier and string, decoded so an escaped spelling matches the name it
 * denotes. Keywords and times are included too, which only over-keeps.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @return {Set<string>}
 */
function referencedNames(records, tokenLists, indices) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const index of indices) {
    const entry =
      /** @type {import('../../ir/declarationRecord.js').DeclarationRecord} */ (
        records.entry(index)
      );
    for (const token of tokenLists.get(entry.valueList)) {
      if (isTokenIdent(token) || isTokenString(token))
        names.add(token[4].value);
    }
  }
  return names;
}

/**
 * The name a `@keyframes` prelude defines: a lone identifier or string,
 * decoded so an escaped spelling matches its references, or else the
 * prelude's text.
 *
 * @param {readonly CSSToken[]} prelude
 * @return {string}
 */
function keyframesName(prelude) {
  /** @type {CSSToken | undefined} */
  let name;
  for (const token of prelude) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    if (name !== undefined) return cleanText(prelude);
    name = token;
  }
  return name !== undefined && (isTokenIdent(name) || isTokenString(name))
    ? name[4].value
    : cleanText(prelude);
}

/**
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @param {Set<string>} names
 * @param {(prelude: readonly CSSToken[]) => string} nameOf
 * @param {(index: ArenaIndex) => void} remove
 * @return {void}
 */
function filterAtRule(records, tokenLists, indices, names, nameOf, remove) {
  for (const index of indices) {
    const entry = /** @type {import('../../ir/blockRecord.js').BlockRecord} */ (
      records.entry(index)
    );
    if (!names.has(nameOf(preludeListOf(tokenLists, entry)))) remove(index);
  }
}

/**
 * @param {readonly CSSToken[]} prelude the tokens of the @namespace prelude
 * @return {string | true | undefined}
 */
function namespacePrefix(prelude) {
  for (const token of prelude) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    return namespacePrefixToken(token);
  }
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken | undefined} token
 * @return {string | true | undefined}
 */
function namespacePrefixToken(token) {
  if (token === undefined) return;
  if (isTokenIdent(token)) return token[4].value;
  if (isTokenDelim(token) && token[1] === '*') return wildcard;
}

/**
 * Find namespace prefixes in each selector-list item. A comma resets the
 * candidate prefix so a type selector in an earlier item cannot be mistaken
 * for the prefix of a later qualified selector. Whitespace also resets it,
 * since qualified names cannot contain whitespace. Comments are removed before
 * parsing, so they do not reset it.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the selector as written
 * @return {(string | true)[]}
 */
function namespacePrefixes(tokens) {
  /** @type {(string | true)[]} */
  const prefixes = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken | undefined} */
  let previous;
  /** @type {string | true | undefined} */
  let pendingPrefix;

  for (const token of tokens) {
    if (isTokenComment(token)) continue;
    if (isTokenComma(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }
    if (isTokenWhitespace(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }

    if (pendingPrefix !== undefined) {
      if (isTokenIdent(token) || (isTokenDelim(token) && token[1] === '*')) {
        prefixes.push(pendingPrefix);
      }
      pendingPrefix = undefined;
    }

    if (isTokenDelim(token) && token[1] === '|') {
      pendingPrefix = namespacePrefixToken(previous);
      previous = undefined;
      continue;
    }

    previous = token;
  }

  return prefixes;
}

/**
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @param {Set<string | true>} prefixes
 * @param {(index: ArenaIndex) => void} remove
 * @return {void}
 */
function filterNamespace(records, tokenLists, indices, prefixes, remove) {
  const usesAny = prefixes.has(wildcard);
  for (const index of indices) {
    const entry = /** @type {import('../../ir/blockRecord.js').BlockRecord} */ (
      records.entry(index)
    );
    const tokens = preludeListOf(tokenLists, entry);
    const prefix = namespacePrefix(tokens);

    if (prefix === undefined) {
      if (cleanText(tokens) === '') remove(index);
    } else if (!usesAny && !prefixes.has(prefix)) {
      remove(index);
    }
  }
}

/**
 * A family is used when any font name in use contains it.
 *
 * @param {string} fontFamily
 * @param {string[]} fonts
 * @return {boolean}
 */
function hasFont(fontFamily, fonts) {
  return splitComma(fontFamily).some((font) =>
    fonts.some((used) => used.includes(font))
  );
}

/**
 * A `@font-face` stays only when it names a family and every family it names
 * is in use. Its families are the font-family declarations among its children.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @param {ArenaIndex[]} decls
 * @param {(index: ArenaIndex) => void} remove
 * @return {void}
 */
function filterFont(records, tokenLists, indices, decls, remove) {
  /** @type {Set<string>} */
  const used = new Set();
  for (const index of decls) {
    for (const font of splitComma(
      asciiLowerCase(valueText(records, tokenLists, index))
    )) {
      used.add(font);
    }
  }
  const fonts = [...used];
  const { links } = records;
  for (const index of indices) {
    let count = 0;
    let unused = false;
    for (
      let child = links.firstChild(index);
      child !== -1;
      child = links.nextSibling(child)
    ) {
      const entry = records.entry(child);
      if (
        entry.kind !== DECLARATION ||
        asciiLowerCase(entry.prop) !== 'font-family'
      )
        continue;
      count++;
      if (
        !hasFont(asciiLowerCase(valueText(records, tokenLists, child)), fonts)
      )
        unused = true;
    }
    if (count === 0 || unused) remove(index);
  }
}

/**
 * @typedef {object} Options
 * @property {boolean} [fontFace] Discards unused font face rules. (default: true)
 * @property {boolean} [counterStyle] Discards unused counter style rules. (default: true)
 * @property {boolean} [keyframes] Discards unused keyframe rules. (default: true)
 * @property {boolean} [namespace] Discards unused namespace rules. (default: true)
 */

/**
 * Removes the at-rules that define a name nothing references. Every reference
 * is read before the first removal, so a reference inside a removed at-rule
 * still keeps its definition, except that a counter style used only by unused
 * counter styles goes too.
 *
 * @param {RecordSymbolLists} lists
 * @param {Options} options
 * @param {(index: ArenaIndex) => void} remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export function discardUnusedSymbols(lists, options, remove, records, context) {
  const { fontFace, counterStyle, keyframes, namespace } = {
    fontFace: true,
    counterStyle: true,
    keyframes: true,
    namespace: true,
    ...options,
  };
  const { tokenLists } = context;
  const counterStyleNames =
    counterStyle && lists.counterStyles.length > 0
      ? usedCounterStyleNames(records, tokenLists, lists)
      : undefined;
  const keyframesNames = keyframes
    ? referencedNames(records, tokenLists, lists.animationDecls)
    : undefined;
  /** @type {Set<string | true>} */
  const prefixes = new Set();
  if (namespace) {
    for (const index of lists.namespaceRules) {
      const entry = /** @type {import('../../ir/ruleRecord.js').RuleRecord} */ (
        records.entry(index)
      );
      for (const id of entry.selectorIds) {
        for (const prefix of namespacePrefixes(tokenLists.get(id))) {
          prefixes.add(prefix);
        }
      }
    }
  }

  if (counterStyleNames) {
    filterAtRule(
      records,
      tokenLists,
      lists.counterStyles,
      counterStyleNames,
      counterStyleName,
      remove
    );
  }
  if (fontFace) {
    filterFont(records, tokenLists, lists.fontFaces, lists.fontDecls, remove);
  }
  if (keyframesNames) {
    filterAtRule(
      records,
      tokenLists,
      lists.keyframes,
      keyframesNames,
      keyframesName,
      remove
    );
  }
  if (namespace) {
    filterNamespace(records, tokenLists, lists.namespaces, prefixes, remove);
  }
}
