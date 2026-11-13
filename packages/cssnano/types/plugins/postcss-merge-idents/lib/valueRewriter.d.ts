export type Replacement = {
    text: string;
    value: string;
    isString: boolean;
    absorbsWhitespace: boolean;
};
export type TokenEdit = import('../../../values/valueBuffer.js').TokenEdit;
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type Visitor = (token: CSSToken, frame: import('./valueWalk.js').NestingFrame | undefined, index: number) => TokenEdit | undefined;
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { RunContext } from '../../../passes/ir/runContext.js';
/**
 * @typedef {{ text: string, value: string, isString: boolean, absorbsWhitespace: boolean }} Replacement
 * @typedef {import('../../../values/valueBuffer.js').TokenEdit} TokenEdit
 * @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken
 * @typedef {(token: CSSToken, frame: import('./valueWalk.js').NestingFrame | undefined, index: number) => TokenEdit | undefined} Visitor
 * @import {ArenaIndex} from '../../../passes/ir/blockRecord.js'
 * @import {BlockRecords} from '../../../passes/ir/blockRecords.js'
 * @import {RunContext} from '../../../passes/ir/runContext.js'
 */
/**
 * Prepares the spelling that references to a renamed name receive. A name
 * ending in an unterminated hex escape, e.g. `\61`, absorbs a following space
 * and would swallow the next component, so edits must know whether to
 * terminate it. A name that already includes its terminating space, or ends in
 * an escaped space, absorbs nothing.
 *
 * @param {{ isString: boolean, tokenText: string, key: string }} target the
 *   target's at-rule name
 * @return {Replacement}
 */
declare function createReplacement({ isString, tokenText, key }: {
    isString: boolean;
    tokenText: string;
    key: string;
}): Replacement;
/**
 * Rewrites the references whose namespace has renames. A reference shares
 * the tokens its scan read, so the rewrite does not tokenize it again.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {import('./protectedNames.js').Reference[]} references
 * @param {Map<string, Map<string, Replacement>>} renames
 * @return {void}
 */
declare function rewriteReferences(records: BlockRecords, context: RunContext, references: import('./protectedNames.js').Reference[], renames: Map<string, Map<string, Replacement>>): void;
export { createReplacement, rewriteReferences };
//# sourceMappingURL=valueRewriter.d.ts.map