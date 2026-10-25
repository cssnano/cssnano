/**
 * @typedef {'length' | 'time' | 'angle' | 'frequency'} ConvertOption
 * @typedef {object} ConvertOptions
 * @property {boolean} [time] Converts between `ms` and `s`. (default: true)
 * @property {boolean} [length] Converts among `px`, `pt`, `pc` and `in`; `cm` and `mm` always convert. The default preset sets it to false. (default: true)
 * @property {boolean} [angle] Converts between `deg` and `turn`. (default: true)
 * @property {boolean} [frequency] Converts between `Hz` and `kHz`. (default: true)
 * @typedef {{
 *   option?: ConvertOption,
 *   factors: Map<string, number>,
 *   sourceOnly?: Set<string>,
 *   zeroOnly?: Map<string, string>,
 *   requiresZeroUnit?: boolean
 * }} UnitGroup
 */

/**
 * A number and its unit, as the text of a token spells them. A spelling the
 * source already has keeps the whole text as its representation, with no unit.
 * @typedef {{representation: string, unit: string}} Spelling
 */

/**
 * Each group converts only among its own units. `option` is the ConvertOptions
 * key that disables the group; a group without one always converts. Metric
 * units relate by exact decimal factors, so `length: false` leaves them
 * converting. `q` is newer than the CSS 1 lengths and is never a target.
 * `requiresZeroUnit` marks types where a unitless 0 is invalid.
 *
 * @type {UnitGroup[]}
 */
const unitGroups = [
  {
    option: 'length',
    factors: new Map([
      ['in', 288],
      ['px', 3],
      ['pt', 4],
      ['pc', 48],
    ]),
  },
  {
    factors: new Map([
      ['cm', 40],
      ['mm', 4],
      ['q', 1],
    ]),
    sourceOnly: new Set(['q']),
  },
  {
    option: 'time',
    factors: new Map([
      ['s', 1000],
      ['ms', 1],
    ]),
    requiresZeroUnit: true,
  },
  {
    option: 'angle',
    factors: new Map([
      ['deg', 10],
      ['turn', 3600],
      ['grad', 9],
    ]),
    // `rad` converts only at zero, since no exact decimal factor exists. The
    // map gives the unit a zero takes.
    zeroOnly: new Map([['rad', 'deg']]),
    requiresZeroUnit: true,
  },
  {
    option: 'frequency',
    factors: new Map([
      ['khz', 1000],
      ['hz', 1],
    ]),
    requiresZeroUnit: true,
  },
];

// A unit in two groups would have two conversion tables, so building the map throws instead.
/** @type {Map<string, UnitGroup>} */
const unitGroupByUnit = new Map();
for (const group of unitGroups) {
  for (const unit of [
    ...group.factors.keys(),
    ...(group.zeroOnly?.keys() ?? []),
  ]) {
    if (unitGroupByUnit.has(unit)) {
      throw new Error(
        `Unit "${unit}" belongs to more than one conversion group`
      );
    }
    unitGroupByUnit.set(unit, group);
  }
}

/**
 * @param {string} lowerCaseUnit
 * @return {boolean}
 */
export function requiresZeroUnit(lowerCaseUnit) {
  return unitGroupByUnit.get(lowerCaseUnit)?.requiresZeroUnit === true;
}

/**
 * Accurately round a number to a fixed decimal precision without IEEE-754 binary
 * floating point multiplication errors.
 *
 * @param {number} value
 * @param {number} precision
 * @return {number}
 */
export function roundToPrecision(value, precision) {
  if (
    typeof precision !== 'number' ||
    precision < 0 ||
    !Number.isFinite(precision) ||
    !Number.isFinite(value)
  ) {
    return value;
  }
  const p = Math.floor(precision);
  const [mantissa, exponent = 0] = String(value).toLowerCase().split('e');
  const shifted = Number(mantissa + 'e' + (Number(exponent) + p));
  const rounded = (Math.sign(shifted) || 0) * Math.round(Math.abs(shifted));
  return Number(rounded + 'e-' + p);
}

/**
 * Compute the shortest exact scientific notation for a number if one exists.
 *
 * @param {number} num
 * @return {string | undefined}
 */
