/**
 * Whether a selector list is definitely invalid per Selectors 4, so that a
 * browser would drop any list it is part of. Constructs the parser cannot
 * classify, such as vendor-prefixed or unknown pseudos, are not reported.
 *
 * @param {string} selector
 * @return {boolean}
 */
export declare function isInvalidSelector(selector: string): boolean;
//# sourceMappingURL=isInvalidSelector.d.ts.map