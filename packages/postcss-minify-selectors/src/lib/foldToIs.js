import { compoundSpecificityKey, addSpecificity } from './specificity.js';

/** @typedef {import('./specificity.js').Specificity} Specificity */
/** @typedef {import('./specificity.js').HasSpecificity} HasSpecificity */
/**
 * @typedef {{
 *   raw?: { source: string, start: number, end: number },
 *   pieces?: (string | FunctionResult)[],
 *   text?: string,
 *   specificity: Specificity,
 *   foldEligible?: boolean,
 *   outcome?: 'valid' | 'invalid' | 'opaque',
 *   valid: boolean,
 *   hasNestedHas?: boolean,
 *   hasPseudoElement?: boolean
 * }} FunctionResult
 */
/**
 * @typedef {{
 *   pieces: (string | FunctionResult)[],
 *   specificity: Specificity,
 *   hasNamespace: boolean,
 *   hasPseudoElement: boolean,
 *   hasFunction: boolean,
 *   hasNesting: boolean,
 *   hasAttributeModifier: boolean,
 *   hasCommentDescendant: boolean,
 *   hasVendorPseudo: boolean,
 *   foldEligible: boolean,
 *   valid: boolean,
 *   hasNestedHas?: boolean
 * }} Compound
 */
/**
 * @typedef {{
 *   parts: (Compound | string)[],
 *   leadingCombinator?: string,
 *   valid: boolean,
 *   hasFunction: boolean,
 *   hasVendorPseudo: boolean,
 *   specificity: Specificity,
 *   serializationKey?: string,
 *   hasNestedHas?: boolean,
 *   hasPseudoElement?: boolean
 * }} ComplexSelector
 */

/**
 * @param {readonly (string | FunctionResult)[] | undefined} rootPieces
 * @return {string}
 */
export function serializePieces(rootPieces) {
  if (!rootPieces) return '';
  /** @type {{ pieces: readonly (string | FunctionResult)[], index: number }[]} */
  const stack = [{ pieces: rootPieces, index: 0 }];
  /** @type {string[]} */
  const output = [];

  while (stack.length > 0) {
    const frame = stack.at(-1);
    if (!frame) break;
    if (frame.index >= frame.pieces.length) {
      stack.pop();
      continue;
    }
    const item = frame.pieces[frame.index++];
    if (item === undefined) continue;
    if (typeof item === 'string') {
      output.push(item);
    } else if (item.raw) {
      output.push(item.raw.source.slice(item.raw.start, item.raw.end));
    } else if (item.text !== undefined) {
      output.push(item.text);
    } else if (item.pieces) {
      stack.push({ pieces: item.pieces, index: 0 });
    }
  }

  return output.join('');
}

/**
 * @param {ComplexSelector} selector
 * @return {string}
 */
export function serializeComplex(selector) {
  if (selector.serializationKey !== undefined) return selector.serializationKey;
  const lead = selector.leadingCombinator ?? '';
  const body = selector.parts
    .map((part) =>
      typeof part === 'string' ? part : serializePieces(part.pieces)
    )
    .join('');
  selector.serializationKey = `${lead}${body}`;
  return selector.serializationKey;
}

/**
 * @param {readonly (string | FunctionResult)[]} a
 * @param {readonly (string | FunctionResult)[]} b
 * @return {boolean}
 */
