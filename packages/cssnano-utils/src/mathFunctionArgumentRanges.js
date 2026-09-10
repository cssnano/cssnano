/* CSS Values 4 math-function argument ranges. A range is inclusive. */
const mathFunctionArgumentRanges = new Map([
  ['abs', [1, 1]],
  ['acos', [1, 1]],
  ['asin', [1, 1]],
  ['atan', [1, 1]],
  ['atan2', [2, 2]],
  ['calc', [1, 1]],
  ['clamp', [3, 3]],
  ['cos', [1, 1]],
  ['exp', [1, 1]],
  ['hypot', [1, Infinity]],
  ['log', [1, 2]],
  ['max', [1, Infinity]],
  ['min', [1, Infinity]],
  ['mod', [2, 2]],
  ['pow', [2, 2]],
  ['rem', [2, 2]],
  ['round', [1, 2]],
  ['sign', [1, 1]],
  ['sin', [1, 1]],
  ['sqrt', [1, 1]],
  ['tan', [1, 1]],
]);

export default mathFunctionArgumentRanges;
