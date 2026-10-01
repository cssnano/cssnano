import stylehacks from 'stylehacks';
import canExplode from '../canExplode.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import { isFallback } from '../isFallback.js';
import {
  assignSlotValue,
  commitShorthand,
  flushableSlots,
  shouldResetSlots,
} from './slotVector.js';
import {
  cleanupLaneSegments,
  importanceLanes,
  isAll,
} from './importanceLanes.js';

import {
  allColumnProps,
  columns,
  columnSlots,
  isInvalid,
  isValidColumns,
  normalize,
  parseColumns,
  parsedValue,
} from './columnsValue.js';

/** @import {Container, Declaration} from 'postcss'; */

export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';

/**
 * @param {Container} rule
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {boolean} lane
 * @param {Map<Declaration, Declaration>} [inserted]
 */
function flush(rule, slots, contributing, fallbacks, lane, inserted) {
  const full = flushableSlots(slots);
  if (!full) return;

  commitShorthand(rule, full, contributing, fallbacks, {
    prop: columns,
    value: normalize([full[0].value, full[1].value]),
    important: lane,
    inserted,
  });
}

/**
 * @param {Container} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} lane
 */
function processLane(rule, laneDecls, lane) {
  /** @type {({ value: string, decl: Declaration } | null)[]} */
  let slots = [null, null];
  /** @type {Set<Declaration>} */
  const contributing = new Set();
  /** @type {Set<Declaration>} */
  const fallbacks = new Set();
  /** @type {Map<Declaration, Declaration>} */
  const inserted = new Map();

  const reset = () => {
    flush(rule, slots, contributing, fallbacks, lane, inserted);
    slots = [null, null];
    contributing.clear();
    fallbacks.clear();
  };

  for (const decl of laneDecls) {
    const p = decl.prop.toLowerCase();
    if (isAll(decl)) {
      reset();
      continue;
    }
    const isShort = p === columns;

    if (stylehacks.detect(decl) || (isShort && !canExplode(decl))) {
      reset();
      continue;
    }

    const idx = isShort ? -1 : (columnSlots.get(p) ?? -1);
    if (shouldResetSlots(slots, idx, decl)) reset();

    if (isShort) {
      const parsed = parseColumns(parsedValue(decl));
      if (!parsed) {
        reset();
        continue;
      }
      assignSlotValue(slots, 0, parsed[0], decl, fallbacks);
      assignSlotValue(slots, 1, parsed[1], decl, fallbacks);
    } else {
      assignSlotValue(slots, idx, decl.value, decl, fallbacks);
    }
    contributing.add(decl);
  }

  flush(rule, slots, contributing, fallbacks, lane, inserted);

  /** @type {Declaration[]} */
  const remaining = [];
  for (const d of laneDecls) {
    const repl = inserted.get(d);
    if (repl) {
      remaining.push(repl);
    } else if (d.parent === rule) {
      remaining.push(d);
    }
  }

  if (remaining.length > 1) {
    cleanupLaneSegments([remaining], (segment) =>
      cleanupDeclarations(
        segment,
        (node, lastNode) =>
          lastNode.prop.toLowerCase() === columns &&
          node.prop.toLowerCase() !== columns &&
          !isFallback(node, lastNode) &&
          isValidColumns(lastNode)
      )
    );
  }
}

/** @param {Declaration | undefined} s */
function normalizeSingleton(s) {
  if (
    !s ||
    s.prop.toLowerCase() !== columns ||
    stylehacks.detect(s) ||
    !canExplode(s)
  ) {
    return;
  }
  const parsed = parseColumns(parsedValue(s));
  if (!parsed) return;
  const norm = normalize(parsed);
  if (s.value !== norm || s.prop !== columns) {
    s.prop = columns;
    s.value = norm;
    delete s.raws?.value;
  }
}

/**
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {[Declaration[], Declaration[]]} [lanes]
 */
export function reduceColumns(rule, declarations, lanes) {
  const nodes = rule.nodes;
  if (!nodes) return;
  const getColDecls = () =>
    /** @type {Declaration[]} */ (
      nodes.filter(
        (n) => n.type === 'decl' && allColumnProps.has(n.prop.toLowerCase())
      )
    );
  const decls =
    declarations &&
    declarations.every(
      (d) => d.parent === rule && allColumnProps.has(d.prop.toLowerCase())
    )
      ? declarations
      : getColDecls();

  if (decls.length === 0 || decls.some(isInvalid)) return;

  const familyLanes = lanes ?? importanceLanes(rule, decls);
  cleanupLaneSegments(familyLanes, (segment) => cleanupDeclarations(segment));

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    normalizeSingleton(live[0]);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = familyLanes[lane ? 1 : 0].filter(
      (d) => d.parent === rule
    );
    if (laneDecls.some((d) => !isAll(d))) {
      processLane(rule, laneDecls, lane);
    }
  }
}
