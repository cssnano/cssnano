import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { classifyDeclaration } from './grammar.js';
import { walkValue } from './valueWalk.js';

const { asciiLowerCase, decoded, tokens } = cssnanoUtils;

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
 * @return {void}
 */
function collectNames(
  value,
  candidates,
  names,
  everywhere,
  rewritesCounterSlots
) {
  if (!maySpell(value, candidates)) {
    return;
  }
  const spelled = walkValue(tokens(value), (token, frame) => {
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
 * @typedef {{
 *   decl: import('postcss').Declaration,
 *   classification: NonNullable<ReturnType<typeof classifyDeclaration>>
 * }} Reference
 */

/**
 * One walk over the stylesheet's declarations that finds the names substituted
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
 * @param {import('postcss').Root} css
 * @param {Set<string>} candidates the names that may be merged; only they
 *   need protection
 * @param {import('postcss').AtRule[]} functionRules the `@function` rules
 * @param {import('postcss').AtRule[]} parameterRules the `@mixin` and
 *   `@apply` rules, whose parameter defaults and arguments are substituted
 * @param {import('postcss').AtRule[]} conditionRules the `@container`, `@when`
 *   and `@else` rules, whose preludes may test a property in a style query
 * @return {{ protectedNames: Set<string>, references: Reference[] }}
 */
function scanDeclarations(
  css,
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
    collectNames(rule.params, candidates, protectedNames, true, false);
    rule.walkDecls((decl) => {
      collectNames(decl.value, candidates, protectedNames, true, false);
    });
  }
  for (const rule of parameterRules) {
    collectNames(rule.params, candidates, protectedNames, true, false);
  }
  for (const rule of conditionRules) {
    collectNames(rule.params, candidates, protectedNames, false, false);
  }
  css.walkDecls((decl) => {
    const prop = asciiLowerCase(decl.prop);
    const classification = classifyDeclaration(decl, prop);
    if (classification) {
      references.push({ decl, classification });
    }
    const isInitialValue =
      prop === 'initial-value' &&
      decl.parent?.type === 'atrule' &&
      asciiLowerCase(
        /** @type {import('postcss').AtRule} */ (decl.parent).name
      ) === 'property';
    const everywhere = prop.startsWith('--') || isInitialValue;
    if (everywhere || decl.value.includes('(')) {
      collectNames(
        decl.value,
        candidates,
        protectedNames,
        everywhere,
        classification?.kind === 'counter-style-func'
      );
    }
  });
  return { protectedNames, references };
}

export { scanDeclarations };
