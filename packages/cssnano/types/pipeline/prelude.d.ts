import type { AtRule, Helpers } from 'postcss';
import type { FoldedText } from '../values/textTable.js';
import type { Reducer, Stage, TextReducer } from './host.js';
export type PreludeStep = {
    text: TextReducer;
} | {
    buffer: Reducer;
};
export type TextEntry = {
    plan: readonly PreludeStep[] | null;
    memos: (Map<string, FoldedText> | undefined)[];
    tightens: boolean;
};
/**
 * Folds the prelude through its plan on a value buffer. A text step that
 * changes the text starts a new buffer from its result, and the final buffer's
 * text and tokens are the fold. A fold that warned is not memoised, and its
 * warnings name the node.
 *
 * @param {TextEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {AtRule} atRule the at-rule that holds the prelude
 * @param {Helpers} helpers
 * @returns {FoldedText}
 */
declare function foldPrelude(entry: TextEntry, text: string, context: number, atRule: AtRule, helpers: Helpers): FoldedText;
/**
 * The plan of an at-rule name: the prelude reducers of the stages that rewrite
 * it, and whether one of them tightens the space after the name.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} name
 * @returns {TextEntry}
 */
declare function atRuleEntry(stages: readonly Stage[], name: string): TextEntry;
export { atRuleEntry, foldPrelude };
//# sourceMappingURL=prelude.d.ts.map