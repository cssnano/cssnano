/**
 * Derives, from the raw `@webref/css` data, the shorthand structure and the
 * keyword sets postcss-merge-longhand takes apart and puts back together.
 * Kept free of I/O so that it can be unit tested.
 *
 * The families are derived from `border`, `margin`, `padding` and `columns`
 * rather than listed: everything else follows from the longhands webref says
 * those set, and `validate` checks that what comes out still has the shape the
 * plugin's transforms assume.
 *
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax] Value grammar, absent when a spec only defines
 * the term in prose.
 *
 * @typedef {WebrefDefinition & {
 *   initial?: string,
 *   longhands?: string[],
 *   resetLonghands?: string[],
 *   logicalPropertyGroup?: string
 * }} WebrefProperty
 *
 * @typedef {object} WebrefData
 * @property {WebrefProperty[]} properties
 * @property {WebrefDefinition[]} types
 * @property {WebrefDefinition[]} functions
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

const BORDER = 'border';
const COLUMNS = 'columns';
const BOX_SHORTHANDS = ['margin', 'padding'];

/**
 * What the specifications spell out and no engine implements, plus what a walk
 * of the grammar takes for something it is not.
 *
 * These sets say what a browser keeps, so a name here would let a declaration
 * every browser drops read as a value that applies: `border-width: hairline`
 * would specify a width, and merging the sides around it writes a shorthand
 * no side ever had. Rather than a keyword, the whole declaration is what the
 * browser is left without, which is why the plugin cannot treat these the way
 * it treats a colour notation an old browser misses — there a required-support
 * check holds the merge back, and there is nothing to hold back here.
 */
const unimplemented = new Set([
  /* css-backgrounds spells `hairline` out in `<line-width>`. */
  'hairline',
  /* css-cascade-6 adds `revert-rule` to `all`. */
  'revert-rule',
  /* css-color-hdr lists `alpha()` among the colour functions, though what it
   * specifies is the alpha of a colour rather than a colour. */
  'alpha',
]);

/**
 * @param {string[]} names
 * @return {string[]}
 */
const implemented = (names) => names.filter((name) => !unimplemented.has(name));

/**
 * Matches a reference to another production: `<length>`, `<rgb()>` for a
 * function, `<'border-width'>` for a property's own grammar. Ranges are written
 * inside the brackets, as in `<length [0,∞]>`.
 */
