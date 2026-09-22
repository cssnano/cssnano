import cssnanoUtils from 'cssnano-utils';

const { tokenStart } = cssnanoUtils;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {{kind:'emit',emit:Emit}|{kind:'node',node:number}|{kind:'source',start:number,end:number}|{kind:'leave',node:number}} WorkItem */

/** @param {SelectorArena} arena @param {number} tokenIndex */
function sourceOffset(arena, tokenIndex) {
  if (tokenIndex === arena.tokens.length) return arena.source.length;
  const token = arena.tokens[tokenIndex];
  if (!token) {
    if (tokenIndex === 0) return 0;
    throw new RangeError('source emission has an invalid token boundary');
  }
  return tokenStart(token);
}

/** @param {SelectorArena} arena @param {ReadonlyMap<number,Emit>} rewrites @param {Emit} root */
export function serializeEmit(arena, rewrites, root) {
  /** @type {WorkItem[]} */ const work = [{ kind: 'emit', emit: root }];
  /** @type {string[]} */ const output = [];
  const activeNodes = new Set();
  const nextRewrite = Array.from(
    { length: arena.nodes.length + 1 },
    () => arena.nodes.length
  );
  for (let index = arena.nodes.length - 1; index >= 0; index--)
    nextRewrite[index] = rewrites.has(index) ? index : nextRewrite[index + 1];

  while (work.length > 0) {
    const item = work.pop();
    if (!item) break;
    if (item.kind === 'source') {
      output.push(arena.source.slice(item.start, item.end));
      continue;
    }
    if (item.kind === 'leave') {
      activeNodes.delete(item.node);
      continue;
    }
    if (item.kind === 'emit') {
      const emit = item.emit;
      if (emit.kind === 'text') output.push(emit.value);
      else if (emit.kind === 'source')
        work.push({ kind: 'source', start: emit.start, end: emit.end });
      else if (emit.kind === 'node')
        work.push({ kind: 'node', node: emit.node });
      else
        for (let index = emit.items.length - 1; index >= 0; index--)
          work.push({ kind: 'emit', emit: emit.items[index] });
      continue;
    }

    const nodeIndex = item.node;
    const node = arena.nodes[nodeIndex];
    if (!node)
      throw new RangeError('emission references an unknown arena node');
    if (activeNodes.has(nodeIndex))
      throw new Error('cyclic node emission is not serializable');
    activeNodes.add(nodeIndex);
    work.push({ kind: 'leave', node: nodeIndex });
    const rewrite = rewrites.get(nodeIndex);
    if (rewrite !== undefined) {
      work.push({ kind: 'emit', emit: rewrite });
      continue;
    }
    if (
      node.status !== 'valid' ||
      node.subtreeEnd === nodeIndex + 1 ||
      nextRewrite[nodeIndex + 1] >= node.subtreeEnd
    ) {
      work.push({
        kind: 'source',
        start: sourceOffset(arena, node.startToken),
        end: sourceOffset(arena, node.endToken),
      });
      continue;
    }
    /** @type {number[]} */ const children = [];
    arena.forEachChild(nodeIndex, (child) => children.push(child));
    let cursor = node.endToken;
    for (let index = children.length - 1; index >= 0; index--) {
      const childIndex = children[index];
      const child = arena.nodes[childIndex];
      work.push({
        kind: 'source',
        start: sourceOffset(arena, child.endToken),
        end: sourceOffset(arena, cursor),
      });
      work.push({ kind: 'node', node: childIndex });
      cursor = child.startToken;
    }
    work.push({
      kind: 'source',
      start: sourceOffset(arena, node.startToken),
      end: sourceOffset(arena, cursor),
    });
  }
  return output.join('');
}

/**
 * Serialize trusted normalizer output. Node emissions always mean an unchanged
 * source-backed subtree, so this path needs no rewrite lookup or cycle guard.
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 */
export function serializeNormalized(arena, root) {
  if (root === undefined) return arena.source;
  /** @type {Emit[]} */ const work = [root];
  /** @type {string[]} */ const output = [];
  while (work.length > 0) {
    const emit = work.pop();
    if (!emit) break;
    if (emit.kind === 'text') output.push(emit.value);
    else if (emit.kind === 'source')
      output.push(arena.source.slice(emit.start, emit.end));
    else if (emit.kind === 'node') {
      const node = arena.nodes[emit.node];
      if (!node)
        throw new RangeError('emission references an unknown arena node');
      output.push(
        arena.source.slice(
          sourceOffset(arena, node.startToken),
          sourceOffset(arena, node.endToken)
        )
      );
    } else
      for (let index = emit.items.length - 1; index >= 0; index--)
        work.push(emit.items[index]);
  }
  return output.join('');
}

/** @param {SelectorArena} arena @param {ReadonlyMap<number,Emit>} rewrites @param {number} nodeIndex */
function serializeArenaNode(arena, rewrites, nodeIndex) {
  return serializeEmit(arena, rewrites, { kind: 'node', node: nodeIndex });
}
/** @param {SelectorArena} arena @param {ReadonlyMap<number,Emit>} rewrites */
export function serializeArena(arena, rewrites) {
  return arena.nodes.length === 0
    ? arena.source
    : serializeArenaNode(arena, rewrites, 0);
}
