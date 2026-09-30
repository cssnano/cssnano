import {
  boxLengths,
  colors,
  components,
  corners,
  globalKeywords,
  marginOnly,
  radiusLengths,
  sides,
  styles,
  substitutionTokens,
  unresolvedTokens,
  widthTypedTokens,
  widths,
} from './fuzzModel.js';

const widthTokens = [...widths];
const styleTokens = [...styles];
const colorTokens = [...colors];
const globalTokens = [...globalKeywords];
const unresolvedList = [...unresolvedTokens];
const substitutionList = [...substitutionTokens];
const widthTypedList = [...widthTypedTokens];

/*
 * Every margin/padding position accepts a trusted function unconditionally —
 * `validateBox.js` checks it before the `auto`/negative grammar, not against
 * it — so the two families draw it in everywhere, including the trbl spread.
 */
const marginTokens = [...boxLengths, ...unresolvedList];
const paddingTokens = marginTokens.filter((token) => !marginOnly.has(token));
const radiusTokens = [...radiusLengths, ...unresolvedList];
const radiusLonghands = new Set(corners.map((c) => `border-${c}-radius`));

/** The alphabet each border component draws from, for a value whose tokens
 * must each specify their own component: `border`, `border-<side>`. A lone
 * trusted-function token here could stand for any component, so this
 * alphabet leaves them out. */
const componentTokens = new Map([
  ['width', widthTokens],
  ['style', styleTokens],
  ['color', colorTokens],
]);

/** The same alphabets, plus trusted-function tokens — safe only where the
 * component is already fixed by the property name: `border-<component>` and
 * `border-<side>-<component>`. Width additionally includes width-typed
 * functions (`calc()` and its siblings), since those fix their type from
 * their own syntax and a user agent never reads them as style or colour. */
const unambiguousComponentTokens = new Map([
  ['width', [...widthTokens, ...substitutionList, ...widthTypedList]],
  ['style', [...styleTokens, ...substitutionList]],
  ['color', [...colorTokens, ...substitutionList]],
]);

/*
 * Left out of the alphabet on purpose:
 *
 * - `inherit` and the `revert` family, whose meaning comes from a parent or an
 *   origin the evaluator does not model.
 * - a lone trusted-function token filling `border` or `border-<side>` whole:
 *   which component (or components) it stands for is ambiguous until
 *   substitution, and the oracle has no slot to name for it.
 */

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @return {string}
 */
function borderShorthandValue(rng) {
  /* Any subset of the components, in grammar order: a shorthand sets the
   * components it mentions and resets the rest. */
  const specified = components.filter(() => rng.chance(0.6));
  const chosen = specified.length > 0 ? specified : [rng.pick(components)];

  return chosen
    .map((component) =>
      rng.pick(/** @type {string[]} */ (componentTokens.get(component)))
    )
    .join(' ');
}

/**
 * One to four values of the same component, the way a trbl shorthand takes them.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {readonly string[]} tokens
 * @return {string}
 */
function trblValue(rng, tokens) {
  const count = rng.int(sides.length) + 1;

  return Array.from({ length: count }, () => rng.pick(tokens)).join(' ');
}

/**
 * One value too many for the sides the property spreads across.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {readonly string[]} tokens
 * @return {string}
 */
function excessiveTrblValue(rng, tokens) {
  const count = sides.length + 1;

  return Array.from({ length: count }, () => rng.pick(tokens)).join(' ');
}

/**
 * A `margin` or `padding` value the browser ignores: one value too many, a token
 * that is no length at all, or — for a padding alone — one of the two things
 * only a margin takes.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {string} family
 * @return {string}
 */
function malformedBoxValue(rng, family) {
  const tokens = family === 'margin' ? marginTokens : paddingTokens;

  switch (rng.int(3)) {
    case 0:
      return excessiveTrblValue(rng, tokens);

    /* A border token, which specifies no length. */
    case 1:
      return rng.pick([...styleTokens, ...colorTokens]);

    default:
      return family === 'padding'
        ? rng.pick([...marginOnly])
        : rng.pick([...styleTokens, ...colorTokens]);
  }
}

/**
 * A value the browser ignores, built from the same alphabet so that the evaluator
 * can still adjudicate it. Well-formed values cannot find validity bugs, and
 * the validity checks are where this plugin's miscompiles live.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {string} prop
 * @return {string}
 */
function malformedValue(rng, prop) {
  if (prop === 'border-radius' || radiusLonghands.has(prop)) {
    switch (rng.int(6)) {
      case 0:
        return '-5px';
      case 1:
        return rng.pick([...styleTokens, ...colorTokens]);
      case 2:
        return '10px 20px 30px 40px 50px';
      case 3:
        return '10px /* comment */ 20px';
      case 4:
        return '10px / 20px / 30px';
      default:
        return prop === 'border-radius' ? '10px /' : '10px / 20px';
    }
  }

  const parts = prop.split('-');

  if (parts[0] !== 'border') {
    return malformedBoxValue(rng, parts[0]);
  }

  const component = components.find((name) => parts.includes(name));
  const tokens = component
    ? /** @type {string[]} */ (componentTokens.get(component))
    : [...widthTokens, ...styleTokens, ...colorTokens];

  switch (rng.int(3)) {
    /* One value too many for the sides the property spreads across. */
    case 0:
      return excessiveTrblValue(rng, tokens);

    /* A token from a component the property does not take. */
    case 1: {
      const other = rng.pick(
        components.filter((name) => name !== (component ?? 'width'))
      );
      return `${rng.pick(tokens)} ${rng.pick(/** @type {string[]} */ (componentTokens.get(other)))}`;
    }

    /* The same component specified twice. */
    default: {
      const repeated = rng.pick(tokens);
      return `${repeated} ${rng.pick(tokens)}`;
    }
  }
}

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @return {{prop: string, value: string}}
 */
