import { OutputPool } from './normalizePool.js';
import { finalizeEntries, normalizeNode } from './normalizeNode.js';

export { foldCandidateBefore } from './normalizeFoldSupport.js';

/** @param {import('./arena.js').SelectorArena} arena @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options] */
export function normalizeArena(arena, options = {}) {
  if (arena.nodes.length === 0) return;
  const root = arena.nodes[0];
  if (root.kind === 'raw' || root.status === 'invalid') return;
  if (
    root.status === 'opaque' &&
    arena.nodes.some(
      (node) =>
        node.kind === 'raw' &&
        node.status === 'opaque' &&
        node.startToken === root.startToken &&
        node.endToken === root.endToken
    )
  )
    return;
  const pool = new OutputPool(arena);
  /** @type {(import('./normalizeNode.js').Normalized | undefined)[]} */ const normalized =
    Array(arena.nodes.length);
  for (let nodeIndex = arena.nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
    normalized[nodeIndex] = normalizeNode(
      arena,
      pool,
      nodeIndex,
      normalized,
      false
    );
    arena.forEachChild(nodeIndex, (child) => {
      normalized[child] = undefined;
    });
  }

  const rootResult = normalized[0];
  if (!rootResult) throw new Error('arena root was not normalized');
  const entries = rootResult.entries;
  if (entries) return finalizeEntries(arena, pool, entries, options);
  return rootResult.changed === false ? undefined : pool.emit(rootResult);
}
