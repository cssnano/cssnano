import {
  isTokenCloseParen,
  isTokenComment,
  isTokenComma,
  isTokenFunction,
  isTokenIdent,
  isTokenOpenParen,
  isTokenWhitespace,
} from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import {
  counterStyle,
  predefinedCounterStyles,
} from '../../postcss-reduce-idents/lib/slots.js';
import { preludeListOf } from '../../../ir/declaredText.js';
import { commentFreeText } from '../../../values/tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from '../../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */
/** @import {RecordSymbolLists} from '../../../run/symbolLists.js' */

const { asciiLowerCase, isSubstitutionFunction } = cssnanoUtils;
const predefined = new Set(predefinedCounterStyles);

/**
 * The key a counter style name compares by. Author names are case-sensitive,
 * but CSS Counter Styles 3 lowercases a predefined name wherever it is used,
 * so `LOWER-ROMAN` overrides and references `lower-roman`.
 *
 * @param {string} name the decoded identifier
 * @return {string}
 */
function counterStyleKey(name) {
  const lower = asciiLowerCase(name);
  return predefined.has(lower) ? lower : name;
}

/**
 * @param {string} name the decoded identifier
 * @param {Set<string>} names
 * @param {string[] | undefined} added receives the key if it was not yet in `names`
 * @return {void}
 */
function addName(name, names, added) {
  const key = counterStyleKey(name);
  if (names.has(key)) return;
  names.add(key);
  added?.push(key);
}

/**
 * Whether a value contains a substitution function, such as `var()` or
 * `env()`, whose result can name a counter style the value does not spell.
 * An `attr()` names one only through a type that yields an identifier.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {boolean}
 */
function hasSubstitutionFunction(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!isTokenFunction(token)) continue;
    const name = asciiLowerCase(token[4].value);
    if (!isSubstitutionFunction(name)) continue;
    if (name !== 'attr' || attrYieldsIdent(tokens, i)) return true;
  }
  return false;
}

/**
 * Whether the `attr()` call opened at `start` can yield an identifier: it has
 * a fallback, which can be anything, or its type is `type()` or the legacy
 * `ident`. Untyped, it yields a string, and the other types (`url`, `number`,
 * a unit) yield no identifier either. The scan stops at the first comma or
 * function, so nested calls are not read twice.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start the index of the function token
 * @return {boolean}
 */
function attrYieldsIdent(tokens, start) {
  let named = false;
  for (let i = start + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (isTokenCloseParen(token)) return false;
    if (isTokenComma(token) || isTokenFunction(token)) return true;
    if (!isTokenIdent(token)) continue;
    if (named && asciiLowerCase(token[4].value) === 'ident') return true;
    named = true;
  }
  return false;
}

/**
 * Adds the identifiers at the top level of a value, decoded so an escaped
 * spelling matches the counter style it names.
 *
 * @param {readonly CSSToken[]} tokens the tokens of a value such as `list-style`
 * @param {Set<string>} names
 * @param {string[]} [added] receives each name that was not yet in `names`
 * @return {void}
 */
function addTopLevelIdents(tokens, names, added) {
  let depth = 0;
  for (const token of tokens) {
    if (isTokenFunction(token) || isTokenOpenParen(token)) depth++;
    else if (isTokenCloseParen(token)) depth--;
    else if (depth === 0 && isTokenIdent(token)) {
      addName(token[4].value, names, added);
    }
  }
}

/**
 * Adds the counter styles that calls such as `counter()` and
 * `target-counter()` name, decoded so an escaped spelling matches. The
 * functions and the arguments that name a style come from the data
 * reduce-idents renames them by; such an argument names one when it is a lone
 * identifier. The scan resumes after each call, since none of these
 * functions takes another as an argument, which keeps it linear.
 *
 * @param {readonly CSSToken[]} tokens the tokens of a value such as `content`
 * @param {Set<string>} names
 * @param {string[]} [added] receives each name that was not yet in `names`
 * @return {void}
 */
export function addCounterStyleCalls(tokens, names, added) {
  for (let start = 0; start < tokens.length; start++) {
    const token = tokens[start];
    if (!isTokenFunction(token)) continue;
    const slots = counterStyle.functions.get(asciiLowerCase(token[4].value));
    if (slots !== undefined)
      start = addCallArguments(tokens, start, slots, names, added);
  }
}

