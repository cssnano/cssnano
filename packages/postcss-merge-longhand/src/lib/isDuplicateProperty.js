import { detect } from 'lerna:stylehacks';
import { curry } from 'ramda';
import equalImportance from './equalImportance';
import isCustomProp from './isCustomProp';

const isDuplicateProperty = curry(
  (lastNode, node) =>
    !detect(lastNode) &&
    !detect(node) &&
    node !== lastNode &&
    equalImportance(lastNode, node) &&
    node.prop === lastNode.prop &&
    !(!isCustomProp(node) && isCustomProp(lastNode))
);

export default isDuplicateProperty;
