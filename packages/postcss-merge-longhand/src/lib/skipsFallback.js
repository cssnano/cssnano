import { mergeBlockingSupport } from './isFallback.js';

/** @param {import('postcss').Declaration[]} rules */
export default (rules) => {
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
