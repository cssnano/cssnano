/* CSS Values 4 math functions, grouped by the result type the spec fixes for
 * them. Membership is the shared table every plugin projects from; a plugin
 * that needs a narrower set (widely-implemented functions only, length-producing
 * functions only) filters this one rather than re-listing names. */
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
