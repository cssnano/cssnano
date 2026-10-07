import {
  borderSlot,
  boxInitial,
  boxLengths,
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
  substitutionTokens,
  tokenize,
  unresolvedTokens,
} from './fuzzModel.js';

/**
 * Expands CSS declarations in the modelled border, box, and radius families
 * into theirslot-value mappings.
 */

/**
 * @param {string} corner
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandRadiusCorner(corner, value) {
  if (value.includes('/')) {
    return undefined;
  }
  const tokens = tokenize(value);
  if (tokens.length === 1 && globalKeywords.has(tokens[0])) {
    return new Map([
      [`border-${corner}-radius-h`, boxInitial],
      [`border-${corner}-radius-v`, boxInitial],
    ]);
  }
  if (tokens.length !== 1 && tokens.length !== 2) {
    return undefined;
  }
  if (!tokens.every(isRadiusToken)) {
    return undefined;
  }
  const h = tokens[0];
  const v = tokens.length === 2 ? tokens[1] : tokens[0];
  return new Map([
    [`border-${corner}-radius-h`, h],
    [`border-${corner}-radius-v`, v],
  ]);
}

/**
 * @param {string} token
 * @return {boolean}
 */
function isRadiusToken(token) {
  return radiusLengths.has(token) || unresolvedTokens.has(token);
}

/**
 * @param {string} axis the lengths before or after the `/`
 * @return {string[]|undefined} the four corner values, in `corners` order.
 */
function radiusCorners(axis) {
  const tokens = tokenize(axis);
  const perSide = tokens.every(isRadiusToken) ? parseSides(tokens) : undefined;
  return perSide && [...perSide.values()];
}

/**
 * @param {string} value
 * @return {Map<string, string>|undefined}
 */
function expandRadiusShorthand(value) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') return undefined;
  if (trimmed === 'initial' || trimmed === 'unset') {
    const slots = new Map();
    for (const corner of corners) {
      slots.set(`border-${corner}-radius-h`, boxInitial);
      slots.set(`border-${corner}-radius-v`, boxInitial);
    }
    return slots;
  }

  const slashParts = trimmed.split('/');
  if (slashParts.length > 2) return undefined;

  const h = radiusCorners(slashParts[0]);
  const v = slashParts.length === 2 ? radiusCorners(slashParts[1]) : h;
  if (h === undefined || v === undefined) return undefined;

  const slots = new Map();
  for (const [i, corner] of corners.entries()) {
    slots.set(`border-${corner}-radius-h`, h[i]);
    slots.set(`border-${corner}-radius-v`, v[i]);
  }
  return slots;
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

  if (prop === 'all') {
    const token = value.trim().toLowerCase();
    return globalKeywords.has(token) ? initialState() : undefined;
  }

  if (prop === 'border-radius') {
    return expandRadiusShorthand(value);
  }

  if (
    parts.length === 4 &&
    parts[0] === 'border' &&
    parts[3] === 'radius' &&
    corners.includes(`${parts[1]}-${parts[2]}`)
  ) {
    return expandRadiusCorner(`${parts[1]}-${parts[2]}`, value);
  }

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

export { expand };
