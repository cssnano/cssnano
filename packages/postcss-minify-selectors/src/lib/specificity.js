/** @typedef {[number, number, number]} Specificity */

/**
 * @typedef {{
 *   specificity: Specificity,
 * }} HasSpecificity
 */

/**
 * @param {Specificity} target
 * @param {Specificity} value
 */
export function addSpecificity(target, value) {
  target[0] += value[0];
  target[1] += value[1];
  target[2] += value[2];
}

/**
 * @param {{ specificity?: Specificity }[]} entries
 * @return {Specificity}
 */
export function maximumSpecificity(entries) {
  /** @type {Specificity} */
  let maximum = [0, 0, 0];
  for (const entry of entries) {
    const spec = entry.specificity ?? [0, 0, 0];
    for (let index = 0; index < maximum.length; index++) {
      if (spec[index] === maximum[index]) continue;
      if (spec[index] > maximum[index]) maximum = [...spec];
      break;
    }
  }
  return maximum;
}

/**
 * @param {{ specificity: Specificity }} c
 * @return {string}
 */
export function compoundSpecificityKey(c) {
  return c.specificity.join(',');
}
