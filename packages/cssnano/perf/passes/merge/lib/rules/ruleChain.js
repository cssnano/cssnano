import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  appendToDeclarations,
  buildRecords,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { assertLinearTime } from '../linearTiming.js';

/**
 * The records of `css`, as the run builds them. The first rule of a stylesheet
 * is the entry after its root, so it has index 1.
 *
 * @param {string} css
 * @return {{state: MergeState, rule: import('../../../../../src/passes/merge/lib/rules/ruleRecord.js').RuleRecord}}
 */
function recordsOf(css) {
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(postcss.parse(css), state);
  return { state, rule: state.records.rule(1) };
}

/**
 * @param {number} count
 * @return {string} a rule of `count` declarations with distinct properties
 */
function ruleOf(count) {
  return `a{${Array.from({ length: count }, (_, i) => `--c${i}:0`).join(';')}}`;
}

/**
 * Appends `size` declarations to an empty rule, reading the declaration list
 * after each append, and returns the time of those appends.
 *
 * @param {number} size
 * @return {number} milliseconds
 */
function timeAppendsAndReads(size) {
  const { state, rule } = recordsOf('a{}');
  const { records } = state;
  const nodes = Array.from({ length: size }, (_, i) =>
    postcss.decl({ prop: `--c${i}`, value: '0' })
  );
  let seen = 0;
  const start = performance.now();
  for (const node of nodes) {
    records.appendChild(
      rule,
      records.blockDeclaration(node, state.properties, state.declarationIds)
    );
    seen += rule.declarationKeys(records).keys.length;
  }
  const elapsed = performance.now() - start;
  if (seen < 0) throw new Error('unreachable');
  return elapsed;
}

/**
 * Unlinks every other declaration of a rule of `size` declarations, one link at
 * a time, and reads the declaration list once after them. Returns the time of
 * the unlinks and that read.
 *
 * @param {number} size
 * @return {number} milliseconds
 */
function timeUnlinksThenRead(size) {
  const { state, rule } = recordsOf(ruleOf(size));
  const { records } = state;
  const declarations = rule.declarationsOf(records);
  const start = performance.now();
  for (let i = 0; i < size; i += 2) records.links.unlink(declarations[i].index);
  const left = rule.declarationKeys(records).keys.length;
  const elapsed = performance.now() - start;
  if (left < 0) throw new Error('unreachable');
  return elapsed;
}

/**
 * Appends to a rule of `size` declarations a rule that redeclares each of them
 * with another value, after a comment, and returns the time of that append.
 *
 * @param {number} size
 * @return {number} milliseconds
 */
function timeConflictingAppend(size) {
  const redeclared = Array.from(
    { length: size },
    (_, i) => `/*c*/--c${i}:1`
  ).join(';');
  const { state, rule } = recordsOf(`${ruleOf(size)}a{${redeclared}}`);
  const { records } = state;
  const incoming = records.rule(records.links.nextSibling(rule.index));
  const declarations = rule.declarationsOf(records);
  const writes = writesOf(declarations);
  const start = performance.now();
  appendToDeclarations(state, rule, declarations, writes, incoming);
  const elapsed = performance.now() - start;
  if (rule.count < 0) throw new Error('unreachable');
  return elapsed;
}

// Each incoming declaration is compared with the declaration it overrides,
// and each comment ends the rule, so neither must start a walk of its chain.
test('appending a rule that redeclares every declaration of the receiving rule takes linear time as the rule grows', () => {
  assertLinearTime(timeConflictingAppend, 64000);
});

// Each append is read at once, so the list must be kept across the appends
// rather than rebuilt from the chain each time.
test('appending declarations and reading their list after each takes linear time as the rule grows', () => {
  assertLinearTime(timeAppendsAndReads, 80000);
});

// A single unlink drops the list, so the unlinks must not each rebuild it.
test('unlinking many declarations of a rule and reading the list once takes linear time as the rule grows', () => {
  assertLinearTime(timeUnlinksThenRead, 20000);
});
