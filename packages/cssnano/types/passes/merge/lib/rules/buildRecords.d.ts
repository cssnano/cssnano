import { BlockRecords } from './blockRecords.js';
import type { Root } from 'postcss';
import type { RunContext } from '../../../ir/runContext.js';
/**
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent, and every rule is a container whose
 * children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {BlockRecords}
 */
export declare function buildRecords(root: Root, context: RunContext): BlockRecords;
//# sourceMappingURL=buildRecords.d.ts.map