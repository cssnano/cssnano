import { propEq } from 'ramda';

const isDeclNode = propEq('type', 'decl');

export default isDeclNode;
