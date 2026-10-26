import {
  firstPseudoReplacement,
  pieceArgumentParsers,
} from './argumentParsers.js';
import { colon } from '../../../values/punctuationTokens.js';
import {
  funcWithText,
  identifierWithText,
} from '../../../values/tokenConstructors.js';
import { hasSemanticFact, semanticFacts } from './arena.js';
import { dropHexEscapeTerminator, joinPieces } from './hexEscape.js';
import { joinPieceTokens } from './serializeArena.js';
import { legacyPseudoElements } from './grammar.js';
import { normalizeAnPlusB } from './normalizeAnPlusB.js';
import { trailingListTrivia } from './normalizeListTrivia.js';
import {
  descendantCombinator,
  importantTrivia,
  normalizedAt,
  outputText,
  qualifiedNameOutput,
  rawOutput,
} from './normalizePool.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @typedef {import('./normalizeOutput.js').Part} Part */

/**
 * The head of a pseudo, `:name(` or `:name`, interned with the tokens that
 * spell it. Tokens are built only for a text not yet interned. The name keeps
 * its source token unless dropping a hex escape terminator changed it.
 * @param {OutputPool} pool
 * @param {SelectorArena} arena
 * @param {import('./arena.js').PseudoPayload} payload
 * @param {string} prefix
 * @param {string} name
 * @param {boolean} opening whether the head ends with `(`
 * @return {Output}
 */
function pseudoHead(pool, arena, payload, prefix, name, opening) {
  const text = opening ? `${prefix}${name}(` : `${prefix}${name}`;
  const cached = pool.texts.get(text);
  if (cached) return cached;
  const source = arena.tokens[payload.nameToken];
  const { value } = /** @type {{value: string}} */ (source[4]);
  const sourceText = opening ? `${name}(` : name;
  let nameToken;
  if (source[1] === sourceText) nameToken = source;
  else if (opening) nameToken = funcWithText(sourceText, value);
  else nameToken = identifierWithText(sourceText, value);
  const colons = prefix === '::' ? [colon(), colon()] : [colon()];
  return pool.intern(text, Object.freeze([...colons, nameToken]));
}

/**
 * The text of an argument's pieces, interned with the tokens that spell it.
 * Tokens are built only for a text not yet interned.
 * @param {OutputPool} pool
 * @param {{ pieces?: string[], tokens?: (CSSToken | undefined)[] }} result
 * @return {Output}
 */
function pieceArgumentOutput(pool, result) {
  const pieces = result.pieces ?? [];
  const text = joinPieces(pieces);
  return (
    pool.texts.get(text) ??
    pool.intern(text, joinPieceTokens(pieces, result.tokens ?? []))
  );
}

