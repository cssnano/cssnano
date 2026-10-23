/**
 * Minifies the prelude of an `@media` or `@supports` rule. A prelude whose
 * brackets do not balance is returned as it was written.
 *
 * @param {boolean} legacy
 * @param {'media' | 'supports'} ruleName the lowercase name of the rule
 * @param {string} source the prelude as written
 * @return {string}
 */
export default function reduceParams(legacy: boolean, ruleName: 'media' | 'supports', source: string): string;
//# sourceMappingURL=transform.d.ts.map