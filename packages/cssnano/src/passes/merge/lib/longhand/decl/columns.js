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

/** @import {Container, Declaration} from 'postcss'; */

export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';

/**
 * @param {Container} rule
 * @param {Declaration[]} laneDecls
 * @param {boolean} important
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 */
function processLane(rule, laneDecls, important, textTable, features) {
  /** @type {Map<Declaration, Declaration>} */
  const inserted = new Map();
  const lane = new SlotLane(
    2,
    (slots, contributing, fallbacks) => {
      const full = flushableSlots(slots, textTable, features);
      if (!full) return;

      commitShorthand(
        rule,
        full,
        contributing,
        fallbacks,
        {
          prop: columns,
          value: normalize([full[0].value, full[1].value]),
          important,
          inserted,
        },
        textTable
      );
    },
    textTable,
    features
  );

  for (const decl of laneDecls) {
    const p = asciiLowerCase(decl.prop);
    const isShort = p === columns;

    if (
      isAll(decl) ||
      hasHack(decl.raws.before, decl.prop, decl.value) ||
      (isShort && !canExplode(decl, textTable))
    ) {
      lane.reset();
      continue;
    }

    const idx = isShort ? -1 : (columnSlots.get(p) ?? -1);
    const wasFull = lane.begin(Math.max(idx, 0), idx === -1 ? 2 : 1, decl);

    if (isShort) {
      const parsed = parseColumns(parsedValue(decl, textTable));
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
    discardOverriddenInList(
      remaining,
      textTable,
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
  overrides: (node, lastNode, textTable, features) =>
    asciiLowerCase(lastNode.prop) === columns &&
    asciiLowerCase(node.prop) !== columns &&
    isValidColumns(lastNode, textTable) &&
    !isFallback(node, lastNode, textTable, features),
};

/**
 * @param {Declaration | undefined} s
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 */
function normalizeSingleton(s, textTable) {
  if (
    !s ||
    asciiLowerCase(s.prop) !== columns ||
    hasHack(s.raws.before, s.prop, s.value) ||
    !canExplode(s, textTable)
  ) {
    return;
  }
  const parsed = parseColumns(parsedValue(s, textTable));
  if (!parsed) return;
  const norm = normalize(parsed);
  if (s.value !== norm || s.prop !== columns) {
    s.prop = columns;
    delete s.raws.value;
    textTable.setText(s, norm);
  }
}

/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} familyLanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 */
export function reduceColumns(rule, decls, familyLanes, textTable, features) {
  if (!rule.nodes) return;
  if (decls.length === 0 || decls.some((d) => isInvalid(d, textTable))) return;

  discardOverriddenInLanes(familyLanes, textTable, features, allColumnProps);

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
      processLane(rule, laneDecls, lane, textTable, features);
    }
  }
}
