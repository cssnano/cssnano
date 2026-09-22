import { hasSemanticFact, isFoldEligible, semanticFacts } from './arena.js';
import {
  attributeOutput,
  childrenOf,
  compactTerminalIdent,
  descendantCombinator,
  qualifiedNameOutput,
  rawOutput,
} from './normalizePool.js';
import {
  canReuseSourceNode,
  normalizedPayload,
  outputText,
  unchangedNodeOutput,
  sourceNodeOutput,
} from './normalizeOutput.js';
import {
  compareOutputs,
  complexOutput,
  compoundOutput,
  pseudoOutput,
} from './normalizePseudo.js';
import { joinEntries, listOutput } from './normalizeList.js';
import { foldSelectors } from './normalizeFoldWork.js';

/** @type {readonly number[]} */
const emptyChildren = Object.freeze([]);
const singleChild = [0];

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @typedef {import('./normalizeOutput.js').Part} Part */

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} outerSort @param {readonly number[]} children */
function normalizedNodeOutput(
  arena,
  pool,
  nodeIndex,
  normalized,
  outerSort,
  children
) {
  const node = arena.nodes[nodeIndex];
  if (node.kind === 'list')
    return listOutput(
      arena,
      pool,
      nodeIndex,
      normalized,
      nodeIndex === 0 && outerSort,
      children
    );
  if (node.kind === 'complex')
    return complexOutput(arena, pool, nodeIndex, normalized, children);
  if (node.kind === 'compound')
    return compoundOutput(arena, pool, nodeIndex, normalized, children);
  if (node.kind === 'qualified-name')
    return qualifiedNameOutput(arena, pool, node, false);
  if (node.kind === 'attribute') return attributeOutput(arena, pool, node);
  if (node.kind === 'pseudo')
    return pseudoOutput(arena, pool, node, normalized);
  if (node.kind === 'class')
    return pool.text(
      `${arena.tokens[node.startToken][1]}${compactTerminalIdent(
        arena,
        node,
        node.startToken + 1
      )}`
    );
  if (node.kind === 'id')
    return pool.text(compactTerminalIdent(arena, node, node.startToken));
  if (node.kind === 'combinator') {
    const value = arena.payloads.combinators[node.payload].value;
    if (value === ' ') return descendantCombinator(arena, pool, node);
    return pool.text(value);
  }
  return rawOutput(arena, pool, node);
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children @param {Normalized} output */
function addNormalizedNodeSummary(
  arena,
  nodeIndex,
  normalized,
  children,
  output
) {
  const node = arena.nodes[nodeIndex];
  let valid = node.status !== 'invalid';
  let hasPseudoElement = hasSemanticFact(
    node.facts ?? 0,
    semanticFacts.pseudoElement
  );
  if (node.kind === 'pseudo') {
    const payload = arena.payloads.pseudos[node.payload];
    if (payload.argumentGrammar === 'forgiving-selector-list') {
      valid = true;
      hasPseudoElement = false;
    }
  } else if (node.kind === 'list') {
    const payload = arena.payloads.lists[node.payload];
    if (payload.mode === 'forgiving') valid = true;
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  } else if (node.kind === 'compound') {
    valid = children.every((child) => normalized[child]?.valid !== false);
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  } else if (node.kind === 'complex') {
    const recovered =
      node.status === 'invalid' &&
      hasSemanticFact(node.facts ?? 0, semanticFacts.pseudoElement) &&
      children.every((child) => !normalized[child]?.hasPseudoElement);
    valid = node.status !== 'invalid' || Boolean(recovered);
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  }
  const foldEligible = node.kind === 'compound' && isFoldEligible(node);
  output.valid = valid;
  output.hasPseudoElement = hasPseudoElement;
  output.facts = node.facts ?? 0;
  if (foldEligible) output.foldEligible = true;
  if (node.kind === 'compound' || node.kind === 'complex')
    output.node = nodeIndex;
  if (node.specificity !== undefined) {
    output.specificity = node.specificity;
    output.specificityId = node.specificityId;
  }
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} outerSort */
export function normalizeNode(arena, pool, nodeIndex, normalized, outerSort) {
  const node = arena.nodes[nodeIndex];
  const firstChild = nodeIndex + 1;
  const isLeaf = node.subtreeEnd === firstChild;
  const hasSingleChild =
    !isLeaf && arena.nodes[firstChild].subtreeEnd === node.subtreeEnd;
  let children;
  if (isLeaf) children = emptyChildren;
  else if (hasSingleChild) {
    singleChild[0] = firstChild;
    children = singleChild;
  } else children = childrenOf(arena, nodeIndex);
  let output = /** @type {Normalized | undefined} */ (
    unchangedNodeOutput(arena, pool, nodeIndex, normalized, children)
  );
  if (!output) {
    const generated = normalizedNodeOutput(
      arena,
      pool,
      nodeIndex,
      normalized,
      outerSort,
      children
    );
    output = /** @type {Normalized} */ ({
      ...generated,
      emit: pool.emit(generated),
      sourceNode: undefined,
      changed: true,
    });
  }
  if (canReuseSourceNode(arena, nodeIndex, normalized, children, output))
    output = /** @type {Normalized} */ (sourceNodeOutput(nodeIndex, output));
  addNormalizedNodeSummary(arena, nodeIndex, normalized, children, output);
  output.id = pool.identity(
    node.kind,
    normalizedPayload(arena, node, pool, output),
    output.id
  );
  return output;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} entries @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean}} options */
export function finalizeEntries(arena, pool, entries, options) {
  const sort = options.sort ?? true;
  if (options.keyframe && sort && entries.length > 1)
    entries.sort((left, right) => compareOutputs(pool, left, right));
  if (options.keyframe) {
    for (let index = 0; index < entries.length; index++) {
      const value = outputText(pool, entries[index]);
      if (value.toLowerCase() === 'from')
        entries[index] = { ...entries[index], ...pool.text('0%'), node: -1 };
      else if (value === '100%')
        entries[index] = { ...entries[index], ...pool.text('to'), node: -1 };
    }
  }
  let folded =
    options.convertToIs && !options.keyframe
      ? foldSelectors(arena, pool, entries, sort)
      : entries;
  if (!options.keyframe && sort && folded.length > 1)
    folded = folded.toSorted((left, right) =>
      compareOutputs(pool, left, right)
    );
  return joinEntries(pool, folded).emit;
}