/**
 * Adds the lone identifiers that the call opened at `start` passes in its
 * style slots.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start the index of the function token
 * @param {readonly number[]} slots the argument positions that name a style
 * @param {Set<string>} names
 * @param {string[] | undefined} added
 * @return {number} the index of the call's closing parenthesis, or the length
 */
function addCallArguments(tokens, start, slots, names, added) {
  let depth = 0;
  let position = 0;
  let parts = 0;
  let ident = '';
  let end = start + 1;
  for (; end <= tokens.length; end++) {
    const current = tokens[end];
    const closes =
      current === undefined || (depth === 0 && isTokenCloseParen(current));
    if (closes || (depth === 0 && isTokenComma(current))) {
      if (parts === 1 && ident !== '' && slots.includes(position)) {
        addName(ident, names, added);
      }
      if (closes) break;
      position++;
      parts = 0;
      ident = '';
    } else if (isTokenCloseParen(current)) {
      depth--;
    } else if (depth > 0) {
      if (isTokenFunction(current) || isTokenOpenParen(current)) depth++;
    } else if (!isTokenWhitespace(current) && !isTokenComment(current)) {
      parts++;
      ident = isTokenIdent(current) ? current[4].value : '';
      if (isTokenFunction(current) || isTokenOpenParen(current)) depth++;
    }
  }
  return end;
}

/**
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {readonly CSSToken[]}
 */
function declarationTokens(records, tokenLists, index) {
  const entry =
    /** @type {import('../../../ir/declarationRecord.js').DeclarationRecord} */ (
      records.entry(index)
    );
  return tokenLists.get(entry.valueList);
}

/**
 * The name a `@counter-style` prelude defines: the key of a lone identifier,
 * decoded so an escaped spelling matches its references, or else the
 * prelude's text.
 *
 * @param {readonly CSSToken[]} prelude
 * @return {string}
 */
export function counterStyleName(prelude) {
  /** @type {CSSToken | undefined} */
  let name;
  for (const token of prelude) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    if (name !== undefined) return commentFreeText(prelude).trim();
    name = token;
  }
  return name !== undefined && isTokenIdent(name)
    ? counterStyleKey(name[4].value)
    : commentFreeText(prelude).trim();
}

/**
 * The names that the counter styles in use reach. A declaration outside every
 * counter style, such as `list-style`, uses a name; a counter style that is in
 * use uses the names its own declarations (such as `system: extends`) refer to.
 * Reachability, not a single scan, so a chain of unused counter styles goes in
 * one run.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {RecordSymbolLists} lists
 * @return {Set<string> | undefined} undefined when a substitution function
 *   makes the use unknowable
 */
export function usedCounterStyleNames(records, tokenLists, lists) {
  // Counter styles that share a name share one list of declarations.
  /** @type {Map<string, ArenaIndex[]>} */
  const declsByName = new Map();
  /** @type {Map<ArenaIndex, ArenaIndex[]>} */
  const declsByCounterStyle = new Map();
  for (const index of lists.counterStyles) {
    const entry =
      /** @type {import('../../../ir/blockRecord.js').BlockRecord} */ (
        records.entry(index)
      );
    const name = counterStyleName(preludeListOf(tokenLists, entry));
    let decls = declsByName.get(name);
    if (!decls) {
      decls = [];
      declsByName.set(name, decls);
    }
    declsByCounterStyle.set(index, decls);
  }
  /** @type {ArenaIndex[]} */
  const rootDecls = [];
  for (const index of lists.listStyleDecls) {
    const parent = records.links.parentOf(index);
    const decls = parent === -1 ? undefined : declsByCounterStyle.get(parent);
    if (decls) decls.push(index);
    else rootDecls.push(index);
  }

  /** @type {Set<string>} */
  const used = new Set();
  /** @type {string[]} the used names whose counter styles are not yet read */
  const pending = [];
  for (const index of rootDecls) {
    const tokens = declarationTokens(records, tokenLists, index);
    if (hasSubstitutionFunction(tokens)) return;
    addTopLevelIdents(tokens, used, pending);
  }
  for (const index of lists.counterStyleFunctionDecls) {
    const tokens = declarationTokens(records, tokenLists, index);
    if (hasSubstitutionFunction(tokens)) return;
    addCounterStyleCalls(tokens, used, pending);
  }
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    const decls = declsByName.get(name);
    if (!decls) continue;
    for (const index of decls) {
      const tokens = declarationTokens(records, tokenLists, index);
      addTopLevelIdents(tokens, used, pending);
    }
  }
  return used;
}
