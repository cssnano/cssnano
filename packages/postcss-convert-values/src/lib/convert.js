const lengthConv = new Map([
  ['in', 288],
  ['px', 3],
  ['pt', 4],
  ['pc', 48],
]);

const metricConv = new Map([
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

/** @typedef {{time?: boolean, length?: boolean, angle?: boolean, frequency?: boolean, allowExponent?: boolean}} ConvertOptions */

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
 * @param {typeof lengthConv | typeof timeConv | typeof angleConv | typeof freqConv | typeof metricConv} conversions
 * @param {boolean} [allowExponent=true]
 * @return {string}
 */
function findShortestConversion(
  number,
  originalUnit,
  conversions,
  allowExponent = true
) {
  const base = number * /** @type {number} */ (conversions.get(originalUnit));

  let shortest = '';
  for (const [u, factor] of conversions) {
    if (u === originalUnit) {
      continue;
    }
    const convertedNumber = Number((base / factor).toPrecision(15));
    const value = formatNumber(convertedNumber, allowExponent) + u;

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
 * @param {string} unit
 * @param {ConvertOptions} options
 * @return {boolean}
 */
function isConversionDisabled(unit, options) {
  const { time, length, angle, frequency } = options;
  if (length === false && (lengthConv.has(unit) || metricConv.has(unit))) {
    return true;
  }
  if (time === false && timeConv.has(unit)) {
    return true;
  }
  if (angle === false && (angleConv.has(unit) || unit === 'rad')) {
    return true;
  }
  if (frequency === false && freqConv.has(unit)) {
    return true;
  }
  return false;
}

/**
 * @param {number} number
 * @param {string} lowerCaseUnit
 * @param {ConvertOptions} options
 * @return {string | undefined}
 */
function findConverted(number, lowerCaseUnit, options) {
  const { time, length, angle, frequency } = options;
  const allowExponent = options.allowExponent ?? true;
  if (length !== false) {
    if (lengthConv.has(lowerCaseUnit)) {
      return findShortestConversion(
        number,
        lowerCaseUnit,
        lengthConv,
        allowExponent
      );
    }
    if (metricConv.has(lowerCaseUnit)) {
      return findShortestConversion(
        number,
        lowerCaseUnit,
        metricConv,
        allowExponent
      );
    }
  }
  if (time !== false && timeConv.has(lowerCaseUnit)) {
    return findShortestConversion(
      number,
      lowerCaseUnit,
      timeConv,
      allowExponent
    );
  }
  if (angle !== false) {
    const convertedAngle = convertAngle(number, lowerCaseUnit);
    if (convertedAngle) {
      return convertedAngle;
    }
  }
  if (frequency !== false && freqConv.has(lowerCaseUnit)) {
    return findShortestConversion(
      number,
      lowerCaseUnit,
      freqConv,
      allowExponent
    );
  }
  return undefined;
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
  if (isConversionDisabled(lowerCaseUnit, options)) {
    return dropLeadingZero(number) + (unit ? unit : '');
  }

  const converted = findConverted(number, lowerCaseUnit, options);
  const decimalValue = dropLeadingZero(number) + (unit ? unit : '');
  const value =
    formatNumber(number, options.allowExponent ?? true) + (unit ? unit : '');

  if (
    converted &&
    shouldUseConverted(converted, value, decimalValue, lowerCaseUnit)
  ) {
    return converted;
  }

  return value;
};

export default convert;
