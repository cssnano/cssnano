import { parseSelectorArena } from './parseArena.js';

/**
 * Whether a selector list is definitely invalid per Selectors 4, so that a
 * browser would drop any list it is part of. Constructs the parser cannot
 * classify, such as vendor-prefixed or unknown pseudos, are not reported.
 *
 * @param {string} selector
 * @return {boolean}
 */
export function isInvalidSelector(selector) {
  const { nodes } = parseSelectorArena(selector, { verifyArena: false });
  return nodes[0].status === 'invalid';
}
