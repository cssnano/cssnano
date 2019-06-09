import { propEq } from 'ramda';

const isAtRuleNode = propEq('type', 'atrule');

export default isAtRuleNode;
