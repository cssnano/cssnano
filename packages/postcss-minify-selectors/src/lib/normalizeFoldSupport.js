import { hasSemanticFact, semanticFacts } from './arena.js';

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./normalizeOutput.js').Normalized} Normalized */
/** @param {{pairs:Map<number,Map<number,number>>,next:number}} state @param {number} left @param {number} right */
export function consId(state, left, right) {
  let rights = state.pairs.get(left);
  if (!rights) {
    rights = new Map();
    state.pairs.set(left, rights);
  }
  let id = rights.get(right);
  if (id === undefined) {
    id = state.next++;
    rights.set(right, id);
  }
  return id;
}

/** @typedef {{selector:ActiveSelector,position:number,middle:Normalized,group:FoldGroup,text:string}} FoldOccurrence */
/** @typedef {{occurrences:FoldOccurrence[],orderHeap:FoldOccurrence[],lexHeap:FoldOccurrence[],middleCounts:Map<number,{count:number,middle:Normalized}>,specificity:Specificity,specificityId:number,activeCount:number,selectorLength:number,middleLength:number,version:number,sequence:number}} FoldGroup */
/** @typedef {{group:FoldGroup,version:number,savings:number,count:number,first:FoldOccurrence,lex:string}} FoldCandidate */
/** @typedef {Normalized & {active:boolean,activeId:number,order:number,memberships:FoldOccurrence[],previousId?:number,nextId?:number}} ActiveSelector */

/** @param {Normalized} selector @param {SelectorArena} arena */
function arenaUnsafeForFold(selector, arena) {
  const facts =
    selector.node >= 0 ? (arena.nodes[selector.node]?.facts ?? 0) : 0;
  return (
    hasSemanticFact(facts, semanticFacts.vendorPseudo) ||
    hasSemanticFact(facts, semanticFacts.commentDescendant) ||
    selector.parts?.some((part) => 'kind' in part && part.text === '||')
  );
}

/** @param {Normalized} selector @param {SelectorArena} arena */
export function selectorCanFold(selector, arena) {
  if (!selector.parts || arenaUnsafeForFold(selector, arena)) return false;
  for (let position = 0; position < selector.parts.length; position += 2) {
    const middle = selector.parts[position];
    if (!('kind' in middle) && middle.foldEligible && middle.specificity)
      return true;
  }
  return false;
}

/** @param {Map<number,Map<number,Map<number,FoldGroup>>>} groups @param {{value:number}} sequence @param {number} prefix @param {number} suffix @param {Normalized} middle */
export function foldGroup(groups, sequence, prefix, suffix, middle) {
  const specificityId = /** @type {number} */ (middle.specificityId);
  let bySuffix = groups.get(prefix);
  if (!bySuffix) {
    bySuffix = new Map();
    groups.set(prefix, bySuffix);
  }
  let bySpec = bySuffix.get(suffix);
  if (!bySpec) {
    bySpec = new Map();
    bySuffix.set(suffix, bySpec);
  }
  let group = bySpec.get(specificityId);
  if (!group) {
    group = {
      occurrences: [],
      orderHeap: [],
      lexHeap: [],
      middleCounts: new Map(),
      specificity: /** @type {Specificity} */ (middle.specificity),
      specificityId,
      activeCount: 0,
      selectorLength: 0,
      middleLength: 0,
      version: 0,
      sequence: sequence.value++,
    };
    bySpec.set(specificityId, group);
  }
  return group;
}

/** @param {FoldGroup} group */
export function activeOccurrences(group) {
  return group.occurrences.filter(({ selector }) => selector.active);
}

/** @param {FoldOccurrence[]} values @param {FoldOccurrence} value @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
export function pushOccurrence(values, value, before) {
  let index = values.length;
  values.push(value);
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (!before(value, values[parent])) break;
    values[index] = values[parent];
    index = parent;
  }
  values[index] = value;
}

/** @param {FoldOccurrence[]} values @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
function popOccurrence(values, before) {
  const last = values.pop();
  if (!last || values.length === 0) return;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    if (left >= values.length) break;
    const right = left + 1;
    const child =
      right < values.length && before(values[right], values[left])
        ? right
        : left;
    if (!before(values[child], last)) break;
    values[index] = values[child];
    index = child;
  }
  values[index] = last;
}

/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
export function occurrenceOrder(left, right) {
  return (
    left.selector.order < right.selector.order ||
    (left.selector.order === right.selector.order &&
      left.position < right.position)
  );
}

/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
export function occurrenceText(left, right) {
  return left.text < right.text;
}

/** @param {FoldOccurrence[]} values @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
function activeOccurrence(values, before) {
  while (values[0] && !values[0].selector.active) popOccurrence(values, before);
  return values[0];
}

/** @param {FoldGroup} group @return {FoldCandidate | undefined} */
export function foldCandidate(group) {
  if (group.activeCount < 2 || group.middleCounts.size < 2) return;
  const first = activeOccurrence(group.orderHeap, occurrenceOrder);
  const lexical = activeOccurrence(group.lexHeap, occurrenceText);
  if (!first || !lexical) return;
  const foldedLength =
    first.selector.length -
    first.middle.length +
    5 +
    group.middleLength +
    group.middleCounts.size -
    1;
  const originalLength = group.selectorLength + group.activeCount - 1;
  const savings = originalLength - foldedLength;
  if (savings <= 0) return;
  return {
    group,
    version: group.version,
    savings,
    count: group.activeCount,
    first,
    lex: lexical.text,
  };
}

export class CandidateHeap {
  /** @param {boolean} sort */
  constructor(sort) {
    /** @type {FoldCandidate[]} */ this.values = [];
    this.sort = sort;
  }

  /** @param {FoldCandidate} left @param {FoldCandidate} right */
  before(left, right) {
    return foldCandidateBefore(this.sort, left, right);
  }

  /** @param {FoldCandidate} value */
  push(value) {
    const values = this.values;
    let index = values.length;
    values.push(value);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(value, values[parent])) break;
      values[index] = values[parent];
      index = parent;
    }
    values[index] = value;
  }

  pop() {
    const values = this.values;
    const root = values[0];
    const last = values.pop();
    if (!root || !last || values.length === 0) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= values.length) break;
      const right = left + 1;
      const child =
        right < values.length && this.before(values[right], values[left])
          ? right
          : left;
      if (!this.before(values[child], last)) break;
      values[index] = values[child];
      index = child;
    }
    values[index] = last;
    return root;
  }
}

/** @param {boolean} sort @param {FoldCandidate} left @param {FoldCandidate} right */
export function foldCandidateBefore(sort, left, right) {
  if (!sort)
    return (
      left.first.selector.order < right.first.selector.order ||
      (left.first.selector.order === right.first.selector.order &&
        (left.first.position < right.first.position ||
          (left.first.position === right.first.position &&
            left.group.sequence < right.group.sequence)))
    );
  return (
    left.savings > right.savings ||
    (left.savings === right.savings &&
      (left.count > right.count ||
        (left.count === right.count &&
          (left.lex < right.lex ||
            (left.lex === right.lex &&
              (left.first.position < right.first.position ||
                (left.first.position === right.first.position &&
                  left.group.sequence < right.group.sequence)))))))
  );
}

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
