import type { TokenizeMode } from './valueBuffer.js';
/**
 * The tokenizer mode for the values of a property. The name is matched in
 * ASCII case, as CSS property names are.
 *
 * @param {string} property
 * @return {TokenizeMode | undefined} undefined for the default mode
 */
export declare function tokenizeMode(property: string): TokenizeMode | undefined;
//# sourceMappingURL=tokenizeMode.d.ts.map