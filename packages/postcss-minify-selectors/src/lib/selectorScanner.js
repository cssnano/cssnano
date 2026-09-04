import cssnanoUtils from 'cssnano-utils';
import {
  unquote,
  normalizeFormula,
  isCombinator,
  isColumnCombinator,
  isDeepBoundary,
  skipUniversal,
  keepWhitespace,
} from './tokenUtils.js';
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

const { TokenType } = cssnanoUtils;
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
 *   attributes: { operator: boolean, value: boolean }[],
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
  const name = tokens[index + 2]?.[1]?.toLowerCase() ?? '';
  if (legacyPseudoElements.has(name)) {
    state.output.push(':');
  } else {
    state.output.push('::');
  }
  state.specificity[2]++;
  state.hasPseudoElement = true;
  state.foldEligible = false;
  if (tokens[index + 2]?.[1]?.startsWith('-')) {
    state.hasVendorPseudo = true;
  }
  return true;
}

/** @param {{operator: boolean, value: boolean} | undefined} attribute @param {CSSToken} token @param {CSSToken | undefined} next */
function updateAttribute(attribute, token, next) {
  if (!attribute) return;
  if (token[0] === TokenType.Delim) {
    if (['=', '~', '^', '$', '*'].includes(token[1])) {
      attribute.operator = true;
    } else if (
      token[1] === '|' &&
      next?.[0] === TokenType.Delim &&
      next[1] === '='
    ) {
      attribute.operator = true;
    }
  }
  if (
    attribute.operator &&
    (token[0] === TokenType.Ident || token[0] === TokenType.String)
  )
    attribute.value = true;
}

