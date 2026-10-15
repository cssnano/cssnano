export type MathType = 'number' | 'length' | 'percentage' | 'length-percentage';
/**
 * @param {string} token - a math function or a parenthesized expression
 * @return {MathType | undefined} its type; `undefined` when a user agent
 * rejects the expression or this module cannot tell
 */
export declare function mathType(token: string): MathType | undefined;
//# sourceMappingURL=mathType.d.ts.map