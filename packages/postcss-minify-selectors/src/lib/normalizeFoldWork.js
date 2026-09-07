import { semanticFacts } from './arena.js';
import { outputText } from './normalizeOutput.js';
import { compareOutputs } from './normalizePseudo.js';
import { joinEntries } from './normalizeList.js';
import {
  activeOccurrences,
  consId,
  foldCandidate,
  foldGroup,
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
/** @typedef {{selector:ActiveSelector,position:number,middle:Normalized,group:FoldGroup,text:string}} FoldOccurrence */
/** @typedef {{occurrences:FoldOccurrence[],orderHeap:FoldOccurrence[],lexHeap:FoldOccurrence[],middleCounts:Map<number,{count:number,middle:Normalized}>,specificity:Specificity,specificityId:number,activeCount:number,selectorLength:number,middleLength:number,version:number,sequence:number}} FoldGroup */
/** @typedef {{group:FoldGroup,version:number,savings:number,count:number,first:FoldOccurrence,lex:string}} FoldCandidate */
/** @typedef {Normalized & {active:boolean,activeId:number,order:number,memberships:FoldOccurrence[],previousId?:number,nextId?:number}} ActiveSelector */

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
function addOccurrence(group, occurrence) {
  group.occurrences.push(occurrence);
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
  for (let index = 0; index < parts.length; index++)
    prefix[index + 1] = consId(cons, prefix[index], parts[index].id);
  for (let index = parts.length - 1; index >= 0; index--)
    suffix[index] = consId(cons, parts[index].id, suffix[index + 1]);
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
  syntheticMiddle.id = pool.identity(
    'pseudo',
    pool.payload(
      `valid;${candidate.group.specificityId};${semanticFacts.function};is`
    ),
    foldedMiddle.id
  );
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
    activeId: -1,
    order,
    memberships: [],
    trailing:
      trailingComments.length > 0 ? pool.sequence(trailingComments) : undefined,
  });
  replacement.id = pool.identity(
    'complex',
    pool.payload(`valid;-1;${semanticFacts.function};synthetic`),
    replacement.id
  );
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

/** @param {ActiveSelector[]} consumed @param {Set<FoldGroup>} touched @param {Map<number,ActiveSelector>} selectorsById @param {number | undefined} headId */
function deactivateSelectors(consumed, touched, selectorsById, headId) {
  let nextHeadId = headId;
  for (const selector of consumed) {
    if (!selector.active) continue;
    selector.active = false;
    for (const occurrence of selector.memberships) {
      removeOccurrence(occurrence.group, occurrence);
      touched.add(occurrence.group);
    }
    const previous =
      selector.previousId === undefined
        ? undefined
        : selectorsById.get(selector.previousId);
    const next =
      selector.nextId === undefined
        ? undefined
        : selectorsById.get(selector.nextId);
    if (previous) previous.nextId = selector.nextId;
    else nextHeadId = selector.nextId;
    if (next) next.previousId = selector.previousId;
  }
  return nextHeadId;
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
  let nextActiveId = 1;
  /** @type {ActiveSelector[]} */ const active = selectors.map(
    (selector, order) => ({
      ...selector,
      active: true,
      activeId: nextActiveId++,
      order,
      memberships: [],
    })
  );
  const selectorsById = new Map(
    active.map((selector) => [selector.activeId, selector])
  );
  for (let index = 0; index < active.length; index++) {
    const selector = active[index];
    const previous = active[index - 1];
    const next = active[index + 1];
    if (previous) selector.previousId = previous.activeId;
    if (next) selector.nextId = next.activeId;
  }
  /** @type {number | undefined} */
  let headId = active[0]?.activeId;
  const touched = new Set();
  for (const selector of active)
    registerSelector(selector, arena, pool, cons, groups, sequence, touched);
  enqueueGroups(heap, touched);

  while (heap.values.length > 0) {
    const candidate = heap.pop();
    if (!candidate || candidate.version !== candidate.group.version) continue;
    const current = foldCandidate(candidate.group);
    if (!current) continue;
    const occurrences = activeOccurrences(current.group);
    const consumed = occurrences.map(({ selector }) => selector);
    if (consumed.length < 2) continue;
    const first = current.first.selector;
    const replacement = buildFoldedSelector(
      pool,
      current,
      occurrences,
      first.order,
      sort
    );
    replacement.activeId = nextActiveId++;
    replacement.previousId = first.previousId;
    replacement.nextId = first.activeId;
    selectorsById.set(replacement.activeId, replacement);
    const previous =
      first.previousId === undefined
        ? undefined
        : selectorsById.get(first.previousId);
    if (previous) previous.nextId = replacement.activeId;
    else headId = replacement.activeId;
    first.previousId = replacement.activeId;

    touched.clear();
    headId = deactivateSelectors(consumed, touched, selectorsById, headId);
    registerSelector(replacement, arena, pool, cons, groups, sequence, touched);
    enqueueGroups(heap, touched);
  }

  /** @type {Normalized[]} */ const result = [];
  let selector = headId === undefined ? undefined : selectorsById.get(headId);
  while (selector) {
    result.push(selector);
    selector =
      selector.nextId === undefined
        ? undefined
        : selectorsById.get(selector.nextId);
  }
  return result;
}
