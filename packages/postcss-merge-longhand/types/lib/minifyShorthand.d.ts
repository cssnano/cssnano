export type FunctionFrame = {
    name: string | null;
    expected: import('@csstools/css-tokenizer').TokenType;
    commas: number;
    hasValue: boolean;
};
export type Component = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
export type TransitionSlots = {
    property: Component | null;
    duration: Component | null;
    timingFunction: Component | null;
    delay: Component | null;
};
/** @param {import('postcss').Root} root @return {void} */
export default function minifyShorthandIdentities(root: import('postcss').Root): void;
//# sourceMappingURL=minifyShorthand.d.ts.map