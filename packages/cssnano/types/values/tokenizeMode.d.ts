import type { TokenizeMode } from './valueBuffer.js';
/**
 * The tokenizer mode of the values of a property, given its keys, which fold
 * the name. It equals `tokenizeMode` of a name without escapes.
 *
 * @param {{ unicodeRange: boolean }} keys
 * @return {TokenizeMode | undefined} undefined for the default mode
 */
export declare function tokenizeModeOfKeys(keys: {
    unicodeRange: boolean;
}): TokenizeMode | undefined;
/**
 * The tokenizer mode for the values of a property. The name is matched in
 * ASCII case, as CSS property names are.
 *
 * @param {string} property
 * @return {TokenizeMode | undefined} undefined for the default mode
 */
export declare function tokenizeMode(property: string): TokenizeMode | undefined;
//# sourceMappingURL=tokenizeMode.d.ts.map