import { props } from 'ramda';

function scale3d(node, values) {
  if (values.length !== 3) {
    return;
  }

  const { nodes } = node;
  const [first, second, third] = values;

  // scale3d(sx, 1, 1) => scaleX(sx)
  if (second === 1 && third === 1) {
    node.value = 'scaleX';
    node.nodes = props([0], nodes);

    return;
  }

  // scale3d(1, sy, 1) => scaleY(sy)
  if (first === 1 && third === 1) {
    node.value = 'scaleY';
    node.nodes = props([2], nodes);

    return;
  }

  // scale3d(1, 1, sz) => scaleZ(sz)
  if (first === 1 && second === 1) {
    node.value = 'scaleZ';
    node.nodes = props([4], nodes);

    return;
  }
}

export default scale3d;
