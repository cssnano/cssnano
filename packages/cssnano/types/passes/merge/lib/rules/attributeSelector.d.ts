import { TokenType } from '@csstools/css-tokenizer';
export type AttributeStage = 'none' | 'name' | 'wildcard' | 'prefix' | 'separator' | 'localName' | 'matcher' | 'equals' | 'value' | 'modifier' | 'done';
export type AttributeScanState = {
    attributeStage: AttributeStage;
    delimiters: TokenType[];
};
/**
 * Advance the attribute selector stage by one token.
 *
 * @param {AttributeScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @param {readonly string[]} browsers
 * @return {boolean}
 */
declare function advanceAttribute(state: AttributeScanState, type: TokenType, value: string, browsers: readonly string[]): boolean;
export { advanceAttribute };
//# sourceMappingURL=attributeSelector.d.ts.map