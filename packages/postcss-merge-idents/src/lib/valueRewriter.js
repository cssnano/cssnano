import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import {
  COUNTER_STYLE_FUNCTIONS,
  COUNTER_STYLE_RESERVED,
  CSS_WIDE_KEYWORDS,
  KEYFRAMES_SHORTHAND_KEYWORDS,
  getContainer,
} from './grammar.js';

const { applyEdits, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/**
 * @typedef {{ expectedArgs?: number[], argIndex: number, close: TokenType }} NestingFrame
 */

/**
 * @typedef {import('../index.js').FamilyRecord} FamilyRecord
 */

/**
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {import('postcss').Container} container
 * @param {string} targetAtRuleName
 * @param {string} tokenKey
 * @return {string | undefined}
 */
function lookupScopeChain(scopes, container, targetAtRuleName, tokenKey) {
  let curr = container;
  /** @type {Array<Set<string>>} */
  const intermediateDefinedNames = [];

  while (curr) {
    const containerScope = scopes.get(curr);
    const atRuleData = containerScope?.get(targetAtRuleName);
    if (atRuleData) {
      const replacement = atRuleData.resolver?.(tokenKey);
      if (replacement !== undefined) {
        for (const intermediate of intermediateDefinedNames) {
          if (intermediate.has(replacement.key)) {
            return undefined;
          }
        }
        return replacement.text;
      }
      if (atRuleData.definedNames?.has(tokenKey)) {
        return undefined;
      }
      if (atRuleData.definedNames) {
        intermediateDefinedNames.push(atRuleData.definedNames);
      }
    }
    if (curr.type === 'root') {
      break;
    }
    curr = getContainer(curr);
  }
  return undefined;
}

/**
 * Creates one source edit replacing a token with new text. A hex escape
 * consumes the whitespace that terminates it, so the raw text of e.g. `\61 `
 * ends with that separator space; `end` includes it and the replacement must
 * give the space back to keep the following token separated.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @param {string} rep
 * @return {{ start: number, end: number, text: string }}
 */
function createTokenEdit(token, rep) {
  const text = token[1].endsWith(' ') ? `${rep} ` : rep;
  return { start: token[2], end: token[3] + 1, text };
}

/**
 * Shared walk over a declaration value: tracks function, bracket, and block
 * nesting, and hands each remaining token to the visitor together with the
 * innermost frame. Top-level tokens receive no frame; commas advance the
 * current function's argument position.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} tokenList
 * @param {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined} visit
 * @return {Array<{ start: number, end: number, text: string }>}
 */
function collectValueEdits(tokenList, visit) {
  /** @type {NestingFrame[]} */
  const stack = [];
  /** @type {Array<{ start: number, end: number, text: string }>} */
  const edits = [];

  for (const token of tokenList) {
    const type = token[0];
    const frame = stack.at(-1);
    if (type === TokenType.Function) {
      // Match on the decoded name: raw text spells escapes, e.g. a function
      // written `\63 ounter(` has the decoded name "counter".
      const funcName = asciiLowerCase(decoded(token));
      stack.push({
        expectedArgs: COUNTER_STYLE_FUNCTIONS.get(funcName),
        argIndex: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenParen) {
      stack.push({ argIndex: 0, close: TokenType.CloseParen });
    } else if (type === TokenType.OpenSquare) {
      stack.push({ argIndex: 0, close: TokenType.CloseSquare });
    } else if (type === TokenType.OpenCurly) {
      stack.push({ argIndex: 0, close: TokenType.CloseCurly });
    } else if (type === frame?.close) {
      stack.pop();
    } else if (type === TokenType.Comma && frame) {
      frame.argIndex++;
    } else {
      const edit = visit(token, frame);
      if (edit) {
        edits.push(edit);
      }
    }
  }

  return edits;
}

/**
 * @param {'animation-shorthand' | 'animation-name'} kind
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @param {(tokenKey: string) => string | undefined} resolveString
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createAnimationVisitor(kind, resolveIdent, resolveString) {
  return (token, frame) => {
    // Only top-level tokens name an animation; function arguments belong to
    // other grammar productions.
    if (frame) {
      return undefined;
    }
    if (token[0] === TokenType.Ident) {
      const val = decoded(token);
      const lower = asciiLowerCase(val);
      const isReserved =
        kind === 'animation-shorthand'
          ? KEYFRAMES_SHORTHAND_KEYWORDS.has(lower) || val.startsWith('--')
          : CSS_WIDE_KEYWORDS.has(lower) || lower === 'none';
      if (isReserved) {
        return undefined;
      }
      const rep = resolveIdent(`ident:${val}`);
      return rep === undefined ? undefined : createTokenEdit(token, rep);
    }
    if (token[0] === TokenType.String) {
      const val = /** @type {{value: string}} */ (token[4]).value;
      const rep = resolveString(`str:${val}`);
      return rep === undefined
        ? undefined
        : { start: token[2], end: token[3] + 1, text: rep };
    }
    return undefined;
  };
}

/**
 * Resolves a counter-style identifier token, returning a replacement edit if renamed.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @return {{ start: number, end: number, text: string } | undefined}
 */
function resolveCounterStyleToken(token, resolveIdent) {
  const val = decoded(token);
  if (COUNTER_STYLE_RESERVED.has(asciiLowerCase(val))) {
    return undefined;
  }
  const rep = resolveIdent(`ident:${val}`);
  return rep === undefined ? undefined : createTokenEdit(token, rep);
}

/**
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createCounterStyleVisitor(resolveIdent) {
  return (token, frame) =>
    frame || token[0] !== TokenType.Ident
      ? undefined
      : resolveCounterStyleToken(token, resolveIdent);
}

/**
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createCounterFuncVisitor(resolveIdent) {
  return (token, frame) => {
    // Only the counter-style-name argument slots of the recognized counter
    // functions name a counter style.
    if (
      token[0] !== TokenType.Ident ||
      !frame?.expectedArgs?.includes(frame.argIndex)
    ) {
      return undefined;
    }
    return resolveCounterStyleToken(token, resolveIdent);
  };
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>} classification
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {Map<string, FamilyRecord> | null} singleScope
 * @return {void}
 */
function rewriteDeclaration(decl, classification, scopes, singleScope) {
  const value = decl.value;
  const tokenList = tokens(value);
  const target = classification.targetAtRuleName;

  /** @type {import('postcss').Container | undefined} */
  let container;
  /** @param {string} key */
  const resolve = singleScope
    ? (/** @type {string} */ key) =>
        singleScope.get(target)?.resolver?.(key)?.text
    : (/** @type {string} */ key) => {
        if (!container) {
          container = getContainer(decl);
        }
        return lookupScopeChain(scopes, container, target, key);
      };

  /** @type {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined} */
  let visit;
  if (
    classification.kind === 'animation-shorthand' ||
    classification.kind === 'animation-name'
  ) {
    visit = createAnimationVisitor(classification.kind, resolve, resolve);
  } else if (classification.kind === 'counter-style') {
    visit = createCounterStyleVisitor(resolve);
  } else {
    visit = createCounterFuncVisitor(resolve);
  }

  const edits = collectValueEdits(tokenList, visit);

  if (edits.length > 0) {
    const result = applyEdits(value, edits);
    if (result !== value) {
      decl.value = result;
      if (decl.raws?.value?.raw) {
        decl.raws.value = { raw: result, value: result };
      }
    }
  }
}

export { rewriteDeclaration };
