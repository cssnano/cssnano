import { hasSemanticFact, semanticFacts } from './arena.js';
import {
  leadingListTrivia,
  normalizedAt,
  rawOutput,
  trailingListTrivia,
} from './normalizePool.js';
import { outputText } from './normalizeOutput.js';
import { compareOutputs } from './normalizePseudo.js';

/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */

/** @param {OutputPool} pool @param {readonly Normalized[]} entries */
export function joinEntries(pool, entries) {
  /** @type {Output[]} */ const output = [];
  for (let index = 0; index < entries.length; index++) {
    if (index > 0) output.push(pool.text(','));
    output.push(entries[index]);
  }
  return pool.sequence(output);
}

/** @param {OutputPool} pool @param {Normalized[]} entries @param {Set<string>} seenText @param {Normalized} entry @param {boolean} isOuter @param {boolean} vendor */
function addListEntry(pool, entries, seenText, entry, isOuter, vendor) {
  if (vendor) {
    entries.push(entry);
    return;
  }
  if (isOuter) {
    const text = outputText(pool, entry);
    if (!text || seenText.has(text)) return;
    seenText.add(text);
    entries.push(entry);
    return;
  }
  if (entries.length < 16) {
    if (!entries.some(({ id }) => id === entry.id)) entries.push(entry);
    return;
  }
  if (seenText.size === 0)
    for (const item of entries) seenText.add(outputText(pool, item));
  const text = outputText(pool, entry);
  if (!text || seenText.has(text)) return;
  seenText.add(text);
  entries.push(entry);
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
function canForwardSingleList(arena, node, normalized, children) {
  if (children.length !== 1) return false;
  const payload = arena.payloads.lists[node.payload];
  const childIndex = children[0];
  const child = arena.nodes[childIndex];
  return (
    !payload.keyframe &&
    child.startToken === node.startToken &&
    child.endToken === node.endToken &&
    (payload.mode !== 'forgiving' || normalized[childIndex]?.valid !== false)
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} sort @param {readonly number[]} children */
export function listOutput(arena, pool, nodeIndex, normalized, sort, children) {
  const node = arena.nodes[nodeIndex];
  const payload = arena.payloads.lists[node.payload];
  if (node.status === 'invalid' && payload.mode !== 'forgiving')
    return rawOutput(arena, pool, node);
  if (canForwardSingleList(arena, node, normalized, children))
    return normalizedAt(normalized, children[0]);
  /** @type {Normalized[]} */ const entries = [];
  const seenText = new Set();
  const isOuter = nodeIndex === 0;
  for (let position = 0; position < children.length; position++) {
    const childIndex = children[position];
    const child = arena.nodes[childIndex];
    if (payload.mode === 'forgiving' && normalized[childIndex]?.valid === false)
      continue;
    let entry = /** @type {Normalized | undefined} */ (normalized[childIndex]);
    if (!entry) continue;
    const previousEnd =
      position === 0
        ? node.startToken
        : arena.nodes[children[position - 1]].endToken;
    const leading = leadingListTrivia(
      arena,
      pool,
      previousEnd,
      child.startToken
    );
    if (leading.length > 0)
      entry = {
        ...entry,
        ...pool.sequence([leading, entry]),
        node: entry.node,
      };
    const nextStart =
      position + 1 < children.length
        ? arena.nodes[children[position + 1]].startToken
        : node.endToken;
    const trailing = trailingListTrivia(arena, pool, child.endToken, nextStart);
    if (trailing.length > 0)
      entry = {
        ...entry,
        node: entry.node,
        ...pool.sequence([entry, trailing]),
        trailing: entry.trailing
          ? pool.sequence([entry.trailing, trailing])
          : trailing,
      };
    addListEntry(
      pool,
      entries,
      seenText,
      entry,
      isOuter,
      hasSemanticFact(child.facts ?? 0, semanticFacts.vendorPseudo)
    );
  }
  if (sort && entries.length > 1)
    entries.sort((left, right) => compareOutputs(pool, left, right));
  return { ...joinEntries(pool, entries), entries };
}
