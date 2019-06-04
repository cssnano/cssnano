import { both } from 'ramda';
import isFunctionNode from './isFunctionNode';
import isNodeValueOneOf from './isNodeValueOneOf';

const isVariableFunctionNode = both(
  isFunctionNode,
  isNodeValueOneOf(['constant', 'var', 'env'])
);

export default isVariableFunctionNode;