export function toCompactExponent(num) {
  if (num === 0 || !Number.isFinite(num)) {
    return undefined;
  }
  const abs = Math.abs(num);
  if (Number.isInteger(num) && abs > Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  const sign = num < 0 ? '-' : '';
  const expStr = abs.toExponential();
  const eIndex = expStr.indexOf('e');
  const mantissaStr = expStr.slice(0, eIndex);
  const baseExp = Number(expStr.slice(eIndex + 1));
  const dotIndex = mantissaStr.indexOf('.');

  if (dotIndex === -1) {
    const candidate = sign + mantissaStr + 'e' + baseExp;
    return Number(candidate) === num ? candidate : undefined;
  }

  const digits =
    mantissaStr.slice(0, dotIndex) + mantissaStr.slice(dotIndex + 1);
  const decPlaces = mantissaStr.length - dotIndex - 1;
  const candidate1 = sign + digits + 'e' + (baseExp - decPlaces);
  if (Number(candidate1) === num) {
    return candidate1;
  }

  const candidate2 = sign + mantissaStr + 'e' + baseExp;
  if (Number(candidate2) === num) {
    return candidate2;
  }

  return undefined;
}

/**
 * @param {number} number
 * @return {string}
 */
export function dropLeadingZero(number) {
  const value = String(number);

  if (number % 1) {
    if (value[0] === '0') {
      return value.slice(1);
    }

    if (value[0] === '-' && value[1] === '0') {
      return '-' + value.slice(2);
    }
  }

  return value;
}

/**
 * Format a number using standard decimal or compact exponent notation.
 *
 * @param {number} number
 * @param {boolean} [allowExponent=true]
 * @return {string}
 */
export function formatNumber(number, allowExponent = true) {
  const decimal = dropLeadingZero(number);
  if (!allowExponent) {
    return decimal;
  }
  const abs = Math.abs(number);
  if (abs >= 0.001 && abs < 1000) {
    return decimal;
  }
  if (Number.isInteger(number) && number % 1000 !== 0) {
    return decimal;
  }
  const exp = toCompactExponent(number);
  if (exp && exp.length < decimal.length) {
    return exp;
  }
  return decimal;
}

/**
 * The length of a spelling as its text: the representation and the unit.
 *
 * @param {Spelling} spelling
 * @return {number}
 */
export function spelledLength(spelling) {
  return spelling.representation.length + spelling.unit.length;
}

/**
 * @param {number} number
 * @param {string} originalUnit
 * @param {UnitGroup} group
 * @return {Spelling | undefined}
 */
function findShortestConversion(number, originalUnit, group) {
  const base = number * /** @type {number} */ (group.factors.get(originalUnit));

  /** @type {Spelling | undefined} */
  let shortest;
  for (const [u, factor] of group.factors) {
    if (u === originalUnit || group.sourceOnly?.has(u)) {
      continue;
    }
    const convertedNumber = Number((base / factor).toPrecision(15));
    const candidate = {
      representation: formatNumber(convertedNumber),
      unit: u,
    };

    if (
      shortest === undefined ||
      spelledLength(candidate) < spelledLength(shortest)
    ) {
      shortest = candidate;
    }
  }

  return shortest;
}

/**
 * Called only for units whose conversion is enabled by the options.
 *
 * @param {number} number
 * @param {string} lowerCaseUnit
 * @param {UnitGroup | undefined} group
 * @return {Spelling | undefined}
 */
function findConverted(number, lowerCaseUnit, group) {
  if (!group) {
    return undefined;
  }
  const zeroUnit = group.zeroOnly?.get(lowerCaseUnit);
  if (zeroUnit !== undefined) {
    return number === 0 ? { representation: '0', unit: zeroUnit } : undefined;
  }
  return findShortestConversion(number, lowerCaseUnit, group);
}

/**
 * Whether the text of a spelling has an `e`, in the exponent or in a unit.
 *
 * @param {Spelling} spelling
 * @return {boolean}
 */
function hasExponentLetter(spelling) {
  return spelling.representation.includes('e') || spelling.unit.includes('e');
}

/**
 * @param {Spelling} converted
 * @param {Spelling} value
 * @param {number} decimalLength the length of the spelling without a leading zero
 * @param {string} lowerCaseUnit
 * @return {boolean}
 */
function shouldUseConverted(converted, value, decimalLength, lowerCaseUnit) {
  const convertedLength = spelledLength(converted);
  const valueLength = spelledLength(value);
  if (convertedLength < valueLength) {
    return true;
  }
  if (lowerCaseUnit === 'rad' && convertedLength <= valueLength) {
    return true;
  }
  return (
    convertedLength === valueLength &&
    !hasExponentLetter(converted) &&
    hasExponentLetter(value) &&
    convertedLength < decimalLength
  );
}

/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} [options]
 * @return {Spelling}
 */
const convert = function (number, unit, options = {}) {
  const lowerCaseUnit = unit.toLowerCase();
  const group = unitGroupByUnit.get(lowerCaseUnit);
  if (group?.option !== undefined && options[group.option] === false) {
    // Disabling conversion must not disable exponent formatting, so 1e-6s stays short.
    return { representation: formatNumber(number), unit };
  }

  const converted = findConverted(number, lowerCaseUnit, group);
  const decimalLength = dropLeadingZero(number).length + unit.length;
  const value = { representation: formatNumber(number), unit };

  if (
    converted &&
    shouldUseConverted(converted, value, decimalLength, lowerCaseUnit)
  ) {
    return converted;
  }

  return value;
};

export default convert;
