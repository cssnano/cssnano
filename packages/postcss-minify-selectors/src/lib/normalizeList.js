import { hasSemanticFact, semanticFacts } from './arena.js';
import { normalizedAt, rawOutput } from './normalizePool.js';
import { scanListGap } from './normalizeListTrivia.js';
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

/** @param {OutputPool} pool @param {Normalized[]} entries @param {Set<string> | null} seenText @param {Normalized} entry @param {boolean} isOuter @param {boolean} vendor @returns {Set<string> | null} */
function addListEntry(pool, entries, seenText, entry, isOuter, vendor) {
  if (vendor) {
    entries.push(entry);
    return seenText;
  }
  let activeSeenText = seenText;
  if (isOuter) {
    activeSeenText ??= new Set();
    const text = outputText(pool, entry);
    if (!text || activeSeenText.has(text)) return activeSeenText;
    activeSeenText.add(text);
    entries.push(entry);
    return activeSeenText;
  }
  if (entries.length < 16) {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].id === entry.id) return activeSeenText;
    }
    entries.push(entry);
    return activeSeenText;
  }
  if (!activeSeenText) {
    activeSeenText = new Set();
    for (let i = 0; i < entries.length; i++) {
      activeSeenText.add(outputText(pool, entries[i]));
    }
  }
  const text = outputText(pool, entry);
  if (!text || activeSeenText.has(text)) return activeSeenText;
  activeSeenText.add(text);
  entries.push(entry);
  return activeSeenText;
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
  /** @type {Set<string> | null} */ let seenText = null;
  const isOuter = nodeIndex === 0;
  let leading =
    children.length > 0
      ? scanListGap(
          arena,
          pool,
          node.startToken,
          arena.nodes[children[0]].startToken
        ).leading
      : pool.empty;
  for (let position = 0; position < children.length; position++) {
    const childIndex = children[position];
    const child = arena.nodes[childIndex];
    const isLast = position + 1 === children.length;
    const nextStart = isLast
      ? node.endToken
      : arena.nodes[children[position + 1]].startToken;
    const gap = scanListGap(arena, pool, child.endToken, nextStart);
    const trailing = gap.trailing;
    const nextLeading = isLast ? pool.empty : gap.leading;

    const isSkipped =
      payload.mode === 'forgiving' && normalized[childIndex]?.valid === false;

    if (!isSkipped) {
      let entry = /** @type {Normalized | undefined} */ (
        normalized[childIndex]
      );
      if (entry) {
        if (leading.length > 0)
          entry = {
            ...entry,
            ...pool.sequence([leading, entry]),
            node: entry.node,
          };
        if (trailing.length > 0)
          entry = {
            ...entry,
            node: entry.node,
            ...pool.sequence([entry, trailing]),
            trailing: entry.trailing
              ? pool.sequence([entry.trailing, trailing])
              : trailing,
          };
        seenText = addListEntry(
          pool,
          entries,
          seenText,
          entry,
          isOuter,
          hasSemanticFact(child.facts ?? 0, semanticFacts.vendorPseudo)
        );
      }
    }

    leading = nextLeading;
  }
  if (sort && entries.length > 1)
    entries.sort((left, right) => compareOutputs(pool, left, right));
  return { ...joinEntries(pool, entries), entries };
}
