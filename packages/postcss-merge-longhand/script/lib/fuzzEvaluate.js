'use strict';
const postcss = require('postcss');

/**
 * An independent evaluator for what a rule means to the browser, against which
 * postcss-merge-longhand's output can be compared.
 *
 * Deliberately shares nothing with the plugin: not `src/lib/spec.js`, not the
 * generated `longhands.json`, not `parseWsc` or `parseTrbl`. An oracle built on
 * the implementation's own data agrees with the implementation's own bugs, and
 * the whole point here is to disagree.
 *
 * The model is the twenty longhands the box families reach — four sides times
 * three border components, plus a margin and a padding per side — each holding
 * the value the cascade leaves it with.
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

/**
 * The three component alphabets. They are disjoint, which is what lets the
 * evaluator classify a border token exactly instead of guessing, and what lets
 * it recognise a value the browser ignores. The generator draws from these sets,
 * so a token outside them can only come from the plugin inventing one.
 */
const widths = new Set(['0', '1px', '2px', 'thin', 'medium', 'thick']);
const styles = new Set(['none', 'solid', 'dashed', 'dotted', 'double']);
const colors = new Set(['red', 'blue', '#fff', '#abc123', 'currentcolor']);

/**
 * What a margin or padding side can be set to. The two families differ, and the
 * difference is worth modelling: `auto` is a margin's alone, and only a margin
 * takes a negative length — a browser drops `padding: -5px` where it keeps the
 * margin spelled the same way.
 */
const boxLengths = new Set(['0', '1px', '2em', '10%', 'auto', '-5px']);
const marginOnly = new Set(['auto', '-5px']);

/**
 * The CSS-wide keywords the evaluator can resolve. `inherit` and the `revert`
 * family depend on a parent or an origin this model does not have, so the
 * generator leaves them out; both of these mean the initial value on the box
 * families, none of which inherit.
 */
const globalKeywords = new Set(['initial', 'unset']);

/**
 * A small, hand-written stand-in for CSS's substitution and maths functions —
 * independent of `src/lib/unresolved.js` for the same reason the other
 * alphabets are hand-written: an oracle reading the plugin's own list of
 * trusted functions agrees with the plugin's own gaps in it.
 *
 * The two kinds of trust are not the same. A substitution's type stays
 * unknowable until a user agent resolves it, so it can stand for any
 * component. `calc()` fixes its type from its own syntax — always a number or
 * length — so it can only ever be a border's width: a user agent never reads
 * a bare `calc()` as a `<line-style>` keyword or a `<color>`. Both kinds are
 * equally trusted on a margin or padding position, since those grammars are
 * uniformly length-typed regardless of which trusted function fills them.
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
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Takes a width/style/colour value apart, filling in the initial value for each
 * component left out — which is what the shorthand does to the side either way.
 *
 * @param {string[]} tokens
 * @return {Map<string, string>|undefined} undefined when the browser ignores the
 * declaration: a token specifying no component, a component specified twice,
 * or more trusted-function tokens than components left open for them.
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

  /* A substitution fills whichever component is still open, the way
   * `parseWsc` spends an unrecognised token on the one slot it can name — a
   * `calc()`-typed token never reaches here, since `componentOf` already
   * named it `width` above. Two distinct substitutions opening onto the same
   * two slots is a hole this model cannot name, since nothing here says which
   * token is for which; two of the *same* substitution have only one answer
   * regardless of which slot gets which copy. */
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

/**
 * The slots a property sets, and what it sets them to.
 *
 * @param {string} prop lower-cased
 * @param {string} value
 * @return {Map<string, string>|undefined} undefined for a declaration the
 * browser drops, and for a property outside the families modelled here.
 */
function expand(prop, value) {
  const parts = prop.split('-');

  if (parts[0] === 'border') {
    return expandBorder(parts, value);
  }

  if (parts[0] === 'margin' || parts[0] === 'padding') {
    return expandBox(parts, value);
  }

  return undefined;
}

/**
 * @param {string[]} parts
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandBorder(parts, value) {
  const [, second, third] = parts;

  /* Matched on the exact segment count, so that a property this does not model
   * — `border-top-left-radius`, `border-image-source` — falls through rather
   * than being read as the shorthand its first segments spell. */
  if (parts.length === 1) {
    return expandBorderSides(sides, value);
  }

  if (parts.length === 2 && sides.includes(second)) {
    return expandBorderSides([second], value);
  }

  if (parts.length === 2 && components.includes(second)) {
    return expandBorderComponent(second, value);
  }

  if (
    parts.length === 3 &&
    sides.includes(second) &&
    components.includes(third)
  ) {
    return expandBorderLonghand(second, third, value);
  }

  return undefined;
}

/**
 * @param {string} side
 * @param {string} component
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandBorderLonghand(side, component, value) {
  const slot = borderSlot(side, component);
  const tokens = tokenize(value);

  if (tokens.length === 1 && globalKeywords.has(tokens[0])) {
    return new Map([
      [slot, /** @type {string} */ (initialValues.get(component))],
    ]);
  }

  if (
    tokens.length !== 1 ||
    (componentOf(tokens[0]) !== component && !substitutionTokens.has(tokens[0]))
  ) {
    return undefined;
  }

  return new Map([[slot, tokens[0]]]);
}

