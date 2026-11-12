import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { RunContext } from '../../../ir/runContext.js';
import type { DeclarationKeys } from '../../../ir/declarationKey.js';
export type Scope = {
    decls?: Set<number>;
    ruleDecls?: Map<string, Set<number>>;
    children?: Map<number, Scope>;
};
export type Run = {
    records: BlockRecords;
    keys: DeclarationKeys;
    layered: Set<number>;
};
/**
 * Removes duplicate rules, declarations and at-rules from the records. Each
 * removal takes effect in the records at once; write-back writes them out.
 *
 * @param {BlockRecords} records
 * @param {readonly string[]} _browsers unused: dedupe does not depend on the targets
 * @param {RunContext} context the run's state, whose ids the records use
 * @return {void}
 */
export declare function discardDuplicates(records: BlockRecords, _browsers: readonly string[], context: RunContext): void;
//# sourceMappingURL=discardDuplicates.d.ts.map