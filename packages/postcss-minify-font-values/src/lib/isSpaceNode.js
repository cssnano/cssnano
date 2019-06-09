import { propEq } from 'ramda';

const isSpaceNode = propEq('type', 'space');

export default isSpaceNode;
