import { both, compose, prop, toLower } from 'ramda';
import isFunctionNode from './isFunctionNode';
import includedIn from './includedIn';

const _isMathFunctionNode = compose(
  includedIn(['calc', 'min', 'max', 'clamp']),
  toLower,
  prop('value')
);

const isMathFunctionNode = both(isFunctionNode, _isMathFunctionNode);

export default isMathFunctionNode;
