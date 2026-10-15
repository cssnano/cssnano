declare const VENDOR_PREFIX: RegExp;
declare const CSS_WIDE_KEYWORDS: Set<string>;
declare const KEYFRAMES_SHORTHAND_KEYWORDS: Set<string>;
declare const COUNTER_STYLE_RESERVED: Set<string>;
declare const COUNTER_STYLE_FUNCTIONS: Map<string, number[]>;
/**
 * @param {string} params
 * @param {string} atRuleName
 * @return {{ isString: boolean, isReservedName: boolean, key: string, tokenText: string } | null}
 */
declare function parseAtRuleName(params: string, atRuleName: string): {
    isString: boolean;
    isReservedName: boolean;
    key: string;
    tokenText: string;
} | null;
/**
 * @param {import('postcss').Declaration} decl
 * @param {string} [prop] the lowercase property name, when already known
 * @return {{ namespace: 'keyframes' | 'counter-style', kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func' } | null}
 */
declare function classifyDeclaration(decl: import('postcss').Declaration, prop?: string): {
    namespace: 'keyframes' | 'counter-style';
    kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func';
} | null;
/**
 * The nearest ancestor that decides whether a definition applies at all.
 * Cascade layers only order definitions, so they are looked through.
 *
 * @param {import('postcss').Node} node
 * @return {import('postcss').Container}
 */
declare function getConditionContainer(node: import('postcss').Node): import('postcss').Container;
/**
 * @param {{ rule: import('postcss').AtRule, body?: string }} entry an at-rule
 *   with a block
 * @return {string}
 */
declare function getBody(entry: {
    rule: import('postcss').AtRule;
    body?: string;
}): string;
export { VENDOR_PREFIX, CSS_WIDE_KEYWORDS, KEYFRAMES_SHORTHAND_KEYWORDS, COUNTER_STYLE_RESERVED, COUNTER_STYLE_FUNCTIONS, parseAtRuleName, classifyDeclaration, getConditionContainer, getBody, };
//# sourceMappingURL=grammar.d.ts.map