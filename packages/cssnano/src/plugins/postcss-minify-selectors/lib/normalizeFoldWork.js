import { semanticFacts } from './arena.js';
import { compareOutputs, outputText } from './normalizePool.js';
import { joinEntries } from './normalizeList.js';
import {
  activeOccurrences,
  consId,
  foldCandidate,
  foldGroup,
  foldPartKey,
  CandidateHeap,
  occurrenceOrder,
  occurrenceText,
  pushOccurrence,
  selectorCanFold,
} from './normalizeFoldSupport.js';

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @typedef {import('./normalizeOutput.js').Part} Part */
/** @typedef {import('./normalizeFoldSupport.js').FoldOccurrence} FoldOccurrence */
/** @typedef {import('./normalizeFoldSupport.js').FoldGroup} FoldGroup */
/** @typedef {import('./normalizeFoldSupport.js').FoldCandidate} FoldCandidate */
/** @typedef {import('./normalizeFoldSupport.js').ActiveSelector} ActiveSelector */

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
function addOccurrence(group, occurrence) {
  group.activeOccurrences.add(occurrence);
  pushOccurrence(group.orderHeap, occurrence, occurrenceOrder);
  pushOccurrence(group.lexHeap, occurrence, occurrenceText);
  group.activeCount++;
  group.selectorLength += occurrence.selector.length;
  const found = group.middleCounts.get(occurrence.middle.id);
  if (found) found.count++;
  else {
    group.middleCounts.set(occurrence.middle.id, {
      count: 1,
      middle: occurrence.middle,
    });
    group.middleLength += occurrence.middle.length;
  }
  group.version++;
}

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
function removeOccurrence(group, occurrence) {
  if (!group.activeOccurrences.delete(occurrence)) return;
  group.activeCount--;
  group.selectorLength -= occurrence.selector.length;
  const found = group.middleCounts.get(occurrence.middle.id);
  if (!found) throw new Error('missing active fold middle');
  found.count--;
  if (found.count === 0) {
    group.middleCounts.delete(occurrence.middle.id);
    group.middleLength -= occurrence.middle.length;
  }
  group.version++;
}

/** @param {ActiveSelector} selector @param {SelectorArena} arena @param {OutputPool} pool @param {{pairs:Map<number,Map<number,number>>,next:number}} cons @param {Map<number,Map<number,Map<number,FoldGroup>>>} groups @param {{value:number}} sequence @param {Set<FoldGroup>} touched */
function registerSelector(
  selector,
  arena,
  pool,
  cons,
  groups,
  sequence,
  touched
) {
  const parts = selector.parts;
  if (!parts || !selectorCanFold(selector, arena)) return;
  const prefix = Array(parts.length + 1).fill(0);
  const suffix = Array(parts.length + 1).fill(0);
  // Key each part once; the suffix array holds the keys until the
  // right-to-left pass replaces them with suffix ids.
  for (let index = 0; index < parts.length; index++) {
    suffix[index] = foldPartKey(arena, pool, parts[index]);
    prefix[index + 1] = consId(cons, prefix[index], suffix[index]);
  }
  for (let index = parts.length - 1; index >= 0; index--)
    suffix[index] = consId(cons, suffix[index], suffix[index + 1]);
  for (let position = 0; position < parts.length; position += 2) {
    const middle = parts[position];
    if (
      'kind' in middle ||
      !middle.foldEligible ||
      middle.specificityId === undefined
    )
      continue;
    const group = foldGroup(
      groups,
      sequence,
      prefix[position],
      suffix[position + 1],
      middle
    );
    const occurrence = {
      selector,
      position,
      middle,
      group,
      text: outputText(pool, selector),
    };
    selector.memberships.push(occurrence);
    addOccurrence(group, occurrence);
    touched.add(group);
  }
}

