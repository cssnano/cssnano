export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type AtRuleSymbols = {
    atRule: string;
    reserved: Set<string>;
    properties: Set<string>;
    functionProperties?: Set<string>;
    functions?: Map<string, number[]>;
    descriptors?: Set<string>;
};
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/**
 * Name the slots of an at-rule-defined name: where it is defined, what
 * references it, and which keywords are not names.
 *
 * @typedef {{
 *   atRule: string,
 *   reserved: Set<string>,
 *   properties: Set<string>,
 *   functionProperties?: Set<string>,
 *   functions?: Map<string, number[]>,
 *   descriptors?: Set<string>,
 * }} AtRuleSymbols
 */
/**
 * Rename the names an at-rule defines and declaration values reference,
 * such as `@keyframes` names. Rename only when definition and reference
 * occur in the same document; names are case-sensitive custom identifiers.
 *
 * @param {AtRuleSymbols} slots
 * @param {(value: string, index: number) => string} encoder
 */
export default function atRuleReducer({ atRule, reserved, properties, functionProperties, functions, descriptors }: AtRuleSymbols, encoder: (value: string, index: number) => string): {
    /** @param {import('postcss').AnyNode} node */ collect(node: import('postcss').AnyNode): void;
    transform(): void;
};
//# sourceMappingURL=at-rule-symbols.d.ts.map