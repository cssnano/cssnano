import propEq from './propEq';

const isCommentNode = propEq('type', 'comment');

export default isCommentNode;
