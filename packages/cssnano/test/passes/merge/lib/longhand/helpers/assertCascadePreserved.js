import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceColumnsRuns } from './reduceRuns.js';
import {
  environments,
  evaluateColumns,
} from '../../../../../../script/passes/merge/longhand/lib/columnsCascadeOracle.js';

/**
 * Asserts that the computed cascade state of a rule is preserved across all
 * support environments after reduction.
 * @param {string} css
 */
export function assertCascadePreserved(css) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  reduceColumnsRuns(rule);
  const outCss = root.toString();

  for (const { name, env } of environments) {
    const inState = evaluateColumns(css, env);
    const outState = evaluateColumns(outCss, env);
    assert.deepStrictEqual(
      outState,
      inState,
      `Cascade mismatch in environment "${name}":\n  input:    ${css}\n  reduced:  ${outCss}\n  expected: ${JSON.stringify(inState)}\n  actual:   ${JSON.stringify(outState)}`
    );
  }
}