function equalPieces(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (typeof itemA === 'string' || typeof itemB === 'string') {
      if (itemA !== itemB) return false;
    } else if (itemA === itemB) {
      continue;
    } else if (itemA.raw && itemB.raw) {
      if (
        itemA.raw.source.slice(itemA.raw.start, itemA.raw.end) !==
        itemB.raw.source.slice(itemB.raw.start, itemB.raw.end)
      )
        return false;
    } else if (itemA.pieces && itemB.pieces) {
      if (!equalPieces(itemA.pieces, itemB.pieces)) return false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * @param {Compound} a
 * @param {Compound} b
 * @return {boolean}
 */
function equalCompound(a, b) {
  if (a === b) return true;
  if (
    a.specificity[0] !== b.specificity[0] ||
    a.specificity[1] !== b.specificity[1] ||
    a.specificity[2] !== b.specificity[2]
  )
    return false;
  if (a.hasFunction !== b.hasFunction) return false;
  return equalPieces(a.pieces, b.pieces);
}

/**
 * @param {ComplexSelector} a
 * @param {ComplexSelector} b
 * @return {boolean}
 */
export function equalComplex(a, b) {
  if (a === b) return true;
  if (a.leadingCombinator !== b.leadingCombinator) return false;
  if (a.parts.length !== b.parts.length) return false;
  for (let i = 0; i < a.parts.length; i++) {
    const partA = a.parts[i];
    const partB = b.parts[i];
    if (typeof partA === 'string' || typeof partB === 'string') {
      if (partA !== partB) return false;
    } else if (!equalCompound(partA, partB)) {
      return false;
    }
  }
  return true;
}

/** @type {WeakMap<Compound, string>} */
const compoundKeyCache = new WeakMap();

/**
 * @param {Compound | string} part
 * @return {string}
 */
function getPartKey(part) {
  if (typeof part === 'string') {
    return `c:${part}`;
  }
  let key = compoundKeyCache.get(part);
  if (key === undefined) {
    key = `p:${serializePieces(part.pieces)}@${part.specificity.join(',')}`;
    compoundKeyCache.set(part, key);
  }
  return key;
}

/**
 * @param {Compound | string} part
 * @return {string}
 */
function serializePart(part) {
  return typeof part === 'string' ? part : serializePieces(part.pieces);
}

/**
 * @param {readonly (Compound | string)[]} parts
 * @return {string}
 */
function serializeParts(parts) {
  return parts.map(serializePart).join('');
}

/**
 * @param {readonly (Compound | string)[]} parts
 * @return {Specificity}
 */
function calculatePartsSpecificity(parts) {
  /** @type {Specificity} */
  const specificity = [0, 0, 0];
  for (const part of parts) {
    if (typeof part !== 'string') {
      addSpecificity(specificity, part.specificity);
    }
  }
  return specificity;
}

/**
 * @param {readonly Compound[]} uniqueCompounds
 * @param {Specificity} middleSpecificity
 * @return {Compound}
 */
function buildFoldedCompound(uniqueCompounds, middleSpecificity) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  for (let i = 0; i < uniqueCompounds.length; i++) {
    if (i > 0) pieces.push(',');
    pieces.push(...uniqueCompounds[i].pieces);
  }

  return {
    pieces: [
      ':',
      {
        pieces: ['is', '(', ...pieces, ')'],
        specificity: [...middleSpecificity],
        foldEligible: false,
        outcome: 'valid',
        valid: true,
        hasNestedHas: false,
        hasPseudoElement: false,
      },
    ],
    specificity: [...middleSpecificity],
    hasNamespace: false,
    hasPseudoElement: false,
    hasFunction: true,
    hasNesting: false,
    hasAttributeModifier: false,
    hasCommentDescendant: false,
    hasVendorPseudo: false,
    foldEligible: false,
    valid: true,
  };
}

/**
 * @param {readonly (Compound | string)[]} prefixParts
 * @param {Compound} foldedCompound
 * @param {readonly (Compound | string)[]} suffixParts
 * @param {string} foldedText
 * @return {ComplexSelector}
 */
function buildFoldedSelector(
  prefixParts,
  foldedCompound,
  suffixParts,
  foldedText
) {
  const parts = [...prefixParts, foldedCompound, ...suffixParts];
  let hasVendorPseudo = false;
  let hasNestedHas = false;
  let hasPseudoElement = false;

  for (const part of parts) {
    if (typeof part !== 'string') {
      if (part.hasVendorPseudo) hasVendorPseudo = true;
      if (part.hasNestedHas) hasNestedHas = true;
      if (part.hasPseudoElement) hasPseudoElement = true;
    }
  }

  return {
    parts,
    leadingCombinator: undefined,
    valid: true,
    hasFunction: true,
    hasVendorPseudo,
    specificity: calculatePartsSpecificity(parts),
    hasNestedHas,
    hasPseudoElement,
    serializationKey: foldedText,
  };
}

/**
 * @param {ComplexSelector} a
 * @param {ComplexSelector} b
 * @return {number}
 */
function compareSerialized(a, b) {
  const left = serializeComplex(a);
  const right = serializeComplex(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * @typedef {{
 *   selectorIndex: number,
 *   compoundIndex: number,
 *   compound: Compound,
 *   selector: ComplexSelector
 * }} CandidateOccurrence
 */

/**
 * @typedef {{
 *   occurrences: CandidateOccurrence[],
 *   prefixParts: (Compound | string)[],
 *   suffixParts: (Compound | string)[],
 *   middleSpecificity: Specificity
 * }} CandidateGroup
 */

/**
 * @typedef {{
 *   group: CandidateGroup,
 *   indices: number[],
 *   uniqueCompounds: Compound[],
 *   foldedText: string,
 *   savings: number,
 *   firstIndex: number
 * }} ValidatedFold
 */

/**
 * @param {CandidateOccurrence[]} occurrences
 * @param {boolean} sort
 * @return {{ uniqueCompounds: Compound[], uniqueTexts: string[] } | undefined}
 */
function extractUniqueMiddles(occurrences, sort) {
  /** @type {Map<string, Compound>} */
  const uniqueMap = new Map();
  for (const occ of occurrences) {
    const text = serializePieces(occ.compound.pieces);
    if (!uniqueMap.has(text)) {
      uniqueMap.set(text, occ.compound);
    }
  }

  if (uniqueMap.size < 2) return undefined;

  if (sort) {
    const sortedEntries = [...uniqueMap.entries()].toSorted((a, b) =>
      a[0].localeCompare(b[0])
    );
    return {
      uniqueTexts: sortedEntries.map((e) => e[0]),
      uniqueCompounds: sortedEntries.map((e) => e[1]),
    };
  }

  return {
    uniqueTexts: [...uniqueMap.keys()],
    uniqueCompounds: [...uniqueMap.values()],
  };
}

/**
 * @param {ComplexSelector[]} selectors
 * @return {CandidateGroup[]}
 */
function collectFoldCandidateGroups(selectors) {
  /** @type {CandidateGroup[]} */
  const groups = [];
  /** @type {Map<string, CandidateGroup>} */
  const groupedCandidates = new Map();

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    if (
      selector.leadingCombinator !== undefined ||
      !selector.valid ||
      selector.hasVendorPseudo ||
      selector.parts.includes('||')
    ) {
      continue;
    }

    const { parts } = selector;
    if (parts.length < 3) continue;

    /** @type {string[]} */
    const prefixKeys = Array(parts.length + 1);
    prefixKeys[0] = '';
    for (let p = 0; p < parts.length; p++) {
      prefixKeys[p + 1] = prefixKeys[p] + '\x1f' + getPartKey(parts[p]);
    }

    /** @type {string[]} */
    const suffixKeys = Array(parts.length + 1);
    suffixKeys[parts.length] = '';
    for (let p = parts.length - 1; p >= 0; p--) {
      suffixKeys[p] = getPartKey(parts[p]) + '\x1f' + suffixKeys[p + 1];
    }

    for (let k = 0; k < parts.length; k += 2) {
      const middle = parts[k];
      if (typeof middle === 'string' || !middle.foldEligible) {
        continue;
      }

      const specKey = compoundSpecificityKey(middle);
      const groupKey = `${prefixKeys[k]}\x1e${suffixKeys[k + 1]}\x1e${specKey}`;
      let group = groupedCandidates.get(groupKey);
      if (!group) {
        group = {
          occurrences: [],
          prefixParts: parts.slice(0, k),
          suffixParts: parts.slice(k + 1),
          middleSpecificity: middle.specificity,
        };
        groupedCandidates.set(groupKey, group);
        groups.push(group);
      }
      group.occurrences.push({
        selectorIndex: i,
        compoundIndex: k,
        compound: middle,
        selector,
      });
    }
  }

  return groups;
}

/**
 * @param {CandidateGroup[]} groups
 * @param {boolean} sort
 * @return {ValidatedFold[]}
 */
function validateCandidateGroups(groups, sort) {
  /** @type {ValidatedFold[]} */
  const validatedFolds = [];

  for (const group of groups) {
    if (group.occurrences.length < 2) continue;

    const middles = extractUniqueMiddles(group.occurrences, sort);
    if (!middles) continue;

    const prefixText = serializeParts(group.prefixParts);
    const suffixText = serializeParts(group.suffixParts);
    const foldedText = `${prefixText}:is(${middles.uniqueTexts.join(',')})${suffixText}`;

    const originalLength = group.occurrences
      .map((occ) => serializeComplex(occ.selector))
      .join(',').length;

    const savings = originalLength - foldedText.length;
    if (savings <= 0) continue;

    const indices = group.occurrences.map((occ) => occ.selectorIndex);
    const firstIndex = Math.min(...indices);

    validatedFolds.push({
      group,
      indices,
      uniqueCompounds: middles.uniqueCompounds,
      foldedText,
      savings,
      firstIndex,
    });
  }

  return validatedFolds;
}

/**
 * @param {ValidatedFold} a
 * @param {ValidatedFold} b
 * @return {number}
 */
function compareValidatedFolds(a, b) {
  if (b.savings !== a.savings) {
    return b.savings - a.savings;
  }
  if (b.indices.length !== a.indices.length) {
    return b.indices.length - a.indices.length;
  }
  return a.firstIndex - b.firstIndex;
}

/**
 * @param {ValidatedFold[]} validatedFolds
 * @return {ValidatedFold[]}
 */
function resolveConflictingFolds(validatedFolds) {
  const sortedFolds = validatedFolds.toSorted(compareValidatedFolds);
  const usedIndices = new Set();
  /** @type {ValidatedFold[]} */
  const acceptedFolds = [];

  for (const foldCandidate of sortedFolds) {
    if (foldCandidate.indices.some((idx) => usedIndices.has(idx))) {
      continue;
    }
    for (const idx of foldCandidate.indices) {
      usedIndices.add(idx);
    }
    acceptedFolds.push(foldCandidate);
  }

  return acceptedFolds;
}

/**
 * @param {ComplexSelector[]} selectors
 * @param {ValidatedFold[]} acceptedFolds
 * @param {boolean} sort
 * @return {ComplexSelector[]}
 */
function applyFolds(selectors, acceptedFolds, sort) {
  /** @type {Map<number, ComplexSelector>} */
  const foldReplacements = new Map();
  /** @type {Set<number>} */
  const deletedIndices = new Set();

  for (const foldItem of acceptedFolds) {
    const foldedCompound = buildFoldedCompound(
      foldItem.uniqueCompounds,
      foldItem.group.middleSpecificity
    );
    const foldedSelector = buildFoldedSelector(
      foldItem.group.prefixParts,
      foldedCompound,
      foldItem.group.suffixParts,
      foldItem.foldedText
    );

    foldReplacements.set(foldItem.firstIndex, foldedSelector);
    for (const idx of foldItem.indices) {
      if (idx !== foldItem.firstIndex) {
        deletedIndices.add(idx);
      }
    }
  }

  /** @type {ComplexSelector[]} */
  const result = [];
  for (let i = 0; i < selectors.length; i++) {
    if (deletedIndices.has(i)) {
      continue;
    }
    const replacement = foldReplacements.get(i);
    result.push(replacement !== undefined ? replacement : selectors[i]);
  }

  if (sort) {
    return result.toSorted(compareSerialized);
  }

  return result;
}

/**
 * @param {ComplexSelector[]} selectors
 * @param {boolean} sort
 * @return {ComplexSelector[]}
 */
function foldPass(selectors, sort) {
  const groups = collectFoldCandidateGroups(selectors);
  const validatedFolds = validateCandidateGroups(groups, sort);
  if (validatedFolds.length === 0) {
    return selectors;
  }

  const acceptedFolds = resolveConflictingFolds(validatedFolds);
  if (acceptedFolds.length === 0) {
    return selectors;
  }

  return applyFolds(selectors, acceptedFolds, sort);
}

/**
 * @param {ComplexSelector[]} selectors
 * @param {boolean} [sort]
 * @return {ComplexSelector[]}
 */
export function fold(selectors, sort = true) {
  if (selectors.length < 2) return selectors;

  let current = selectors;
  for (let pass = 0; pass < 3; pass++) {
    const next = foldPass(current, sort);
    if (next === current || next.length === current.length) {
      break;
    }
    current = next;
  }
  return current;
}
