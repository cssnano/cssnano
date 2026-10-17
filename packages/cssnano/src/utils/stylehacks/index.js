import { declarationHacks } from './hacks/index.js';

/** @import {Declaration} from 'postcss'; */

/** @type {WeakMap<Declaration, {before: string | undefined, prop: string, value: string, detected: boolean}>} */
const declarationDetections = new WeakMap();

/**
 * Whether a declaration carries a browser hack. postcss-merge-longhand uses
 * it to keep hacked declarations out of shorthands, because the hack is
 * invalid for every browser that cssnano supports. Answers are cached because
 * merge-longhand asks about the same declarations many times; an entry is
 * reused only while the inputs it read are unchanged.
 * @param {Declaration} declaration
 * @return {boolean}
 */
export function detectDeclaration(declaration) {
  const { before } = declaration.raws;
  const cached = declarationDetections.get(declaration);

  if (
    cached &&
    cached.before === before &&
    cached.prop === declaration.prop &&
    cached.value === declaration.value
  ) {
    return cached.detected;
  }

  const detected = declarationHacks.some((hack) => hack(declaration));
  declarationDetections.set(declaration, {
    before,
    prop: declaration.prop,
    value: declaration.value,
    detected,
  });

  return detected;
}
