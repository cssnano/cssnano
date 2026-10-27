/** @type {(v: string) => string} */
declare const toLower: (v: string) => string;
/**
 * Parse a `<line-width> || <line-style> || <color>` value in one pass.
 *
 * The grammar requires each component at most once, and every token must
 * specify one: the browser ignores the declaration whole otherwise. Parsing
 * therefore validates — a value it rejects comes back as `null`, and callers
 * must never name a component from a rejected value.
 *
 * A substitution token may stand in for any component, so it is assigned only
 * when the value leaves exactly one slot open; where the slot is ambiguous the
 * token is left unassigned (the declaration still keeps its substitution
 * semantics for callers that track them).
 *
 * `specified` tells, per component, whether a value token named it rather than
 * a substitution filling the slot.
 *
 * The value's tokens, when the caller has them, let a component with a `(` be
 * typed without tokenizing it again.
 *
 * `parts` gives each named component's own component, so a caller can read the
 * component's tokens without splitting the value again; a component that a
 * substitution fills, or a `none`-only value's keyword, has none.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the tokens
 * `value` spells
 * @return {{width: (string|undefined), style: (string|undefined), color: (string|undefined), specified: {width: boolean, style: boolean, color: boolean}, parts: {width: (import('./componentRanges.js').ValueComponent|undefined), style: (import('./componentRanges.js').ValueComponent|undefined), color: (import('./componentRanges.js').ValueComponent|undefined)}} | null}
 */
declare function parseWidthStyleColor(value: string, tokens?: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    width: (string | undefined);
    style: (string | undefined);
    color: (string | undefined);
    specified: {
        width: boolean;
        style: boolean;
        color: boolean;
    };
    parts: {
        width: (import('./componentRanges.js').ValueComponent | undefined);
        style: (import('./componentRanges.js').ValueComponent | undefined);
        color: (import('./componentRanges.js').ValueComponent | undefined);
    };
} | null;
export { toLower };
export default parseWidthStyleColor;
//# sourceMappingURL=parseWsc.d.ts.map