import stylehacks from 'stylehacks';
import { normalizeValue } from './minifyShorthandValues.js';

/**
 * Shorthand properties whose redundant axes, sides, or default components can be
 * algebraically folded in-place without inter-declaration data dependencies.
 */
export const foldableShorthands = new Set([
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

/**
 * In-place peephole rewrite: folds identity components of a shorthand declaration
 * using a memoization table to cache pure value transformations across the AST.
 *
 * @param {import('postcss').Declaration} decl
 * @param {Map<string, string | null>} [memoTable]
 * @return {void}
 */
export function foldShorthandDeclaration(decl, memoTable) {
  const property = decl.prop.toLowerCase();
  if (!foldableShorthands.has(property) || stylehacks.detect(decl)) return;
  const sourceValue =
    decl.raws.value?.value === decl.value
      ? (decl.raws.value.raw ?? decl.value)
      : decl.value;
  const memoKey = `${property}\0${sourceValue}`;
  let canonicalValue;
  if (memoTable) {
    canonicalValue = memoTable.get(memoKey);
    if (canonicalValue === undefined && !memoTable.has(memoKey)) {
      canonicalValue = normalizeValue(property, sourceValue);
      memoTable.set(memoKey, canonicalValue);
    }
  } else {
    canonicalValue = normalizeValue(property, sourceValue);
  }
  if (
    canonicalValue === undefined ||
    canonicalValue === null ||
    canonicalValue === decl.value
  ) {
    return;
  }
  const oldValue = decl.value;
  decl.value = canonicalValue;
  if (decl.raws.value?.value === oldValue) {
    decl.raws.value = { raw: canonicalValue, value: canonicalValue };
  }
}

/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root) {
  /** @type {Map<string, string | null>} */
  const memoTable = new Map();
  root.walkDecls((decl) => {
    if (foldableShorthands.has(decl.prop.toLowerCase())) {
      foldShorthandDeclaration(decl, memoTable);
    }
  });
}
