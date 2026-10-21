// Functions whose value the browser substitutes or types at computed-value time,
// so a value holding one cannot be split or shortened statically. The
// `--name()` custom functions are substitutions too. `inherit(` is not valid CSS,
// but it stays a substitution so that the value is passed through unchanged.
const substitutionFunctions = new Set([
  'var',
  'env',
  'constant',
  'attr',
  'if',
  'inherit',
]);

/**
 * Whether a function name is one whose result is substituted at computed-value
 * time. The name must be lowercase ASCII, and a vendor prefix is not stripped.
 *
 * @param {string} name
 * @return {boolean}
 */
export function isSubstitutionFunction(name) {
  return name.startsWith('--') || substitutionFunctions.has(name);
}
