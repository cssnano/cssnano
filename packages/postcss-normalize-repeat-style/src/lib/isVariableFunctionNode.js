import { both } from 'ramda';
import isFunctionNode from './isFunctionNode';
import isNodeValueOneOf from './isNodeValueOneOf';

const isVariableFunctionNode = both(
  isFunctionNode,
  isNodeValueOneOf(['var', 'env'])
);

export default isVariableFunctionNode;
