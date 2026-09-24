export const lengthConv = new Map([
  ['in', 288],
  ['px', 3],
  ['pt', 4],
  ['pc', 48],
]);

export const metricConv = new Map([
  ['cm', 40],
  ['mm', 4],
  ['q', 1],
]);

export const timeConv = new Map([
  ['s', 1000],
  ['ms', 1],
]);

export const angleConv = new Map([
  ['deg', 10],
  ['turn', 3600],
  ['grad', 9],
]);

export const freqConv = new Map([
  ['khz', 1000],
  ['hz', 1],
]);

/** @typedef {{time?: boolean, length?: boolean, angle?: boolean, frequency?: boolean}} ConvertOptions */

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
 * @param {number} number
 * @param {string} originalUnit
 * @param {typeof lengthConv | typeof timeConv | typeof angleConv | typeof freqConv | typeof metricConv} conversions
 * @return {string}
 */
function findShortestConversion(number, originalUnit, conversions) {
  const base = number * /** @type {number} */ (conversions.get(originalUnit));

  let shortest = '';
  for (const [u, factor] of conversions) {
    if (u === originalUnit) {
      continue;
    }
    const convertedNumber = Number((base / factor).toPrecision(15));
    const value = dropLeadingZero(convertedNumber) + u;

    if (!shortest || value.length < shortest.length) {
      shortest = value;
    }
  }

  return shortest;
}

/**
 * @param {number} number
 * @param {string} unit
 * @return {string | undefined}
 */
function convertAngle(number, unit) {
  if (unit === 'rad') {
    return number === 0 ? '0deg' : undefined;
  }
  if (angleConv.has(unit)) {
    return findShortestConversion(number, unit, angleConv);
  }
  return undefined;
}

/**
 * @param {number} number
 * @param {string} unit
 * @param {ConvertOptions} options
 * @return {string}
 */
const convert = function (number, unit, options) {
  const { time, length, angle, frequency } = options;
  const lowerCaseUnit = unit.toLowerCase();
  let converted;
  if (length !== false && lengthConv.has(lowerCaseUnit)) {
    converted = findShortestConversion(number, lowerCaseUnit, lengthConv);
  } else if (length !== false && metricConv.has(lowerCaseUnit)) {
    converted = findShortestConversion(number, lowerCaseUnit, metricConv);
  } else if (time !== false && timeConv.has(lowerCaseUnit)) {
    converted = findShortestConversion(number, lowerCaseUnit, timeConv);
  }

  if (!converted && angle !== false) {
    converted = convertAngle(number, lowerCaseUnit);
  }
  if (!converted && frequency !== false && freqConv.has(lowerCaseUnit)) {
    converted = findShortestConversion(number, lowerCaseUnit, freqConv);
  }

  const value = dropLeadingZero(number) + (unit ? unit : '');
  if (!converted) {
    return value;
  }

  if (
    converted.length < value.length ||
    (lowerCaseUnit === 'rad' && converted.length <= value.length)
  ) {
    return converted;
  }

  return value;
};

export default convert;
