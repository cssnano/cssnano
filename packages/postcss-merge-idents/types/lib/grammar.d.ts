declare const CSS_WIDE_KEYWORDS: Set<string>;
declare const KEYFRAMES_SHORTHAND_KEYWORDS: Set<string>;
declare const COUNTER_STYLE_RESERVED: Set<string>;
declare const COUNTER_STYLE_FUNCTIONS: Map<string, number[]>;
/**
 * @param {string} name
 * @return {boolean}
 */
declare function isConditionalGroupRule(name: string): boolean;
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
 * @return {{ targetAtRuleName: string, kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func' } | null}
 */
declare function classifyDeclaration(decl: import('postcss').Declaration): {
    targetAtRuleName: string;
    kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func';
} | null;
/**
 * @param {import('postcss').Node} node
 * @return {import('postcss').Container}
 */
declare function getContainer(node: import('postcss').Node): import('postcss').Container;
/**
 * @param {{ rule: import('postcss').AtRule, body?: string }} entry
 * @return {string}
 */
declare function getBody(entry: {
    rule: import('postcss').AtRule;
    body?: string;
}): string;
export { CSS_WIDE_KEYWORDS, KEYFRAMES_SHORTHAND_KEYWORDS, COUNTER_STYLE_RESERVED, COUNTER_STYLE_FUNCTIONS, isConditionalGroupRule, parseAtRuleName, classifyDeclaration, getContainer, getBody, };
//# sourceMappingURL=grammar.d.ts.map