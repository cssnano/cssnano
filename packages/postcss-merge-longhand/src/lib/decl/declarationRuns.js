/** @import {Container, Declaration} from 'postcss'; */

/**
 * A nested rule or at-rule ends a run of declarations: declarations after it
 * cascade after its own, so a shorthand merged across it would override them.
 * An empty style rule declares nothing and does not end a run.
 *
 * @param {import('postcss').ChildNode} node
 * @return {boolean}
 */
export function endsDeclarationRun(node) {
  if (node.type === 'atrule') return true;
  return node.type === 'rule' && node.nodes.length > 0;
}

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
 * Reduces each run of a container's declarations on its own, for callers
 * that did not say which declarations to reduce.
 *
 * @param {Container} container
 * @param {(declaration: Declaration) => boolean} belongsToFamily
 * @param {(runDeclarations: Declaration[]) => void} reduce
 * @return {void}
 */
export function reduceEachRun(container, belongsToFamily, reduce) {
  for (const run of declarationRuns(container)) {
    const familyDeclarations = run.filter(belongsToFamily);
    if (familyDeclarations.length > 0) reduce(familyDeclarations);
  }
}
