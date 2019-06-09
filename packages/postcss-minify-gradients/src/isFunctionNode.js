import { propEq } from 'ramda';

const isFunctionNode = propEq('type', 'function');

export default isFunctionNode;
