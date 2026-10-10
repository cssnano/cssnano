/* CSS Values 4 math functions, mapped to the inclusive range of how many
 * arguments each accepts. */
/** @type {ReadonlyMap<string, readonly [number, number]>} */
const mathFunctions = new Map([
  // Type of the arguments: can yield a length, angle, time, number or
  // percentage.
  ['abs', [1, 1]],
  ['calc', [1, 1]],
  ['clamp', [3, 3]],
  ['hypot', [1, Infinity]],
  ['max', [1, Infinity]],
  ['min', [1, Infinity]],
  ['mod', [2, 2]],
  ['rem', [2, 2]],
  ['round', [1, 2]],
  ['sign', [1, 1]],
  // Always <number>.
  ['cos', [1, 1]],
  ['exp', [1, 1]],
  ['log', [1, 2]],
  ['pow', [2, 2]],
  ['sin', [1, 1]],
  ['sqrt', [1, 1]],
  ['tan', [1, 1]],
  // Always <angle>.
  ['acos', [1, 1]],
  ['asin', [1, 1]],
  ['atan', [1, 1]],
  ['atan2', [2, 2]],
]);

export default mathFunctions;
