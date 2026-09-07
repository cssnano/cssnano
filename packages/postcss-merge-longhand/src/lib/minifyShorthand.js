import stylehacks from 'stylehacks';
import { normalizeValue } from './minifyShorthandValues.js';

const properties = new Set([
  'aspect-ratio',
  'gap',
  'inset',
  'overflow',
  'overscroll-behavior',
  'place-content',
  'place-items',
  'place-self',
  'scroll-margin',
  'scroll-padding',
  'transition',
  '-webkit-transition',
]);

/** @param {import('postcss').Root} root @return {void} */
export default function minifyShorthandIdentities(root) {
  /** @type {Map<string, string | null>} */
  const cache = new Map();
  root.walkDecls((decl) => {
    const property = decl.prop.toLowerCase();
    if (!properties.has(property) || stylehacks.detect(decl)) return;
    const sourceValue =
      decl.raws.value?.value === decl.value
        ? (decl.raws.value.raw ?? decl.value)
        : decl.value;
    const key = `${property}\0${sourceValue}`;
    let result = cache.get(key);
    if (result === undefined && !cache.has(key)) {
      result = normalizeValue(property, sourceValue);
      cache.set(key, result);
    }
    if (result === undefined || result === null || result === decl.value)
      return;
    const oldValue = decl.value;
    decl.value = result;
    if (decl.raws.value?.value === oldValue) {
      decl.raws.value = { raw: result, value: result };
    }
  });
}
