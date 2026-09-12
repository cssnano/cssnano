import stylehacks from 'stylehacks';
import { isFallback } from './isFallback.js';

/**
 * @param {Set<import('postcss').Declaration>} declarations
 * @param {(node: import('postcss').Declaration, lastNode: import('postcss').Declaration) => boolean} [isLowerPrecedence]
 * @param {(node: import('postcss').Declaration) => Iterable<string>} [footprint]
 */
function cleanupDeclarations(declarations, isLowerPrecedence, footprint) {
  /** @type {Map<string, import('postcss').Declaration[]>[]} */
  const properties = [new Map(), new Map()];
  /** @type {Map<string, import('postcss').Declaration[]>[]} */
  const footprints = [new Map(), new Map()];
  const nodes = Array.from(declarations);

  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index];
    if (stylehacks.detect(node)) continue;

    const lane = node.important ? 1 : 0;
    const propertyFrontier = properties[lane];
    const sameProperty = propertyFrontier.get(node.prop);
    let removable = Boolean(
      sameProperty?.some((later) => !isFallback(node, later))
    );

    if (!removable && isLowerPrecedence) {
      const candidates = footprint ? footprint(node) : propertyFrontier.keys();
      const candidateFrontier = footprint ? footprints[lane] : propertyFrontier;
      for (const property of candidates) {
        if (
          candidateFrontier
            .get(property)
            ?.some((later) => isLowerPrecedence(node, later))
        ) {
          removable = true;
          break;
        }
      }
    }

    if (removable) {
      node.remove();
      continue;
    }

    propertyFrontier.set(node.prop, [...(sameProperty ?? []), node]);
    if (!footprint) continue;
    for (const property of footprint(node)) {
      const frontier = footprints[lane];
      frontier.set(property, [...(frontier.get(property) ?? []), node]);
    }
  }
}

export default cleanupDeclarations;