/** @param {OutputPool} pool @param {FoldCandidate} candidate @param {FoldOccurrence[]} occurrences @param {number} order @param {boolean} sort @return {ActiveSelector} */
function buildFoldedSelector(pool, candidate, occurrences, order, sort) {
  const first = candidate.first;
  const original = first.selector;
  const parts = /** @type {Part[]} */ (original.parts);
  const middleSeen = new Set();
  /** @type {Normalized[]} */ const middles = [];
  if (candidate.group.middleCounts.size > 0) {
    for (const occurrence of occurrences) {
      if (middleSeen.has(occurrence.middle.id)) continue;
      middleSeen.add(occurrence.middle.id);
      middles.push(occurrence.middle);
    }
  }
  if (sort) middles.sort((left, right) => compareOutputs(pool, left, right));
  const foldedMiddle = pool.sequence([
    pool.text(':is('),
    joinEntries(pool, middles),
    pool.text(')'),
  ]);
  const syntheticMiddle = /** @type {Normalized} */ ({
    ...foldedMiddle,
    node: -1,
    specificity: candidate.group.specificity,
    specificityId: candidate.group.specificityId,
    foldEligible: false,
    facts: semanticFacts.function,
    valid: true,
    hasPseudoElement: false,
  });
  /** @type {Part[]} */ const newParts = [];
  /** @type {Output[]} */ const output = [];
  for (let index = 0; index < parts.length; index++) {
    let value = parts[index];
    if (index === first.position) value = syntheticMiddle;
    newParts.push(value);
    output.push(value);
  }
  /** @type {Output[]} */ const trailingComments = [];
  for (const occurrence of occurrences) {
    if (occurrence.selector.trailing) {
      trailingComments.push(occurrence.selector.trailing);
    }
  }
  if (trailingComments.length > 0) {
    output.push(...trailingComments);
  }
  const replacement = /** @type {ActiveSelector} */ ({
    ...pool.sequence(output),
    node: -1,
    parts: newParts,
    facts: semanticFacts.function,
    valid: true,
    hasPseudoElement: original.hasPseudoElement,
    active: true,
    order,
    memberships: [],
    trailing:
      trailingComments.length > 0 ? pool.sequence(trailingComments) : undefined,
  });
  return replacement;
}

/** @param {CandidateHeap} heap @param {Iterable<FoldGroup>} groups */
function enqueueGroups(heap, groups) {
  for (const group of groups) {
    const candidate = foldCandidate(group);
    if (candidate) heap.push(candidate);
  }
}

/** @param {Normalized[]} selectors @param {SelectorArena} arena */
function canFoldSelectorList(selectors, arena) {
  let eligible = 0;
  for (const selector of selectors) {
    if (selectorCanFold(selector, arena)) eligible++;
    if (eligible === 2) return true;
  }
  return false;
}

/** @param {FoldOccurrence[]} occurrences @param {Set<FoldGroup>} touched @param {ActiveSelector | undefined} head @return {ActiveSelector | undefined} */
function deactivateSelectors(occurrences, touched, head) {
  let nextHead = head;
  for (const { selector } of occurrences) {
    if (!selector.active) continue;
    selector.active = false;
    for (const occurrence of selector.memberships) {
      removeOccurrence(occurrence.group, occurrence);
      touched.add(occurrence.group);
    }
    const { previous, next } = selector;
    if (previous) previous.next = next;
    else nextHead = next;
    if (next) next.previous = previous;
  }
  return nextHead;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} selectors @param {boolean} sort */
export function foldSelectors(arena, pool, selectors, sort) {
  if (selectors.length < 2 || !canFoldSelectorList(selectors, arena))
    return selectors;
  const cons = { pairs: new Map(), next: 1 };
  /** @type {Map<number,Map<number,Map<number,FoldGroup>>>} */ const groups =
    new Map();
  const sequence = { value: 0 };
  const heap = new CandidateHeap(sort);
  /** @type {ActiveSelector[]} */ const active = selectors.map(
    (selector, order) => ({
      ...selector,
      active: true,
      order,
      memberships: [],
    })
  );
  for (let index = 0; index < active.length; index++) {
    const selector = active[index];
    selector.previous = active[index - 1];
    selector.next = active[index + 1];
  }
  /** @type {ActiveSelector | undefined} */
  let head = active[0];
  const touched = new Set();
  for (const selector of active)
    registerSelector(selector, arena, pool, cons, groups, sequence, touched);
  enqueueGroups(heap, touched);

  while (heap.values.length > 0) {
    const candidate = heap.pop();
    if (candidate.version !== candidate.group.version) continue;
    const occurrences = activeOccurrences(candidate.group);
    if (occurrences.length < 2) continue;
    const first = candidate.first.selector;
    const replacement = buildFoldedSelector(
      pool,
      candidate,
      occurrences,
      first.order,
      sort
    );
    // The replacement takes the place of the first consumed selector in list
    // order. Link it in before the consumed selectors are unlinked, so each
    // unlink sees its real neighbours.
    const previous = first.previous;
    replacement.previous = previous;
    replacement.next = first;
    if (previous) previous.next = replacement;
    else head = replacement;
    first.previous = replacement;

    touched.clear();
    head = deactivateSelectors(occurrences, touched, head);
    registerSelector(replacement, arena, pool, cons, groups, sequence, touched);
    enqueueGroups(heap, touched);
  }

  /** @type {Normalized[]} */ const result = [];
  let selector = head;
  while (selector) {
    result.push(selector);
    selector = selector.next;
  }
  return result;
}
