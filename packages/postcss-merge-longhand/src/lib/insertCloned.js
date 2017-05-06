export default function insertCloned (rule, decl, props) {
    const newNode = Object.assign(decl.clone(), props);
    rule.insertAfter(decl, newNode);
    return newNode;
};
