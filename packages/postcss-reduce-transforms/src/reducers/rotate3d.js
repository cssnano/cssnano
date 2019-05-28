import { compose, props, take } from 'ramda';
import getMatchFactory from 'lerna:cssnano-util-get-match';

const rotate3dMappings = [
  ['rotateX', [1, 0, 0]], // rotate3d(1, 0, 0, a) => rotateX(a)
  ['rotateY', [0, 1, 0]], // rotate3d(0, 1, 0, a) => rotateY(a)
  ['rotate', [0, 0, 1]], // rotate3d(0, 0, 1, a) => rotate(a)
];

const rotate3dMatch = compose(
  getMatchFactory(rotate3dMappings),
  take(3)
);

function rotate3d(node, values) {
  if (values.length !== 4) {
    return;
  }

  const match = rotate3dMatch(values);

  if (match.length) {
    node.value = match;
    node.nodes = props([6], node.nodes);
  }
}

export default rotate3d;
