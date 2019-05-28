import { props } from 'ramda';

function translate(node, values) {
  if (values.length !== 2) {
    return;
  }

  const { nodes } = node;

  // translate(tx, 0) => translate(tx)
  if (values[1] === 0) {
    node.nodes = props([0], nodes);

    return;
  }

  // translate(0, ty) => translateY(ty)
  if (values[0] === 0) {
    node.value = 'translateY';
    node.nodes = props([2], nodes);

    return;
  }
}

export default translate;
