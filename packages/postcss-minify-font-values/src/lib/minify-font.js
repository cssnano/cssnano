import { unit } from 'postcss-value-parser';
import keywords from './keywords';
import minifyFamily from './minify-family';
import minifyWeight from './minify-weight';

export default function(nodes, opts) {
  let i, max, node, familyStart, family;
  let hasSize = false;

  for (i = 0, max = nodes.length; i < max; i += 1) {
    node = nodes[i];

    if (node.type === 'word') {
      if (hasSize) {
        continue;
      }

      const value = node.value.toLowerCase();

      if (
        value === 'normal' ||
        value === 'inherit' ||
        value === 'initial' ||
        value === 'unset'
      ) {
        familyStart = i;
      } else if (~keywords.style.indexOf(value) || unit(value)) {
        familyStart = i;
      } else if (~keywords.variant.indexOf(value)) {
        familyStart = i;
      } else if (~keywords.weight.indexOf(value)) {
        node.value = minifyWeight(value);
        familyStart = i;
      } else if (~keywords.stretch.indexOf(value)) {
        familyStart = i;
      } else if (~keywords.size.indexOf(value) || unit(value)) {
        familyStart = i;
        hasSize = true;
      }
    } else if (
      node.type === 'function' &&
      nodes[i + 1] &&
      nodes[i + 1].type === 'space'
    ) {
      familyStart = i;
    } else if (node.type === 'div' && node.value === '/') {
      familyStart = i + 1;
      break;
    }
  }

  familyStart += 2;

  family = minifyFamily(nodes.slice(familyStart), opts);

  return nodes.slice(0, familyStart).concat(family);
}
