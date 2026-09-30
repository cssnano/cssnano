import { random } from '../../../../util/fuzzRng.js';
import { declaration, globalTokens, valueFor } from './fuzzDeclarations.js';
import { components, sides } from './fuzzModel.js';

const families = /** @type {const} */ ([
  'border',
  'margin',
  'padding',
  'radius',
]);

/**
 * Generates a rule explicitly containing a complete side group or component group,
 * with optional surrounding declarations and mixed importance lanes.
 *
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function groupRule(rng) {
  const isSide = rng.chance(0.5);
  /** @type {string[]} */
  let groupProps;
  if (isSide) {
    const side = rng.pick(sides);
    groupProps = components.map((c) => `border-${side}-${c}`);
  } else {
    const comp = rng.pick(components);
    groupProps = sides.map((s) => `border-${s}-${comp}`);
  }

  const importanceMode = rng.int(5);
  /** @type {string[]} */
  const declarations = [];
  /** @type {string[]} */
  const used = [];

  const extraBefore = rng.int(2);
  for (let i = 0; i < extraBefore; i++) {
    const important =
      importanceMode === 1 || (importanceMode > 1 && rng.chance(0.3));
    const written = declaration(rng, 'border', used, important);
    declarations.push(written);
    used.push(/** @type {string} */ (written.split(':')[0]));
  }

  for (let i = 0; i < groupProps.length; i++) {
    const prop = groupProps[i];
    let important = false;
    if (importanceMode === 1) {
      important = true;
    } else if (importanceMode === 2) {
      important = i < Math.floor(groupProps.length / 2);
    } else if (importanceMode === 3) {
      important = i % 2 === 0;
    } else if (importanceMode === 4) {
      important = rng.chance(0.3);
    }
    const val = valueFor(rng, prop);
    const written = `${prop}:${val}${important ? ' !important' : ''}`;
    declarations.push(written);
    used.push(prop);
  }

  const extraAfter = rng.int(2);
  for (let i = 0; i < extraAfter; i++) {
    const important =
      importanceMode === 1 || (importanceMode > 1 && rng.chance(0.3));
    const written = declaration(rng, 'border', used, important);
    declarations.push(written);
    used.push(/** @type {string} */ (written.split(':')[0]));
  }

  return `a{${declarations.join(';')}}`;
}

/**
 * Generates declarations on both sides of an `all` reset in the matching lane,
 * the opposite lane, or both lanes at once.
 *
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function resetRule(rng) {
  const family = rng.pick(families);
  const allImportant = rng.chance(0.5);
  const mode = rng.int(3);
  /** @type {string[]} */
  const declarations = [];
  /** @type {string[]} */
  const used = [];

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 2; i++) {
      let important = i === 0 ? allImportant : !allImportant;
      if (mode === 0) important = allImportant;
      if (mode === 1) important = !allImportant;
      const written = declaration(rng, family, used, important);
      declarations.push(written);
      used.push(/** @type {string} */ (written.split(':')[0]));
    }
    if (side === 0) {
      declarations.push(
        `${rng.pick(['all', 'ALL', String.raw`\61ll`])}:${rng.pick(globalTokens)}${allImportant ? ' !important' : ''}`
      );
    }
  }

  return `a{${declarations.join(';')}}`;
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} one rule, `a{...}`.
 */
function rule(rng) {
  if (rng.chance(0.2)) return resetRule(rng);

  /* Mostly one family per rule, so that declarations actually interact; the
   * rest mixed, to catch a transform reaching outside its own family. */
  const family = rng.pick(families);
  const mixed = rng.chance(0.2);
  if (family === 'border' && !mixed && rng.chance(0.35)) {
    return groupRule(rng);
  }

  const count = rng.int(5) + 2;
  const importanceMode = rng.int(5);

  /** @type {string[]} */
  const declarations = [];
  /** @type {string[]} */
  const used = [];

  for (let i = 0; i < count; i++) {
    let important = false;
    if (importanceMode === 1) {
      important = true;
    } else if (importanceMode === 2) {
      important = i < Math.floor(count / 2);
    } else if (importanceMode === 3) {
      important = i % 2 === 0;
    } else if (importanceMode === 4) {
      important = rng.chance(0.2);
    }

    const written = declaration(
      rng,
      mixed ? rng.pick(families) : family,
      used,
      important
    );

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
  const [, head, body] = /^(a\{)(.*)\}$/v.exec(css) ?? [];

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

export { generate, random, shrink };
