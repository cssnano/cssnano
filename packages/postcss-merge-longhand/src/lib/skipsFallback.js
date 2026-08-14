'use strict';
const { mergeBlockingSupport } = require('./isFallback.js');

/**
 * A user agent applies a declaration only if it supports every feature it
 * requires, and applies a shorthand as a whole or not at all, so folding
 * declarations into one shorthand is conforming only when they require the
 * same features — otherwise it reaches just the narrowest audience.
 *
 * @param {import('postcss').Declaration[]} rules
 * @return {boolean}
 */
module.exports = (rules) => {
  const [first, ...rest] = rules;

  if (first === undefined) {
    return false;
  }

  const support = mergeBlockingSupport(first);

  return rest.some(
    (declaration) =>
      support.symmetricDifference(mergeBlockingSupport(declaration)).size
  );
};
