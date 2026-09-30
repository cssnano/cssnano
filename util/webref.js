/**
 * Matches a reference to another CSS grammar production.
 */
export const REFERENCE = /<(?:'([^'>]+)'|([^'>\s]+)(?:\s+\[[^\]]*\])?)>/gv;

/**
 * Returns the literal keywords a grammar offers. Function calls do not count:
 * their names cannot be written as bare keywords.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function keywordTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const keywords = [];

  for (const match of literals.matchAll(/[a-zA-Z][a-zA-Z0-9\-]*/gv)) {
    const [keyword] = match;
    const rest = literals.slice(
      /** @type {number} */ (match.index) + keyword.length
    );

    if (!/^\s*\(/v.test(rest)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * The productions a grammar names directly, without following them any
 * further. Property references are returned quoted, the way they are spelled,
 * so that `<'color'>` cannot be mistaken for `<color>`.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function directReferences(syntax) {
  if (!syntax) {
    return [];
  }
  /** @type {string[]} */
  const references = [];
  for (const [, property, type] of syntax.matchAll(REFERENCE)) {
    references.push(property === undefined ? type : `'${property}'`);
  }
  return references;
}

/**
 * Splits a function's grammar into its comma separated arguments, e.g.
 * `counters( <counter-name>, <string>, <counter-style>? )` into three. Commas
 * nested in a group belong to that group rather than to the argument list.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function functionArguments(syntax) {
  if (!syntax) {
    return [];
  }
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close <= open) {
    return [];
  }
  const body = syntax.slice(open + 1, close);
  if (!body.trim()) {
    return [];
  }
  /** @type {string[]} */
  const args = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const character = body[i];
    if (character === '[' || character === '(' || character === '{') {
      depth++;
    } else if (character === ']' || character === ')' || character === '}') {
      depth--;
    } else if (character === ',' && depth === 0) {
      args.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(body.slice(start).trim());
  return args;
}