/** @param {OutputPool} pool @param {Output} head @param {Output} inner */
function wrapPseudo(pool, head, inner) {
  return pool.sequence([head, inner, pool.text(')')]);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {string} prefix @param {string} name */
function nthPseudoOutput(arena, pool, node, prefix, name) {
  const payload = arena.payloads.pseudos[node.payload];
  const start = payload.nameToken + 1;
  const formula = normalizeAnPlusB(arena.tokens, start, node.endToken - 1);
  if (!formula) return;
  if (formula.text === '1') {
    const replacement = firstPseudoReplacement(payload.name.slice(4));
    if (replacement) return pool.text(replacement);
  }
  const useOdd =
    !formula.important &&
    formula.formula.isTwoNPlusOne &&
    (formula.text === '2n+1' || formula.text.includes('\\'));
  return wrapPseudo(
    pool,
    pseudoHead(pool, arena, payload, prefix, name, true),
    pool.text(useOdd ? 'odd' : formula.text)
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized @param {string} prefix @param {string} name */
function structuralPseudoOutput(arena, pool, node, normalized, prefix, name) {
  const payload = arena.payloads.pseudos[node.payload];
  if (payload.argumentNode === undefined) return;
  const argument = normalized[payload.argumentNode];
  if (!argument || argument.valid === false) return;
  const head = pseudoHead(pool, arena, payload, prefix, name, true);
  if (payload.argumentGrammar !== 'an-plus-b-of')
    return wrapPseudo(pool, head, argument);
  const formula = normalizeAnPlusB(
    arena.tokens,
    payload.nameToken + 1,
    arena.nodes[payload.argumentNode].startToken - 1
  );
  if (!formula) return;
  return wrapPseudo(
    pool,
    head,
    pool.sequence([pool.text(formula.text), pool.text(' of '), argument])
  );
}

/** @param {SelectorArena} arena @param {import('./arena.js').PseudoPayload} payload */
export function formatPseudoPrefixAndName(arena, payload) {
  const raw = arena.tokens[payload.nameToken][1];
  const name = dropHexEscapeTerminator(
    raw.endsWith('(') ? raw.slice(0, -1) : raw
  );
  const prefix =
    payload.colonCount === 2 && !legacyPseudoElements.has(payload.name)
      ? '::'
      : ':';
  return { name, prefix };
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized */
export function pseudoOutput(arena, pool, node, normalized) {
  if (node.status === 'invalid') return rawOutput(arena, pool, node);
  const payload = arena.payloads.pseudos[node.payload];
  const { name, prefix } = formatPseudoPrefixAndName(arena, payload);
  if (!payload.argumentGrammar)
    return pseudoHead(pool, arena, payload, prefix, name, false);
  let output;
  if (payload.argumentNode !== undefined)
    output = structuralPseudoOutput(
      arena,
      pool,
      node,
      normalized,
      prefix,
      name
    );
  else if (
    payload.argumentGrammar === 'an-plus-b' ||
    payload.argumentGrammar === 'an-plus-b-of'
  )
    output = nthPseudoOutput(arena, pool, node, prefix, name);
  else {
    const result = pieceArgumentParsers.get(payload.argumentGrammar)?.(
      arena.tokens,
      payload.nameToken + 1,
      node.endToken - 1
    );
    if (result?.valid)
      output = wrapPseudo(
        pool,
        pseudoHead(pool, arena, payload, prefix, name, true),
        pieceArgumentOutput(pool, result)
      );
  }
  return output ?? rawOutput(arena, pool, node);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export function compoundOutput(arena, pool, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  if (
    node.status === 'invalid' &&
    children.some((child) => normalized[child]?.valid === false)
  )
    return rawOutput(arena, pool, node);
  const removableUniversal =
    children.length > 1 && !arena.payloads.lists[0]?.hasDefaultNamespace;
  /** @type {Output[]} */ const output = [];
  let cursor = node.startToken;
  for (const childIndex of children) {
    const child = arena.nodes[childIndex];
    output.push(importantTrivia(arena, pool, cursor, child.startToken));
    output.push(
      child.kind === 'qualified-name'
        ? qualifiedNameOutput(arena, pool, child, removableUniversal)
        : normalizedAt(normalized, childIndex)
    );
    cursor = child.endToken;
  }
  output.push(importantTrivia(arena, pool, cursor, node.endToken));
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export function complexOutput(arena, pool, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  const recoversPseudoElement =
    node.status === 'invalid' &&
    hasSemanticFact(node.facts ?? 0, semanticFacts.pseudoElement) &&
    children.every((child) => !normalized[child]?.hasPseudoElement);
  if (node.status === 'invalid' && !recoversPseudoElement)
    return rawOutput(arena, pool, node);
  /** @type {Output[]} */ const output = [];
  /** @type {Part[]} */ const parts = [];
  let cursor = node.startToken;
  for (const childIndex of children) {
    const child = arena.nodes[childIndex];
    const leading = importantTrivia(arena, pool, cursor, child.startToken);
    if (child.kind === 'combinator') {
      output.push(leading);
      const value = arena.payloads.combinators[child.payload].value;
      const item =
        value === ' '
          ? descendantCombinator(arena, pool, child)
          : pool.text(value);
      output.push(item);
      parts.push({ kind: 'combinator', ...item, text: outputText(pool, item) });
    } else {
      const childOutput = normalizedAt(normalized, childIndex);
      const item =
        leading.length === 0
          ? childOutput
          : /** @type {Normalized} */ ({
              ...childOutput,
              ...pool.sequence([leading, childOutput]),
              node: childOutput.node,
            });
      output.push(item);
      parts.push(item);
    }
    cursor = child.endToken;
  }
  const trailing = trailingListTrivia(arena, pool, cursor, node.endToken);
  output.push(trailing);
  return {
    ...pool.sequence(output),
    node: nodeIndex,
    parts,
    trailing: trailing.length !== 0 ? trailing : undefined,
  };
}
