import stylehacks from 'stylehacks';
import lastOf from './lastOf.js';
import { isFallback } from './isFallback.js';

/**
 * Remove declarations superseded by the last remaining declaration for a
 * family. Detection is cached for this cleanup pass because it checks the
 * same declarations against several later candidates.
 *
 * @param {Set<import('postcss').Declaration>} declarations
 * @param {(node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean} isLowerPrecedence
 * @return {void}
 */
function cleanupDeclarations(declarations, isLowerPrecedence) {
  /** @type {Map<import('postcss').Declaration, boolean>} */
  const stylehackResults = new Map();
  /** @param {import('postcss').Declaration} node @return {boolean} */
  const isStylehack = (node) => {
    if (!stylehackResults.has(node)) {
      stylehackResults.set(node, stylehacks.detect(node));
    }

    return /** @type {boolean} */ (stylehackResults.get(node));
  };

  while (declarations.size) {
    const lastNode = lastOf(declarations);
    const removable = [];

    for (const node of declarations) {
      if (
        isStylehack(lastNode) ||
        isStylehack(node) ||
        node === lastNode ||
        node.important !== lastNode.important
      ) {
        continue;
      }

      if (
        (node.prop === lastNode.prop && !isFallback(node, lastNode)) ||
        isLowerPrecedence(node, lastNode)
      ) {
        removable.push(node);
      }
    }

    for (const node of removable) {
      node.remove();
      declarations.delete(node);
    }

    declarations.delete(lastNode);
  }
}

export default cleanupDeclarations;
