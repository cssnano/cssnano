import { RUN_END } from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js';
import { isAll } from '../../../../../../src/passes/merge/lib/longhand/decl/importanceLanes.js';

/** @import {BlockDeclarations} from '../../../../../../src/passes/merge/lib/longhand/blockDeclarations.js' */

/* The plugin collects runs and lanes while it classifies declarations; tests
 * that call a reducer directly rebuild them from the block. */

/**
 * Splits the declarations of a block into runs that may be merged
 * independently, by position in the list.
 *
 * @param {BlockDeclarations} list
 * @return {number[][]}
 */
export function declarationRuns(list) {
  /** @type {number[][]} */
  const runs = [];
  /** @type {number[]} */
  let run = [];
  for (const entry of list.chain) {
    if (entry === RUN_END) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else {
      run.push(entry);
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {BlockDeclarations} list
 * @param {number[]} declarations positions in `list`
 * @return {[number[], number[]]}
 */
export function importanceLanes(list, declarations) {
  const live = declarations.filter((p) => !list.at(p).removed);
  /** @type {[number[], number[]]} */
  const lanes = [[], []];

  if (!list.chain.some((p) => p !== RUN_END && isAll(list.at(p)))) {
    for (const p of live) {
      lanes[list.at(p).important ? 1 : 0].push(p);
    }
    return lanes;
  }

  // Another run of the same rule cannot be overridden by or override these.
  const liveSet = new Set(live);
  const scope = declarationRuns(list)
    .filter((run) => run.some((p) => liveSet.has(p)))
    .flat();

  for (const p of scope) {
    if (liveSet.has(p) || isAll(list.at(p))) {
      lanes[list.at(p).important ? 1 : 0].push(p);
    }
  }

  return lanes;
}
