import { props } from 'ramda';

function matrix3d(node, values) {
  if (values.length !== 16) {
    return;
  }

  //    matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1)
  // => matrix(a, b, c, d, tx, ty)
  if (
    values[2] === 0 &&
    values[3] === 0 &&
    values[6] === 0 &&
    values[7] === 0 &&
    values[8] === 0 &&
    values[9] === 0 &&
    values[10] === 1 &&
    values[11] === 0 &&
    values[14] === 0 &&
    values[15] === 1
  ) {
    const { nodes } = node;

    node.value = 'matrix';
    node.nodes = props([0, 1, 2, 3, 8, 9, 10, 11, 24, 25, 26], nodes);
  }
}

export default matrix3d;
