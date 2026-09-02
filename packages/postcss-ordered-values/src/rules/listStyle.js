import { isFunction, name } from '../lib/tokenize.js';
import listStyleTypes from './listStyleTypes.json' with { type: 'json' };

const definedTypes = new Set(listStyleTypes['list-style-type']);

const definedPosition = new Set(['inside', 'outside']);

/**
 * @param {import('../lib/tokenize.js').Term[]} listStyle
 * @return {string}
 */
function listStyleNormalizer(listStyle) {
  const order = { type: '', position: '', image: '' };

  for (const decl of listStyle) {
    const value = name(decl);
    if (!isFunction(decl)) {
      if (definedTypes.has(value)) {
        // its a type field
        order.type = `${order.type} ${decl.raw}`;
      } else if (definedPosition.has(value)) {
        order.position = `${order.position} ${decl.raw}`;
      } else if (value === 'none') {
        if (
          order.type
            .split(' ')
            .filter((e) => e !== '' && e !== ' ')
            .includes('none')
        ) {
          order.image = `${order.image} ${decl.raw}`;
        } else {
          order.type = `${order.type} ${decl.raw}`;
        }
      } else {
        order.type = `${order.type} ${decl.raw}`;
      }
    }
    if (isFunction(decl)) {
      order.image = `${order.image} ${decl.raw}`;
    }
  }
  return `${order.type.trim()} ${order.position.trim()} ${order.image.trim()}`.trim();
}

export default listStyleNormalizer;
