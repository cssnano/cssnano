export default function sameParent (ruleA, ruleB) {
    let hasParent = ruleA.parent && ruleB.parent;
    // Check for detached rules
    if (!hasParent) {
        return true;
    }
    // If an at rule, ensure that the parameters are the same
    if (ruleA.parent.type === 'atrule' && ruleB.parent.type === 'atrule') {
        return (
            ruleA.parent.params === ruleB.parent.params &&
            ruleA.parent.name === ruleB.parent.name
        );
    }
    return ruleA.parent.type === ruleB.parent.type;
}
