import cssnanoUtils from '#utils';
import {
  discardOverriddenInLanes,
  discardOverriddenInList,
} from './overriddenDeclarations.js';
import { detectDeclaration } from '#stylehacks';
import canExplode from '../canExplode.js';
import { isFallback } from '../isFallback.js';
import { SlotLane, commitShorthand, flushableSlots } from './slotVector.js';
import { hasNonAll, isAll } from './importanceLanes.js';

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

const { asciiLowerCase } = cssnanoUtils;

/** @import {Container, Declaration} from 'postcss'; */

export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';

/**
 * @param {Container} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} important
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function processLane(rule, laneDecls, important, textTable) {
  /** @type {Map<Declaration, Declaration>} */
  const inserted = new Map();
  const lane = new SlotLane(2, (slots, contributing, fallbacks) => {
    const full = flushableSlots(slots, textTable);
    if (!full) return;

    commitShorthand(rule, full, contributing, fallbacks, {
      prop: columns,
      value: normalize([full[0].value, full[1].value]),
      important,
      inserted,
    });
  });

  for (const decl of laneDecls) {
    const p = asciiLowerCase(decl.prop);
    const isShort = p === columns;

    if (
      isAll(decl) ||
      detectDeclaration(decl) ||
      (isShort && !canExplode(decl, textTable))
    ) {
      lane.reset();
      continue;
    }

    const idx = isShort ? -1 : (columnSlots.get(p) ?? -1);
    const wasFull = lane.begin(Math.max(idx, 0), idx === -1 ? 2 : 1, decl);

    if (isShort) {
      const parsed = parseColumns(parsedValue(decl));
      if (!parsed) {
        lane.reset();
        continue;
      }
      lane.assign(0, parsed[0], decl, wasFull);
      lane.assign(1, parsed[1], decl, wasFull);
    } else {
      lane.assign(idx, decl.value, decl, wasFull);
    }
  }

  lane.reset();

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
    discardOverriddenInList(remaining, allColumnProps, columnsPrecedence);
  }
}

/**
 * A later valid `columns` shorthand resets both longhands.
 *
 * @type {import('./overriddenDeclarations.js').CrossPropertyRule}
 */
const columnsPrecedence = {
  overrides: (node, lastNode) =>
    asciiLowerCase(lastNode.prop) === columns &&
    asciiLowerCase(node.prop) !== columns &&
    isValidColumns(lastNode) &&
    !isFallback(node, lastNode),
};

/**
 * @param {Declaration | undefined} s
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function normalizeSingleton(s, textTable) {
  if (
    !s ||
    asciiLowerCase(s.prop) !== columns ||
    detectDeclaration(s) ||
    !canExplode(s, textTable)
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
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} familyLanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
export function reduceColumns(rule, decls, familyLanes, textTable) {
  if (!rule.nodes) return;
  if (decls.length === 0 || decls.some(isInvalid)) return;

  discardOverriddenInLanes(familyLanes, allColumnProps);

  const live = decls.filter((d) => d.parent);
  if (live.length <= 1) {
    normalizeSingleton(live[0], textTable);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = familyLanes[lane ? 1 : 0].filter(
      (d) => d.parent === rule
    );
    if (hasNonAll(laneDecls)) {
      processLane(rule, laneDecls, lane, textTable);
    }
  }
}
