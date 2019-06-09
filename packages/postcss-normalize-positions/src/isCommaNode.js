import { both, propEq } from 'ramda';

const isCommaNode = both(propEq('type', 'div'), propEq('value', ','));

export default isCommaNode;
