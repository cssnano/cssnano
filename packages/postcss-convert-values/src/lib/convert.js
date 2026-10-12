/**
 * @typedef {'length' | 'time' | 'angle' | 'frequency'} ConvertOption
 * @typedef {{time?: boolean, length?: boolean, angle?: boolean, frequency?: boolean}} ConvertOptions
 * @typedef {{
 *   option?: ConvertOption,
 *   factors: Map<string, number>,
 *   sourceOnly?: Set<string>,
 *   zeroOnly?: Map<string, string>,
 *   requiresZeroUnit?: boolean
 * }} UnitGroup
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
    // `rad` converts only at zero, since no exact decimal factor exists.
    zeroOnly: new Map([['rad', '0deg']]),
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
 * @param {number} number
 * @param {string} originalUnit
 * @param {UnitGroup} group
 * @return {string}
 */
function findShortestConversion(number, originalUnit, group) {
  const base = number * /** @type {number} */ (group.factors.get(originalUnit));

  let shortest = '';
  for (const [u, factor] of group.factors) {
    if (u === originalUnit || group.sourceOnly?.has(u)) {
      continue;
    }
    const convertedNumber = Number((base / factor).toPrecision(15));
    const value = formatNumber(convertedNumber) + u;

    if (!shortest || value.length < shortest.length) {
      shortest = value;
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
 * @return {string | undefined}
 */
function findConverted(number, lowerCaseUnit, group) {
  if (!group) {
    return undefined;
  }
  const zeroText = group.zeroOnly?.get(lowerCaseUnit);
  if (zeroText !== undefined) {
    return number === 0 ? zeroText : undefined;
  }
  return findShortestConversion(number, lowerCaseUnit, group);
}

/**
 * @param {string} converted
 * @param {string} value
 * @param {string} decimalValue
 * @param {string} lowerCaseUnit
 * @return {boolean}
 */
function shouldUseConverted(converted, value, decimalValue, lowerCaseUnit) {
  if (converted.length < value.length) {
    return true;
  }
  if (lowerCaseUnit === 'rad' && converted.length <= value.length) {
    return true;
  }
  return (
    converted.length === value.length &&
    !converted.includes('e') &&
    value.includes('e') &&
    converted.length < decimalValue.length
  );
}

/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} [options]
 * @return {string}
 */
const convert = function (number, unit, options = {}) {
  const lowerCaseUnit = unit.toLowerCase();
  const group = unitGroupByUnit.get(lowerCaseUnit);
  if (group?.option !== undefined && options[group.option] === false) {
    // Disabling conversion must not disable exponent formatting, so 1e-6s stays short.
    return formatNumber(number) + (unit ? unit : '');
  }

  const converted = findConverted(number, lowerCaseUnit, group);
  const decimalValue = dropLeadingZero(number) + (unit ? unit : '');
  const value = formatNumber(number) + (unit ? unit : '');

  if (
    converted &&
    shouldUseConverted(converted, value, decimalValue, lowerCaseUnit)
  ) {
    return converted;
  }

  return value;
};

export default convert;
