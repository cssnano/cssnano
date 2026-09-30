/** @import {Longhands} from './webrefLonghands.js'; */

/**
 * Guards against publishing data a webref release has changed out from under
 * the plugin, and holds the policy of what a browser keeps. The transforms
 * assume a border is a side crossed with a component, that margin and padding
 * take the same four sides in the same order, and that every property they take
 * apart has an initial value to fill in for a component left out.
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

export { BORDER, BOX_SHORTHANDS, COLUMNS, implemented };
