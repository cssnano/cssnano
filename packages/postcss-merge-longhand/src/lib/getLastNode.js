'use strict';

export default (rule, prop) => {
    return rule.filter(n => n.prop && ~n.prop.indexOf(prop)).pop();
};
