import { endsDeclarationRun } from '../../src/lib/decl/declarationRuns.js';
import { isAll } from '../../src/lib/decl/importanceLanes.js';

/** @import {Container, Declaration} from 'postcss'; */

/* The plugin collects runs and lanes while it classifies declarations; tests
 * that call a reducer directly rebuild them from the rule. */

/**
 * Splits the declarations of a container into runs that may be merged
 * independently.
 *
 * @param {Container} container
 * @return {Declaration[][]}
 */
export function declarationRuns(container) {
  /** @type {Declaration[][]} */
  const runs = [];
  /** @type {Declaration[]} */
  let run = [];
  for (const node of container.nodes ?? []) {
    if (endsDeclarationRun(node)) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else if (node.type === 'decl') {
      run.push(node);
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {Container} rule
 * @param {Declaration[]} declarations
 * @return {[Declaration[], Declaration[]]}
 */
export function importanceLanes(rule, declarations) {
  const live = declarations.filter((d) => d.parent === rule);
  /** @type {[Declaration[], Declaration[]]} */
  const lanes = [[], []];

  if (!rule.nodes?.some((n) => n.type === 'decl' && isAll(n))) {
    for (const node of live) {
      lanes[node.important ? 1 : 0].push(node);
    }
    return lanes;
  }

  // Another run of the same rule cannot be overridden by or override these.
  const liveSet = new Set(live);
  const scope = declarationRuns(rule)
    .filter((run) => run.some((d) => liveSet.has(d)))
    .flat();

  for (const node of scope) {
    if (liveSet.has(node) || isAll(node)) {
      lanes[node.important ? 1 : 0].push(node);
    }
  }

  return lanes;
}
