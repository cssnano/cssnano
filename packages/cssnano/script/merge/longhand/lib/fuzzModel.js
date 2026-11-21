/**
 * An independent model of box, border, and radius property alphabets and
 * slots for the differential fuzzer.
 *
 * Deliberately shares nothing with the plugin's internal data or parsers so
 * that disagreements reveal genuine miscompiles.
 */

const sides = ['top', 'right', 'bottom', 'left'];
const components = ['width', 'style', 'color'];

/* Hand-written rather than read from the plugin's data, on purpose. */
const initialValues = new Map([
  ['width', 'medium'],
  ['style', 'none'],
  ['color', 'currentcolor'],
]);

const boxInitial = '0';
const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const radiusLengths = new Set(['0', '1px', '2em', '10%']);

/**
 * The three component alphabets. They are disjoint, which is what lets the
 * evaluator classify a border token exactly instead of guessing, and what lets
 * it recognise a value the browser ignores.
 */
const widths = new Set(['0', '1px', '2px', 'thin', 'medium', 'thick']);
const styles = new Set(['none', 'solid', 'dashed', 'dotted', 'double']);
const colors = new Set(['red', 'blue', '#fff', '#abc123', 'currentcolor']);

/**
 * What a margin or padding side can be set to. The two families differ, and the
 * difference is worth modelling: `auto` is a margin's alone, and only a margin
 * takes a negative length.
 */
const boxLengths = new Set(['0', '1px', '2em', '10%', 'auto', '-5px']);
const marginOnly = new Set(['auto', '-5px']);

/**
 * The CSS-wide keywords the evaluator can resolve. Both mean the initial value
 * on the box families, none of which inherit.
 */
const globalKeywords = new Set(['initial', 'unset']);

/**
 * A small, hand-written stand-in for CSS's substitution and maths functions.
 */
const substitutionTokens = new Set(['var(--x)', 'env(safe-area-inset-top)']);
const widthTypedTokens = new Set(['calc(2*1px)']);
const unresolvedTokens = new Set([...substitutionTokens, ...widthTypedTokens]);

/**
 * @param {string} side
 * @param {string} component
 * @return {string}
 */
function borderSlot(side, component) {
  return `border-${side}-${component}`;
}

/**
 * Every slot at its initial value.
 *
 * @return {Map<string, string>}
 */
function initialState() {
  /** @type {Map<string, string>} */
  const state = new Map();

  for (const side of sides) {
    for (const component of components) {
      state.set(
        borderSlot(side, component),
        /** @type {string} */ (initialValues.get(component))
      );
    }

    state.set(`margin-${side}`, boxInitial);
    state.set(`padding-${side}`, boxInitial);
  }

  for (const corner of corners) {
    state.set(`border-${corner}-radius-h`, boxInitial);
    state.set(`border-${corner}-radius-v`, boxInitial);
  }

  return state;
}

/**
 * The component a border token specifies, or undefined for a token that
 * specifies none — which is what makes the declaration holding it invalid.
 *
 * @param {string} token
 * @return {string|undefined}
 */
function componentOf(token) {
  if (widths.has(token) || widthTypedTokens.has(token)) {
    return 'width';
  }

  if (styles.has(token)) {
    return 'style';
  }

  if (colors.has(token)) {
    return 'color';
  }

  return undefined;
}

/**
 * Splits a value on whitespace. The alphabet holds no functions and no commas,
 * so this is the whole of the tokenizing the evaluator needs.
 *
 * @param {string} value
 * @return {string[]}
 */
function tokenize(value) {
  return value.trim().toLowerCase().split(/\s+/v).filter(Boolean);
}

/**
 * Takes a width/style/colour value apart, filling in the initial value for each
 * component left out — which is what the shorthand does to the side either way.
 *
 * @param {string[]} tokens
 * @return {Map<string, string>|undefined} undefined when the browser ignores the
 * declaration.
 */
function parseComponents(tokens) {
  if (tokens.length === 0 || tokens.length > components.length) {
    return undefined;
  }

  /** @type {Map<string, string>} */
  const specified = new Map();
  /** @type {string[]} */
  const unresolved = [];

  for (const token of tokens) {
    const component = componentOf(token);

    if (component === undefined) {
      if (!substitutionTokens.has(token)) {
        return undefined;
      }

      unresolved.push(token);
      continue;
    }

    if (specified.has(component)) {
      return undefined;
    }

    specified.set(component, token);
  }

  if (unresolved.length > 0 && new Set(unresolved).size > 1) {
    return undefined;
  }

  const open = components.filter((component) => !specified.has(component));

  for (let i = 0; i < unresolved.length && i < open.length; i++) {
    specified.set(open[i], /** @type {string} */ (unresolved[0]));
  }

  for (const component of components) {
    if (!specified.has(component)) {
      specified.set(
        component,
        /** @type {string} */ (initialValues.get(component))
      );
    }
  }

  return specified;
}

/**
 * Spreads one to four values across the four sides the way every trbl shorthand
 * does.
 *
 * @param {string[]} tokens
 * @return {Map<string, string>|undefined} undefined when there are too many or
 * too few values for the browser to keep the declaration.
 */
function parseSides(tokens) {
  if (tokens.length === 0 || tokens.length > sides.length) {
    return undefined;
  }

  const [top, right = top, bottom = top, left = right] = tokens;

  return new Map([
    ['top', top],
    ['right', right],
    ['bottom', bottom],
    ['left', left],
  ]);
}

export {
  borderSlot,
  boxInitial,
  boxLengths,
  colors,
  componentOf,
  components,
  corners,
  globalKeywords,
  initialState,
  initialValues,
  marginOnly,
  parseComponents,
  parseSides,
  radiusLengths,
  sides,
  styles,
  substitutionTokens,
  tokenize,
  unresolvedTokens,
  widthTypedTokens,
  widths,
};
