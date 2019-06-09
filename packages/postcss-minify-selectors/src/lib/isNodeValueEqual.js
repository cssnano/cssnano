import * as R from 'ramda';
import lowercaseEq from './lowercaseEq';
import isNodeValue from './isNodeValue';

const isNodeValueEqual = R.curry((keyword, node) =>
  isNodeValue(lowercaseEq(keyword))(node)
);

export default isNodeValueEqual;
