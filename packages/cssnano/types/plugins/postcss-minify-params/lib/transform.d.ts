import type { ValueBuffer } from '../../../values/valueBuffer.js';
export type BalancedTokens = NonNullable<ReturnType<ValueBuffer['structure']>>;
/**
 * Minifies the prelude of an `@media` or `@supports` rule, as token edits on
 * its buffer. A prelude whose brackets do not balance is left as it was
 * written, and a prelude that is unchanged is not edited.
 *
 * @param {boolean} legacy
 * @param {'media' | 'supports'} ruleName the lowercase name of the rule
 * @param {ValueBuffer} buffer the prelude as written
 * @return {void}
 */
export default function reduceParams(legacy: boolean, ruleName: 'media' | 'supports', buffer: ValueBuffer): void;
//# sourceMappingURL=transform.d.ts.map