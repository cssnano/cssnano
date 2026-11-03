import postcss from 'postcss';
import { transformPass } from '#passes/merge';
import { discardDuplicates as referenceDedupe } from './referenceDedupe.js';
import { generateDuplicateCases, serializeNode } from './generate.js';

/** @import {AtRule, Container, Root} from 'postcss' */

// The hooks run on the same browsers in the mutant and the reference, so the
// comparison does not depend on the targets.
const browsers = [];
const dedupeHook = transformPass('discardDuplicates');
const mergeHook = transformPass('mergeRules');
const dedupeThenMergeHook = transformPass('dedupeThenMerge');

/**
 * @param {string} input
 * @return {Root}
 */
function parse(input) {
  return postcss.parse(input, { from: undefined });
}

/**
 * The output of the frozen dedupe, the oracle for the hook.
 *
 * @param {string} input
 * @return {string}
 */
export function referenceDedupeOutput(input) {
  const root = parse(input);
  referenceDedupe(root);
  return root.toString();
}

/**
 * The output of the frozen dedupe followed by the merge hook.
 *
 * @param {string} input
 * @return {string}
 */
export function referenceDedupeThenMergeOutput(input) {
  const root = parse(input);
  referenceDedupe(root);
  mergeHook(root, browsers);
  return root.toString();
}

/**
 * Whether a block at-rule holds a layer, at any depth, or is one.
 *
 * @param {AtRule} atrule
 * @return {boolean}
 */
function holdsLayer(atrule) {
  if (atrule.name.toLowerCase() === 'layer') return true;
  let found = false;
  atrule.walkAtRules('layer', () => {
    found = true;
    return false;
  });
  return found;
}

/**
 * The first sibling pair of block at-rules, other than `@import`, that
 * serialize equally in a stylesheet and hold no layer. Dedupe keeps one of
 * each such pair.
 *
 * @param {string} output
 * @return {string | undefined} a description of the pair, or undefined when none exists
 */
export function duplicateSiblingViolation(output) {
  const root = parse(output);
  /** @type {Container[]} */
  const containers = [root];
  root.walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') {
      containers.push(/** @type {Container} */ (node));
    }
  });
  for (const container of containers) {
    /** @type {Map<string, AtRule>} */
    const seen = new Map();
    for (const node of container.nodes ?? []) {
      if (node.type !== 'atrule' || !node.nodes) continue;
      if (node.name === 'import' || holdsLayer(node)) continue;
      const key = serializeNode(node);
      if (seen.has(key))
        return `@${node.name} ${node.params} repeats a sibling`;
      seen.set(key, node);
    }
  }
  return undefined;
}

/**
 * The mutation suites for `util/mutation-testing/mutation-runner.js --check
 * oracle`. Each check reads the input and the output only. `run` calls the
 * hook, so a mutant of `discardDuplicates.js` reaches the run.
 */
export const suites = [
  {
    name: 'dedupe',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) => generateDuplicateCases(seed, count),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) => {
      const root = parse(input);
      dedupeHook(root, browsers);
      return root.toString();
    },
    /**
     * @param {string} input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (input, output) => {
      const expected = referenceDedupeOutput(input);
      return output === expected
        ? undefined
        : `dedupe output differs from the reference: ${expected}`;
    },
  },
  {
    name: 'dedupeThenMerge',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) => generateDuplicateCases(seed, count),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) => {
      const root = parse(input);
      dedupeThenMergeHook(root, browsers);
      return root.toString();
    },
    /**
     * @param {string} input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (input, output) => {
      const expected = referenceDedupeThenMergeOutput(input);
      return output === expected
        ? undefined
        : `dedupe then merge differs from the reference: ${expected}`;
    },
  },
  {
    name: 'properties',
    /**
     * @param {number} seed
     * @param {number} count
     * @return {string[]}
     */
    generate: (seed, count) => generateDuplicateCases(seed, count),
    /**
     * @param {string} input
     * @return {string}
     */
    run: (input) => {
      const root = parse(input);
      dedupeHook(root, browsers);
      return root.toString();
    },
    /**
     * @param {string} _input
     * @param {string} output
     * @return {string | undefined}
     */
    check: (_input, output) => duplicateSiblingViolation(output),
    /**
     * @param {string} input
     * @param {string} output
     * @param {(css: string) => string | null} run
     * @return {string | undefined}
     */
    checkRun: (input, output, run) =>
      run(output) === output ? undefined : 'dedupe is not idempotent',
  },
];
