/* CSS Values 4 math functions */
const mathFunctions = new Set([
  // Type of the arguments: can yield a length, angle, time, number or
  // percentage.
  'abs',
  'calc',
  'clamp',
  'hypot',
  'max',
  'min',
  'mod',
  'rem',
  'round',
  'sign',
  // Always <number>.
  'cos',
  'exp',
  'log',
  'pow',
  'sin',
  'sqrt',
  'tan',
  // Always <angle>.
  'acos',
  'asin',
  'atan',
  'atan2',
]);

export default mathFunctions;
