import { BlockDeclarations } from './blockDeclarations.js';
import type { ArenaIndex } from '../rules/blockRecord.js';
import type { BlockRecords } from '../rules/blockRecords.js';
import type { RunContext } from '../../../ir/runContext.js';
/**
 * Reads the declarations of a block's chain into a list, with the run ends
 * among them. The list holds the declarations' text and tokens; the records
 * are read, not written.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context the run's token lists, which the value lists name
 * @param {ArenaIndex} container the index of the block or rule
 * @return {BlockDeclarations}
 */
export declare function declarationsFromRecords(records: BlockRecords, context: RunContext, container: ArenaIndex): BlockDeclarations;
//# sourceMappingURL=recordDeclarations.d.ts.map