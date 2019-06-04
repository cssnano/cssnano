import * as R from 'ramda';
import isNodeValue from './isNodeValue';
import oneOf from './oneOf';

const isNodeValueOneOf = R.curry((keywords, node) =>
  isNodeValue(oneOf(keywords))(node)
);

export default isNodeValueOneOf;
