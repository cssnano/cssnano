import { propEq } from 'ramda';

const isCommentNode = propEq('type', 'comment');

export default isCommentNode;
