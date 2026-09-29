/**
 * Apply one curated source mutation without touching the source file.
 *
 * @param {string} source
 * @param {{ find: string, replace: string }} mutation
 * @returns {string}
 */
export function applyMutation(source, mutation) {
  const first = source.indexOf(mutation.find);
  if (first === -1) {
    throw new Error(`Mutation fragment was not found: ${mutation.find}`);
  }

  if (source.lastIndexOf(mutation.find) !== first) {
    throw new Error(
      `Mutation fragment matched more than once: ${mutation.find}`
    );
  }

  return `${source.slice(0, first)}${mutation.replace}${source.slice(
    first + mutation.find.length
  )}`;
}