/** @return {NormalizationState} */
function createNormalizationState() {
  return {
    output: [],
    specificity: [0, 0, 0],
    attributes: [],
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

  if (state.attributes.length) {
    state.hasAttributeModifier = true;
    state.foldEligible = false;
    state.output.push(' ');
  }
}

/** @param {NormalizationState} state @param {readonly CSSToken[]} tokens @param {number} index */
function normalizeWhitespace(state, tokens, index) {
  if (state.output.length === 0) return;
  const attribute = state.attributes.at(-1);
  if (state.attributes.length && attribute?.value) {
    state.hasAttributeModifier = true;
    state.foldEligible = false;
  }
  if (keepWhitespace(attribute, tokens[index - 1], tokens[index + 1]))
    state.output.push(' ');
}

/** @param {NormalizationState} state @param {CSSToken} token @param {CSSToken | undefined} previous */
function updateSimpleSpecificity(state, token, previous) {
  if (token[0] === TokenType.Hash) state.specificity[0]++;
  if (token[0] === TokenType.Delim && token[1] === '.') state.specificity[1]++;
  if (
    token[0] === TokenType.Ident &&
    previous?.[0] !== TokenType.Colon &&
    previous?.[0] !== TokenType.Hash &&
    !(previous?.[0] === TokenType.Delim && previous[1] === '.')
  )
    state.specificity[2]++;
}

/** @param {NormalizationState} state @param {CSSToken | undefined} next */
function updatePseudoSpecificity(state, next) {
  if (next?.[0] === TokenType.Function) return;
  const isPseudoElem =
    next?.[0] === TokenType.Colon ||
    pseudoElements.has(next?.[1]?.toLowerCase() ?? '');
  if (isPseudoElem) {
    state.specificity[2]++;
    state.hasPseudoElement = true;
    state.foldEligible = false;
  } else {
    state.specificity[1]++;
    const name = next?.[1]?.toLowerCase() ?? '';
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
  if (state.attributes.length) return;
  updateSimpleSpecificity(state, token, previous);
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
  if (type === TokenType.OpenSquare) {
    state.attributes.push({ operator: false, value: false });
    state.specificity[1]++;
    state.output.push(token[1]);
    return true;
  }
  if (type === TokenType.CloseSquare) {
    const attribute = state.attributes.pop();
    if (attribute?.operator && !attribute.value) state.valid = false;
    state.output.push(token[1]);
    return true;
  }
  if (type === TokenType.Whitespace) {
    normalizeWhitespace(state, tokens, index);
    return true;
  }
  return false;
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {{ end: number, skipped?: boolean }}
 */
function normalizeDelimToken(state, tokens, index) {
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
    !state.attributes.length &&
    skipUniversal(
      next,
      typeof state.output.at(-1) === 'string'
        ? /** @type {string} */ (state.output.at(-1))?.at(-1)
        : undefined
    )
  )
    return { end: index, skipped: true };

  if (isDeepBoundary(tokens, index)) {
    if (state.output.at(-1) === ' ') state.output.pop();
    state.output.push('/deep/');
    return { end: index + 2 };
  }

  return { end: index };
}

/** @param {NormalizationState} state @param {CSSToken} token */
function normalizeStringToken(state, token) {
  if (!state.attributes.length) state.valid = false;
  return state.attributes.length
    ? unquote(token[1]).replace(/\\\n/gu, '')
    : token[1];
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

/**
 * @param {NormalizationState} state
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} start
 * @param {number} finish
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
  finish
) {
  const token = tokens[index];
  const type = token[0];
  const next = tokens[index + 1];
  const previous = tokens[index - 1];

  if (normalizeStructuralToken(state, tokens, index)) return { end: index };

  const attribute = state.attributes.at(-1);
  updateAttribute(attribute, token, next);

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
    const delim = normalizeDelimToken(state, tokens, index);
    if (delim.skipped) return { end: delim.end };
    if (delim.end !== index) return delim;
  }

  const val =
    type === TokenType.Ident ? normalizeIdentToken(token, next) : token[1];
  state.output.push(val);
  return { end: index };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} finish
 * @return {Compound}
 */
function normalizeRange(source, tokens, structure, values, start, finish) {
  const state = createNormalizationState();
  for (let index = start; index < finish; index++) {
    const normalized = normalizeToken(
      state,
      source,
      tokens,
      structure,
      values,
      index,
      start,
      finish
    );
    if (normalized.text !== undefined)
      return {
        pieces: [normalized.text],
        specificity: state.specificity,
        hasNamespace: false,
        hasPseudoElement: false,
        hasFunction: false,
        hasNesting: false,
        hasAttributeModifier: false,
        hasCommentDescendant: false,
        hasVendorPseudo: false,
        foldEligible: false,
        valid: false,
      };
    index = normalized.end;
  }
  return finishCompound(state);
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
    specificity: isDoubleColon ? [0, 0, 0] : [0, 1, 0],
    foldEligible: false,
    outcome,
    valid: outcome !== 'invalid',
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @return {Compound}
 */
function normalizeCompound(source, tokens, structure, values, start, end) {
  const list = normalizeListFromTokens(
    source,
    tokens,
    structure,
    values,
    start,
    end,
    false
  );
  if (
    !list.valid ||
    list.entries.length !== 1 ||
    list.entries[0].parts.length !== 1 ||
    list.entries[0].leadingCombinator ||
    typeof list.entries[0].parts[0] === 'string'
  ) {
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
  return /** @type {Compound} */ (list.entries[0].parts[0]);
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @param {'forgiving-selector-list' | 'selector-list' | 'relative-selector-list'} grammar
 * @return {FunctionResult}
 */
function normalizeSelectorList(
  source,
  tokens,
  structure,
  values,
  start,
  end,
  grammar
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
    relative
  );

  if (relative && (result.hasPseudoElement || result.hasNestedHas)) {
    result.valid = false;
  }

  const entries = forgiving
    ? result.entries.filter((entry) => entry.valid)
    : result.entries;

  const valid = forgiving ? true : result.valid;
  /** @type {'valid' | 'invalid'} */
  const outcome = valid ? 'valid' : 'invalid';

  return {
    pieces: selectorListPieces(entries),
    specificity: maximumSpecificity(entries),
    outcome,
    valid,
  };
}

/** @param {string} kind @return {string | undefined} */
function firstPseudoReplacement(kind) {
  if (kind === 'child') return ':first-child';
  if (kind === 'of-type') return ':first-of-type';
  if (kind === 'last-child' || kind === 'last-of-type') return `:${kind}`;
  return undefined;
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} end
 * @param {string} [name]
 * @return {FunctionResult}
 */
function normalizeNthArgument(
  source,
  tokens,
  structure,
  values,
  start,
  end,
  name = ''
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

  const formulaResult = normalizeRange(
    source,
    tokens,
    structure,
    values,
    start,
    ofIndex < 0 ? end : ofIndex
  );
  const formulaText = serializePieces(formulaResult.pieces);
  const formula = normalizeFormula(formulaText).trim();
  if (!formula || !formulaResult.valid)
    return { pieces: [formulaText], specificity: [0, 1, 0], valid: false };

  let normalizedFormula = formula;
  if (normalizedFormula.toLowerCase() === 'even') {
    normalizedFormula = '2n';
  }

  if (ofIndex >= 0) {
    const list = normalizeListFromTokens(
      source,
      tokens,
      structure,
      values,
      ofIndex + 1,
      end,
      false,
      false
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
 * @param {number} index
 * @param {number} end
 * @return {FunctionResult}
 */
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
function normalizeIdentListArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let count = 0;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Ident) {
      if (count > 0) {
        pieces.push(' ');
      }
      let val = token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      pieces.push(val);
      count++;
      continue;
    }
    return { valid: false };
  }

  if (count === 0) {
    return { valid: false };
  }

  return { pieces, valid: true };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
function normalizePtNameArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let found = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (
      !found &&
      (type === TokenType.Ident ||
        (type === TokenType.Delim && token[1] === '*'))
    ) {
      found = true;
      let val = token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      pieces.push(val);
      continue;
    }
    return { valid: false };
  }

  if (!found) {
    return { valid: false };
  }

  return { pieces, valid: true };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
function normalizeIdentArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let foundIdent = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Ident && !foundIdent) {
      foundIdent = true;
      let val = token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      pieces.push(val);
      continue;
    }
    return { valid: false };
  }

  if (!foundIdent) {
    return { valid: false };
  }

  return { pieces, valid: true };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
function normalizeIdentOrStringList(tokens, start, end) {
  /** @type {{ value: string, trivia: string[] }[]} */
  const items = [];
  /** @type {string[]} */
  let currentTrivia = [];
  /** @type {Set<string>} */
  const seen = new Set();
  let expectItem = true;
  let hasTokenInItem = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        currentTrivia.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Comma) {
      if (expectItem || !hasTokenInItem) {
        return { valid: false };
      }
      expectItem = true;
      hasTokenInItem = false;
      continue;
    }
    if (expectItem && (type === TokenType.Ident || type === TokenType.String)) {
      let val = type === TokenType.String ? unquote(token[1]) : token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      if (!seen.has(val)) {
        seen.add(val);
        items.push({ value: val, trivia: currentTrivia });
      }
      currentTrivia = [];
      expectItem = false;
      hasTokenInItem = true;
      continue;
    }
    return { valid: false };
  }

  if (expectItem || items.length === 0) {
    return { valid: false };
  }

  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) pieces.push(',');
    pieces.push(...items[i].trivia, items[i].value);
  }
  if (currentTrivia.length > 0) {
    pieces.push(...currentTrivia);
  }

  return { pieces, valid: true };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} end
 * @return {FunctionResult}
 */
