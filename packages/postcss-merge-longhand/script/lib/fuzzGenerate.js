'use strict';
const {
  boxLengths,
  marginOnly,
  colors,
  components,
  globalKeywords,
  sides,
  styles,
  substitutionTokens,
  unresolvedTokens,
  widthTypedTokens,
  widths,
} = require('./fuzzEvaluate.js');

/**
 * Random rules for the box families, drawn from an alphabet small enough that
 * `fuzzEvaluate.js` can say exactly what each one means.
 *
 * The corpus is generated from a seed rather than checked in, because its job
 * is finding new bugs rather than pinning old ones: a case this turns up gets
 * minimised and promoted to a named test in `test/borders.js`, and nothing
 * depends on a seed continuing to produce it.
 */

const { random } = require('../../../../util/fuzzRng.js');

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
 * @param {ReturnType<typeof random>} rng
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
 * @param {ReturnType<typeof random>} rng
 * @param {readonly string[]} tokens
 * @return {string}
 */
function trblValue(rng, tokens) {
  const count = rng.int(sides.length) + 1;

  return Array.from({ length: count }, () => rng.pick(tokens)).join(' ');
}

/**
 * A `margin` or `padding` value the browser ignores: one value too many, a token
 * that is no length at all, or — for a padding alone — one of the two things
 * only a margin takes.
 *
 * @param {ReturnType<typeof random>} rng
 * @param {string} family
 * @return {string}
 */
function malformedBoxValue(rng, family) {
  const tokens = family === 'margin' ? marginTokens : paddingTokens;

  switch (rng.int(3)) {
    case 0: {
      const count = sides.length + 1;
      return Array.from({ length: count }, () => rng.pick(tokens)).join(' ');
    }

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
 * @param {ReturnType<typeof random>} rng
 * @param {string} prop
 * @return {string}
 */
function malformedValue(rng, prop) {
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
    case 0: {
      const count = sides.length + 1;
      return Array.from({ length: count }, () => rng.pick(tokens)).join(' ');
    }

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
 * @param {ReturnType<typeof random>} rng
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
 * @param {ReturnType<typeof random>} rng
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
 * A fresh value for a property already chosen, so that a repeat says something
 * different from what it repeats.
 *
 * @param {ReturnType<typeof random>} rng
 * @param {string} prop
 * @return {string}
 */
function valueFor(rng, prop) {
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
 * @param {ReturnType<typeof random>} rng
 * @param {'border' | 'margin' | 'padding'} family
 * @param {string[]} used the properties the rule has written so far
 * @return {string} a declaration, `prop:value` with no trailing semicolon.
 */
function declaration(rng, family, used) {
  const fresh =
    family === 'border' ? borderDeclaration(rng) : boxDeclaration(rng, family);

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

  return `${prop}:${written}${rng.chance(0.08) ? ' !important' : ''}`;
}

/**
 * Generates the actual value for a CSS declaration: mostly the well-formed
 * value, with some global keywords and some invalid values the browser ignores.
 *
 * Takes the property name rather than the family, since a repeated property
 * can come from a different family than the current draw.
 *
 * @param {ReturnType<typeof random>} rng
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

const families = /** @type {const} */ (['border', 'margin', 'padding']);

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} one rule, `a{...}`.
 */
function rule(rng) {
  const count = rng.int(5) + 2;
  /* Mostly one family per rule, so that declarations actually interact; the
   * rest mixed, to catch a transform reaching outside its own family. */
  const family = rng.pick(families);
  const mixed = rng.chance(0.2);

  /** @type {string[]} */
  const declarations = [];
  /** @type {string[]} */
  const used = [];

  for (let i = 0; i < count; i++) {
    const written = declaration(rng, mixed ? rng.pick(families) : family, used);

    declarations.push(written);
    used.push(/** @type {string} */ (written.split(':')[0]));
  }

  return `a{${declarations.join(';')}}`;
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {string[]}
 */
function generate(seed, count) {
  const rng = random(seed);

  return Array.from({ length: count }, () => rule(rng));
}

/**
 * Removes declarations one at a time for as long as the rule still fails,
 * producing a minimal test case. Reduces a generated rule from many
 * declarations to only the two or three that reproduce the issue.
 *
 * @param {string} css
 * @param {(css: string) => boolean} fails
 * @return {string}
 */
function shrink(css, fails) {
  const [, head, body] = /^(a\{)(.*)\}$/.exec(css) ?? [];

  if (body === undefined) {
    return css;
  }

  let declarations = body.split(';');

  for (let i = declarations.length - 1; i >= 0; i--) {
    const candidate = declarations.filter((_, index) => index !== i);

    if (candidate.length > 0 && fails(`${head}${candidate.join(';')}}`)) {
      declarations = candidate;
    }
  }

  return `${head}${declarations.join(';')}}`;
}

module.exports = { generate, random, shrink };
