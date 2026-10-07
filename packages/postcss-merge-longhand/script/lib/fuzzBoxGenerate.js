import { random } from '../../../../util/fuzzRng.js';
import { groupGrammars, meanings } from './fuzzBoxOracle.js';

/** @import {random as randomType} from '../../../../util/fuzzRng.js' */

const lengths = ['0', '1px', '2px', '3px', '4px', '5%', '-1px', 'inherit'];

/**
 * Values that need more than the oldest browsers parse, or that no browser
 * resolves before the cascade: a maths function that holds a function only
 * the insets take, a custom property, and a unit newer than the shorthands.
 */
const unusualValues = [
  'calc(1px + 2px)',
  'calc(10%)',
  'calc(anchor(--a top))',
  'var(--x)',
  '1cap',
];

/* Operands of the generated math functions. A number, an angle and an anchor
 * make some expressions ill-typed or newer than the oldest browsers. */
const operands = ['1px', '2px', '1em', '5%', '2', '0', '2deg', '-1px'];
const anchor = 'anchor(--a top)';

/**
 * A random calculation that may be ill-typed on purpose, such as a length
 * added to an angle, so that the plugin must tell what a browser drops.
 *
 * @param {ReturnType<typeof randomType>} rng
 * @param {number} depth
 * @return {string}
 */
function mathExpression(rng, depth) {
  const operand = () => {
    if (depth > 0 && rng.chance(0.3)) return mathExpression(rng, depth - 1);
    return rng.chance(0.05) ? anchor : rng.pick(operands);
  };
  switch (rng.int(6)) {
    case 0:
      return `calc(${operand()} ${rng.pick(['+', '-'])} ${operand()})`;
    case 1:
      return `calc(${operand()} ${rng.pick(['*', '/'])} ${operand()})`;
    case 2:
      return `${rng.pick(['min', 'max'])}(${operand()}, ${operand()})`;
    case 3:
      return `clamp(${operand()}, ${operand()}, ${operand()})`;
    case 4:
      return `calc((${operand()} + ${operand()}) * ${rng.pick(['2', '1px'])})`;
    default:
      return `calc(${operand()})`;
  }
}

/**
 * Older spellings of a property of the group. The oracle gives them no side,
 * so they only test that the plugin does not move a value across them.
 */
const aliases = new Map([
  ['margin', '-webkit-margin-start'],
  ['scroll-margin', 'scroll-snap-margin-top'],
]);

/**
 * A small value pool, so that equal values are common and merging has
 * something to fold. Some values are invalid for some groups on purpose.
 *
 * @param {ReturnType<typeof randomType>} rng
 * @param {string} group
 * @return {string}
 */
function token(rng, group) {
  const grammar = groupGrammars.get(group);
  if (rng.chance(0.15)) return rng.pick(unusualValues);
  if (rng.chance(0.12)) return mathExpression(rng, 1);
  return rng.pick(grammar?.auto ? [...lengths, 'auto'] : lengths);
}

/**
 * @param {ReturnType<typeof randomType>} rng
 * @param {string} group
 * @param {string[]} names
 * @return {string}
 */
function declaration(rng, group, names) {
  const prop = rng.pick(names);
  const meaning = meanings.get(prop);
  const count = meaning?.shorthand ? 1 + rng.int(meaning.keys.length) : 1;
  const value = Array.from({ length: count }, () => token(rng, group)).join(
    ' '
  );
  return `${prop}:${value}${rng.chance(0.2) ? '!important' : ''}`;
}

/**
 * @param {ReturnType<typeof randomType>} rng
 * @return {string} a rule declaring properties of one or two groups
 */
function randomBoxRule(rng) {
  const groups = [...groupGrammars.keys()];
  const chosen = [rng.pick(groups)];
  if (rng.chance(0.15)) chosen.push(rng.pick(groups));
  const pools = chosen.map((group) => [
    group,
    [...meanings].filter(([, m]) => m.group === group).map(([name]) => name),
  ]);
  const count = 1 + rng.int(7);
  const declarations = Array.from({ length: count }, () => {
    if (rng.chance(0.05)) return 'color:red';
    const [group, names] = rng.pick(pools);
    const alias = aliases.get(group);
    if (alias && rng.chance(0.06)) return `${alias}:${token(rng, group)}`;
    return declaration(rng, group, names);
  });
  return `a{${declarations.join(';')}}`;
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {Generator<string>}
 */
export function* generateBoxRules(seed, count) {
  const rng = random(seed);
  for (let index = 0; index < count; index++) yield randomBoxRule(rng);
}
