import { tokenizeValue } from './lib/tokenize.js';
import { normalizeGridAutoFlow, normalizeGridColumnRow } from './rules/grid.js';
import animation from './rules/animation.js';
import border from './rules/border.js';
import boxShadow from './rules/boxShadow.js';
import flexFlow from './rules/flexFlow.js';
import transition from './rules/transition.js';
import listStyle from './rules/listStyle.js';
import column from './rules/columns.js';
import cssnanoUtils from '#utils';

/** @import {Reducer, Stage, StageEntry} from '../../pipeline/host.js' */

const { vendorUnprefixed } = cssnanoUtils;

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const borderProcessor = (parsed) => border(parsed.terms);
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | null][]} */
const borderRules = [
  ['border', borderProcessor],
  ['border-block', borderProcessor],
  ['border-inline', borderProcessor],
  ['border-block-end', borderProcessor],
  ['border-block-start', borderProcessor],
  ['border-inline-end', borderProcessor],
  ['border-inline-start', borderProcessor],
  ['border-top', borderProcessor],
  ['border-right', borderProcessor],
  ['border-bottom', borderProcessor],
  ['border-left', borderProcessor],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const gridAutoFlowProcessor = (parsed) => normalizeGridAutoFlow(parsed.terms);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const gridLineProcessor = (parsed) => normalizeGridColumnRow(parsed.terms, 2);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const gridLonghandProcessor = (parsed) =>
  normalizeGridColumnRow(parsed.terms, 1);
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | null][]} */
const grid = [
  ['grid-auto-flow', gridAutoFlowProcessor],
  ['grid-column', gridLineProcessor],
  ['grid-row', gridLineProcessor],
  ['grid-row-start', gridLonghandProcessor],
  ['grid-row-end', gridLonghandProcessor],
  ['grid-column-start', gridLonghandProcessor],
  ['grid-column-end', gridLonghandProcessor],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const columnRuleProcessor = borderProcessor;
/** @type {[string, (parsed: ReturnType<typeof tokenizeValue>) => string | null][]} */
const columnRules = [
  ['column-rule', columnRuleProcessor],
  ['columns', (parsed) => column(parsed.terms)],
];

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const flexFlowProcessor = (parsed) => flexFlow(parsed.terms);
/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const listStyleProcessor = (parsed) => listStyle(parsed.terms);

/** @type {(parsed: ReturnType<typeof tokenizeValue>) => string | null} */
const outlineProcessor = (parsed) => border(parsed.terms, true);

/** Rules for values that are comma-separated lists, which may have several arguments. */
const listRules = new Set(['animation', 'box-shadow', 'transition']);

/** @type {Map<string, (parsed: ReturnType<typeof tokenizeValue>) => string | null>} */
const rules = new Map([
  ['animation', animation],
  ['outline', outlineProcessor],
  ['box-shadow', boxShadow],
  ['flex-flow', flexFlowProcessor],
  ['list-style', listStyleProcessor],
  ['transition', transition],
  ...borderRules,
  ...grid,
  ...columnRules,
]);

/**
 * The reducer of one rule. A value with fewer than two terms, a comment, a bad
 * token, or several arguments outside a list rule stays as it is.
 *
 * @param {(parsed: ReturnType<typeof tokenizeValue>) => string | null} processor
 * @param {boolean} listRule
 * @return {Reducer}
 */
function ruleReducer(processor, listRule) {
  return (buffer) => {
    const text = buffer.text();
    if (text.length < 2 || !/[, \t\n\r\f\/]/v.test(text)) return;
    const parsed = tokenizeValue(buffer.tokens());
    if (
      parsed.terms.length < 2 ||
      parsed.abort ||
      (!listRule && parsed.arguments.length > 1)
    ) {
      return;
    }
    const processed = processor(parsed);
    if (processed !== null) buffer.replaceText(processed);
  };
}

/** @type {Map<string, Reducer>} */
const reducers = new Map(
  [...rules].map(([name, processor]) => [
    name,
    ruleReducer(processor, listRules.has(name)),
  ])
);

/**
 * The reducer of a property. The rule is found by the name as written, then
 * in lower case, then without a vendor prefix.
 *
 * @param {string} property
 * @return {Reducer | null}
 */
function reducerOf(property) {
  const lower = property.toLowerCase();
  const vendor =
    property.charCodeAt(0) === 45 /* '-' */ &&
    property.charCodeAt(1) !== 45; /* '-' */
  return (
    reducers.get(property) ??
    reducers.get(lower) ??
    (vendor ? reducers.get(vendorUnprefixed(lower)) : undefined) ??
    null
  );
}

/** @type {Stage} */
const orderedValuesStage = { forProperty: reducerOf };

/** @satisfies {StageEntry} */
const orderedValues = { create: () => orderedValuesStage };

export { orderedValues as default };
