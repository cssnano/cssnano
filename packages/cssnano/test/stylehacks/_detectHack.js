import assert from 'node:assert/strict';
import postcss from 'postcss';
import { detectDeclaration } from '../../src/utils/stylehacks/index.js';

/** @param {string} css */
function containsHack(css) {
  let detected = false;
  postcss.parse(css).walkDecls((declaration) => {
    if (detectDeclaration(declaration)) {
      detected = true;
    }
  });
  return detected;
}

/** @param {string} css a fixture with at least one browser hack */
export function detectsHack(css) {
  return () => assert.equal(containsHack(css), true);
}

/** @param {string} css a fixture without browser hacks */
export function detectsNoHack(css) {
  return () => assert.equal(containsHack(css), false);
}
