import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenComma } from '@csstools/css-tokenizer';

/**
 * Extract comma-separated component-value lists without changing any nodes.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[] | import('@csstools/css-parser-algorithms').FunctionNode} node
 * @return {import('@csstools/css-parser-algorithms').ComponentValue[][]}
 */
function getArguments(node) {
  // Kept for the callers that are being ported in the following migration
  // batches. It is intentionally not part of the public type contract.
  if (
    !Array.isArray(node) &&
    !isFunctionNode(node) &&
    Array.isArray(node?.nodes)
  ) {
    const list = [[]];
    for (const child of node.nodes) {
      if (child.type === 'div') list.push([]);
      else list.at(-1).push(child);
    }
    return list;
  }
  let values = [];
  if (Array.isArray(node)) {
    values = node;
  } else if (isFunctionNode(node)) {
    values = node.value;
  }
  /** @type {import('@csstools/css-parser-algorithms').ComponentValue[][]} */
  const list = [[]];
  for (const child of values) {
    if (isTokenNode(child) && isTokenComma(child.value)) {
      list.push([]);
    } else {
      list.at(-1).push(child);
    }
  }
  return list;
}

export default getArguments;
