import type { CSSToken } from '@csstools/css-tokenizer';
import type { ArenaIndex } from '../rules/blockRecord.js';
export type DeclarationItem = {
    prop: string;
    /**
     * the text, without the comments PostCSS strips
     */
    value: string;
    /**
     * the tokens of `value`
     */
    tokens: readonly CSSToken[];
    important: boolean;
    /**
     * the raw text before the declaration
     */
    before: string | undefined;
    /**
     * the raw text between prop and value
     */
    between: string | undefined;
    /**
     * the raw `!important`
     */
    importantSpelling: string | undefined;
    /**
     * the support a clone
     * needed from its source, or `null` for a declaration the author wrote
     */
    inheritedSupport: ReadonlySet<string> | null;
    /**
     * the value as written holds an important comment, so
     * no reducer edits the declaration
     */
    kept: boolean;
    removed: boolean;
    rewritten: boolean;
    /**
     * for a clone, the position of its source; `-1` otherwise
     */
    source: number;
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex} from '../rules/blockRecord.js' */
/**
 * A declaration of one block, as the longhand reducers edit it: its text and
 * tokens, the raws a style hack or a clone reads, and what an edit did to it.
 *
 * @typedef {object} DeclarationItem
 * @property {string} prop
 * @property {string} value the text, without the comments PostCSS strips
 * @property {readonly CSSToken[]} tokens the tokens of `value`
 * @property {boolean} important
 * @property {string | undefined} before the raw text before the declaration
 * @property {string | undefined} between the raw text between prop and value
 * @property {string | undefined} importantSpelling the raw `!important`
 * @property {ReadonlySet<string> | null} inheritedSupport the support a clone
 * needed from its source, or `null` for a declaration the author wrote
 * @property {boolean} kept the value as written holds an important comment, so
 * no reducer edits the declaration
 * @property {boolean} removed
 * @property {boolean} rewritten
 * @property {number} source for a clone, the position of its source; `-1` otherwise
 */
/** The chain entry of a point where a run of declarations ends. */
export declare const RUN_END = -1;
/**
 * The declarations of one block in chain order, with the run ends among them.
 * The reducers read the items and make their edits through the methods, so
 * every item is addressed by its position: an authored declaration by its place
 * in the chain, a clone by the place it was pushed at. The list keeps the arena
 * index of each authored declaration, so a commit needs no second read.
 */
export declare class BlockDeclarations {
    #private;
    /**
     * @param {DeclarationItem[]} items the authored declarations, in chain order
     * @param {readonly number[]} chain the positions of `items` in chain order,
     * with `RUN_END` where a run of declarations ends
     * @param {readonly ArenaIndex[]} indexes the arena index of each authored
     * declaration, by position in `items`
     */
    constructor(items: DeclarationItem[], chain: readonly number[], indexes: readonly ArenaIndex[]);
    /**
     * @return {readonly number[]} the positions of the declarations in chain
     * order, with `RUN_END` where a run ends
     */
    get chain(): readonly number[];
    /** @return {readonly ArenaIndex[]} the arena index of each authored declaration, by position */
    get indexes(): readonly ArenaIndex[];
    /** @return {boolean} whether an edit changed the list since it was read */
    get edited(): boolean;
    /** @return {number} the declarations, authored and cloned */
    get length(): number;
    /**
     * @param {number} position
     * @return {DeclarationItem}
     */
    at(position: number): DeclarationItem;
    /**
     * Sets the property and the value of a declaration. Omitting the tokens
     * tokenizes the new value, unless it is the value the item already has.
     *
     * @param {number} position
     * @param {string} prop
     * @param {string} value
     * @param {readonly CSSToken[]} [tokens]
     * @return {void}
     */
    rewrite(position: number, prop: string, value: string, tokens?: readonly CSSToken[]): void;
    /**
     * @param {number} position
     * @return {void}
     */
    remove(position: number): void;
    /**
     * Adds a declaration after the items, to be placed after its source when the
     * block is committed. It takes the source's raws and the support the source
     * required.
     *
     * @param {number} source
     * @param {{ prop: string, value: string, important: boolean }} change
     * @return {number} the position of the clone
     */
    insertClone(source: number, change: {
        prop: string;
        value: string;
        important: boolean;
    }): number;
}
//# sourceMappingURL=blockDeclarations.d.ts.map