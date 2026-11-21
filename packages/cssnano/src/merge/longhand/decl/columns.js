import cssnanoUtils from '#utils';
import {
  discardOverriddenInLanes,
  discardOverriddenInList,
} from './overriddenDeclarations.js';
import { hasHack } from '#stylehacks';
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

/** @import {BlockDeclarations} from '../blockDeclarations.js'; */

export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls
 * @param {boolean} important
 * @param {ReadonlySet<string>} features the features every target supports
 */
function processLane(list, laneDecls, important, features) {
  /** @type {Map<number, number>} */
  const inserted = new Map();
  const lane = new SlotLane(
    2,
    (slots, contributing, fallbacks) => {
      const full = flushableSlots(slots, list, features);
      if (!full) return;

      commitShorthand(list, full, contributing, fallbacks, {
        prop: columns,
        value: normalize([full[0].value, full[1].value]),
        important,
        inserted,
      });
    },
    list,
    features
  );

  for (const decl of laneDecls) {
    const item = list.at(decl);
    const p = asciiLowerCase(item.prop);
    const isShort = p === columns;

    if (
      isAll(item) ||
      hasHack(item.before, item.prop, item.value) ||
      (isShort && !canExplode(item))
    ) {
      lane.reset();
      continue;
    }

    const idx = isShort ? -1 : (columnSlots.get(p) ?? -1);
    const wasFull = lane.begin(Math.max(idx, 0), idx === -1 ? 2 : 1, decl);

    if (isShort) {
      const parsed = parseColumns(parsedValue(item));
      if (!parsed) {
        lane.reset();
        continue;
      }
      lane.assign(0, parsed[0], decl, wasFull);
      lane.assign(1, parsed[1], decl, wasFull);
    } else {
      lane.assign(idx, item.value, decl, wasFull);
    }
  }

  lane.reset();

  /** @type {number[]} */
  const remaining = [];
  for (const d of laneDecls) {
    const repl = inserted.get(d);
    if (repl !== undefined) {
      remaining.push(repl);
    } else if (!list.at(d).removed) {
      remaining.push(d);
    }
  }

  if (remaining.length > 1) {
    discardOverriddenInList(
      list,
      remaining,
      features,
      allColumnProps,
      columnsPrecedence
    );
  }
}

/**
 * A later valid `columns` shorthand resets both longhands.
 *
 * @type {import('./overriddenDeclarations.js').CrossPropertyRule}
 */
const columnsPrecedence = {
  overrides: (node, lastNode, features) =>
    asciiLowerCase(lastNode.prop) === columns &&
    asciiLowerCase(node.prop) !== columns &&
    isValidColumns(lastNode) &&
    !isFallback(node, lastNode, features),
};

/**
 * @param {BlockDeclarations} list
 * @param {number | undefined} position
 */
function normalizeSingleton(list, position) {
  if (position === undefined) return;
  const s = list.at(position);
  if (
    asciiLowerCase(s.prop) !== columns ||
    hasHack(s.before, s.prop, s.value) ||
    !canExplode(s)
  ) {
    return;
  }
  const parsed = parseColumns(parsedValue(s));
  if (!parsed) return;
  const norm = normalize(parsed);
  if (s.value !== norm || s.prop !== columns) {
    list.rewrite(position, columns, norm);
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} decls - the column declarations of the run
 * @param {[number[], number[]]} familyLanes
 * @param {ReadonlySet<string>} features the features every target supports
 */
export function reduceColumns(list, decls, familyLanes, features) {
  if (decls.length === 0 || decls.some((d) => isInvalid(list.at(d)))) return;

  discardOverriddenInLanes(list, familyLanes, features, allColumnProps);

  const live = decls.filter((d) => !list.at(d).removed);
  if (live.length <= 1) {
    normalizeSingleton(list, live[0]);
    return;
  }

  for (const lane of [false, true]) {
    const laneDecls = familyLanes[lane ? 1 : 0].filter(
      (d) => !list.at(d).removed
    );
    if (hasNonAll(list, laneDecls)) {
      processLane(list, laneDecls, lane, features);
    }
  }
}
