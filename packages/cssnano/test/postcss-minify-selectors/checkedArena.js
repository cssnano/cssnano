import { buildSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/arena.js';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import { verifySelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/arenaVerify.js';

/**
 * Freezes a finished arena and its records, so tests can assert immutability.
 * @param {import('../../src/plugins/postcss-minify-selectors/lib/arena.js').SelectorArena} arena
 */
function freezeArena(arena) {
  for (const node of arena.nodes) {
    if (node.specificity) Object.freeze(node.specificity);
    Object.freeze(node);
  }
  for (const table of Object.values(arena.payloads)) {
    for (const payload of table) Object.freeze(payload);
    Object.freeze(table);
  }
  for (const payload of arena.payloads.qualifiedNames) {
    Object.freeze(payload.namespace);
    Object.freeze(payload.subject);
  }
  for (const payload of arena.payloads.attributes)
    Object.freeze(payload.namespace);
  Object.freeze(arena.nodes);
  Object.freeze(arena.payloads);
  Object.freeze(arena);
}

/**
 * Verifies and freezes a finished arena. Tests use this where the builder
 * used to verify and freeze every arena by default.
 * @param {import('../../src/plugins/postcss-minify-selectors/lib/arena.js').SelectorArena} arena
 */
function verifyAndFreeze(arena) {
  verifySelectorArena(arena);
  freezeArena(arena);
  return arena;
}

/** @param {Parameters<typeof parseSelectorArena>} args */
export function parseVerified(...args) {
  return verifyAndFreeze(parseSelectorArena(...args));
}

/** @param {Parameters<typeof buildSelectorArena>} args */
export function buildVerified(...args) {
  return verifyAndFreeze(buildSelectorArena(...args));
}
