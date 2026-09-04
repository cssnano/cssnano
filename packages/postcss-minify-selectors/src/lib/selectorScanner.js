import cssnanoUtils from 'cssnano-utils';
import { unquote, isDeepBoundary } from './tokenUtils.js';
import {
  pseudoElements,
  legacyPseudoElements,
  safePseudos,
  selectorGrammar,
} from './grammar.js';
import { addSpecificity, maximumSpecificity } from './specificity.js';
import {
  fold,
  serializeComplex,
  serializePieces,
  equalComplex,
} from './foldToIs.js';
import {
  parseAnPlusB,
  normalizePtNameArgument,
  normalizeIdentListArgument,
  normalizeIdentArgument,
  normalizeIdentOrStringList,
  firstPseudoReplacement,
} from './argumentParsers.js';
import {
  checkCombinatorToken,
  skipTriviaAfterCombinator,
  scanTriviaSegment,
  appendImportantTrivia,
  consumeLeading,
} from './triviaScanner.js';

const { TokenType, decoded } = cssnanoUtils;
/** @type {typeof cssnanoUtils.balancedTokens} */
const balancedTokens = cssnanoUtils.balancedTokens;
/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {NonNullable<ReturnType<typeof balancedTokens>>} BalancedTokenStructure */
/** @typedef {import('./specificity.js').Specificity} Specificity */
/** @typedef {import('./foldToIs.js').FunctionResult} FunctionResult */
/** @typedef {import('./foldToIs.js').Compound} Compound */
/** @typedef {import('./foldToIs.js').ComplexSelector} ComplexSelector */
/** @typedef {import('./grammar.js').ArgumentGrammar} ArgumentGrammar */

/**
 * @typedef {{
 *   output: (string | FunctionResult)[],
 *   specificity: Specificity,
 *   hasNamespace: boolean,
 *   hasPseudoElement: boolean,
 *   hasFunction: boolean,
 *   hasNesting: boolean,
 *   hasAttributeModifier: boolean,
 *   hasCommentDescendant: boolean,
 *   allPseudosSafe: boolean,
 *   hasVendorPseudo: boolean,
 *   foldEligible: boolean,
 *   valid: boolean,
 *   hasNestedHas: boolean
 * }} NormalizationState
 */

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} index */
function normalizeDoubleColonPseudo(state, tokens, index) {
  if (
    tokens[index][0] !== TokenType.Colon ||
    tokens[index + 1]?.[0] !== TokenType.Colon
  )
    return false;
  const following = tokens[index + 2];
  if (
    following?.[0] !== TokenType.Ident &&
    following?.[0] !== TokenType.Function
  ) {
    state.valid = false;
    return false;
  }
  const name = following[1]?.toLowerCase() ?? '';
  if (legacyPseudoElements.has(name)) {
    state.output.push(':');
  } else {
    state.output.push('::');
  }
  // Functional pseudo-elements select their specificity from their argument
  // grammar. Non-functional pseudo-elements always have type specificity.
  if (following[0] !== TokenType.Function) state.specificity[2]++;
  state.hasPseudoElement = true;
  state.foldEligible = false;
  if (tokens[index + 2]?.[1]?.startsWith('-')) {
    state.hasVendorPseudo = true;
  }
  return true;
}

/** @return {NormalizationState} */
function createNormalizationState() {
  return {
    output: [],
    specificity: [0, 0, 0],
    hasNamespace: false,
    hasPseudoElement: false,
    hasFunction: false,
    hasNesting: false,
    hasAttributeModifier: false,
    hasCommentDescendant: false,
    allPseudosSafe: true,
    hasVendorPseudo: false,
    foldEligible: true,
    valid: true,
    hasNestedHas: false,
  };
}

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} index */
function normalizeComment(state, tokens, index) {
  const token = tokens[index];
  const important = token[1].startsWith('/*!');
  if (important) {
    state.output.push(token[1]);
    return;
  }
}

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} index */
function normalizeWhitespace(state, tokens, index) {
  if (state.output.length === 0) return;
  if (
    tokens[index - 1]?.[0] !== TokenType.Comma &&
    tokens[index + 1]?.[0] !== TokenType.Comma &&
    tokens[index + 1]?.[0] !== TokenType.CloseParen &&
    tokens[index + 1]?.[0] !== TokenType.CloseSquare
  )
    state.output.push(' ');
}

/** @param {NormalizationState} state @param {CSSToken} token @param {CSSToken | undefined} next @param {CSSToken | undefined} previous */
function updateSimpleSpecificity(state, token, next, previous) {
  if (token[0] === TokenType.Hash) state.specificity[0]++;
  if (token[0] === TokenType.Delim && token[1] === '.') state.specificity[1]++;
  if (
    token[0] === TokenType.Ident &&
    previous?.[0] !== TokenType.Colon &&
    previous?.[0] !== TokenType.Hash &&
    !(previous?.[0] === TokenType.Delim && previous[1] === '.') &&
    // A namespace prefix is an identifier followed by `|`, not a type name.
    !(next?.[0] === TokenType.Delim && next[1] === '|')
  )
    state.specificity[2]++;
}

/** @param {NormalizationState} state @param {CSSToken | undefined} next */
function updatePseudoSpecificity(state, next) {
  if (next?.[0] === TokenType.Function) return;
  if (next?.[0] === TokenType.Colon) return;
  if (next?.[0] !== TokenType.Ident) {
    state.valid = false;
    return;
  }
  const isPseudoElem = pseudoElements.has(next[1]?.toLowerCase() ?? '');
  if (isPseudoElem) {
    state.specificity[2]++;
    state.hasPseudoElement = true;
    state.foldEligible = false;
  } else {
    state.specificity[1]++;
    const name = next[1]?.toLowerCase() ?? '';
    if (name.startsWith('-')) {
      state.hasVendorPseudo = true;
    }
    if (!safePseudos.has(name)) {
      state.allPseudosSafe = false;
      state.foldEligible = false;
    }
  }
}