const REFERENCE = /<'([^'>]+)'>|<([^'>\s]+)(?:\s+\[[^\]]*\])?>/g;

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 */
const expectExactly = (actual, expected, what) => {
  if (actual.join(' ') !== expected.join(' ')) {
    throw new Error(
      `Expected ${what} to be ${expected.join(' ')}, got ${actual.join(' ')}`
    );
  }
};

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 */
const expectAll = (actual, expected, what) => {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what} to include ${name}`);
    }
  }
};

/**
 * @param {string[]} actual
 * @param {string[]} rejected
 * @param {string} what
 */
const expectNone = (actual, rejected, what) => {
  for (const name of rejected) {
    if (actual.includes(name)) {
      throw new Error(`Expected ${what} to exclude ${name}`);
    }
  }
};

/**
 * The keywords a grammar offers as literal alternatives, such as the line
 * styles of `<line-style>`. A name spelled out with an argument list is a
 * function rather than a keyword.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function keywordTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const keywords = [];

  for (const match of literals.matchAll(/[a-zA-Z][a-zA-Z0-9-]*/g)) {
    const [keyword] = match;
    const rest = literals.slice(
      /** @type {number} */ (match.index) + keyword.length
    );

    if (!/^\s*\(/.test(rest)) {
      keywords.push(keyword.toLowerCase());
    }
  }

  return keywords;
}

/**
 * A grammar may spell a function out as a call instead of naming it through a
 * `<name()>` reference: the syntax of `<light-dark-color>` is
 * `light-dark(<color>, <color>)`, so following references alone never reaches
 * `light-dark()`. This reads the functions spelled out that way.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function functionTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const names = [];

  for (const [, name] of literals.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)\s*\(/g)) {
    names.push(name.toLowerCase());
  }

  return names;
}

/**
 * Follows a grammar through the productions it names, collecting the functions
 * it can reach. `<color>` reaches `rgb()` through `<color-base>` and
 * `<color-function>`, so a value is a colour if it calls any of them.
 *
 * The walk stops at each function it reaches, because what a function takes is
 * not what it produces: `<color>` names `<contrast-color()>`, whose arguments
 * name `<wcag2>`, and a contrast ratio is no colour. Only the alternatives a
 * production offers stand in its own place.
 *
 * @param {WebrefData} data
 * @param {string} root Name of the type to start from, without its brackets.
 * @return {string[]}
 */
export function reachableFunctions(data, root) {
  /** @type {Map<string, WebrefDefinition>} */
  const definitions = new Map();
  for (const definition of [...data.types, ...data.functions]) {
    definitions.set(definition.name, definition);
  }

  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Set<string>} */
  const functions = new Set();
  /** @type {string[]} */
  const queue = [root];

  while (queue.length) {
    const name = /** @type {string} */ (queue.pop());

    if (seen.has(name)) {
      continue;
    }

    seen.add(name);

    const syntax = definitions.get(name)?.syntax;

    if (name.endsWith('()')) {
      functions.add(name.slice(0, -2).toLowerCase());

      /* A function's own grammar is the call, and the name it spells is not
       * always the name the definition carries: css-color-hdr defines
       * `hdr-color()` as `color-hdr(…)`, and the stylesheet writes the
       * latter. Nothing deeper counts, since arguments are not results. */
      const [, call] = /^\s*([\w-]+)\(/.exec(syntax ?? '') ?? [];

      if (call) {
        functions.add(call.toLowerCase());
      }

      continue;
    }

    if (!syntax) {
      continue;
    }

    for (const called of functionTerminals(syntax)) {
      functions.add(called);
    }

    for (const [, property, type] of syntax.matchAll(REFERENCE)) {
      // A property's own grammar leads back into properties rather than types.
      if (property === undefined) {
        queue.push(type);
      }
    }
  }

  return [...functions].toSorted();
}

/**
 * Flow-relative properties are named after the block and inline axes rather
 * than after the sides of the box, e.g. `border-inline-start-width`. webref
 * does not flag them, but the naming is consistent throughout.
 *
 * @param {string} name
 * @return {boolean}
 */
export function isFlowRelative(name) {
  const segments = new Set(name.split('-'));
  return (
    segments.has('block') ||
    segments.has('inline') ||
    segments.has('start') ||
    segments.has('end')
  );
}

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
    initialValues: new Map(
      [...initialValues].toSorted(([a], [b]) => (a < b ? -1 : 1))
    ),
    borderProperties: borderProperties.toSorted(),
    flowRelativeBorderProperties: flowRelativeBorderProperties.toSorted(),
    cssWideKeywords: implemented(keywordTerminals(byName.get('all')?.syntax)),
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
 * Guards against publishing data a webref release has changed out from under
 * the plugin: the transforms assume a border is a side crossed with a
 * component, that margin and padding take the same four sides in the same
 * order, and that every property they take apart has an initial value to fill
 * in for a component left out.
 *
 * @param {Longhands} data
 * @return {void}
 */
export function validate(data) {
  const {
    sides,
    borderComponents,
    shorthands,
    initialValues,
    borderProperties,
    flowRelativeBorderProperties,
  } = data;

  expectExactly(sides, ['top', 'right', 'bottom', 'left'], 'the sides');
  expectExactly(
    borderComponents,
    ['width', 'style', 'color'],
    'the border components'
  );

  /* Every side crossed with every component, spelled both ways round. */
  for (const side of sides) {
    expectExactly(
      /** @type {Shorthand} */ (shorthands.get(`border-${side}`)).longhands,
      borderComponents.map((component) => `border-${side}-${component}`),
      `the longhands of border-${side}`
    );
  }

  for (const component of borderComponents) {
    expectExactly(
      /** @type {Shorthand} */ (shorthands.get(`border-${component}`))
        .longhands,
      sides.map((side) => `border-${side}-${component}`),
      `the longhands of border-${component}`
    );
  }

  for (const name of BOX_SHORTHANDS) {
    expectExactly(
      /** @type {Shorthand} */ (shorthands.get(name)).longhands,
      sides.map((side) => `${name}-${side}`),
      `the longhands of ${name}`
    );
  }

  /* The plugin builds `columns` out of a width and a count, and refuses the
   * family when a stylesheet sets anything else the shorthand also sets. */
  const columns = /** @type {Shorthand} */ (shorthands.get(COLUMNS)).longhands;

  for (const name of ['column-width', 'column-count']) {
    if (!columns.includes(name)) {
      throw new Error(`Expected ${COLUMNS} to set ${name}`);
    }
  }

  const borderResets = /** @type {Shorthand} */ (shorthands.get(BORDER)).resets;

  if (!borderResets.includes('border-image')) {
    throw new Error('Expected border to reset border-image');
  }

  for (const [name, { longhands }] of shorthands) {
    for (const longhand of longhands) {
      if (!initialValues.has(longhand)) {
        throw new Error(`No initial value for ${longhand}, set by ${name}`);
      }
    }
  }

  for (const [name, initial] of initialValues) {
    if (initial.includes(' ')) {
      throw new Error(`Initial value of ${name} is not a single value`);
    }
  }

  for (const [name, expected] of [
    ['border-top-width', 'medium'],
    ['border-top-style', 'none'],
    ['border-top-color', 'currentcolor'],
    ['margin-top', '0'],
    ['padding-top', '0'],
    ['column-width', 'auto'],
    ['column-count', 'auto'],
  ]) {
    if (initialValues.get(name) !== expected) {
      throw new Error(
        `Expected the initial value of ${name} to be ${expected}, got ${initialValues.get(name)}`
      );
    }
  }

  const border = new Set(borderProperties);

  for (const name of [...shorthands.keys()].filter((shortHandName) =>
    shortHandName.startsWith(BORDER)
  )) {
    if (!border.has(name)) {
      throw new Error(`${name} is missing from the border family`);
    }
  }

  for (const name of ['border-inline-start-width', 'border-start-start-radius'])
    if (!flowRelativeBorderProperties.includes(name)) {
      throw new Error(`Expected ${name} to be flow-relative`);
    }

  for (const name of ['border-left-width', 'border-top-left-radius']) {
    if (flowRelativeBorderProperties.includes(name)) {
      throw new Error(`Expected ${name} to be physical`);
    }
  }

  validateKeywords(data);
}

/**
 * The keyword sets a border value is taken apart against. A spec that stopped
 * spelling one of these out in its grammar would leave the plugin unable to
 * tell a width from a style from a colour.
 *
 * @param {Longhands} data
 * @return {void}
 */
function validateKeywords(data) {
  expectAll(
    data.cssWideKeywords,
    ['inherit', 'initial', 'unset', 'revert', 'revert-layer'],
    'the CSS-wide keywords'
  );
  expectAll(data.lineStyles, ['none', 'solid', 'dashed'], 'the line styles');
  expectAll(
    data.lineWidthKeywords,
    ['thin', 'medium', 'thick'],
    'the line width keywords'
  );
  expectAll(
    data.namedColors,
    ['red', 'rebeccapurple', 'transparent'],
    'the named colours'
  );
  expectAll(
    data.colorFunctions,
    [
      'rgb',
      'rgba',
      'hsl',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
      /* Spelled out as a literal call rather than named as a type. */
      'color-mix',
      'light-dark',
      /* Named one thing and called another. */
      'color-hdr',
    ],
    'the colour functions'
  );
  /* `wcag2()` specifies a contrast ratio, and stands in `<color>` only as an
   * argument of `contrast-color()`, so a walk that reaches it has followed a
   * function into what it takes rather than what it gives. */
  expectNone(data.colorFunctions, ['wcag2'], 'the colour functions');

  /* Whatever no engine implements has to stay out of every set, since these
   * decide whether the browser keeps a declaration. */
  expectNone(data.lineWidthKeywords, ['hairline'], 'the line width keywords');
  expectNone(data.cssWideKeywords, ['revert-rule'], 'the CSS-wide keywords');
  expectNone(data.colorFunctions, ['alpha'], 'the colour functions');

  if (data.namedColors.length < 140) {
    throw new Error(
      `Expected at least 140 named colours, got ${data.namedColors.length}`
    );
  }
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
