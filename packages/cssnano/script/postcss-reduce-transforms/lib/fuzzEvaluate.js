import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { matrixOfFunction } from './fuzzMatrices.js';

/**
 * A `transform` declaration's meaning: the flattened 4x4 homogeneous matrix
 * each of its functions specifies, per the CSS Transforms spec's own
 * definitions for `matrix()`/`matrix3d()`/`translate()`/`scale()`/`rotate()`
 * and axis variants. `src/index.js` only ever renames a function or reorders
 * its own argument nodes to a shorter equivalent — it never recomputes a
 * value — so comparing matrices before and after catches a wrong rename
 * independently of the plugin's own branch logic.
 */

/**
 * @typedef {object} TransformFunction
 * @property {string} name as written (case preserved for reporting)
 * @property {(number | string)[]} [matrix] present when this evaluator models
 * the function; translation entries may carry a unit-tagged string
 * @property {string} [raw] the argument text, present otherwise
 */

/**
 * @param {string} value a `transform` declaration's value
 * @return {TransformFunction[]}
 */
function evaluate(value) {
  const parsed = [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
  /** @type {TransformFunction[]} */
  const functions = [];
  const stack = [];
  for (let index = 0; index < parsed.length; index++) {
    const node = parsed[index];
    if (node[0] === TokenType.Function) {
      stack.push({ node, index });
      continue;
    }
    if (node[0] !== TokenType.CloseParen || !stack.length) continue;
    const entry = stack.pop();
    const argNodes = parsed
      .slice(entry.index + 1, index)
      .filter(
        (token) =>
          token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comma
      );
    const matrix = matrixOfFunction(
      entry.node[4].value.toLowerCase(),
      argNodes
    );
    functions.push(
      matrix
        ? { name: entry.node[4].value, matrix }
        : {
            name: entry.node[4].value,
            raw: value.slice(entry.node[3] + 1, node[2]),
          }
    );
  }

  return functions;
}

const EPSILON = 1e-6;

/** @param {number | string} cell @return {string} */
function renderMatrixCell(cell) {
  return typeof cell === 'string' ? cell : cell.toFixed(4);
}

/**
 * @param {(number | string)[]} a
 * @param {(number | string)[]} b
 * @return {boolean}
 */
function matricesClose(a, b) {
  return a.every((value, index) => {
    const other = b[index];
    if (typeof value === 'string' || typeof other === 'string')
      return value === other;
    return Math.abs(value - other) < EPSILON;
  });
}

/**
 * @param {TransformFunction[]} before
 * @param {TransformFunction[]} after
 * @return {{slot: string, expected: string, actual: string}[]}
 */
function differences(before, after) {
  if (before.length !== after.length) {
    return [
      {
        slot: 'function-count',
        expected: String(before.length),
        actual: String(after.length),
      },
    ];
  }

  const slots = [];

  for (const [index, prior] of before.entries()) {
    const next = after[index];
    const slot = `transform[${index}] (${prior.name} -> ${next.name})`;

    if (prior.matrix && next.matrix) {
      if (!matricesClose(prior.matrix, next.matrix)) {
        const render = (matrix) => matrix.map(renderMatrixCell).join(',');
        slots.push({
          slot,
          expected: render(prior.matrix),
          actual: render(next.matrix),
        });
      }
      continue;
    }

    // At least one side is a function this evaluator doesn't model
    // (`perspective()`, `var()`, ...) — the plugin never renames those, so
    // the raw argument text must be untouched.
    const priorText = prior.raw ?? '<modeled>';
    const nextText = next.raw ?? '<modeled>';

    if (prior.name !== next.name || priorText !== nextText) {
      slots.push({ slot, expected: priorText, actual: nextText });
    }
  }

  return slots;
}

export { evaluate, differences };