/** @param {NormalizationState} state @param {CSSToken} token @param {CSSToken | undefined} next @param {CSSToken | undefined} previous */
function updateSpecificity(state, token, next, previous) {
  updateSimpleSpecificity(state, token, next, previous);
  if (token[0] === TokenType.Colon) updatePseudoSpecificity(state, next);
}

/** @param {NormalizationState} state @param {string} prefix */
function popLeadingColon(state, prefix) {
  if (prefix.startsWith('::')) {
    if (state.output.at(-1) === '::') state.output.pop();
  } else if (prefix.startsWith(':')) {
    if (state.output.at(-1) === ':') state.output.pop();
  }
}

/**
 * @param {NormalizationState} state
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {number} index
 * @param {number} finish
 * @param {Map<number, FunctionResult>} values
 * @return {{ end: number, text?: string }}
 */
function normalizeFunctionToken(
  state,
  source,
  tokens,
  structure,
  index,
  finish,
  values
) {
  const token = tokens[index];
  const end = structure.endForOpening(index);
  if (end === undefined || end > finish)
    return { text: source.slice(token[2] - 1), end: finish };

  const funcName = token[1].slice(0, -1).toLowerCase();
  if (selectorGrammar.get(funcName) === 'relative-selector-list') {
    state.hasNestedHas = true;
  }

  const normalized = values.get(index);
  if (normalized) {
    values.delete(index);
    if (typeof normalized.pieces?.[0] === 'string') {
      popLeadingColon(state, normalized.pieces[0]);
    } else if (normalized.raw?.source[normalized.raw.start] === ':') {
      popLeadingColon(
        state,
        normalized.raw.source.slice(
          normalized.raw.start,
          normalized.raw.start + 2
        )
      );
    }
    state.output.push(normalized);
    addSpecificity(state.specificity, normalized.specificity);
    if (normalized.outcome === 'invalid') state.valid = false;
    if (normalized.hasNestedHas) state.hasNestedHas = true;
    if (normalized.hasPseudoElement) state.hasPseudoElement = true;
  } else {
    const raw = rawFunction(source, tokens, index, end);
    popLeadingColon(state, raw);
    state.output.push(raw);
  }

  state.hasFunction = true;
  state.foldEligible = false;
  return { end };
}

/** @param {NormalizationState} state @return {Compound} */
function finishCompound(state) {
  while (state.output[0] === ' ') state.output.shift();
  while (state.output.at(-1) === ' ') state.output.pop();
  const foldEligible =
    state.valid &&
    !state.hasNamespace &&
    !state.hasPseudoElement &&
    !state.hasFunction &&
    !state.hasNesting &&
    !state.hasAttributeModifier &&
    !state.hasCommentDescendant &&
    state.allPseudosSafe;

  return {
    pieces: state.output,
    specificity: state.specificity,
    hasNamespace: state.hasNamespace,
    hasPseudoElement: state.hasPseudoElement,
    hasFunction: state.hasFunction,
    hasNesting: state.hasNesting,
    hasAttributeModifier: state.hasAttributeModifier,
    hasCommentDescendant: state.hasCommentDescendant,
    hasVendorPseudo: state.hasVendorPseudo,
    foldEligible,
    valid: state.valid,
    hasNestedHas: state.hasNestedHas,
  };
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {boolean}
 */
function normalizeStructuralToken(state, tokens, index) {
  const token = tokens[index];
  const type = token[0];
  if (type === TokenType.Comment) {
    normalizeComment(state, tokens, index);
    return true;
  }
  if (type === TokenType.Whitespace) {
    normalizeWhitespace(state, tokens, index);
    return true;
  }
  return false;
}

/** @param {CSSToken} [next] */
function canQualifyUniversal(next) {
  if (!next) return false;
  const type = next[0];
  return (
    type === TokenType.Hash ||
    type === TokenType.OpenSquare ||
    type === TokenType.Colon ||
    (type === TokenType.Delim && next[1] === '.')
  );
}

/** @param {readonly (string | FunctionResult)[]} output */
function lastNonCommentPiece(output) {
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i];
    if (typeof item === 'string' && item.startsWith('/*')) continue;
    return item;
  }
  return undefined;
}

/**
 * @param {NormalizationState} state
 * @param {CSSToken} [next]
 * @param {boolean} [hasDefaultNamespace]
 * @return {boolean}
 */
