import {
  easingFunction,
  validateEasingFunction,
} from '../../../../util/webref/webrefWalk.js';

/**
 * The terminal keywords and functions accepted by <easing-function>, derived
 * from `@webref/css` by the derivation postcss-merge-longhand shares. Kept
 * free of I/O so that it can be unit tested.
 *
 * @typedef {ReturnType<typeof easingFunction>} EasingFunctions
 * @typedef {Parameters<typeof easingFunction>[0]} WebrefData
 */

export const buildEasingFunctions = easingFunction;
export const validate = validateEasingFunction;

/**
 * @param {EasingFunctions} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
