import {
  cssWideKeywords,
  isFlowRelative,
  sortedByName,
} from '../../../../util/webref/webref.js';
import { keywordTerminals, reachableFunctions } from './webrefGrammar.js';
import {
  BORDER,
  BOX_SHORTHANDS,
  COLUMNS,
  implemented,
  validate,
} from './webrefValidate.js';

/**
 * Derives, from the raw `@webref/css` data, the shorthand structure and the
 * keyword sets postcss-merge-longhand takes apart and puts back together.
 * Kept free of I/O so that it can be unit tested.
 *
 * The families are derived from `border`, `margin`, `padding` and `columns`
 * rather than listed: everything else follows from the longhands webref says
 * those set. Grammar walking lives in webrefGrammar.js and the browser-keep
 * policy in webrefValidate.js.
 *
 * @typedef {import('../../../../util/webref/webref.js').WebrefDefinition} WebrefDefinition
 * @typedef {import('../../../../util/webref/webref.js').WebrefProperty} WebrefProperty
 * @typedef {Pick<import('../../../../util/webref/webref.js').WebrefData, 'properties' | 'types' | 'functions'>} WebrefData
 *
 * @typedef {object} Shorthand
 * @property {string[]} longhands The properties the shorthand sets, in the
 * order its grammar lists them.
 * @property {string[]} resets The properties it resets without being able to
 * set, expanded through their own longhands.
 *
 * @typedef {object} Longhands
 * @property {string[]} sides The sides of the box, in the order a shorthand
 * lists them.
 * @property {string[]} borderComponents The parts of a border, in the order
 * `border` lists them.
 * @property {Map<string, Shorthand>} shorthands
 * @property {Map<string, string>} initialValues Initial value of every property
 * a shorthand here sets.
 * @property {string[]} borderProperties Every property in the border family.
 * @property {string[]} flowRelativeBorderProperties The ones named after the
 * block and inline axes rather than after the sides of the box.
 * @property {string[]} cssWideKeywords
 * @property {string[]} lineStyles
 * @property {string[]} lineWidthKeywords
 * @property {string[]} namedColors
 * @property {string[]} colorFunctions Names of the functions that produce a
 * colour, without their parentheses.
 */

/**
 * @param {WebrefData} data
 * @return {Longhands}
 */
export function buildLonghands(data) {
  const byName = new Map(
    data.properties.map((property) => [property.name, property])
  );

  /**
   * @param {string} name
   * @return {string[]}
   */
  const longhandsOf = (name) => byName.get(name)?.longhands ?? [];

  /**
   * The properties a shorthand ultimately sets. A longhand sets only itself.
   *
   * @param {string[]} names
   * @return {string[]}
   */
  function leavesOf(names) {
    /** @type {string[]} */
    const leaves = [];

    for (const name of names) {
      const longhands = longhandsOf(name);

      if (longhands.length === 0) {
        leaves.push(name);
      } else {
        leaves.push(...leavesOf(longhands));
      }
    }

    return [...new Set(leaves)];
  }

  /* `border` is grouped two ways: by the part of the border a property sets,
   * which is the order its own grammar lists, and by the side of the box, which
   * is the order each of those groups lists. */
  const borderComponentShorthands = longhandsOf(BORDER);
  const borderComponents = borderComponentShorthands.map((name) =>
    name.slice(`${BORDER}-`.length)
  );
  const sides = longhandsOf(borderComponentShorthands[0]).map((name) =>
    name.slice(`${BORDER}-`.length, -`-${borderComponents[0]}`.length)
  );

  /** @type {Map<string, Shorthand>} */
  const shorthands = new Map();

  /**
   * @param {string} name
   * @return {void}
   */
  function addShorthand(name) {
    const property = byName.get(name);

    if (!property) {
      throw new Error(`webref does not define ${name}`);
    }

    shorthands.set(name, {
      longhands: property.longhands ?? [],
      resets: leavesOf(property.resetLonghands ?? []).concat(
        property.resetLonghands ?? []
      ),
    });
  }

  addShorthand(BORDER);

  for (const component of borderComponents) {
    addShorthand(`${BORDER}-${component}`);
  }

  for (const side of sides) {
    addShorthand(`${BORDER}-${side}`);
  }

  for (const name of [...BOX_SHORTHANDS, COLUMNS]) {
    addShorthand(name);
  }

  /** @type {Map<string, string>} */
  const initialValues = new Map();

  /**
   * The initial value webref specifies, or the one every longhand shares when
   * the property only refers to them.
   *
   * @param {string} name
   * @return {string | undefined}
   */
  function initialValueOf(name) {
    const initial = byName.get(name)?.initial?.toLowerCase();

    if (initial !== undefined && !initial.includes(' ')) {
      return initial;
    }

    const shared = new Set(
      longhandsOf(name).map((longhand) => initialValueOf(longhand))
    );

    return shared.size === 1 ? [...shared][0] : undefined;
  }

  for (const { longhands } of shorthands.values()) {
    for (const longhand of longhands) {
      const initial = initialValueOf(longhand);

      if (initial !== undefined) {
        initialValues.set(longhand, initial);
      }
    }
  }

  /** @type {string[]} */
  const borderProperties = [];
  /** @type {string[]} */
  const flowRelativeBorderProperties = [];

  for (const { name } of data.properties) {
    if (name !== BORDER && !name.startsWith(`${BORDER}-`)) {
      continue;
    }

    borderProperties.push(name);

    if (isFlowRelative(name)) {
      flowRelativeBorderProperties.push(name);
    }
  }

  return {
    sides,
    borderComponents,
    shorthands,
    initialValues: new Map(sortedByName(initialValues)),
    borderProperties: borderProperties.toSorted(),
    flowRelativeBorderProperties: flowRelativeBorderProperties.toSorted(),
    cssWideKeywords: implemented(cssWideKeywords(data)),
    lineStyles: implemented(
      keywordTerminals(
        data.types.find((type) => type.name === 'line-style')?.syntax
      )
    ),
    lineWidthKeywords: implemented(
      keywordTerminals(
        data.types.find((type) => type.name === 'line-width')?.syntax
      )
    ),
    namedColors: implemented(
      keywordTerminals(
        data.types.find((type) => type.name === 'named-color')?.syntax
      )
    ),
    colorFunctions: implemented(reachableFunctions(data, 'color')),
  };
}

/**
 * Maps only exist in memory; the generated file is JSON.
 *
 * @param {Longhands} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(
    {
      sides: data.sides,
      borderComponents: data.borderComponents,
      shorthands: Object.fromEntries(data.shorthands),
      initialValues: Object.fromEntries(data.initialValues),
      borderProperties: data.borderProperties,
      flowRelativeBorderProperties: data.flowRelativeBorderProperties,
      cssWideKeywords: data.cssWideKeywords,
      lineStyles: data.lineStyles,
      lineWidthKeywords: data.lineWidthKeywords,
      namedColors: data.namedColors,
      colorFunctions: data.colorFunctions,
    },
    null,
    2
  )}\n`;
}

export { keywordTerminals, reachableFunctions, validate };
