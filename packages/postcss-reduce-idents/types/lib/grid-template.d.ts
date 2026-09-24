export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function gridTemplateReducer(encoder: (value: string, index: number) => string): {
    /** @param {import('postcss').AnyNode} node */ collect(node: import('postcss').AnyNode): void;
    transform(): void;
};
//# sourceMappingURL=grid-template.d.ts.map