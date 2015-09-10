'use strict';

export default (rule, prop) => {
    return rule.nodes.filter(n => n.prop && ~n.prop.indexOf(prop)).pop();
};
