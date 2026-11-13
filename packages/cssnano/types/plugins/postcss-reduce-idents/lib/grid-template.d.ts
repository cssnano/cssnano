import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { RunContext } from '../../../passes/ir/runContext.js';
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function gridTemplateReducer(encoder: (value: string, index: number) => string): {
    /**
     * @param {ArenaIndex} index
     * @param {BlockRecords} records
     */
    collect(index: ArenaIndex, records: BlockRecords): void;
    /**
     * @param {BlockRecords} records
     * @param {RunContext} context
     */
    transform(records: BlockRecords, context: RunContext): void;
};
//# sourceMappingURL=grid-template.d.ts.map