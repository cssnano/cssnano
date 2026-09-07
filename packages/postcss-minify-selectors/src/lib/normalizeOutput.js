import { legacyPseudoElements } from './grammar.js';
import {
  compactIdent,
  compactTerminalIdent,
  normalizedAt,
  offset,
  sourceText,
} from './normalizePool.js';

/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {Output & {node:number,parts?:Part[],foldEligible?:boolean,specificity?:Specificity,specificityId?:number,facts:number,entries?:Normalized[],valid:boolean,hasPseudoElement:boolean,trailing?:Output}} Normalized */
/** @typedef {Normalized | {kind:'combinator',id:number,emit?:import('./outputOverlay.js').Emit,text:string,length:number}} Part */

/** @param {Emit} root @param {SelectorArena | undefined} arena */
function flatten(root, arena) {
  /** @type {Emit[]} */ const work = [root];
  /** @type {string[]} */ const output = [];
  while (work.length > 0) {
    const item = work.pop();
    if (!item) break;
    if (item.kind === 'text') output.push(item.value);
    else if (item.kind === 'sequence')
      for (let index = item.items.length - 1; index >= 0; index--)
        work.push(item.items[index]);
    else if (item.kind === 'node' && arena) {
      const node = arena.nodes[item.node];
      output.push(sourceText(arena, node.startToken, node.endToken));
    } else if (item.kind === 'source' && arena)
      output.push(arena.source.slice(item.start, item.end));
    else
      throw new Error('arena normalization emitted an unresolved source node');
  }
  return output.join('');
}

/** @param {OutputPool} pool @param {Output} output */
export function outputText(pool, output) {
  if (output.text === undefined) {
    if (output.sourceNode !== undefined) {
      const node = pool.arena.nodes[output.sourceNode];
      output.text = sourceText(pool.arena, node.startToken, node.endToken);
    } else output.text = flatten(pool.emit(output), pool.arena);
  }
  return output.text;
}

