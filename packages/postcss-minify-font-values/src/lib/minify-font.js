import {unit} from 'postcss-value-parser';
import keywords from './keywords';
import minifyFamily from './minify-family';
import minifyWeight from './minify-weight';

export default function (nodes, opts) {
    let i, max, node, familyStart, family;
    let hasSize = false;

    for (i = 0, max = nodes.length; i < max; i += 1) {
        node = nodes[i];
        if (node.type === 'word') {
            if (hasSize) {
                continue;
            }
            if (
                node.value === 'normal' ||
                ~keywords.style.indexOf(node.value) ||
                ~keywords.variant.indexOf(node.value) ||
                ~keywords.stretch.indexOf(node.value)
            ) {
                familyStart = i;
            } else if (~keywords.weight.indexOf(node.value)) {
                node.value = minifyWeight(node.value, opts);
                familyStart = i;
            } else if (~keywords.size.indexOf(node.value) || unit(node.value)) {
                familyStart = i;
                hasSize = true;
            }
        } else if (node.type === 'div' && node.value === '/') {
            familyStart = i + 1;
            break;
        }
    }

    familyStart += 2;
    family = minifyFamily(nodes.slice(familyStart), opts);
    return nodes.slice(0, familyStart).concat(family);
};
