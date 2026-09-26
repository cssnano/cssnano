import { random } from '../../../../util/fuzzRng.js';

// Generate identifiers that collide with the roles the rewrite keeps apart.
const IDENTS = [
  'item',
  'section',
  'counter',
  'counters',
  'calc',
  'none',
  'decimal',
  'FOO',
  'foo',
  'Head',
  'head',
  '--custom',
  '\\31 st',
  '\\66 oo',
  'a',
];

const NUMBERS = ['1', '2.5', '-3.5e2', '+40%', '12px'];

const STRINGS = ['"."', '"counter(x)"', '"a,b"', '""'];

const COMMENTS = ['/*counter(x)*/', '/*,*/'];

// Name a counter at argument 0 for counter()/counters() and 1 for target
// functions.
const NAME_ARGUMENT_FUNCTIONS = [
  'counter',
  'counters',
  'target-counter',
  'target-counters',
];

// Treat an ident inside var()/env() as never an argument slot; the rest
// exercise plain nesting.
const OTHER_FUNCTIONS = ['calc', 'repeat', 'attr', 'var', 'env', 'unknown'];

const BRANCHES = [
  'plain-ident',
  'function-name-arg',
  'function-style-arg',
  'nested-function',
  'string',
  'comment',
  'bracket',
  'parenthesised',
  'number-adjacent',
  'escaped-ident',
  'keyword-collision',
  'stray-close',
];

export { BRANCHES };

/**
 * @typedef {{value: string, branch: string}} FuzzCase
 */

/**
 * @param {number} seed
 * @param {number} count
 * @return {FuzzCase[]}
 */
export function generate(seed, count) {
  const rng = random(seed);
  const cases = [];
  for (let i = 0; i < count; i++) {
    // Rotate branches so every branch is generated however the random choices
    // fall out.
    const branch = BRANCHES[i % BRANCHES.length];
    cases.push({ value: build(rng, branch), branch });
  }
  return cases;
}

/**
 * A random short run of whitespace, possibly none.
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function gap(rng) {
  return rng.pick([' ', ' ', '  ', '\t', '']);
}

/**
 * A random argument body safe to write inside any function call.
 * @param {ReturnType<typeof random>} rng
 * @param {number} depth
 * @return {string}
 */
function argument(rng, depth) {
  const pieces = [];
  const count = 1 + rng.int(2);
  for (let i = 0; i < count; i++) {
    pieces.push(gap(rng));
    switch (rng.int(3)) {
      case 0:
        pieces.push(rng.pick(IDENTS));
        break;
      case 1:
        pieces.push(rng.pick(NUMBERS));
        break;
      default:
        pieces.push(rng.pick(STRINGS));
        break;
    }
  }
  pieces.push(gap(rng));
  if (depth < 2 && rng.chance(0.3)) {
    pieces.push(`,${gap(rng)}${call(rng, depth + 1)}`);
  }
  return pieces.join('');
}

/**
 * A balanced function call.
 * @param {ReturnType<typeof random>} rng
 * @param {number} depth
 * @return {string}
 */
function call(rng, depth = 0) {
  const name = rng.chance(0.6)
    ? rng.pick(NAME_ARGUMENT_FUNCTIONS)
    : rng.pick(OTHER_FUNCTIONS);
  return `${name}(${argument(rng, depth)})`;
}

/**
 * Padding terms around a branch's focal construct.
 * @param {ReturnType<typeof random>} rng
 * @param {number} count
 * @return {string}
 */
function padding(rng, count) {
  const pieces = [];
  for (let i = 0; i < count; i++) {
    pieces.push(gap(rng));
    switch (rng.int(3)) {
      case 0:
        pieces.push(rng.pick(IDENTS));
        break;
      case 1:
        pieces.push(rng.pick(NUMBERS));
        break;
      default:
        pieces.push(rng.pick(STRINGS));
        break;
    }
  }
  pieces.push(gap(rng));
  return pieces.join('');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @param {string} branch
 * @return {string}
 */
function build(rng, branch) {
  switch (branch) {
    case 'plain-ident':
      return `${padding(rng, 1)}${rng.pick(IDENTS)}${padding(rng, 1)}`;
    case 'function-name-arg':
      return `counter(${gap(rng)}${rng.pick(IDENTS)}${gap(rng)},${gap(rng)}decimal)${padding(rng, 1)}`;
    case 'function-style-arg':
      return `counters(${gap(rng)}${rng.pick(IDENTS)}${gap(rng)},${gap(rng)}${rng.pick(STRINGS)},${gap(rng)}decimal)`;
    case 'nested-function': {
      const inner = rng.pick(NAME_ARGUMENT_FUNCTIONS);
      return `target-counter(${gap(rng)}attr(${gap(rng)}href${gap(rng)}),${gap(rng)}${rng.pick(IDENTS)}${gap(rng)},${gap(rng)}${inner}(${gap(rng)}${rng.pick(IDENTS)}${gap(rng)},${gap(rng)}decimal))`;
    }
    case 'string':
      return `${rng.pick(STRINGS)}${gap(rng)}counter(${gap(rng)}${rng.pick(IDENTS)})${gap(rng)}${rng.pick(COMMENTS)}`;
    case 'comment':
      return `${rng.pick(COMMENTS)}${gap(rng)}counters(${gap(rng)}${rng.pick(IDENTS)}${gap(rng)},${gap(rng)}${rng.pick(STRINGS)})`;
    case 'bracket':
      return `repeat(2,${gap(rng)}[${gap(rng)}${rng.pick(IDENTS)}${gap(rng)}]${gap(rng)}1fr)${padding(rng, 1)}`;
    case 'parenthesised':
      return `calc((${gap(rng)}${rng.pick(IDENTS)}${gap(rng)}) + 1px)`;
    case 'number-adjacent':
      return `${rng.pick(NUMBERS)}${gap(rng)}/${gap(rng)}${rng.pick(NUMBERS)}${gap(rng)}counter(${gap(rng)}${rng.pick(IDENTS)})`;
    case 'escaped-ident':
      return `${rng.pick(['\\31 st', '\\66 oo', '--custom'])}${gap(rng)}counter(${gap(rng)}\\66 oo${gap(rng)})`;
    case 'keyword-collision':
      return `counter(${gap(rng)}none${gap(rng)},${gap(rng)}decimal)${gap(rng)}calc(${gap(rng)}counter${gap(rng)})`;
    default:
      return `${call(rng)}${gap(rng)}${rng.pick([')', ']'])}`;
  }
}
