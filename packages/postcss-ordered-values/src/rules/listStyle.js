import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenIdent } from '@csstools/css-tokenizer';
import listStyleTypes from './listStyleTypes.json' with { type: 'json' };

const definedTypes = new Set(listStyleTypes['list-style-type']);
const definedPosition = new Set(['inside', 'outside']);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} listStyle */
function listStyleNormalizer(listStyle) {
  const order = { type: '', position: '', image: '' };
  for (const decl of listStyle) {
    if (isTokenNode(decl) && isTokenIdent(decl.value)) {
      const value = decl.value[1];
      if (definedTypes.has(value)) order.type = `${order.type} ${value}`;
      else if (definedPosition.has(value)) order.position = `${order.position} ${value}`;
      else if (value === 'none' && order.type.split(' ').filter(Boolean).includes('none')) order.image = `${order.image} ${value}`;
      else order.type = `${order.type} ${value}`;
    } else if (isFunctionNode(decl)) order.image = `${order.image} ${decl}`;
  }
  return `${order.type.trim()} ${order.position.trim()} ${order.image.trim()}`.trim();
}

export default listStyleNormalizer;
