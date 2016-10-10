import assign from 'object-assign';
import clone from './clone';

export default function insertCloned (rule, decl, props) {
    const newNode = assign(clone(decl), props);
    rule.insertAfter(decl, newNode);
    return newNode;
};
