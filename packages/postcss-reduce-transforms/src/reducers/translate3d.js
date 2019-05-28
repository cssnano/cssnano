import { props } from 'ramda';

function translate3d(node, values) {
  if (values.length !== 3) {
    return;
  }

  // translate3d(0, 0, tz) => translateZ(tz)
  if (values[0] === 0 && values[1] === 0) {
    node.value = 'translateZ';
    node.nodes = props([4], node.nodes);
  }
}

export default translate3d;