function borderDeclaration(rng) {
  const side = rng.pick(sides);
  const component = rng.pick(components);
  const tokens = /** @type {string[]} */ (
    unambiguousComponentTokens.get(component)
  );

  switch (rng.int(4)) {
    case 0:
      return { prop: 'border', value: borderShorthandValue(rng) };
    case 1:
      return { prop: `border-${side}`, value: borderShorthandValue(rng) };
    case 2:
      return { prop: `border-${component}`, value: trblValue(rng, tokens) };
    default:
      return { prop: `border-${side}-${component}`, value: rng.pick(tokens) };
  }
}

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {'margin' | 'padding'} family
 * @return {{prop: string, value: string}}
 */
function boxDeclaration(rng, family) {
  const tokens = family === 'margin' ? marginTokens : paddingTokens;

  return rng.chance(0.5)
    ? { prop: family, value: trblValue(rng, tokens) }
    : { prop: `${family}-${rng.pick(sides)}`, value: rng.pick(tokens) };
}

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @return {{prop: string, value: string}}
 */
function radiusDeclaration(rng) {
  const prop = rng.chance(0.35)
    ? 'border-radius'
    : `border-${rng.pick(corners)}-radius`;
  return { prop, value: radiusValue(rng, prop) };
}

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {string} prop
 * @return {string}
 */
function radiusValue(rng, prop) {
  if (prop === 'border-radius') {
    const hCount = rng.int(4) + 1;
    const h = Array.from({ length: hCount }, () => rng.pick(radiusTokens)).join(
      ' '
    );
    if (rng.chance(0.35)) {
      const vCount = rng.int(4) + 1;
      const v = Array.from({ length: vCount }, () =>
        rng.pick(radiusTokens)
      ).join(' ');
      return `${h} / ${v}`;
    }
    return h;
  }
  const count = rng.chance(0.3) ? 2 : 1;
  return Array.from({ length: count }, () => rng.pick(radiusTokens)).join(' ');
}

/**
 * A fresh value for a property already chosen, so that a repeat says something
 * different from what it repeats.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {string} prop
 * @return {string}
 */
function valueFor(rng, prop) {
  if (prop === 'border-radius' || radiusLonghands.has(prop)) {
    return radiusValue(rng, prop);
  }

  const parts = prop.split('-');
  /* Determines family from the property itself, not from the current draw,
   * since a mixed rule can repeat a `margin` while currently generating
   * `border` declarations. */
  const family = parts[0];

  if (family !== 'border') {
    const tokens = family === 'margin' ? marginTokens : paddingTokens;
    return parts.length === 1 ? trblValue(rng, tokens) : rng.pick(tokens);
  }

  const component = components.find((name) => parts.includes(name));

  if (component === undefined) {
    return borderShorthandValue(rng);
  }

  const tokens = /** @type {string[]} */ (
    unambiguousComponentTokens.get(component)
  );

  return parts.length === 2 ? trblValue(rng, tokens) : rng.pick(tokens);
}

/**
 * Generates the actual value for a CSS declaration: mostly the well-formed
 * value, with some global keywords and some invalid values the browser ignores.
 *
 * Takes the property name rather than the family, since a repeated property
 * can come from a different family than the current draw.
 *
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {string} prop
 * @param {string} value
 * @return {string}
 */
function valueAsWritten(rng, prop, value) {
  if (rng.chance(0.05)) {
    return rng.pick(globalTokens);
  }

  if (rng.chance(0.15)) {
    return malformedValue(rng, prop);
  }

  return value;
}

/**
 * @param {import('../../../../util/fuzzRng.js').PRNG} rng
 * @param {'border' | 'margin' | 'padding' | 'radius'} family
 * @param {string[]} used the properties the rule has written so far
 * @param {boolean} [important]
 * @return {string} a declaration, `prop:value` with no trailing semicolon.
 */
function declaration(rng, family, used, important = false) {
  let fresh;
  if (family === 'border') {
    fresh = borderDeclaration(rng);
  } else if (family === 'radius') {
    fresh = radiusDeclaration(rng);
  } else {
    fresh = boxDeclaration(rng, family);
  }

  /* Sometimes declare a property the rule already declares, rather than
   * drawing from the whole property space. Repeated properties are common in
   * stylesheets; this tests whether a merge reorders declarations when a
   * property appears twice. A uniform draw over thirty-odd properties into a
   * rule of five rarely produces this naturally. */
  const repeat =
    rng.chance(0.25) && used.length > 0 ? rng.pick(used) : undefined;
  const prop = repeat ?? fresh.prop;
  const value = repeat === undefined ? fresh.value : valueFor(rng, repeat);

  const written = valueAsWritten(rng, prop, value);

  return `${prop}:${written}${important ? ' !important' : ''}`;
}

export { declaration, globalTokens, valueFor };