/**
 * `border-width`, `border-style`, `border-color`: one component, spread across
 * the four sides.
 *
 * @param {string} component
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandBorderComponent(component, value) {
  const tokens = tokenize(value);
  const initial = /** @type {string} */ (initialValues.get(component));

  if (tokens.length === 1 && globalKeywords.has(tokens[0])) {
    return new Map(sides.map((side) => [borderSlot(side, component), initial]));
  }

  if (
    tokens.some(
      (token) =>
        componentOf(token) !== component && !substitutionTokens.has(token)
    )
  ) {
    return undefined;
  }

  const perSide = parseSides(tokens);

  if (perSide === undefined) {
    return undefined;
  }

  /** @type {Map<string, string>} */
  const slots = new Map();

  for (const [side, specified] of perSide) {
    slots.set(borderSlot(side, component), specified);
  }

  return slots;
}

/**
 * `border` and `border-<side>`: every component of every side listed, with the
 * initial value filled in for each component the value leaves out.
 *
 * @param {string[]} affected
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandBorderSides(affected, value) {
  const tokens = tokenize(value);
  const specified =
    tokens.length === 1 && globalKeywords.has(tokens[0])
      ? new Map(
          components.map((component) => [
            component,
            initialValues.get(component),
          ])
        )
      : parseComponents(tokens);

  if (specified === undefined) {
    return undefined;
  }

  /** @type {Map<string, string>} */
  const slots = new Map();

  for (const side of affected) {
    for (const [component, componentValue] of specified) {
      slots.set(
        borderSlot(side, component),
        /** @type {string} */ (componentValue)
      );
    }
  }

  return slots;
}

/**
 * @param {string[]} parts
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandBox(parts, value) {
  const [family, second] = parts;
  const tokens = tokenize(value);

  if (parts.length > 2) {
    return undefined;
  }

  if (second !== undefined && !sides.includes(second)) {
    return undefined;
  }

  const affected = second === undefined ? sides : [second];

  if (tokens.length === 1 && globalKeywords.has(tokens[0])) {
    return new Map(affected.map((side) => [`${family}-${side}`, boxInitial]));
  }

  if (
    tokens.some(
      (token) =>
        !unresolvedTokens.has(token) &&
        (!boxLengths.has(token) ||
          (family === 'padding' && marginOnly.has(token)))
    )
  ) {
    return undefined;
  }

  if (second !== undefined) {
    return tokens.length === 1
      ? new Map([[`${family}-${second}`, tokens[0]]])
      : undefined;
  }

  const perSide = parseSides(tokens);

  if (perSide === undefined) {
    return undefined;
  }

  /** @type {Map<string, string>} */
  const slots = new Map();

  for (const [side, specified] of perSide) {
    slots.set(`${family}-${side}`, specified);
  }

  return slots;
}

/**
 * Folds a rule's declarations into the state they leave behind. Within one rule
 * the important declarations all win over the ordinary ones however they are
 * ordered, so they go in a second pass; among themselves each pass is simply
 * last-one-wins.
 *
 * A declaration this cannot expand — a property outside the families, or a
 * value the browser ignores — leaves the state alone, which is exactly what the
 * browser does with it.
 *
 * @param {import('postcss').Rule} rule
 * @return {Map<string, string>}
 */
function evaluateRule(rule) {
  const state = initialState();

  for (const important of [false, true]) {
    for (const node of rule.nodes) {
      if (node.type !== 'decl' || Boolean(node.important) !== important) {
        continue;
      }

      const slots = expand(node.prop.toLowerCase(), node.value);

      if (slots === undefined) {
        continue;
      }

      for (const [slot, value] of slots) {
        state.set(slot, value);
      }
    }
  }

  return state;
}

/**
 * @param {string} css
 * @return {Map<string, string>[]} one state per rule, in document order.
 */
function evaluate(css) {
  /** @type {Map<string, string>[]} */
  const states = [];

  postcss.parse(css).walkRules((rule) => {
    states.push(evaluateRule(rule));
  });

  return states;
}

/**
 * @param {Map<string, string>} expected
 * @param {Map<string, string>} actual
 * @return {{slot: string, expected: string, actual: string}[]}
 */
function differences(expected, actual) {
  /** @type {{slot: string, expected: string, actual: string}[]} */
  const found = [];

  for (const [slot, value] of expected) {
    const other = actual.get(slot);

    if (other !== value) {
      found.push({ slot, expected: value, actual: other ?? '<missing>' });
    }
  }

  return found;
}

module.exports = {
  boxLengths,
  marginOnly,
  colors,
  components,
  differences,
  evaluate,
  globalKeywords,
  initialState,
  sides,
  styles,
  substitutionTokens,
  unresolvedTokens,
  widthTypedTokens,
  widths,
};
