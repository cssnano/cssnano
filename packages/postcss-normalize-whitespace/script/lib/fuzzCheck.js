import postcss from 'postcss';
import plugin from '../../src/index.js';

/**
 * Runs one generated declaration through the plugin and checks that the
 * output is still syntactically sound and that a real trailing escape's
 * target character survives. Shared by the seeded sweep in
 * `test/fuzz.js` and the soak run in `script/fuzz.js`.
 */

const processor = postcss([plugin()]);

/**
 * @param {string} css
 * @return {string}
 */
function process(css) {
  return processor.process(css, { from: undefined }).css;
}

const hexDigitRegex = /[0-9a-fA-F]/;

/**
 * @typedef {object} Mismatch
 * @property {string} input
 * @property {string} output the plugin's output, or the message it threw with.
 * @property {string} reason
 */

/**
 * @param {import('./fuzzGenerate.js').Case} testCase
 * @return {Mismatch|undefined} undefined when nothing broke.
 */
function check({ css, lastProp, siblingCount, escapeChar, backslashCount }) {
  /** @type {string} */
  let output;

  try {
    output = process(css);
  } catch (error) {
    return {
      input: css,
      output: error instanceof Error ? error.message : String(error),
      reason: 'the plugin threw',
    };
  }

  /** @type {import('postcss').Root} */
  let reparsed;

  try {
    reparsed = postcss.parse(output);
  } catch (error) {
    return {
      input: css,
      output,
      reason: `output did not reparse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (reparsed.nodes.length !== 1) {
    return {
      input: css,
      output,
      reason: `expected 1 top-level rule, got ${reparsed.nodes.length}`,
    };
  }

  const container = reparsed.nodes[0];
  const decls = 'nodes' in container ? container.nodes : [];

  if (decls.length !== siblingCount + 1) {
    return {
      input: css,
      output,
      reason: `expected ${siblingCount + 1} declarations, got ${decls.length}`,
    };
  }

  const last = decls[decls.length - 1];

  if (last.type !== 'decl' || last.prop !== lastProp) {
    return {
      input: css,
      output,
      reason: `expected the last declaration's property to be ${lastProp}, got ${'prop' in last ? last.prop : last.type}`,
    };
  }

  // A hex-digit target (`\9`, `\a`, …) is a hex escape, not a
  // single-character one: PostCSS already captures it — and its own
  // optional trailing-whitespace terminator — directly into the
  // declaration's value during parsing, without ever routing through
  // the container's raws.after. It never exercises the bug this fuzzer
  // targets, so only the structural checks above apply to it.
  if (backslashCount % 2 === 1 && !hexDigitRegex.test(escapeChar)) {
    const total = last.toString() + (container.raws.after ?? '');
    const escapeSequence = '\\'.repeat(backslashCount) + escapeChar;

    // Whether the escape is trimmed down to exactly this sequence (the
    // no-semicolon path this plugin rewrites) or left inside an
    // untouched raw with more content after it (PostCSS captured the
    // whole thing into raws.value itself, e.g. when a semicolon
    // followed in the source) is a minification detail pinned by named
    // tests. What must always hold is that the sequence survives
    // intact somewhere, preceded by exactly this many backslashes and
    // not more.
    if (
      !total.includes(escapeSequence) ||
      total.includes(`\\${escapeSequence}`)
    ) {
      return {
        input: css,
        output,
        reason: `expected the escape sequence ${JSON.stringify(escapeSequence)} to survive intact, last declaration was ${JSON.stringify(total)}`,
      };
    }
  }

  return undefined;
}

/**
 * @param {Mismatch} failure
 * @param {number} seed
 * @return {string}
 */
function report(failure, seed) {
  return [
    `seed ${seed}: ${failure.reason}`,
    `  in:  ${failure.input}`,
    `  out: ${failure.output}`,
  ].join('\n');
}
export { check };
export { report };
export default {
  check,
  report,
};
