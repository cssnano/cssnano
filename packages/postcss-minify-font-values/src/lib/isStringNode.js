import { propEq } from 'ramda';

const isStringNode = propEq('type', 'string');

export default isStringNode;
