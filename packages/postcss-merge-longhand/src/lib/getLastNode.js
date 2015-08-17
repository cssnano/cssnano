'use strict';

export default (rule, prop) => {
    return rule.nodes.filter(n => ~n.prop.indexOf(prop)).pop();
};
