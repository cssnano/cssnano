import * as R from 'ramda';
import { detect } from 'lerna:stylehacks';
import equalImportance from './equalImportance';

const isLowerPrecedenceProperty = R.curry(
  (prop, lastNode, node) =>
    !detect(lastNode) &&
    !detect(node) &&
    node !== lastNode &&
    equalImportance(lastNode, node) &&
    lastNode.prop === prop &&
    node.prop !== lastNode.prop
);

export default isLowerPrecedenceProperty;
