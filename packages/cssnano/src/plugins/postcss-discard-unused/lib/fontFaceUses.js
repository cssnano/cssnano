import {
  isTokenComment,
  isTokenIdent,
  isTokenString,
  isTokenWhitespace,
} from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { DECLARATION } from '../../../ir/blockRecord.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from '../../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */

const { asciiLowerCase, isSubstitutionToken } = cssnanoUtils;

/**
 * The declared families, stored word by word from the last word, so a run of
 * identifiers finds every family it ends with in one backward walk.
 *
 * @typedef {object} FamilyTrie
 * @property {Map<string, FamilyTrie>} preceding the nodes one word earlier
 * @property {string | undefined} family the family these words spell, if any
 */

/** @return {FamilyTrie} */
function familyTrie() {
  return { preceding: new Map(), family: undefined };
}

/**
 * @param {FamilyTrie} trie
 * @param {string} family
 * @return {void}
 */
function addFamily(trie, family) {
  const words = family.split(' ');
  let node = trie;
  for (let i = words.length - 1; i >= 0; i--) {
    let next = node.preceding.get(words[i]);
    if (next === undefined) {
      next = familyTrie();
      node.preceding.set(words[i], next);
    }
    node = next;
  }
  node.family = family;
}

/**
 * Marks every declared family that a run of identifiers ends with. A `font`
 * shorthand puts style keywords before the family, so any suffix of the run
 * may be the family.
 *
 * @param {string[]} run
 * @param {FamilyTrie} trie
 * @param {Set<string>} used
 * @return {void}
 */
function markRunFamilies(run, trie, used) {
  let node = trie;
  for (let i = run.length - 1; i >= 0; i--) {
    const next = node.preceding.get(run[i]);
    if (next === undefined) return;
    node = next;
    if (node.family !== undefined) used.add(node.family);
  }
}

/**
 * Marks the declared families a font declaration may use, decoded so quoting,
 * escapes, extra whitespace and case do not matter. Every string is a name,
 * and so is every suffix of a run of identifiers. Over-marking only keeps more
 * faces.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {FamilyTrie} trie
 * @param {Set<string>} used
 * @return {void}
 */
function markUsedFamilies(tokens, trie, used) {
  /** @type {string[]} */
  const run = [];
  for (const token of tokens) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    if (isTokenIdent(token)) {
      run.push(asciiLowerCase(token[4].value));
      continue;
    }
    markRunFamilies(run, trie, used);
    run.length = 0;
    if (isTokenString(token)) used.add(asciiLowerCase(token[4].value));
  }
  markRunFamilies(run, trie, used);
}

/**
 * The family a `@font-face` declares: a lone string, or identifiers that join
 * with single spaces. Anything else is not a name this plugin understands.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {string | undefined}
 */
function declaredFamily(tokens) {
  /** @type {string[]} */
  const parts = [];
  let quoted = false;
  for (const token of tokens) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    if (quoted) return undefined;
    if (isTokenIdent(token)) parts.push(token[4].value);
    else if (isTokenString(token) && parts.length === 0) {
      parts.push(token[4].value);
      quoted = true;
    } else return undefined;
  }
  return parts.length === 0 ? undefined : asciiLowerCase(parts.join(' '));
}

/**
 * The families that the `font-family` descriptors of a `@font-face` name, or
 * undefined when one is not a plain family name. Browsers use the last valid
 * descriptor, and only a browser knows which that is, so every one counts.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {string[] | undefined}
 */
function faceFamilies(records, tokenLists, index) {
  const { links } = records;
  /** @type {string[]} */
  const families = [];
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
    const family = declaredFamily(tokenLists.get(entry.valueList));
    if (family === undefined) return undefined;
    families.push(family);
  }
  return families;
}

/**
 * A `@font-face` goes when it names no family, or when no family that its
 * descriptors name is in use. A substitution function in a family declaration
 * may name any family, so every face that names one stays, as does a face
 * with a descriptor that is not a plain family name.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @param {ArenaIndex[]} decls
 * @param {(index: ArenaIndex) => void} remove
 * @return {void}
 */
export function filterFont(records, tokenLists, indices, decls, remove) {
  const trie = familyTrie();
  /** @type {(string[] | undefined)[]} */
  const faces = [];
  for (const index of indices) {
    const families = faceFamilies(records, tokenLists, index);
    if (families?.length === 0) remove(index);
    else if (families !== undefined)
      for (const family of families) addFamily(trie, family);
    faces.push(families);
  }
  /** @type {Set<string>} */
  const used = new Set();
  for (const index of decls) {
    const entry =
      /** @type {import('../../../ir/declarationRecord.js').DeclarationRecord} */ (
        records.entry(index)
      );
    const tokens = tokenLists.get(entry.valueList);
    if (tokens.some(isSubstitutionToken)) return;
    markUsedFamilies(tokens, trie, used);
  }
  for (let i = 0; i < indices.length; i++) {
    const families = faces[i];
    if (
      families !== undefined &&
      families.length > 0 &&
      !families.some((family) => used.has(family))
    )
      remove(indices[i]);
  }
}
