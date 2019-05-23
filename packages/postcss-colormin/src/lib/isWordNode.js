import { propEq } from 'ramda';

const isWordNode = propEq('type', 'word');

export default isWordNode;
