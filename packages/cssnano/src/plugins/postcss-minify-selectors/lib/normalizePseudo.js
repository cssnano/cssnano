import {
  firstPseudoReplacement,
  pieceArgumentParsers,
} from './argumentParsers.js';
import { hasSemanticFact, semanticFacts } from './arena.js';
import { dropHexEscapeTerminator, joinPieces } from './hexEscape.js';
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

/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @typedef {import('./normalizeOutput.js').Part} Part */

/** @param {OutputPool} pool @param {string} prefix @param {string} name @param {Output} inner */
function wrapPseudo(pool, prefix, name, inner) {
  return pool.sequence([pool.text(`${prefix}${name}(`), inner, pool.text(')')]);
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
    prefix,
    name,
    pool.text(useOdd ? 'odd' : formula.text)
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized @param {string} prefix @param {string} name */
function structuralPseudoOutput(arena, pool, node, normalized, prefix, name) {
  const payload = arena.payloads.pseudos[node.payload];
  if (payload.argumentNode === undefined) return;
  const argument = normalized[payload.argumentNode];
  if (!argument || argument.valid === false) return;
  if (payload.argumentGrammar !== 'an-plus-b-of')
    return wrapPseudo(pool, prefix, name, argument);
  const formula = normalizeAnPlusB(
    arena.tokens,
    payload.nameToken + 1,
    arena.nodes[payload.argumentNode].startToken - 1
  );
  if (!formula) return;
  return wrapPseudo(
    pool,
    prefix,
    name,
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
  if (!payload.argumentGrammar) return pool.text(`${prefix}${name}`);
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
        prefix,
        name,
        pool.text(joinPieces(result.pieces ?? []))
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
