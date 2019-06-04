import { both, compose, either, includes, prop, toLower } from 'ramda';
import isFunctionNode from './isFunctionNode';
import includedIn from './includedIn';

const _isMathFunctionNode = compose(
  either(includedIn(['min', 'max', 'clamp']), includes('calc')),
  toLower,
  prop('value')
);

const isMathFunctionNode = both(isFunctionNode, _isMathFunctionNode);

export default isMathFunctionNode;
