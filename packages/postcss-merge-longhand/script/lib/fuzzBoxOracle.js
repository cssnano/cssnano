import postcss from 'postcss';
import { typeOfMath } from './fuzzBoxMath.js';

/**
 * An independent model of the cascade for the five groups of box properties.
 * It knows each property by name only, and resolves every combination of
 * `writing-mode` and `direction`, so a rewrite is judged on what each physical
 * side computes to in every mode rather than on how the properties relate.
 *
 * It models browsers at three levels of support, so that a rewrite is also
 * judged in a browser that drops what it does not know.
 */

const sides = ['top', 'right', 'bottom', 'left'];

/**
 * @param {string} blockStart
 * @param {string} blockEnd
 * @param {string} inlineStart
 * @param {string} inlineEnd
 * @return {Record<string, string>}
 */
const flowSides = (blockStart, blockEnd, inlineStart, inlineEnd) => ({
  'block-start': blockStart,
  'block-end': blockEnd,
  'inline-start': inlineStart,
  'inline-end': inlineEnd,
});

/**
 * The physical side of each flow-relative suffix, written out from CSS
 * Writing Modes 4 and kept apart from the plugin's generated table, which a
 * test compares it with.
 *
 * @type {Record<string, Record<string, string>>}
 */
export const writingModes = {
  'horizontal-tb ltr': flowSides('top', 'bottom', 'left', 'right'),
  'horizontal-tb rtl': flowSides('top', 'bottom', 'right', 'left'),
  'vertical-rl ltr': flowSides('right', 'left', 'top', 'bottom'),
  'vertical-rl rtl': flowSides('right', 'left', 'bottom', 'top'),
  'vertical-lr ltr': flowSides('left', 'right', 'top', 'bottom'),
  'vertical-lr rtl': flowSides('left', 'right', 'bottom', 'top'),
  'sideways-rl ltr': flowSides('right', 'left', 'top', 'bottom'),
  'sideways-rl rtl': flowSides('right', 'left', 'bottom', 'top'),
  'sideways-lr ltr': flowSides('left', 'right', 'bottom', 'top'),
  'sideways-lr rtl': flowSides('left', 'right', 'top', 'bottom'),
};

/**
 * @typedef {'legacy' | 'longhands' | 'modern'} Engine
 *
 * `legacy` knows margin, padding and the physical insets, as Internet
 * Explorer 11 and Opera Mini do. `longhands` adds the flow-relative longhands
 * of margin and padding, as Chrome 69 to 86 do. `modern` knows everything.
 * An engine ignores a declaration it does not know, and one whose value it
 * cannot parse.
 */

/** What each engine parses in a value, beyond the properties it knows. */
const valueSupport = {
  legacy: {
    variables: false,
    anchor: false,
    capUnit: false,
    comparisonFunctions: false,
  },
  longhands: {
    variables: true,
    anchor: false,
    capUnit: false,
    comparisonFunctions: true,
  },
  modern: {
    variables: true,
    anchor: true,
    capUnit: true,
    comparisonFunctions: true,
  },
};

/** What each group's longhands accept, as the specifications write it. */
export const groupGrammars = new Map([
  ['margin', { auto: true, negative: true, percentage: true }],
  ['padding', { auto: false, negative: false, percentage: true }],
  ['inset', { auto: true, negative: true, percentage: true }],
  ['scroll-margin', { auto: false, negative: true, percentage: false }],
  ['scroll-padding', { auto: true, negative: false, percentage: true }],
]);

/**
 * @typedef {object} Meaning
 * @property {string} group
 * @property {string[]} keys - the side or flow-relative suffix of each slot
 * @property {boolean} shorthand
 * @property {'physical' | 'flow'} kind
 */

/** @type {Map<string, Meaning>} */
export const meanings = new Map();

for (const group of groupGrammars.keys()) {
  const physical = (/** @type {string} */ side) =>
    group === 'inset' ? side : `${group}-${side}`;
  meanings.set(group, {
    group,
    keys: sides,
    shorthand: true,
    kind: 'physical',
  });
  for (const side of sides) {
    meanings.set(physical(side), {
      group,
      keys: [side],
      shorthand: false,
      kind: 'physical',
    });
  }
  for (const axis of ['block', 'inline']) {
    meanings.set(`${group}-${axis}`, {
      group,
      keys: [`${axis}-start`, `${axis}-end`],
      shorthand: true,
      kind: 'flow',
    });
    for (const edge of ['start', 'end']) {
      meanings.set(`${group}-${axis}-${edge}`, {
        group,
        keys: [`${axis}-${edge}`],
        shorthand: false,
        kind: 'flow',
      });
    }
  }
}

/**
 * @param {string} term
 * @param {{auto: boolean, negative: boolean, percentage: boolean}} grammar
 * @param {boolean} capUnit
 * @return {boolean} whether the term is a length or a percentage the group takes
 */
function isLengthOrPercentage(term, grammar, capUnit) {
  const match = /^(-?)(\d+)(px|em|%|cap)?$/v.exec(term);
  if (!match) return false;
  const [, sign, number, unit] = match;
  if (unit === undefined && Number(number) !== 0) return false;
  if (unit === '%' && !grammar.percentage) return false;
  if (unit === 'cap' && !capUnit) return false;
  return sign === '' || grammar.negative;
}