/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {string} name
 * @param {number} index
 * @param {number} end
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
  isDoubleColon = false
) {
  const inner = normalizeCompound(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end
  );
  if (!inner.valid)
    return rawFunctionResult(source, tokens, index, end, 'invalid');
  /** @type {Specificity} */
  const specificity = [...inner.specificity];
  if (!isDoubleColon) {
    specificity[1]++;
  }
  return {
    pieces: [name, '(', ...inner.pieces, ')'],
    specificity,
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
 * @param {string} lower
 * @param {number} index
 * @param {number} end
 * @return {FunctionResult}
 */
function normalizeNthFunction(
  source,
  tokens,
  structure,
  values,
  lower,
  index,
  end
) {
  const inner = normalizeNthArgument(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end,
    lower
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
    specificity: isDoubleColon ? [0, 0, 0] : [0, 1, 0],
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
    specificity: isDoubleColon ? [0, 0, 0] : [0, 1, 0],
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
    specificity: isDoubleColon ? [0, 0, 0] : [0, 1, 0],
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
  grammar
) {
  const inner = normalizeSelectorList(
    source,
    tokens,
    structure,
    values,
    index + 1,
    end,
    grammar
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
  };
}

/**
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} index
 * @param {number} end
 * @return {FunctionResult}
 */
function normalizeFunction(source, tokens, structure, values, index, end) {
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
        isDoubleColon
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
        end
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
        grammar
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
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @param {Map<number, FunctionResult>} values
 * @param {number} start
 * @param {number} finish
 * @param {boolean} [preserveLeading]
 * @return {{ entry: ComplexSelector, nextIndex: number }}
 */
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {{ value: string, length: number } | undefined}
 */
function checkCombinatorToken(tokens, index) {
  if (isColumnCombinator(tokens, index)) {
    return { value: '||', length: 2 };
  }
  if (isDeepBoundary(tokens, index)) {
    return { value: '/deep/', length: 3 };
  }
  const token = tokens[index];
  if (isCombinator(token)) {
    return { value: token[1], length: 1 };
  }
  return undefined;
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {number}
 */
function skipTriviaAfterCombinator(state, tokens, start, finish) {
  let index = start;
  while (index < finish) {
    const t = tokens[index];
    if (t[0] === TokenType.Whitespace) {
      index++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) state.output.push(t[1]);
      index++;
    } else {
      break;
    }
  }
  return index;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {{ cursor: number, hasOrdinaryComment: boolean, importantIndices: number[] }}
 */
function scanTriviaSegment(tokens, start, finish) {
  let cursor = start;
  let hasOrdinaryComment = false;
  /** @type {number[]} */
  const importantIndices = [];
  while (cursor < finish) {
    const t = tokens[cursor];
    if (t[0] === TokenType.Whitespace) {
      cursor++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) {
        importantIndices.push(cursor);
      } else {
        hasOrdinaryComment = true;
      }
      cursor++;
    } else {
      break;
    }
  }
  return { cursor, hasOrdinaryComment, importantIndices };
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number[]} importantIndices
 * @param {number} triviaStart
 */
function appendImportantTrivia(state, tokens, importantIndices, triviaStart) {
  if (importantIndices.length === 0) return;
  if (state.output.length > 0 && importantIndices[0] > triviaStart) {
    state.output.push(' ');
  }
  for (let i = 0; i < importantIndices.length; i++) {
    if (i > 0 && importantIndices[i] > importantIndices[i - 1] + 1) {
      state.output.push(' ');
    }
    state.output.push(tokens[importantIndices[i]][1]);
  }
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
function handleAttributeToken(
  state,
  source,
  tokens,
  structure,
  values,
  index,
  compoundStart,
  finish
) {
  const token = tokens[index];
  if (token[0] === TokenType.Whitespace) {
    normalizeWhitespace(state, tokens, index);
    return index;
  }
  if (token[0] === TokenType.Comment) {
    normalizeComment(state, tokens, index);
    return index;
  }
  const normalized = normalizeToken(
    state,
    source,
    tokens,
    structure,
    values,
    index,
    compoundStart,
    finish
  );
  return normalized.end;
}

/**
 * @param {NormalizationState} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @param {boolean} preserveLeading
 * @param {Compound[]} compounds
 * @return {{ index: number, leadingCombinator: string | undefined }}
 */
function consumeLeading(
  state,
  tokens,
  start,
  finish,
  preserveLeading,
  compounds
) {
  let index = start;
  /** @type {string[]} */
  const leadingImportantComments = [];
  while (index < finish) {
    const t = tokens[index];
    if (t[0] === TokenType.Whitespace) {
      index++;
    } else if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) leadingImportantComments.push(t[1]);
      index++;
    } else {
      break;
    }
  }

  let leadingCombinator;
  if (preserveLeading && index < finish) {
    if (isColumnCombinator(tokens, index)) {
      leadingCombinator = '||';
      index += 2;
    } else if (isCombinator(tokens[index])) {
      leadingCombinator = tokens[index][1];
      index += 1;
    }
    if (leadingCombinator) {
      if (leadingImportantComments.length > 0) {
        leadingCombinator =
          leadingImportantComments.join('') + leadingCombinator;
        leadingImportantComments.length = 0;
      }
      index = skipTriviaAfterCombinator(state, tokens, index, finish);
      compounds.push(finishCompound(createNormalizationState()));
    }
  }

  for (const c of leadingImportantComments) {
    state.output.push(c);
  }

  return { index, leadingCombinator };
}

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
 * @return {{ entry: ComplexSelector, nextIndex: number }}
 */
function parseComplex(
  source,
  tokens,
  structure,
  values,
  start,
  finish,
  preserveLeading = false
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
    compounds
  );

  let index = startIndex;
  let compoundStart = index;

  for (; index < finish; index++) {
    const token = tokens[index];

    if (state.attributes.length === 0 && token[0] === TokenType.Comma) {
      break;
    }

    if (state.attributes.length > 0) {
      index = handleAttributeToken(
        state,
        source,
        tokens,
        structure,
        values,
        index,
        compoundStart,
        finish
      );
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
      finish
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
  isOuterBoundary = false
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
      preserveLeading
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
  const first = entry.parts[0];
  if (first && typeof first !== 'string' && first.pieces.length === 1) {
    if (typeof first.pieces[0] === 'string') {
      if (first.pieces[0].toLowerCase() === 'from') first.pieces = ['0%'];
      else if (first.pieces[0] === '100%') first.pieces = ['to'];
    }
  }

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

  if (!entries.some((existing) => equalComplex(existing, entry))) {
    entries.push(entry);
  }
}

/**
 * Normalize function arguments from the leaves upward. `balancedTokens()` has
 * already made nesting explicit, so this reverse traversal is post-order
 * without using the JavaScript call stack. Function results retain structural
 * handles and raw source spans, releasing child work once consumed, so
 * serialization occurs strictly at the outer boundary.
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {BalancedTokenStructure} structure
 * @return {Map<number, FunctionResult>}
 */
function normalizeFunctionValues(source, tokens, structure) {
  /** @type {Map<number, FunctionResult>} */
  const values = new Map();
  for (let index = tokens.length - 1; index >= 0; index--) {
    if (tokens[index][0] !== TokenType.Function) continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    values.set(
      index,
      normalizeFunction(source, tokens, structure, values, index, end)
    );
  }
  return values;
}

/** @param {string} source @param {boolean} [sort] @param {boolean} [convertToIs] @return {string} */
function normalizeList(source, sort = true, convertToIs = true) {
  const structure = balancedTokens(source);
  if (!structure) return source;
  const values = normalizeFunctionValues(source, structure.tokens, structure);
  const entries = normalizeListFromTokens(
    source,
    structure.tokens,
    structure,
    values,
    0,
    structure.tokens.length,
    sort,
    false,
    true
  );
  return (convertToIs ? fold(entries.entries, sort) : entries.entries)
    .map(serializeComplex)
    .join(',');
}

/** @param {string} source @return {string[]} */
function splitList(source) {
  const structure = balancedTokens(source);
  if (!structure) return [source];
  return structure.topLevelSegments().map(({ startIndex, endIndex }) => {
    const start = structure.tokens[startIndex]?.[2] ?? source.length;
    const end =
      endIndex > startIndex ? structure.tokens[endIndex - 1][3] + 1 : start;
    return source.slice(start, end);
  });
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

export { normalizeList, splitList, specificityOf, parseSelectorList };
