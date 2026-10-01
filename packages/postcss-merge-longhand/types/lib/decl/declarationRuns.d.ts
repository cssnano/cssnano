/** @import {Container, Declaration} from 'postcss'; */
import type { Container, Declaration } from 'postcss';
/**
 * A nested rule or at-rule ends a run of declarations: declarations after it
 * cascade after its own, so a shorthand merged across it would override them.
 * An empty style rule declares nothing and does not end a run.
 *
 * @param {import('postcss').ChildNode} node
 * @return {boolean}
 */
export declare function endsDeclarationRun(node: import('postcss').ChildNode): boolean;
/**
 * Splits the declarations of a container into runs that may be merged
 * independently.
 *
 * @param {Container} container
 * @return {Declaration[][]}
 */
export declare function declarationRuns(container: Container): Declaration[][];
/**
 * Reduces each run of a container's declarations on its own, for callers
 * that did not say which declarations to reduce.
 *
 * @param {Container} container
 * @param {(declaration: Declaration) => boolean} belongsToFamily
 * @param {(runDeclarations: Declaration[]) => void} reduce
 * @return {void}
 */
export declare function reduceEachRun(container: Container, belongsToFamily: (declaration: Declaration) => boolean, reduce: (runDeclarations: Declaration[]) => void): void;
//# sourceMappingURL=declarationRuns.d.ts.map