/**
 * @param {string} token
 * @param {string} group
 * @param {Engine} engine
 * @return {boolean} whether the token is a math function whose type is a
 * length, or a percentage where the group takes one
 */
function isCalculation(token, group, engine) {
  if (!/^(?:calc|min|max|clamp)\(/v.test(token)) return false;
  const grammar =
    /** @type {NonNullable<ReturnType<typeof groupGrammars.get>>} */ (
      groupGrammars.get(group)
    );
  const type = typeOfMath(token, group, valueSupport[engine]);
  if (type === 'length') return true;
  return (
    grammar.percentage &&
    (type === 'percentage' || type === 'length-percentage')
  );
}

/**
 * @param {string} token
 * @param {string} group
 * @param {Engine} engine
 * @return {boolean}
 */
function isValidToken(token, group, engine) {
  const grammar =
    /** @type {NonNullable<ReturnType<typeof groupGrammars.get>>} */ (
      groupGrammars.get(group)
    );
  if (token === 'auto') return grammar.auto;
  return (
    isLengthOrPercentage(token, grammar, valueSupport[engine].capUnit) ||
    isCalculation(token, group, engine)
  );
}

/**
 * @param {string[]} tokens
 * @param {number} slots
 * @return {string[]}
 */
function spread(tokens, slots) {
  if (slots === 2) return [tokens[0], tokens[1] ?? tokens[0]];
  return [
    tokens[0],
    tokens[1] ?? tokens[0],
    tokens[2] ?? tokens[0],
    tokens[3] ?? tokens[1] ?? tokens[0],
  ];
}

/**
 * @param {string} prop
 * @param {Meaning} meaning
 * @param {Engine} engine
 * @return {boolean} whether the engine knows the property
 */
function knowsProperty(prop, meaning, engine) {
  if (engine === 'modern') return true;
  const classic = meaning.group === 'margin' || meaning.group === 'padding';
  const physicalInset = meaning.group === 'inset' && prop !== 'inset';
  if (meaning.kind === 'physical') return classic || physicalInset;
  return engine === 'longhands' && classic && !meaning.shorthand;
}

/**
 * What each declaration of a rule sets: one value per physical side in every
 * mode, or nothing when a browser drops the declaration.
 *
 * A value with `var()` is valid when it is parsed and unknown until it is
 * substituted. A shorthand splits what is substituted into its sides, so the
 * value of each side is recorded as a part of that shorthand, which no
 * longhand and no other shorthand can set.
 *
 * @param {string} prop
 * @param {string} value
 * @param {Engine} engine
 * @return {Map<string, string> | undefined} cell → token
 */
function declarationEffect(prop, value, engine) {
  const name = prop.toLowerCase();
  const meaning = meanings.get(name);
  if (!meaning || !knowsProperty(name, meaning, engine)) return undefined;
  const tokens = postcss.list.space(value.trim());
  const most = meaning.shorthand ? meaning.keys.length : 1;
  if (tokens.length === 0) return undefined;

  /** @type {string[]} */
  let values;
  if (tokens.some((token) => /^var\(/iv.test(token))) {
    if (!valueSupport[engine].variables) return undefined;
    const text = tokens.join(' ');
    values = meaning.shorthand
      ? meaning.keys.map((_, slot) => `${name}(${text})[${slot}]`)
      : [`(${text})`];
  } else {
    // A CSS-wide keyword is valid only as the whole value.
    const keyword = tokens.some((token) => token.toLowerCase() === 'inherit');
    if (keyword ? tokens.length > 1 : tokens.length > most) return undefined;
    if (
      !keyword &&
      !tokens.every((token) =>
        isValidToken(token.toLowerCase(), meaning.group, engine)
      )
    ) {
      return undefined;
    }
    values = meaning.shorthand
      ? spread(tokens, meaning.keys.length)
      : [tokens[0]];
  }

  /** @type {Map<string, string>} */
  const effect = new Map();
  for (const [mode, flow] of Object.entries(writingModes)) {
    for (const [slot, key] of meaning.keys.entries()) {
      const side = meaning.kind === 'physical' ? key : flow[key];
      effect.set(`${meaning.group}|${mode}|${side}`, values[slot]);
    }
  }
  return effect;
}

/**
 * The value each physical side computes to in each mode, for every group the
 * rules declare.
 *
 * @param {string} css
 * @param {Engine} [engine] the browser that reads it; the default knows
 * every property and value
 * @return {Record<string, string>}
 */
export function computedValues(css, engine = 'modern') {
  /** @type {Map<string, string>[]} */
  const lanes = [new Map(), new Map()];
  postcss.parse(css).walkDecls((declaration) => {
    const effect = declarationEffect(
      declaration.prop,
      declaration.value,
      engine
    );
    if (!effect) return;
    const lane = lanes[declaration.important ? 1 : 0];
    for (const [cell, token] of effect) lane.set(cell, token);
  });
  return Object.fromEntries(
    [...new Map([...lanes[0], ...lanes[1]])].toSorted(([a], [b]) =>
      a.localeCompare(b)
    )
  );
}
