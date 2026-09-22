export declare const dynamicColorKeywords: Set<string>;
/**
 * Whether `color` is a `<color>` a gradient stop may hold, including the
 * keywords that only resolve at used-value time. Arguments beginning with a
 * function other than `calc()`, `clamp()`, `max()` or `min()` are treated as
 * colour stops without this check.
 *
 * @param {string} color
 * @returns {boolean}
 */
export default function isKnownColor(color: string): boolean;
//# sourceMappingURL=isKnownColor.d.ts.map