import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../../../passes/ir/blockRecord.js';
import { classifyDeclaration } from './grammar.js';
import { trailingEscape } from './trailingEscape.js';
import {
  declaredValue,
  declaredValueTokens,
  atRuleAt,
  preludeTextOf,
} from './declaredText.js';
import { walkValue } from './valueWalk.js';

const { asciiLowerCase, decoded, tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {TokenLists} from '../../../passes/ir/tokenLists.js' */

/**
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {string | undefined} the name an ident or string token spells
 */
function spelledName(token) {
  if (token[0] === TokenType.Ident) {
    return decoded(token);
  }
  return token[0] === TokenType.String
    ? /** @type {{value: string}} */ (token[4]).value
    : undefined;
}

/**
 * Whether a value may spell one of the names. Without an escape or a NUL,
 * which CSS replaces with U+FFFD, an ident or string spelling a name contains
 * it literally, so most values are ruled out without tokenizing them.
 *
 * @param {string} value
 * @param {Set<string>} names
 * @return {boolean}
 */
function maySpell(value, names) {
  if (value.includes('\\') || value.includes('\0')) {
    return true;
  }
  for (const name of names) {
    if (value.includes(name)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} value
 * @param {Set<string>} candidates the names worth protecting
 * @param {Set<string>} names
 * @param {boolean} everywhere whether the whole value is substituted text
 * @param {boolean} rewritesCounterSlots whether the rewriter respells the
 *   counter style arguments of counter functions in this value
 * @param {readonly CSSToken[]} [parsed] the tokens that spell `value`
 * @return {void}
 */
function collectNames(
  value,
  candidates,
  names,
  everywhere,
  rewritesCounterSlots,
  parsed
) {
  if (!maySpell(value, candidates)) {
    return;
  }
  const spelled = walkValue(parsed ?? tokens(value), (token, frame) => {
    const isRewritten =
      rewritesCounterSlots && frame?.expectedArgs?.includes(frame.argIndex);
    return everywhere || (frame && !isRewritten)
      ? spelledName(token)
      : undefined;
  });
  for (const name of spelled) {
    if (candidates.has(name)) {
      names.add(name);
    }
  }
}

/**
 * @param {string} value the declared value
 * @param {string | undefined} restored the result of `trailingEscape`
 * @return {string[]} every text the declaration value may be read as; an
 *   unknown code point after a trailing backslash is read both as the end of
 *   the value and as an escaped space
 */
function spellingsOf(value, restored) {
  return restored === undefined ? [value, `${value} `] : [restored];
}

/**
 * @typedef {{
 *   index: ArenaIndex,
 *   classification: NonNullable<ReturnType<typeof classifyDeclaration>>,
 *   value: string,
 *   tokens: readonly CSSToken[]
 * }} Reference
 */

/**
 * The tokens of a reference's value, which the scan and the rewrite share.
 * A trailing escape can restore whitespace the value lacks, and then the
 * restored text is tokenized.
 *
 * @param {TokenLists} tokenLists
 * @param {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} record
 * @param {string} value the result of `declaredValue`
 * @param {string} restored the result of `trailingEscape`
 * @return {readonly CSSToken[]}
 */
function referenceTokens(tokenLists, record, value, restored) {
  return restored === value
    ? declaredValueTokens(tokenLists, record, value)
    : tokens(restored);
}

/**
 * Calls `visit` on each declaration under an entry, in document order.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {(index: ArenaIndex) => void} visit
 * @return {void}
 */
function forEachDeclaration(records, index, visit) {
  const { links } = records;
  for (
    let child = links.firstChild(index);
    child !== -1;
    child = links.nextSibling(child)
  ) {
    const kind = records.entry(child).kind;
    if (kind === DECLARATION) visit(child);
    else if (kind === RULE || kind === AT_RULE_BLOCK) {
      forEachDeclaration(records, child, visit);
    }
  }
}

/**
 * The name of an at-rule record, folded, or '' for another kind.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex | -1} index
 * @return {string}
 */
function atRuleNameOf(records, index) {
  if (index === -1) return '';
  const entry = atRuleAt(records, index);
  return entry.kind === AT_RULE_BLOCK || entry.kind === AT_RULE_STATEMENT
    ? entry.name
    : '';
}

/**
 * One pass over the stylesheet's declarations that finds the names substituted
 * text may spell and the declarations that reference keyframes or counter
 * styles. Substituted text is custom property values, `@property` initial
 * values, `@function` definitions, and references inside functions other than
 * the known counter-function argument slots. Declaration walks do not rewrite
 * such names, so they must protect their definitions.
 *
 * The invariant: every place a name is spelled is either rewritten when its
 * definition is removed or keeps that definition. A spelling that no
 * declaration rewrite reaches therefore has to be collected here.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} decls every declaration of the stylesheet that is still
 *   attached
 * @param {Set<string>} candidates the names that may be merged; only they
 *   need protection
 * @param {ArenaIndex[]} functionRules the `@function` rules
 * @param {ArenaIndex[]} parameterRules the `@mixin` and `@apply` rules, whose
 *   parameter defaults and arguments are substituted
 * @param {ArenaIndex[]} conditionRules the `@container`, `@when` and `@else`
 *   rules, whose preludes may test a property in a style query
 * @return {{ protectedNames: Set<string>, references: Reference[] }}
 */
function scanDeclarations(
  records,
  tokenLists,
  decls,
  candidates,
  functionRules,
  parameterRules,
  conditionRules
) {
  /** @type {Set<string>} */
  const protectedNames = new Set();
  /** @type {Reference[]} */
  const references = [];
  for (const rule of functionRules) {
    collectNames(
      preludeTextOf(tokenLists, atRuleAt(records, rule)),
      candidates,
      protectedNames,
      true,
      false
    );
    forEachDeclaration(records, rule, (index) => {
      const value = declaredValue(
        tokenLists,
        /** @type {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} */ (
          records.entry(index)
        )
      );
      for (const spelling of spellingsOf(
        value,
        trailingEscape(records, tokenLists, index)
      )) {
        collectNames(spelling, candidates, protectedNames, true, false);
      }
    });
  }
  for (const rule of parameterRules) {
    collectNames(
      preludeTextOf(tokenLists, atRuleAt(records, rule)),
      candidates,
      protectedNames,
      true,
      false
    );
  }
  for (const rule of conditionRules) {
    collectNames(
      preludeTextOf(tokenLists, atRuleAt(records, rule)),
      candidates,
      protectedNames,
      false,
      false
    );
  }
  for (const index of decls) {
    const record =
      /** @type {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} */ (
        records.entry(index)
      );
    const prop = asciiLowerCase(record.prop);
    const parent = records.links.parentOf(index);
    const parentName = asciiLowerCase(atRuleNameOf(records, parent));
    const classification = classifyDeclaration(
      prop,
      parentName.endsWith('counter-style')
    );
    const value = declaredValue(tokenLists, record);
    const restored = trailingEscape(records, tokenLists, index);
    // A reference that cannot be rewritten is skipped, so it must protect
    // every name it may spell.
    const isUnrewritable = restored === undefined;
    /** @type {readonly CSSToken[] | undefined} */
    let parsed;
    if (classification && !isUnrewritable) {
      parsed = referenceTokens(tokenLists, record, value, restored);
      references.push({
        index,
        classification,
        value: restored,
        tokens: parsed,
      });
    }
    const isInitialValue =
      prop === 'initial-value' && atRuleNameOf(records, parent) === 'property';
    const everywhere =
      prop.startsWith('--') ||
      isInitialValue ||
      (classification !== null && isUnrewritable);
    if (everywhere || value.includes('(')) {
      for (const spelling of spellingsOf(value, restored)) {
        collectNames(
          spelling,
          candidates,
          protectedNames,
          everywhere,
          classification?.kind === 'counter-style-func',
          parsed
        );
      }
    }
  }
  return { protectedNames, references };
}

export { scanDeclarations };
