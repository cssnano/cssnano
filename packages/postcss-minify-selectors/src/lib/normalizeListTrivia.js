import cssnanoUtils from 'cssnano-utils';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */
/** @typedef {import('./normalizePool.js').Output} Output */

/**
 * Scans a token gap between list entries in a single pass.
 *
 * @param {SelectorArena} arena
 * @param {OutputPool} pool
 * @param {number} start
 * @param {number} end
 * @returns {{ trailing: Output, leading: Output }}
 */
export function scanListGap(arena, pool, start, end) {
  /** @type {Output[]} */ const trailing = [];
  /** @type {Output[]} */ const leading = [];
  let afterComma = false;
  let pendingSpace = false;

  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    const type = token[0];

    if (type === TokenType.Comma) {
      afterComma = true;
      leading.length = 0;
    } else if (!afterComma) {
      if (type === TokenType.Whitespace) {
        pendingSpace = true;
      } else if (type === TokenType.Comment && token[1].startsWith('/*!')) {
        if (pendingSpace) trailing.push(pool.text(' '));
        trailing.push(pool.text(token[1]));
        pendingSpace = false;
      }
    } else {
      if (type === TokenType.Comment && token[1].startsWith('/*!')) {
        leading.push(pool.text(token[1]));
      }
    }
  }

  return {
    trailing: pool.sequence(trailing),
    leading: pool.sequence(leading),
  };
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export function trailingListTrivia(arena, pool, start, end) {
  return scanListGap(arena, pool, start, end).trailing;
}
