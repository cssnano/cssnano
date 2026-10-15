/**
 * Determines whether an @namespace declaration establishes a default namespace.
 * Under CSS Namespaces 3, a default namespace omits the <namespace-prefix>
 * identifier and immediately provides a <url> or <string>.
 *
 * Trivia tokens (whitespace and comments) are skipped according to CSS Syntax 3.
 *
 * @param {string} [params]
 * @return {boolean}
 */
export declare function isDefaultNamespace(params?: string): boolean;
//# sourceMappingURL=isDefaultNamespace.d.ts.map