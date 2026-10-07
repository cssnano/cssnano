import { transformFunctions } from '../../src/lib/decl/shapeEquivalence.js';
/** @import {WebrefData, WebrefDefinition} from './webrefLonghands.js'; */

/**
 * Finds the properties whose grammar bounds a number in a way the sign class
 * cannot decide, such as `<number [1,∞]>` or `<angle [-90deg,90deg]>`. Values
 * of such a property may not be interchangeable with other values of the same
 * sign class. Kept free of I/O so that it can be unit tested.
 */

/* Sign classes in order. A range is decided when both ends sit on a class
 * boundary, so every value in the range has the same validity as its class. */
const NEGATIVE = 0;
const ZERO = 1;
const POSITIVE = 2;

/* Zero in any unit, such as `0s` in `[0s,∞]`. */
const SIGN_ZERO = /^0[a-z%]*$/iv;

/* Matches a reference to a type, a function or a property, with its
 * optional range. Sticky so that the scan can match at each position. */
const REFERENCE_AT = /<(?:'([^'>]+)'|([^'>\s]+)(?:\s+\[([^\]]*)\])?)>/vy;

/* A word that may open a function call, such as `scale(` or a keyword. */
const WORD_AT = /[a-zA-Z][a-zA-Z0-9\-]*(\()?/vy;

/**
 * @param {string} bound - lower bound as written in the range
 * @param {string} type - lowercased name of the type
 * @return {number | undefined} the class the bound starts at, if it is a boundary
 */
function startClass(bound, type) {
  if (bound === '-∞') return NEGATIVE;
  if (SIGN_ZERO.test(bound)) return ZERO;
  return type === 'integer' && bound === '1' ? POSITIVE : undefined;
}

/**
 * @param {string} bound - upper bound as written in the range
 * @param {string} type - lowercased name of the type
 * @return {number | undefined} the class the bound ends at, if it is a boundary
 */
function endClass(bound, type) {
  if (bound === '∞') return POSITIVE;
  if (SIGN_ZERO.test(bound)) return ZERO;
  return type === 'integer' && bound === '-1' ? NEGATIVE : undefined;
}

/**
 * @param {string} type - lowercased name of a type, without brackets
 * @param {string} range - text between the brackets of `<type [range]>`
 * @return {boolean} whether the sign class decides every value in the range
 */
function isDecidedBySign(type, range) {
  const [min = '', max = ''] = range.split(',').map((bound) => bound.trim());
  const start = startClass(min, type);
  const end = endClass(max, type);
  return start !== undefined && end !== undefined && start <= end;
}

/**
 * Reads one grammar: whether it bounds a number itself, and which
 * definitions it refers to. Arguments of a function other than a transform
 * are skipped: a math function accepts any number while parsing, so its
 * bounds do not decide validity, and an unknown function is compared exactly.
 *
 * @param {string} syntax
 * @return {{bounded: boolean, edges: string[]}}
 */
function scanGrammar(syntax) {
  let bounded = false;
  /** @type {string[]} */
  const edges = [];
  let index = 0;

  while (index < syntax.length) {
    REFERENCE_AT.lastIndex = index;
    const reference = REFERENCE_AT.exec(syntax);

    if (reference) {
      const [text, property, type, range] = reference;
      index += text.length;

      if (property !== undefined) {
        edges.push(`'${property.toLowerCase()}'`);
        bounded ||= range !== undefined;
        continue;
      }

      const name = type.toLowerCase();
      const isFunction = name.endsWith('()');
      const base = isFunction ? name.slice(0, -2) : name;

      if (!isFunction || transformFunctions.has(base)) {
        edges.push(name);
      }
      if (
        range !== undefined &&
        (isFunction || !isDecidedBySign(name, range))
      ) {
        bounded = true;
      }
      continue;
    }

    WORD_AT.lastIndex = index;
    const word = WORD_AT.exec(syntax);

    if (!word) {
      index++;
      continue;
    }

    index += word[0].length;

    if (word[1] === undefined) {
      continue;
    }

    // A function call is skipped to its close paren unless it is a transform.
    if (transformFunctions.has(word[0].slice(0, -1).toLowerCase())) {
      continue;
    }
    index = closingParen(syntax, index);
  }

  return { bounded, edges };
}

/**
 * @param {string} syntax
 * @param {number} start - index just after an opening paren
 * @return {number} index just after its matching close paren
 */
function closingParen(syntax, start) {
  let depth = 1;
  for (let index = start; index < syntax.length; index++) {
    if (syntax[index] === '(') depth++;
    if (syntax[index] === ')') depth--;
    if (depth === 0) return index + 1;
  }
  return syntax.length;
}

/**
 * Lists the properties whose grammar, directly or through any type, property
 * or transform function it refers to, bounds a number the sign class cannot
 * decide. Each definition is scanned once, and the flag then travels backwards
 * along the references, so the walk is linear and tolerates cycles.
 *
 * @param {WebrefData} data
 * @return {string[]} lowercased property names, sorted
 */
export function numericRangeProperties(data) {
  /** @type {Map<string, string>} */
  const grammars = new Map();
  /** @type {WebrefDefinition[]} */
  const definitions = [...data.types, ...data.functions];
  for (const { name, syntax } of definitions) {
    if (!syntax) {
      continue;
    }
    const key = name.toLowerCase();
    const existing = grammars.get(key);
    grammars.set(
      key,
      existing === undefined ? syntax : `${existing} | ${syntax}`
    );
  }
  for (const { name, syntax } of data.properties) {
    if (syntax) {
      grammars.set(`'${name.toLowerCase()}'`, syntax);
    }
  }

  /** @type {Map<string, string[]>} */
  const referrers = new Map();
  /** @type {string[]} */
  const queue = [];

  for (const [key, syntax] of grammars) {
    const { bounded, edges } = scanGrammar(syntax);
    if (bounded) {
      queue.push(key);
    }
    for (const edge of edges) {
      if (!grammars.has(edge)) {
        continue;
      }
      const list = referrers.get(edge) ?? [];
      list.push(key);
      referrers.set(edge, list);
    }
  }

  /** @type {Set<string>} */
  const flagged = new Set();
  while (queue.length > 0) {
    const key = /** @type {string} */ (queue.pop());
    if (flagged.has(key)) {
      continue;
    }
    flagged.add(key);
    queue.push(...(referrers.get(key) ?? []));
  }

  /** @type {Set<string>} */
  const names = new Set();
  for (const { name } of data.properties) {
    if (flagged.has(`'${name.toLowerCase()}'`)) {
      names.add(name.toLowerCase());
    }
  }
  return [...names].toSorted();
}

/* A webref format change must not silently empty the set. */
const requiredProperties = [
  'font-style',
  'initial-letter',
  'text-combine-upright',
];

/**
 * @param {string[]} names - as returned by numericRangeProperties
 */
export function validateNumericRanges(names) {
  const found = new Set(names);
  for (const name of requiredProperties) {
    if (!found.has(name)) {
      throw new Error(`numeric range set lacks ${name}`);
    }
  }
}

/**
 * The properties webref specifies. A property outside this list has no grammar
 * to check, so its numbers cannot be proven free to vary.
 *
 * @param {WebrefData} data
 * @return {string[]} lowercased property names, sorted
 */
export function knownProperties(data) {
  const names = new Set(data.properties.map(({ name }) => name.toLowerCase()));
  return [...names].toSorted();
}
