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
 * @param {string} value
 * @return {{width: (string|undefined), style: (string|undefined), color: (string|undefined)} | null}
 */
declare function parseWidthStyleColor(value: string): {
    width: (string | undefined);
    style: (string | undefined);
    color: (string | undefined);
} | null;
export { toLower };
export default parseWidthStyleColor;
//# sourceMappingURL=parseWsc.d.ts.map