import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex } from './blockRecord.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { TokenListId } from './tokenLists.js';
import type { RunContext } from './runContext.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RunContext} from './runContext.js' */
/**
 * Writes the value of a declaration in place: its list is interned in the run,
 * and its container's stamp moves so write-back writes it.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index the declaration's index
 * @param {readonly CSSToken[]} list the value's tokens
 * @return {void}
 */
export declare function writeValue(records: BlockRecords, context: RunContext, index: ArenaIndex, list: readonly CSSToken[]): void;
/**
 * Writes the value of a declaration in place, as an id the run already gives:
 * the list of a fold's result, which needs no interning again. The container's
 * stamp moves so write-back writes it.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index the declaration's index
 * @param {TokenListId} valueList the id of the value's list, interned in the run
 * @return {void}
 */
export declare function writeValueList(records: BlockRecords, context: RunContext, index: ArenaIndex, valueList: TokenListId): void;
//# sourceMappingURL=valueEdits.d.ts.map