function normalizeUniversal(state, next, hasDefaultNamespace = false) {
  const previousPiece = lastNonCommentPiece(state.output);
  const atCompoundStart =
    previousPiece === undefined ||
    previousPiece === ' ' ||
    previousPiece === '/deep/';
  if (!atCompoundStart && previousPiece !== '|') state.valid = false;
  if (next?.[0] === TokenType.Ident || next?.[1] === '*') state.valid = false;
  if (hasDefaultNamespace) return false;
  if (atCompoundStart && canQualifyUniversal(next)) return true;
  return false;
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {boolean} [hasDefaultNamespace]
 * @return {{ end: number, skipped?: boolean }}
 */
function normalizeDelimToken(
  state,
  tokens,
  index,
  hasDefaultNamespace = false
) {
  const token = tokens[index];
  const next = tokens[index + 1];
  if (token[1] === '&') {
    state.hasNesting = true;
    state.foldEligible = false;
  }
  if (token[1] === '|') {
    state.hasNamespace = true;
    state.foldEligible = false;
  }
  if (
    token[1] === '*' &&
    normalizeUniversal(state, next, hasDefaultNamespace)
  ) {
    return { end: index, skipped: true };
  }

  if (isDeepBoundary(tokens, index)) {
    if (state.output.at(-1) === ' ') state.output.pop();
    state.output.push('/deep/');
    return { end: index + 2 };
  }

  return { end: index };
}

/** @param {NormalizationState} state @param {CSSToken} token */
function normalizeStringToken(state, token) {
  state.valid = false;
  return token[1];
}

/** @param {CSSToken} token @param {CSSToken | undefined} next */
function normalizeIdentToken(token, next) {
  let val = token[1];
  if (
    val.endsWith(' ') &&
    (!next ||
      next[0] === TokenType.Comma ||
      next[0] === TokenType.CloseParen ||
      next[0] === TokenType.Whitespace)
  ) {
    val = val.trimEnd();
  }
  return val;
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isAttributeNameToken(token) {
  return (
    token?.[0] === TokenType.Ident ||
    (token?.[0] === TokenType.Delim && token[1] === '*')
  );
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isAttributeLocalNameToken(token) {
  return token?.[0] === TokenType.Ident;
}

/** @param {CSSToken | undefined} token @return {boolean} */
function isTrivia(token) {
  return (
    token?.[0] === TokenType.Whitespace || token?.[0] === TokenType.Comment
  );
}

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} end @param {number} index */
function consumeAttributeTrivia(state, tokens, end, index) {
  let saw = false;
  let cursor = index;
  while (cursor < end && isTrivia(tokens[cursor])) {
    saw = true;
    if (
      tokens[cursor][0] === TokenType.Comment &&
      tokens[cursor][1].startsWith('/*!')
    ) {
      state.output.push(tokens[cursor][1]);
    }
    cursor++;
  }
  return { index: cursor, saw };
}

/** @param {readonly CSSToken[]} tokens @param {number} index */
function parseAttributeName(tokens, index) {
  const first = tokens[index];
  if (!isAttributeNameToken(first) && first?.[1] !== '|') return;

  if (first[1] === '|') {
    const local = tokens[index + 1];
    if (!isAttributeLocalNameToken(local)) return;
    return {
      name: `|${local[1]}`,
      index: index + 2,
      hasNamespace: true,
    };
  }

  const separatorIndex = index + 1;
  if (
    tokens[separatorIndex]?.[1] !== '|' ||
    tokens[separatorIndex + 1]?.[1] === '='
  ) {
    return first[1] === '*' ? undefined : { name: first[1], index: index + 1 };
  }

  const localIndex = separatorIndex + 1;
  const local = tokens[localIndex];
  if (!isAttributeLocalNameToken(local)) return;
  return {
    name: `${first[1]}|${local[1]}`,
    index: localIndex + 1,
    hasNamespace: true,
  };
}

/** @param {readonly CSSToken[]} tokens @param {number} index */
function parseAttributeMatcher(tokens, index) {
  const first = tokens[index];
  if (first?.[0] !== TokenType.Delim) return { operator: '', index };
  if (first[1] === '=') return { operator: '=', index: index + 1 };
  if (!['~', '|', '^', '$', '*'].includes(first[1]))
    return { operator: '', index };
  if (
    tokens[index + 1]?.[0] !== TokenType.Delim ||
    tokens[index + 1][1] !== '='
  ) {
    return { operator: undefined, index };
  }
  return { operator: `${first[1]}=`, index: index + 2 };
}

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} end @param {{ index: number, saw: boolean }} trivia */
function finishAttributeValue(state, tokens, end, trivia) {
  const modifier = tokens[trivia.index];
  if (modifier?.[0] !== TokenType.Ident) return trivia.index === end;
  if (!trivia.saw || !['i', 's'].includes(decoded(modifier).toLowerCase())) {
    return false;
  }
  // A modifier is a semantic folding boundary. Keep a separator even if its
  // original whitespace was an ordinary comment.
  state.output.push(' ', modifier[1]);
  state.hasAttributeModifier = true;
  state.foldEligible = false;
  return (
    consumeAttributeTrivia(state, tokens, end, trivia.index + 1).index === end
  );
}

/**
 * Normalize one complete attribute selector. Keeping this grammar separate from
 * the outer selector scanner prevents whitespace removal from repairing a
 * malformed attribute selector.
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {number} start
 * @return {number}
 */
function normalizeAttribute(state, tokens, structure, start) {
  const end = structure.endForOpening(start);
  if (end === undefined || tokens[end]?.[0] !== TokenType.CloseSquare) {
    state.valid = false;
    return start;
  }

  state.output.push('[');
  const leading = consumeAttributeTrivia(state, tokens, end, start + 1);
  const parsedName = parseAttributeName(tokens, leading.index);
  if (!parsedName) {
    state.valid = false;
    return end;
  }
  state.output.push(parsedName.name);
  if (parsedName.hasNamespace) {
    state.hasNamespace = true;
    state.foldEligible = false;
  }

  const nameTrivia = consumeAttributeTrivia(
    state,
    tokens,
    end,
    parsedName.index
  );
  const matcher = parseAttributeMatcher(tokens, nameTrivia.index);
  if (matcher.operator === undefined) {
    state.valid = false;
    return end;
  }
  const operator = matcher.operator;

  if (!operator) {
    const trailing = consumeAttributeTrivia(state, tokens, end, matcher.index);
    if (trailing.index !== end) {
      state.valid = false;
      return end;
    }
    state.output.push(']');
    state.specificity[1]++;
    return end;
  }

  state.output.push(operator);
  const trivia = consumeAttributeTrivia(state, tokens, end, matcher.index);
  const value = tokens[trivia.index];
  if (value?.[0] !== TokenType.Ident && value?.[0] !== TokenType.String) {
    state.valid = false;
    return end;
  }
  state.output.push(
    value[0] === TokenType.String
      ? unquote(value[1]).replace(/\\\n/gu, '')
      : normalizeIdentToken(value, tokens[trivia.index + 1])
  );

  const valueTrivia = consumeAttributeTrivia(
    state,
    tokens,
    end,
    trivia.index + 1
  );
  if (!finishAttributeValue(state, tokens, end, valueTrivia)) {
    state.valid = false;
    return end;
  }
  state.output.push(']');
  state.specificity[1]++;
  return end;
}

/**
 * @param {NormalizationState} state
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} start
 * @param {number} finish
 * @param {boolean} [hasDefaultNamespace]
 * @return {{ end: number, text?: string }}
 */
function normalizeToken(
  state,
  source,
  tokens,
  structure,
  values,
  index,
  start,
  finish,
  hasDefaultNamespace = false
) {
  const token = tokens[index];
  const type = token[0];
  const next = tokens[index + 1];
  const previous = tokens[index - 1];

  if (normalizeStructuralToken(state, tokens, index)) return { end: index };

  if (type === TokenType.Function)
    return normalizeFunctionToken(
      state,
      source,
      tokens,
      structure,
      index,
      finish,
      values
    );

  if (type === TokenType.String) {
    state.output.push(normalizeStringToken(state, token));
    return { end: index };
  }

  if (normalizeDoubleColonPseudo(state, tokens, index))
    return { end: index + 1 };

  updateSpecificity(state, token, next, previous);

  if (type === TokenType.Delim) {
    const delim = normalizeDelimToken(
      state,
      tokens,
      index,
      hasDefaultNamespace
    );
    if (delim.skipped) return { end: delim.end };
    if (delim.end !== index) return delim;
  }

  const val =
    type === TokenType.Ident ? normalizeIdentToken(token, next) : token[1];
  state.output.push(val);
  return { end: index };
}

/** @param {readonly CSSToken[]} tokens @param {number} index @return {number} */
function functionStart(tokens, index) {
  if (
    tokens[index - 2]?.[0] === TokenType.Colon &&
    tokens[index - 1]?.[0] === TokenType.Colon
  ) {
    return tokens[index - 2][2];
  }
  if (tokens[index - 1]?.[0] === TokenType.Colon) {
    return tokens[index - 1][2];
  }
  return tokens[index][2];
}

/** @param {string} source @param {readonly CSSToken[]} tokens @param {number} index @param {number} end @return {string} */
function rawFunction(source, tokens, index, end) {
  const start = functionStart(tokens, index);
  const close = tokens[end];
  return close ? source.slice(start, close[3] + 1) : source.slice(start);
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {number} end
 * @param {'valid' | 'invalid' | 'opaque'} [outcome]
 * @return {FunctionResult}
 */
function rawFunctionResult(source, tokens, index, end, outcome = 'valid') {
  const isDoubleColon =
    tokens[index - 2]?.[0] === TokenType.Colon &&
    tokens[index - 1]?.[0] === TokenType.Colon;
  const start = functionStart(tokens, index);

  return {
    raw: {
      source,
      start,
      end: tokens[end]?.[3] + 1 || source.length,
    },
    pieces: undefined,
    specificity: isDoubleColon ? [0, 0, 1] : [0, 1, 0],
    foldEligible: false,
    outcome,
    valid: outcome !== 'invalid',
  };
}

/** @return {Compound} */
function invalidCompound() {
  return {
    pieces: [],
    specificity: [0, 0, 0],
    hasNamespace: false,
    hasPseudoElement: false,
    hasFunction: false,
    hasNesting: false,
    hasAttributeModifier: false,
    hasCommentDescendant: false,
    hasVendorPseudo: false,
    foldEligible: false,
    valid: false,
    hasNestedHas: false,
  };
}

/**
 * Parse exactly one compound selector without allocating selector-list or
 * complex-selector containers for an argument that rejects either construct.
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @param {boolean} [hasDefaultNamespace]
 * @return {Compound}
 */
function normalizeCompound(
  source,
  tokens,
  structure,
  values,
  start,
  end,
  hasDefaultNamespace = false
) {
  const state = createNormalizationState();
  let index = start;

  const leading = scanTriviaSegment(tokens, index, end);
  appendImportantTrivia(state, tokens, leading.importantIndices, index);
  index = leading.cursor;

  for (; index < end; index++) {
    const token = tokens[index];
    if (token[0] === TokenType.OpenSquare) {
      index = normalizeAttribute(state, tokens, structure, index);
      continue;
    }
    {
      if (token[0] === TokenType.Comma || checkCombinatorToken(tokens, index)) {
        return invalidCompound();
      }

      if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment) {
        const trivia = scanTriviaSegment(tokens, index, end);
        const hasContent = state.output.length > 0;
        appendImportantTrivia(state, tokens, trivia.importantIndices, index);
        if (hasContent && trivia.cursor < end) return invalidCompound();
        index = trivia.cursor - 1;
        continue;
      }
    }

    const normalized = normalizeToken(
      state,
      source,
      tokens,
      structure,
      values,
      index,
      start,
      end,
      hasDefaultNamespace
    );
    if (normalized.text !== undefined) return invalidCompound();
    index = normalized.end;
  }

  const compound = finishCompound(state);
  return compound.valid && compound.pieces.length > 0
    ? compound
    : invalidCompound();
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @param {'forgiving-selector-list' | 'selector-list' | 'relative-selector-list'} grammar
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeSelectorList(
  source,
  tokens,
  structure,
  values,
  start,
  end,
  grammar,
  hasDefaultNamespace = false
) {
  const relative = grammar === 'relative-selector-list';
  const forgiving = grammar === 'forgiving-selector-list';
  const result = normalizeListFromTokens(
    source,
    tokens,
    structure,
    values,
    start,
    end,
    false,
    relative,
    false,
    hasDefaultNamespace
  );

  const entries = forgiving
    ? result.entries.filter((entry) => entry.valid && !entry.hasPseudoElement)
    : result.entries;

  const valid = forgiving
    ? true
    : result.valid &&
      !result.hasPseudoElement &&
      !(relative && result.hasNestedHas);
  /** @type {'valid' | 'invalid'} */
  const outcome = valid ? 'valid' : 'invalid';

  return {
    pieces: selectorListPieces(entries),
    specificity: maximumSpecificity(entries),
    outcome,
    valid,
    hasNestedHas: result.hasNestedHas,
    hasPseudoElement: forgiving ? false : result.hasPseudoElement,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @param {string} [name]
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeNthArgument(
  source,
  tokens,
  structure,
  values,
  start,
  end,
  name = '',
  hasDefaultNamespace = false
) {
  let ofIndex = -1;
  for (let index = start; index < end; index++) {
    const nested = structure.endForOpening(index);
    if (nested !== undefined) {
      index = nested;
      continue;
    }
    if (
      tokens[index][0] === TokenType.Ident &&
      tokens[index][1].toLowerCase() === 'of'
    ) {
      ofIndex = index;
      break;
    }
  }

  const grammar = selectorGrammar.get(name);
  if (ofIndex >= 0 && grammar !== 'an-plus-b-of') {
    return {
      pieces: [source.slice(tokens[start][2] - 1, tokens[end - 1]?.[3] + 1)],
      specificity: [0, 1, 0],
      valid: false,
    };
  }

  const formula = parseAnPlusB(
    source,
    tokens,
    start,
    ofIndex < 0 ? end : ofIndex
  );
  if (!formula.valid || formula.value === undefined)
    return { pieces: [], specificity: [0, 1, 0], valid: false };

  const normalizedFormula = formula.value;

  if (ofIndex >= 0) {
    const list = normalizeListFromTokens(
      source,
      tokens,
      structure,
      values,
      ofIndex + 1,
      end,
      false,
      false,
      false,
      hasDefaultNamespace
    );
    return {
      pieces: [normalizedFormula, ' of ', ...selectorListPieces(list.entries)],
      specificity: [...list.specificity],
      valid: list.valid,
    };
  }

  const kind = name.slice(4);
  if (normalizedFormula === '1') {
    const replacement = firstPseudoReplacement(kind);
    if (replacement)
      return {
        text: replacement,
        pieces: [replacement],
        specificity: [0, 1, 0],
        valid: true,
      };
  }
  if (/^2n\+1$/iu.test(normalizedFormula))
    return { pieces: ['odd'], specificity: [0, 0, 0], valid: true };

  return {
    pieces: [normalizedFormula],
    specificity: [0, 0, 0],
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {string} name
 * @param {number} index
 * @param {number} end
 * @param {boolean} [isDoubleColon]
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeCompoundFunction(
  source,
  tokens,
  structure,
  values,
  name,
  index,
  end,
  isDoubleColon = false,
  hasDefaultNamespace = false
) {
  const inner = normalizeCompound(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end,
    hasDefaultNamespace
  );
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  /** @type {Specificity} */
  const specificity = [...inner.specificity];
  if (isDoubleColon) {
    specificity[2]++;
  } else {
    specificity[1]++;
  }
  return {
    pieces: [name, '(', ...inner.pieces, ')'],
    specificity,
    foldEligible: false,
    outcome: 'valid',
    valid: true,
    hasNestedHas: inner.hasNestedHas,
    hasPseudoElement: inner.hasPseudoElement,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {string} lower
 * @param {number} index
 * @param {number} end
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeNthFunction(
  source,
  tokens,
  structure,
  values,
  lower,
  index,
  end,
  hasDefaultNamespace = false
) {
  const inner = normalizeNthArgument(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end,
    lower,
    hasDefaultNamespace
  );
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  /** @type {Specificity} */
  const specificity = [...inner.specificity];
  if (inner.text?.startsWith(':'))
    return {
      pieces: [inner.text],
      specificity,
      foldEligible: false,
      outcome: 'valid',
      valid: true,
    };
  specificity[1]++;
  return {
    pieces: [lower, '(', ...(inner.pieces ?? []), ')'],
    specificity,
    foldEligible: false,
    outcome: 'valid',
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {string} name
 * @param {number} index
 * @param {number} end
 * @param {boolean} [isDoubleColon]
 * @return {FunctionResult}
 */
function normalizeIdentFunction(
  source,
  tokens,
  name,
  index,
  end,
  isDoubleColon = false
) {
  const inner = normalizeIdentArgument(tokens, index + 1, end);
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  return {
    pieces: [name, '(', ...(inner.pieces ?? []), ')'],
    specificity: isDoubleColon ? [0, 0, 1] : [0, 1, 0],
    foldEligible: false,
    outcome: 'valid',
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {string} name
 * @param {number} index
 * @param {number} end
 * @param {boolean} [isDoubleColon]
 * @return {FunctionResult}
 */
function normalizeIdentListFunction(
  source,
  tokens,
  name,
  index,
  end,
  isDoubleColon = false
) {
  const inner = normalizeIdentListArgument(tokens, index + 1, end);
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  return {
    pieces: [name, '(', ...(inner.pieces ?? []), ')'],
    specificity: isDoubleColon ? [0, 0, 1] : [0, 1, 0],
    foldEligible: false,
    outcome: 'valid',
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {string} name
 * @param {number} index
 * @param {number} end
 * @param {boolean} [isDoubleColon]
 * @return {FunctionResult}
 */
function normalizePtNameFunction(
  source,
  tokens,
  name,
  index,
  end,
  isDoubleColon = false
) {
  const inner = normalizePtNameArgument(tokens, index + 1, end);
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  return {
    pieces: [name, '(', ...(inner.pieces ?? []), ')'],
    specificity: isDoubleColon ? (inner.specificity ?? [0, 0, 1]) : [0, 1, 0],
    foldEligible: false,
    outcome: 'valid',
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {string} name
 * @param {number} index
 * @param {number} end
 * @return {FunctionResult}
 */
function normalizeIdentOrStringListFunction(source, tokens, name, index, end) {
  const inner = normalizeIdentOrStringList(tokens, index + 1, end);
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  return {
    pieces: [name, '(', ...(inner.pieces ?? []), ')'],
    specificity: [0, 1, 0],
    foldEligible: false,
    outcome: 'valid',
    valid: true,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {string} name
 * @param {string} lower
 * @param {number} index
 * @param {number} end
 * @param {'forgiving-selector-list' | 'selector-list' | 'relative-selector-list'} grammar
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeSelectorListFunction(
  source,
  tokens,
  structure,
  values,
  name,
  lower,
  index,
  end,
  grammar,
  hasDefaultNamespace = false
) {
  const inner = normalizeSelectorList(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end,
    grammar,
    hasDefaultNamespace
  );
  if (!inner.valid && grammar !== 'forgiving-selector-list')
    return rawFunctionResult(source, tokens, index, end, 'invalid');

  /** @type {Specificity} */
  const specificity = [...inner.specificity];
  if (lower === 'where') specificity.fill(0);

  return {
    pieces: [name, '(', ...(inner.pieces ?? []), ')'],
    specificity,
    foldEligible: false,
    outcome: inner.outcome,
    valid: inner.valid,
    hasNestedHas: inner.hasNestedHas,
    hasPseudoElement: inner.hasPseudoElement,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} end
 * @param {boolean} [hasDefaultNamespace]
 * @return {FunctionResult}
 */
function normalizeFunction(
  source,
  tokens,
  structure,
  values,
  index,
  end,
  hasDefaultNamespace = false
) {
  const name = tokens[index][1].slice(0, -1);
  const lower = name.toLowerCase();
  const grammar = selectorGrammar.get(lower);
  if (!grammar) return rawFunctionResult(source, tokens, index, end, 'opaque');

  const isDoubleColon =
    tokens[index - 2]?.[0] === TokenType.Colon &&
    tokens[index - 1]?.[0] === TokenType.Colon;

  switch (grammar) {
    case 'compound-selector':
      return normalizeCompoundFunction(
        source,
        tokens,
        structure,
        values,
        name,
        index,
        end,
        isDoubleColon,
        hasDefaultNamespace
      );

    case 'an-plus-b-of':
    case 'an-plus-b':
      return normalizeNthFunction(
        source,
        tokens,
        structure,
        values,
        lower,
        index,
        end,
        hasDefaultNamespace
      );

    case 'ident-or-string-list':
      return normalizeIdentOrStringListFunction(
        source,
        tokens,
        name,
        index,
        end
      );

    case 'ident':
      return normalizeIdentFunction(
        source,
        tokens,
        name,
        index,
        end,
        isDoubleColon
      );

    case 'ident-list':
      return normalizeIdentListFunction(
        source,
        tokens,
        name,
        index,
        end,
        isDoubleColon
      );

    case 'pt-name-selector':
      return normalizePtNameFunction(
        source,
        tokens,
        name,
        index,
        end,
        isDoubleColon
      );

    case 'forgiving-selector-list':
    case 'selector-list':
    case 'relative-selector-list':
      return normalizeSelectorListFunction(
        source,
        tokens,
        structure,
        values,
        name,
        lower,
        index,
        end,
        grammar,
        hasDefaultNamespace
      );
  }
}

/** @param {ComplexSelector} selector */
function complexPieces(selector) {
  const pieces = [];
  if (selector.leadingCombinator) pieces.push(selector.leadingCombinator);
  for (const part of selector.parts) {
    if (typeof part === 'string') {
      pieces.push(part);
    } else {
      pieces.push(...part.pieces);
    }
  }
  return pieces;
}

/** @param {ComplexSelector[]} entries */
function selectorListPieces(entries) {
  const pieces = [];
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) pieces.push(',');
    pieces.push(...complexPieces(entries[i]));
  }
  return pieces;
}

/** @param {Compound[]} compounds @param {string[]} combinators @param {string | undefined} leadingCombinator */
function normalizeCompoundEdges(compounds, combinators, leadingCombinator) {
  while (
    !leadingCombinator &&
    compounds.length > 1 &&
    compounds[0].pieces.length === 0
  ) {
    compounds.shift();
    combinators.shift();
  }
}

/** @param {Compound[]} compounds @param {string[]} combinators @param {string | undefined} leadingCombinator */
function makeComplexParts(compounds, combinators, leadingCombinator) {
  /** @type {(Compound | string)[]} */
  const parts = [];
  const startCompound = leadingCombinator ? 1 : 0;
  for (let i = startCompound; i < compounds.length; i++) {
    if (i > startCompound) {
      parts.push(combinators[i - 1] ?? ' ');
    }
    parts.push(compounds[i]);
  }
  return parts;
}

/**
 * @param {Compound[]} compounds
 * @param {Compound} compound
 * @param {{ valid: boolean, hasNestedHas: boolean, hasPseudoElement: boolean }} flags
 */
function recordCompound(compounds, compound, flags) {
  flags.valid &&= compound.valid && compound.pieces.length > 0;
  if (compound.hasNestedHas) flags.hasNestedHas = true;
  if (compound.hasPseudoElement) flags.hasPseudoElement = true;
  compounds.push(compound);
}

/**
 * @param {NormalizationState} state
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} compoundStart
 * @param {number} finish
 * @return {number}
 */
/**
 * @param {NormalizationState} state
 * @param {Compound[]} compounds
 * @param {string[]} combinators
 * @param {string | undefined} leadingCombinator
 * @param {{ valid: boolean, hasNestedHas: boolean, hasPseudoElement: boolean }} flags
 * @return {ComplexSelector}
 */
function finalizeComplexEntry(
  state,
  compounds,
  combinators,
  leadingCombinator,
  flags
) {
  const finalCompound = finishCompound(state);
  if (compounds.length > 0) {
    flags.valid &&= finalCompound.valid && finalCompound.pieces.length > 0;
  } else {
    flags.valid &&=
      finalCompound.valid &&
      (finalCompound.pieces.length > 0 || Boolean(leadingCombinator));
  }
  if (finalCompound.hasNestedHas) flags.hasNestedHas = true;
  if (finalCompound.hasPseudoElement) flags.hasPseudoElement = true;
  compounds.push(finalCompound);

  let leading = leadingCombinator;
  if (leading && compounds[0]?.pieces.length > 0) {
    leading = serializePieces(compounds[0].pieces) + leading;
  }
  normalizeCompoundEdges(compounds, combinators, leading);
  const parts = makeComplexParts(compounds, combinators, leading);

  if (leading) {
    flags.valid =
      compounds.length > 1 &&
      compounds
        .slice(1)
        .every((compound) => compound.valid && compound.pieces.length > 0);
  }

  const summary = summarizeCompounds(compounds);
  return {
    parts,
    leadingCombinator: leading,
    valid: flags.valid,
    hasFunction: summary.hasFunction,
    hasVendorPseudo: summary.hasVendorPseudo,
    specificity: summary.specificity,
    hasNestedHas: summary.hasNestedHas || flags.hasNestedHas,
    hasPseudoElement: summary.hasPseudoElement || flags.hasPseudoElement,
  };
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @param {number} finish
 * @param {Compound[]} compounds
 * @param {string[]} combinators
 * @param {{ valid: boolean, hasNestedHas: boolean, hasPseudoElement: boolean }} flags
 * @return {{ nextIndex: number, nextState: NormalizationState, compoundStart: number }}
 */
function handleTriviaToken(
  state,
  tokens,
  index,
  finish,
  compounds,
  combinators,
  flags
) {
  const triviaStart = index;
  const { cursor, hasOrdinaryComment, importantIndices } = scanTriviaSegment(
    tokens,
    index,
    finish
  );

  appendImportantTrivia(state, tokens, importantIndices, triviaStart);

  const nextToken = cursor < finish ? tokens[cursor] : undefined;
  const isNextComma = nextToken?.[0] === TokenType.Comma;
  const isNextComb = Boolean(nextToken && checkCombinatorToken(tokens, cursor));

  let nextState = state;
  if (
    !isNextComma &&
    !isNextComb &&
    cursor < finish &&
    state.output.length > 0
  ) {
    if (hasOrdinaryComment || importantIndices.length > 0) {
      state.hasCommentDescendant = true;
      state.foldEligible = false;
    }
    recordCompound(compounds, finishCompound(state), flags);
    combinators.push(' ');

    nextState = createNormalizationState();
    if (hasOrdinaryComment || importantIndices.length > 0) {
      nextState.hasCommentDescendant = true;
      nextState.foldEligible = false;
    }
  }

  return {
    nextIndex: cursor - 1,
    nextState,
    compoundStart: cursor,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} finish
 * @param {boolean} [preserveLeading]
 * @param {boolean} [hasDefaultNamespace]
 * @return {{ entry: ComplexSelector, nextIndex: number }}
 */
function parseComplex(
  source,
  tokens,
  structure,
  values,
  start,
  finish,
  preserveLeading = false,
  hasDefaultNamespace = false
) {
  /** @type {Compound[]} */
  const compounds = [];
  /** @type {string[]} */
  const combinators = [];
  let state = createNormalizationState();
  const flags = { valid: true, hasNestedHas: false, hasPseudoElement: false };

  const { index: startIndex, leadingCombinator } = consumeLeading(
    state,
    tokens,
    start,
    finish,
    preserveLeading,
    compounds,
    () => finishCompound(createNormalizationState())
  );

  let index = startIndex;
  let compoundStart = index;

  for (; index < finish; index++) {
    const token = tokens[index];

    if (token[0] === TokenType.Comma) {
      break;
    }

    if (token[0] === TokenType.OpenSquare) {
      index = normalizeAttribute(state, tokens, structure, index);
      continue;
    }

    const comb = checkCombinatorToken(tokens, index);
    if (comb) {
      recordCompound(compounds, finishCompound(state), flags);
      combinators.push(comb.value);

      state = createNormalizationState();
      index = skipTriviaAfterCombinator(
        state,
        tokens,
        index + comb.length,
        finish
      );
      compoundStart = index;
      index--;
      continue;
    }

    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment) {
      const res = handleTriviaToken(
        state,
        tokens,
        index,
        finish,
        compounds,
        combinators,
        flags
      );
      state = res.nextState;
      compoundStart = res.compoundStart;
      index = res.nextIndex;
      continue;
    }

    const normalized = normalizeToken(
      state,
      source,
      tokens,
      structure,
      values,
      index,
      compoundStart,
      finish,
      hasDefaultNamespace
    );
    if (normalized.text !== undefined) {
      return {
        entry: {
          parts: [{ ...finishCompound(state), pieces: [normalized.text] }],
          leadingCombinator: undefined,
          valid: false,
          hasFunction: false,
          hasVendorPseudo: false,
          specificity: [0, 0, 0],
          hasNestedHas: false,
          hasPseudoElement: false,
        },
        nextIndex: finish,
      };
    }
    index = normalized.end;
  }

  return {
    entry: finalizeComplexEntry(
      state,
      compounds,
      combinators,
      leadingCombinator,
      flags
    ),
    nextIndex: index,
  };
}

/**
 * @param {Compound[]} compounds
 * @return {{ specificity: Specificity, hasFunction: boolean, hasVendorPseudo: boolean, hasNestedHas: boolean, hasPseudoElement: boolean }}
 */
function summarizeCompounds(compounds) {
  /** @type {Specificity} */
  const specificity = [0, 0, 0];
  let hasFunction = false;
  let hasVendorPseudo = false;
  let hasNestedHas = false;
  let hasPseudoElement = false;
  for (const compound of compounds) {
    addSpecificity(specificity, compound.specificity);
    if (compound.hasFunction) hasFunction = true;
    if (compound.hasVendorPseudo) hasVendorPseudo = true;
    if (compound.hasNestedHas) hasNestedHas = true;
    if (compound.hasPseudoElement) hasPseudoElement = true;
  }
  return {
    specificity,
    hasFunction,
    hasVendorPseudo,
    hasNestedHas,
    hasPseudoElement,
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} finish
 * @param {boolean} sort
 * @param {boolean} [preserveLeading]
 * @param {boolean} [isOuterBoundary]
 * @param {boolean} [hasDefaultNamespace]
 * @return {{ entries: ComplexSelector[], valid: boolean, specificity: Specificity, hasNestedHas: boolean, hasPseudoElement: boolean }}
 */
function normalizeListFromTokens(
  source,
  tokens,
  structure,
  values,
  start,
  finish,
  sort,
  preserveLeading = false,
  isOuterBoundary = false,
  hasDefaultNamespace = false
) {
  /** @type {ComplexSelector[]} */
  const entries = [];
  const seen = new Set();
  let valid = true;
  let hasNestedHas = false;
  let hasPseudoElement = false;
  let index = start;

  while (index < finish) {
    const { entry, nextIndex } = parseComplex(
      source,
      tokens,
      structure,
      values,
      index,
      finish,
      preserveLeading,
      hasDefaultNamespace
    );
    valid &&= Boolean(entry.valid);
    if (entry.hasNestedHas) hasNestedHas = true;
    if (entry.hasPseudoElement) hasPseudoElement = true;
    addEntry(entries, seen, entry, isOuterBoundary);

    if (nextIndex < finish && tokens[nextIndex][0] === TokenType.Comma) {
      index = nextIndex + 1;
      if (index === finish) {
        valid = false;
      }
    } else {
      break;
    }
  }

  if (entries.length === 0) {
    valid = false;
  }

  if (sort) entries.sort((a, b) => compareSerialized(a, b));
  const specificity = maximumSpecificity(entries);
  return { entries, valid, specificity, hasNestedHas, hasPseudoElement };
}

/** @param {ComplexSelector} a @param {ComplexSelector} b */
function compareSerialized(a, b) {
  const left = serializeComplex(a);
  const right = serializeComplex(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * @param {ComplexSelector[]} entries
 * @param {Set<string>} seen
 * @param {ComplexSelector} entry
 * @param {boolean} isOuterBoundary
 */
function addEntry(entries, seen, entry, isOuterBoundary) {
  if (entry.hasVendorPseudo) {
    entries.push(entry);
    return;
  }

  if (isOuterBoundary || !entry.hasFunction) {
    const text = serializeComplex(entry);
    if (!text || seen.has(text)) return;
    seen.add(text);
    entries.push(entry);
    return;
  }

  if (entries.length < 16) {
    if (!entries.some((existing) => equalComplex(existing, entry))) {
      entries.push(entry);
    }
    return;
  }

  if (seen.size === 0) {
    for (const item of entries) {
      const s = serializeComplex(item);
      if (s) seen.add(s);
    }
  }

  const text = serializeComplex(entry);
  if (!text || seen.has(text)) return;
  seen.add(text);
  entries.push(entry);
}

/**
 * Normalize function arguments from the leaves upward. `balancedTokens()` has
 * already made nesting explicit, so this reverse traversal is post-order
 * without using the JavaScript call stack.
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {boolean} [hasDefaultNamespace]
 * @return {Map<number, FunctionResult>}
 */
function normalizeFunctionValues(
  source,
  tokens,
  structure,
  hasDefaultNamespace = false
) {
  /** @type {Map<number, FunctionResult>} */
  const values = new Map();
  for (let index = tokens.length - 1; index >= 0; index--) {
    if (tokens[index][0] !== TokenType.Function) continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    values.set(
      index,
      normalizeFunction(
        source,
        tokens,
        structure,
        values,
        index,
        end,
        hasDefaultNamespace
      )
    );
  }
  return values;
}

/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 * @return {string}
 */
function normalizeList(
  source,
  sort = true,
  convertToIs = true,
  keyframe = false,
  hasDefaultNamespace = false
) {
  const structure = balancedTokens(source);
  if (!structure) return source;
  const values = normalizeFunctionValues(
    source,
    structure.tokens,
    structure,
    hasDefaultNamespace
  );
  const entries = normalizeListFromTokens(
    source,
    structure.tokens,
    structure,
    values,
    0,
    structure.tokens.length,
    sort,
    false,
    true,
    hasDefaultNamespace
  );
  if (!entries.valid) return source;
  if (keyframe) {
    for (const entry of entries.entries) {
      const [part] = entry.parts;
      if (
        entry.parts.length === 1 &&
        typeof part !== 'string' &&
        part.pieces.length === 1 &&
        typeof part.pieces[0] === 'string'
      ) {
        if (part.pieces[0].toLowerCase() === 'from') part.pieces = ['0%'];
        else if (part.pieces[0] === '100%') part.pieces = ['to'];
        entry.serializationKey = undefined;
      }
    }
  }
  return (convertToIs ? fold(entries.entries, sort) : entries.entries)
    .map(serializeComplex)
    .join(',');
}

/** @param {string} source @return {string} */
function specificityOf(source) {
  const structure = balancedTokens(source);
  if (!structure) return '0,0,0';
  const values = normalizeFunctionValues(source, structure.tokens, structure);
  const result = normalizeListFromTokens(
    source,
    structure.tokens,
    structure,
    values,
    0,
    structure.tokens.length,
    false
  );
  return result.specificity.join(',');
}

/** @param {string} source @param {boolean} [sort] @return {ComplexSelector[]} */
function parseSelectorList(source, sort = true) {
  const structure = balancedTokens(source);
  if (!structure) return [];
  const values = normalizeFunctionValues(source, structure.tokens, structure);
  return normalizeListFromTokens(
    source,
    structure.tokens,
    structure,
    values,
    0,
    structure.tokens.length,
    sort,
    false,
    true
  ).entries;
}

export { normalizeList, specificityOf, parseSelectorList };
