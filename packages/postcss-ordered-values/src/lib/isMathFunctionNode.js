import { anyPass, both, compose, includes, prop, toLower } from 'ramda';
import isFunctionNode from './isFunctionNode';

const _isMathFunctionNode = compose(
  anyPass([
    includes('calc'),
    includes('clamp'),
    includes('max'),
    includes('min'),
  ]),
  toLower,
  prop('value')
);

const isMathFunctionNode = both(isFunctionNode, _isMathFunctionNode);

export default isMathFunctionNode;
