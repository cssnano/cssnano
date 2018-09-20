const getTopAtRuleParent = (atRule) => {
    if (atRule.parent && atRule.parent.type === "atrule") {
        return getTopAtRuleParent(atRule.parent);
    }

    return atRule;
};

export default function sameParent (ruleA, ruleB) {
    let hasParent = ruleA.parent && ruleB.parent;
    // Check for detached rules
    if (!hasParent) {
        return true;
    }
    // If an at rule, ensure that the parameters are the same
    if (ruleA.parent.type === 'atrule' && ruleB.parent.type === 'atrule') {
        const ruleATopAtRuleParent = getTopAtRuleParent(ruleA.parent);
        const ruleBTopAtRuleParent = getTopAtRuleParent(ruleB.parent);
        return (
            ruleATopAtRuleParent.params === ruleBTopAtRuleParent.params &&
            ruleATopAtRuleParent.name.toLowerCase() === ruleBTopAtRuleParent.name.toLowerCase()
        );
    }
    return ruleA.parent.type === ruleB.parent.type;
}
