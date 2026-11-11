import important from './hacks/important.js';
import leadingStarDeclaration from './hacks/leadingStar.js';
import leadingUnderscore from './hacks/leadingUnderscore.js';
import slash9 from './hacks/slash9.js';

/**
 * Whether a declaration carries a browser hack. The merge pass's longhand
 * transform uses it to keep hacked declarations out of shorthands, because the
 * hack is invalid for every browser that cssnano supports.
 *
 * @param {string | undefined} before the raw text before the declaration
 * @param {string} prop
 * @param {string} value
 * @return {boolean}
 */
export function hasHack(before, prop, value) {
  return (
    important(value) ||
    leadingStarDeclaration(prop, before) ||
    leadingUnderscore(prop, before) ||
    slash9(value)
  );
}
