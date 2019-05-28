import { props } from 'ramda';

function scale(node, values) {
  if (values.length !== 2) {
    return;
  }

  const { nodes } = node;
  const [first, second] = values;

  // scale(sx, sy) => scale(sx)
  if (first === second) {
    node.nodes = props([0], nodes);

    return;
  }

  // scale(sx, 1) => scaleX(sx)
  if (second === 1) {
    node.value = 'scaleX';
    node.nodes = props([0], nodes);

    return;
  }

  // scale(1, sy) => scaleY(sy)
  if (first === 1) {
    node.value = 'scaleY';
    node.nodes = props([2], nodes);

    return;
  }
}

export default scale;
