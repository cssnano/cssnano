import { propEq } from 'ramda';

const isRuleNode = propEq('type', 'rule');

export default isRuleNode;