/** @param {number} nodeIndex @param {Output} output */
export function sourceNodeOutput(nodeIndex, output) {
  return {
    ...output,
    emit: undefined,
    sourceNode: nodeIndex,
    text: undefined,
    changed: false,
  };
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {number} id */
function unchangedOutput(arena, nodeIndex, id) {
  const node = arena.nodes[nodeIndex];
  return {
    id,
    length: offset(arena, node.endToken) - offset(arena, node.startToken),
    sourceNode: nodeIndex,
    changed: false,
  };
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized */
function unchangedPseudoOutput(arena, pool, nodeIndex, normalized) {
  const node = arena.nodes[nodeIndex];
  const payload = arena.payloads.pseudos[node.payload];
  const argument = payload.argumentNode;
  const name = compactIdent(arena.tokens[payload.nameToken]).replace(
    /\($/u,
    ''
  );
  const prefix =
    payload.colonCount === 2 && legacyPseudoElements.has(payload.name)
      ? ':'
      : ':'.repeat(payload.colonCount);
  if (argument === undefined) {
    const text = `${prefix}${name}`;
    if (text === sourceText(arena, node.startToken, node.endToken))
      return unchangedOutput(arena, nodeIndex, pool.text(text).id);
    return;
  }
  const argumentOutput = normalized[argument];
  if (
    !argumentOutput ||
    argumentOutput.valid === false ||
    !canReusePseudo(arena, node, normalized)
  )
    return;
  const opening = `${prefix}${name}(`;
  if (
    opening !==
      sourceText(arena, node.startToken, arena.nodes[argument].startToken) ||
    sourceText(arena, arena.nodes[argument].endToken, node.endToken) !== ')'
  )
    return;
  return unchangedOutput(
    arena,
    nodeIndex,
    pool.sequenceId([
      pool.text(opening).id,
      argumentOutput.id,
      pool.text(')').id,
    ])
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
export function unchangedNodeOutput(
  arena,
  pool,
  nodeIndex,
  normalized,
  children
) {
  const node = arena.nodes[nodeIndex];
  if (node.kind === 'raw')
    return unchangedOutput(
      arena,
      nodeIndex,
      pool.text(sourceText(arena, node.startToken, node.endToken)).id
    );
  if (node.kind === 'class') {
    const text = `${arena.tokens[node.startToken][1]}${compactTerminalIdent(
      arena,
      node,
      node.startToken + 1
    )}`;
    if (
      text ===
      `${arena.tokens[node.startToken][1]}${arena.tokens[node.startToken + 1][1]}`
    )
      return unchangedOutput(arena, nodeIndex, pool.text(text).id);
    return;
  }
  if (node.kind === 'id') {
    const text = compactTerminalIdent(arena, node, node.startToken);
    if (text === arena.tokens[node.startToken][1])
      return unchangedOutput(arena, nodeIndex, pool.text(text).id);
    return;
  }
  if (node.kind === 'compound') {
    if (!canReuseContainer(arena, nodeIndex, normalized, children)) return;
    if (
      children.length > 1 &&
      children.some((childIndex) => {
        const child = arena.nodes[childIndex];
        if (child.kind !== 'qualified-name') return false;
        const payload = arena.payloads.qualifiedNames[child.payload];
        return (
          payload.namespace.kind === 'absent' &&
          payload.subject.kind === 'universal'
        );
      })
    )
      return;
    if (children.length === 1)
      return unchangedOutput(
        arena,
        nodeIndex,
        normalizedAt(normalized, children[0]).id
      );
    return unchangedOutput(
      arena,
      nodeIndex,
      pool.sequenceId(
        children.map((child) => normalizedAt(normalized, child).id)
      )
    );
  }
  if (node.kind === 'complex') {
    if (!canReuseContainer(arena, nodeIndex, normalized, children)) return;
    return unchangedOutput(
      arena,
      nodeIndex,
      normalizedAt(normalized, children[0]).id
    );
  }
  if (node.kind === 'list') {
    if (
      nodeIndex === 0 ||
      !canReuseContainer(arena, nodeIndex, normalized, children)
    )
      return;
    return unchangedOutput(
      arena,
      nodeIndex,
      normalizedAt(normalized, children[0]).id
    );
  }
  if (node.kind === 'pseudo')
    return unchangedPseudoOutput(arena, pool, nodeIndex, normalized);
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
function canReuseContainer(arena, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  if (node.kind === 'list' || node.kind === 'complex')
    return (
      children.length === 1 &&
      arena.nodes[children[0]].startToken === node.startToken &&
      arena.nodes[children[0]].endToken === node.endToken &&
      normalized[children[0]]?.sourceNode === children[0]
    );
  if (node.kind !== 'compound') return false;
  let cursor = node.startToken;
  for (const child of children) {
    const childNode = arena.nodes[child];
    if (
      childNode.startToken !== cursor ||
      normalized[child]?.sourceNode !== child
    )
      return false;
    cursor = childNode.endToken;
  }
  return cursor === node.endToken;
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized */
function canReusePseudo(arena, node, normalized) {
  const payload = arena.payloads.pseudos[node.payload];
  const argument = payload.argumentNode;
  return (
    argument !== undefined &&
    normalized[argument]?.sourceNode === argument &&
    arena.nodes[argument].startToken === payload.nameToken + 1 &&
    arena.nodes[argument].endToken === node.endToken - 1
  );
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children @param {Output} output */
export function canReuseSourceNode(
  arena,
  nodeIndex,
  normalized,
  children,
  output
) {
  const node = arena.nodes[nodeIndex];
  if (
    output.length !==
    offset(arena, node.endToken) - offset(arena, node.startToken)
  )
    return false;
  if (node.kind === 'class')
    return (
      output.text ===
      `${arena.tokens[node.startToken][1]}${arena.tokens[node.startToken + 1][1]}`
    );
  if (node.kind === 'id')
    return output.text === arena.tokens[node.startToken][1];
  if (node.kind === 'raw') return true;
  if (node.kind === 'qualified-name')
    return output.text === sourceText(arena, node.startToken, node.endToken);
  if (node.kind === 'combinator')
    return output.text === sourceText(arena, node.startToken, node.endToken);
  if (
    node.kind === 'list' ||
    node.kind === 'complex' ||
    node.kind === 'compound'
  )
    return canReuseContainer(arena, nodeIndex, normalized, children);
  if (node.kind === 'pseudo') return canReusePseudo(arena, node, normalized);
  return false;
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {OutputPool} pool @param {Output} output */
export function normalizedPayload(arena, node, pool, output) {
  let status = 2;
  if (node.status === 'valid') status = 0;
  else if (node.status === 'invalid') status = 1;
  const summary =
    ((node.specificityId ?? -1) + 1) * 3 * 1024 +
    status * 1024 +
    (node.facts ?? 0);
  if (node.kind === 'list') {
    const payload = arena.payloads.lists[node.payload];
    return pool.payload(
      `${summary};${payload.mode};${Boolean(payload.keyframe)};${Boolean(payload.hasDefaultNamespace)}`
    );
  }
  if (node.kind === 'qualified-name') return summary;
  if (node.kind === 'pseudo') {
    const payload = arena.payloads.pseudos[node.payload];
    return pool.payload(
      `${summary};${[
        payload.name,
        payload.colonCount,
        payload.pseudoKind,
        payload.argumentGrammar ?? '',
        payload.specificityPolicy,
        payload.argumentNode === undefined ? output.id : 0,
      ].join(';')}`
    );
  }
  return summary;
}
